import { DEFAULT_NVIDIA_MODEL } from "@/lib/constants";

export function ChatHeader({
  model,
  onNewChat,
}: {
  model?: string;
  onNewChat: () => void;
}) {
  return (
    <header className="chat-header">
      <div>
        <p className="brand">Chatbot V2</p>
        <p className="model-line" title={model || DEFAULT_NVIDIA_MODEL}>
          {model || DEFAULT_NVIDIA_MODEL}
        </p>
      </div>
      <button type="button" className="ghost-btn" onClick={onNewChat}>
        New chat
      </button>
    </header>
  );
}
