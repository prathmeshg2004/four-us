// ============================================================
// Scoring Unit Tests — Acceptance Test Verifications
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  scoreFiveLetter,
  scoreSudoku,
  scoreWordGrid,
  scoreKnowMe,
} from './scoring';
import {
  FiveLetterAttempt,
  SudokuAttempt,
  WordGridAttempt,
  KnowMeAttempt,
} from '../types';
import { Timestamp } from 'firebase/firestore';

const mockTs = Timestamp.now();

describe('Five Letter Scoring', () => {
  it('awards point to the only solver', () => {
    const p1: FiveLetterAttempt = {
      gameType: 'fiveLetter',
      playerId: 'p1',
      dayNumber: 1,
      startedAt: mockTs,
      completedAt: mockTs,
      guesses: [{ word: 'APPLE', feedback: ['correct', 'correct', 'correct', 'correct', 'correct'] }],
      solved: true,
      elapsedMs: 45000,
    };
    const p2: FiveLetterAttempt = {
      gameType: 'fiveLetter',
      playerId: 'p2',
      dayNumber: 1,
      startedAt: mockTs,
      completedAt: mockTs,
      guesses: [{ word: 'CRANE', feedback: ['absent', 'absent', 'absent', 'absent', 'absent'] }],
      solved: false,
      elapsedMs: 30000,
    };

    const res = scoreFiveLetter(p1, p2, 'p1', 'p2');
    expect(res.winnerId).toBe('p1');
  });

  it('awards point to faster solve time when both solve', () => {
    const p1: FiveLetterAttempt = {
      gameType: 'fiveLetter',
      playerId: 'p1',
      dayNumber: 1,
      startedAt: mockTs,
      completedAt: mockTs,
      guesses: Array(4).fill({ word: 'TESTS', feedback: [] }),
      solved: true,
      elapsedMs: 60000,
    };
    const p2: FiveLetterAttempt = {
      gameType: 'fiveLetter',
      playerId: 'p2',
      dayNumber: 1,
      startedAt: mockTs,
      completedAt: mockTs,
      guesses: Array(4).fill({ word: 'TESTS', feedback: [] }),
      solved: true,
      elapsedMs: 40000,
    };

    const res = scoreFiveLetter(p1, p2, 'p1', 'p2');
    expect(res.winnerId).toBe('p2');
  });

  it('uses fewer guesses as tiebreaker when elapsed times are equal', () => {
    const p1: FiveLetterAttempt = {
      gameType: 'fiveLetter',
      playerId: 'p1',
      dayNumber: 1,
      startedAt: mockTs,
      completedAt: mockTs,
      guesses: Array(3).fill({ word: 'TESTS', feedback: [] }),
      solved: true,
      elapsedMs: 50000,
    };
    const p2: FiveLetterAttempt = {
      gameType: 'fiveLetter',
      playerId: 'p2',
      dayNumber: 1,
      startedAt: mockTs,
      completedAt: mockTs,
      guesses: Array(5).fill({ word: 'TESTS', feedback: [] }),
      solved: true,
      elapsedMs: 50000,
    };

    const res = scoreFiveLetter(p1, p2, 'p1', 'p2');
    expect(res.winnerId).toBe('p1');
  });

  it('awards no point when neither solves', () => {
    const p1: FiveLetterAttempt = {
      gameType: 'fiveLetter',
      playerId: 'p1',
      dayNumber: 1,
      startedAt: mockTs,
      completedAt: mockTs,
      guesses: Array(6).fill({ word: 'WRONG', feedback: [] }),
      solved: false,
      elapsedMs: 20000,
    };
    const p2: FiveLetterAttempt = {
      gameType: 'fiveLetter',
      playerId: 'p2',
      dayNumber: 1,
      startedAt: mockTs,
      completedAt: mockTs,
      guesses: Array(6).fill({ word: 'WRONG', feedback: [] }),
      solved: false,
      elapsedMs: 25000,
    };

    const res = scoreFiveLetter(p1, p2, 'p1', 'p2');
    expect(res.winnerId).toBeNull();
  });
});

describe('Mini Sudoku Scoring', () => {
  it('awards point to completed over incomplete', () => {
    const p1: SudokuAttempt = {
      gameType: 'sudoku',
      playerId: 'p1',
      dayNumber: 1,
      startedAt: mockTs,
      completedAt: mockTs,
      grid: [],
      solved: true,
      elapsedMs: 120000,
      checkCount: 0,
      penaltyMs: 0,
      correctCells: 36,
    };
    const p2: SudokuAttempt = {
      gameType: 'sudoku',
      playerId: 'p2',
      dayNumber: 1,
      startedAt: mockTs,
      completedAt: mockTs,
      grid: [],
      solved: false,
      elapsedMs: 60000,
      checkCount: 0,
      penaltyMs: 0,
      correctCells: 25,
    };

    const res = scoreSudoku(p1, p2, 'p1', 'p2');
    expect(res.winnerId).toBe('p1');
  });

  it('accounts for check penalties in adjusted time when both solve', () => {
    // P1: 100s + 1 incorrect check (15s) = 115s adjusted
    const p1: SudokuAttempt = {
      gameType: 'sudoku',
      playerId: 'p1',
      dayNumber: 1,
      startedAt: mockTs,
      completedAt: mockTs,
      grid: [],
      solved: true,
      elapsedMs: 100000,
      checkCount: 1,
      penaltyMs: 15000,
      correctCells: 36,
    };
    // P2: 105s + 0 penalties = 105s adjusted (Wins!)
    const p2: SudokuAttempt = {
      gameType: 'sudoku',
      playerId: 'p2',
      dayNumber: 1,
      startedAt: mockTs,
      completedAt: mockTs,
      grid: [],
      solved: true,
      elapsedMs: 105000,
      checkCount: 0,
      penaltyMs: 0,
      correctCells: 36,
    };

    const res = scoreSudoku(p1, p2, 'p1', 'p2');
    expect(res.winnerId).toBe('p2');
  });
});

describe('Word Grid Scoring', () => {
  it('awards point to player who reached target 10 pts first', () => {
    const p1: WordGridAttempt = {
      gameType: 'wordGrid',
      playerId: 'p1',
      dayNumber: 1,
      startedAt: mockTs,
      completedAt: mockTs,
      wordsFound: ['STAR', 'MOON', 'GLOW', 'DARK'],
      wordPoints: 12,
      longestWord: 'GLOW',
      elapsedMs: 110000,
      reachedTarget: true,
      targetReachedMs: 80000,
    };
    const p2: WordGridAttempt = {
      gameType: 'wordGrid',
      playerId: 'p2',
      dayNumber: 1,
      startedAt: mockTs,
      completedAt: mockTs,
      wordsFound: ['PLAY', 'GAME', 'TEAM', 'WINS'],
      wordPoints: 11,
      longestWord: 'WINS',
      elapsedMs: 100000,
      reachedTarget: true,
      targetReachedMs: 65000,
    };

    const res = scoreWordGrid(p1, p2, 'p1', 'p2');
    expect(res.winnerId).toBe('p2'); // P2 reached target in 65s vs 80s
  });
});

describe('Know Me Scoring', () => {
  it('awards points independently to both players when both predict correctly', () => {
    const p1: KnowMeAttempt = {
      gameType: 'knowMe',
      playerId: 'p1',
      dayNumber: 1,
      completedAt: mockTs,
      ownAnswer: 'A',
      partnerPrediction: 'B',
    };
    const p2: KnowMeAttempt = {
      gameType: 'knowMe',
      playerId: 'p2',
      dayNumber: 1,
      completedAt: mockTs,
      ownAnswer: 'B',
      partnerPrediction: 'A',
    };

    const res = scoreKnowMe(p1, p2);
    expect(res.player1Point).toBe(true);
    expect(res.player2Point).toBe(true);
  });

  it('awards zero points to prediction if partner never submitted an answer', () => {
    const p1: KnowMeAttempt = {
      gameType: 'knowMe',
      playerId: 'p1',
      dayNumber: 1,
      completedAt: mockTs,
      ownAnswer: 'A',
      partnerPrediction: 'B',
    };
    const p2 = null;

    const res = scoreKnowMe(p1, p2);
    expect(res.player1Point).toBe(false);
    expect(res.player2Point).toBe(false);
  });
});
