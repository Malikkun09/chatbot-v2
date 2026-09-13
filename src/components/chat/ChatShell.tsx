"use client";

import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { useChatController } from "@/hooks/use-chat-controller";

export function ChatShell() {
  const chat = useChatController();

  return (
    <div className="chat-shell" data-chat-status={chat.status}>
      <ChatHeader model={chat.model} onNewChat={chat.newChat} />
      <ChatMessages
        messages={chat.messages}
        toolCalls={chat.toolCalls}
        onRetry={chat.retry}
        onSuggestion={(prompt) => void chat.send(prompt, [])}
      />
      <ChatInput
        draft={chat.draft}
        attachments={chat.attachments}
        status={chat.status}
        onDraftChange={chat.setDraft}
        onSend={() => void chat.send()}
        onStop={chat.stop}
        onFiles={(files) => void chat.addFiles(files)}
        onRemoveAttachment={chat.removeAttachment}
      />
    </div>
  );
}
