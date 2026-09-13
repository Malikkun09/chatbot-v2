export function ErrorBlock({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="error-block" role="alert" data-testid="error-block">
      <p>{message}</p>
      {onRetry ? (
        <button type="button" className="error-retry" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}
