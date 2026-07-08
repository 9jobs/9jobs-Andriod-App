import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { PremiumScaffold, SoftPanel } from "@/components/premium/PremiumScaffold";
import { AppIcon } from "@/components/ui/AppIcon";
import { colors, radii, spacing, typography } from "@/theme";

const appScreens = [
  { label: "Home", href: "/(app)", icon: "home" as const },
  { label: "Services", href: "/(app)/services", icon: "grid" as const },
  { label: "Tracker", href: "/(app)/tracker", icon: "tracker" as const },
  { label: "Messages", href: "/(app)/messages", icon: "mail" as const },
  { label: "Resume", href: "/(app)/resume", icon: "resume" as const },
  { label: "Outreach", href: "/(app)/outreach", icon: "mail" as const },
  { label: "Interview", href: "/(app)/interview", icon: "mic" as const },
  { label: "Pricing", href: "/(app)/pricing", icon: "spark" as const },
  { label: "Stories", href: "/(app)/stories", icon: "story" as const },
  { label: "Notifications", href: "/(app)/notifications", icon: "bell" as const },
  { label: "Saved", href: "/(app)/saved", icon: "saved" as const },
  { label: "Settings", href: "/(app)/settings", icon: "settings" as const },
  { label: "About", href: "/(app)/about", icon: "info" as const },
  { label: "Contact", href: "/(app)/contact", icon: "profile" as const },
];

export default function ScreensDirectory() {
  return (
    <PremiumScaffold
      title="All screens"
      subtitle="Open every 9Jobs page from one place while testing the app."
      kicker="SCREEN DIRECTORY"
      rightSlot={<AppIcon name="grid" size={36} color={colors.accentDark} />}
    >
      <SoftPanel>
        <Text style={styles.panelTitle}>Preview every layout</Text>
        <Text style={styles.panelBody}>
          Use this testing hub to move across onboarding-connected app pages without going back
          to the emulator home screen.
        </Text>
      </SoftPanel>
      <View style={styles.grid}>
        {appScreens.map((screen) => (
          <Pressable
            key={screen.href}
            onPress={() => router.push(screen.href as never)}
            style={styles.card}
          >
            <View style={styles.iconWrap}>
              <AppIcon name={screen.icon} color={colors.text} />
            </View>
            <Text style={styles.cardLabel}>{screen.label}</Text>
          </Pressable>
        ))}
      </View>
    </PremiumScaffold>
  );
}

const styles = StyleSheet.create({
  panelTitle: {
    ...typography.title,
    color: colors.text,
  },
  panelBody: {
    ...typography.body,
    color: colors.mutedText,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  card: {
    width: "48%",
    padding: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    gap: spacing.sm,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(163, 230, 53, 0.18)",
  },
  cardLabel: {
    ...typography.label,
    color: colors.text,
    fontSize: 12,
  },
});
