import { PropsWithChildren } from "react";
import { StyleProp, ViewStyle } from "react-native";
import Animated, {
  Easing,
  FadeIn,
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

  const entering = reducedMotion
    ? FadeIn.duration(120).reduceMotion(ReduceMotion.Always)
    : FadeInUp.duration(animationConfig.entrance.duration)
        .easing(Easing.out(Easing.cubic))
        .reduceMotion(ReduceMotion.System);

  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  );
}
