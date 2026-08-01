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

      {/* Horizontal Delicate Orbital Ring (Horizontally aligned behind the rocket for 3D depth) */}
      <View style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%" viewBox="0 0 140 140" fill="none">
          {/* Inner ring */}
          <Ellipse
            cx="65"
            cy="79"
            rx="46"
            ry="18"
            stroke={colors.accent}
            strokeWidth={1.2}
            opacity={0.8}
          />
          {/* Outer glow ring */}
          <Ellipse
            cx="65"
            cy="79"
            rx="46"
            ry="18"
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
        {/* Layer 1: Thruster Flame (Rendered under nozzle & body) */}
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

            {/* Layer 1.1: Soft outer glow of the flame */}
            <Path
              d="M 46.5 59 C 41.5 74, 37.5 85, 50 100 C 62.5 85, 58.5 74, 53.5 59 Z"
              fill="rgba(192, 255, 0, 0.15)"
            />
            {/* Layer 1.2: Main gradient flame */}
            <Path
              d="M 48 59 C 45 74, 42.5 85, 50 95 C 57.5 85, 55 74, 52 59 Z"
              fill="url(#flameGrad)"
            />
            {/* Layer 1.3: Inner hot white core */}
            <Path
              d="M 49 59 C 47.8 70, 46.5 78, 50 84 C 53.5 78, 52.2 70, 51 59 Z"
              fill="#FFFFFF"
              opacity={0.65}
            />
          </Svg>
        </Animated.View>

        {/* Layer 2: Rocket Body structure and Window */}
        <View style={StyleSheet.absoluteFill}>
          <Svg width="100%" height="100%" viewBox="0 0 100 100" fill="none">
            <Defs>
              {/* Dark metallic gradient for capsule body with high-contrast reflection */}
              <LinearGradient id="rocketBodyGrad" x1="0" y1="0" x2="1" y2="0.3">
                <Stop offset="0%" stopColor="#051003" />
                <Stop offset="18%" stopColor={colors.accent} stopOpacity={0.9} />
                <Stop offset="50%" stopColor="#102608" />
                <Stop offset="82%" stopColor="#040A02" />
                <Stop offset="100%" stopColor="#010300" />
              </LinearGradient>

              {/* Glowing gradient for fins */}
              <LinearGradient id="finGrad" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0%" stopColor="rgba(163, 230, 53, 0.08)" />
                <Stop offset="50%" stopColor="rgba(163, 230, 53, 0.3)" />
                <Stop offset="100%" stopColor="rgba(163, 230, 53, 0.04)" />
              </LinearGradient>
            </Defs>

            {/* Engine Nozzle */}
            <Path
              d="M 47 54 L 53 54 L 52 58 L 48 58 Z"
              fill="#121410"
              stroke={colors.accent}
              strokeWidth={1}
            />

            {/* Left Fin - Sleek Swept Wing shape */}
            <Path
              d="M 41 38 C 34 40, 28 46, 28 58 C 28 66, 36 64, 40 54 Z"
              stroke={colors.accent}
              strokeWidth={3}
              opacity={0.16}
            />
            <Path
              d="M 41 38 C 34 40, 28 46, 28 58 C 28 66, 36 64, 40 54 Z"
              fill="url(#finGrad)"
              stroke={colors.accent}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Right Fin - Sleek Swept Wing shape */}
            <Path
              d="M 59 38 C 66 40, 72 46, 72 58 C 72 66, 64 64, 60 54 Z"
              stroke={colors.accent}
              strokeWidth={3}
              opacity={0.16}
            />
            <Path
              d="M 59 38 C 66 40, 72 46, 72 58 C 72 66, 64 64, 60 54 Z"
              fill="url(#finGrad)"
              stroke={colors.accent}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Main Rocket Body capsule - 3D Convex Swell and Rounded Dome Nosecone */}
            <Path
              d="M 43 54 C 41 44, 38 32, 50 12 C 62 32, 59 44, 57 54 Z"
              stroke={colors.accent}
              strokeWidth={4.5}
              opacity={0.24}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M 43 54 C 41 44, 38 32, 50 12 C 62 32, 59 44, 57 54 Z"
              fill="url(#rocketBodyGrad)"
              stroke="#FFFFFF"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Nosecone separator line */}
            <Path
              d="M 42.8 25 C 45 28, 55 28, 57.2 25"
              stroke="#FFFFFF"
              strokeWidth={1.2}
              opacity={0.8}
            />

            {/* Clean Neon Glowing Porthole Ring (Hollow Circle as in reference) */}
            <Circle
              cx="50"
              cy="34"
              r="5.5"
              stroke={colors.accent}
              strokeWidth={2.2}
              fill="none"
            />
          </Svg>
        </View>
      </Animated.View>

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
