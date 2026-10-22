// ============================================================
// Lobby Page — Two-Player Waiting Room & Ready Check
// ============================================================

import React, { useState } from 'react';
import { Room, PlayerMember, PLAYER_COLORS } from '../types';
import { setReady, startGame } from '../lib/roomService';
import './LobbyPage.css';

interface LobbyPageProps {
  roomId: string;
  room: Room;
  members: Record<string, PlayerMember>;
  currentUserId: string;
}

export default function LobbyPage({
  roomId,
  room,
  members,
  currentUserId,
}: LobbyPageProps) {
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isPlayer1 = room.player1Id === currentUserId;
  const isPlayer2 = room.player2Id === currentUserId;

  const player1Member = room.player1Id ? members[room.player1Id] : null;
  const player2Member = room.player2Id ? members[room.player2Id] : null;

  const myMember = members[currentUserId];
  const isReady = myMember?.ready || false;

  const bothPresent = Boolean(room.player1Id && room.player2Id && player1Member && player2Member);
  const bothReady = Boolean(player1Member?.ready && player2Member?.ready);

  const handleCopyLink = () => {
    const joinUrl = `${window.location.origin}/join/${room.code}`;
    navigator.clipboard.writeText(joinUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleToggleReady = async () => {
    setError(null);
    try {
      await setReady(roomId, !isReady);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update ready state');
    }
  };

  const handleStartGame = async () => {
    if (!isPlayer1 || !bothReady || starting) return;
    setStarting(true);
    setError(null);

    // Synchronized visual 3-2-1 countdown animation
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          startGame(roomId).catch((err) => {
            setError(err instanceof Error ? err.message : 'Failed to start game');
            setStarting(false);
            setCountdown(null);
          });
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className="lobby-page animate-fade-in">
      {countdown !== null && (
        <div className="lobby-start-overlay">
          <h2>Game Starting In</h2>
          <div className="lobby-countdown-num">{countdown}</div>
        </div>
      )}

      <div>
        <div className="lobby-header">
          <h1 className="lobby-title">Room Lobby</h1>
          <p className="lobby-subtitle">
            {bothPresent
              ? 'Both players connected! Mark ready to start.'
              : 'Share the invitation link with your partner.'}
          </p>
        </div>

        {/* Room Code Card */}
        <div className="lobby-code-card">
          <div className="lobby-code-label">Room Code</div>
          <div className="lobby-code-val">{room.code}</div>
          <button className="lobby-copy-btn" onClick={handleCopyLink}>
            {copied ? '✓ Link Copied!' : '🔗 Copy Invite Link'}
          </button>
        </div>

        {/* Players Grid */}
        <div className="lobby-players-grid">
          {/* Player 1 Card */}
          <div className={`lobby-player-card ${isPlayer1 ? 'is-me' : ''}`}>
            <div
              className="lobby-player-avatar"
              style={{
                borderColor: player1Member ? PLAYER_COLORS[player1Member.color] : '#ccc',
                backgroundColor: player1Member ? `${PLAYER_COLORS[player1Member.color]}15` : 'transparent',
              }}
            >
              {player1Member?.avatar || '👤'}
            </div>
            <div className="lobby-player-name">{player1Member?.displayName || 'Creator'}</div>
            <div className="lobby-player-role">Player 1 (Host)</div>
            <div
              className={`lobby-player-status ${
                player1Member?.ready ? 'ready' : 'not-ready'
              }`}
            >
              {player1Member?.ready ? '✓ Ready' : '⏳ Not Ready'}
            </div>
          </div>

          {/* Player 2 Card */}
          {player2Member ? (
            <div className={`lobby-player-card ${isPlayer2 ? 'is-me' : ''}`}>
              <div
                className="lobby-player-avatar"
                style={{
                  borderColor: PLAYER_COLORS[player2Member.color],
                  backgroundColor: `${PLAYER_COLORS[player2Member.color]}15`,
                }}
              >
                {player2Member.avatar}
              </div>
              <div className="lobby-player-name">{player2Member.displayName}</div>
              <div className="lobby-player-role">Player 2</div>
              <div
                className={`lobby-player-status ${
                  player2Member.ready ? 'ready' : 'not-ready'
                }`}
              >
                {player2Member.ready ? '✓ Ready' : '⏳ Not Ready'}
              </div>
            </div>
          ) : (
            <div className="lobby-waiting-card">
              <div className="lobby-waiting-icon">💌</div>
              <div className="lobby-waiting-text">Waiting for Partner to join...</div>
            </div>
          )}
        </div>

        {error && <div className="error-text" style={{ marginTop: '12px' }}>{error}</div>}
      </div>

      {/* Action Buttons */}
      <div className="lobby-actions">
        <button
          className={`btn btn-large btn-full ${isReady ? 'btn-secondary' : 'btn-primary'}`}
          onClick={handleToggleReady}
        >
          {isReady ? 'Cancel Ready' : 'I am Ready!'}
        </button>

        {isPlayer1 && (
          <button
            className="btn btn-primary btn-large btn-full"
            style={{
              background: bothReady
                ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                : '#94a3b8',
            }}
            disabled={!bothReady || starting}
            onClick={handleStartGame}
          >
            {bothReady ? '🚀 Start 10-Day Competition' : 'Waiting for Both Ready'}
          </button>
        )}
      </div>
    </div>
  );
}
