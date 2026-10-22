// ============================================================
// Landing Page — Two-Player Access Code Login
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ensureFixedTwoPlayerGame, verifyPlayerCode, FIXED_ROOM_ID } from '../lib/roomService';
import { ensureAuth } from '../lib/firebase';
import './LandingPage.css';

export default function LandingPage() {
  const navigate = useNavigate();
  const [inputCode, setInputCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<'prathmesh' | 'vidhi' | null>(null);

  // Auto-login if previously logged in
  useEffect(() => {
    async function autoLogin() {
      try {
        await ensureAuth();
        const savedPlayer = localStorage.getItem('fourUs_active_player');
        if (savedPlayer === 'prathmesh' || savedPlayer === 'vidhi') {
          await ensureFixedTwoPlayerGame();
          navigate(`/room/${FIXED_ROOM_ID}`);
        }
      } catch (err) {
        console.error('Auto login check error:', err);
      }
    }
    autoLogin();
  }, [navigate]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');

    const matchedPlayer = selectedPlayer || verifyPlayerCode(inputCode);

    if (!matchedPlayer) {
      setError('Invalid login code. Please enter your player code.');
      return;
    }

    setLoading(true);
    try {
      await ensureAuth();
      await ensureFixedTwoPlayerGame();
      localStorage.setItem('fourUs_active_player', matchedPlayer);
      localStorage.setItem('fourUs_show_welcome', 'true');
      navigate(`/room/${FIXED_ROOM_ID}`);
    } catch (err: unknown) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSelect = (player: 'prathmesh' | 'vidhi') => {
    setSelectedPlayer(player);
    setInputCode(player === 'prathmesh' ? 'PRATHMESH' : 'VIDHI');
  };

  return (
    <div className="landing-page animate-fade-in">
      <div className="landing-container" style={{ maxWidth: '380px', margin: '0 auto', textAlign: 'center', padding: '32px 16px' }}>
        {/* Brand Header */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '8px' }}>✨</div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#1e293b', margin: '0 0 6px 0' }}>
            Four Us
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem', margin: 0, fontWeight: 600 }}>
            Prathmesh &amp; Vidhi's 10-Day Duel
          </p>
        </div>

        {/* Quick Player Choice Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          <button
            type="button"
            onClick={() => handleQuickSelect('prathmesh')}
            style={{
              padding: '16px 12px',
              borderRadius: '16px',
              border: selectedPlayer === 'prathmesh' ? '2.5px solid #FF6B6B' : '1.5px solid #e2e8f0',
              background: selectedPlayer === 'prathmesh' ? '#fff5f5' : '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
              boxShadow: selectedPlayer === 'prathmesh' ? '0 4px 12px rgba(255, 107, 107, 0.2)' : '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <span style={{ fontSize: '2rem' }}>🦁</span>
            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b' }}>Prathmesh</span>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>Player 1</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickSelect('vidhi')}
            style={{
              padding: '16px 12px',
              borderRadius: '16px',
              border: selectedPlayer === 'vidhi' ? '2.5px solid #4ECDC4' : '1.5px solid #e2e8f0',
              background: selectedPlayer === 'vidhi' ? '#f0fdfa' : '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
              boxShadow: selectedPlayer === 'vidhi' ? '0 4px 12px rgba(78, 205, 196, 0.2)' : '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <span style={{ fontSize: '2rem' }}>🌸</span>
            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b' }}>Vidhi</span>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>Player 2</span>
          </button>
        </div>

        {/* Code Input Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px', textAlign: 'left' }}>
              Player Access Code
            </label>
            <input
              type="text"
              value={inputCode}
              onChange={(e) => {
                setInputCode(e.target.value);
                const matched = verifyPlayerCode(e.target.value);
                if (matched) setSelectedPlayer(matched);
              }}
              placeholder="Enter code (e.g. PRATHMESH or VIDHI)"
              autoCapitalize="characters"
              autoComplete="off"
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: '14px',
                border: '1.5px solid #cbd5e1',
                fontSize: '1rem',
                fontWeight: 700,
                textAlign: 'center',
                letterSpacing: '0.05em',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          {error && (
            <div style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '14px',
              borderRadius: '14px',
              border: 'none',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white',
              fontSize: '1rem',
              fontWeight: 800,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              boxShadow: '0 4px 14px rgba(102, 126, 234, 0.35)',
              transition: 'transform 0.15s ease',
            }}
          >
            {loading ? 'Entering Game...' : 'Let\'s Play →'}
          </button>
        </form>
      </div>
    </div>
  );
}
