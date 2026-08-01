import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";
import { colors } from "@/theme";
import { useReducedMotionPreference } from "./ReducedMotion";

export function RocketLaunchGlow() {
  const isReducedMotion = useReducedMotionPreference();
  const rotation = useSharedValue(0);
  const pulse = useSharedValue(0);
  const flamePulse = useSharedValue(0);

  useEffect(() => {
    if (isReducedMotion) {
      rotation.value = 45;
      pulse.value = 0.5;
      flamePulse.value = 0.5;
      return;
    }

    rotation.value = withRepeat(
      withTiming(360, {
        duration: 4500,
        easing: Easing.linear,
      }),
      -1,
      false
    );

    pulse.value = withRepeat(
      withTiming(1, {
        duration: 2000,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true
    );

    flamePulse.value = withRepeat(
      withTiming(1, {
        duration: 600,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );

    return () => {
      cancelAnimation(rotation);
      cancelAnimation(pulse);
      cancelAnimation(flamePulse);
    };
  }, [isReducedMotion, rotation, pulse, flamePulse]);

  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const reverseOrbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-rotation.value * 0.8}deg` }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + pulse.value * 0.25,
    transform: [{ scale: 0.95 + pulse.value * 0.1 }],
  }));

  const flameStyle = useAnimatedStyle(() => ({
    opacity: 0.7 + flamePulse.value * 0.3,
    transform: [
      { translateY: 1.5 - flamePulse.value * 3 },
      { scaleY: 0.85 + flamePulse.value * 0.3 }
    ],
  }));

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Background Glow */}
      <Animated.View style={[styles.glow, glowStyle]} />

      {/* Main Orbit Ring */}
      <View style={styles.orbitRing} />

      {/* Orbiting Dots */}
      <Animated.View style={[StyleSheet.absoluteFill, orbitStyle]}>
        <View style={styles.orbitDot} />
        <View style={styles.orbitDotSecondary} />
      </Animated.View>

      {/* Inner Orbiting Dot (Reverse Direction) */}
      <Animated.View style={[StyleSheet.absoluteFill, reverseOrbitStyle]}>
        <View style={styles.orbitDotTertiary} />
      </Animated.View>

      {/* Rocket Graphic wrapper */}
      <View style={styles.rocketWrapper}>
        {/* Animated Thrust Plume (Rendered underneath the rocket body) */}
        <Animated.View style={[styles.flameContainer, flameStyle]}>
          <Svg width={46} height={46} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 16.5v4.5M10.5 17v3M13.5 17v3"
              stroke={colors.accent}
              strokeWidth={1.8}
              strokeLinecap="round"
            />
          </Svg>
        </Animated.View>

        {/* Rocket Body */}
        <View style={styles.rocketBodyContainer}>
          <Svg width={46} height={46} viewBox="0 0 24 24" fill="none">
            {/* Engine Connector */}
            <Path
              d="M10.5 15.5h3"
              stroke={colors.border}
              strokeWidth={1.5}
              strokeLinecap="round"
            />

            {/* Left/Right Fins */}
            <Path
              d="M8.5 13.5c-1 0.8-2 2-2 3v1h3.5"
              stroke={colors.accent}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M15.5 13.5c1 0.8 2 2 2 3v1h-3.5"
              stroke={colors.accent}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Rocket Body Outline */}
            <Path
              d="M12 3c-2.5 3-3.5 6.5-3.5 11h7c0-4.5-1-8-3.5-11z"
              stroke="#FFFFFF"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="rgba(255,255,255,0.06)"
            />

            {/* Porthole */}
            <Circle cx="12" cy="8.5" r="1.5" stroke={colors.accent} strokeWidth={1.5} />
          </Svg>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 22,
    top: 22,
    width: 86,
    height: 86,
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "rgba(163, 230, 53, 0.28)",
    shadowColor: colors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 18,
  },
  orbitRing: {
    position: "absolute",
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 0.8,
    borderColor: "rgba(163, 230, 53, 0.22)",
    borderStyle: "dashed",
  },
  orbitDot: {
    position: "absolute",
    top: 2,
    left: 37,
    width: 4.5,
    height: 4.5,
    borderRadius: 2.25,
    backgroundColor: "rgba(163, 230, 53, 0.95)",
  },
  orbitDotSecondary: {
    position: "absolute",
    bottom: 8,
    right: 14,
    width: 3.5,
    height: 3.5,
    borderRadius: 1.75,
    backgroundColor: "rgba(163, 230, 53, 0.75)",
  },
  orbitDotTertiary: {
    position: "absolute",
    top: 20,
    right: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
  },
  rocketWrapper: {
    width: 46,
    height: 46,
    transform: [{ rotate: "45deg" }],
  },
  flameContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 46,
    height: 46,
  },
  rocketBodyContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 46,
    height: 46,
  },
});
