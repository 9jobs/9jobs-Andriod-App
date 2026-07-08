import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { OnboardingHeroArt } from "@/components/onboarding/OnboardingHeroArt";
import { AuthCard } from "@/features/auth/AuthCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useSession } from "@/providers/SessionProvider";
import { colors, spacing, typography } from "@/theme";

export default function AuthScreen() {
  const { clerkConfigured, signInDemo } = useSession();

  return (
    <Screen contentStyle={styles.content} style={styles.screen}>
      <View style={styles.hero}>
        <BrandLogo size={108} />
        <Text style={styles.kicker}>Premium candidate flow</Text>
        <Text style={styles.headline}>Resume score, smart outreach, and clean tracking.</Text>
        <Text style={styles.body}>
          Login and signup are styled as the final premium layout. If Clerk is not connected,
          the demo flow still opens the full app.
        </Text>
        <View style={styles.actionRow}>
          <PrimaryButton
            label="Back"
            onPress={() => router.replace("/(public)")}
            variant="ghost"
            style={styles.backButton}
          />
          {!clerkConfigured ? (
            <PrimaryButton
              label="Next"
              onPress={async () => {
                await signInDemo();
                router.replace("/(app)/screens");
              }}
              style={styles.nextButton}
            />
          ) : null}
        </View>
        <View style={styles.previewWrap}>
          <OnboardingHeroArt score={97} tags={["ATS", "AI", "Jobs"]} compact />
        </View>
      </View>
      <AuthCard />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.dark,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingTop: spacing.lg,
  },
  hero: {
    width: "100%",
    gap: spacing.sm,
  },
  previewWrap: {
    marginTop: spacing.xs,
    alignItems: "center",
    marginBottom: -8,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  backButton: {
    flex: 0.36,
    minHeight: 46,
    backgroundColor: colors.panel,
  },
  nextButton: {
    flex: 0.64,
    minHeight: 46,
  },
  kicker: {
    ...typography.label,
    color: colors.accent,
  },
  headline: {
    ...typography.display,
    color: colors.surface,
    maxWidth: 340,
    fontSize: 22,
    lineHeight: 28,
  },
  body: {
    ...typography.body,
    color: colors.darkMuted,
    maxWidth: 340,
  },
});
