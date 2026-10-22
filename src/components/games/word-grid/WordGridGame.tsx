// ============================================================
// Word Grid — 4x4 Connected Letter Game Component
// ============================================================

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Timestamp } from 'firebase/firestore';
import { auth } from '../../../lib/firebase';
import {
  submitAttempt,
  getMyAttempt,
  saveGameProgress,
  getGameProgress,
} from '../../../lib/gameService';
import { WordGridAttempt, GAME_CONFIG, getWordPoints } from '../../../types';
import {
  getWordGridForDay,
  areAdjacent,
  isDictionaryWord,
} from '../../../lib/wordGridGenerator';
import './WordGridGame.css';

interface WordGridGameProps {
  roomId: string;
  dayNumber: number;
  onComplete: () => void;
}

const TIME_LIMIT_MS = GAME_CONFIG.WORD_GRID_TIME_LIMIT_MS; // 240,000 ms (4 mins)
const TARGET_POINTS = GAME_CONFIG.WORD_GRID_TARGET_POINTS; // 10 points

export default function WordGridGame({ roomId, dayNumber, onComplete }: WordGridGameProps) {
  const { letters } = useMemo(() => getWordGridForDay(dayNumber), [dayNumber]);

  const [started, setStarted] = useState(false);
  const [startTimeMs, setStartTimeMs] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState(TIME_LIMIT_MS);
  const [selectedCoords, setSelectedCoords] = useState<[number, number][]>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [wordPoints, setWordPoints] = useState(0);
  const [reachedTarget, setReachedTarget] = useState(false);
  const [targetReachedMs, setTargetReachedMs] = useState<number | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 1800);
  };

  // Check existing submission or progress on mount
  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const attempt = await getMyAttempt(roomId, dayNumber, 'wordGrid');
        if (attempt && mounted) {
          const wg = attempt as WordGridAttempt;
          setIsCompleted(true);
          setFoundWords(wg.wordsFound || []);
          setWordPoints(wg.wordPoints || 0);
          setReachedTarget(wg.reachedTarget || false);
          setIsLoading(false);
          return;
        }

        const progress = await getGameProgress(roomId, dayNumber, 'wordGrid');
        if (progress && mounted) {
          if (progress.startedAtMs) {
            setStarted(true);
            setStartTimeMs(progress.startedAtMs as number);
          }
          if (progress.foundWords) {
            setFoundWords(progress.foundWords as string[]);
          }
          if (progress.wordPoints) {
            setWordPoints(progress.wordPoints as number);
          }
          if (progress.reachedTarget) {
            setReachedTarget(progress.reachedTarget as boolean);
          }
          if (progress.targetReachedMs) {
            setTargetReachedMs(progress.targetReachedMs as number);
          }
        }
      } catch (err) {
        console.error('Failed to load Word Grid state:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, [roomId, dayNumber]);

  // Current selected word string
  const currentWord = useMemo(() => {
    return selectedCoords.map(([r, c]) => letters[r][c]).join('');
  }, [selectedCoords, letters]);

  // Start game handler
  const handleStart = async () => {
    const now = Date.now();
    setStarted(true);
    setStartTimeMs(now);
    await saveGameProgress(roomId, dayNumber, 'wordGrid', {
      startedAtMs: now,
      foundWords: [],
      wordPoints: 0,
      reachedTarget: false,
      targetReachedMs: null,
    });
  };

  // Finish and submit game
  const handleFinish = async (
    finalWords: string[],
    finalPts: number,
    finalReached: boolean,
    finalTargetMs: number | null
  ) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const user = auth.currentUser;
    if (!user) return;

    const totalElapsed = startTimeMs ? Math.min(TIME_LIMIT_MS, Date.now() - startTimeMs) : TIME_LIMIT_MS;
    let longestWord = '';
    for (const w of finalWords) {
      if (w.length > longestWord.length) longestWord = w;
    }

    const attempt: WordGridAttempt = {
      gameType: 'wordGrid',
      playerId: user.uid,
      dayNumber,
      startedAt: Timestamp.fromMillis(startTimeMs || Date.now()),
      completedAt: Timestamp.now(),
      wordsFound: finalWords,
      wordPoints: finalPts,
      longestWord,
      elapsedMs: totalElapsed,
      reachedTarget: finalReached,
      targetReachedMs: finalTargetMs,
    };

    try {
      await submitAttempt(roomId, dayNumber, attempt);
      setIsCompleted(true);
      onComplete();
    } catch (e) {
      console.error('Failed to submit Word Grid attempt:', e);
      showToast('Submission error, please retry');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Timer countdown ticker
  useEffect(() => {
    if (started && startTimeMs && !isCompleted) {
      const update = () => {
        const now = Date.now();
        const elapsed = now - startTimeMs;
        const rem = Math.max(0, TIME_LIMIT_MS - elapsed);
        setRemainingMs(rem);

        if (rem <= 0) {
          // Time expired! Auto-submit
          handleFinish(foundWords, wordPoints, reachedTarget, targetReachedMs);
        }
      };

      update();
      timerRef.current = setInterval(update, 250);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [started, startTimeMs, isCompleted, foundWords, wordPoints, reachedTarget, targetReachedMs]);

  // Handle cell tap
  const handleCellClick = (r: number, c: number) => {
    if (!started || isCompleted || isSubmitting) return;

    // Check if cell is already in the current path
    const existingIndex = selectedCoords.findIndex(([pr, pc]) => pr === r && pc === c);
    if (existingIndex !== -1) {
      // Tapping the last selected cell unselects it
      if (existingIndex === selectedCoords.length - 1) {
        setSelectedCoords((prev) => prev.slice(0, -1));
      }
      return;
    }

    // If starting a path
    if (selectedCoords.length === 0) {
      setSelectedCoords([[r, c]]);
      return;
    }

    // Must be adjacent to last selected cell
    const [lastR, lastC] = selectedCoords[selectedCoords.length - 1];
    if (areAdjacent(lastR, lastC, r, c)) {
      setSelectedCoords((prev) => [...prev, [r, c]]);
    } else {
      showToast('Must connect to adjacent letter');
    }
  };

  // Submit current word
  const handleSubmitWord = async () => {
    if (currentWord.length < 3) {
      showToast('Must be at least 3 letters');
      return;
    }

    const wordUpper = currentWord.toUpperCase();
    if (foundWords.includes(wordUpper)) {
      showToast('Already found!');
      setSelectedCoords([]);
      return;
    }

    if (!isDictionaryWord(wordUpper)) {
      showToast('Not in dictionary');
      setSelectedCoords([]);
      return;
    }

    // Valid word!
    const pts = getWordPoints(wordUpper.length);
    const newFound = [...foundWords, wordUpper];
    const newPts = wordPoints + pts;
    const reached = newPts >= TARGET_POINTS;
    const currentElapsed = startTimeMs ? Date.now() - startTimeMs : 0;
    const targetMs = reached && !reachedTarget ? currentElapsed : targetReachedMs;

    setFoundWords(newFound);
    setWordPoints(newPts);
    setSelectedCoords([]);
    showToast(`+${pts} pts!`);

    if (reached && !reachedTarget) {
      setReachedTarget(true);
      setTargetReachedMs(targetMs);
    }

    await saveGameProgress(roomId, dayNumber, 'wordGrid', {
      startedAtMs: startTimeMs,
      foundWords: newFound,
      wordPoints: newPts,
      reachedTarget: reached,
      targetReachedMs: targetMs,
    });

    // If target reached, the user can choose to finish or continue until time expires
    if (reached && !reachedTarget) {
      showToast('🎉 Target reached (10 pts)!');
    }
  };

  // Format seconds mm:ss
  const formatTimer = (ms: number) => {
    const totalSecs = Math.ceil(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="word-grid-game" style={{ padding: '60px 0' }}>
        <div className="spinner" />
        <p style={{ marginTop: '12px', color: '#64748b' }}>Loading puzzle...</p>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="word-grid-game">
        <div className="wg-complete animate-fade-in">
          <div className="wg-complete-emoji">{reachedTarget ? '🏆' : '✨'}</div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Attempt Recorded</h2>
          <div className="wg-complete-stats">
            <div className="wg-stat-box">
              <span className="wg-stat-val">{wordPoints}</span>
              <span className="wg-stat-lbl">Points</span>
            </div>
            <div className="wg-stat-box">
              <span className="wg-stat-val">{foundWords.length}</span>
              <span className="wg-stat-lbl">Words</span>
            </div>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '300px' }}>
            {reachedTarget
              ? 'Awesome job reaching the 10-point target! Your time and score are locked in.'
              : 'Time is up! Your points and words are locked in.'}{' '}
            Results will be revealed at the daily rollover!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="word-grid-game">
      <div className="wg-header">
        <span className="wg-title">Word Grid</span>
        <span className={`wg-timer ${remainingMs < 20000 ? 'urgent' : ''}`}>
          {formatTimer(remainingMs)}
        </span>
      </div>

      {toastMessage && <div className="wg-toast">{toastMessage}</div>}

      {!started ? (
        <div style={{ textAlign: 'center', margin: '24px 0' }}>
          <p style={{ color: '#64748b', marginBottom: '16px', fontSize: '0.95rem' }}>
            Connect adjacent letters (horizontal, vertical, diagonal) to form words.
            Reach 10 word points before the 4-minute timer runs out!
          </p>
          <button className="btn btn-primary btn-large" onClick={handleStart}>
            Start Game
          </button>
        </div>
      ) : (
        <>
          {/* Progress toward 10 points */}
          <div className="wg-progress-card">
            <div className="wg-progress-meta">
              <span>Goal: {TARGET_POINTS} pts</span>
              <span>{wordPoints} / {TARGET_POINTS} pts</span>
            </div>
            <div className="wg-progress-bar-bg">
              <div
                className="wg-progress-bar-fill"
                style={{ width: `${Math.min(100, (wordPoints / TARGET_POINTS) * 100)}%` }}
              />
            </div>
          </div>

          {/* Current Selection Bar */}
          <div className="wg-current-display">
            <span className="wg-current-word">{currentWord || 'TAP LETTERS'}</span>
            <div className="wg-word-actions">
              {selectedCoords.length > 0 && (
                <button
                  type="button"
                  className="wg-btn-clear"
                  onClick={() => setSelectedCoords([])}
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                className="wg-btn-submit"
                disabled={currentWord.length < 3}
                onClick={handleSubmitWord}
              >
                Submit
              </button>
            </div>
          </div>

          {/* 4x4 Grid */}
          <div className="wg-grid">
            {letters.map((row, r) =>
              row.map((letter, c) => {
                const isSelected = selectedCoords.some(([pr, pc]) => pr === r && pc === c);
                const isLast =
                  selectedCoords.length > 0 &&
                  selectedCoords[selectedCoords.length - 1][0] === r &&
                  selectedCoords[selectedCoords.length - 1][1] === c;

                return (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    className={`wg-cell ${isSelected ? 'selected' : ''} ${isLast ? 'last-selected' : ''}`}
                    onClick={() => handleCellClick(r, c)}
                  >
                    {letter}
                  </button>
                );
              })
            )}
          </div>

          {/* Done Early Button if target reached */}
          {reachedTarget && (
            <button
              type="button"
              className="btn btn-secondary btn-full"
              style={{ marginBottom: '10px' }}
              onClick={() => handleFinish(foundWords, wordPoints, reachedTarget, targetReachedMs)}
            >
              Finish Early & Lock In
            </button>
          )}

          {/* Found Words List */}
          {foundWords.length > 0 && (
            <div className="wg-found-container">
              <div className="wg-found-title">Found Words ({foundWords.length})</div>
              <div className="wg-chips">
                {foundWords.map((w) => (
                  <span key={w} className="wg-chip">
                    {w} <span className="wg-chip-pts">+{getWordPoints(w.length)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
