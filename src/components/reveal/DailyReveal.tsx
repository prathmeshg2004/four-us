// ============================================================
// Daily Reveal — Interactive Reveal Sequence Component
// ============================================================

import React, { useState } from 'react';
import { DayResultSummary, PlayerMember, PLAYER_COLORS } from '../../types';
import './DailyReveal.css';

interface DailyRevealProps {
  dayNumber: number;
  resultSummary: DayResultSummary;
  p1Id: string;
  p2Id: string;
  p1Member: PlayerMember;
  p2Member: PlayerMember;
  initialP1Score: number;
  initialP2Score: number;
  onClose: () => void;
}

const GAME_SEQUENCE = [
  { key: 'fiveLetter', name: 'Five Letter', icon: '🟩' },
  { key: 'sudoku', name: 'Mini Sudoku', icon: '🔢' },
  { key: 'wordGrid', name: 'Word Grid', icon: '🔤' },
  { key: 'knowMe', name: 'Know Me', icon: '💡' },
] as const;

export default function DailyReveal({
  dayNumber,
  resultSummary,
  p1Id,
  p2Id,
  p1Member,
  p2Member,
  initialP1Score,
  initialP2Score,
  onClose,
}: DailyRevealProps) {
  const [currentStep, setCurrentStep] = useState(0);

  // Calculate accumulated score up to current step
  let p1Score = initialP1Score;
  let p2Score = initialP2Score;

  if (currentStep >= 1) {
    if (resultSummary.fiveLetter.winnerId === p1Id) p1Score++;
    if (resultSummary.fiveLetter.winnerId === p2Id) p2Score++;
  }
  if (currentStep >= 2) {
    if (resultSummary.sudoku.winnerId === p1Id) p1Score++;
    if (resultSummary.sudoku.winnerId === p2Id) p2Score++;
  }
  if (currentStep >= 3) {
    if (resultSummary.wordGrid.winnerId === p1Id) p1Score++;
    if (resultSummary.wordGrid.winnerId === p2Id) p2Score++;
  }
  if (currentStep >= 4) {
    if (resultSummary.knowMe.player1Point) p1Score++;
    if (resultSummary.knowMe.player2Point) p2Score++;
  }

  const currentGame = GAME_SEQUENCE[Math.min(currentStep, 3)];

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  return (
    <div className="reveal-overlay">
      <div className="reveal-container animate-slide-up">
        {/* Header */}
        <div className="reveal-header">
          <div className="reveal-title">Day {dayNumber} Results</div>
          <div className="reveal-subtitle">
            {currentStep < 4
              ? `Game ${currentStep + 1} of 4: ${currentGame.name}`
              : 'Day Summary'}
          </div>
        </div>

        {/* Live Running Scores Header */}
        <div className="reveal-scores-bar">
          <div className="reveal-score-item">
            <span
              className="reveal-player-chip"
              style={{ color: PLAYER_COLORS[p1Member.color] }}
            >
              {p1Member.displayName}
            </span>
            <span className="reveal-score-badge">{p1Score}</span>
          </div>
          <span style={{ color: '#94a3b8', fontWeight: 800 }}>VS</span>
          <div className="reveal-score-item">
            <span className="reveal-score-badge">{p2Score}</span>
            <span
              className="reveal-player-chip"
              style={{ color: PLAYER_COLORS[p2Member.color] }}
            >
              {p2Member.displayName}
            </span>
          </div>
        </div>

        {/* Step Body */}
        <div className="reveal-content-body">
          {currentStep === 0 && (
            /* Game 1: Five Letter */
            <>
              <div className="reveal-game-badge">Game 1 of 4</div>
              <div className="reveal-icon-big">🟩</div>
              <div className="reveal-game-title">Five Letter</div>
              <div className="reveal-comparison-card">
                {/* P1 */}
                <div
                  className={`reveal-player-col ${
                    resultSummary.fiveLetter.winnerId === p1Id ? 'is-winner' : ''
                  }`}
                >
                  {resultSummary.fiveLetter.winnerId === p1Id && (
                    <span className="reveal-winner-pill">+1 POINT</span>
                  )}
                  <span className="reveal-name">{p1Member.displayName}</span>
                  <span className="reveal-metric">
                    {(resultSummary.fiveLetter.player1Data as any).solved ? 'SOLVED' : 'UNSOLVED'}
                  </span>
                  <span className="reveal-metric-sub">
                    {String((resultSummary.fiveLetter.player1Data as any).guessesCount || 0)} guesses
                  </span>
                </div>
                {/* P2 */}
                <div
                  className={`reveal-player-col ${
                    resultSummary.fiveLetter.winnerId === p2Id ? 'is-winner' : ''
                  }`}
                >
                  {resultSummary.fiveLetter.winnerId === p2Id && (
                    <span className="reveal-winner-pill">+1 POINT</span>
                  )}
                  <span className="reveal-name">{p2Member.displayName}</span>
                  <span className="reveal-metric">
                    {(resultSummary.fiveLetter.player2Data as any).solved ? 'SOLVED' : 'UNSOLVED'}
                  </span>
                  <span className="reveal-metric-sub">
                    {String((resultSummary.fiveLetter.player2Data as any).guessesCount || 0)} guesses
                  </span>
                </div>
              </div>
            </>
          )}

          {currentStep === 1 && (
            /* Game 2: Mini Sudoku */
            <>
              <div className="reveal-game-badge">Game 2 of 4</div>
              <div className="reveal-icon-big">🔢</div>
              <div className="reveal-game-title">Mini Sudoku</div>
              <div className="reveal-comparison-card">
                {/* P1 */}
                <div
                  className={`reveal-player-col ${
                    resultSummary.sudoku.winnerId === p1Id ? 'is-winner' : ''
                  }`}
                >
                  {resultSummary.sudoku.winnerId === p1Id && (
                    <span className="reveal-winner-pill">+1 POINT</span>
                  )}
                  <span className="reveal-name">{p1Member.displayName}</span>
                  <span className="reveal-metric">
                    {(resultSummary.sudoku.player1Data as any).solved ? 'COMPLETED' : 'INCOMPLETE'}
                  </span>
                  <span className="reveal-metric-sub">
                    {String((resultSummary.sudoku.player1Data as any).correctCells || 0)} correct cells
                  </span>
                </div>
                {/* P2 */}
                <div
                  className={`reveal-player-col ${
                    resultSummary.sudoku.winnerId === p2Id ? 'is-winner' : ''
                  }`}
                >
                  {resultSummary.sudoku.winnerId === p2Id && (
                    <span className="reveal-winner-pill">+1 POINT</span>
                  )}
                  <span className="reveal-name">{p2Member.displayName}</span>
                  <span className="reveal-metric">
                    {(resultSummary.sudoku.player2Data as any).solved ? 'COMPLETED' : 'INCOMPLETE'}
                  </span>
                  <span className="reveal-metric-sub">
                    {String((resultSummary.sudoku.player2Data as any).correctCells || 0)} correct cells
                  </span>
                </div>
              </div>
            </>
          )}

          {currentStep === 2 && (
            /* Game 3: Word Grid */
            <>
              <div className="reveal-game-badge">Game 3 of 4</div>
              <div className="reveal-icon-big">🔤</div>
              <div className="reveal-game-title">Word Grid</div>
              <div className="reveal-comparison-card">
                {/* P1 */}
                <div
                  className={`reveal-player-col ${
                    resultSummary.wordGrid.winnerId === p1Id ? 'is-winner' : ''
                  }`}
                >
                  {resultSummary.wordGrid.winnerId === p1Id && (
                    <span className="reveal-winner-pill">+1 POINT</span>
                  )}
                  <span className="reveal-name">{p1Member.displayName}</span>
                  <span className="reveal-metric">
                    {String((resultSummary.wordGrid.player1Data as any).points || 0)} pts
                  </span>
                  <span className="reveal-metric-sub">
                    {String((resultSummary.wordGrid.player1Data as any).wordsCount || 0)} words found
                  </span>
                </div>
                {/* P2 */}
                <div
                  className={`reveal-player-col ${
                    resultSummary.wordGrid.winnerId === p2Id ? 'is-winner' : ''
                  }`}
                >
                  {resultSummary.wordGrid.winnerId === p2Id && (
                    <span className="reveal-winner-pill">+1 POINT</span>
                  )}
                  <span className="reveal-name">{p2Member.displayName}</span>
                  <span className="reveal-metric">
                    {String((resultSummary.wordGrid.player2Data as any).points || 0)} pts
                  </span>
                  <span className="reveal-metric-sub">
                    {String((resultSummary.wordGrid.player2Data as any).wordsCount || 0)} words found
                  </span>
                </div>
              </div>
            </>
          )}

          {currentStep === 3 && (
            /* Game 4: Know Me */
            <>
              <div className="reveal-game-badge">Game 4 of 4</div>
              <div className="reveal-icon-big">💡</div>
              <div className="reveal-game-title">Know Me</div>
              <div className="reveal-knowme-box">
                <div className="reveal-knowme-row">
                  <strong>{p1Member.displayName}'s Answer:</strong>
                  <span>{resultSummary.knowMe.player1Answer || 'No answer'}</span>
                </div>
                <div className="reveal-knowme-row">
                  <strong>{p2Member.displayName}'s Prediction:</strong>
                  <span
                    style={{
                      color: resultSummary.knowMe.player2Correct ? '#16a34a' : '#dc2626',
                      fontWeight: 700,
                    }}
                  >
                    {resultSummary.knowMe.player2Prediction || 'None'}{' '}
                    {resultSummary.knowMe.player2Correct ? '✓ (+1)' : '✗'}
                  </span>
                </div>
                <hr style={{ margin: '8px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />
                <div className="reveal-knowme-row">
                  <strong>{p2Member.displayName}'s Answer:</strong>
                  <span>{resultSummary.knowMe.player2Answer || 'No answer'}</span>
                </div>
                <div className="reveal-knowme-row">
                  <strong>{p1Member.displayName}'s Prediction:</strong>
                  <span
                    style={{
                      color: resultSummary.knowMe.player1Correct ? '#16a34a' : '#dc2626',
                      fontWeight: 700,
                    }}
                  >
                    {resultSummary.knowMe.player1Prediction || 'None'}{' '}
                    {resultSummary.knowMe.player1Correct ? '✓ (+1)' : '✗'}
                  </span>
                </div>
              </div>
            </>
          )}

          {currentStep === 4 && (
            /* Day Summary */
            <div className="animate-fade-in" style={{ textAlign: 'center' }}>
              <div className="reveal-icon-big">🌟</div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px' }}>
                Day {dayNumber} Complete!
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '16px' }}>
                Points earned today:
              </p>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '24px',
                  marginBottom: '16px',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>{p1Member.displayName}</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#22c55e' }}>
                    +{resultSummary.player1DayPoints}
                  </div>
                </div>
                <div>
                  <div style={{ fontWeight: 700 }}>{p2Member.displayName}</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#22c55e' }}>
                    +{resultSummary.player2DayPoints}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="reveal-footer">
          {currentStep < 4 ? (
            <button
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '6px 8px',
              }}
              onClick={() => setCurrentStep(4)}
            >
              ⏩ Skip to Total
            </button>
          ) : (
            <div className="reveal-dots">
              {[0, 1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`reveal-dot ${step === currentStep ? 'active' : ''}`}
                />
              ))}
            </div>
          )}
          <button className="reveal-next-btn" onClick={handleNext}>
            {currentStep < 4 ? 'Next Game →' : 'Continue to Dashboard'}
          </button>
        </div>
      </div>
    </div>
  );
}
