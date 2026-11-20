import { useMemo } from 'react';

import { priorityAt } from '@/lib/priority/priorityMath';
import type { Card } from '@/lib/types';

import { TopCardItem } from './TopCardItem';

type TopCardListProps = {
  /** The highest-priority cards, highest first, as the server ranked them. */
  topCards: Card[];
  totalCount: number;
  onReview: (card: Card) => void;
  onDelete: (cardId: number) => void;
};

/** Scores a card at the current moment, for display. */
function currentPriority(card: Card): number {
  return priorityAt(card, Date.now());
}

/** The "Study now" section: the top cards in order, or a message when there are none. */
export function TopCardList(props: TopCardListProps) {
  // Priorities depend on the current time, so they are recomputed only when the cards
  // change. Otherwise the displayed scores would shift whenever the page redraws, for
  // example when a toast appears.
  const scoredTopCards = useMemo(
    () => props.topCards.map((card) => ({ card: card, priority: currentPriority(card) })),
    [props.topCards],
  );

  return (
    <section className="study-section" aria-labelledby="study-now-title">
      <div className="section-header">
        <div>
          <p className="eyebrow">Up next</p>
          <h2 id="study-now-title">Study now</h2>
        </div>
        <span className="card-count">Showing {props.topCards.length} of {props.totalCount}</span>
      </div>

      {props.topCards.length === 0 ? (
        <div className="empty">
          <span className="empty-mark" aria-hidden="true">+</span>
          <h3>Your study list is ready when you are.</h3>
          <p>Add a concept above and Recall will surface it as time passes.</p>
        </div>
      ) : (
        <div className="cards">
          {scoredTopCards.map((scoredCard, index) => (
            <TopCardItem
              key={scoredCard.card.id}
              card={scoredCard.card}
              priority={scoredCard.priority}
              rank={index + 1}
              onReview={props.onReview}
              onDelete={props.onDelete}
            />
          ))}
        </div>
      )}
    </section>
  );
}
