import { NEAR_BOTTOM_PX } from "@/lib/constants";

export type FollowMode = "follow" | "paused";

export interface ScrollMetrics {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}

export function distanceFromBottom(metrics: ScrollMetrics): number {
  return metrics.scrollHeight - metrics.scrollTop - metrics.clientHeight;
}

export function isNearBottom(metrics: ScrollMetrics, threshold = NEAR_BOTTOM_PX): boolean {
  return distanceFromBottom(metrics) <= threshold;
}

export function nextFollowMode(input: {
  current: FollowMode;
  nearBottom: boolean;
  source: "user-scroll" | "programmatic";
}): FollowMode {
  if (input.source === "programmatic") return input.current;
  return input.nearBottom ? "follow" : "paused";
}

export function shouldStickToBottom(mode: FollowMode): boolean {
  return mode === "follow";
}

export function shouldShowJump(mode: FollowMode, contentGrew: boolean): boolean {
  return mode === "paused" && contentGrew;
}
