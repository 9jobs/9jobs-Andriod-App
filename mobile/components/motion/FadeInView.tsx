import React, { PropsWithChildren, useEffect, useRef } from "react";
import { StyleProp, ViewStyle } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  FadeInUp,
} from "react-native-reanimated";
import { useReducedMotionPreference } from "./ReducedMotion";
import { animationConfig } from "./animation-config";

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
  const effectiveDelay = Math.min(delay, 180);
  const effectiveDuration = Math.min(Math.max(duration, 240), 320);
  const distance = Math.min(8, animationConfig.entrance.distance);

  useEffect(() => {
    hasAnimatedRef.current = true;
  }, []);

  if (isReducedMotion || hasAnimatedRef.current) {
    return <Animated.View style={style}>{children}</Animated.View>;
  }

  let enteringAnimation;
  switch (type) {
    case "fade-down":
      enteringAnimation = FadeInDown.duration(effectiveDuration)
        .delay(effectiveDelay)
        .withInitialValues({ opacity: 0, transform: [{ translateY: -distance }] })
        .easing(Easing.out(Easing.cubic));
      break;
    case "fade-left":
      enteringAnimation = FadeInLeft.duration(effectiveDuration)
        .delay(effectiveDelay)
        .withInitialValues({ opacity: 0, transform: [{ translateX: -distance }] })
        .easing(Easing.out(Easing.cubic));
      break;
    case "fade-right":
      enteringAnimation = FadeInRight.duration(effectiveDuration)
        .delay(effectiveDelay)
        .withInitialValues({ opacity: 0, transform: [{ translateX: distance }] })
        .easing(Easing.out(Easing.cubic));
      break;
    case "scale-in":
      enteringAnimation = FadeIn.duration(effectiveDuration).delay(effectiveDelay);
      break;
    case "fade":
      enteringAnimation = FadeIn.duration(effectiveDuration).delay(effectiveDelay);
      break;
    case "fade-up":
    default:
      enteringAnimation = FadeInUp.duration(effectiveDuration)
        .delay(effectiveDelay)
        .withInitialValues({
          opacity: 0,
          transform: [{ translateY: distance }],
        })
        .easing(Easing.out(Easing.cubic));
      break;
  }

  return (
    <Animated.View entering={enteringAnimation} style={style}>
      {children}
    </Animated.View>
  );
}
