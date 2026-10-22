// ============================================================
// Tracking Service — IP & Access Logger for Four Us
// ============================================================

import { doc, updateDoc, setDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { FIXED_ROOM_ID } from './roomService';

export interface AccessLogItem {
  ip: string;
  city: string;
  region: string;
  country: string;
  isp: string;
  timeIST: string;
  eventType: string;
  device: string;
  platform: string;
  screen: string;
  timestampMs: number;
}

export async function recordAccessLog(
  player: 'prathmesh' | 'vidhi' | string,
  eventType: 'login' | 'auto_login' | 'dashboard_visit' = 'login'
): Promise<void> {
  try {
    let ip = 'unknown';
    let city = 'unknown';
    let region = 'unknown';
    let country = 'unknown';
    let isp = 'unknown';

    // 1. Try ipapi.co for rich geolocation & IP data
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        ip = data.ip || ip;
        city = data.city || city;
        region = data.region || region;
        country = data.country_name || country;
        isp = data.org || isp;
      }
    } catch {
      // 2. Fallback to ipify if ipapi.co fails or times out
      try {
        const controller2 = new AbortController();
        const timeoutId2 = setTimeout(() => controller2.abort(), 2500);
        const res2 = await fetch('https://api.ipify.org?format=json', { signal: controller2.signal });
        clearTimeout(timeoutId2);

        if (res2.ok) {
          const data2 = await res2.json();
          ip = data2.ip || ip;
        }
      } catch {
        // Fallback silently
      }
    }

    const istTime = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'medium',
    });

    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
    const platform = typeof navigator !== 'undefined' ? navigator.platform || 'unknown' : 'unknown';
    const screen = typeof window !== 'undefined' ? `${window.screen?.width}x${window.screen?.height}` : 'unknown';
    const nowMs = Date.now();

    const entry: AccessLogItem = {
      ip,
      city,
      region,
      country,
      isp,
      timeIST: istTime,
      eventType,
      device: userAgent,
      platform,
      screen,
      timestampMs: nowMs,
    };

    // Save directly to the player's member document (always permitted under current rules)
    const memberRef = doc(db, 'rooms', FIXED_ROOM_ID, 'members', player);
    await updateDoc(memberRef, {
      lastIp: ip,
      lastCity: `${city}, ${region}, ${country}`,
      lastIsp: isp,
      lastAccessTime: istTime,
      lastDevice: userAgent,
      lastSeen: istTime,
      accessHistory: arrayUnion(entry),
    }).catch(console.warn);

    // Also attempt saving to top-level access_logs
    try {
      const logId = `${nowMs}_${player}_${Math.random().toString(36).substring(2, 6)}`;
      await setDoc(doc(db, 'access_logs', logId), {
        ...entry,
        player,
        timestamp: serverTimestamp(),
      });
    } catch {
      // Silently ignore if top-level collection rules are strict
    }
  } catch (err) {
    // Fail silently so logging never hinders gameplay
    console.warn('Access log note:', err);
  }
}
