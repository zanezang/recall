'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type Card = {
  id: number;
  question: string;
  confidence: number;
  createdAt: number;
  lastReviewedAt: number;
};

type Feedback = {
  message: string;
  tone: 'success' | 'neutral';
};

const confidenceLabels = ['Starting out', 'Somewhat unsure', 'Getting there', 'Confident', 'Very confident'];

function calculatePriority(card: Card) {
  const now = Date.now();

  const elapsedTime = (now - card.lastReviewedAt) / 1000;
  const age = (now - card.createdAt) / 1000;

  const W = 1;

  return (
    (elapsedTime * W) /
    (card.confidence * Math.log(age + Math.E))
  );
}

function ConfidenceMeter({ value }: { value: number }) {
  return (
    <span className="confidence-meter" aria-label={`${value} out of 5 confidence`}>
      {[1, 2, 3, 4, 5].map((dot) => (
        <span className={dot <= value ? 'is-filled' : ''} key={dot} />
      ))}
    </span>
  );
}

export default function Home() {
  const [question, setQuestion] = useState('');
  const [confidence, setConfidence] = useState(1);
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    if (!feedback) return;

    const timeout = window.setTimeout(() => setFeedback(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  useEffect(() => {
    if (!selectedCard) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setSelectedCard(null);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCard]);

  function showFeedback(message: string, tone: Feedback['tone'] = 'success') {
    setFeedback({ message, tone });
  }

  function addCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      showFeedback('Add a concept or question before saving.', 'neutral');
      return;
    }

    const now = Date.now();
    const newCard: Card = {
      id: now,
      question: trimmedQuestion,
      confidence,
      createdAt: now,
      lastReviewedAt: now,
    };

    setCards((currentCards) => [...currentCards, newCard]);
    setQuestion('');
    setConfidence(1);
    showFeedback('Card added to your study queue.');
  }

  function reviewCard(id: number, newConfidence: number) {
    setCards((currentCards) =>
      currentCards.map((card) =>
        card.id === id
          ? { ...card, confidence: newConfidence, lastReviewedAt: Date.now() }
          : card
      )
    );
    setSelectedCard(null);
    showFeedback(`Review saved — confidence set to ${newConfidence}/5.`);
  }

  function deleteCard(id: number) {
    setCards((currentCards) => currentCards.filter((card) => card.id !== id));
    if (selectedCard?.id === id) setSelectedCard(null);
    showFeedback('Card removed from your queue.', 'neutral');
  }

  // Capture priorities when card data changes, rather than on every form keystroke.
  // This keeps the queue and the displayed scores stable between study actions.
  const rankedCards = useMemo(
    () => cards
      .map((card) => ({ card, priority: calculatePriority(card) }))
      .sort((a, b) => b.priority - a.priority),
    [cards]
  );
  const topCards = rankedCards.slice(0, 5);

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
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="e.g. What is an R-type instruction?"
            rows={3}
          />

          <div className="confidence-field">
            <div className="confidence-copy">
              <label className="field-label" htmlFor="initial-confidence">Initial confidence</label>
              <span>{confidence}/5 · {confidenceLabels[confidence - 1]}</span>
            </div>
            <input
              id="initial-confidence"
              type="range"
              min="1"
              max="5"
              value={confidence}
              onChange={(event) => setConfidence(Number(event.target.value))}
            />
            <div className="range-labels" aria-hidden="true"><span>New</span><span>Solid</span></div>
          </div>

          <button className="primary-button" type="submit">Add to queue <span aria-hidden="true">→</span></button>
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
                      <span>{card.confidence}/5 confidence</span>
                    </div>
                    <div className="actions">
                      <button className="review-button" onClick={() => setSelectedCard(card)}>Review <span aria-hidden="true">→</span></button>
                      <button className="delete" onClick={() => deleteCard(card.id)} aria-label={`Delete ${card.question}`}>Delete</button>
                    </div>
                  </div>
                </article>
            ))}
          </div>
        )}
      </section>

      {feedback && (
        <div className={`toast toast-${feedback.tone}`} role="status">
          <span aria-hidden="true">{feedback.tone === 'success' ? '✓' : 'i'}</span>
          {feedback.message}
        </div>
      )}

      {selectedCard && (
        <div className="modal-backdrop" onMouseDown={() => setSelectedCard(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="review-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedCard(null)} aria-label="Close review">×</button>
            <p className="eyebrow">Review card</p>
            <h2 id="review-title">{selectedCard.question}</h2>
            <p className="modal-prompt">How well did that come back to you?</p>
            <div className="confidence-buttons" aria-label="Choose your confidence">
              {[1, 2, 3, 4, 5].map((value) => (
                <button key={value} onClick={() => reviewCard(selectedCard.id, value)}>
                  <strong>{value}</strong><span>{confidenceLabels[value - 1]}</span>
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
