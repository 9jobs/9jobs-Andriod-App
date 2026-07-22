import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { AppIcon } from "@/components/ui/AppIcon";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Screen } from "@/components/ui/Screen";
import { getAboutDetailContent } from "@/lib/data/premium-content";
import { colors, radii, shadows, spacing, typography } from "@/theme";

export default function AboutDetailScreen() {
  const params = useLocalSearchParams<{ type?: string; id?: string }>();
  const detail = getAboutDetailContent(params.type || "", params.id || "");

  if (!detail) {
    return (
      <Screen contentStyle={styles.content}>
        <BackHeader label="About 9Jobs" />
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Detail not found</Text>
          <Text style={styles.emptyBody}>
            The requested About section could not be opened.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen contentStyle={styles.content}>
      <BackHeader label="About 9Jobs" />

      <LinearGradient
        colors={["#090A08", "#11120D", "#181913"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <Text style={styles.kicker}>{detail.kicker}</Text>
        <Text style={styles.title}>{detail.title}</Text>
        <Text style={styles.subtitle}>{detail.subtitle}</Text>
      </LinearGradient>

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Overview</Text>
        <Text style={styles.sectionBody}>{detail.overview}</Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>
          {detail.type === "service" ? "What This Covers" : "Market Focus"}
        </Text>
        <View style={styles.points}>
          {detail.points.map((point) => (
            <View key={point} style={styles.pointRow}>
              <View style={styles.pointIconWrap}>
                <AppIcon
                  name={detail.type === "service" ? "spark" : "pin"}
                  color={colors.accentDark}
                  size={14}
                  strokeWidth={2.2}
                />
              </View>
              <Text style={styles.pointText}>{point}</Text>
            </View>
          ))}
        </View>
      </View>

      <PrimaryButton
        label={detail.ctaLabel}
        onPress={() => router.push(detail.ctaHref as never)}
      />
    </Screen>
  );
}

function BackHeader({ label }: { label: string }) {
  return (
    <Pressable onPress={() => router.back()} style={styles.backRow}>
      <Text style={styles.backArrow}>{"<"}</Text>
      <Text style={styles.backText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.md,
    paddingBottom: 144,
    gap: spacing.md,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: spacing.xs,
  },
  backArrow: {
    color: colors.text,
    fontSize: 20,
    lineHeight: 20,
    fontWeight: "500",
  },
  backText: {
    ...typography.title,
    color: colors.text,
    fontSize: 16,
  },
  heroCard: {
    borderRadius: 22,
    padding: 18,
    gap: 10,
    ...shadows.float,
  },
  kicker: {
    ...typography.label,
    color: colors.accent,
    letterSpacing: 0.8,
  },
  title: {
    ...typography.display,
    color: colors.surface,
    fontSize: 28,
    lineHeight: 32,
  },
  subtitle: {
    ...typography.body,
    color: colors.darkMuted,
  },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "800",
    color: colors.text,
  },
  sectionBody: {
    ...typography.body,
    color: colors.mutedText,
    lineHeight: 20,
  },
  points: {
    gap: 10,
  },
  pointRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  pointIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.softAccent,
  },
  pointText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: colors.mutedText,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  emptyTitle: {
    ...typography.title,
    color: colors.text,
    fontSize: 18,
  },
  emptyBody: {
    ...typography.body,
    color: colors.mutedText,
  },
});
