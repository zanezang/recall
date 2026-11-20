'use client';

import { useEffect, useState } from 'react';

import { MAX_CONFIDENCE } from '@/lib/confidence';
import type { Card } from '@/lib/types';

import { AddCardForm } from './_components/AddCardForm';
import { ReviewDialog } from './_components/ReviewDialog';
import { Toast, type ToastMessage } from './_components/Toast';
import { TopCardList } from './_components/TopCardList';
import { createCard, deleteCard, fetchTopCards, saveReview } from './_lib/cardsApi';

/** How many of the highest-priority cards the page shows. */
const TOP_CARDS_COUNT = 5;

/** How long a toast stays on screen, in milliseconds. */
const TOAST_DURATION_MS = 3500;

/**
 * Recall's home page: add study cards, see the most urgent ones, and review or delete them.
 *
 * The server ranks the cards: the page shows what GET /api/top-cards returns and asks again
 * after every add, review, or delete, so the database stays the source of truth. This
 * component holds the shared state and the actions; the sections are in _components/.
 */
export default function Home() {
  // The highest-priority cards, highest first, and how many cards exist in total.
  const [topCards, setTopCards] = useState<Card[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // The card open in the review dialog, or null while the dialog is closed.
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Load the top cards once, when the page mounts.
  useEffect(function loadTopCardsOnMount() {
    // Set during cleanup, so a response that arrives after unmount (or after React's
    // development-only second run of effects) can't overwrite newer state.
    let ignore = false;

    async function loadTopCards() {
      try {
        const result = await fetchTopCards(TOP_CARDS_COUNT);
        if (!ignore) {
          setTopCards(result.cards);
          setTotalCount(result.totalCount);
        }
      } catch {
        if (!ignore) {
          setToast({ message: 'Could not load your cards.', tone: 'neutral' });
        }
      }
    }

    loadTopCards();

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

  function showToast(message: string, tone: ToastMessage['tone'] = 'success') {
    setToast({ message: message, tone: tone });
  }

  /** Reloads the top cards after a change, since any change can reorder them. */
  async function refreshTopCards() {
    try {
      const result = await fetchTopCards(TOP_CARDS_COUNT);
      setTopCards(result.cards);
      setTotalCount(result.totalCount);
    } catch {
      showToast('Could not refresh your cards.', 'neutral');
    }
  }

  /** Saves a new card. Returns true if it was saved, so the form can clear itself. */
  async function handleAddCard(question: string, confidence: number): Promise<boolean> {
    if (question === '') {
      showToast('Add a concept or question before saving.', 'neutral');
      return false;
    }

    try {
      await createCard(question, confidence);
    } catch {
      showToast('Could not save that card. Try again.', 'neutral');
      return false;
    }

    await refreshTopCards();
    showToast('Card added to your study list.');
    return true;
  }

  /** Saves a review with the chosen confidence, then closes the review dialog. */
  async function handleReview(cardId: number, confidence: number) {
    try {
      await saveReview(cardId, confidence);
    } catch {
      showToast('Could not save that review. Try again.', 'neutral');
      return;
    }

    await refreshTopCards();
    setSelectedCard(null);
    showToast(`Review saved — confidence set to ${confidence}/${MAX_CONFIDENCE}.`);
  }

  /** Deletes a card, and closes the review dialog if it was showing that card. */
  async function handleDelete(cardId: number) {
    try {
      await deleteCard(cardId);
    } catch {
      showToast('Could not delete that card. Try again.', 'neutral');
      return;
    }

    await refreshTopCards();
    if (selectedCard?.id === cardId) {
      setSelectedCard(null);
    }
    showToast('Card removed from your study list.', 'neutral');
  }

  return (
    <main className="container">
      <header className="app-header">
        <div>
          <p className="eyebrow">Your study list</p>
          <h1>Recall</h1>
          <p className="intro">Continuous-decay spaced repetition for the concepts worth revisiting next.</p>
        </div>
        <div className="card-total" aria-label={`${totalCount} total cards`}>
          <strong>{totalCount}</strong>
          <span>{totalCount === 1 ? 'card saved' : 'cards saved'}</span>
        </div>
      </header>

      <AddCardForm onAddCard={handleAddCard} />

      <TopCardList
        topCards={topCards}
        totalCount={totalCount}
        onReview={setSelectedCard}
        onDelete={handleDelete}
      />

      {toast !== null && <Toast toast={toast} />}

      {selectedCard !== null && (
        <ReviewDialog
          card={selectedCard}
          onReview={handleReview}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </main>
  );
}
