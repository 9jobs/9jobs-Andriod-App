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
  const pulse = useSharedValue(0);
  const reducedMotion = useReducedMotionPreference();
  const shouldAnimate = animated && !reducedMotion;

  useEffect(() => {
    if (!shouldAnimate) {
      cancelAnimation(rotation);
      cancelAnimation(pulse);
      rotation.value = 0;
      pulse.value = 0;
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
    pulse.value = withRepeat(
      withTiming(1, {
        duration: 1_900,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );

    return () => {
      cancelAnimation(rotation);
      cancelAnimation(pulse);
    };
  }, [pulse, rotation, shouldAnimate]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));
  const reverseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * -0.72}deg` }],
  }));
  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 0.48 + pulse.value * 0.34,
    transform: [{ scale: 0.9 + pulse.value * 0.16 }],
  }));

  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.container, compact && styles.compactContainer, style]}
    >
      <Animated.View style={[styles.glow, compact && styles.compactGlow, pulseAnimatedStyle]} />
      <View style={[styles.outerRing, compact && styles.compactOuterRing]} />
      <Animated.View style={[styles.orbit, compact && styles.compactOrbit, animatedStyle]}>
        <View style={styles.dot} />
        <View style={styles.dotSecondary} />
      </Animated.View>
      <Animated.View
        style={[
          styles.innerOrbit,
          compact && styles.compactInnerOrbit,
          reverseAnimatedStyle,
        ]}
      >
        <View style={styles.dotTertiary} />
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
    backgroundColor: "rgba(163,230,53,0.30)",
    shadowColor: colors.accent,
    shadowOpacity: 0.32,
    shadowRadius: 34,
  },
  orbit: {
    width: 184,
    height: 184,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(127,178,29,0.46)",
  },
  outerRing: {
    position: "absolute",
    width: 212,
    height: 212,
    borderRadius: 999,
    borderWidth: 0.7,
    borderColor: "rgba(163,230,53,0.28)",
  },
  innerOrbit: {
    position: "absolute",
    width: 146,
    height: 146,
    borderRadius: 999,
    borderWidth: 0.8,
    borderColor: "rgba(127,178,29,0.36)",
  },
  dot: {
    position: "absolute",
    left: 34,
    top: 7,
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(127,178,29,0.92)",
  },
  dotSecondary: {
    position: "absolute",
    bottom: 19,
    right: 19,
    width: 4,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(163,230,53,0.86)",
  },
  dotTertiary: {
    position: "absolute",
    right: 8,
    top: 38,
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(163,230,53,0.94)",
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
  compactOuterRing: {
    width: 104,
    height: 104,
  },
  compactInnerOrbit: {
    width: 78,
    height: 78,
  },
});
