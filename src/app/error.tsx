"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="empty-state" style={{ padding: "2rem" }}>
      <h1 className="empty-title">Something went wrong</h1>
      <p className="empty-copy">The app hit an unexpected error. You can retry without losing this tab.</p>
      <button type="button" className="ghost-btn" onClick={reset}>
        Retry
      </button>
    </main>
  );
}
