import { useEffect } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { View, StyleSheet } from "react-native";
import { colors } from "@/theme";

export function SuccessPulse() {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.18, { duration: 800 }), withTiming(1)),
      -1,
      false,
    );
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.outer}>
      <Animated.View style={[styles.inner, animatedStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: "rgba(163, 230, 53, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  inner: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
});
