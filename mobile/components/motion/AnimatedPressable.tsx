import React from "react";
import { Pressable, PressableProps, StyleProp, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
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
      scale.value = withSpring(1, {
        damping: 14,
        stiffness: 260,
      });
      opacity.value = withTiming(1, {
        duration,
        easing: Easing.out(Easing.quad),
      });
    }
    onPressOut?.(e);
  };

  const lastPressTime = React.useRef(0);
  const handlePress = (e: any) => {
    if (disabled) return;
    const now = Date.now();
    if (now - lastPressTime.current < 450) {
      return;
    }
    lastPressTime.current = now;
    rest.onPress?.(e);
  };

  return (
    <AnimatedPressableBase
      {...rest}
      onPress={rest.onPress ? handlePress : undefined}
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
