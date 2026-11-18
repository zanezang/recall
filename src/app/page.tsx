'use client';

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';

import { CONFIDENCE_LEVELS, MAX_CONFIDENCE, MIN_CONFIDENCE } from '@/lib/confidence';
import { priorityAt } from '@/lib/dueTime';

/** A card as the page uses it. Timestamps are epoch milliseconds so they can be subtracted. */
type Card = {
  id: number;
  question: string;
  confidence: number;
  createdAt: number;
  lastReviewedAt: number;
};

/** A card as the API returns it. JSON has no date type, so timestamps arrive as ISO 8601 strings. */
type ApiCard = Omit<Card, 'createdAt' | 'lastReviewedAt'> & {
  createdAt: string;
  lastReviewedAt: string;
};

/** A brief status message shown in the corner of the page. */
type Toast = {
  message: string;
  tone: 'success' | 'neutral';
};

type ConfidenceMeterProps = {
  value: number;
};

/** Display name for each confidence level. */
const CONFIDENCE_LABELS: Record<number, string> = {
  1: 'Starting out',
  2: 'Somewhat unsure',
  3: 'Getting there',
  4: 'Confident',
  5: 'Very confident',
};

/** How many of the highest-priority cards the queue shows. */
const QUEUE_SIZE = 5;

/** How long a toast stays on screen, in milliseconds. */
const TOAST_DURATION_MS = 3500;

/** Converts a card from the API's shape to the page's shape by parsing its timestamps. */
function toCard(apiCard: ApiCard): Card {
  return {
    ...apiCard,
    createdAt: new Date(apiCard.createdAt).getTime(),
    lastReviewedAt: new Date(apiCard.lastReviewedAt).getTime(),
  };
}

/** Scores how urgently a card needs review right now. Higher scores are studied first. */
function currentPriority(card: Card): number {
  return priorityAt(card, Date.now());
}

/** A row of dots with the first `value` filled in, e.g. ●●●○○ for a confidence of 3. */
function ConfidenceMeter(props: ConfidenceMeterProps) {
  return (
    <span className="confidence-meter" aria-label={`${props.value} out of ${MAX_CONFIDENCE} confidence`}>
      {CONFIDENCE_LEVELS.map((level) => {
        const isFilled = level <= props.value;
        return <span key={level} className={isFilled ? 'is-filled' : ''} />;
      })}
    </span>
  );
}

/**
 * Recall's home page: add study cards, see the most urgent ones, and review or delete them.
 *
 * Cards are stored in the database and reached only through the /api/cards routes. The page
 * keeps a copy in state for rendering and replaces it with the server's response after each
 * change, so the database stays the source of truth.
 */
export default function Home() {
  const [cards, setCards] = useState<Card[]>([]);

  // Fields of the "Add a concept" form.
  const [question, setQuestion] = useState('');
  const [confidence, setConfidence] = useState(MIN_CONFIDENCE);

  // The card open in the review dialog, or null while the dialog is closed.
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const [toast, setToast] = useState<Toast | null>(null);

  // Load the saved cards once, when the page mounts.
  useEffect(function loadCardsOnMount() {
    // Set during cleanup, so a response that arrives after unmount (or after React's
    // development-only second run of effects) can't overwrite newer state.
    let ignore = false;

    async function loadCards() {
      try {
        const response = await fetch('/api/cards');
        if (!response.ok) {
          throw new Error(`GET /api/cards failed with status ${response.status}`);
        }

        const apiCards: ApiCard[] = await response.json();
        if (!ignore) {
          setCards(apiCards.map(toCard));
        }
      } catch {
        if (!ignore) {
          setToast({ message: 'Could not load your cards.', tone: 'neutral' });
        }
      }
    }

    loadCards();

    return function cancelLoad() {
      ignore = true;
    };
  }, []);

  // Auto-dismiss the toast. A new toast re-runs this effect, which cancels the old timer.
  useEffect(() => {
    if (toast === null) {
      return;
    }

    const timeoutId = window.setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  // Close the review dialog on Escape. The listener only exists while the dialog is open.
  useEffect(() => {
    if (selectedCard === null) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSelectedCard(null);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCard]);

  function showToast(message: string, tone: Toast['tone'] = 'success') {
    setToast({ message, tone });
  }

  function handleQuestionChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setQuestion(event.target.value);
  }

  /** Saves a new card from the form, then resets the form. */
  async function addCard(event: FormEvent<HTMLFormElement>) {
    // Handle the submission here instead of letting the browser reload the page.
    event.preventDefault();

    const trimmedQuestion = question.trim();
    if (trimmedQuestion === '') {
      showToast('Add a concept or question before saving.', 'neutral');
      return;
    }

    let response: Response | null;
    try {
      response = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmedQuestion, confidence }),
      });
    } catch {
      // fetch only rejects when no response arrives (for example, offline).
      // HTTP error statuses resolve normally and are handled below.
      response = null;
    }

    if (response === null || !response.ok) {
      showToast('Could not save that card. Try again.', 'neutral');
      return;
    }

    // Use the server's copy, which carries the id and timestamps the database assigned.
    const savedCard = toCard(await response.json());
    setCards((currentCards) => {
      return [...currentCards, savedCard];
    });

    setQuestion('');
    setConfidence(MIN_CONFIDENCE);
    showToast('Card added to your study queue.');
  }

  /** Saves a review with the chosen confidence, then closes the review dialog. */
  async function reviewCard(cardId: number, newConfidence: number) {
    const response = await fetch(`/api/cards/${cardId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confidence: newConfidence }),
    }).catch(() => null);

    if (!response?.ok) {
      showToast('Could not save that review. Try again.', 'neutral');
      return;
    }

    // The server stamps lastReviewedAt, so swap in its copy of the card.
    const reviewedCard = toCard(await response.json());
    setCards((currentCards) =>
      currentCards.map((card) => (card.id === cardId ? reviewedCard : card)),
    );
    setSelectedCard(null);
    showToast(`Review saved — confidence set to ${newConfidence}/${MAX_CONFIDENCE}.`);
  }

  /**
   * Deletes a card. A 404 counts as success: the card is already gone, for example because
   * it was deleted in another tab.
   */
  async function deleteCard(cardId: number) {
    const response = await fetch(`/api/cards/${cardId}`, { method: 'DELETE' }).catch(() => null);

    const alreadyDeleted = response?.status === 404;
    if (!response?.ok && !alreadyDeleted) {
      showToast('Could not delete that card. Try again.', 'neutral');
      return;
    }

    setCards((currentCards) => currentCards.filter((card) => card.id !== cardId));
    if (selectedCard?.id === cardId) {
      setSelectedCard(null);
    }
    showToast('Card removed from your queue.', 'neutral');
  }

  // Priorities depend on the current time, so they're recomputed only when the cards change.
  // This keeps the displayed scores steady while the user types in the form.
  const rankedCards = useMemo(
    () =>
      cards
        .map((card) => ({ card, priority: currentPriority(card) }))
        .sort((a, b) => b.priority - a.priority),
    [cards],
  );
  const topCards = rankedCards.slice(0, QUEUE_SIZE);

  return (
    <main className="container">
      <header className="app-header">
        <div>
          <p className="eyebrow">Your study queue</p>
          <h1>Recall</h1>
          <p className="intro">Continuous-decay spaced repetition for the concepts worth revisiting next.</p>
        </div>
        <div className="queue-summary" aria-label={`${cards.length} total cards`}>
          <strong>{cards.length}</strong>
          <span>{cards.length === 1 ? 'card saved' : 'cards saved'}</span>
        </div>
      </header>

      <section className="add-card" aria-labelledby="add-card-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Build your queue</p>
            <h2 id="add-card-title">Add a concept</h2>
          </div>
          <span className="hint">Keep it focused and easy to revisit.</span>
        </div>

        <form onSubmit={addCard}>
          <label className="field-label" htmlFor="question">Concept or question</label>
          <textarea
            id="question"
            value={question}
            onChange={handleQuestionChange}
            placeholder="e.g. What is an R-type instruction?"
            rows={3}
          />

          <div className="confidence-field">
            <div className="confidence-copy">
              <label className="field-label" htmlFor="initial-confidence">Initial confidence</label>
              <span>{confidence}/{MAX_CONFIDENCE} · {CONFIDENCE_LABELS[confidence]}</span>
            </div>
            <input
              id="initial-confidence"
              type="range"
              min={MIN_CONFIDENCE}
              max={MAX_CONFIDENCE}
              value={confidence}
              onChange={(event) => setConfidence(Number(event.target.value))}
            />
            <div className="range-labels" aria-hidden="true">
              <span>New</span>
              <span>Solid</span>
            </div>
          </div>

          <button className="primary-button" type="submit">
            Add to queue <span aria-hidden="true">→</span>
          </button>
        </form>
      </section>

      <section className="study-section" aria-labelledby="study-now-title">
        <div className="section-header">
          <div>
            <p className="eyebrow">Up next</p>
            <h2 id="study-now-title">Study now</h2>
          </div>
          <span className="card-count">Showing {topCards.length} of {cards.length}</span>
        </div>

        {topCards.length === 0 ? (
          <div className="empty">
            <span className="empty-mark" aria-hidden="true">+</span>
            <h3>Your queue is ready when you are.</h3>
            <p>Add a concept above and Recall will surface it as time passes.</p>
          </div>
        ) : (
          <div className="cards">
            {topCards.map(({ card, priority }, index) => (
              <article className="card" key={card.id}>
                <div className="card-topline">
                  <span className="rank">#{index + 1} in queue</span>
                  <span className="priority">Priority <strong>{priority.toFixed(2)}</strong></span>
                </div>

                <h3>{card.question}</h3>

                <div className="card-footer">
                  <div className="card-confidence">
                    <ConfidenceMeter value={card.confidence} />
                    <span>{card.confidence}/{MAX_CONFIDENCE} confidence</span>
                  </div>
                  <div className="actions">
                    <button className="review-button" onClick={() => setSelectedCard(card)}>
                      Review <span aria-hidden="true">→</span>
                    </button>
                    <button
                      className="delete"
                      onClick={() => deleteCard(card.id)}
                      aria-label={`Delete ${card.question}`}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {toast !== null && (
        <div className={`toast toast-${toast.tone}`} role="status">
          <span aria-hidden="true">{toast.tone === 'success' ? '✓' : 'i'}</span>
          {toast.message}
        </div>
      )}

      {/* Pressing the backdrop closes the dialog; presses inside the dialog are stopped from reaching it. */}
      {selectedCard && (
        <div className="modal-backdrop" onMouseDown={() => setSelectedCard(null)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="modal-close" onClick={() => setSelectedCard(null)} aria-label="Close review">
              ×
            </button>
            <p className="eyebrow">Review card</p>
            <h2 id="review-title">{selectedCard.question}</h2>
            <p className="modal-prompt">How well did that come back to you?</p>

            <div className="confidence-buttons" aria-label="Choose your confidence">
              {CONFIDENCE_LEVELS.map((level) => (
                <button key={level} onClick={() => reviewCard(selectedCard.id, level)}>
                  <strong>{level}</strong>
                  <span>{CONFIDENCE_LABELS[level]}</span>
                </button>
              ))}
            </div>

            <p className="review-note">Your choice updates this card’s decay rate and returns it to the queue.</p>
            <button className="cancel-button" onClick={() => setSelectedCard(null)}>Not now</button>
          </div>
        </div>
      )}
    </main>
  );
}
