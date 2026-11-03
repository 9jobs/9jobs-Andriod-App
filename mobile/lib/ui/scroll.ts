import { type NativeScrollEvent } from "react-native";

export const verticalScrollProps = {
  showsVerticalScrollIndicator: false,
  scrollEventThrottle: 16,
  keyboardShouldPersistTaps: "handled" as const,
  keyboardDismissMode: "on-drag" as const,
  // Native fast deceleration: Android 0.9 / iOS 0.99. No JS-driven momentum.
  decelerationRate: "fast" as const,
  directionalLockEnabled: true,
  nestedScrollEnabled: false,
  // Mouse/keyboard focus must not pull the page back to an earlier card.
  scrollsChildToFocus: false,
  bounces: false,
  alwaysBounceVertical: false,
  overScrollMode: "never" as const,
  // Transformed reveal sections must retain their native layout while off screen.
  removeClippedSubviews: false,
};

export function isNearBottom(event: NativeScrollEvent, threshold = 72) {
  return event.layoutMeasurement.height + event.contentOffset.y >= event.contentSize.height - threshold;
}

export function shouldFollowChatScroll(event: NativeScrollEvent, previousY: number, dragging: boolean) {
  // Even a small deliberate move upward must release chat's bottom-follow mode.
  return !dragging && event.contentOffset.y >= previousY - 0.5 && isNearBottom(event, 2);
}
