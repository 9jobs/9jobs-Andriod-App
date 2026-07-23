import { Platform, type NativeScrollEvent } from "react-native";

export const verticalScrollProps = {
  showsVerticalScrollIndicator: false,
  nestedScrollEnabled: true,
  scrollEventThrottle: 16,
  keyboardShouldPersistTaps: "handled" as const,
  keyboardDismissMode: "on-drag" as const,
  decelerationRate: "normal" as const,
};

export function isNearBottom(event: NativeScrollEvent, threshold = 72) {
  return event.layoutMeasurement.height + event.contentOffset.y >= event.contentSize.height - threshold;
}
