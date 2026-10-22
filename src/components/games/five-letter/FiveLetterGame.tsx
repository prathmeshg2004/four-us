// ============================================================
// Five Letter — Word Deduction Game Component
// ============================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Timestamp } from 'firebase/firestore';
import { auth } from '../../../lib/firebase';
import {
  submitAttempt,
  getMyAttempt,
  saveGameProgress,
  getGameProgress,
} from '../../../lib/gameService';
import { FiveLetterAttempt, FiveLetterGuess, LetterFeedback } from '../../../types';
import { getAnswerForDay, isValidGuess } from '../../../lib/wordList';
import './FiveLetterGame.css';

interface FiveLetterGameProps {
  roomId: string;
  dayNumber: number;
  onComplete: () => void;
}

const MAX_GUESSES = 6;
const WORD_LENGTH = 5;

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'DEL'],
];

export default function FiveLetterGame({ roomId, dayNumber, onComplete }: FiveLetterGameProps) {
  const [started, setStarted] = useState(false);
  const [startTimeMs, setStartTimeMs] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [guesses, setGuesses] = useState<FiveLetterGuess[]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSolved, setIsSolved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [shakeRowIndex, setShakeRowIndex] = useState<number | null>(null);

  const answer = getAnswerForDay(dayNumber).toUpperCase();
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
        const attempt = await getMyAttempt(roomId, dayNumber, 'fiveLetter');
        if (attempt && mounted) {
          setIsCompleted(true);
          setIsSolved((attempt as FiveLetterAttempt).solved);
          setGuesses((attempt as FiveLetterAttempt).guesses || []);
          setIsLoading(false);
          return;
        }

        const progress = await getGameProgress(roomId, dayNumber, 'fiveLetter');
        if (progress && mounted) {
          if (progress.startedAtMs) {
            setStarted(true);
            setStartTimeMs(progress.startedAtMs as number);
          }
          if (progress.guesses) {
            setGuesses(progress.guesses as FiveLetterGuess[]);
          }
        }
      } catch (e) {
        console.error('Error loading game state:', e);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, [roomId, dayNumber]);

  // Elapsed timer ticker
  useEffect(() => {
    if (started && startTimeMs && !isCompleted) {
      const tick = () => {
        setElapsedMs(Math.max(0, Date.now() - startTimeMs));
      };
      tick();
      timerRef.current = setInterval(tick, 200);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [started, startTimeMs, isCompleted]);

  // Start game handler
  const handleStart = async () => {
    const now = Date.now();
    setStarted(true);
    setStartTimeMs(now);
    await saveGameProgress(roomId, dayNumber, 'fiveLetter', {
      startedAtMs: now,
      guesses: [],
    });
  };

  // Compute Wordle feedback taking letter frequencies into account
  const computeFeedback = (guessWord: string, solution: string): LetterFeedback[] => {
    const res: LetterFeedback[] = Array(5).fill('absent');
    const solLetters = solution.split('');
    const guessLetters = guessWord.split('');
    const letterCounts: Record<string, number> = {};

    for (const ch of solLetters) {
      letterCounts[ch] = (letterCounts[ch] || 0) + 1;
    }

    // First pass: exact matches (green)
    for (let i = 0; i < 5; i++) {
      if (guessLetters[i] === solLetters[i]) {
        res[i] = 'correct';
        letterCounts[guessLetters[i]]--;
      }
    }

    // Second pass: present matches (yellow)
    for (let i = 0; i < 5; i++) {
      if (res[i] !== 'correct') {
        const ch = guessLetters[i];
        if (letterCounts[ch] && letterCounts[ch] > 0) {
          res[i] = 'present';
          letterCounts[ch]--;
        }
      }
    }

    return res;
  };

  // Final submission handler
  const handleGameFinish = async (
    allGuesses: FiveLetterGuess[],
    solved: boolean,
    finalElapsed: number
  ) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const user = auth.currentUser;
    if (!user) return;

    const attempt: FiveLetterAttempt = {
      gameType: 'fiveLetter',
      playerId: user.uid,
      dayNumber,
      startedAt: Timestamp.fromMillis(startTimeMs || Date.now()),
      completedAt: Timestamp.now(),
      guesses: allGuesses,
      solved,
      elapsedMs: finalElapsed,
    };

    try {
      await submitAttempt(roomId, dayNumber, attempt);
      setIsCompleted(true);
      setIsSolved(solved);
      onComplete();
    } catch (e) {
      console.error('Failed to submit Five Letter attempt:', e);
      showToast('Submission error, please retry');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit current guess row
  const submitGuess = async () => {
    if (currentGuess.length !== WORD_LENGTH) {
      showToast('Not enough letters');
      setShakeRowIndex(guesses.length);
      setTimeout(() => setShakeRowIndex(null), 500);
      return;
    }

    const wordUpper = currentGuess.toUpperCase();
    if (!isValidGuess(wordUpper)) {
      showToast('Not in word list');
      setShakeRowIndex(guesses.length);
      setTimeout(() => setShakeRowIndex(null), 500);
      return;
    }

    const feedback = computeFeedback(wordUpper, answer);
    const newGuess: FiveLetterGuess = { word: wordUpper, feedback };
    const newGuesses = [...guesses, newGuess];
    setGuesses(newGuesses);
    setCurrentGuess('');

    const solved = wordUpper === answer;
    const currentElapsed = startTimeMs ? Date.now() - startTimeMs : elapsedMs;

    await saveGameProgress(roomId, dayNumber, 'fiveLetter', {
      startedAtMs: startTimeMs,
      guesses: newGuesses,
    });

    if (solved || newGuesses.length >= MAX_GUESSES) {
      await handleGameFinish(newGuesses, solved, currentElapsed);
    }
  };

  // Keyboard interaction
  const handleKey = useCallback(
    (key: string) => {
      if (!started || isCompleted || isSubmitting) return;

      if (key === 'ENTER') {
        submitGuess();
      } else if (key === 'BACKSPACE' || key === 'DEL') {
        setCurrentGuess((prev) => prev.slice(0, -1));
      } else if (/^[A-Z]$/.test(key)) {
        setCurrentGuess((prev) => (prev.length < WORD_LENGTH ? prev + key : prev));
      }
    },
    [started, isCompleted, isSubmitting, currentGuess, guesses]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toUpperCase();
      if (key === 'ENTER') {
        handleKey('ENTER');
      } else if (key === 'BACKSPACE') {
        handleKey('BACKSPACE');
      } else if (/^[A-Z]$/.test(key)) {
        handleKey(key);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleKey]);

  // Build letter status map for keyboard keys
  const keyStatuses: Record<string, LetterFeedback> = {};
  for (const g of guesses) {
    for (let i = 0; i < g.word.length; i++) {
      const letter = g.word[i];
      const fb = g.feedback[i];
      const existing = keyStatuses[letter];
      if (fb === 'correct') {
        keyStatuses[letter] = 'correct';
      } else if (fb === 'present' && existing !== 'correct') {
        keyStatuses[letter] = 'present';
      } else if (fb === 'absent' && !existing) {
        keyStatuses[letter] = 'absent';
      }
    }
  }

  // Formatting helpers
  const formatTimer = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="fl-loading">
        <div className="fl-spinner" />
        <span>Loading puzzle...</span>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="five-letter-game">
        <div className="fl-complete animate-fade-in">
          <div className="fl-complete-emoji">{isSolved ? '🎉' : '⏳'}</div>
          <h2>Attempt Recorded</h2>
          <div className="fl-complete-stats">
            <div className="fl-complete-stat">
              <span className="value">{guesses.length}</span>
              <span className="label">Guesses</span>
            </div>
          </div>
          <p className="fl-complete-msg">
            Your results are locked in and hidden until the 24-hour round closes. Points and comparisons will reveal at the daily rollover!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="five-letter-game">
      <div className="fl-header">
        <h3 className="fl-title">Wordle</h3>
        <div className="fl-timer">{formatTimer(elapsedMs)}</div>
      </div>

      <div className="fl-toast-container">
        {toastMessage && <div className="fl-toast">{toastMessage}</div>}
      </div>

      {!started ? (
        <div style={{ textAlign: 'center', margin: '20px 0' }}>
          <p style={{ color: '#6B7280', marginBottom: '16px' }}>
            Find the hidden 5-letter word in 6 guesses or fewer. Your timer starts when you tap Start!
          </p>
          <button className="fl-start-btn" onClick={handleStart}>
            Start Game
          </button>
        </div>
      ) : (
        <>
          {/* 6 Rows Grid */}
          <div className="fl-grid">
            {Array.from({ length: MAX_GUESSES }).map((_, rowIdx) => {
              const isPastRow = rowIdx < guesses.length;
              const isCurrentRow = rowIdx === guesses.length;
              const rowGuess = isPastRow
                ? guesses[rowIdx].word
                : isCurrentRow
                ? currentGuess
                : '';
              const rowFeedback = isPastRow ? guesses[rowIdx].feedback : [];
              const isShaking = shakeRowIndex === rowIdx;

              return (
                <div key={rowIdx} className={`fl-row ${isShaking ? 'shake' : ''}`}>
                  {Array.from({ length: WORD_LENGTH }).map((_, colIdx) => {
                    const letter = rowGuess[colIdx] || '';
                    const fbClass = isPastRow ? rowFeedback[colIdx] : '';
                    const filledClass = letter ? 'filled' : '';
                    return (
                      <div
                        key={colIdx}
                        className={`fl-tile ${filledClass} ${fbClass} ${isPastRow ? 'reveal' : ''}`}
                      >
                        {letter}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Keyboard */}
          <div className="fl-keyboard">
            {KEYBOARD_ROWS.map((row, rIdx) => (
              <div key={rIdx} className="fl-kb-row">
                {row.map((k) => {
                  const isWide = k === 'ENTER' || k === 'DEL';
                  const status = keyStatuses[k] || '';
                  return (
                    <button
                      key={k}
                      type="button"
                      className={`fl-key ${isWide ? 'wide' : ''} ${status}`}
                      onClick={() => handleKey(k)}
                    >
                      {k}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
