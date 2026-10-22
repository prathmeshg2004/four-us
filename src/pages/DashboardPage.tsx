// ============================================================
// Dashboard Page — Two-Player Split Mobile Dashboard
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  Room,
  PlayerMember,
  DayRecord,
  PlayerDayStatus,
  GameType,
  PLAYER_COLORS,
} from '../types';
import { useDayStatuses } from '../hooks/useRoom';
import { useCountdown } from '../hooks/useCountdown';
import { finalizeDayInFirestore } from '../lib/scoring';
import FiveLetterGame from '../components/games/five-letter/FiveLetterGame';
import MiniSudokuGame from '../components/games/mini-sudoku/MiniSudokuGame';
import WordGridGame from '../components/games/word-grid/WordGridGame';
import KnowMeGame from '../components/games/know-me/KnowMeGame';
import DailyReveal from '../components/reveal/DailyReveal';
import TutorialModal from '../components/common/TutorialModal';
import FinalResultsPage from './FinalResultsPage';
import './DashboardPage.css';

interface DashboardPageProps {
  roomId: string;
  room: Room;
  members: Record<string, PlayerMember>;
  days: Record<number, DayRecord>;
  currentUserId: string;
}

const GAMES_LIST: { id: GameType; name: string; icon: string }[] = [
  { id: 'fiveLetter', name: 'Five Letter', icon: '🟩' },
  { id: 'sudoku', name: 'Mini Sudoku', icon: '🔢' },
  { id: 'wordGrid', name: 'Word Grid', icon: '🔤' },
  { id: 'knowMe', name: 'Know Me', icon: '💡' },
];

export default function DashboardPage({
  roomId,
  room,
  members,
  days,
  currentUserId,
}: DashboardPageProps) {
  const currentDay = room.currentDay || 1;
  const currentDayRecord = days[currentDay];

  // Subscribe to current day statuses
  const statuses = useDayStatuses(roomId, currentDay);

  // Modal states
  const [activeGame, setActiveGame] = useState<GameType | null>(null);
  const [revealDayNumber, setRevealDayNumber] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [skippingDay, setSkippingDay] = useState(false);

  // Players
  const p1Id = room.player1Id;
  const p2Id = room.player2Id || '';
  const p1Member = p1Id ? members[p1Id] : null;
  const p2Member = p2Id ? members[p2Id] : null;

  const myStatus = statuses[currentUserId];

  // Countdown to next daily reveal
  const nextRevealCountdown = useCountdown(currentDayRecord?.endsAt || null);

  // Overall 10-day countdown
  const finalDayRecord = days[10];
  const overallCountdown = useCountdown(finalDayRecord?.endsAt || null);

  // Show tutorial on first game start
  useEffect(() => {
    const tutorialSeen = localStorage.getItem('fourUs_tutorial_seen');
    if (!tutorialSeen) {
      setShowTutorial(true);
    }
  }, []);

  const handleCloseTutorial = () => {
    localStorage.setItem('fourUs_tutorial_seen', 'true');
    setShowTutorial(false);
  };

  // Safe rollover check: only finalize if endsAt exists and has strictly passed in real-time
  useEffect(() => {
    if (
      currentDayRecord?.endsAt &&
      Date.now() >= currentDayRecord.endsAt.toMillis() &&
      !currentDayRecord.finalized
    ) {
      finalizeDayInFirestore(roomId, currentDay).then(() => {
        setRevealDayNumber(currentDay);
      });
    }
  }, [currentDayRecord, roomId, currentDay]);

  // Check if previous day was finalized and needs a reveal presentation
  useEffect(() => {
    if (currentDay > 1) {
      const prevDay = currentDay - 1;
      const prevRecord = days[prevDay];
      const seenKey = `fourUs_seenReveal_d${prevDay}_${roomId}`;
      if (prevRecord?.finalized && !localStorage.getItem(seenKey)) {
        setRevealDayNumber(prevDay);
      }
    }
  }, [currentDay, days, roomId]);

  // Temporary Skip Day function
  const handleSkipDay = async () => {
    if (skippingDay) return;
    setSkippingDay(true);
    try {
      await finalizeDayInFirestore(roomId, currentDay);
      setRevealDayNumber(currentDay);
    } catch (err) {
      console.error('Failed to advance day:', err);
    } finally {
      setSkippingDay(false);
    }
  };

  // If room is completely finished (all 10 days finalized)
  if (room.status === 'finished' || (currentDay >= 10 && currentDayRecord?.finalized)) {
    return <FinalResultsPage room={room} members={members} days={days} />;
  }

  // Handle closing daily reveal
  const handleCloseReveal = () => {
    if (revealDayNumber) {
      localStorage.setItem(`fourUs_seenReveal_d${revealDayNumber}_${roomId}`, 'true');
    }
    setRevealDayNumber(null);
  };

  // Helper to check if a game is attempted
  const isGameAttempted = (status: PlayerDayStatus | undefined, game: GameType): boolean => {
    if (!status) return false;
    switch (game) {
      case 'fiveLetter':
        return status.fiveLetterAttempted;
      case 'sudoku':
        return status.sudokuAttempted;
      case 'wordGrid':
        return status.wordGridAttempted;
      case 'knowMe':
        return status.knowMeAttempted;
    }
  };

  const p1Color = p1Member ? PLAYER_COLORS[p1Member.color] : '#FF6B6B';
  const p2Color = p2Member ? PLAYER_COLORS[p2Member.color] : '#4ECDC4';

  return (
    <div
      className="dashboard-page animate-fade-in"
      style={
        {
          '--dash-p1-bg': `${p1Color}15`,
          '--dash-p2-bg': `${p2Color}15`,
        } as React.CSSProperties
      }
    >
      {/* Sticky Top Score Bar */}
      <div className="dash-sticky-top">
        {/* Player 1 Side */}
        <div className="dash-player-score-box">
          <div
            className="dash-avatar-badge"
            style={{
              borderColor: p1Color,
              backgroundColor: `${p1Color}15`,
            }}
          >
            {p1Member?.avatar || '👤'}
          </div>
          <div className="dash-player-info">
            <span className="dash-player-name">{p1Member?.displayName || 'Player 1'}</span>
            <span className="dash-player-score" style={{ color: p1Color }}>
              {room.player1Score || 0}
            </span>
          </div>
        </div>

        {/* VS Indicator */}
        <div className="dash-vs-badge">VS</div>

        {/* Player 2 Side */}
        <div className="dash-player-score-box player2">
          <div
            className="dash-avatar-badge"
            style={{
              borderColor: p2Color,
              backgroundColor: `${p2Color}15`,
            }}
          >
            {p2Member?.avatar || '👤'}
          </div>
          <div className="dash-player-info" style={{ alignItems: 'flex-end' }}>
            <span className="dash-player-name">{p2Member?.displayName || 'Player 2'}</span>
            <span className="dash-player-score" style={{ color: p2Color }}>
              {room.player2Score || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Timers Bar */}
      <div className="dash-timer-bar">
        <div className="dash-day-badge-group">
          <span className="dash-day-badge">Day {currentDay} of 10</span>
          <button className="dash-help-btn" onClick={() => setShowTutorial(true)}>
            ℹ️ Rules
          </button>
        </div>
        <div className="dash-timers-right">
          <div className="dash-timer-item">
            Reveal: <span>{nextRevealCountdown.formatted}</span>
          </div>
          <div className="dash-timer-item">
            Total: <span>{overallCountdown.formatted}</span>
          </div>
        </div>
      </div>

      {/* History Modal / Drawer */}
      {showHistory ? (
        <div className="container" style={{ padding: '16px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Past Rounds History</h2>
            <button className="btn btn-secondary btn-small" onClick={() => setShowHistory(false)}>
              ✕ Close
            </button>
          </div>
          {Array.from({ length: currentDay - 1 }).map((_, idx) => {
            const dNum = idx + 1;
            const dRec = days[dNum];
            const summary = dRec?.resultSummary;
            return (
              <div key={dNum} className="card" style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, marginBottom: '6px' }}>
                  <span>Day {dNum}</span>
                  <span style={{ color: '#667eea' }}>
                    {summary ? `${summary.player1DayPoints} - ${summary.player2DayPoints}` : 'Finalizing...'}
                  </span>
                </div>
                {summary && (
                  <button
                    className="btn btn-secondary btn-small btn-full"
                    style={{ marginTop: '8px' }}
                    onClick={() => {
                      setRevealDayNumber(dNum);
                      setShowHistory(false);
                    }}
                  >
                    View Reveal Breakdown
                  </button>
                )}
              </div>
            );
          })}
          {currentDay <= 1 && (
            <p style={{ color: '#94a3b8', textAlign: 'center', marginTop: '32px' }}>
              No past days revealed yet. Check back tomorrow!
            </p>
          )}
        </div>
      ) : (
        /* Main Split Dashboard Board */
        <div className="dash-board-container">
          {/* Vertical Center Connecting Line */}
          <div
            className="dash-center-line"
            style={{
              background: `linear-gradient(to right, ${p1Color} 50%, ${p2Color} 50%)`,
            }}
          />

          {/* 4 Daily Game Cards */}
          {GAMES_LIST.map((game) => {
            const p1Attempted = isGameAttempted(statuses[p1Id], game.id);
            const p2Attempted = isGameAttempted(p2Id ? statuses[p2Id] : undefined, game.id);
            const myAttempted = isGameAttempted(myStatus, game.id);
            const bothAttempted = Boolean(p1Attempted && p2Attempted);

            // Determine if winner information can be displayed
            const daySummary = currentDayRecord?.resultSummary;
            let outcomeText: string | null = null;

            if (daySummary) {
              const res = daySummary[game.id];
              if (game.id === 'knowMe') {
                const km = daySummary.knowMe;
                if (km.player1Point && km.player2Point) {
                  outcomeText = '🎉 Both predicted correctly! (+1 each)';
                } else if (km.player1Point) {
                  outcomeText = `🎉 ${p1Member?.displayName} predicted correctly (+1 pt)`;
                } else if (km.player2Point) {
                  outcomeText = `🎉 ${p2Member?.displayName} predicted correctly (+1 pt)`;
                } else {
                  outcomeText = 'No predictions matched';
                }
              } else if (res && 'winnerId' in res) {
                if (res.winnerId === p1Id) {
                  outcomeText = `🏆 ${p1Member?.displayName} won (+1 pt)`;
                } else if (res.winnerId === p2Id) {
                  outcomeText = `🏆 ${p2Member?.displayName} won (+1 pt)`;
                } else {
                  outcomeText = '🤝 Tied / No point awarded';
                }
              }
            } else if (bothAttempted) {
              outcomeText = '✨ Both players have submitted! Points reveal at rollover.';
            }

            return (
              <div key={game.id} className="dash-game-card">
                {/* Game Title Bar */}
                <div className="dash-game-header">
                  <span className="dash-game-name">{game.name}</span>
                  <button
                    className={`dash-game-play-btn ${myAttempted ? 'done' : ''}`}
                    disabled={myAttempted}
                    onClick={() => setActiveGame(game.id)}
                  >
                    {myAttempted ? '✓ Completed' : 'Play Now →'}
                  </button>
                </div>

                {/* Split Card Body with Center Logo */}
                <div className="dash-card-split-body">
                  {/* Player 1 Left Side */}
                  <div className="dash-card-half p1">
                    <span className="dash-side-player-name">{p1Member?.displayName || 'P1'}</span>
                    <span
                      className={`dash-status-pill ${
                        p1Attempted ? 'attempted' : 'not-attempted'
                      }`}
                    >
                      {p1Attempted ? '✓ Attempted' : '⏳ Waiting'}
                    </span>
                  </div>

                  {/* Center Logo Badge directly on divider */}
                  <div className="dash-card-center-badge">
                    <span>{game.icon}</span>
                  </div>

                  {/* Player 2 Right Side */}
                  <div className="dash-card-half p2">
                    <span className="dash-side-player-name">{p2Member?.displayName || 'P2'}</span>
                    <span
                      className={`dash-status-pill ${
                        p2Attempted ? 'attempted' : 'not-attempted'
                      }`}
                    >
                      {p2Attempted ? '✓ Attempted' : '⏳ Waiting'}
                    </span>
                  </div>
                </div>

                {/* Score / Winner outcome banner */}
                {outcomeText && (
                  <div className={`dash-card-outcome ${daySummary ? 'revealed' : ''}`}>
                    {outcomeText}
                  </div>
                )}
              </div>
            );
          })}

          {/* Temporary Admin Testing Skip Button */}
          <div className="dash-admin-card">
            <div className="dash-admin-header">
              <span>🛠️ Testing Controls</span>
              <span className="dash-admin-tag">Temporary</span>
            </div>
            <p className="dash-admin-desc">
              Test day completion, scoring calculations, and unlock the next round instantly:
            </p>
            <button
              className="btn btn-secondary btn-full"
              style={{ background: '#f8fafc', borderColor: '#cbd5e1', fontWeight: 700 }}
              disabled={skippingDay}
              onClick={handleSkipDay}
            >
              {skippingDay ? '⏳ Finalizing Day...' : `⏩ Skip to Day ${currentDay + 1}`}
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="dash-bottom-nav">
        <button
          className={`dash-nav-btn ${!showHistory ? 'active' : ''}`}
          onClick={() => setShowHistory(false)}
        >
          <span>🎮</span>
          <span>Today's Games</span>
        </button>
        <button
          className={`dash-nav-btn ${showHistory ? 'active' : ''}`}
          onClick={() => setShowHistory(true)}
        >
          <span>📜</span>
          <span>History</span>
        </button>
      </div>

      {/* Tutorial Popup Modal */}
      {showTutorial && <TutorialModal onClose={handleCloseTutorial} />}

      {/* Active Game Modal Drawer */}
      {activeGame && (
        <div className="dash-modal-overlay">
          <div className="dash-modal-content">
            <div className="dash-modal-bar">
              <span style={{ fontWeight: 800, fontSize: '1.05rem' }}>
                Day {currentDay} Challenge
              </span>
              <button
                className="dash-modal-close-btn"
                onClick={() => setActiveGame(null)}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: '8px 12px' }}>
              {activeGame === 'fiveLetter' && (
                <FiveLetterGame
                  roomId={roomId}
                  dayNumber={currentDay}
                  onComplete={() => {}}
                />
              )}
              {activeGame === 'sudoku' && (
                <MiniSudokuGame
                  roomId={roomId}
                  dayNumber={currentDay}
                  onComplete={() => {}}
                />
              )}
              {activeGame === 'wordGrid' && (
                <WordGridGame
                  roomId={roomId}
                  dayNumber={currentDay}
                  onComplete={() => {}}
                />
              )}
              {activeGame === 'knowMe' && (
                <KnowMeGame
                  roomId={roomId}
                  dayNumber={currentDay}
                  onComplete={() => {}}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Daily Reveal Experience Modal */}
      {revealDayNumber && days[revealDayNumber]?.resultSummary && p1Member && p2Member && (
        <DailyReveal
          dayNumber={revealDayNumber}
          resultSummary={days[revealDayNumber].resultSummary!}
          p1Id={p1Id}
          p2Id={p2Id}
          p1Member={p1Member}
          p2Member={p2Member}
          initialP1Score={
            revealDayNumber === 1
              ? 0
              : (room.player1Score || 0) - (days[revealDayNumber].resultSummary?.player1DayPoints || 0)
          }
          initialP2Score={
            revealDayNumber === 1
              ? 0
              : (room.player2Score || 0) - (days[revealDayNumber].resultSummary?.player2DayPoints || 0)
          }
          onClose={handleCloseReveal}
        />
      )}
    </div>
  );
}
