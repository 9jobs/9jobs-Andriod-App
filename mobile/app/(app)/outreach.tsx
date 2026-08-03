import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { AppIcon } from "@/components/ui/AppIcon";
import { usePreviewSyncQuery } from "@/features/mobile-sync/hooks";
import { colors, radii, shadows, spacing, typography } from "@/theme";

export default function OutreachScreen() {
  const { data: snapshot } = usePreviewSyncQuery();
  const contacts = snapshot?.outreachContacts ?? [];

  return (
    <Screen>
      <BackHeader />
      <Text style={styles.title}>Hiring Manager{"\n"}Outreach</Text>

      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.engineBadge}>
            <AppIcon name="spark" color={colors.dark} size={13} strokeWidth={2.4} />
            <Text style={styles.engineBadgeText}>OUTREACH ENGINE</Text>
          </View>
          <View style={styles.liveStatus}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        <View style={styles.pipelineRow}>
          <View style={styles.stage}>
            <View style={[styles.stageIcon, styles.discoveryIcon]}>
              <AppIcon name="search" color={colors.dark} size={21} strokeWidth={2.4} />
            </View>
            <Text style={styles.stageLabel}>Discover</Text>
          </View>
          <View style={styles.connector}>
            <View style={styles.connectorLine} />
            <View style={styles.connectorPulse} />
          </View>
          <View style={styles.stage}>
            <View style={[styles.stageIcon, styles.messageIcon]}>
              <AppIcon name="mail" color={colors.accent} size={20} strokeWidth={2.2} />
            </View>
            <Text style={styles.stageLabel}>Personalize</Text>
          </View>
          <View style={styles.connector}>
            <View style={styles.connectorLine} />
            <View style={[styles.connectorPulse, styles.connectorPulseEnd]} />
          </View>
          <View style={styles.stage}>
            <View style={[styles.stageIcon, styles.replyIcon]}>
              <AppIcon name="profile" color={colors.dark} size={20} strokeWidth={2.2} />
            </View>
            <Text style={styles.stageLabel}>Connect</Text>
          </View>
        </View>

        <View style={styles.insightRow}>
          <Text style={styles.heroCaption}>AI-crafted messages</Text>
          <View style={styles.metricPill}>
            <AppIcon name="tracker" color={colors.accent} size={14} strokeWidth={2.2} />
            <Text style={styles.metricText}>3.4x replies</Text>
          </View>
        </View>
      </View>

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
    height: 194,
    borderRadius: radii.lg,
    backgroundColor: colors.dark,
    position: "relative",
    overflow: "hidden",
    padding: spacing.lg,
    gap: 18,
    ...shadows.float,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  engineBadge: {
    minHeight: 28,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  engineBadgeText: {
    ...typography.label,
    color: colors.dark,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  liveStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
  },
  stage: {
    width: 66,
    alignItems: "center",
    gap: 6,
  },
  stageIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
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
    ...typography.label,
    color: colors.darkMuted,
    fontSize: 9,
  },
  connector: {
    flex: 1,
    height: 42,
    justifyContent: "center",
    position: "relative",
  },
  connectorLine: {
    height: 1,
    backgroundColor: colors.accent,
    opacity: 0.45,
  },
  connectorPulse: {
    position: "absolute",
    left: "34%",
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  connectorPulseEnd: {
    left: "64%",
  },
  insightRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroCaption: {
    ...typography.body,
    color: colors.darkMuted,
    fontSize: 13,
  },
  metricPill: {
    minHeight: 28,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.darkChipStrong,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metricText: {
    ...typography.label,
    color: colors.surface,
    fontSize: 11,
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
