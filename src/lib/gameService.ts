// ============================================================
// Game Submission Service
// ============================================================

import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  runTransaction,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, auth, functions, ensureAuth } from './firebase';
import {
  FiveLetterAttempt,
  SudokuAttempt,
  WordGridAttempt,
  KnowMeAttempt,
  GameType,
} from '../types';

// Submit a game attempt
export async function submitAttempt(
  roomId: string,
  dayNumber: number,
  attempt: FiveLetterAttempt | SudokuAttempt | WordGridAttempt | KnowMeAttempt
): Promise<void> {
  let user = auth.currentUser;
  if (!user) user = await ensureAuth();

  const attemptRef = doc(
    db, 'rooms', roomId, 'days', String(dayNumber), 'attempts', user.uid
  );

  // Use a transaction to prevent duplicate submissions
  await runTransaction(db, async (transaction) => {
    const existing = await transaction.get(attemptRef);

    // Check if this specific game was already submitted
    if (existing.exists()) {
      const data = existing.data();
      const gameKey = attempt.gameType;
      if (data[gameKey]) {
        throw new Error('Already submitted this game');
      }
      // Merge with existing attempt doc
      transaction.update(attemptRef, {
        [gameKey]: attempt,
      });
    } else {
      transaction.set(attemptRef, {
        [attempt.gameType]: attempt,
      });
    }

    // Update the public status
    const statusRef = doc(
      db, 'rooms', roomId, 'days', String(dayNumber), 'statuses', user.uid
    );
    const statusKey = `${attempt.gameType}Attempted`;
    transaction.update(statusRef, {
      [statusKey]: true,
    });
  });
}

// Get the current player's attempt for a specific game
export async function getMyAttempt(
  roomId: string,
  dayNumber: number,
  gameType: GameType
): Promise<FiveLetterAttempt | SudokuAttempt | WordGridAttempt | KnowMeAttempt | null> {
  let user = auth.currentUser;
  if (!user) user = await ensureAuth();

  const attemptRef = doc(
    db, 'rooms', roomId, 'days', String(dayNumber), 'attempts', user.uid
  );
  const snap = await getDoc(attemptRef);

  if (!snap.exists()) return null;
  const data = snap.data();
  return data[gameType] || null;
}

// Save in-progress game state (for persistence across refreshes)
export async function saveGameProgress(
  roomId: string,
  dayNumber: number,
  gameType: GameType,
  progressData: Record<string, unknown>
): Promise<void> {
  let user = auth.currentUser;
  if (!user) user = await ensureAuth();

  const progressRef = doc(
    db, 'rooms', roomId, 'days', String(dayNumber), 'progress', user.uid
  );

  await setDoc(progressRef, {
    [gameType]: {
      ...progressData,
      updatedAt: serverTimestamp(),
    },
  }, { merge: true });
}

// Get in-progress game state
export async function getGameProgress(
  roomId: string,
  dayNumber: number,
  gameType: GameType
): Promise<Record<string, unknown> | null> {
  let user = auth.currentUser;
  if (!user) user = await ensureAuth();

  const progressRef = doc(
    db, 'rooms', roomId, 'days', String(dayNumber), 'progress', user.uid
  );
  const snap = await getDoc(progressRef);

  if (!snap.exists()) return null;
  return snap.data()[gameType] || null;
}

// Trigger day finalization (called when player opens app after boundary)
export async function triggerFinalization(
  roomId: string,
  dayNumber: number
): Promise<void> {
  try {
    const finalize = httpsCallable(functions, 'finalizeDay');
    await finalize({ roomId, dayNumber });
  } catch (err) {
    console.error('Finalization error:', err);
    // Non-fatal — finalization might already be done
  }
}

// Get the day content for a specific day
export async function getDayContent(
  roomId: string,
  dayNumber: number
): Promise<Record<string, unknown> | null> {
  const contentRef = doc(db, 'rooms', roomId, 'content', String(dayNumber));
  const snap = await getDoc(contentRef);
  if (!snap.exists()) return null;
  return snap.data();
}
