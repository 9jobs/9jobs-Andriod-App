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
import Svg, { Circle, Path, Ellipse, Defs, LinearGradient, Stop } from "react-native-svg";
import { colors } from "@/theme";
import { useReducedMotionPreference } from "./ReducedMotion";

// Ascending Space Dust/Sparks Component
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
          duration: 2400 + Math.random() * 800,
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
    
    // Smooth fade in/out
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
    const translateX = Math.sin(driftVal) * 3;
    const translateY = -Math.sin(driftVal) * 3;

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

      {/* Layer 0: Flat Orbital Ring - BACK HALF (Rendered behind the rocket body) */}
      <View style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%" viewBox="0 0 140 140" fill="none">
          {/* Inner back-arc */}
          <Path
            d="M 19 79 A 46 18 0 0 1 111 79"
            stroke={colors.accent}
            strokeWidth={1.2}
            opacity={0.8}
          />
          {/* Outer back-arc glow */}
          <Path
            d="M 19 79 A 46 18 0 0 1 111 79"
            stroke={colors.accent}
            strokeWidth={3.8}
            opacity={0.24}
          />
        </Svg>
      </View>

      {/* Background Particles (behind rocket) */}
      <SpaceDustParticle delay={0} xStart={45} xEnd={90} yStart={100} yEnd={10} size={5} />
      <SpaceDustParticle delay={400} xStart={60} xEnd={105} yStart={115} yEnd={25} size={3.8} />
      <SpaceDustParticle delay={900} xStart={20} xEnd={65} yStart={85} yEnd={5} size={4.2} />

      {/* Sleek Animated Rocket Graphic Wrapper */}
      <Animated.View style={[styles.rocketWrapper, rocketStyle]}>
        {/* Layer 1: Twin Thruster Flames (Rendered under nozzles & body) */}
        <Animated.View style={[StyleSheet.absoluteFill, flameStyle]}>
          <Svg width="100%" height="100%" viewBox="0 0 100 100" fill="none">
            <Defs>
              {/* Glowing vertical gradient for engine thrust plume */}
              <LinearGradient id="flameGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={colors.accent} stopOpacity={1} />
                <Stop offset="25%" stopColor={colors.accent} stopOpacity={0.8} />
                <Stop offset="70%" stopColor={colors.accent} stopOpacity={0.25} />
                <Stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
              </LinearGradient>
            </Defs>

            {/* Left Flame Plume */}
            <Path
              d="M 45 61 C 41 74, 38 85, 46.5 98 C 51.5 85, 49 74, 47.5 61 Z"
              fill="rgba(192, 255, 0, 0.12)"
            />
            <Path
              d="M 46 61 C 43.5 74, 41 85, 46.5 95 C 50.5 85, 48.5 74, 47 61 Z"
              fill="url(#flameGrad)"
            />
            <Path
              d="M 46.2 61 C 45 70, 44 78, 46.5 84 C 49 78, 47.5 70, 46.8 61 Z"
              fill="#FFFFFF"
              opacity={0.65}
            />

            {/* Right Flame Plume */}
            <Path
              d="M 52.5 61 C 51 74, 48.5 85, 53.5 98 C 59 85, 56 74, 55 61 Z"
              fill="rgba(192, 255, 0, 0.12)"
            />
            <Path
              d="M 53 61 C 51.5 74, 49.5 85, 53.5 95 C 57.5 85, 55.5 74, 54 61 Z"
              fill="url(#flameGrad)"
            />
            <Path
              d="M 53.2 61 C 52.5 70, 51.5 78, 53.5 84 C 55.5 78, 54.5 70, 53.8 61 Z"
              fill="#FFFFFF"
              opacity={0.65}
            />
          </Svg>
        </Animated.View>

        {/* Layer 2: Rocket Body structure and Window */}
        <View style={StyleSheet.absoluteFill}>
          <Svg width="100%" height="100%" viewBox="0 0 100 100" fill="none">
            <Defs>
              {/* High-fidelity 3D metallic gradient for capsule body */}
              <LinearGradient id="rocketBodyGrad" x1="0" y1="0" x2="1" y2="0.3">
                <Stop offset="0%" stopColor="#030C01" />
                <Stop offset="22%" stopColor={colors.accent} stopOpacity={0.85} />
                <Stop offset="50%" stopColor="#0B1C05" />
                <Stop offset="80%" stopColor="#020601" />
                <Stop offset="100%" stopColor="#000000" />
              </LinearGradient>

              {/* Glowing gradient for fins */}
              <LinearGradient id="finGrad" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0%" stopColor="rgba(163, 230, 53, 0.08)" />
                <Stop offset="50%" stopColor="rgba(163, 230, 53, 0.3)" />
                <Stop offset="100%" stopColor="rgba(163, 230, 53, 0.04)" />
              </LinearGradient>
            </Defs>

            {/* Left Fin - Sleek Swept Wing shape */}
            <Path
              d="M 41 38 C 34 40, 27 46, 27 58 C 32 60, 37 57, 41 50 Z"
              stroke={colors.accent}
              strokeWidth={3}
              opacity={0.16}
            />
            <Path
              d="M 41 38 C 34 40, 27 46, 27 58 C 32 60, 37 57, 41 50 Z"
              fill="url(#finGrad)"
              stroke={colors.accent}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Right Fin - Sleek Swept Wing shape */}
            <Path
              d="M 59 38 C 66 40, 73 46, 73 58 C 68 60, 63 57, 59 50 Z"
              stroke={colors.accent}
              strokeWidth={3}
              opacity={0.16}
            />
            <Path
              d="M 59 38 C 66 40, 73 46, 73 58 C 68 60, 63 57, 59 50 Z"
              fill="url(#finGrad)"
              stroke={colors.accent}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Main Rocket Body capsule - 3D Convex Swell */}
            <Path
              d="M 41 52 C 41 38, 43 20, 50 10 C 57 20, 59 38, 59 52 Z"
              stroke={colors.accent}
              strokeWidth={4.5}
              opacity={0.24}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M 41 52 C 41 38, 43 20, 50 10 C 57 20, 59 38, 59 52 Z"
              fill="url(#rocketBodyGrad)"
              stroke="#FFFFFF"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Double Nosecone divider rings */}
            <Path
              d="M 42.8 25.5 C 45 28, 55 28, 57.2 25.5"
              stroke="#FFFFFF"
              strokeWidth={1.2}
              opacity={0.8}
            />
            <Path
              d="M 43.5 23.5 C 45.5 26, 54.5 26, 56.5 23.5"
              stroke="#FFFFFF"
              strokeWidth={1.2}
              opacity={0.8}
            />

            {/* Center Fin (runs along middle of lower capsule) */}
            <Path
              d="M 50 38 C 50 44, 48 48, 48 52 C 51 48, 50 44, 50 38 Z"
              fill="url(#rocketBodyGrad)"
              stroke={colors.accent}
              strokeWidth={1.2}
            />

            {/* Dark Ribbed Nozzle Mount base */}
            <Path
              d="M 43 52 L 57 52 L 55 58 L 45 58 Z"
              fill="#121410"
              stroke={colors.accent}
              strokeWidth={1}
            />
            <Path d="M 44.5 54 L 55.5 54" stroke="rgba(255, 255, 255, 0.45)" strokeWidth={0.8} />
            <Path d="M 44 56 L 56 56" stroke="rgba(255, 255, 255, 0.45)" strokeWidth={0.8} />

            {/* Dual Engine Nozzles */}
            <Path
              d="M 45.5 58 L 48.5 58 L 47.8 61 L 46.2 61 Z"
              fill="#1F221B"
              stroke={colors.accent}
              strokeWidth={0.8}
            />
            <Path
              d="M 51.5 58 L 54.5 58 L 53.8 61 L 52.2 61 Z"
              fill="#1F221B"
              stroke={colors.accent}
              strokeWidth={0.8}
            />

            {/* 3D Specular Highlight Overlays along curves */}
            <Path
              d="M 41 52 C 41 38, 43 20, 50 10"
              stroke="#FFFFFF"
              strokeWidth={1}
              opacity={0.5}
              fill="none"
            />
            <Path
              d="M 50 10 C 57 20, 59 38, 59 52"
              stroke="rgba(192, 255, 0, 0.4)"
              strokeWidth={0.8}
              fill="none"
            />

            {/* Beveled 3D Concentric Window Ring */}
            <Circle
              cx="50"
              cy="34"
              r="6.5"
              stroke={colors.accent}
              strokeWidth={1.8}
              fill="rgba(192, 255, 0, 0.1)"
            />
            <Circle
              cx="50"
              cy="34"
              r="4.5"
              stroke="#FFFFFF"
              strokeWidth={1}
              fill="rgba(192, 255, 0, 0.35)"
            />
            <Circle
              cx="48.5"
              cy="32.5"
              r="0.8"
              fill="#FFFFFF"
              opacity={0.85}
            />
          </Svg>
        </View>
      </Animated.View>

      {/* Layer 3: Flat Orbital Ring - FRONT HALF (Rendered in front of the rocket body to create full 3D overlap) */}
      <View style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%" viewBox="0 0 140 140" fill="none">
          {/* Inner front-arc */}
          <Path
            d="M 111 79 A 46 18 0 0 1 19 79"
            stroke={colors.accent}
            strokeWidth={1.2}
            opacity={0.8}
          />
          {/* Outer front-arc glow */}
          <Path
            d="M 111 79 A 46 18 0 0 1 19 79"
            stroke={colors.accent}
            strokeWidth={3.8}
            opacity={0.24}
          />
        </Svg>
      </View>

      {/* Foreground Particles (in front of rocket) */}
      <SpaceDustParticle delay={600} xStart={35} xEnd={80} yStart={105} yEnd={20} size={3.2} />
      <SpaceDustParticle delay={1200} xStart={50} xEnd={95} yStart={120} yEnd={35} size={4.5} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: -8,
    top: 6,
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    elevation: 5,
  },
  glow: {
    position: "absolute",
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: "rgba(163, 230, 53, 0.14)",
    shadowColor: colors.accent,
    shadowOpacity: 0.45,
    shadowRadius: 28,
  },
  rocketWrapper: {
    width: 130,
    height: 130,
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
