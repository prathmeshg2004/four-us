// ============================================================
// Four Us — Core Type Definitions
// ============================================================

import { Timestamp } from 'firebase/firestore';

// --- Player & Room ---

export type PlayerColor =
  | 'coral'
  | 'teal'
  | 'violet'
  | 'amber'
  | 'sky'
  | 'rose'
  | 'mint'
  | 'lavender';

export const PLAYER_COLORS: Record<PlayerColor, string> = {
  coral: '#FF6B6B',
  teal: '#4ECDC4',
  violet: '#A78BFA',
  amber: '#F59E0B',
  sky: '#38BDF8',
  rose: '#FB7185',
  mint: '#34D399',
  lavender: '#C4B5FD',
};

export interface PlayerMember {
  displayName: string;
  color: PlayerColor;
  avatar: string;
  ready: boolean;
  joinedAt: Timestamp;
}

export type RoomStatus =
  | 'waiting'    // Created, waiting for player 2
  | 'lobby'      // Both players present, waiting for ready
  | 'active'     // Game in progress
  | 'finished';  // All 10 days complete

export interface Room {
  code: string;
  status: RoomStatus;
  createdAt: Timestamp;
  startAt: Timestamp | null;
  currentDay: number;
  player1Id: string;
  player2Id: string | null;
  player1Score: number;
  player2Score: number;
  player1RecoveryToken: string;
  player2RecoveryToken: string | null;
}

// --- Daily Content ---

export interface FiveLetterContent {
  answerHash: string;       // SHA-256 hash for client-side validation display
  dayNumber: number;
}

export interface SudokuContent {
  startingGrid: number[][];  // 6x6, 0 = empty
  solution: number[][];      // 6x6 full solution (stored server-side only)
  dayNumber: number;
}

export interface WordGridContent {
  letters: string[][];       // 4x4 grid
  validWords: string[];      // All valid words findable on this grid
  dayNumber: number;
}

export interface KnowMeContent {
  promptId: string;
  promptText: string;
  options: [string, string, string, string]; // A, B, C, D
  dayNumber: number;
}

export interface DayContent {
  dayNumber: number;
  fiveLetter: FiveLetterContent;
  sudoku: SudokuContent;
  wordGrid: WordGridContent;
  knowMe: KnowMeContent;
}

// --- Day State ---

export interface DayRecord {
  dayNumber: number;
  startsAt: Timestamp;
  endsAt: Timestamp;
  finalized: boolean;
  resultSummary: DayResultSummary | null;
}

export interface DayResultSummary {
  fiveLetter: GameResult;
  sudoku: GameResult;
  wordGrid: GameResult;
  knowMe: KnowMeResult;
  player1DayPoints: number;
  player2DayPoints: number;
}

export interface GameResult {
  winnerId: string | null;   // null = no winner
  player1Data: Record<string, unknown>;
  player2Data: Record<string, unknown>;
}

export interface KnowMeResult {
  player1Answer: string | null;
  player2Answer: string | null;
  player1Prediction: string | null;
  player2Prediction: string | null;
  player1Correct: boolean;
  player2Correct: boolean;
  player1Point: boolean;
  player2Point: boolean;
}

// --- Attempt Statuses (public) ---

export interface PlayerDayStatus {
  fiveLetterAttempted: boolean;
  sudokuAttempted: boolean;
  wordGridAttempted: boolean;
  knowMeAttempted: boolean;
}

// --- Attempts (private) ---

export type GameType = 'fiveLetter' | 'sudoku' | 'wordGrid' | 'knowMe';

export interface FiveLetterAttempt {
  gameType: 'fiveLetter';
  playerId: string;
  dayNumber: number;
  startedAt: Timestamp;
  completedAt: Timestamp | null;
  guesses: FiveLetterGuess[];
  solved: boolean;
  elapsedMs: number;
}

export interface FiveLetterGuess {
  word: string;
  feedback: LetterFeedback[];
}

export type LetterFeedback = 'correct' | 'present' | 'absent';

export interface SudokuAttempt {
  gameType: 'sudoku';
  playerId: string;
  dayNumber: number;
  startedAt: Timestamp;
  completedAt: Timestamp | null;
  grid: number[][];
  solved: boolean;
  elapsedMs: number;
  checkCount: number;
  penaltyMs: number;
  correctCells: number;
}

export interface WordGridAttempt {
  gameType: 'wordGrid';
  playerId: string;
  dayNumber: number;
  startedAt: Timestamp;
  completedAt: Timestamp | null;
  wordsFound: string[];
  wordPoints: number;
  longestWord: string;
  elapsedMs: number;
  reachedTarget: boolean;
  targetReachedMs: number | null;
}

export interface KnowMeAttempt {
  gameType: 'knowMe';
  playerId: string;
  dayNumber: number;
  completedAt: Timestamp | null;
  ownAnswer: string;       // A, B, C, or D
  partnerPrediction: string; // A, B, C, or D
}

export type GameAttempt =
  | FiveLetterAttempt
  | SudokuAttempt
  | WordGridAttempt
  | KnowMeAttempt;

// --- UI State ---

export interface AppState {
  user: { uid: string } | null;
  roomId: string | null;
  room: Room | null;
  playerId: string | null;
  playerNumber: 1 | 2 | null;
}

// --- Game Config ---

export const GAME_CONFIG = {
  TOTAL_DAYS: 10,
  DAY_DURATION_MS: 24 * 60 * 60 * 1000,
  FIVE_LETTER_MAX_GUESSES: 6,
  FIVE_LETTER_WORD_LENGTH: 5,
  SUDOKU_SIZE: 6,
  SUDOKU_TIME_LIMIT_MS: 5 * 60 * 1000,
  SUDOKU_CHECK_PENALTY_MS: 15 * 1000,
  WORD_GRID_SIZE: 4,
  WORD_GRID_TIME_LIMIT_MS: 4 * 60 * 1000,
  WORD_GRID_TARGET_POINTS: 10,
  WORD_GRID_MIN_WORD_LENGTH: 3,
  KNOW_ME_OPTIONS_COUNT: 4,
} as const;

export const WORD_POINTS: Record<number, number> = {
  3: 1,
  4: 1,
  5: 2,
  6: 3,
};
// 7+ letters = 5 points (handled in code)

export function getWordPoints(length: number): number {
  if (length >= 7) return 5;
  return WORD_POINTS[length] ?? 0;
}
