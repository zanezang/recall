import { useState, type FormEvent } from 'react';

import { MAX_TOP_CARDS_COUNT } from '@/lib/topCards/topCardsCount';

type TopCardControlsProps = {
  /** How many top cards are shown now. */
  count: number;
  /** True while a request for the top cards is in flight. */
  isLoading: boolean;
  isListVisible: boolean;
  /** The server time the shown cards were ranked at, or null before the first load. */
  rankedAtMs: number | null;
  /** Loads the top `count` cards. */
  onRefresh: (count: number) => void;
  onToggleList: () => void;
};

/**
 * The toolbar above the study list: how many cards to show, Refresh, Hide/Show, and when
 * the list was ranked.
 *
 * The count field keeps its own text while the user types, like the add-card form. Nothing
 * is fetched until the user presses Refresh or Enter, so typing "20" does not first fetch 2.
 */
export function TopCardControls(props: TopCardControlsProps) {
  const [countText, setCountText] = useState(String(props.count));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Handle the submission here instead of letting the browser reload the page.
    event.preventDefault();
    props.onRefresh(Number(countText));
  }

  let refreshLabel = 'Refresh';
  if (props.isLoading) {
    refreshLabel = 'Loading…';
  }

  let toggleLabel = 'Hide list';
  if (!props.isListVisible) {
    toggleLabel = 'Show list';
  }

  let rankedAtText = '';
  if (props.rankedAtMs !== null) {
    rankedAtText = `Updated ${new Date(props.rankedAtMs).toLocaleTimeString()}`;
  }

  return (
    <form className="top-card-controls" onSubmit={handleSubmit}>
      {/* required, min, max, and step make the browser refuse to submit anything but a
          whole number from 1 to MAX_TOP_CARDS_COUNT. The server checks again. */}
      <label className="count-picker">
        <span>Show</span>
        <input
          type="number"
          required
          min={1}
          max={MAX_TOP_CARDS_COUNT}
          step={1}
          value={countText}
          onChange={(event) => setCountText(event.target.value)}
        />
        <span>cards</span>
      </label>

      <button type="submit" disabled={props.isLoading}>
        {refreshLabel}
      </button>

      <button type="button" onClick={props.onToggleList}>
        {toggleLabel}
      </button>

      <span className="ranked-at">{rankedAtText}</span>
    </form>
  );
}
