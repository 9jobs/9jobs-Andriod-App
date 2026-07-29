import { memo, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { colors } from "@/theme";
import { animationConfig } from "./animation-config";
import { useReducedMotionPreference } from "./ReducedMotion";

type OrbitalGlowProps = {
  animated: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export const OrbitalGlow = memo(function OrbitalGlow({
  animated,
  compact = false,
  style,
}: OrbitalGlowProps) {
  const rotation = useSharedValue(0);
  const reducedMotion = useReducedMotionPreference();
  const shouldAnimate = animated && !reducedMotion;

  useEffect(() => {
    if (!shouldAnimate) {
      cancelAnimation(rotation);
      rotation.value = 0;
      return;
    }

    rotation.value = withRepeat(
      withTiming(360, {
        duration: animationConfig.orbit.duration,
        easing: Easing.linear,
      }),
      -1,
      false,
    );

    return () => cancelAnimation(rotation);
  }, [rotation, shouldAnimate]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.container, compact && styles.compactContainer, style]}
    >
      <View style={[styles.glow, compact && styles.compactGlow]} />
      <Animated.View style={[styles.orbit, compact && styles.compactOrbit, animatedStyle]}>
        <View style={styles.dot} />
        <View style={styles.dotSecondary} />
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: -28,
    top: 96,
    width: 220,
    height: 220,
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    width: 132,
    height: 132,
    borderRadius: 999,
    backgroundColor: "rgba(163,230,53,0.20)",
    shadowColor: colors.accent,
    shadowOpacity: 0.16,
    shadowRadius: 28,
  },
  orbit: {
    width: 184,
    height: 184,
    borderRadius: 999,
    borderWidth: 0.6,
    borderColor: "rgba(127,178,29,0.26)",
  },
  dot: {
    position: "absolute",
    left: 34,
    top: 7,
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(127,178,29,0.62)",
  },
  dotSecondary: {
    position: "absolute",
    bottom: 19,
    right: 19,
    width: 4,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(163,230,53,0.52)",
  },
  compactContainer: {
    width: 104,
    height: 104,
    right: undefined,
    top: undefined,
  },
  compactGlow: {
    width: 72,
    height: 72,
  },
  compactOrbit: {
    width: 98,
    height: 98,
  },
});
