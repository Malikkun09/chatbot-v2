import { SUGGESTIONS } from "@/lib/chat/prompt";

export function EmptyState({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="empty-state" data-testid="empty-state">
      <h1 className="empty-title">How can I help?</h1>
      <p className="empty-copy">
        Chatbot V2 — a standalone assistant with streaming answers and proper Markdown.
      </p>
      <ul className="empty-suggestions">
        {SUGGESTIONS.map((item) => (
          <li key={item.id}>
            <button type="button" className="suggestion" onClick={() => onPick(item.prompt)}>
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
