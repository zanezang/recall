import type { Card } from '@/lib/types';

/**
 * The page's calls to the cards API, one function per request.
 *
 * Each function throws when the request fails. A failure comes in two forms: no response
 * at all (fetch itself rejects, for example when offline) or an error status (fetch
 * resolves, with `ok` false). Turning both into a thrown error lets callers handle them
 * with one try/catch.
 */

/** The body of GET /api/top-cards. Card times are epoch milliseconds. */
export type TopCardsResponse = {
  cards: Card[];
  totalCount: number;
};

/** Throws unless the response has a success status (200–299). */
function throwIfFailed(response: Response, requestName: string): void {
  if (!response.ok) {
    throw new Error(`${requestName} failed with status ${response.status}`);
  }
}

/** Gets the `k` highest-priority cards, highest first, and the total number of cards. */
export async function fetchTopCards(k: number): Promise<TopCardsResponse> {
  const response = await fetch(`/api/top-cards?k=${k}`);
  throwIfFailed(response, 'GET /api/top-cards');
  return response.json();
}

/** Creates a card. The server sets its id and times. */
export async function createCard(question: string, confidence: number): Promise<void> {
  const response = await fetch('/api/cards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: question, confidence: confidence }),
  });
  throwIfFailed(response, 'POST /api/cards');
}

/** Records a review of a card with its new confidence. The server sets the review time. */
export async function saveReview(cardId: number, confidence: number): Promise<void> {
  const response = await fetch(`/api/cards/${cardId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confidence: confidence }),
  });
  throwIfFailed(response, 'PATCH /api/cards/:id');
}

/**
 * Deletes a card. A 404 counts as success: the card is already gone, for example because
 * it was deleted in another tab.
 */
export async function deleteCard(cardId: number): Promise<void> {
  const response = await fetch(`/api/cards/${cardId}`, { method: 'DELETE' });
  if (response.status === 404) {
    return;
  }
  throwIfFailed(response, 'DELETE /api/cards/:id');
}
