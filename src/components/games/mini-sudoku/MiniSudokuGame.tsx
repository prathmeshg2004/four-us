// ============================================================
// Mini Sudoku 6×6 — Game Component
// ============================================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Timestamp } from 'firebase/firestore';
import { auth } from '../../../lib/firebase';
import {
  submitAttempt,
  getMyAttempt,
  saveGameProgress,
  getGameProgress,
  getDayContent,
} from '../../../lib/gameService';
import { SudokuAttempt, GAME_CONFIG } from '../../../types';
import { getSudokuForDay, validateSudoku, findDuplicates } from '../../../lib/sudokuGenerator';
import './MiniSudokuGame.css';

// ---- Constants ----

const SIZE = GAME_CONFIG.SUDOKU_SIZE; // 6
const TIME_LIMIT_MS = GAME_CONFIG.SUDOKU_TIME_LIMIT_MS; // 300_000
const CHECK_PENALTY_MS = GAME_CONFIG.SUDOKU_CHECK_PENALTY_MS; // 15_000
const DIGITS = [1, 2, 3, 4, 5, 6];

// ---- Props ----

interface MiniSudokuGameProps {
  roomId: string;
  dayNumber: number;
  onComplete: () => void;
}

// ---- Types ----

type Notes = boolean[][]; // [row*6+col][digit-1]

interface GameProgress {
  grid: number[][];
  notes: Notes;
  startedAtMs: number;
  checkCount: number;
  penaltyMs: number;
  selectedDigit: number | null;
}

type GamePhase = 'loading' | 'start' | 'playing' | 'completed';

// ---- Helpers ----

function createEmptyNotes(): Notes {
  return Array.from({ length: SIZE * SIZE }, () => Array(SIZE).fill(false));
}

function formatTime(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Get row/col/box indices that share a group with (r, c) */
function getRelatedCells(row: number, col: number): Set<string> {
  const related = new Set<string>();

  // Same row
  for (let c = 0; c < SIZE; c++) related.add(`${row},${c}`);
  // Same column
  for (let r = 0; r < SIZE; r++) related.add(`${r},${col}`);
  // Same 2×3 box
  const br = Math.floor(row / 2) * 2;
  const bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 2; r++) {
    for (let c = bc; c < bc + 3; c++) {
      related.add(`${r},${c}`);
    }
  }

  return related;
}

/** Count how many of each digit are placed */
function digitCounts(grid: number[][]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const d of DIGITS) counts.set(d, 0);
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = grid[r][c];
      if (v > 0) counts.set(v, (counts.get(v) || 0) + 1);
    }
  }
  return counts;
}

// ---- Component ----

const MiniSudokuGame: React.FC<MiniSudokuGameProps> = ({
  roomId,
  dayNumber,
  onComplete,
}) => {
  // Puzzle data
  const [puzzle, setPuzzle] = useState<number[][] | null>(null);
  const [solution, setSolution] = useState<number[][] | null>(null);

  // Game state
  const [grid, setGrid] = useState<number[][]>(() =>
    Array.from({ length: SIZE }, () => Array(SIZE).fill(0))
  );
  const [notes, setNotes] = useState<Notes>(() => createEmptyNotes());
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [selectedDigit, setSelectedDigit] = useState<number | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [checkCount, setCheckCount] = useState(0);
  const [penaltyMs, setPenaltyMs] = useState(0);
  const [feedback, setFeedback] = useState<{ message: string; type: 'error' | 'info' } | null>(null);
  const [showPenalty, setShowPenalty] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  // Timer state
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState(TIME_LIMIT_MS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Phase
  const [phase, setPhase] = useState<GamePhase>('loading');
  const [completionData, setCompletionData] = useState<{
    solved: boolean;
    elapsedMs: number;
    checkCount: number;
    correctCells: number;
  } | null>(null);

  // Submission guard
  const submittingRef = useRef(false);
  const progressSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Derived data ----

  const givenCells = useMemo(() => {
    if (!puzzle) return new Set<string>();
    const s = new Set<string>();
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (puzzle[r][c] !== 0) s.add(`${r},${c}`);
      }
    }
    return s;
  }, [puzzle]);

  const duplicates = useMemo(() => findDuplicates(grid), [grid]);

  const relatedCells = useMemo(() => {
    if (!selectedCell) return new Set<string>();
    return getRelatedCells(selectedCell[0], selectedCell[1]);
  }, [selectedCell]);

  const counts = useMemo(() => digitCounts(grid), [grid]);

  const isGridFull = useMemo(() => {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (grid[r][c] === 0) return false;
      }
    }
    return true;
  }, [grid]);

  const emptyCellsCount = useMemo(() => {
    let count = 0;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (grid[r][c] === 0) count++;
      }
    }
    return count;
  }, [grid]);

  // ---- Load puzzle & check for existing attempt ----

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // Check if already attempted
        const existing = await getMyAttempt(roomId, dayNumber, 'sudoku');
        if (!cancelled && existing) {
          const attempt = existing as SudokuAttempt;
          setCompletionData({
            solved: attempt.solved,
            elapsedMs: attempt.elapsedMs,
            checkCount: attempt.checkCount,
            correctCells: attempt.correctCells,
          });
          setPhase('completed');
          return;
        }

        // Generate puzzle (deterministic from day number)
        const { puzzle: p, solution: s } = getSudokuForDay(dayNumber);
        if (cancelled) return;

        setPuzzle(p);
        setSolution(s);
        setGrid(p.map((row) => [...row]));

        // Check for saved progress
        const progress = await getGameProgress(roomId, dayNumber, 'sudoku');
        if (!cancelled && progress) {
          const saved = progress as unknown as GameProgress;
          if (saved.grid) setGrid(saved.grid);
          if (saved.notes) setNotes(saved.notes);
          if (saved.checkCount) setCheckCount(saved.checkCount);
          if (saved.penaltyMs) setPenaltyMs(saved.penaltyMs);
          if (saved.selectedDigit !== undefined) setSelectedDigit(saved.selectedDigit);
          if (saved.startedAtMs) {
            setStartedAtMs(saved.startedAtMs);
            // Calculate remaining time
            const elapsed = Date.now() - saved.startedAtMs + (saved.penaltyMs || 0);
            const remaining = TIME_LIMIT_MS - elapsed;
            if (remaining <= 0) {
              // Time expired while away — auto-submit
              if (!cancelled) {
                setPhase('playing'); // briefly set to playing to trigger submission
                handleTimeExpiry(saved.grid || p.map((row) => [...row]), s, saved.checkCount || 0, saved.penaltyMs || 0, saved.startedAtMs);
              }
              return;
            }
            setRemainingMs(remaining);
            setPhase('playing');
            return;
          }
        }

        if (!cancelled) setPhase('start');
      } catch (err) {
        console.error('Failed to initialize Sudoku:', err);
        if (!cancelled) setPhase('start');
      }
    }

    init();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, dayNumber]);

  // ---- Timer tick ----

  useEffect(() => {
    if (phase !== 'playing' || startedAtMs === null) return;

    function tick() {
      const elapsed = Date.now() - startedAtMs! + penaltyMs;
      const remaining = TIME_LIMIT_MS - elapsed;
      setRemainingMs(remaining);

      if (remaining <= 0) {
        // Time expired
        handleTimeExpiry(grid, solution!, checkCount, penaltyMs, startedAtMs!);
      }
    }

    tick(); // immediate update
    timerRef.current = setInterval(tick, 200);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, startedAtMs, penaltyMs]);

  // ---- Auto-save progress (debounced) ----

  const saveProgress = useCallback(() => {
    if (phase !== 'playing' || startedAtMs === null) return;

    if (progressSaveTimeoutRef.current) {
      clearTimeout(progressSaveTimeoutRef.current);
    }
    progressSaveTimeoutRef.current = setTimeout(() => {
      saveGameProgress(roomId, dayNumber, 'sudoku', {
        grid,
        notes,
        startedAtMs,
        checkCount,
        penaltyMs,
        selectedDigit,
      }).catch((err) => console.error('Failed to save progress:', err));
    }, 1000);
  }, [roomId, dayNumber, grid, notes, startedAtMs, checkCount, penaltyMs, selectedDigit, phase]);

  useEffect(() => {
    saveProgress();
  }, [saveProgress]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (progressSaveTimeoutRef.current) clearTimeout(progressSaveTimeoutRef.current);
    };
  }, []);

  // ---- Submit attempt ----

  const submitResult = useCallback(
    async (
      finalGrid: number[][],
      sol: number[][],
      solved: boolean,
      checks: number,
      penalty: number,
      startMs: number
    ) => {
      if (submittingRef.current) return;
      submittingRef.current = true;

      const user = auth.currentUser;
      if (!user) {
        submittingRef.current = false;
        return;
      }

      const elapsed = Date.now() - startMs + penalty;
      const { correctCells } = validateSudoku(finalGrid, sol);

      const attempt: SudokuAttempt = {
        gameType: 'sudoku',
        playerId: user.uid,
        dayNumber,
        startedAt: Timestamp.fromMillis(startMs),
        completedAt: Timestamp.now(),
        grid: finalGrid,
        solved,
        elapsedMs: Math.min(elapsed, TIME_LIMIT_MS),
        checkCount: checks,
        penaltyMs: penalty,
        correctCells,
      };

      try {
        await submitAttempt(roomId, dayNumber, attempt);
        setCompletionData({
          solved,
          elapsedMs: attempt.elapsedMs,
          checkCount: checks,
          correctCells,
        });
        setPhase('completed');
        onComplete();
      } catch (err) {
        console.error('Failed to submit attempt:', err);
        // If already submitted, show completion anyway
        if ((err as Error)?.message?.includes('Already submitted')) {
          setCompletionData({
            solved,
            elapsedMs: attempt.elapsedMs,
            checkCount: checks,
            correctCells,
          });
          setPhase('completed');
        }
      }

      submittingRef.current = false;
    },
    [roomId, dayNumber, onComplete]
  );

  // ---- Time expiry handler ----

  const handleTimeExpiry = useCallback(
    (
      finalGrid: number[][],
      sol: number[][],
      checks: number,
      penalty: number,
      startMs: number
    ) => {
      if (timerRef.current) clearInterval(timerRef.current);
      setRemainingMs(0);
      setFeedback({ message: "Time's up! Your grid has been saved.", type: 'info' });

      const { correct } = validateSudoku(finalGrid, sol);
      submitResult(finalGrid, sol, correct, checks, penalty, startMs);
    },
    [submitResult]
  );

  // ---- Start game ----

  const handleStart = useCallback(() => {
    const now = Date.now();
    setStartedAtMs(now);
    setRemainingMs(TIME_LIMIT_MS);
    setPhase('playing');

    // Save initial progress with start time
    saveGameProgress(roomId, dayNumber, 'sudoku', {
      grid: grid,
      notes,
      startedAtMs: now,
      checkCount: 0,
      penaltyMs: 0,
      selectedDigit: null,
    }).catch((err) => console.error('Failed to save initial progress:', err));
  }, [roomId, dayNumber, grid, notes]);

  // ---- Cell selection (Tap cell to select; does NOT auto-insert preselected digits!) ----

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (phase !== 'playing') return;

      // If clicking the already-selected cell, deselect
      if (selectedCell && selectedCell[0] === row && selectedCell[1] === col) {
        setSelectedCell(null);
        return;
      }

      setSelectedCell([row, col]);
    },
    [phase, selectedCell]
  );

  // ---- Digit placement ----

  const placeDigit = useCallback(
    (row: number, col: number, digit: number) => {
      setGrid((prev) => {
        const next = prev.map((r) => [...r]);
        next[row][col] = prev[row][col] === digit ? 0 : digit;
        return next;
      });
      // Clear notes for this cell when placing a digit
      setNotes((prev) => {
        const next = prev.map((n) => [...n]);
        const idx = row * SIZE + col;
        next[idx] = Array(SIZE).fill(false);
        return next;
      });
      setFeedback(null);
    },
    []
  );

  const toggleNote = useCallback(
    (row: number, col: number, digit: number) => {
      // Only allow notes on empty cells
      setGrid((prev) => {
        // If cell has a value, clear it first
        if (prev[row][col] !== 0) {
          const next = prev.map((r) => [...r]);
          next[row][col] = 0;
          return next;
        }
        return prev;
      });
      setNotes((prev) => {
        const next = prev.map((n) => [...n]);
        const idx = row * SIZE + col;
        next[idx] = [...next[idx]];
        next[idx][digit - 1] = !next[idx][digit - 1];
        return next;
      });
    },
    []
  );

  // ---- Number button press ----

  const handleNumberPress = useCallback(
    (digit: number) => {
      if (phase !== 'playing') return;

      // If a cell is selected and it's not a given clue, place or toggle the digit in that cell
      if (selectedCell && !givenCells.has(`${selectedCell[0]},${selectedCell[1]}`)) {
        if (notesMode) {
          toggleNote(selectedCell[0], selectedCell[1], digit);
        } else {
          placeDigit(selectedCell[0], selectedCell[1], digit);
        }
      } else {
        // No cell selected: toggle digit filter for board highlighting
        setSelectedDigit((prev) => (prev === digit ? null : digit));
      }
    },
    [phase, selectedCell, givenCells, notesMode, placeDigit, toggleNote]
  );

  // ---- Erase ----

  const handleErase = useCallback(() => {
    if (phase !== 'playing' || !selectedCell) return;
    const [r, c] = selectedCell;
    if (givenCells.has(`${r},${c}`)) return;

    setGrid((prev) => {
      const next = prev.map((row) => [...row]);
      next[r][c] = 0;
      return next;
    });
    setNotes((prev) => {
      const next = prev.map((n) => [...n]);
      next[r * SIZE + c] = Array(SIZE).fill(false);
      return next;
    });
    setFeedback(null);
  }, [phase, selectedCell, givenCells]);

  // ---- Submit and Check handlers ----

  const confirmAndSubmit = useCallback(() => {
    if (!solution || !startedAtMs) return;
    setShowConfirmSubmit(false);
    if (timerRef.current) clearInterval(timerRef.current);
    const { correct } = validateSudoku(grid, solution);
    submitResult(grid, solution, correct, checkCount, penaltyMs, startedAtMs);
  }, [grid, solution, checkCount, penaltyMs, startedAtMs, submitResult]);

  const handleSubmit = useCallback(() => {
    if (phase !== 'playing' || !solution || !startedAtMs) return;

    if (!isGridFull) {
      setShowConfirmSubmit(true);
      return;
    }

    confirmAndSubmit();
  }, [phase, solution, startedAtMs, isGridFull, confirmAndSubmit]);

  // Check solution (hint with 15s penalty)
  const handleCheck = useCallback(() => {
    if (phase !== 'playing' || !solution || !startedAtMs) return;

    const { correct, correctCells } = validateSudoku(grid, solution);

    if (correct) {
      // Solved!
      if (timerRef.current) clearInterval(timerRef.current);
      submitResult(grid, solution, true, checkCount, penaltyMs, startedAtMs);
      return;
    }

    // Incorrect — add penalty
    const newCheckCount = checkCount + 1;
    const newPenalty = penaltyMs + CHECK_PENALTY_MS;
    setCheckCount(newCheckCount);
    setPenaltyMs(newPenalty);
    setShowPenalty(true);
    setTimeout(() => setShowPenalty(false), 1500);

    setFeedback({
      message: `${correctCells}/36 cells correct. +15s penalty added.`,
      type: 'error',
    });

    // Check if the penalty caused time expiry
    const elapsed = Date.now() - startedAtMs + newPenalty;
    if (elapsed >= TIME_LIMIT_MS) {
      handleTimeExpiry(grid, solution, newCheckCount, newPenalty, startedAtMs);
    }
  }, [phase, solution, grid, checkCount, penaltyMs, startedAtMs, submitResult, handleTimeExpiry]);

  // Physical keyboard support
  useEffect(() => {
    if (phase !== 'playing') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '1' && e.key <= '6') {
        const digit = parseInt(e.key, 10);
        handleNumberPress(digit);
      } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        handleErase();
      } else if (e.key === 'n' || e.key === 'N') {
        setNotesMode((prev) => !prev);
      } else if (e.key === 'Escape') {
        setSelectedCell(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, handleNumberPress, handleErase]);

  // ---- Render: Loading ----

  if (phase === 'loading') {
    return <div className="sudoku-loading">Loading puzzle…</div>;
  }

  // ---- Render: Completed ----

  if (phase === 'completed' && completionData) {
    return (
      <div className="sudoku-complete-screen">
        <div className="icon">{completionData.solved ? '🎉' : '⏰'}</div>
        <h2>{completionData.solved ? 'Puzzle Solved!' : 'Time Expired'}</h2>
        <p>
          {completionData.solved
            ? 'Great work completing the Sudoku!'
            : `You filled ${completionData.correctCells}/36 cells correctly.`}
        </p>
        <div className="stats">
          <div className="stat-item">
            <span className="stat-value">{formatTime(completionData.elapsedMs)}</span>
            <span className="stat-label">Time</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{completionData.checkCount}</span>
            <span className="stat-label">Checks</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{completionData.correctCells}/36</span>
            <span className="stat-label">Correct</span>
          </div>
        </div>
        <div className="reveal-note">
          Attempt recorded. Result available at the next daily reveal.
        </div>
      </div>
    );
  }

  // ---- Render: Start screen ----

  if (phase === 'start') {
    return (
      <div className="sudoku-start-screen">
        <h2>Mini Sudoku</h2>
        <p>Fill the 6×6 grid with digits 1-6.</p>
        <div className="rules">
          <ul>
            <li>Each row must contain digits 1-6 with no repeats</li>
            <li>Each column must contain digits 1-6 with no repeats</li>
            <li>Each 2×3 box must contain digits 1-6 with no repeats</li>
            <li>You have <strong>5 minutes</strong> to complete the puzzle</li>
            <li>Each check adds a <strong>15-second</strong> penalty</li>
          </ul>
        </div>
        <button className="sudoku-start-btn" onClick={handleStart}>
          Start Puzzle
        </button>
      </div>
    );
  }

  // ---- Render: Playing ----

  return (
    <div className="sudoku-container">
      {/* Header with timer */}
      <div className="sudoku-header">
        <h3 className="sudoku-title">Mini Sudoku</h3>
        <div style={{ position: 'relative' }}>
          <div className={`sudoku-timer${remainingMs <= 30000 ? ' warning' : ''}`}>
            {formatTime(remainingMs)}
          </div>
          {showPenalty && <span className="penalty-flash">+15s</span>}
        </div>
      </div>

      {/* Grid */}
      <div className="sudoku-grid">
        {Array.from({ length: SIZE }, (_, r) =>
          Array.from({ length: SIZE }, (_, c) => {
            const key = `${r},${c}`;
            const isGiven = givenCells.has(key);
            const isSelected = selectedCell?.[0] === r && selectedCell?.[1] === c;
            const isHighlighted = relatedCells.has(key);
            const isError = duplicates.has(key) && !isGiven;
            const cellValue = grid[r][c];
            const isSameNumber =
              (selectedCell &&
                cellValue !== 0 &&
                grid[selectedCell[0]][selectedCell[1]] === cellValue &&
                !isSelected) ||
              (!selectedCell && selectedDigit !== null && cellValue === selectedDigit);

            // Subgrid border classes
            const borderRight = c === 2; // after column 2 (0-indexed)
            const borderBottom = r === 1 || r === 3; // after rows 1, 3

            const cellClasses = [
              'sudoku-cell',
              isGiven && 'given',
              isSelected && 'selected',
              isHighlighted && !isSelected && 'highlighted',
              isSameNumber && 'same-number',
              isError && 'error',
              !isGiven && cellValue !== 0 && 'user-entered',
              borderRight && 'border-right',
              borderBottom && 'border-bottom',
            ]
              .filter(Boolean)
              .join(' ');

            const noteIdx = r * SIZE + c;
            const cellNotes = notes[noteIdx];
            const hasNotes = cellNotes && cellNotes.some(Boolean);

            return (
              <div
                key={key}
                className={cellClasses}
                onClick={() => handleCellClick(r, c)}
              >
                {cellValue !== 0 ? (
                  cellValue
                ) : hasNotes ? (
                  <div className="sudoku-notes">
                    {DIGITS.map((d) => (
                      <span key={d} className="sudoku-note-digit">
                        {cellNotes[d - 1] ? d : ''}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      {/* Unfilled cells status */}
      <div className="sudoku-status-bar">
        <span>
          {emptyCellsCount === 0
            ? '✨ All cells filled! Ready to submit.'
            : `${emptyCellsCount} empty cell${emptyCellsCount === 1 ? '' : 's'} remaining`}
        </span>
      </div>

      {/* Controls */}
      <div className="sudoku-controls">
        {/* Number buttons */}
        <div className="sudoku-number-row">
          {DIGITS.map((d) => (
            <button
              key={d}
              className={`sudoku-number-btn${
                selectedDigit === d ? ' active' : ''
              }${(counts.get(d) || 0) >= SIZE ? ' completed' : ''}`}
              onClick={() => handleNumberPress(d)}
              type="button"
            >
              {d}
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="sudoku-action-row">
          <button
            className="sudoku-action-btn"
            onClick={handleErase}
            type="button"
          >
            ✕ Erase
          </button>
          <button
            className={`sudoku-action-btn${notesMode ? ' notes-active' : ''}`}
            onClick={() => setNotesMode((prev) => !prev)}
            type="button"
          >
            ✎ Notes{notesMode ? ' ON' : ''}
          </button>
        </div>

        {/* Feedback */}
        {feedback && (
          <div className={`sudoku-feedback ${feedback.type}`}>
            {feedback.message}
          </div>
        )}

        {/* Submit & Check Actions */}
        <div className="sudoku-submit-row">
          <button
            className="sudoku-submit-btn"
            onClick={handleSubmit}
            type="button"
          >
            {isGridFull ? '✓ Submit Puzzle' : `Submit (${emptyCellsCount} empty)`}
          </button>
          <button
            className="sudoku-check-hint-btn"
            onClick={handleCheck}
            type="button"
            title="Check solution (+15s penalty)"
          >
            Check (+15s)
          </button>
        </div>

        {/* Confirmation Modal if submitting with empty cells */}
        {showConfirmSubmit && (
          <div className="sudoku-confirm-overlay">
            <div className="sudoku-confirm-dialog">
              <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 700 }}>
                Submit Puzzle?
              </h4>
              <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: '#64748b' }}>
                You still have <strong>{emptyCellsCount}</strong> unfilled cell
                {emptyCellsCount === 1 ? '' : 's'}. Any unfilled cell will count as incorrect.
              </p>
              <div className="sudoku-confirm-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={() => setShowConfirmSubmit(false)}
                >
                  Keep Playing
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-small"
                  onClick={confirmAndSubmit}
                >
                  Submit Anyway
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MiniSudokuGame;
