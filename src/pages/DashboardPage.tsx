// ============================================================
// Dashboard Page — Two-Player Split Mobile Dashboard
// ============================================================

import React, { useState, useEffect, useMemo } from 'react';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Room,
  PlayerMember,
  DayRecord,
  PlayerDayStatus,
  GameType,
  PLAYER_COLORS,
} from '../types';
import { useDayStatuses, useDayAttempts } from '../hooks/useRoom';
import {
  finalizeDayInFirestore,
  scoreFiveLetter,
  scoreSudoku,
  scoreWordGrid,
  scoreKnowMe,
} from '../lib/scoring';
import { getTournamentDayBounds } from '../lib/roomService';
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

interface GameConfigItem {
  id: GameType;
  name: string;
  icon: string;
  color: string;
  bgGradient: string;
  borderColor: string;
  shadowColor: string;
}

const GAMES_LIST: GameConfigItem[] = [
  {
    id: 'fiveLetter',
    name: 'Wordle',
    icon: '🔠',
    color: '#15803d',
    bgGradient: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
    borderColor: '#22c55e',
    shadowColor: 'rgba(34, 197, 94, 0.32)',
  },
  {
    id: 'sudoku',
    name: 'Mini Sudoku',
    icon: '🔢',
    color: '#4338ca',
    bgGradient: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
    borderColor: '#6366f1',
    shadowColor: 'rgba(99, 102, 241, 0.32)',
  },
  {
    id: 'wordGrid',
    name: 'Word Grid',
    icon: '🔤',
    color: '#b45309',
    bgGradient: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
    borderColor: '#f59e0b',
    shadowColor: 'rgba(245, 158, 11, 0.32)',
  },
  {
    id: 'knowMe',
    name: 'Guess It',
    icon: '💭',
    color: '#7e22ce',
    bgGradient: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
    borderColor: '#a855f7',
    shadowColor: 'rgba(168, 85, 247, 0.32)',
  },
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

  // Subscribe to current day statuses & attempts
  const statuses = useDayStatuses(roomId, currentDay);
  const dayAttempts = useDayAttempts(roomId, currentDay);

  // Modal states
  const [activeGame, setActiveGame] = useState<GameType | null>(null);
  const [revealDayNumber, setRevealDayNumber] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [skippingDay, setSkippingDay] = useState(false);

  // Players
  const p1Id = room.player1Id;
  const p2Id = room.player2Id || '';
  const p1Member = p1Id ? members[p1Id] : null;
  const p2Member = p2Id ? members[p2Id] : null;

  const myStatus = statuses[currentUserId];
  const currentPlayerName = currentUserId === 'vidhi' ? 'Vidhi' : 'Prathmesh';

  // Check if welcome popup should be shown on login/open
  useEffect(() => {
    const shouldWelcome = localStorage.getItem('fourUs_show_welcome');
    if (shouldWelcome === 'true') {
      setShowWelcome(true);
      localStorage.removeItem('fourUs_show_welcome');
    }
  }, []);

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

  // Live ticker that updates every second
  const [nowMs, setNowMs] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Ensure active day's schedule strictly matches the tournament calendar:
  // Starts 12:01 AM 23rd Oct 2026, 24 hours per day, Day 10 ends 12:01 AM 2nd Nov 2026
  useEffect(() => {
    if (!roomId || !currentDayRecord || currentDayRecord.finalized) return;
    const { startsAt, endsAt, startsAtMs, endsAtMs } = getTournamentDayBounds(currentDay);
    const curStart = currentDayRecord.startsAt?.toMillis();
    const curEnd = currentDayRecord.endsAt?.toMillis();
    if (curStart !== startsAtMs || curEnd !== endsAtMs) {
      const dayRef = doc(db, 'rooms', roomId, 'days', String(currentDay));
      updateDoc(dayRef, { startsAt, endsAt }).catch(console.error);
    }
  }, [roomId, currentDay, currentDayRecord]);

  // 1. Reveal Countdown: Counts down to exactly 12:01 AM (end of the current 24-hour day)
  const revealMsRemaining = useMemo(() => {
    const { endsAtMs } = getTournamentDayBounds(currentDay);
    const target = currentDayRecord?.endsAt?.toMillis() || endsAtMs;
    const diff = target - nowMs;
    return Math.max(0, diff);
  }, [currentDayRecord?.endsAt, currentDay, nowMs]);

  const pad = (n: number) => String(n).padStart(2, '0');
  const rSecs = Math.floor(revealMsRemaining / 1000);
  const rHours = Math.floor(rSecs / 3600);
  const rMins = Math.floor((rSecs % 3600) / 60);
  const rSec = rSecs % 60;
  const revealTimerFormatted = `${pad(rHours)}:${pad(rMins)}:${pad(rSec)}`;

  // 2. 10-day Total: ONLY show "days remaining", NO hours or mins
  const daysRemaining = Math.max(1, 10 - currentDay + 1);
  const totalDaysText = `${daysRemaining} days remaining`;

  // Compute live scores for each game if both have attempted
  const gameScores = useMemo(() => {
    const map: Record<
      GameType,
      {
        p1Points: number;
        p2Points: number;
        outcomeText: string;
      } | null
    > = {
      fiveLetter: null,
      sudoku: null,
      wordGrid: null,
      knowMe: null,
    };

    const p1Atts = dayAttempts[p1Id] || {};
    const p2Atts = dayAttempts[p2Id] || {};

    // 1. Wordle
    const p1FL = isGameAttempted(statuses[p1Id], 'fiveLetter');
    const p2FL = isGameAttempted(statuses[p2Id], 'fiveLetter');
    if (p1FL && p2FL && p1Atts.fiveLetter && p2Atts.fiveLetter) {
      const res = scoreFiveLetter(p1Atts.fiveLetter, p2Atts.fiveLetter, p1Id, p2Id);
      const p1Pts = res.winnerId === p1Id ? 1 : 0;
      const p2Pts = res.winnerId === p2Id ? 1 : 0;
      let outcome = '🤝 Tied / No point awarded';
      if (res.winnerId === p1Id) outcome = `🏆 ${p1Member?.displayName || 'Player 1'} won (+1 pt)`;
      else if (res.winnerId === p2Id) outcome = `🏆 ${p2Member?.displayName || 'Player 2'} won (+1 pt)`;
      map.fiveLetter = { p1Points: p1Pts, p2Points: p2Pts, outcomeText: outcome };
    }

    // 2. Mini Sudoku
    const p1Su = isGameAttempted(statuses[p1Id], 'sudoku');
    const p2Su = isGameAttempted(statuses[p2Id], 'sudoku');
    if (p1Su && p2Su && p1Atts.sudoku && p2Atts.sudoku) {
      const res = scoreSudoku(p1Atts.sudoku, p2Atts.sudoku, p1Id, p2Id);
      const p1Pts = res.winnerId === p1Id ? 1 : 0;
      const p2Pts = res.winnerId === p2Id ? 1 : 0;
      let outcome = '🤝 Tied / No point awarded';
      if (res.winnerId === p1Id) outcome = `🏆 ${p1Member?.displayName || 'Player 1'} won (+1 pt)`;
      else if (res.winnerId === p2Id) outcome = `🏆 ${p2Member?.displayName || 'Player 2'} won (+1 pt)`;
      map.sudoku = { p1Points: p1Pts, p2Points: p2Pts, outcomeText: outcome };
    }

    // 3. Word Grid
    const p1WG = isGameAttempted(statuses[p1Id], 'wordGrid');
    const p2WG = isGameAttempted(statuses[p2Id], 'wordGrid');
    if (p1WG && p2WG && p1Atts.wordGrid && p2Atts.wordGrid) {
      const res = scoreWordGrid(p1Atts.wordGrid, p2Atts.wordGrid, p1Id, p2Id);
      const p1Pts = res.winnerId === p1Id ? 1 : 0;
      const p2Pts = res.winnerId === p2Id ? 1 : 0;
      let outcome = '🤝 Tied / No point awarded';
      if (res.winnerId === p1Id) outcome = `🏆 ${p1Member?.displayName || 'Player 1'} won (+1 pt)`;
      else if (res.winnerId === p2Id) outcome = `🏆 ${p2Member?.displayName || 'Player 2'} won (+1 pt)`;
      map.wordGrid = { p1Points: p1Pts, p2Points: p2Pts, outcomeText: outcome };
    }

    // 4. Guess It
    const p1KM = isGameAttempted(statuses[p1Id], 'knowMe');
    const p2KM = isGameAttempted(statuses[p2Id], 'knowMe');
    if (p1KM && p2KM && p1Atts.knowMe && p2Atts.knowMe) {
      const res = scoreKnowMe(p1Atts.knowMe, p2Atts.knowMe);
      const p1Pts = res.player1Point ? 1 : 0;
      const p2Pts = res.player2Point ? 1 : 0;
      let outcome = 'No predictions matched (0 pts)';
      if (p1Pts && p2Pts) outcome = '🎉 Both guessed correctly! (+1 each)';
      else if (p1Pts) outcome = `🎉 ${p1Member?.displayName || 'Player 1'} guessed correctly (+1 pt)`;
      else if (p2Pts) outcome = `🎉 ${p2Member?.displayName || 'Player 2'} guessed correctly (+1 pt)`;
      map.knowMe = { p1Points: p1Pts, p2Points: p2Pts, outcomeText: outcome };
    }

    return map;
  }, [dayAttempts, statuses, p1Id, p2Id, p1Member?.displayName, p2Member?.displayName]);

  // Running total calculation with live points from today
  const liveP1DayPoints = useMemo(() => {
    return Object.values(gameScores).reduce((sum, s) => sum + (s?.p1Points || 0), 0);
  }, [gameScores]);

  const liveP2DayPoints = useMemo(() => {
    return Object.values(gameScores).reduce((sum, s) => sum + (s?.p2Points || 0), 0);
  }, [gameScores]);

  const displayedP1Score = currentDayRecord?.finalized
    ? (room.player1Score || 0)
    : (room.player1Score || 0) + liveP1DayPoints;

  const displayedP2Score = currentDayRecord?.finalized
    ? (room.player2Score || 0)
    : (room.player2Score || 0) + liveP2DayPoints;

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

  // Temporary Skip Day function (Test Tool)
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

  const p1Color = p1Member ? PLAYER_COLORS[p1Member.color] : '#FF6B6B';
  const p2Color = p2Member ? PLAYER_COLORS[p2Member.color] : '#4ECDC4';

  const totalLivePoints = displayedP1Score + displayedP2Score;
  const p1Ratio = totalLivePoints > 0 ? (displayedP1Score / totalLivePoints) * 100 : 50;
  const p2Ratio = totalLivePoints > 0 ? (displayedP2Score / totalLivePoints) * 100 : 50;

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
      {/* Redesigned Sleek Top Duel Score Card */}
      <div className="dash-sticky-top">
        <div className="dash-duel-header">
          {/* Player 1 (Prathmesh) */}
          <div className="dash-duel-player p1">
            <div
              className="dash-duel-avatar"
              style={{
                borderColor: p1Color,
                backgroundColor: `${p1Color}18`,
              }}
            >
              {p1Member?.avatar || '🦁'}
            </div>
            <div className="dash-duel-meta">
              <span className="dash-duel-name">{p1Member?.displayName || 'Prathmesh'}</span>
              <span className="dash-duel-score" style={{ color: p1Color }}>
                {displayedP1Score}
              </span>
            </div>
          </div>

          {/* VS Center Badge */}
          <div className="dash-duel-vs-wrap">
            <span className="dash-duel-vs-pill">VS</span>
          </div>

          {/* Player 2 (Vidhi) */}
          <div className="dash-duel-player p2">
            <div className="dash-duel-meta right">
              <span className="dash-duel-name">{p2Member?.displayName || 'Vidhi'}</span>
              <span className="dash-duel-score" style={{ color: p2Color }}>
                {displayedP2Score}
              </span>
            </div>
            <div
              className="dash-duel-avatar"
              style={{
                borderColor: p2Color,
                backgroundColor: `${p2Color}18`,
              }}
            >
              {p2Member?.avatar || '🌸'}
            </div>
          </div>
        </div>

        {/* Global Dual Score Ratio Bar directly beneath the scores */}
        <div className="dash-duel-ratio-track">
          <div
            className="dash-duel-ratio-fill p1"
            style={{
              width: `${p1Ratio}%`,
              backgroundColor: p1Color,
            }}
          />
          <div
            className="dash-duel-ratio-fill p2"
            style={{
              width: `${p2Ratio}%`,
              backgroundColor: p2Color,
            }}
          />
        </div>
      </div>

      {/* Redesigned Modern Sub-panel (Day X of 10 & Timers Ribbon) */}
      <div className="dash-sub-panel">
        <div className="dash-sub-pill day-pill">
          <span className="dash-pill-icon">📅</span>
          <span className="dash-pill-text">Day {currentDay}/10</span>
        </div>
        <div className="dash-sub-pill timer-pill" title="Next game reveal countdown">
          <span className="dash-pill-icon">⏳</span>
          <span className="dash-pill-mono">{revealTimerFormatted}</span>
        </div>
        <div className="dash-sub-pill total-pill">
          <span className="dash-pill-icon">🏁</span>
          <span className="dash-pill-text">{daysRemaining}d left</span>
        </div>
        <button
          type="button"
          className="dash-sub-action-btn"
          onClick={() => setShowTutorial(true)}
          title="Game Rules"
        >
          ℹ️
        </button>
      </div>

      {/* History Modal / Drawer */}
      {showHistory ? (
        <div className="dash-history-container">
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

            // Determine if winner / score information can be displayed
            const daySummary = currentDayRecord?.resultSummary;
            const liveScore = gameScores[game.id];

            let p1Points: number | null = null;
            let p2Points: number | null = null;
            let outcomeText: string | null = null;

            if (daySummary) {
              const res = daySummary[game.id];
              if (game.id === 'knowMe') {
                const km = daySummary.knowMe;
                p1Points = km.player1Point ? 1 : 0;
                p2Points = km.player2Point ? 1 : 0;
                if (p1Points && p2Points) {
                  outcomeText = '🎉 Both guessed correctly! (+1 each)';
                } else if (p1Points) {
                  outcomeText = `🎉 ${p1Member?.displayName} guessed correctly (+1 pt)`;
                } else if (p2Points) {
                  outcomeText = `🎉 ${p2Member?.displayName} guessed correctly (+1 pt)`;
                } else {
                  outcomeText = 'No predictions matched (0 pts)';
                }
              } else if (res && 'winnerId' in res) {
                p1Points = res.winnerId === p1Id ? 1 : 0;
                p2Points = res.winnerId === p2Id ? 1 : 0;
                if (res.winnerId === p1Id) {
                  outcomeText = `🏆 ${p1Member?.displayName} won (+1 pt)`;
                } else if (res.winnerId === p2Id) {
                  outcomeText = `🏆 ${p2Member?.displayName} won (+1 pt)`;
                } else {
                  outcomeText = '🤝 Tied / No point awarded';
                }
              }
            } else if (liveScore) {
              p1Points = liveScore.p1Points;
              p2Points = liveScore.p2Points;
              outcomeText = liveScore.outcomeText;
            } else if (bothAttempted) {
              outcomeText = 'Calculating scores...';
            }

            const isScored = p1Points !== null && p2Points !== null;

            return (
              <div key={game.id} className="dash-game-card">
                {/* Centered Game Name Header */}
                <div className="dash-game-center-title">
                  <span className="dash-game-name" style={{ color: game.color }}>
                    {game.name}
                  </span>
                </div>

                {/* Split Card Body with Center Clickable Logo */}
                <div className="dash-card-split-body">
                  {/* Connecting line that comes out of the middle logo and connects to 1 and 0 on both sides */}
                  {isScored && (
                    <>
                      <div className="dash-score-line left" />
                      <div className="dash-score-line right" />
                    </>
                  )}

                  {/* Player 1 Left Side */}
                  <div className="dash-card-half p1">
                    {isScored ? (
                      <div
                        className={`dash-score-circle ${p1Points === 1 ? 'winner' : 'loser'}`}
                        title={`Score: ${p1Points}`}
                      >
                        {p1Points}
                      </div>
                    ) : (
                      <span
                        className={`dash-status-pill ${
                          p1Attempted ? 'attempted' : 'not-attempted'
                        }`}
                      >
                        {p1Attempted ? '✓ Attempted' : '⏳ Waiting'}
                      </span>
                    )}
                  </div>

                  {/* Center Clickable Logo Badge (Tapping this launches the game!) */}
                  <button
                    type="button"
                    className={`dash-card-center-badge ${myAttempted ? 'completed' : 'clickable'}`}
                    style={{
                      background: game.bgGradient,
                      borderColor: myAttempted ? '#16a34a' : game.borderColor,
                      boxShadow: `0 4px 14px ${game.shadowColor}`,
                    }}
                    onClick={() => {
                      if (!myAttempted) setActiveGame(game.id);
                    }}
                    title={myAttempted ? 'Completed' : `Play ${game.name}`}
                  >
                    <span className="dash-badge-icon">{game.icon}</span>
                    {myAttempted && <span className="dash-badge-check">✓</span>}
                  </button>

                  {/* Player 2 Right Side */}
                  <div className="dash-card-half p2">
                    {isScored ? (
                      <div
                        className={`dash-score-circle ${p2Points === 1 ? 'winner' : 'loser'}`}
                        title={`Score: ${p2Points}`}
                      >
                        {p2Points}
                      </div>
                    ) : (
                      <span
                        className={`dash-status-pill ${
                          p2Attempted ? 'attempted' : 'not-attempted'
                        }`}
                      >
                        {p2Attempted ? '✓ Attempted' : '⏳ Waiting'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Score / Winner outcome banner */}
                {outcomeText && (
                  <div className={`dash-card-outcome ${isScored ? 'revealed' : ''}`}>
                    {outcomeText}
                  </div>
                )}
              </div>
            );
          })}
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

      {/* Welcome Popup Modal */}
      {showWelcome && (
        <div className="dash-welcome-overlay" onClick={() => setShowWelcome(false)}>
          <div className="dash-welcome-card animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: '3rem', marginBottom: '8px' }}>
              {currentUserId === 'vidhi' ? '🌸' : '🦁'}
            </div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#1e293b', margin: '0 0 6px 0' }}>
              Welcome {currentPlayerName}!
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 20px 0', lineHeight: 1.4 }}>
              Day {currentDay} of your 10-day duel is active. Tap any game logo below to play!
            </p>
            <button
              type="button"
              className="btn btn-primary btn-full"
              style={{ padding: '12px', borderRadius: '14px', fontWeight: 800 }}
              onClick={() => setShowWelcome(false)}
            >
              Let's Play!
            </button>
          </div>
        </div>
      )}

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
