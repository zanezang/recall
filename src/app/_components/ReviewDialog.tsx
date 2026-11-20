import { useEffect } from 'react';

import { CONFIDENCE_LABELS, CONFIDENCE_VALUES } from '@/lib/confidence';
import type { Card } from '@/lib/types';

type ReviewDialogProps = {
  card: Card;
  /** Saves the review with the chosen confidence. */
  onReview: (cardId: number, confidence: number) => void;
  onClose: () => void;
};

/**
 * The review dialog: asks how well the card came back and saves the chosen confidence.
 * Closes on Escape, on a press outside the dialog, or with the close buttons.
 */
export function ReviewDialog(props: ReviewDialogProps) {
  const onClose = props.onClose;

  // Listen for Escape while the dialog is open. The cleanup removes the listener when the
  // dialog closes.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    // Pressing the backdrop closes the dialog; presses inside the dialog are stopped from reaching it.
    <div className="modal-backdrop" onMouseDown={props.onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" onClick={props.onClose} aria-label="Close review">
          ×
        </button>
        <p className="eyebrow">Review card</p>
        <h2 id="review-title">{props.card.question}</h2>
        <p className="modal-prompt">How well did that come back to you?</p>

        <div className="confidence-buttons" aria-label="Choose your confidence">
          {CONFIDENCE_VALUES.map((confidenceValue) => (
            <button key={confidenceValue} onClick={() => props.onReview(props.card.id, confidenceValue)}>
              <strong>{confidenceValue}</strong>
              <span>{CONFIDENCE_LABELS[confidenceValue]}</span>
            </button>
          ))}
        </div>

        <p className="review-note">Your choice updates this card’s decay rate and returns it to your study list.</p>
        <button className="cancel-button" onClick={props.onClose}>Not now</button>
      </div>
    </div>
  );
}
