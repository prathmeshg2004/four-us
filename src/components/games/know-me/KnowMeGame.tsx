// ============================================================
// Know Me — Main Game Component
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { Timestamp } from 'firebase/firestore';
import { auth } from '../../../lib/firebase';
import { submitAttempt, getMyAttempt } from '../../../lib/gameService';
import { KnowMeAttempt } from '../../../types';
import { getKnowMeForDay, KnowMePrompt } from '../../../content/knowMePrompts';
import './KnowMeGame.css';

interface KnowMeGameProps {
  roomId: string;
  dayNumber: number;
  onComplete: () => void;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;

type Step = 1 | 2 | 3;

export default function KnowMeGame({ roomId, dayNumber, onComplete }: KnowMeGameProps) {
  const [step, setStep] = useState<Step>(1);
  const [ownAnswer, setOwnAnswer] = useState<string | null>(null);
  const [partnerPrediction, setPartnerPrediction] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const prompt: KnowMePrompt = getKnowMeForDay(dayNumber);

  // Check if already attempted
  useEffect(() => {
    let cancelled = false;

    async function checkExisting() {
      try {
        const existing = await getMyAttempt(roomId, dayNumber, 'knowMe');
        if (cancelled) return;
        if (existing) {
          setIsCompleted(true);
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Error checking existing attempt:', err);
        // Non-fatal — let the player try to play
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    checkExisting();
    return () => { cancelled = true; };
  }, [roomId, dayNumber]);

  const handleSelectOwnAnswer = useCallback((letter: string) => {
    if (step !== 1) return;
    setOwnAnswer(letter);
  }, [step]);

  const handleSelectPrediction = useCallback((letter: string) => {
    if (step !== 2) return;
    setPartnerPrediction(letter);
  }, [step]);

  const handleNext = useCallback(() => {
    if (step === 1 && ownAnswer) {
      setStep(2);
    } else if (step === 2 && partnerPrediction) {
      setStep(3);
    }
  }, [step, ownAnswer, partnerPrediction]);

  const handleLockIn = useCallback(async () => {
    if (!ownAnswer || !partnerPrediction || isSubmitting) return;

    const user = auth.currentUser;
    if (!user) {
      setError('Not authenticated. Please refresh.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const attempt: KnowMeAttempt = {
        gameType: 'knowMe',
        playerId: user.uid,
        dayNumber,
        completedAt: Timestamp.now(),
        ownAnswer,
        partnerPrediction,
      };

      await submitAttempt(roomId, dayNumber, attempt);
      setIsCompleted(true);
      onComplete();
    } catch (err) {
      console.error('Submit error:', err);
      if (err instanceof Error && err.message === 'Already submitted this game') {
        setIsCompleted(true);
        onComplete();
      } else {
        setError('Failed to submit. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [ownAnswer, partnerPrediction, isSubmitting, roomId, dayNumber, onComplete]);

  // --- Loading State ---
  if (isLoading) {
    return (
      <div className="knowme-container">
        <div className="knowme-loading">
          <div className="knowme-spinner" />
          <span>Loading…</span>
        </div>
      </div>
    );
  }

  // --- Completed State ---
  if (isCompleted) {
    return (
      <div className="knowme-container">
        <div className="knowme-card">
          <div className="knowme-complete">
            <div className="knowme-complete-icon">💌</div>
            <h2 className="knowme-complete-title">Attempt recorded</h2>
            <p className="knowme-complete-subtitle">
              Result available at the next daily reveal.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- Step 1: Your Answer ---
  if (step === 1) {
    return (
      <div className="knowme-container">
        <StepIndicator currentStep={1} />
        <div className="knowme-card">
          <div className="knowme-prompt-label">Your Answer</div>
          <p className="knowme-prompt-text">{prompt.promptText}</p>
          <div className="knowme-options">
            {prompt.options.map((optionText, i) => {
              const letter = OPTION_LABELS[i];
              const isSelected = ownAnswer === letter;
              return (
                <button
                  key={letter}
                  className={`knowme-option${isSelected ? ' selected' : ''}`}
                  onClick={() => handleSelectOwnAnswer(letter)}
                  type="button"
                >
                  <span className="knowme-option-letter">{letter}</span>
                  <span className="knowme-option-text">{optionText}</span>
                </button>
              );
            })}
          </div>
          <button
            className="knowme-next-btn primary"
            onClick={handleNext}
            disabled={!ownAnswer}
            type="button"
          >
            Next
          </button>
        </div>
      </div>
    );
  }

  // --- Step 2: Partner Prediction ---
  if (step === 2) {
    return (
      <div className="knowme-container">
        <StepIndicator currentStep={2} />
        <div className="knowme-card">
          <div className="knowme-prompt-label" style={{ color: '#4ecdc4' }}>
            Partner's Answer
          </div>
          <p className="knowme-prompt-text">
            What will your partner choose?
          </p>
          <div className="knowme-options">
            {prompt.options.map((optionText, i) => {
              const letter = OPTION_LABELS[i];
              const isSelected = partnerPrediction === letter;
              return (
                <button
                  key={letter}
                  className={`knowme-option prediction${isSelected ? ' selected' : ''}`}
                  onClick={() => handleSelectPrediction(letter)}
                  type="button"
                >
                  <span className="knowme-option-letter">{letter}</span>
                  <span className="knowme-option-text">{optionText}</span>
                </button>
              );
            })}
          </div>
          <button
            className="knowme-next-btn primary"
            onClick={handleNext}
            disabled={!partnerPrediction}
            type="button"
            style={{ background: '#4ecdc4' }}
          >
            Review
          </button>
        </div>
      </div>
    );
  }

  // --- Step 3: Confirmation ---
  const ownIdx = OPTION_LABELS.indexOf(ownAnswer as typeof OPTION_LABELS[number]);
  const predIdx = OPTION_LABELS.indexOf(partnerPrediction as typeof OPTION_LABELS[number]);

  return (
    <div className="knowme-container">
      <StepIndicator currentStep={3} />
      <div className="knowme-card">
        <p className="knowme-prompt-text" style={{ fontSize: 16, marginBottom: 20 }}>
          {prompt.promptText}
        </p>

        <div className="knowme-confirm-section">
          <div className="knowme-confirm-label own">Your Answer</div>
          <div className="knowme-confirm-choice own">
            <span className="knowme-confirm-letter own">{ownAnswer}</span>
            <span className="knowme-confirm-text">
              {ownIdx >= 0 ? prompt.options[ownIdx] : ''}
            </span>
          </div>
        </div>

        <div className="knowme-divider" />

        <div className="knowme-confirm-section">
          <div className="knowme-confirm-label prediction">Your Prediction</div>
          <div className="knowme-confirm-choice prediction">
            <span className="knowme-confirm-letter prediction">{partnerPrediction}</span>
            <span className="knowme-confirm-text">
              {predIdx >= 0 ? prompt.options[predIdx] : ''}
            </span>
          </div>
        </div>

        {error && <p className="knowme-error" style={{ padding: '8px 0' }}>{error}</p>}

        <button
          className="knowme-next-btn lockin"
          onClick={handleLockIn}
          disabled={isSubmitting}
          type="button"
        >
          {isSubmitting ? 'Submitting…' : '🔒 Lock In'}
        </button>
      </div>
    </div>
  );
}

// --- Step Indicator Sub-component ---

function StepIndicator({ currentStep }: { currentStep: Step }) {
  const steps = [1, 2, 3] as const;
  const labels = ['Choose', 'Predict', 'Confirm'];

  return (
    <div className="knowme-step-indicator">
      {steps.map((s) => (
        <div
          key={s}
          className={`knowme-step-dot${
            s === currentStep ? ' active' : s < currentStep ? ' completed' : ''
          }`}
        />
      ))}
      <span className="knowme-step-label">
        Step {currentStep}/3 · {labels[currentStep - 1]}
      </span>
    </div>
  );
}
