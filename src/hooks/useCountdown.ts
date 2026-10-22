// ============================================================
// useCountdown — Server-time based countdown hook
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { Timestamp } from 'firebase/firestore';

interface CountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  isExpired: boolean;
  formatted: string;
}

export function useCountdown(targetTimestamp: Timestamp | null): CountdownResult {
  const getInitialRemaining = () => {
    if (!targetTimestamp) return 0;
    return Math.max(0, targetTimestamp.toMillis() - Date.now());
  };

  const [remaining, setRemaining] = useState<number>(getInitialRemaining);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!targetTimestamp) {
      setRemaining(0);
      return;
    }

    const targetMs = targetTimestamp.toMillis();

    const update = () => {
      const now = Date.now();
      const diff = Math.max(0, targetMs - now);
      setRemaining(diff);
    };

    update();
    intervalRef.current = setInterval(update, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [targetTimestamp]);

  const isExpired = Boolean(targetTimestamp && Date.now() >= targetTimestamp.toMillis());

  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, '0');

  let formatted: string;
  if (days > 0) {
    formatted = `${days}d ${pad(hours)}h ${pad(minutes)}m`;
  } else {
    formatted = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  return {
    days,
    hours,
    minutes,
    seconds,
    totalMs: remaining,
    isExpired,
    formatted,
  };
}

// Elapsed timer hook (counts up from a start timestamp)
export function useElapsedTimer(
  startTimestamp: Timestamp | null,
  running: boolean = true
): { elapsedMs: number; formatted: string } {
  const [elapsed, setElapsed] = useState<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!startTimestamp || !running) {
      return;
    }

    const startMs = startTimestamp.toMillis();

    const update = () => {
      const now = Date.now();
      setElapsed(Math.max(0, now - startMs));
    };

    update();
    intervalRef.current = setInterval(update, 100);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startTimestamp, running]);

  const totalSeconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  return {
    elapsedMs: elapsed,
    formatted: `${pad(minutes)}:${pad(seconds)}`,
  };
}
