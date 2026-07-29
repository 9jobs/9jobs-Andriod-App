import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { colors, spacing, typography } from "@/theme";
import { FadeInView } from "@/components/motion/FadeInView";
import { ScreenBackground } from "@/components/motion/screen-background";

export default function SplashScreen() {
  useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace("/(public)/auth/sign-up");
    }, 5000);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <View style={styles.container}>
      <ScreenBackground />
      <FadeInView type="fade-up" duration={360} style={styles.center}>
        <View style={styles.logoWrap}>
          <BrandLogo size={148} />
        </View>
        <Text style={styles.body}>Your career, elevated.</Text>
        <Text style={styles.subtle}>Resume. Outreach. Interview. Momentum.</Text>
        <View style={styles.dots}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </FadeInView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.dark,
  },

  center: {
    alignItems: "center",
    gap: spacing.md,
  },
  logoWrap: {
    padding: spacing.xl,
    borderRadius: 40,
    backgroundColor: "rgba(163, 230, 53, 0.08)",
  },
  body: {
    ...typography.body,
    color: colors.surface,
  },
  subtle: {
    ...typography.label,
    color: colors.darkMuted,
    letterSpacing: 0.6,
  },
  dots: {
    flexDirection: "row",
    gap: 8,
    marginTop: spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(163, 230, 53, 0.55)",
  },
});
