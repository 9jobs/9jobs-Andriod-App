import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { Screen } from "@/components/ui/Screen";
import { AppIcon } from "@/components/ui/AppIcon";
import { useSession } from "@/providers/SessionProvider";
import { colors, radii, shadows, spacing, typography } from "@/theme";

const profileItems = [
  {
    id: "applications",
    label: "My Applications",
    icon: "briefcase" as const,
    onPress: () => "/(app)/tracker",
  },
  {
    id: "resumes",
    label: "My Resumes",
    icon: "resume" as const,
    onPress: () => "/(app)/resume",
  },
  {
    id: "saved",
    label: "Saved Jobs",
    icon: "saved" as const,
    onPress: () => "/(app)/saved",
  },
  {
    id: "certificates",
    label: "Certificates",
    icon: "spark" as const,
    onPress: () => "/(app)/stories",
  },
  {
    id: "pricing",
    label: "Subscription Plan",
    icon: "spark" as const,
    onPress: () => "/(app)/pricing",
  },
  {
    id: "support",
    label: "Help & Support",
    icon: "info" as const,
    onPress: () => "/(app)/contact",
  },
  {
    id: "about",
    label: "About 9Jobs",
    icon: "info" as const,
    onPress: () => "/(app)/about",
  },
];

export default function ProfileScreen() {
  const { signOut } = useSession();

  return (
    <Screen contentStyle={styles.screenContent}>
      <View style={styles.hero}>
        <View style={styles.heroHeader}>
          <Text style={styles.title}>Profile</Text>
          <Pressable
            style={styles.settingsButton}
            onPress={() => router.push("/(app)/settings")}
          >
            <AppIcon name="settings" size={18} color={colors.surface} />
          </Pressable>
        </View>

        <View style={styles.sparkOne} />
        <View style={styles.sparkTwo} />
        <View style={styles.sparkThree} />
        <View style={styles.sparkFour} />
        <View style={styles.sparkFive} />
        <View style={styles.sparkSix} />

        <View style={styles.avatarWrap}>
          <View style={styles.avatarRing}>
            <Image
              source={{
                uri: "https://randomuser.me/api/portraits/men/32.jpg",
              }}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          </View>
          <View style={styles.cameraBadge}>
            <CameraBadgeIcon />
          </View>
        </View>

        <View style={styles.socialRow}>
          <SocialButton kind="linkedin" />
          <SocialButton kind="facebook" />
          <SocialButton kind="instagram" />
          <SocialButton kind="twitter" />
        </View>
      </View>

      <View style={styles.menuWrap}>
        {profileItems.map((item, index) => (
          <View key={item.id}>
            <Pressable
              style={styles.menuRow}
              onPress={() => router.push(item.onPress() as never)}
            >
              <View style={styles.menuLeft}>
                <View style={styles.menuIconBubble}>
                  <AppIcon name={item.icon} size={18} color={colors.text} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
            {index < profileItems.length - 1 ? <View style={styles.divider} /> : null}
          </View>
        ))}
      </View>

      <Pressable style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutIcon}>↪</Text>
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </Screen>
  );
}

function SocialButton({
  kind,
}: {
  kind: "linkedin" | "facebook" | "instagram" | "twitter";
}) {
  return (
    <Pressable style={styles.socialButton}>
      <SocialIcon kind={kind} />
    </Pressable>
  );
}

function SocialIcon({
  kind,
}: {
  kind: "linkedin" | "facebook" | "instagram" | "twitter";
}) {
  switch (kind) {
    case "linkedin":
      return (
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
          <Rect x="3" y="3" width="18" height="18" rx="4" stroke={colors.surface} strokeWidth="2" />
          <Path d="M8 10V16" stroke={colors.surface} strokeWidth="2" strokeLinecap="round" />
          <Circle cx="8" cy="7.5" r="1" fill={colors.surface} />
          <Path d="M12 16V12.8C12 11.6 12.9 10.6 14.1 10.6C15.3 10.6 16 11.4 16 12.8V16" stroke={colors.surface} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M12 11V16" stroke={colors.surface} strokeWidth="2" strokeLinecap="round" />
        </Svg>
      );
    case "facebook":
      return (
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
          <Path d="M13.2 21V12.8H15.8L16.2 9.8H13.2V7.9C13.2 7 13.5 6.4 14.8 6.4H16.3V3.6C16 3.5 15.1 3.4 14 3.4C11.7 3.4 10.1 4.8 10.1 7.4V9.8H7.6V12.8H10.1V21H13.2Z" fill={colors.surface} />
        </Svg>
      );
    case "instagram":
      return (
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
          <Rect x="4" y="4" width="16" height="16" rx="5" stroke={colors.surface} strokeWidth="2" />
          <Circle cx="12" cy="12" r="3.5" stroke={colors.surface} strokeWidth="2" />
          <Circle cx="17" cy="7.2" r="1" fill={colors.surface} />
        </Svg>
      );
    case "twitter":
      return (
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
          <Path d="M19.4 7.2C18.9 7.4 18.3 7.6 17.7 7.6C18.3 7.2 18.7 6.7 18.9 6C18.4 6.4 17.8 6.6 17.1 6.8C16.6 6.2 15.8 5.9 15 5.9C13.5 5.9 12.3 7.1 12.3 8.6C12.3 8.8 12.3 9 12.4 9.2C10.1 9.1 8.1 8 6.7 6.3C6.4 6.8 6.2 7.3 6.2 7.9C6.2 8.9 6.7 9.8 7.5 10.4C7 10.4 6.6 10.2 6.2 10V10C6.2 11.4 7.2 12.6 8.5 12.9C8.3 13 8 13 7.8 13C7.6 13 7.4 13 7.2 12.9C7.6 14.1 8.7 15 10 15C9 15.8 7.8 16.2 6.5 16.2C6.2 16.2 6 16.2 5.8 16.1C7.1 16.9 8.7 17.4 10.4 17.4C15 17.4 17.5 13.6 17.5 10.4V10.1C18 9.7 18.5 9.2 18.9 8.6C19.1 8.2 19.3 7.7 19.4 7.2Z" fill={colors.surface} />
        </Svg>
      );
  }
}

function CameraBadgeIcon() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 8H8L9.5 6H14.5L16 8H19C19.6 8 20 8.4 20 9V17C20 17.6 19.6 18 19 18H5C4.4 18 4 17.6 4 17V9C4 8.4 4.4 8 5 8Z"
        stroke={colors.text}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="13" r="3" stroke={colors.text} strokeWidth="2" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingHorizontal: 0,
    paddingTop: 0,
    gap: 0,
  },
  hero: {
    backgroundColor: colors.dark,
    minHeight: 254,
    paddingTop: 18,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  heroHeader: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 26,
  },
  title: {
    ...typography.display,
    color: colors.surface,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.6,
  },
  settingsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  sparkOne: {
    position: "absolute",
    top: 26,
    left: 134,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  sparkTwo: {
    position: "absolute",
    top: 52,
    right: 148,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.accent,
  },
  sparkThree: {
    position: "absolute",
    top: 96,
    left: 102,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
    opacity: 0.7,
  },
  sparkFour: {
    position: "absolute",
    top: 84,
    right: 86,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.accent,
    opacity: 0.8,
  },
  sparkFive: {
    position: "absolute",
    top: 126,
    left: 128,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
    opacity: 0.7,
  },
  sparkSix: {
    position: "absolute",
    top: 132,
    right: 82,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.accent,
    opacity: 0.7,
  },
  avatarWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    marginBottom: 18,
  },
  avatarRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    borderColor: colors.accent,
    backgroundColor: "rgba(163,230,53,0.06)",
    alignItems: "center",
    justifyContent: "center",
    ...shadows.glow,
  },
  avatarImage: {
    width: 78,
    height: 78,
    borderRadius: 39,
  },
  cameraBadge: {
    position: "absolute",
    right: -4,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.dark,
  },
  socialRow: {
    flexDirection: "row",
    gap: 12,
  },
  socialButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  menuWrap: {
    backgroundColor: colors.background,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  menuRow: {
    minHeight: 66,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  menuIconBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.panel,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
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
  signOutButton: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: 108,
    minHeight: 42,
    borderRadius: 16,
    backgroundColor: "#FFE3E3",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  signOutIcon: {
    color: "#FF4D4F",
    fontSize: 16,
    fontWeight: "700",
  },
  signOutText: {
    ...typography.title,
    color: "#FF4D4F",
    fontSize: 16,
  },
});
