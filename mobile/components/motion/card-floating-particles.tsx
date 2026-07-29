import { memo, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { colors } from "@/theme";
import { useReducedMotionPreference } from "./ReducedMotion";
import { animationConfig } from "./animation-config";

const CARD_PARTICLES = [
  { left: "7%", top: "72%", size: 4, dx: 22, dy: -58, duration: 4_300, delay: 0 },
  { left: "19%", top: "25%", size: 5, dx: -18, dy: -48, duration: 5_200, delay: 500 },
  { left: "38%", top: "84%", size: 3, dx: 16, dy: -66, duration: 4_700, delay: 900 },
  { left: "56%", top: "54%", size: 6, dx: -24, dy: -54, duration: 5_600, delay: 200 },
  { left: "71%", top: "78%", size: 4, dx: 20, dy: -64, duration: 4_900, delay: 700 },
  { left: "84%", top: "34%", size: 5, dx: -16, dy: -50, duration: 5_400, delay: 1_100 },
  { left: "94%", top: "88%", size: 3, dx: -20, dy: -70, duration: 4_500, delay: 350 },
] as const;

export const CardFloatingParticles = memo(function CardFloatingParticles({
  count = 7,
}: {
  count?: number;
}) {
  const reducedMotion = useReducedMotionPreference();

  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      {CARD_PARTICLES.slice(0, count).map((particle, index) => (
        <CardParticle
          key={`${particle.left}-${particle.top}`}
          {...particle}
          animated={!reducedMotion}
          index={index}
        />
      ))}
    </View>
  );
});

function CardParticle({
  animated,
  delay,
  duration,
  dx,
  dy,
  index,
  left,
  size,
  top,
}: (typeof CARD_PARTICLES)[number] & { animated: boolean; index: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!animated) {
      cancelAnimation(progress);
      progress.value = 0.35;
      return;
    }

    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration, easing: Easing.linear }),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(progress);
  }, [animated, delay, duration, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const cycle = progress.value;
    const fade = Math.sin(cycle * Math.PI);
    return {
      opacity:
        animationConfig.particles.cardOpacity +
        fade *
          (animationConfig.particles.cardOpacityPeak -
            animationConfig.particles.cardOpacity),
      transform: [
        { translateX: dx * cycle },
        { translateY: dy * cycle },
        { scale: 0.82 + fade * 0.34 },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          backgroundColor: index % 4 === 0 ? "#D8FF78" : colors.accent,
          height: size,
          left,
          top,
          width: size,
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
    shadowColor: colors.accent,
    shadowOpacity: 0.72,
    shadowRadius: 8,
  },
});
