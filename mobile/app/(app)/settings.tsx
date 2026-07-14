import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { AppIcon } from "@/components/ui/AppIcon";
import { colors, radii, shadows, spacing, typography } from "@/theme";
import { usePreviewSyncQuery } from "@/features/mobile-sync/hooks";
import { useUpdateProfileMutation } from "@/features/jobs/hooks";

export default function SettingsScreen() {
  const { data: snapshot } = usePreviewSyncQuery();
  const profile = snapshot?.profile;
  const systemSettings = snapshot?.systemSettings;
  const { mutate: updateProfile } = useUpdateProfileMutation();

  const isPushEnabled = profile?.pushNotifications ?? true;
  const isDarkModeEnabled = profile?.darkMode ?? false;

  const pushNotificationsActive = isPushEnabled && (systemSettings?.pushNotificationsEnabled ?? true);
  const darkModeActive = isDarkModeEnabled && !(systemSettings?.darkModeOverride ?? false);

  return (
    <Screen>
      <View style={styles.topRow}>
        <BackHeader />
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
      </View>

      <Section label="ACCOUNT">
        <Row
          icon="profile"
          title="Personal Information"
          onPress={() => router.push("/(app)/profile")}
        />
        <Divider />
        <Row
          icon="settings"
          title="Password & Security"
          onPress={() => router.push("/(app)/security")}
        />
        <Divider />
        <Row
          icon="spark"
          title="Subscription Plan"
          onPress={() => router.push("/(app)/pricing")}
        />
      </Section>

      <Section label="PREFERENCES">
        <ToggleRow
          icon="bell"
          title="Push Notifications"
          enabled={pushNotificationsActive}
          onPress={() => updateProfile({ pushNotifications: !isPushEnabled })}
        />
        <Divider />
        <ToggleRow
          icon="grid"
          title="Dark Mode"
          enabled={darkModeActive}
          onPress={() => updateProfile({ darkMode: !isDarkModeEnabled })}
        />
      </Section>

      <Section label="SUPPORT">
        <Row icon="info" title="Help Center" onPress={() => router.push("/(app)/contact")} />
        <Divider />
        <Row icon="mail" title="Contact Us" onPress={() => router.push("/(app)/contact")} />
        <Divider />
        <Row icon="info" title="About 9Jobs" onPress={() => router.push("/(app)/about")} />
      </Section>
    </Screen>
  );
}

function BackHeader() {
  return (
    <Pressable onPress={() => router.back()} style={styles.backRow}>
      <Text style={[styles.backArrow, { color: colors.text }]}>←</Text>
      <Text style={[styles.backText, { color: colors.text }]}>Back</Text>
    </Pressable>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  const isDark = colors.background === "#090A08";
  return (
    <View style={styles.sectionWrap}>
      <Text style={[styles.sectionLabel, { color: isDark ? colors.mutedText : "#A0A7BD" }]}>{label}</Text>
      <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>{children}</View>
    </View>
  );
}

function Row({
  icon,
  title,
  onPress,
}: {
  icon: Parameters<typeof AppIcon>[0]["name"];
  title: string;
  onPress?: () => void;
}) {
  const isDark = colors.background === "#090A08";
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowLeft}>
        <View style={[styles.iconBubble, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(10, 10, 8, 0.04)" }]}>
          <AppIcon name={icon} size={18} color={colors.text} />
        </View>
        <Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>
      </View>
      <Text style={[styles.chevron, { color: colors.subtleText }]}>›</Text>
    </Pressable>
  );
}

function ToggleRow({
  icon,
  title,
  enabled,
  onPress,
}: {
  icon: Parameters<typeof AppIcon>[0]["name"];
  title: string;
  enabled?: boolean;
  onPress?: () => void;
}) {
  const isDark = colors.background === "#090A08";
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowLeft}>
        <View style={[styles.iconBubble, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(10, 10, 8, 0.04)" }]}>
          <AppIcon name={icon} size={18} color={colors.text} />
        </View>
        <Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>
      </View>
      <View style={[styles.toggle, { backgroundColor: isDark ? "#2A2B27" : "#E5E5E5" }, enabled && styles.toggleOn]}>
        <View style={[styles.knob, enabled && styles.knobOn]} />
      </View>
    </Pressable>
  );
}

function Divider() {
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backArrow: {
    ...typography.title,
    color: colors.text,
  },
  backText: {
    ...typography.title,
    color: colors.text,
    fontSize: 16,
  },
  title: {
    ...typography.display,
    color: colors.text,
    fontSize: 24,
    lineHeight: 30,
  },
  sectionWrap: {
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.label,
    color: "#A0A7BD",
    letterSpacing: 1.1,
  },
  sectionCard: {
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    ...shadows.card,
  },
  row: {
    minHeight: 64,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  iconBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.panel,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: {
    ...typography.title,
    color: colors.text,
    fontSize: 16,
  },
  chevron: {
    ...typography.headline,
    color: colors.subtleText,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 999,
    backgroundColor: "#E5E5E5",
    padding: 2,
    justifyContent: "center",
  },
  toggleOn: {
    backgroundColor: colors.dark,
  },
  knob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  knobOn: {
    alignSelf: "flex-end",
    backgroundColor: colors.accent,
  },
});
