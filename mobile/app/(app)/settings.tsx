import { FadeInView } from "@/components/motion/FadeInView";
import { FigmaAsset, type FigmaAssetName } from "@/components/ui/FigmaAsset";
import { useEffect, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
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
    <Screen style={{ backgroundColor: darkModeActive ? "#000000" : "#FBF9F7" }}>
      <View style={styles.topRow}>
        <BackHeader isDark={darkModeActive} />
        <Text style={[styles.title, { color: darkModeActive ? "#FFFFFF" : "#1B1C1B" }]}>Settings</Text>
      </View>

      <View style={styles.profileCard}>
        {profile?.avatarUrl ? <Image source={{ uri: profile.avatarUrl }} style={styles.profileAvatar} /> : <AppIcon name="profile" size={32} color={colors.text} />}
        <View style={styles.profileCopy}><Text style={styles.profileName}>{profile?.fullName}</Text><Text style={styles.profileEmail}>{profile?.email}</Text></View>
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
  const textColor = isDark ? "#FFFFFF" : "#1B1C1B";
  return (
    <Pressable onPress={() => router.back()} style={styles.backRow}>
      <Text style={[styles.backArrow, { color: textColor }]}>←</Text>
      <Text style={[styles.backText, { color: textColor }]}>Back</Text>
    </Pressable>
  );
}

function Section({ label, children, isDark }: { label: string; children: React.ReactNode; isDark: boolean }) {
  return (
    <FadeInView type="fade-up" style={styles.sectionWrap}>
      <Text style={[styles.sectionLabel, { color: isDark ? "#A1A595" : "#747A60" }]}>{label}</Text>
      <View style={[styles.sectionCard, { backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF" }]}>{children}</View>
    </FadeInView>
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
  const textColor = isDark ? "#FFFFFF" : "#1B1C1B";
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowLeft}>
        <View style={styles.iconBubble}>
          <FigmaAsset name={({ profile: "settings-imgContainer", settings: "settings-imgContainer2", spark: "settings-imgContainer3", bell: "settings-imgContainer4", grid: "settings-imgContainer6", info: title === "Help Center" ? "settings-imgContainer7" : "settings-imgContainer9", mail: "settings-imgContainer8" } as Partial<Record<typeof icon, FigmaAssetName>>)[icon] ?? "settings-imgContainer9"} />
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
  const textColor = isDark ? "#FFFFFF" : "#1B1C1B";
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowLeft}>
        <View style={styles.iconBubble}>
          <FigmaAsset name={({ profile: "settings-imgContainer", settings: "settings-imgContainer2", spark: "settings-imgContainer3", bell: "settings-imgContainer4", grid: "settings-imgContainer6", info: title === "Help Center" ? "settings-imgContainer7" : "settings-imgContainer9", mail: "settings-imgContainer8" } as Partial<Record<typeof icon, FigmaAssetName>>)[icon] ?? "settings-imgContainer9"} />
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
  return <View style={[styles.divider, { backgroundColor: isDark ? "#2A2B27" : "#EFEEEB" }]} />;
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: 8,

    minHeight: 48,
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
   fontFamily: "Inter_400Regular" },
  title: {
    ...typography.display,
    color: colors.text,
    fontSize: 20,
    lineHeight: 28,
   fontFamily: "PlusJakartaSans_600SemiBold" },
  sectionWrap: {
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.subtleText,
    letterSpacing: 0.6,
  },
  sectionCard: {
    borderRadius: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    ...shadows.card,
  },
  row: {
    minHeight: 56,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  iconBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: {
    ...typography.title,
    color: colors.text,
    fontSize: 16,

    fontWeight: "500",
    flexShrink: 1,
   fontFamily: "Inter_500Medium" },
  chevron: {
    ...typography.headline,
    color: colors.subtleText,
  },
  divider: {
    height: 0.5,
    backgroundColor: colors.border,

    marginLeft: 46,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 999,
    backgroundColor: "#E5E5E5",
    padding: 2,
    justifyContent: "center",
  },
  toggleOn: {
    backgroundColor: colors.dark,
  },
  knob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  knobOn: {
    alignSelf: "flex-end",
    backgroundColor: colors.accent,
  },

  profileCard: {flexDirection: "row", alignItems: "center", gap: 12, padding: 16, backgroundColor: colors.surface, borderRadius: 12},
  profileAvatar: {width: 48, height: 48, borderRadius: 24},
  profileCopy: {flex: 1, gap: 4},
  profileName: {fontSize: 16, fontWeight: "600", color: colors.text, fontFamily: "Inter_600SemiBold" },
  profileEmail: {fontSize: 13, color: colors.mutedText, fontFamily: "Inter_400Regular" },
});
