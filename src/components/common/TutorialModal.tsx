// ============================================================
// Tutorial Modal — How to Play Four Us
// ============================================================

import React from 'react';
import './TutorialModal.css';

interface TutorialModalProps {
  onClose: () => void;
}

export default function TutorialModal({ onClose }: TutorialModalProps) {
  return (
    <div className="tutorial-overlay">
      <div className="tutorial-card">
        <div className="tutorial-header">
          <div className="tutorial-icon">🎮</div>
          <h2 className="tutorial-title">Welcome to Four Us!</h2>
          <p className="tutorial-subtitle">
            A 10-day private competition for the two of you
          </p>
        </div>

        <div className="tutorial-features">
          <div className="tutorial-item">
            <span className="tutorial-item-icon">🧩</span>
            <div className="tutorial-item-text">
              <span className="tutorial-item-title">4 Daily Challenges</span>
              <span className="tutorial-item-desc">
                Play Wordle, Mini Sudoku, Word Grid, and Guess It every day. Both players receive the exact same puzzles!
              </span>
            </div>
          </div>

          <div className="tutorial-item">
            <span className="tutorial-item-icon">⏳</span>
            <div className="tutorial-item-text">
              <span className="tutorial-item-title">Play On Your Schedule</span>
              <span className="tutorial-item-desc">
                Each daily round lasts 24 hours. Play your attempts whenever you have free time throughout the day.
              </span>
            </div>
          </div>

          <div className="tutorial-item">
            <span className="tutorial-item-icon">🏆</span>
            <div className="tutorial-item-text">
              <span className="tutorial-item-title">10 Days To Decide The Winner</span>
              <span className="tutorial-item-desc">
                Points are tallied across all 10 rounds. After Day 10, the final winner or Perfectly Matched couple is crowned!
              </span>
            </div>
          </div>
        </div>

        <button className="tutorial-btn" onClick={onClose}>
          Got It, Let's Play! 🚀
        </button>
      </div>
    </div>
  );
}
