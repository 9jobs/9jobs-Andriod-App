import { PropsWithChildren, useCallback, useRef } from "react";
import { LayoutChangeEvent, StyleProp, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { useReducedMotionPreference } from "./ReducedMotion";

export type EntranceDirection = "none" | "up" | "down" | "left" | "right" | "scale";

type StableEntranceViewProps = PropsWithChildren<{
  direction?: EntranceDirection;
  delay?: number;
  duration?: number;
  distance?: number;
  style?: StyleProp<ViewStyle>;
}>;

export function StableEntranceView({
  children,
  direction = "up",
  delay = 0,
  duration = 420,
  distance = 8,
  style,
}: StableEntranceViewProps) {
  const reducedMotion = useReducedMotionPreference();
  const hasStarted = useRef(false);
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(
    direction === "left" ? -distance : direction === "right" ? distance : 0
  );
  const translateY = useSharedValue(
    direction === "down" ? -distance : direction === "up" ? distance : 0
  );
  const scale = useSharedValue(direction === "scale" ? 0.985 : 1);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const handleLayout = useCallback(
    (_event: LayoutChangeEvent) => {
      if (hasStarted.current) return;
      hasStarted.current = true;

      const safeDelay = Math.min(Math.max(delay, 0), 320);
      const safeDuration = Math.min(Math.max(duration, 350), 600);
      const timing = {
        duration: reducedMotion ? 120 : safeDuration,
        easing: Easing.out(Easing.cubic),
      };
      const start = <T extends number>(value: T) =>
        reducedMotion ? withTiming(value, timing) : withDelay(safeDelay, withTiming(value, timing));

      opacity.value = start(1);
      translateX.value = start(0);
      translateY.value = start(0);
      scale.value = start(1);
    },
    [delay, duration, opacity, reducedMotion, scale, translateX, translateY]
  );

  return (
    <Animated.View onLayout={handleLayout} style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}
