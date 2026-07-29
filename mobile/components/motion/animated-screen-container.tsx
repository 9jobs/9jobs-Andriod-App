import { PropsWithChildren } from "react";
import { StyleProp, ViewStyle } from "react-native";
import { usePathname } from "expo-router";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  FadeInUp,
  ReduceMotion,
} from "react-native-reanimated";
import { animationConfig } from "./animation-config";
import { useReducedMotionPreference } from "./ReducedMotion";

type AnimatedScreenContainerProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

export function AnimatedScreenContainer({
  children,
  style,
}: AnimatedScreenContainerProps) {
  const reducedMotion = useReducedMotionPreference();
  const pathname = usePathname();

  const entering = reducedMotion
    ? FadeIn.duration(120).reduceMotion(ReduceMotion.Always)
    : resolveScreenEntrance(pathname);

  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  );
}

function resolveScreenEntrance(pathname: string) {
  const duration = animationConfig.entrance.duration;
  const easing = Easing.out(Easing.cubic);

  if (
    pathname.includes("/profile") ||
    pathname.includes("/notifications") ||
    pathname.includes("/settings")
  ) {
    return FadeInDown.duration(duration)
      .easing(easing)
      .reduceMotion(ReduceMotion.System);
  }

  if (
    pathname.includes("/tracker") ||
    pathname.includes("/about") ||
    pathname.includes("/saved")
  ) {
    return FadeInLeft.duration(duration)
      .easing(easing)
      .reduceMotion(ReduceMotion.System);
  }

  if (
    pathname.includes("/services") ||
    pathname.includes("/messages") ||
    pathname.includes("/chat") ||
    pathname.includes("/contact") ||
    pathname.includes("/interview")
  ) {
    return FadeInRight.duration(duration)
      .easing(easing)
      .reduceMotion(ReduceMotion.System);
  }

  return FadeInUp.duration(duration)
    .withInitialValues({
      opacity: 0,
      transform: [{ translateY: animationConfig.entrance.distance }],
    })
    .easing(easing)
    .reduceMotion(ReduceMotion.System);
}
