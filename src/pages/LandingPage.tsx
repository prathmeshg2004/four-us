// ============================================================
// Landing Page — Create or Join a Room
// ============================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRoom, findRoomByCode, joinRoom } from '../lib/roomService';
import { ensureAuth } from '../lib/firebase';
import { PlayerColor, PLAYER_COLORS } from '../types';
import './LandingPage.css';

const EMOJIS = ['😊', '😎', '🥰', '🤗', '😄', '🌟', '💫', '🎮', '🎯', '💜', '🦋', '🌸'];

export default function LandingPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'home' | 'create' | 'join' | 'recover'>('home');
  const [displayName, setDisplayName] = useState('');
  const [selectedColor, setSelectedColor] = useState<PlayerColor>('coral');
  const [selectedEmoji, setSelectedEmoji] = useState('😊');
  const [roomCode, setRoomCode] = useState('');
  const [recoveryToken, setRecoveryToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!displayName.trim()) {
      setError('Please enter a display name');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { roomId } = await createRoom(
        displayName.trim(),
        selectedColor,
        selectedEmoji
      );
      navigate(`/room/${roomId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!displayName.trim()) {
      setError('Please enter a display name');
      return;
    }
    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const roomId = await findRoomByCode(roomCode.trim());
      if (!roomId) {
        setError('Room not found. Check the code and try again.');
        setLoading(false);
        return;
      }
      await joinRoom(roomId, displayName.trim(), selectedColor, selectedEmoji);
      navigate(`/room/${roomId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to join room');
    } finally {
      setLoading(false);
    }
  };

  const handleRecover = async () => {
    if (!recoveryToken.trim()) {
      setError('Please enter your recovery token');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { recoverRoom } = await import('../lib/roomService');
      const result = await recoverRoom(recoveryToken.trim());
      if (!result) {
        setError('Invalid recovery token');
        setLoading(false);
        return;
      }
      localStorage.setItem('fourUs_roomId', result.roomId);
      navigate(`/room/${result.roomId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Recovery failed');
    } finally {
      setLoading(false);
    }
  };

  // Check for existing room and ensure auth on mount
  React.useEffect(() => {
    ensureAuth().catch(console.error);
    const savedRoom = localStorage.getItem('fourUs_roomId');
    if (savedRoom) {
      navigate(`/room/${savedRoom}`);
    }
  }, [navigate]);

  if (mode === 'home') {
    return (
      <div className="landing-page">
        <div className="landing-hero">
          <div className="landing-logo">🎮</div>
          <h1 className="landing-title">Four Us</h1>
          <p className="landing-subtitle">
            A 10-day game for two. Four daily challenges.<br />
            Who knows each other best?
          </p>
        </div>

        <div className="landing-actions">
          <button
            className="btn btn-primary btn-large btn-full"
            onClick={() => setMode('create')}
          >
            Create Room
          </button>
          <button
            className="btn btn-secondary btn-large btn-full"
            onClick={() => setMode('join')}
          >
            Join Room
          </button>
          <button
            className="landing-recover-link"
            onClick={() => setMode('recover')}
          >
            Recover existing game
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="landing-page">
      <button className="landing-back" onClick={() => { setMode('home'); setError(''); }}>
        ← Back
      </button>

      <div className="landing-form">
        <h2>{mode === 'create' ? 'Create Room' : mode === 'join' ? 'Join Room' : 'Recover Game'}</h2>

        {mode === 'recover' ? (
          <>
            <div className="form-group">
              <label>Recovery Token</label>
              <input
                className="input"
                type="text"
                placeholder="Enter your recovery token"
                value={recoveryToken}
                onChange={(e) => setRecoveryToken(e.target.value)}
              />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button
              className="btn btn-primary btn-full"
              onClick={handleRecover}
              disabled={loading}
            >
              {loading ? 'Recovering...' : 'Recover'}
            </button>
          </>
        ) : (
          <>
            <div className="form-group">
              <label>Display Name</label>
              <input
                className="input"
                type="text"
                placeholder="Your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={20}
              />
            </div>

            {mode === 'join' && (
              <div className="form-group">
                <label>Room Code</label>
                <input
                  className="input room-code-input"
                  type="text"
                  placeholder="e.g. ABC123"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  maxLength={6}
                />
              </div>
            )}

            <div className="form-group">
              <label>Choose your color</label>
              <div className="color-picker">
                {(Object.entries(PLAYER_COLORS) as [PlayerColor, string][]).map(
                  ([name, hex]) => (
                    <button
                      key={name}
                      className={`color-swatch ${selectedColor === name ? 'selected' : ''}`}
                      style={{ backgroundColor: hex }}
                      onClick={() => setSelectedColor(name)}
                      aria-label={name}
                    />
                  )
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Choose an avatar</label>
              <div className="emoji-picker">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    className={`emoji-btn ${selectedEmoji === emoji ? 'selected' : ''}`}
                    onClick={() => setSelectedEmoji(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="error-text">{error}</p>}

            <button
              className="btn btn-primary btn-full"
              onClick={mode === 'create' ? handleCreate : handleJoin}
              disabled={loading}
            >
              {loading
                ? mode === 'create'
                  ? 'Creating...'
                  : 'Joining...'
                : mode === 'create'
                ? 'Create Room'
                : 'Join Room'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
