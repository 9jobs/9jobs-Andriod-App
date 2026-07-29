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
    opacity: 0.9 + progress.value * 0.1,
    transform: [
      { translateX: -42 + progress.value * 96 },
      { translateY: -12 + progress.value * 34 },
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
          stroke="rgba(127,178,29,0.22)"
          strokeWidth={1.15}
        />
        <Path
          d="M-55 196 C55 131 140 260 248 194 S425 138 470 201"
          fill="none"
          stroke="rgba(163,230,53,0.18)"
          strokeWidth={1}
        />
        <Path
          d="M-30 225 C75 160 160 285 265 220 S420 165 455 225"
          fill="none"
          stroke="rgba(163,230,53,0.18)"
          strokeWidth={1}
        />
        <Path
          d="M-45 242 C65 177 151 302 260 237 S425 182 468 243"
          fill="none"
          stroke="rgba(127,178,29,0.15)"
          strokeWidth={0.9}
        />
        <Path
          d="M-55 645 C65 575 150 705 265 632 S430 585 470 650"
          fill="none"
          stroke="rgba(127,178,29,0.17)"
          strokeWidth={1}
        />
        <Path
          d="M-55 620 C58 550 146 682 258 608 S428 560 470 625"
          fill="none"
          stroke="rgba(163,230,53,0.14)"
          strokeWidth={0.9}
        />
        <Path
          d="M-45 670 C72 598 158 727 272 656 S432 608 474 672"
          fill="none"
          stroke="rgba(127,178,29,0.13)"
          strokeWidth={0.85}
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
