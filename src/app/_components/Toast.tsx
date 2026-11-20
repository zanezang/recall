/** A brief status message shown in the corner of the page. */
export type ToastMessage = {
  message: string;
  tone: 'success' | 'neutral';
};

type ToastProps = {
  toast: ToastMessage;
};

/** Shows one status message. The page decides when it appears and when it is dismissed. */
export function Toast(props: ToastProps) {
  return (
    <div className={`toast toast-${props.toast.tone}`} role="status">
      <span aria-hidden="true">{props.toast.tone === 'success' ? '✓' : 'i'}</span>
      {props.toast.message}
    </div>
  );
}
