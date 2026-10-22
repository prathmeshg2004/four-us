// ============================================================
// Final Results Page — 10-Day Complete Summary & Awards
// ============================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Room, PlayerMember, DayRecord, PLAYER_COLORS } from '../types';
import './FinalResultsPage.css';

interface FinalResultsPageProps {
  room: Room;
  members: Record<string, PlayerMember>;
  days: Record<number, DayRecord>;
}

export default function FinalResultsPage({
  room,
  members,
  days,
}: FinalResultsPageProps) {
  const navigate = useNavigate();

  const p1Id = room.player1Id;
  const p2Id = room.player2Id;
  const p1Member = p1Id ? members[p1Id] : null;
  const p2Member = p2Id ? members[p2Id] : null;

  const p1Score = room.player1Score || 0;
  const p2Score = room.player2Score || 0;

  const isTie = p1Score === p2Score;
  const p1Won = p1Score > p2Score;

  // Calculate detailed stats across all 10 days
  let p1FiveLetterWins = 0;
  let p2FiveLetterWins = 0;
  let p1SudokuWins = 0;
  let p2SudokuWins = 0;
  let p1WordGridWins = 0;
  let p2WordGridWins = 0;
  let p1KnowMePoints = 0;
  let p2KnowMePoints = 0;

  for (let d = 1; d <= 10; d++) {
    const summary = days[d]?.resultSummary;
    if (!summary) continue;

    if (summary.fiveLetter.winnerId === p1Id) p1FiveLetterWins++;
    if (summary.fiveLetter.winnerId === p2Id) p2FiveLetterWins++;

    if (summary.sudoku.winnerId === p1Id) p1SudokuWins++;
    if (summary.sudoku.winnerId === p2Id) p2SudokuWins++;

    if (summary.wordGrid.winnerId === p1Id) p1WordGridWins++;
    if (summary.wordGrid.winnerId === p2Id) p2WordGridWins++;

    if (summary.knowMe.player1Point) p1KnowMePoints++;
    if (summary.knowMe.player2Point) p2KnowMePoints++;
  }

  const handleStartNewRoom = () => {
    localStorage.removeItem('fourUs_roomId');
    localStorage.removeItem('fourUs_recoveryToken');
    navigate('/');
  };

  return (
    <div className="final-results-page animate-fade-in">
      <div className="final-header">
        <div className="final-trophy">{isTie ? '💖' : '🏆'}</div>
        <h1 className="final-title">
          {isTie ? 'Perfectly Matched!' : `${p1Won ? p1Member?.displayName : p2Member?.displayName} Wins!`}
        </h1>
        <p className="final-winner-announcement">
          {isTie
            ? 'An exact 10-day tie! You two know each other inside out.'
            : 'Congratulations on 10 amazing days of competition!'}
        </p>
      </div>

      {/* Score Banner */}
      <div className="final-scores-banner">
        <div className="final-player-box">
          <div
            className="final-player-avatar"
            style={{
              borderColor: p1Member ? PLAYER_COLORS[p1Member.color] : '#ccc',
              color: p1Member ? PLAYER_COLORS[p1Member.color] : '#333',
            }}
          >
            {p1Member?.avatar || '👤'}
          </div>
          <div className="final-player-name">{p1Member?.displayName}</div>
          <div className="final-player-score" style={{ color: p1Member ? PLAYER_COLORS[p1Member.color] : '#111' }}>
            {p1Score}
          </div>
        </div>

        <div className="final-vs">FINAL</div>

        <div className="final-player-box">
          <div
            className="final-player-avatar"
            style={{
              borderColor: p2Member ? PLAYER_COLORS[p2Member.color] : '#ccc',
              color: p2Member ? PLAYER_COLORS[p2Member.color] : '#333',
            }}
          >
            {p2Member?.avatar || '👤'}
          </div>
          <div className="final-player-name">{p2Member?.displayName}</div>
          <div className="final-player-score" style={{ color: p2Member ? PLAYER_COLORS[p2Member.color] : '#111' }}>
            {p2Score}
          </div>
        </div>
      </div>

      {/* Stats Breakdown */}
      <div className="final-stats-card">
        <div className="final-stats-title">Performance By Game</div>
        <div className="final-stat-row">
          <span className="final-stat-label">🟩 Five Letter Wins</span>
          <div className="final-stat-values">
            <span>{p1FiveLetterWins}</span>
            <span style={{ color: '#94a3b8' }}>-</span>
            <span>{p2FiveLetterWins}</span>
          </div>
        </div>
        <div className="final-stat-row">
          <span className="final-stat-label">🔢 Mini Sudoku Wins</span>
          <div className="final-stat-values">
            <span>{p1SudokuWins}</span>
            <span style={{ color: '#94a3b8' }}>-</span>
            <span>{p2SudokuWins}</span>
          </div>
        </div>
        <div className="final-stat-row">
          <span className="final-stat-label">🔤 Word Grid Wins</span>
          <div className="final-stat-values">
            <span>{p1WordGridWins}</span>
            <span style={{ color: '#94a3b8' }}>-</span>
            <span>{p2WordGridWins}</span>
          </div>
        </div>
        <div className="final-stat-row">
          <span className="final-stat-label">💡 Know Me Matches</span>
          <div className="final-stat-values">
            <span>{p1KnowMePoints}</span>
            <span style={{ color: '#94a3b8' }}>-</span>
            <span>{p2KnowMePoints}</span>
          </div>
        </div>
      </div>

      {/* 10-Day Progression */}
      <div className="final-progression-card">
        <div className="final-stats-title">10-Day Progression</div>
        <div className="final-progression-grid">
          {Array.from({ length: 10 }).map((_, i) => {
            const dayNum = i + 1;
            const summary = days[dayNum]?.resultSummary;
            return (
              <div key={dayNum} className="final-day-chip">
                <span className="final-day-chip-label">D{dayNum}</span>
                <span className="final-day-chip-score">
                  {summary ? `${summary.player1DayPoints}-${summary.player2DayPoints}` : '-'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="final-actions">
        <button className="btn btn-primary btn-large btn-full" onClick={handleStartNewRoom}>
          🎮 Start a New Game
        </button>
      </div>
    </div>
  );
}
