import { useCallback, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { useFocusEffect } from "expo-router";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { colors } from "@/theme";
import { useReducedMotionPreference } from "@/components/motion/ReducedMotion";

// Thin, tapered ribbons leave the centre of the splash quiet and readable.
const ribbon = "M-60 252C118 250 210 219 339 144S541 44 700 55L700 80C542 65 469 94 346 162S125 262-60 264Z";
const crest = "M-60 252C118 250 210 219 339 144S541 44 700 55";
const trailingRibbon = "M-60 183C122 172 232 262 397 209S551 128 700 143L700 150C551 139 507 182 400 220S120 186-60 190Z";
const motes = Array.from({ length: 22 }, (_, index) => ({
  x: 28 + index * 28,
  y: 216 - Math.sin(index / 21 * Math.PI / 2) * 128 + Math.sin(index * 2.3) * 13,
  radius: index % 7 === 0 ? 1.15 : 0.55,
  opacity: index % 7 === 0 ? 0.65 : 0.22,
}));

export function SplashWaves({ position }: { position: "top" | "bottom" }) {
  const reducedMotion = useReducedMotionPreference();
  const drift = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const isTop = position === "top";
  const fillId = `splash-wave-fill-${position}`;
  const silkId = `splash-wave-silk-${position}`;
  const edgeId = `splash-wave-edge-${position}`;

  useFocusEffect(useCallback(() => {
    if (reducedMotion) return;
    const oscillate = (value: Animated.Value, duration: number) => Animated.loop(Animated.sequence([
      Animated.timing(value, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(value, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
    ]));
    const motion = oscillate(drift, isTop ? 2400 : 3000);
    const glow = oscillate(shimmer, isTop ? 1800 : 2300);
    motion.start();
    glow.start();
    return () => { motion.stop(); glow.stop(); };
  }, [drift, shimmer, reducedMotion, isTop]));

  return (
    <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={[styles.viewport, isTop ? styles.top : styles.bottom]}>
      <View style={[styles.field, isTop && styles.flipped]}>
        <Animated.View style={[StyleSheet.absoluteFill, {
          opacity: shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }),
          transform: [
            { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [-24, 24] }) },
            { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [8, -12] }) },
            { scaleY: drift.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.09] }) },
          ],
        }]}>
          <Svg width="100%" height="100%" viewBox="0 0 640 260" preserveAspectRatio="none">
            <Defs>
              <LinearGradient id={fillId} x1="0%" y1="100%" x2="100%" y2="0%">
                <Stop offset="0" stopColor={colors.accent} stopOpacity={0} />
                <Stop offset="0.34" stopColor={colors.accent} stopOpacity={0.16} />
                <Stop offset="0.65" stopColor={colors.accent} stopOpacity={0.65} />
                <Stop offset="1" stopColor={colors.accent} stopOpacity={0.06} />
              </LinearGradient>
              <LinearGradient id={silkId} x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0" stopColor={colors.accent} stopOpacity={0.02} />
                <Stop offset="0.48" stopColor={colors.accent} stopOpacity={0.22} />
                <Stop offset="1" stopColor={colors.accent} stopOpacity={0.02} />
              </LinearGradient>
              <LinearGradient id={edgeId} x1="0%" y1="100%" x2="100%" y2="0%">
                <Stop offset="0" stopColor={colors.accent} stopOpacity={0} />
                <Stop offset="0.35" stopColor={colors.accent} stopOpacity={0.2} />
                <Stop offset="0.62" stopColor={colors.accent} stopOpacity={0.95} />
                <Stop offset="0.8" stopColor={colors.accent} stopOpacity={0.55} />
                <Stop offset="1" stopColor={colors.accent} stopOpacity={0.03} />
              </LinearGradient>
            </Defs>
            <Path d={ribbon} fill={`url(#${fillId})`} />
            {/* Closely spaced low-opacity strokes soften the crest without a large radial glow. */}
            {[12, 8, 5, 3].map((strokeWidth) => (
              <Path key={strokeWidth} d={crest} fill="none" stroke={`url(#${edgeId})`} strokeWidth={strokeWidth} strokeOpacity={0.025} />
            ))}
            <Path d={crest} fill="none" stroke={`url(#${edgeId})`} strokeWidth={0.85} />
            <Path d={trailingRibbon} fill={`url(#${silkId})`} />
          </Svg>
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, {
          opacity: shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.7] }),
          transform: [
            { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [22, -22] }) },
            { translateY: shimmer.interpolate({ inputRange: [0, 1], outputRange: [-10, 10] }) },
          ],
        }]}>
          <Svg width="100%" height="100%" viewBox="0 0 640 260" preserveAspectRatio="none">
            {motes.map((mote, index) => (
              <Circle key={index} cx={mote.x} cy={mote.y} r={mote.radius} fill={colors.accent} opacity={mote.opacity} />
            ))}
          </Svg>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: { position: "absolute", left: 0, right: 0, height: "22%", overflow: "hidden" },
  top: { top: 0 },
  bottom: { bottom: 0 },
  field: { position: "absolute", top: -12, bottom: -12, left: "-12%", right: "-12%" },
  flipped: { transform: [{ rotate: "180deg" }] },
});
