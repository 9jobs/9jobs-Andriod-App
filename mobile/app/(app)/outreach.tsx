import { useEffect, useState } from "react";
import { ImageBackground, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import Animated, {
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Screen } from "@/components/ui/Screen";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { usePreviewSyncQuery } from "@/features/mobile-sync/hooks";
import { colors, radii, shadows, spacing, typography } from "@/theme";

export default function OutreachScreen() {
  const { data: snapshot } = usePreviewSyncQuery();
  const contacts = snapshot?.outreachContacts ?? [];

  return (
    <Screen>
      <BackHeader />
      <Text style={styles.title}>Hiring Manager{"\n"}Outreach</Text>

      <ImageBackground
        source={require("../../assets/branding/outreach-engine-reference.png")}
        resizeMode="cover"
        style={styles.heroCard}
        imageStyle={styles.heroCardImage}
        accessibilityLabel="Outreach Engine: Discover, Personalize, Connect"
      >
        <OutreachMotionOverlay />
        <View pointerEvents="none" style={styles.stageSubtitles}>
          <Text style={styles.stageSubtitleOverlay} numberOfLines={1}>Find ideal opportunities</Text>
          <Text style={styles.stageSubtitleOverlay} numberOfLines={1}>Tailored messages</Text>
          <Text style={styles.stageSubtitleOverlay} numberOfLines={1}>Build real relationships</Text>
        </View>
        <View pointerEvents="none" style={styles.metricSubtitleMask}>
          <Text style={styles.metricSubtitleOverlay} numberOfLines={1}>Higher response rate</Text>
        </View>
        <View style={styles.heroCopyMask}>
          <Text style={styles.heroCopyTitle} numberOfLines={1}>
            <Text style={styles.heroCopyAccent}>9Jobs-</Text>powered outreach
          </Text>
          <Text style={styles.heroCopySubtitle} numberOfLines={1}>
            Find talent. Build better connections.
          </Text>
        </View>
      </ImageBackground>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Found Contacts</Text>
        <View style={styles.sectionBadge}>
          <Text style={styles.sectionBadgeText}>{contacts.length} new</Text>
        </View>
      </View>

      <View style={styles.contactStack}>
        {contacts.map((contact) => (
          <View key={contact.id} style={styles.contactCard}>
            <View style={styles.contactTop}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{contact.name.trim().charAt(0).toUpperCase() || "H"}</Text>
              </View>
              <View style={styles.contactCopy}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactRole}>{contact.position || contact.email || "Hiring Manager"}</Text>
              </View>
              <View style={styles.onlineDot} />
            </View>
            <View style={styles.buttonRow}>
              <Pressable
                style={styles.blackButton}
                onPress={() => {
                  if (contact.profileLink) {
                    void Linking.openURL(contact.profileLink);
                  }
                }}
              >
                <Text style={styles.blackButtonText}>Connect</Text>
              </Pressable>
              <Pressable
                style={styles.whiteButton}
                onPress={() => {
                  if (contact.profileLink) {
                    void Linking.openURL(contact.profileLink);
                  }
                }}
              >
                <Text style={styles.whiteButtonText}>View Profile</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>

      <PrimaryButton label="Continue Outreach" onPress={() => router.push("/(app)/messages")} />
    </Screen>
  );
}

function OutreachMotionOverlay() {
  const [laneWidth, setLaneWidth] = useState(0);
  const progress = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    progress.value = 0;
    if (!reducedMotion) {
      progress.value = withRepeat(withTiming(1, { duration: 3400 }), -1, false);
    }

    return () => cancelAnimation(progress);
  }, [progress, reducedMotion]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: reducedMotion ? 0.8 : interpolate(progress.value, [0, 0.08, 0.92, 1], [0, 1, 1, 0]),
    transform: [
      { translateX: progress.value * Math.max(0, laneWidth - 14) },
      {
        translateY: interpolate(
          progress.value,
          [0, 0.28, 0.58, 0.82, 1],
          [14, 34, 29, 3, 10],
        ),
      },
      { scale: interpolate(progress.value, [0, 0.5, 1], [0.75, 1.15, 0.8]) },
    ],
  }));

  return (
    <View
      pointerEvents="none"
      style={styles.motionLane}
      onLayout={(event) => setLaneWidth(event.nativeEvent.layout.width)}
    >
      <Animated.View style={[styles.movingGlow, glowStyle]}>
        <View style={styles.movingGlowCore} />
      </Animated.View>
    </View>
  );
}

function BackHeader() {
  return (
    <Pressable onPress={() => router.back()} style={styles.backRow}>
      <Text style={styles.backArrow}>←</Text>
      <Text style={styles.backText}>Back</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: spacing.sm,
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
  heroCard: {
    width: "100%",
    aspectRatio: 1208 / 613,
    borderRadius: radii.lg,
    backgroundColor: colors.dark,
    overflow: "hidden",
    ...shadows.float,
  },
  heroCardImage: {
    borderRadius: radii.lg,
  },
  motionLane: {
    position: "absolute",
    left: 8,
    right: 8,
    top: "35%",
    height: 46,
  },
  movingGlow: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(202, 255, 26, 0.22)",
    shadowColor: colors.accent,
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
  movingGlowCore: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#F2FF9A",
  },
  stageSubtitles: {
    position: "absolute",
    left: "2%",
    right: "2%",
    top: "68%",
    height: "10%",
    flexDirection: "row",
    alignItems: "center",
  },
  stageSubtitleOverlay: {
    width: "33.333%",
    height: "100%",
    backgroundColor: "#000000",
    color: "#E5E5E0",
    fontSize: 7.5,
    lineHeight: 10,
    fontWeight: "600",
    textAlign: "center",
    textAlignVertical: "center",
  },
  metricSubtitleMask: {
    position: "absolute",
    right: "7%",
    bottom: "1.5%",
    width: "25%",
    height: "6%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#11120F",
  },
  metricSubtitleOverlay: {
    color: "#E5E5E0",
    fontSize: 7.5,
    lineHeight: 10,
    fontWeight: "600",
    textAlign: "center",
  },
  heroCopyMask: {
    position: "absolute",
    left: 0,
    bottom: 0,
    width: "61%",
    height: "25%",
    justifyContent: "center",
    gap: 2,
    paddingLeft: 8,
    paddingRight: 4,
    backgroundColor: "#000000",
  },
  heroCopyTitle: {
    ...typography.title,
    color: colors.surface,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "800",
  },
  heroCopyAccent: {
    color: colors.accent,
  },
  heroCopySubtitle: {
    ...typography.label,
    color: "#E5E5E0",
    fontSize: 7.5,
    lineHeight: 10,
    fontWeight: "600",
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  engineBadge: {
    minHeight: 30,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.65)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    ...shadows.glow,
  },
  engineBadgeText: {
    ...typography.label,
    color: colors.dark,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  liveStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 28,
    paddingHorizontal: 9,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.darkChipStrong,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  liveText: {
    ...typography.label,
    color: colors.darkMuted,
    fontSize: 10,
    letterSpacing: 1,
  },
  pipelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    zIndex: 1,
  },
  stage: {
    width: 86,
    alignItems: "center",
    gap: 4,
  },
  stageHalo: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    borderColor: "rgba(192,255,0,0.65)",
    backgroundColor: "rgba(192,255,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  discoveryHalo: {
    borderStyle: "dashed",
    borderColor: "rgba(192,255,0,0.82)",
  },
  stageIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  discoveryIcon: {
    backgroundColor: colors.accent,
    ...shadows.glow,
  },
  messageIcon: {
    backgroundColor: colors.darkChipStrong,
    borderWidth: 1,
    borderColor: "rgba(192,255,0,0.35)",
  },
  replyIcon: {
    backgroundColor: "#F4F1E8",
  },
  stageLabel: {
    ...typography.title,
    color: colors.surface,
    fontSize: 10,
    lineHeight: 12,
  },
  stageSubtitle: {
    ...typography.label,
    color: colors.darkMuted,
    width: 84,
    fontSize: 7,
    lineHeight: 9,
    textAlign: "center",
  },
  connector: {
    flex: 1,
    height: 42,
  },
  waveField: {
    position: "absolute",
    left: 12,
    right: 12,
    top: 57,
    height: 88,
    opacity: 0.9,
  },
  insightRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 1,
    gap: 10,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  heroCaption: {
    ...typography.title,
    color: colors.surface,
    fontSize: 12,
    lineHeight: 15,
  },
  heroAccent: {
    color: colors.accent,
  },
  heroSubtitle: {
    ...typography.label,
    color: colors.darkMuted,
    fontSize: 7,
  },
  metricPill: {
    width: 112,
    minHeight: 46,
    paddingHorizontal: 8,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "rgba(192,255,0,0.48)",
    backgroundColor: "rgba(20,21,18,0.92)",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metricCopy: {
    flex: 1,
    paddingRight: 8,
    gap: 1,
  },
  metricText: {
    ...typography.title,
    color: colors.surface,
    fontSize: 10,
    lineHeight: 12,
  },
  metricSubtitle: {
    ...typography.label,
    color: colors.darkMuted,
    fontSize: 6,
    lineHeight: 8,
  },
  metricArrow: {
    position: "absolute",
    right: 7,
    color: colors.darkMuted,
    fontSize: 18,
    lineHeight: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    ...typography.title,
    color: colors.text,
  },
  sectionBadge: {
    borderRadius: radii.pill,
    backgroundColor: colors.softAccent,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sectionBadgeText: {
    ...typography.label,
    color: colors.accentDark,
  },
  contactStack: {
    gap: spacing.md,
  },
  contactCard: {
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.card,
  },
  contactTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    ...typography.title,
    color: colors.text,
  },
  contactCopy: {
    flex: 1,
    gap: 2,
  },
  contactName: {
    ...typography.title,
    color: colors.text,
  },
  contactRole: {
    ...typography.body,
    color: colors.mutedText,
    fontSize: 14,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  blackButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: radii.pill,
    backgroundColor: colors.dark,
    alignItems: "center",
    justifyContent: "center",
  },
  blackButtonText: {
    ...typography.label,
    color: colors.accent,
  },
  whiteButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  whiteButtonText: {
    ...typography.label,
    color: colors.text,
  },
});
