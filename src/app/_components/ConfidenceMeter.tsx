import { CONFIDENCE_VALUES, MAX_CONFIDENCE } from '@/lib/confidence';

type ConfidenceMeterProps = {
  value: number;
};

/** A row of dots with the first `value` filled in, e.g. ●●●○○ for a confidence of 3. */
export function ConfidenceMeter(props: ConfidenceMeterProps) {
  return (
    <span className="confidence-meter" aria-label={`${props.value} out of ${MAX_CONFIDENCE} confidence`}>
      {CONFIDENCE_VALUES.map((confidenceValue) => {
        const isFilled = confidenceValue <= props.value;
        return <span key={confidenceValue} className={isFilled ? 'is-filled' : ''} />;
      })}
    </span>
  );
}
