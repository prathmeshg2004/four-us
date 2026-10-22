// ============================================================
// Room Service — Create, Join, Ready, Start
// ============================================================

import {
  doc,
  collection,
  setDoc,
  getDoc,
  updateDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  runTransaction,
} from 'firebase/firestore';
import { db, auth, ensureAuth } from './firebase';
import { Room, PlayerMember, PlayerColor, RoomStatus } from '../types';

// Generate a short 6-char alphanumeric room code
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Generate a recovery token
function generateRecoveryToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 24; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

export async function createRoom(
  displayName: string,
  color: PlayerColor,
  avatar: string
): Promise<{ roomId: string; code: string; recoveryToken: string }> {
  let user = auth.currentUser;
  if (!user) {
    user = await ensureAuth();
  }

  const roomRef = doc(collection(db, 'rooms'));
  const roomId = roomRef.id;
  const code = generateRoomCode();
  const recoveryToken = generateRecoveryToken();

  const roomData: Omit<Room, 'startAt'> & { startAt: null } = {
    code: code.toUpperCase(),
    status: 'waiting' as RoomStatus,
    createdAt: serverTimestamp() as unknown as Timestamp,
    startAt: null,
    currentDay: 0,
    player1Id: user.uid,
    player2Id: null,
    player1Score: 0,
    player2Score: 0,
    player1RecoveryToken: recoveryToken,
    player2RecoveryToken: null,
  };

  await setDoc(roomRef, roomData);

  // Create player member record
  const memberRef = doc(db, 'rooms', roomId, 'members', user.uid);
  const memberData: PlayerMember = {
    displayName,
    color,
    avatar,
    ready: false,
    joinedAt: serverTimestamp() as unknown as Timestamp,
  };
  await setDoc(memberRef, memberData);

  // Store room association locally
  localStorage.setItem('fourUs_roomId', roomId);
  localStorage.setItem('fourUs_playerId', user.uid);
  localStorage.setItem('fourUs_recoveryToken', recoveryToken);

  return { roomId, code, recoveryToken };
}

export async function findRoomByCode(code: string): Promise<string | null> {
  let user = auth.currentUser;
  if (!user) {
    user = await ensureAuth();
  }

  const q = query(
    collection(db, 'rooms'),
    where('code', '==', code.toUpperCase())
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].id;
}

export async function joinRoom(
  roomId: string,
  displayName: string,
  color: PlayerColor,
  avatar: string
): Promise<{ recoveryToken: string }> {
  let user = auth.currentUser;
  if (!user) {
    user = await ensureAuth();
  }

  const roomRef = doc(db, 'rooms', roomId);
  const recoveryToken = generateRecoveryToken();

  await runTransaction(db, async (transaction) => {
    const roomSnap = await transaction.get(roomRef);
    if (!roomSnap.exists()) throw new Error('Room not found');

    const room = roomSnap.data() as Room;

    // Check if this user is already player 1
    if (room.player1Id === user.uid) {
      throw new Error('You are already in this room as Player 1');
    }

    // Check if user is already player 2
    if (room.player2Id === user.uid) {
      throw new Error('You are already in this room');
    }

    // Check room is joinable
    if (room.status !== 'waiting' && room.status !== 'lobby') {
      throw new Error('This room is no longer accepting players');
    }

    if (room.player2Id && room.player2Id !== user.uid) {
      throw new Error('Room is full');
    }

    transaction.update(roomRef, {
      player2Id: user.uid,
      player2RecoveryToken: recoveryToken,
      status: 'lobby',
    });
  });

  // Create player member record
  const memberRef = doc(db, 'rooms', roomId, 'members', user.uid);
  const memberData: PlayerMember = {
    displayName,
    color,
    avatar,
    ready: false,
    joinedAt: serverTimestamp() as unknown as Timestamp,
  };
  await setDoc(memberRef, memberData);

  localStorage.setItem('fourUs_roomId', roomId);
  localStorage.setItem('fourUs_playerId', user.uid);
  localStorage.setItem('fourUs_recoveryToken', recoveryToken);

  return { recoveryToken };
}

export async function setReady(roomId: string, ready: boolean): Promise<void> {
  let user = auth.currentUser;
  if (!user) {
    user = await ensureAuth();
  }

  const memberRef = doc(db, 'rooms', roomId, 'members', user.uid);
  await updateDoc(memberRef, { ready });
}

export async function startGame(roomId: string): Promise<void> {
  let user = auth.currentUser;
  if (!user) {
    user = await ensureAuth();
  }

  const roomRef = doc(db, 'rooms', roomId);

  await runTransaction(db, async (transaction) => {
    const roomSnap = await transaction.get(roomRef);
    if (!roomSnap.exists()) throw new Error('Room not found');

    const room = roomSnap.data() as Room;

    if (room.player1Id !== user.uid) {
      throw new Error('Only the room creator can start the game');
    }

    if (room.status !== 'lobby') {
      throw new Error('Game cannot be started in current state');
    }

    // Check both members are ready
    const member1Snap = await transaction.get(
      doc(db, 'rooms', roomId, 'members', room.player1Id)
    );
    const member2Snap = room.player2Id
      ? await transaction.get(
          doc(db, 'rooms', roomId, 'members', room.player2Id)
        )
      : null;

    if (
      !member1Snap.exists() ||
      !member2Snap?.exists() ||
      !(member1Snap.data() as PlayerMember).ready ||
      !(member2Snap.data() as PlayerMember).ready
    ) {
      throw new Error('Both players must be ready');
    }

    const now = Timestamp.now();
    transaction.update(roomRef, {
      status: 'active',
      startAt: serverTimestamp(),
      currentDay: 1,
    });

    // Create day 1 through 10 records
    for (let day = 1; day <= 10; day++) {
      const dayStartMs = now.toMillis() + (day - 1) * 24 * 60 * 60 * 1000;
      const dayEndMs = dayStartMs + 24 * 60 * 60 * 1000;

      const dayRef = doc(db, 'rooms', roomId, 'days', String(day));
      transaction.set(dayRef, {
        dayNumber: day,
        startsAt: Timestamp.fromMillis(dayStartMs),
        endsAt: Timestamp.fromMillis(dayEndMs),
        finalized: false,
        resultSummary: null,
      });

      // Create status docs for both players
      if (room.player1Id) {
        const status1Ref = doc(
          db, 'rooms', roomId, 'days', String(day), 'statuses', room.player1Id
        );
        transaction.set(status1Ref, {
          fiveLetterAttempted: false,
          sudokuAttempted: false,
          wordGridAttempted: false,
          knowMeAttempted: false,
        });
      }
      if (room.player2Id) {
        const status2Ref = doc(
          db, 'rooms', roomId, 'days', String(day), 'statuses', room.player2Id
        );
        transaction.set(status2Ref, {
          fiveLetterAttempted: false,
          sudokuAttempted: false,
          wordGridAttempted: false,
          knowMeAttempted: false,
        });
      }
    }
  });
}

export function subscribeToRoom(
  roomId: string,
  callback: (room: Room | null) => void
) {
  const roomRef = doc(db, 'rooms', roomId);
  return onSnapshot(roomRef, (snap) => {
    if (snap.exists()) {
      callback({ ...snap.data() } as Room);
    } else {
      callback(null);
    }
  });
}

export function subscribeToMembers(
  roomId: string,
  callback: (members: Record<string, PlayerMember>) => void
) {
  const membersRef = collection(db, 'rooms', roomId, 'members');
  return onSnapshot(membersRef, (snap) => {
    const members: Record<string, PlayerMember> = {};
    snap.forEach((doc) => {
      members[doc.id] = doc.data() as PlayerMember;
    });
    callback(members);
  });
}

export function subscribeToDayStatuses(
  roomId: string,
  dayNumber: number,
  callback: (statuses: Record<string, import('../types').PlayerDayStatus>) => void
) {
  const statusesRef = collection(
    db, 'rooms', roomId, 'days', String(dayNumber), 'statuses'
  );
  return onSnapshot(statusesRef, (snap) => {
    const statuses: Record<string, import('../types').PlayerDayStatus> = {};
    snap.forEach((d) => {
      statuses[d.id] = d.data() as import('../types').PlayerDayStatus;
    });
    callback(statuses);
  });
}

export function subscribeToDays(
  roomId: string,
  callback: (days: Record<number, import('../types').DayRecord>) => void
) {
  const daysRef = collection(db, 'rooms', roomId, 'days');
  return onSnapshot(daysRef, (snap) => {
    const days: Record<number, import('../types').DayRecord> = {};
    snap.forEach((d) => {
      const data = d.data() as import('../types').DayRecord;
      days[data.dayNumber] = data;
    });
    callback(days);
  });
}

export async function recoverRoom(recoveryToken: string): Promise<{
  roomId: string;
  playerNumber: 1 | 2;
} | null> {
  // Search for room with this recovery token
  let q = query(
    collection(db, 'rooms'),
    where('player1RecoveryToken', '==', recoveryToken)
  );
  let snap = await getDocs(q);
  if (!snap.empty) {
    const roomId = snap.docs[0].id;
    return { roomId, playerNumber: 1 };
  }

  q = query(
    collection(db, 'rooms'),
    where('player2RecoveryToken', '==', recoveryToken)
  );
  snap = await getDocs(q);
  if (!snap.empty) {
    const roomId = snap.docs[0].id;
    return { roomId, playerNumber: 2 };
  }

  return null;
}
