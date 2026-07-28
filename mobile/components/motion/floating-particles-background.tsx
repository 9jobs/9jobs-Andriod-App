import { memo, useEffect } from "react";
import { StyleSheet, View } from "react-native";
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

const PARTICLES = [
  { left: "8%", top: "13%", size: 2, depth: 0.7, delay: 0 },
  { left: "22%", top: "72%", size: 3, depth: 1, delay: 900 },
  { left: "37%", top: "31%", size: 2, depth: 0.6, delay: 1600 },
  { left: "51%", top: "84%", size: 2, depth: 0.8, delay: 400 },
  { left: "64%", top: "18%", size: 3, depth: 1, delay: 2100 },
  { left: "76%", top: "58%", size: 2, depth: 0.65, delay: 1200 },
  { left: "88%", top: "27%", size: 2, depth: 0.85, delay: 2600 },
  { left: "93%", top: "79%", size: 3, depth: 0.7, delay: 600 },
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
        {PARTICLES.slice(0, minimal ? 4 : animationConfig.particles.count).map(
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

    progress.value = withRepeat(
      withTiming(1, {
        duration: animationConfig.particles.duration + delay,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );

    return () => cancelAnimation(progress);
  }, [animated, delay, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.08 + progress.value * 0.1 * depth,
    transform: [
      { translateX: progress.value * (index % 2 === 0 ? 5 : -5) * depth },
      { translateY: progress.value * -12 * depth },
      { scale: 0.9 + progress.value * 0.18 },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        { height: size, left, top, width: size },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  particle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.18,
    shadowRadius: 3,
  },
});
