import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { AppIcon } from "@/components/ui/AppIcon";
import { colors, radii, setTheme, shadows, spacing, typography, useThemeVersion } from "@/theme";
import { usePreviewSyncSelector } from "@/features/mobile-sync/hooks";
import { useUpdateProfileMutation } from "@/features/jobs/hooks";

export default function SettingsScreen() {
  useThemeVersion();
  const { data: profile } = usePreviewSyncSelector((snapshot) => snapshot.profile);
  const { data: systemSettings } = usePreviewSyncSelector((snapshot) => snapshot.systemSettings);
  const { mutate: updateProfile } = useUpdateProfileMutation();
  const [darkModeEnabled, setDarkModeEnabled] = useState(profile?.darkMode ?? false);

  useEffect(() => {
    if (typeof profile?.darkMode === "boolean") {
      setDarkModeEnabled(profile.darkMode);
    }
  }, [profile?.darkMode]);

  const isPushEnabled = profile?.pushNotifications ?? true;
  const isDarkModeEnabled = darkModeEnabled;

  const pushNotificationsActive = isPushEnabled && (systemSettings?.pushNotificationsEnabled ?? true);
  const darkModeActive = isDarkModeEnabled && !(systemSettings?.darkModeOverride ?? false);

  const handleDarkModeToggle = () => {
    const nextDarkMode = !isDarkModeEnabled;
    setTheme(nextDarkMode && !(systemSettings?.darkModeOverride ?? false));
    setDarkModeEnabled(nextDarkMode);
    router.setParams({ themePreview: nextDarkMode ? "dark" : "light" });
    setTimeout(() => {
      updateProfile({ darkMode: nextDarkMode });
    }, 400);
  };

  return (
    <Screen style={{ backgroundColor: darkModeActive ? "#000000" : "#F4F1E8" }}>
      <View style={styles.topRow}>
        <BackHeader isDark={darkModeActive} />
        <Text style={[styles.title, { color: darkModeActive ? "#FFFFFF" : "#0A0A08" }]}>Settings</Text>
      </View>

      <Section label="ACCOUNT" isDark={darkModeActive}>
        <Row
          isDark={darkModeActive}
          icon="profile"
          title="Personal Information"
          onPress={() => router.push("/(app)/personal-information")}
        />
        <Divider isDark={darkModeActive} />
        <Row
          isDark={darkModeActive}
          icon="settings"
          title="Password & Security"
          onPress={() => router.push("/(app)/security")}
        />
        <Divider isDark={darkModeActive} />
        <Row
          isDark={darkModeActive}
          icon="spark"
          title="Subscription Plan"
          onPress={() => router.push("/(app)/pricing")}
        />
      </Section>

      <Section label="PREFERENCES" isDark={darkModeActive}>
        <ToggleRow
          isDark={darkModeActive}
          icon="bell"
          title="Push Notifications"
          enabled={pushNotificationsActive}
          onPress={() => updateProfile({ pushNotifications: !isPushEnabled })}
        />
        <Divider isDark={darkModeActive} />
        <ToggleRow
          isDark={darkModeActive}
          icon="grid"
          title="Dark Mode"
          enabled={darkModeActive}
          onPress={handleDarkModeToggle}
        />
      </Section>

      <Section label="SUPPORT" isDark={darkModeActive}>
        <Row isDark={darkModeActive} icon="info" title="Help Center" onPress={() => router.push("/(app)/contact")} />
        <Divider isDark={darkModeActive} />
        <Row isDark={darkModeActive} icon="mail" title="Contact Us" onPress={() => router.push("/(app)/contact")} />
        <Divider isDark={darkModeActive} />
        <Row isDark={darkModeActive} icon="info" title="About 9Jobs" onPress={() => router.push("/(app)/about")} />
      </Section>
    </Screen>
  );
}

function BackHeader({ isDark }: { isDark: boolean }) {
  const textColor = isDark ? "#FFFFFF" : "#0A0A08";
  return (
    <Pressable onPress={() => router.back()} style={styles.backRow}>
      <Text style={[styles.backArrow, { color: textColor }]}>←</Text>
      <Text style={[styles.backText, { color: textColor }]}>Back</Text>
    </Pressable>
  );
}

function Section({ label, children, isDark }: { label: string; children: React.ReactNode; isDark: boolean }) {
  return (
    <View style={styles.sectionWrap}>
      <Text style={[styles.sectionLabel, { color: isDark ? "#A1A595" : "#A0A7BD" }]}>{label}</Text>
      <View style={[styles.sectionCard, { backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF" }]}>{children}</View>
    </View>
  );
}

function Row({
  icon,
  title,
  onPress,
  isDark,
}: {
  icon: Parameters<typeof AppIcon>[0]["name"];
  title: string;
  onPress?: () => void;
  isDark: boolean;
}) {
  const textColor = isDark ? "#FFFFFF" : "#0A0A08";
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowLeft}>
        <View style={[styles.iconBubble, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(10, 10, 8, 0.04)" }]}>
          <AppIcon name={icon} size={18} color={textColor} />
        </View>
        <Text style={[styles.rowTitle, { color: textColor }]}>{title}</Text>
      </View>
      <Text style={[styles.chevron, { color: isDark ? "#6F7268" : "#8B8F82" }]}>›</Text>
    </Pressable>
  );
}

function ToggleRow({
  icon,
  title,
  enabled,
  onPress,
  isDark,
}: {
  icon: Parameters<typeof AppIcon>[0]["name"];
  title: string;
  enabled?: boolean;
  onPress?: () => void;
  isDark: boolean;
}) {
  const textColor = isDark ? "#FFFFFF" : "#0A0A08";
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowLeft}>
        <View style={[styles.iconBubble, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(10, 10, 8, 0.04)" }]}>
          <AppIcon name={icon} size={18} color={textColor} />
        </View>
        <Text style={[styles.rowTitle, { color: textColor }]}>{title}</Text>
      </View>
      <View style={[styles.toggle, { backgroundColor: isDark ? "#2A2B27" : "#E5E5E5" }, enabled && styles.toggleOn]}>
        <View style={[styles.knob, enabled && styles.knobOn]} />
      </View>
    </Pressable>
  );
}

function Divider({ isDark }: { isDark: boolean }) {
  return <View style={[styles.divider, { backgroundColor: isDark ? "#2A2B27" : "#E8E5DB" }]} />;
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
