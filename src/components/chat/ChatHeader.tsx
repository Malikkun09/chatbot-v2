"use client";

import { ModelPicker } from "@/components/chat/ModelPicker";

export function ChatHeader({
  selectedModel,
  onModelChange,
  onNewChat,
  disabled,
}: {
  selectedModel: string;
  onModelChange: (id: string) => void;
  onNewChat: () => void;
  disabled?: boolean;
}) {
  return (
    <header className="chat-header">
      <div className="header-main">
        <p className="brand">Chatbot V2</p>
        <ModelPicker value={selectedModel} onChange={onModelChange} disabled={disabled} />
      </div>
      <button type="button" className="ghost-btn" onClick={onNewChat}>
        New chat
      </button>
    </header>
  );
}
