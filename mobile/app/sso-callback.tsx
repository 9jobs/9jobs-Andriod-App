import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSession } from "@/providers/SessionProvider";
import { colors, spacing, typography } from "@/theme";

export default function SsoCallbackScreen() {
  const { isBooting, user } = useSession();

  useEffect(() => {
    if (isBooting) {
      return;
    }

    if (user) {
      router.replace("/(app)");
      return;
    }

    const timeout = setTimeout(() => {
      router.replace("/(public)/auth/sign-in");
    }, 8000);

    return () => clearTimeout(timeout);
  }, [isBooting, user]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.accentDark} size="large" />
      <Text style={styles.title}>Completing Google sign-in...</Text>
      <Text style={styles.subtitle}>Please wait while we finish your session.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  title: {
    ...typography.title,
    color: colors.text,
    textAlign: "center",
  },
  subtitle: {
    ...typography.body,
    color: colors.mutedText,
    textAlign: "center",
  },
});
