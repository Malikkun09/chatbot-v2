"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode, type UIEvent } from "react";
import {
  isNearBottom,
  nextFollowMode,
  shouldShowJump,
  shouldStickToBottom,
  type FollowMode,
} from "@/lib/scroll/follow";

function metricsOf(node: HTMLDivElement) {
  return {
    scrollTop: node.scrollTop,
    scrollHeight: node.scrollHeight,
    clientHeight: node.clientHeight,
  };
}

export function ChatScrollContainer({
  children,
  notice,
  streaming,
}: {
  children: ReactNode;
  notice?: string | null;
  streaming?: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<FollowMode>("follow");
  const programmaticRef = useRef(false);
  const [mode, setMode] = useState<FollowMode>("follow");
  const [contentGrew, setContentGrew] = useState(false);

  const stickIfFollowing = useCallback(() => {
    const node = scrollerRef.current;
    if (!node || !shouldStickToBottom(modeRef.current)) return;
    programmaticRef.current = true;
    node.scrollTop = node.scrollHeight;
    requestAnimationFrame(() => {
      programmaticRef.current = false;
    });
  }, []);

  const jumpToLatest = useCallback(() => {
    modeRef.current = "follow";
    setMode("follow");
    setContentGrew(false);
    const node = scrollerRef.current;
    if (!node) return;
    programmaticRef.current = true;
    node.scrollTop = node.scrollHeight;
    requestAnimationFrame(() => {
      programmaticRef.current = false;
    });
  }, []);

  const onScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    if (programmaticRef.current) return;
    const node = event.currentTarget;
    const next = nextFollowMode({
      current: modeRef.current,
      nearBottom: isNearBottom(metricsOf(node)),
      source: "user-scroll",
    });
    modeRef.current = next;
    setMode(next);
    if (next === "follow") setContentGrew(false);
  }, []);

  useEffect(() => {
    const inner = innerRef.current;
    if (!inner || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (modeRef.current === "follow") {
        stickIfFollowing();
        return;
      }
      setContentGrew(true);
    });
    observer.observe(inner);
    return () => observer.disconnect();
  }, [stickIfFollowing]);

  const showJump = shouldShowJump(mode, contentGrew || Boolean(streaming));

  return (
    <div className="chat-scroll-wrap">
      <div
        ref={scrollerRef}
        className="chat-scroll"
        data-follow={mode}
        onScroll={onScroll}
      >
        <div ref={innerRef} className="chat-scroll-inner">
          {children}
        </div>
      </div>
      {notice || showJump ? (
        <div className="scroll-hud">
          {notice ? <p className="connection-status">{notice}</p> : null}
          {showJump ? (
            <button type="button" className="jump-latest" onClick={jumpToLatest}>
              New content
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
