import { MAX_CONFIDENCE } from '@/lib/confidence';
import type { Card } from '@/lib/types';

import { ConfidenceMeter } from './ConfidenceMeter';

type TopCardItemProps = {
  card: Card;
  /** The card's priority, for display only. The server already did the ranking. */
  priority: number;
  /** 1 for the highest-priority card. */
  rank: number;
  onReview: (card: Card) => void;
  onDelete: (cardId: number) => void;
};

/** One card in the study list: its rank, priority, question, confidence, and actions. */
export function TopCardItem(props: TopCardItemProps) {
  const card = props.card;

  return (
    <article className="card">
      <div className="card-topline">
        <span className="rank">#{props.rank} to study</span>
        <span className="priority">Priority <strong>{Math.round(props.priority)}</strong></span>
      </div>

      <h3>{card.question}</h3>

      <div className="card-footer">
        <div className="card-confidence">
          <ConfidenceMeter value={card.confidence} />
          <span>{card.confidence}/{MAX_CONFIDENCE} confidence</span>
        </div>
        <div className="actions">
          <button className="review-button" onClick={() => props.onReview(card)}>
            Review <span aria-hidden="true">→</span>
          </button>
          <button
            className="delete"
            onClick={() => props.onDelete(card.id)}
            aria-label={`Delete ${card.question}`}
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}
