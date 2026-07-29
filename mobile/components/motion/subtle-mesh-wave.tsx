import { memo, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { animationConfig } from "./animation-config";

type SubtleMeshWaveProps = {
  animated: boolean;
};

const TOP_WAVES = Array.from({ length: 12 }, (_, index) => {
  const y = 142 + index * 9;
  const lift = index * 2;
  return `M-90 ${y} C18 ${80 + lift} 118 ${250 - lift} 230 ${164 + lift} S430 ${98 + lift} 500 ${180 + lift}`;
});

const BOTTOM_WAVES = Array.from({ length: 12 }, (_, index) => {
  const y = 586 + index * 10;
  const lift = index * 2;
  return `M-95 ${y} C25 ${520 + lift} 132 ${716 - lift} 252 ${620 + lift} S438 ${548 + lift} 505 ${646 + lift}`;
});

const CROSS_WAVES = Array.from({ length: 7 }, (_, index) => {
  const y = 322 + index * 12;
  return `M-120 ${y} C20 ${270 + index * 4} 128 ${430 - index * 3} 246 ${344 + index * 4} S432 ${292 + index * 3} 520 ${370 + index * 4}`;
});

export const SubtleMeshWave = memo(function SubtleMeshWave({
  animated,
}: SubtleMeshWaveProps) {
  const primaryProgress = useSharedValue(0);
  const secondaryProgress = useSharedValue(1);

  useEffect(() => {
    if (!animated) {
      cancelAnimation(primaryProgress);
      cancelAnimation(secondaryProgress);
      primaryProgress.value = 0.35;
      secondaryProgress.value = 0.65;
      return;
    }

    primaryProgress.value = withRepeat(
      withTiming(1, {
        duration: animationConfig.mesh.duration,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
    secondaryProgress.value = withRepeat(
      withTiming(0, {
        duration: Math.round(animationConfig.mesh.duration * 1.18),
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );

    return () => {
      cancelAnimation(primaryProgress);
      cancelAnimation(secondaryProgress);
    };
  }, [animated, primaryProgress, secondaryProgress]);

  const primaryStyle = useAnimatedStyle(() => ({
    opacity: 0.78 + primaryProgress.value * 0.22,
    transform: [
      { translateX: -54 + primaryProgress.value * 108 },
      { translateY: -16 + primaryProgress.value * 38 },
      { rotate: `${-1.4 + primaryProgress.value * 2.8}deg` },
    ],
  }));

  const secondaryStyle = useAnimatedStyle(() => ({
    opacity: 0.42 + secondaryProgress.value * 0.26,
    transform: [
      { translateX: 44 - secondaryProgress.value * 88 },
      { translateY: 18 - secondaryProgress.value * 32 },
      { rotate: `${1.2 - secondaryProgress.value * 2.4}deg` },
    ],
  }));

  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={styles.container}
    >
      <Animated.View style={[StyleSheet.absoluteFill, primaryStyle]}>
        <Svg width="100%" height="100%" viewBox="0 0 390 780">
          {TOP_WAVES.map((path, index) => (
            <Path
              key={`top-${index}`}
              d={path}
              fill="none"
              stroke={`rgba(151, 214, 39, ${0.2 - index * 0.008})`}
              strokeWidth={index % 4 === 0 ? 1.15 : 0.72}
            />
          ))}
          {BOTTOM_WAVES.map((path, index) => (
            <Path
              key={`bottom-${index}`}
              d={path}
              fill="none"
              stroke={`rgba(127, 178, 29, ${0.18 - index * 0.007})`}
              strokeWidth={index % 4 === 0 ? 1.05 : 0.68}
            />
          ))}
        </Svg>
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, secondaryStyle]}>
        <Svg width="100%" height="100%" viewBox="0 0 390 780">
          {CROSS_WAVES.map((path, index) => (
            <Path
              key={`cross-${index}`}
              d={path}
              fill="none"
              stroke={`rgba(183, 236, 84, ${0.13 - index * 0.009})`}
              strokeWidth={index % 3 === 0 ? 0.95 : 0.62}
            />
          ))}
        </Svg>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
  },
});
