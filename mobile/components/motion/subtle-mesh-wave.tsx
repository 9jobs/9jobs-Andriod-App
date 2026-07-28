import { memo, useEffect } from "react";
import { StyleSheet } from "react-native";
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

export const SubtleMeshWave = memo(function SubtleMeshWave({
  animated,
}: SubtleMeshWaveProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!animated) {
      cancelAnimation(progress);
      progress.value = 0;
      return;
    }

    progress.value = withRepeat(
      withTiming(1, {
        duration: animationConfig.mesh.duration,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );

    return () => cancelAnimation(progress);
  }, [animated, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.32 + progress.value * 0.16,
    transform: [
      { translateX: -8 + progress.value * 16 },
      { translateY: progress.value * 6 },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.container, animatedStyle]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 390 780">
        <Path
          d="M-40 180 C70 115 145 245 250 178 S430 120 470 185"
          fill="none"
          stroke="rgba(163,230,53,0.10)"
          strokeWidth={0.8}
        />
        <Path
          d="M-30 225 C75 160 160 285 265 220 S420 165 455 225"
          fill="none"
          stroke="rgba(163,230,53,0.07)"
          strokeWidth={0.7}
        />
        <Path
          d="M-55 645 C65 575 150 705 265 632 S430 585 470 650"
          fill="none"
          stroke="rgba(163,230,53,0.06)"
          strokeWidth={0.7}
        />
      </Svg>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
  },
});
