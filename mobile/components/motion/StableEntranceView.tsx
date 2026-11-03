import { PropsWithChildren, useEffect, useRef } from "react";
import { Animated, Easing, StyleProp, ViewStyle } from "react-native";
import { useReducedMotionPreference } from "./ReducedMotion";
import { entranceTiming } from "./entrance";

export type EntranceDirection = "none" | "up" | "down" | "left" | "right" | "scale";
type StableEntranceViewProps = PropsWithChildren<{
  direction?: EntranceDirection;
  delay?: number;
  duration?: number;
  distance?: number;
  revealOnScroll?: boolean;
  style?: StyleProp<ViewStyle>;
}>;

export function StableEntranceView({ children, direction = "up", delay = 0, duration = 360, distance = 12, style }: StableEntranceViewProps) {
  const reducedMotion = useReducedMotionPreference();
  const hasStarted = useRef(false);
  // The React layout starts visible; animation state never owns content layout.
  const progress = useRef(new Animated.Value(1)).current;
  const { delay: safeDelay, duration: safeDuration } = entranceTiming(delay, duration);
  useEffect(() => {
    if (reducedMotion) {
      progress.stopAnimation();
      progress.setValue(1);
      hasStarted.current = true;
      return;
    }
    if (hasStarted.current) return;
    hasStarted.current = true;
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, delay: safeDelay, duration: safeDuration, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [reducedMotion, progress, safeDelay, safeDuration]);
  useEffect(() => () => progress.stopAnimation(), [progress]);
  const x = direction === "left" ? -distance : direction === "right" ? distance : 0;
  const y = direction === "down" ? -distance : direction === "up" ? distance : 0;
  return (
    <Animated.View collapsable={false} style={[style, {
      opacity: progress,
      transform: [
        { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [x, 0] }) },
        { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [y, 0] }) },
        { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [direction === "scale" ? 0.985 : 1, 1] }) },
      ],
    }]}>{children}</Animated.View>
  );
}
