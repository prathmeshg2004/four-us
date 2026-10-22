// ============================================================
// Join Page — Direct Link Handler (/join/:code)
// ============================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { findRoomByCode, joinRoom } from '../lib/roomService';
import { PlayerColor, PLAYER_COLORS } from '../types';
import './LandingPage.css';

const EMOJIS = ['😊', '😎', '🥰', '🤗', '😄', '🌟', '💫', '🎮', '🎯', '💜', '🦋', '🌸'];

export default function JoinPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [selectedColor, setSelectedColor] = useState<PlayerColor>('teal');
  const [selectedEmoji, setSelectedEmoji] = useState('🥰');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvedRoomId, setResolvedRoomId] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    findRoomByCode(code).then((id) => {
      if (id) {
        setResolvedRoomId(id);
      } else {
        setError('Invalid or expired invite link');
      }
    });
  }, [code]);

  const handleJoin = async () => {
    if (!displayName.trim()) {
      setError('Please enter a display name');
      return;
    }
    if (!resolvedRoomId) {
      setError('Room not found');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await joinRoom(resolvedRoomId, displayName.trim(), selectedColor, selectedEmoji);
      navigate(`/room/${resolvedRoomId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to join room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-page animate-fade-in">
      <div className="landing-form" style={{ marginTop: '30px' }}>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '3rem' }}>💌</div>
          <h2>Join Game</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            You've been invited to play <strong>Four Us</strong>!
          </p>
        </div>

        <div className="form-group">
          <label>Your Display Name</label>
          <input
            className="input"
            type="text"
            placeholder="e.g. Alex"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={20}
          />
        </div>

        <div className="form-group">
          <label>Pick your color</label>
          <div className="color-picker">
            {(Object.entries(PLAYER_COLORS) as [PlayerColor, string][]).map(
              ([name, hex]) => (
                <button
                  key={name}
                  type="button"
                  className={`color-swatch ${selectedColor === name ? 'selected' : ''}`}
                  style={{ backgroundColor: hex }}
                  onClick={() => setSelectedColor(name)}
                />
              )
            )}
          </div>
        </div>

        <div className="form-group">
          <label>Pick an avatar</label>
          <div className="emoji-picker">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className={`emoji-btn ${selectedEmoji === emoji ? 'selected' : ''}`}
                onClick={() => setSelectedEmoji(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="error-text">{error}</div>}

        <button
          className="btn btn-primary btn-full"
          disabled={loading || !resolvedRoomId}
          onClick={handleJoin}
        >
          {loading ? 'Joining Room...' : 'Enter Lobby →'}
        </button>
      </div>
    </div>
  );
}
