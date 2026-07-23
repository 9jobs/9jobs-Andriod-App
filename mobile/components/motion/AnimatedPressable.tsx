import React from "react";
import { Pressable, PressableProps, StyleProp, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useReducedMotionPreference } from "./ReducedMotion";

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

export type AnimatedPressableProps = PressableProps & {
  scaleTo?: number;
  opacityTo?: number;
  duration?: number;
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
};

export function AnimatedPressable({
  children,
  scaleTo = 0.98,
  opacityTo = 0.9,
  duration = 130,
  disabled,
  style,
  onPressIn,
  onPressOut,
  ...rest
}: AnimatedPressableProps) {
  const isReducedMotion = useReducedMotionPreference();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const handlePressIn = (e: any) => {
    if (!disabled) {
      if (!isReducedMotion) {
        scale.value = withTiming(scaleTo, {
          duration,
          easing: Easing.out(Easing.quad),
        });
      }
      opacity.value = withTiming(opacityTo, {
        duration,
        easing: Easing.out(Easing.quad),
      });
    }
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    if (!disabled) {
      scale.value = withTiming(1, {
        duration,
        easing: Easing.out(Easing.quad),
      });
      opacity.value = withTiming(1, {
        duration,
        easing: Easing.out(Easing.quad),
      });
    }
    onPressOut?.(e);
  };

  return (
    <AnimatedPressableBase
      {...rest}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        typeof style === "function" ? undefined : style,
        animatedStyle,
      ]}
    >
      {(state) => (typeof children === "function" ? children(state) : children)}
    </AnimatedPressableBase>
  );
}
