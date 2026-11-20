import { useState, type FormEvent } from 'react';

import { CONFIDENCE_LABELS, MAX_CONFIDENCE, MIN_CONFIDENCE } from '@/lib/confidence';

type AddCardFormProps = {
  /** Saves a new card. Resolves to true if it was saved, so the form knows to clear itself. */
  onAddCard: (question: string, confidence: number) => Promise<boolean>;
};

/**
 * The "Add a concept" form. It keeps its own field values, so typing redraws only the
 * form, not the rest of the page.
 */
export function AddCardForm(props: AddCardFormProps) {
  const [question, setQuestion] = useState('');
  const [confidence, setConfidence] = useState(MIN_CONFIDENCE);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Handle the submission here instead of letting the browser reload the page.
    event.preventDefault();

    const saved = await props.onAddCard(question.trim(), confidence);
    if (saved) {
      setQuestion('');
      setConfidence(MIN_CONFIDENCE);
    }
  }

  return (
    <section className="add-card" aria-labelledby="add-card-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Build your study list</p>
          <h2 id="add-card-title">Add a concept</h2>
        </div>
        <span className="hint">Keep it focused and easy to revisit.</span>
      </div>

      <form onSubmit={handleSubmit}>
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
          Add card <span aria-hidden="true">→</span>
        </button>
      </form>
    </section>
  );
}
