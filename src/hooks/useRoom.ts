// ============================================================
// useRoom — Room subscription hook
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import {
  Room,
  PlayerMember,
  DayRecord,
  PlayerDayStatus,
} from '../types';
import {
  subscribeToRoom,
  subscribeToMembers,
  subscribeToDays,
  subscribeToDayStatuses,
  subscribeToDayAttempts,
} from '../lib/roomService';

export function useRoom(roomId: string | null) {
  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<Record<string, PlayerMember>>({});
  const [days, setDays] = useState<Record<number, DayRecord>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubs: (() => void)[] = [];

    unsubs.push(
      subscribeToRoom(roomId, (r) => {
        setRoom(r);
        setLoading(false);
      })
    );

    unsubs.push(subscribeToMembers(roomId, setMembers));
    unsubs.push(subscribeToDays(roomId, setDays));

    return () => unsubs.forEach((u) => u());
  }, [roomId]);

  return { room, members, days, loading };
}

export function useDayStatuses(
  roomId: string | null,
  dayNumber: number
) {
  const [statuses, setStatuses] = useState<
    Record<string, PlayerDayStatus>
  >({});

  useEffect(() => {
    if (!roomId || dayNumber < 1) return;

    const unsub = subscribeToDayStatuses(roomId, dayNumber, setStatuses);
    return () => unsub();
  }, [roomId, dayNumber]);

  return statuses;
}

export function useDayAttempts(
  roomId: string | null,
  dayNumber: number
) {
  const [attempts, setAttempts] = useState<Record<string, Record<string, any>>>({});

  useEffect(() => {
    if (!roomId || dayNumber < 1) return;

    const unsub = subscribeToDayAttempts(roomId, dayNumber, setAttempts);
    return () => unsub();
  }, [roomId, dayNumber]);

  return attempts;
}
