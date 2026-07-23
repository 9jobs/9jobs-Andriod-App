import React, { PropsWithChildren, useEffect, useRef } from "react";
import { StyleProp, ViewStyle } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  FadeInUp,
} from "react-native-reanimated";
import { useReducedMotionPreference } from "./ReducedMotion";

export type AnimationType =
  | "fade"
  | "fade-up"
  | "fade-down"
  | "fade-left"
  | "fade-right"
  | "scale-in";

type FadeInViewProps = PropsWithChildren<{
  type?: AnimationType;
  delay?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}>;

export function FadeInView({
  children,
  type = "fade-up",
  delay = 0,
  duration = 320,
  style,
}: FadeInViewProps) {
  const isReducedMotion = useReducedMotionPreference();
  const hasAnimatedRef = useRef(false);
  const effectiveDelay = Math.min(delay, 250);

  useEffect(() => {
    hasAnimatedRef.current = true;
  }, []);

  if (isReducedMotion || hasAnimatedRef.current) {
    return <Animated.View style={style}>{children}</Animated.View>;
  }

  let enteringAnimation;
  switch (type) {
    case "fade-down":
      enteringAnimation = FadeInDown.duration(duration).delay(effectiveDelay);
      break;
    case "fade-left":
      enteringAnimation = FadeInLeft.duration(duration).delay(effectiveDelay);
      break;
    case "fade-right":
      enteringAnimation = FadeInRight.duration(duration).delay(effectiveDelay);
      break;
    case "scale-in":
      enteringAnimation = FadeIn.duration(duration).delay(effectiveDelay);
      break;
    case "fade":
      enteringAnimation = FadeIn.duration(duration).delay(effectiveDelay);
      break;
    case "fade-up":
    default:
      enteringAnimation = FadeInUp.duration(duration).delay(effectiveDelay);
      break;
  }

  return (
    <Animated.View entering={enteringAnimation} style={style}>
      {children}
    </Animated.View>
  );
}
