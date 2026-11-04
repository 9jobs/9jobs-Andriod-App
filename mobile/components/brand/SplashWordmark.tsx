import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme";

export function SplashWordmark({ fontSize = 48 }: { fontSize?: number }) {
  return (
    <View style={styles.container}>
      <Text accessibilityLabel="9jobs" allowFontScaling={false} style={[styles.wordmark, { fontSize, lineHeight: fontSize * 1.25, letterSpacing: -fontSize * 0.052 }]}>
        <Text style={styles.nine}>9</Text>jobs
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  wordmark: {
    fontFamily: "PlusJakartaSans_700Bold",
    color: colors.surface,
    includeFontPadding: false,
  },
  nine: {
    color: colors.accent,
  },
});
