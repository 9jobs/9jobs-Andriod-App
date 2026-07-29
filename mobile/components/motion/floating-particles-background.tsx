import { memo, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { colors } from "@/theme";
import { animationConfig } from "./animation-config";

const PARTICLES = [
  { left: "4%", top: "11%", size: 4, depth: 0.7, delay: 0 },
  { left: "9%", top: "43%", size: 6, depth: 1, delay: 900 },
  { left: "14%", top: "78%", size: 4, depth: 0.75, delay: 1600 },
  { left: "25%", top: "24%", size: 3, depth: 0.6, delay: 400 },
  { left: "34%", top: "68%", size: 7, depth: 1, delay: 2100 },
  { left: "46%", top: "8%", size: 4, depth: 0.8, delay: 1200 },
  { left: "55%", top: "89%", size: 5, depth: 0.9, delay: 2600 },
  { left: "65%", top: "19%", size: 3, depth: 0.65, delay: 600 },
  { left: "72%", top: "74%", size: 5, depth: 0.85, delay: 1900 },
  { left: "82%", top: "38%", size: 4, depth: 1, delay: 300 },
  { left: "88%", top: "63%", size: 7, depth: 0.75, delay: 2300 },
  { left: "94%", top: "16%", size: 4, depth: 0.8, delay: 1300 },
  { left: "96%", top: "49%", size: 3, depth: 0.65, delay: 700 },
  { left: "91%", top: "87%", size: 5, depth: 0.9, delay: 2800 },
] as const;

type FloatingParticlesBackgroundProps = {
  animated: boolean;
  minimal?: boolean;
};

export const FloatingParticlesBackground = memo(
  function FloatingParticlesBackground({
    animated,
    minimal = false,
  }: FloatingParticlesBackgroundProps) {
    return (
      <View
        pointerEvents="none"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={StyleSheet.absoluteFill}
      >
        {PARTICLES.slice(0, minimal ? 6 : animationConfig.particles.count).map(
          (particle, index) => (
            <Particle
              key={`${particle.left}-${particle.top}`}
              animated={animated}
              index={index}
              {...particle}
            />
          ),
        )}
      </View>
    );
  },
);

function Particle({
  animated,
  delay,
  depth,
  index,
  left,
  size,
  top,
}: (typeof PARTICLES)[number] & { animated: boolean; index: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!animated) {
      cancelAnimation(progress);
      progress.value = 0;
      return;
    }

    const halfDuration = (animationConfig.particles.duration + delay) / 2;
    progress.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: halfDuration,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(0, {
          duration: halfDuration,
          easing: Easing.inOut(Easing.sin),
        }),
      ),
      -1,
      false,
    );

    return () => cancelAnimation(progress);
  }, [animated, delay, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.18 + Math.sin(progress.value * Math.PI) * 0.18 * depth,
    transform: [
      { translateX: progress.value * (index % 2 === 0 ? 18 : -18) * depth },
      { translateY: progress.value * -42 * depth },
      { scale: 0.86 + progress.value * 0.28 },
    ],
  }));

  const isDark = colors.background === "#000000" || colors.background === "#090A08";
  const isWhiteParticle = index % 3 === 0;
  const particleColor = isWhiteParticle
    ? (isDark ? "#FFFFFF" : "#8B8F82")
    : colors.accent;

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          height: size,
          left,
          top,
          width: size,
          backgroundColor: particleColor,
          shadowColor: particleColor,
        },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  particle: {
    position: "absolute",
    borderRadius: 999,
    shadowOpacity: 0.28,
    shadowRadius: 4,
  },
});
