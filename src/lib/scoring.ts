// ============================================================
// Scoring Engine & Day Finalization Logic
// ============================================================

import {
  doc,
  getDoc,
  runTransaction,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  FiveLetterAttempt,
  SudokuAttempt,
  WordGridAttempt,
  KnowMeAttempt,
  DayResultSummary,
  GameResult,
  KnowMeResult,
  Room,
  DayRecord,
} from '../types';

/**
 * 1. Five Letter Winner Calculation:
 * - If only one player solves the word, that player receives the point.
 * - If both solve it, the lower server-measured elapsed time receives the point.
 * - If solve times are identical, use fewer guesses as tiebreaker.
 * - If neither solves, no point.
 */
export function scoreFiveLetter(
  p1: FiveLetterAttempt | null,
  p2: FiveLetterAttempt | null,
  p1Id: string,
  p2Id: string
): GameResult {
  const p1Data = p1
    ? { solved: p1.solved, elapsedMs: p1.elapsedMs, guessesCount: p1.guesses.length }
    : { solved: false, elapsedMs: 0, guessesCount: 0 };
  const p2Data = p2
    ? { solved: p2.solved, elapsedMs: p2.elapsedMs, guessesCount: p2.guesses.length }
    : { solved: false, elapsedMs: 0, guessesCount: 0 };

  let winnerId: string | null = null;

  if (p1?.solved && !p2?.solved) {
    winnerId = p1Id;
  } else if (!p1?.solved && p2?.solved) {
    winnerId = p2Id;
  } else if (p1?.solved && p2?.solved) {
    if (p1.elapsedMs < p2.elapsedMs) {
      winnerId = p1Id;
    } else if (p2.elapsedMs < p1.elapsedMs) {
      winnerId = p2Id;
    } else {
      // Tiebreaker: fewer guesses
      if (p1.guesses.length < p2.guesses.length) {
        winnerId = p1Id;
      } else if (p2.guesses.length < p1.guesses.length) {
        winnerId = p2Id;
      }
    }
  }

  return { winnerId, player1Data: p1Data, player2Data: p2Data };
}

/**
 * 2. Mini Sudoku Winner Calculation:
 * - A correctly completed puzzle beats an incomplete puzzle.
 * - If both complete, compare adjusted time (elapsed time + check penalties). Lower wins.
 * - If neither completes, compare correct non-given cells, fewer incorrect checks, then elapsed time.
 * - If all equal, award no point.
 */
export function scoreSudoku(
  p1: SudokuAttempt | null,
  p2: SudokuAttempt | null,
  p1Id: string,
  p2Id: string
): GameResult {
  const p1Adj = p1 ? p1.elapsedMs + p1.penaltyMs : 9999999;
  const p2Adj = p2 ? p2.elapsedMs + p2.penaltyMs : 9999999;

  const p1Data = p1
    ? { solved: p1.solved, adjustedMs: p1Adj, correctCells: p1.correctCells, checks: p1.checkCount }
    : { solved: false, adjustedMs: 0, correctCells: 0, checks: 0 };
  const p2Data = p2
    ? { solved: p2.solved, adjustedMs: p2Adj, correctCells: p2.correctCells, checks: p2.checkCount }
    : { solved: false, adjustedMs: 0, correctCells: 0, checks: 0 };

  let winnerId: string | null = null;

  if (p1?.solved && !p2?.solved) {
    winnerId = p1Id;
  } else if (!p1?.solved && p2?.solved) {
    winnerId = p2Id;
  } else if (p1?.solved && p2?.solved) {
    if (p1Adj < p2Adj) {
      winnerId = p1Id;
    } else if (p2Adj < p1Adj) {
      winnerId = p2Id;
    }
  } else if (p1 || p2) {
    // Neither completed
    const c1 = p1?.correctCells || 0;
    const c2 = p2?.correctCells || 0;
    if (c1 > c2) {
      winnerId = p1Id;
    } else if (c2 > c1) {
      winnerId = p2Id;
    } else {
      // Fewer incorrect checks
      const k1 = p1?.checkCount || 0;
      const k2 = p2?.checkCount || 0;
      if (k1 < k2) {
        winnerId = p1Id;
      } else if (k2 < k1) {
        winnerId = p2Id;
      } else {
        // Lower elapsed time
        const e1 = p1?.elapsedMs || 9999999;
        const e2 = p2?.elapsedMs || 9999999;
        if (e1 < e2) winnerId = p1Id;
        else if (e2 < e1) winnerId = p2Id;
      }
    }
  }

  return { winnerId, player1Data: p1Data, player2Data: p2Data };
}

/**
 * 3. Word Grid Winner Calculation:
 * - If both reach 10 points, lower elapsed time to reach target wins.
 * - If only one reaches 10 points, that player wins.
 * - If neither reaches 10, compare total word points, longest valid word, number of valid words, elapsed time.
 * - If all equal, award no point.
 */
export function scoreWordGrid(
  p1: WordGridAttempt | null,
  p2: WordGridAttempt | null,
  p1Id: string,
  p2Id: string
): GameResult {
  const p1Data = p1
    ? { points: p1.wordPoints, wordsCount: p1.wordsFound.length, longest: p1.longestWord, reachedTarget: p1.reachedTarget, targetMs: p1.targetReachedMs }
    : { points: 0, wordsCount: 0, longest: '', reachedTarget: false, targetMs: null };
  const p2Data = p2
    ? { points: p2.wordPoints, wordsCount: p2.wordsFound.length, longest: p2.longestWord, reachedTarget: p2.reachedTarget, targetMs: p2.targetReachedMs }
    : { points: 0, wordsCount: 0, longest: '', reachedTarget: false, targetMs: null };

  let winnerId: string | null = null;

  if (p1?.reachedTarget && p2?.reachedTarget) {
    const t1 = p1.targetReachedMs || p1.elapsedMs;
    const t2 = p2.targetReachedMs || p2.elapsedMs;
    if (t1 < t2) winnerId = p1Id;
    else if (t2 < t1) winnerId = p2Id;
  } else if (p1?.reachedTarget && !p2?.reachedTarget) {
    winnerId = p1Id;
  } else if (!p1?.reachedTarget && p2?.reachedTarget) {
    winnerId = p2Id;
  } else if (p1 || p2) {
    // Compare total points
    const pts1 = p1?.wordPoints || 0;
    const pts2 = p2?.wordPoints || 0;
    if (pts1 > pts2) {
      winnerId = p1Id;
    } else if (pts2 > pts1) {
      winnerId = p2Id;
    } else {
      // Longest valid word
      const l1 = (p1?.longestWord || '').length;
      const l2 = (p2?.longestWord || '').length;
      if (l1 > l2) {
        winnerId = p1Id;
      } else if (l2 > l1) {
        winnerId = p2Id;
      } else {
        // Number of valid words
        const cnt1 = (p1?.wordsFound || []).length;
        const cnt2 = (p2?.wordsFound || []).length;
        if (cnt1 > cnt2) {
          winnerId = p1Id;
        } else if (cnt2 > cnt1) {
          winnerId = p2Id;
        } else {
          // Elapsed time
          const e1 = p1?.elapsedMs || 9999999;
          const e2 = p2?.elapsedMs || 9999999;
          if (e1 < e2) winnerId = p1Id;
          else if (e2 < e1) winnerId = p2Id;
        }
      }
    }
  }

  return { winnerId, player1Data: p1Data, player2Data: p2Data };
}

/**
 * 4. Know Me Scoring:
 * - Player 1 gets 1 pt if Player 1 correctly predicted Player 2's actual answer.
 * - Player 2 gets 1 pt if Player 2 correctly predicted Player 1's actual answer.
 * - Both can score, one can score, or neither.
 * - If partner never submitted actual answer, prediction cannot earn point.
 */
export function scoreKnowMe(
  p1: KnowMeAttempt | null,
  p2: KnowMeAttempt | null
): KnowMeResult {
  const p1Answer = p1?.ownAnswer || null;
  const p2Answer = p2?.ownAnswer || null;
  const p1Pred = p1?.partnerPrediction || null;
  const p2Pred = p2?.partnerPrediction || null;

  const p1Correct = Boolean(p1Pred && p2Answer && p1Pred === p2Answer);
  const p2Correct = Boolean(p2Pred && p1Answer && p2Pred === p1Answer);

  return {
    player1Answer: p1Answer,
    player2Answer: p2Answer,
    player1Prediction: p1Pred,
    player2Prediction: p2Pred,
    player1Correct: p1Correct,
    player2Correct: p2Correct,
    player1Point: p1Correct,
    player2Point: p2Correct,
  };
}

/**
 * Idempotent day finalization transaction.
 * Runs atomically in Firestore. Can be called by clients on boundary expiration or backend worker.
 */
export async function finalizeDayInFirestore(roomId: string, dayNumber: number): Promise<boolean> {
  const roomRef = doc(db, 'rooms', roomId);
  const dayRef = doc(db, 'rooms', roomId, 'days', String(dayNumber));

  return await runTransaction(db, async (transaction) => {
    const daySnap = await transaction.get(dayRef);
    if (!daySnap.exists()) return false;

    const dayData = daySnap.data() as DayRecord;
    // Idempotency check: if already finalized, return early without repeating points!
    if (dayData.finalized) {
      return true;
    }

    const roomSnap = await transaction.get(roomRef);
    if (!roomSnap.exists()) return false;
    const room = roomSnap.data() as Room;

    const p1Id = room.player1Id;
    const p2Id = room.player2Id;
    if (!p1Id || !p2Id) return false;

    // Read both attempt documents
    const p1AttemptRef = doc(db, 'rooms', roomId, 'days', String(dayNumber), 'attempts', p1Id);
    const p2AttemptRef = doc(db, 'rooms', roomId, 'days', String(dayNumber), 'attempts', p2Id);

    const p1Snap = await transaction.get(p1AttemptRef);
    const p2Snap = await transaction.get(p2AttemptRef);

    const p1Attempts = p1Snap.exists() ? p1Snap.data() : {};
    const p2Attempts = p2Snap.exists() ? p2Snap.data() : {};

    // Calculate game winners
    const fiveLetter = scoreFiveLetter(p1Attempts.fiveLetter || null, p2Attempts.fiveLetter || null, p1Id, p2Id);
    const sudoku = scoreSudoku(p1Attempts.sudoku || null, p2Attempts.sudoku || null, p1Id, p2Id);
    const wordGrid = scoreWordGrid(p1Attempts.wordGrid || null, p2Attempts.wordGrid || null, p1Id, p2Id);
    const knowMe = scoreKnowMe(p1Attempts.knowMe || null, p2Attempts.knowMe || null);

    let p1DayPoints = 0;
    let p2DayPoints = 0;

    if (fiveLetter.winnerId === p1Id) p1DayPoints++;
    if (fiveLetter.winnerId === p2Id) p2DayPoints++;

    if (sudoku.winnerId === p1Id) p1DayPoints++;
    if (sudoku.winnerId === p2Id) p2DayPoints++;

    if (wordGrid.winnerId === p1Id) p1DayPoints++;
    if (wordGrid.winnerId === p2Id) p2DayPoints++;

    if (knowMe.player1Point) p1DayPoints++;
    if (knowMe.player2Point) p2DayPoints++;

    const summary: DayResultSummary = {
      fiveLetter,
      sudoku,
      wordGrid,
      knowMe,
      player1DayPoints: p1DayPoints,
      player2DayPoints: p2DayPoints,
    };

    // Update day record
    transaction.update(dayRef, {
      finalized: true,
      resultSummary: summary,
    });

    // Update room totals and current day
    const nextDay = dayNumber < 10 ? dayNumber + 1 : 10;
    const isFinished = dayNumber >= 10;

    if (!isFinished) {
      const nextDayRef = doc(db, 'rooms', roomId, 'days', String(nextDay));
      const nowMs = Date.now();
      transaction.update(nextDayRef, {
        startsAt: Timestamp.fromMillis(nowMs),
        endsAt: Timestamp.fromMillis(nowMs + 24 * 60 * 60 * 1000),
      });
    }

    transaction.update(roomRef, {
      player1Score: (room.player1Score || 0) + p1DayPoints,
      player2Score: (room.player2Score || 0) + p2DayPoints,
      currentDay: nextDay,
      status: isFinished ? 'finished' : 'active',
    });

    return true;
  });
}
