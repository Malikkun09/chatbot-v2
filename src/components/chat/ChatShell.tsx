"use client";

import { useCallback, useRef, useState, type DragEvent, type ClipboardEvent } from "react";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatScrollContainer } from "@/components/chat/ChatScrollContainer";
import { ImageViewer, type ViewerImage } from "@/components/chat/ImageViewer";
import { useChatController } from "@/hooks/use-chat-controller";
import { clipboardImages, dataTransferFiles } from "@/lib/attachments/ingest";
import type { Attachment } from "@/lib/chat/types";

function viewerSrc(attachment: Attachment): string | undefined {
  return attachment.previewUrl || attachment.dataUrl;
}

export function ChatShell() {
  const chat = useChatController();
  const [viewer, setViewer] = useState<ViewerImage | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);

  const openImage = useCallback((attachment: Attachment) => {
    const src = viewerSrc(attachment);
    if (!src) return;
    setViewer({ src, alt: attachment.name });
  }, []);

  const onDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepth.current += 1;
    if (event.dataTransfer.types.includes("Files")) setDragging(true);
  };

  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    const files = dataTransferFiles(event.dataTransfer);
    if (files.length) void chat.addFiles(files);
  };

  const onPaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const images = clipboardImages(event.nativeEvent);
    if (!images.length) return;
    void chat.addFiles(images);
    const text = event.clipboardData.getData("text/plain");
    if (!text) event.preventDefault();
  };

  const streaming = chat.status === "submitting" || chat.status === "streaming";

  return (
    <div
      className="chat-shell"
      data-chat-status={chat.status}
      data-dragging={dragging || undefined}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onPaste={onPaste}
    >
      {dragging ? (
        <div className="drop-overlay" aria-hidden="true">
          Drop files to attach
        </div>
      ) : null}
      <ChatHeader
        selectedModel={chat.selectedModel}
        onModelChange={chat.selectModel}
        onNewChat={chat.newChat}
        disabled={streaming}
      />
      <ChatScrollContainer notice={chat.connectionNotice} streaming={streaming}>
        <ChatMessages
          messages={chat.messages}
          toolCalls={chat.toolCalls}
          onRetry={chat.retry}
          onSuggestion={(prompt) => void chat.send(prompt, [])}
          onOpenImage={openImage}
        />
      </ChatScrollContainer>
      <ChatInput
        draft={chat.draft}
        attachments={chat.attachments}
        status={chat.status}
        visionBlocked={chat.visionBlocked}
        onDraftChange={chat.setDraft}
        onSend={() => void chat.send()}
        onStop={chat.stop}
        onFiles={(files) => void chat.addFiles(files)}
        onRemoveAttachment={chat.removeAttachment}
        onRetryAttachment={(id) => void chat.retryAttachment(id)}
        onOpenImage={openImage}
        onSwitchVisionModel={chat.switchToVisionModel}
        onRemoveImages={chat.removeImages}
      />
      <ImageViewer image={viewer} onClose={() => setViewer(null)} />
    </div>
  );
}
