// ============================================================
// Room Page — Central Room State Controller
// ============================================================

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useRoom } from '../hooks/useRoom';
import LobbyPage from './LobbyPage';
import DashboardPage from './DashboardPage';
import FinalResultsPage from './FinalResultsPage';

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { room, members, days, loading: roomLoading } = useRoom(roomId || null);

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

  // Two-player game authentication
  const activePlayer = localStorage.getItem('fourUs_active_player');
  const effectiveUserId = (activePlayer === 'prathmesh' || activePlayer === 'vidhi')
    ? activePlayer
    : user.uid;

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
