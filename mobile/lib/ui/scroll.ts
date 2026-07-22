import { Platform, type NativeScrollEvent } from "react-native";

export const verticalScrollProps = {
  showsVerticalScrollIndicator: false,
  bounces: false,
  overScrollMode: "never" as const,
  nestedScrollEnabled: true,
  scrollEventThrottle: 16,
  keyboardShouldPersistTaps: "handled" as const,
  keyboardDismissMode: "on-drag" as const,
  decelerationRate: Platform.select({
    ios: 0.992,
    android: 0.985,
    native: 0.99,
    web: 0.99,
  }),
};

export function isNearBottom(event: NativeScrollEvent, threshold = 72) {
  return event.layoutMeasurement.height + event.contentOffset.y >= event.contentSize.height - threshold;
}
