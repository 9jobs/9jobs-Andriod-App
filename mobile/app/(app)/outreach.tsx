import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
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

      <View style={styles.heroCard}>
        <View style={[styles.node, styles.primaryNode]}>
          <Text style={styles.nodeEmoji}>🔎</Text>
        </View>
        <View style={[styles.node, styles.centerNode]}>
          <Text style={styles.nodeEmoji}>📨</Text>
        </View>
        <View style={[styles.node, styles.topRightNode]}>
          <Text style={styles.nodeEmoji}>👔</Text>
        </View>
        <View style={[styles.node, styles.bottomRightNode]}>
          <Text style={styles.nodeEmoji}>📊</Text>
        </View>
        <View style={[styles.link, styles.linkOne]} />
        <View style={[styles.link, styles.linkTwo]} />
        <View style={[styles.link, styles.linkThree]} />
        <Text style={styles.heroCaption}>AI-crafted messages · 3.4x reply rate</Text>
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
    justifyContent: "flex-end",
    padding: spacing.lg,
    ...shadows.float,
  },
  node: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "#121310",
  },
  primaryNode: {
    width: 52,
    height: 52,
    top: 40,
    left: 58,
    backgroundColor: colors.accent,
    ...shadows.glow,
  },
  centerNode: {
    width: 22,
    height: 22,
    top: 70,
    left: 160,
  },
  topRightNode: {
    width: 34,
    height: 34,
    top: 44,
    right: 56,
  },
  bottomRightNode: {
    width: 42,
    height: 42,
    top: 92,
    right: 44,
  },
  nodeEmoji: {
    fontSize: 14,
  },
  link: {
    position: "absolute",
    height: 1.5,
    backgroundColor: colors.accent,
    opacity: 0.75,
  },
  linkOne: {
    width: 70,
    top: 74,
    left: 102,
    transform: [{ rotate: "20deg" }],
  },
  linkTwo: {
    width: 66,
    top: 76,
    right: 86,
    transform: [{ rotate: "-22deg" }],
  },
  linkThree: {
    width: 82,
    top: 100,
    right: 92,
    transform: [{ rotate: "21deg" }],
  },
  heroCaption: {
    ...typography.body,
    color: colors.darkMuted,
    textAlign: "center",
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
