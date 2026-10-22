// ============================================================
// Landing Page — Two-Player Access Code Login with Hints & Session Expiry
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ensureFixedTwoPlayerGame, verifyPlayerCode, FIXED_ROOM_ID } from '../lib/roomService';
import { ensureAuth } from '../lib/firebase';
import { recordAccessLog } from '../lib/tracking';
import './LandingPage.css';

export default function LandingPage() {
  const navigate = useNavigate();
  const [inputCode, setInputCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<'prathmesh' | 'vidhi' | null>(null);
  const [showHintModal, setShowHintModal] = useState(false);
  const [showIntroPop, setShowIntroPop] = useState(true);

  // Auto-login if previously logged in AND session is within 24 hours
  useEffect(() => {
    async function autoLogin() {
      try {
        await ensureAuth();
        const savedPlayer = localStorage.getItem('fourUs_active_player');
        const loginTimeStr = localStorage.getItem('fourUs_login_time');

        if (savedPlayer === 'prathmesh' || savedPlayer === 'vidhi') {
          const loginTime = loginTimeStr ? parseInt(loginTimeStr, 10) : 0;
          const isExpired = !loginTime || Date.now() - loginTime > 24 * 60 * 60 * 1000;

          if (isExpired) {
            localStorage.removeItem('fourUs_active_player');
            localStorage.removeItem('fourUs_login_time');
            setError('Your 24-hour login session has expired. Please enter your passcode again.');
            return;
          }

          await ensureFixedTwoPlayerGame();
          recordAccessLog(savedPlayer, 'auto_login');
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

    const trimmed = inputCode.trim().toUpperCase();
    if (!trimmed) {
      setError('Please enter your 6-character player passcode.');
      return;
    }

    const matchedPlayer = verifyPlayerCode(trimmed);

    if (!matchedPlayer) {
      if (selectedPlayer === 'vidhi') {
        setError('Incorrect passcode for Vidhi. Tap "Need a hint? 💡" below!');
      } else if (selectedPlayer === 'prathmesh') {
        setError('Incorrect passcode for Prathmesh. Please try again.');
      } else {
        setError('Invalid passcode. Please enter your 6-character secret code.');
      }
      return;
    }

    if (selectedPlayer && selectedPlayer !== matchedPlayer) {
      setError(`This passcode is for ${matchedPlayer === 'vidhi' ? 'Vidhi' : 'Prathmesh'}. Please select ${matchedPlayer === 'vidhi' ? 'Vidhi 🌸' : 'Prathmesh 🦁'}.`);
      return;
    }

    setLoading(true);
    try {
      await ensureAuth();
      await ensureFixedTwoPlayerGame();
      // Keep user logged in on device with 24-hour session timestamp
      localStorage.setItem('fourUs_active_player', matchedPlayer);
      localStorage.setItem('fourUs_login_time', String(Date.now()));
      localStorage.setItem('fourUs_show_welcome', 'true');
      recordAccessLog(matchedPlayer, 'login');
      navigate(`/room/${FIXED_ROOM_ID}`);
    } catch (err: unknown) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerSelect = (player: 'prathmesh' | 'vidhi') => {
    setSelectedPlayer(player);
    setError('');
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

        {/* Player Choice Selection */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          <button
            type="button"
            onClick={() => handlePlayerSelect('prathmesh')}
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
            onClick={() => handlePlayerSelect('vidhi')}
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

        {/* Passcode Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px', textAlign: 'left' }}>
              {selectedPlayer === 'prathmesh'
                ? "Enter Prathmesh's Passcode"
                : selectedPlayer === 'vidhi'
                ? "Enter Vidhi's Passcode"
                : "Player Passcode"}
            </label>
            <input
              type="text"
              value={inputCode}
              onChange={(e) => {
                setInputCode(e.target.value);
                const matched = verifyPlayerCode(e.target.value);
                if (matched) setSelectedPlayer(matched);
              }}
              placeholder={
                selectedPlayer === 'vidhi'
                  ? '6-character code'
                  : selectedPlayer === 'prathmesh'
                  ? '6-character code'
                  : 'Enter 6-char passcode'
              }
              maxLength={10}
              autoCapitalize="characters"
              autoComplete="off"
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: '14px',
                border: '1.5px solid #cbd5e1',
                fontSize: '1.1rem',
                fontWeight: 800,
                textAlign: 'center',
                letterSpacing: '0.15em',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />

            {/* Hint Button for Vidhi */}
            {(selectedPlayer === 'vidhi' || !selectedPlayer) && (
              <div style={{ marginTop: '8px', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => setShowHintModal(true)}
                  style={{
                    background: '#f0fdfa',
                    border: '1px solid #99f6e4',
                    color: '#0d9488',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>💡</span>
                  <span>Give Hint for Vidhi</span>
                </button>
              </div>
            )}
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
            {loading ? 'Entering Game...' : "Let's Play →"}
          </button>
        </form>
      </div>

      {/* Vidhi's Passcode Hint Modal */}
      {showHintModal && (
        <div className="landing-hint-overlay" onClick={() => setShowHintModal(false)}>
          <div className="landing-hint-card animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🌸💡</div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1e293b', margin: '0 0 6px 0' }}>
              Vidhi's Passcode Clue
            </h2>
            <p style={{ color: '#0d9488', fontWeight: 800, fontSize: '0.82rem', margin: '0 0 12px 0' }}>
              The code is exactly 6 characters long
            </p>

            <div
              style={{
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '16px',
                padding: '14px 16px',
                margin: '0 0 20px 0',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem', color: '#1e293b', fontWeight: 700 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: '#ec4899', fontWeight: 900, minWidth: '22px' }}>(1)</span>
                  <span>I LOVE _</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: '#ec4899', fontWeight: 900, minWidth: '22px' }}>(2)</span>
                  <span>YOU ARE _T</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: '#ec4899', fontWeight: 900, minWidth: '22px' }}>(3)</span>
                  <span>My favourite date (DDMM)</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-full"
              style={{ padding: '12px', borderRadius: '12px', fontWeight: 800 }}
              onClick={() => setShowHintModal(false)}
            >
              Got it! Let's Enter 💖
            </button>
          </div>
        </div>
      )}

      {/* Playful Intro Popup before login window */}
      {showIntroPop && (
        <div className="landing-intro-overlay" onClick={() => setShowIntroPop(false)}>
          <div className="landing-intro-card animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="landing-intro-emoji">😉</div>
            <p className="landing-intro-text">
              Don't worry baby its nothing cliche, just very competitive 😉
            </p>
            <button
              type="button"
              className="landing-intro-btn"
              onClick={() => setShowIntroPop(false)}
            >
              Bring it on! 😏
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
