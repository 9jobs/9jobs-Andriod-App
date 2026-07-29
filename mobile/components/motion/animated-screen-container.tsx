import { PropsWithChildren } from "react";
import { StyleProp, ViewStyle } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  ReduceMotion,
} from "react-native-reanimated";
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
    : FadeIn.duration(180)
        .easing(Easing.out(Easing.cubic))
        .reduceMotion(ReduceMotion.System);

  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  );
}
