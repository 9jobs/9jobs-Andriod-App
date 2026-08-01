import React, { memo, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Path, Ellipse } from "react-native-svg";
import { colors } from "@/theme";
import { useReducedMotionPreference } from "./ReducedMotion";

// Ascending Space Dust/Sparks Component using primitive coordinates for maximum stability
function SpaceDustParticle({
  delay,
  xStart,
  xEnd,
  yStart,
  yEnd,
  size,
}: {
  delay: number;
  xStart: number;
  xEnd: number;
  yStart: number;
  yEnd: number;
  size: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    const timeout = setTimeout(() => {
      progress.value = withRepeat(
        withTiming(1, {
          duration: 2200 + Math.random() * 800,
          easing: Easing.out(Easing.quad),
        }),
        -1,
        false
      );
    }, delay);

    return () => {
      clearTimeout(timeout);
      cancelAnimation(progress);
    };
  }, [delay, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const x = xStart + progress.value * (xEnd - xStart);
    const y = yStart + progress.value * (yEnd - yStart);
    
    // Smooth fade-in at start, fade-out at end
    const opacity = progress.value < 0.15
      ? (progress.value / 0.15) * 0.85
      : progress.value > 0.8
        ? ((1 - progress.value) / 0.2) * 0.85
        : 0.85;

    const scale = 0.4 + (1 - progress.value) * 0.6;

    return {
      transform: [{ translateX: x }, { translateY: y }, { scale }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        animatedStyle,
      ]}
    />
  );
}

export function RocketLaunchGlow() {
  const isReducedMotion = useReducedMotionPreference();
  const drift = useSharedValue(0);
  const flamePulse = useSharedValue(0);
  const glowPulse = useSharedValue(0);

  useEffect(() => {
    if (isReducedMotion) {
      drift.value = 0.5;
      flamePulse.value = 0.5;
      glowPulse.value = 0.5;
      return;
    }

    // Slow, smooth drifting motion along the diagonal launch axis
    drift.value = withRepeat(
      withTiming(1, {
        duration: 3200,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true
    );

    // Dynamic, high-frequency flame thruster pulse
    flamePulse.value = withRepeat(
      withTiming(1, {
        duration: 180,
        easing: Easing.inOut(Easing.linear),
      }),
      -1,
      true
    );

    // Softer background glow pulse
    glowPulse.value = withRepeat(
      withTiming(1, {
        duration: 2000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );

    return () => {
      cancelAnimation(drift);
      cancelAnimation(flamePulse);
      cancelAnimation(glowPulse);
    };
  }, [isReducedMotion, drift, flamePulse, glowPulse]);

  // Main rocket & flame translation style
  const rocketStyle = useAnimatedStyle(() => {
    if (isReducedMotion) {
      return {
        transform: [{ rotate: "45deg" }],
      };
    }

    const driftVal = drift.value * Math.PI * 2;
    // Micro-translation along 45deg axis
    const translateX = Math.sin(driftVal) * 2.5;
    const translateY = -Math.sin(driftVal) * 2.5;

    return {
      transform: [
        { translateX },
        { translateY },
        { rotate: "45deg" },
      ],
    };
  });

  // Background glow scaling
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.28 + glowPulse.value * 0.14,
    transform: [{ scale: 0.94 + glowPulse.value * 0.12 }],
  }));

  // Flame thruster scaling/flicker
  const flameStyle = useAnimatedStyle(() => {
    if (isReducedMotion) {
      return { opacity: 0.85, transform: [{ scaleY: 1 }] };
    }
    const scaleY = 0.92 + flamePulse.value * 0.16;
    const opacity = 0.78 + (1 - flamePulse.value) * 0.22;
    return {
      opacity,
      transform: [{ scaleY }],
    };
  });

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Background Soft Neon Glow */}
      <Animated.View style={[styles.glow, glowStyle]} />

      {/* Background Particles (behind rocket) */}
      <SpaceDustParticle delay={0} xStart={30} xEnd={60} yStart={70} yEnd={10} size={4.5} />
      <SpaceDustParticle delay={400} xStart={40} xEnd={75} yStart={85} yEnd={20} size={3.5} />
      <SpaceDustParticle delay={900} xStart={15} xEnd={45} yStart={65} yEnd={5} size={4} />

      {/* Sleek Animated Rocket Graphic Wrapper */}
      <Animated.View style={[styles.rocketWrapper, rocketStyle]}>
        {/* Layer 1: Thruster Flame (Rendered under nozzle & body) */}
        <Animated.View style={[StyleSheet.absoluteFill, flameStyle]}>
          <Svg width="100%" height="100%" viewBox="0 0 100 100" fill="none">
            {/* Multi-layered vector shape to construct a neon glowing flame plume */}
            {/* Outer soft glowing flame boundary */}
            <Path
              d="M 46.5 59 C 41.5 74, 37.5 85, 50 100 C 62.5 85, 58.5 74, 53.5 59 Z"
              fill="rgba(192, 255, 0, 0.15)"
            />
            {/* Medium intense flame boundary */}
            <Path
              d="M 48 59 C 45 74, 42.5 85, 50 92 C 57.5 85, 55 74, 52 59 Z"
              fill="rgba(192, 255, 0, 0.45)"
            />
            {/* Inner hot core flame */}
            <Path
              d="M 49 59 C 47.5 74, 45.5 82, 50 85 C 54.5 82, 52.5 74, 51 59 Z"
              fill={colors.accent}
            />
          </Svg>
        </Animated.View>

        {/* Layer 2: Rocket Body structure and Orbital Ring */}
        <View style={StyleSheet.absoluteFill}>
          <Svg width="100%" height="100%" viewBox="0 0 100 100" fill="none">
            {/* Base Orbital Ring (Outer Glow and Ring) */}
            <Ellipse
              cx="50"
              cy="58"
              rx="23"
              ry="7"
              stroke={colors.accent}
              strokeWidth={4.5}
              opacity={0.16}
            />
            <Ellipse
              cx="50"
              cy="58"
              rx="23"
              ry="7"
              stroke={colors.accent}
              strokeWidth={1.5}
              opacity={0.72}
            />

            {/* Engine Nozzle */}
            <Path
              d="M 46.5 56.5 L 53.5 56.5 L 52 60 L 48 60 Z"
              fill="#1E201C"
              stroke={colors.accent}
              strokeWidth={1}
            />

            {/* Left Fin */}
            <Path
              d="M 39 44 C 31.5 48.5, 27.5 54, 27.5 66 C 33 66, 37 62.5, 39 56 Z"
              fill="rgba(163, 230, 53, 0.12)"
              stroke={colors.accent}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Right Fin */}
            <Path
              d="M 61 44 C 68.5 48.5, 72.5 54, 72.5 66 C 67 66, 63 62.5, 61 56 Z"
              fill="rgba(163, 230, 53, 0.12)"
              stroke={colors.accent}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Main Rocket Body capsule */}
            <Path
              d="M 50 10 C 44 23, 39 37, 39 56 Q 50 60 61 56 C 61 37, 56 23, 50 10 Z"
              fill="rgba(163, 230, 53, 0.08)"
              stroke="#FFFFFF"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Capsule Panel Lines */}
            <Path
              d="M 41.5 28 Q 50 32 58.5 28"
              stroke="#FFFFFF"
              strokeWidth={1.2}
              opacity={0.85}
            />
            <Path
              d="M 50 43 L 50 56.5"
              stroke="rgba(255, 255, 255, 0.45)"
              strokeWidth={1}
            />

            {/* Glowing Porthole Window */}
            <Circle
              cx="50"
              cy="35"
              r="4.2"
              fill="rgba(163, 230, 53, 0.25)"
              stroke={colors.accent}
              strokeWidth={1.5}
            />
          </Svg>
        </View>
      </Animated.View>

      {/* Foreground Particles (in front of rocket) */}
      <SpaceDustParticle delay={600} xStart={25} xEnd={55} yStart={75} yEnd={15} size={3} />
      <SpaceDustParticle delay={1200} xStart={45} xEnd={80} yStart={90} yEnd={30} size={4} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 18,
    top: 18,
    width: 90,
    height: 90,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    elevation: 5,
  },
  glow: {
    position: "absolute",
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(163, 230, 53, 0.16)",
    shadowColor: colors.accent,
    shadowOpacity: 0.45,
    shadowRadius: 20,
  },
  rocketWrapper: {
    width: 82,
    height: 82,
    justifyContent: "center",
    alignItems: "center",
  },
  particle: {
    position: "absolute",
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.85,
    shadowRadius: 5,
  },
});
