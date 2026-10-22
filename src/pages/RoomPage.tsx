// ============================================================
// Room Page — Central Room State Controller
// ============================================================

import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useRoom } from '../hooks/useRoom';
import { recordAccessLog } from '../lib/tracking';
import LobbyPage from './LobbyPage';
import DashboardPage from './DashboardPage';
import FinalResultsPage from './FinalResultsPage';

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { room, members, days, loading: roomLoading } = useRoom(roomId || null);

  // Two-player game authentication & 24-hour session values
  const activePlayer = typeof window !== 'undefined' ? localStorage.getItem('fourUs_active_player') : null;
  const loginTimeStr = typeof window !== 'undefined' ? localStorage.getItem('fourUs_login_time') : null;
  const loginTime = loginTimeStr ? parseInt(loginTimeStr, 10) : 0;
  const isSessionExpired = !loginTime || Date.now() - loginTime > 24 * 60 * 60 * 1000;

  const effectiveUserId = (activePlayer === 'prathmesh' || activePlayer === 'vidhi')
    ? activePlayer
    : user?.uid || '';

  // ALL hooks MUST run unconditionally at top level (React Rule of Hooks)
  useEffect(() => {
    if (activePlayer && isSessionExpired) {
      localStorage.removeItem('fourUs_active_player');
      localStorage.removeItem('fourUs_login_time');
      navigate('/');
      return;
    }

    if (effectiveUserId === 'prathmesh' || effectiveUserId === 'vidhi') {
      recordAccessLog(effectiveUserId, 'visit');
    }
  }, [activePlayer, isSessionExpired, effectiveUserId, navigate]);

  // Conditional rendering AFTER all hooks have executed:
  if (activePlayer && isSessionExpired) {
    return null;
  }

  if (authLoading || roomLoading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100dvh',
          gap: '14px',
        }}
      >
        <div className="spinner" />
        <span style={{ color: '#64748b', fontWeight: 600 }}>Connecting to room...</span>
      </div>
    );
  }

  if (!room || !roomId || !user) {
    return (
      <div
        className="container"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100dvh',
          textAlign: 'center',
          gap: '16px',
        }}
      >
        <div style={{ fontSize: '3rem' }}>🔍</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Room Not Found</h2>
        <p style={{ color: '#64748b', maxWidth: '300px' }}>
          This room does not exist or has expired. Check your room code or invitation link.
        </p>
        <button
          className="btn btn-primary"
          onClick={() => {
            localStorage.removeItem('fourUs_roomId');
            navigate('/');
          }}
        >
          Return Home
        </button>
      </div>
    );
  }

  // Branch based on room status
  if (room.status === 'waiting' || room.status === 'lobby') {
    return (
      <LobbyPage
        roomId={roomId}
        room={room}
        members={members}
        currentUserId={effectiveUserId}
      />
    );
  }

  if (room.status === 'active') {
    return (
      <DashboardPage
        roomId={roomId}
        room={room}
        members={members}
        days={days}
        currentUserId={effectiveUserId}
      />
    );
  }

  if (room.status === 'finished') {
    return <FinalResultsPage room={room} members={members} days={days} />;
  }

  return null;
}
