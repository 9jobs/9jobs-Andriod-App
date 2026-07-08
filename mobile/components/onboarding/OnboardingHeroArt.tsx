import { StyleSheet, Text, View } from "react-native";
import { colors, radii, shadows, spacing, typography } from "@/theme";

type OnboardingHeroArtProps = {
  score: number;
  tags: string[];
  framed?: boolean;
  compact?: boolean;
};

export function OnboardingHeroArt({
  score,
  tags,
  framed = false,
  compact = false,
}: OnboardingHeroArtProps) {
  const art = (
    <View style={[styles.phoneScreen, !framed && styles.heroOnlyScreen]}>
      {framed ? <View style={styles.dynamicIsland} /> : null}

      <View style={[styles.heroCanvas, !framed && styles.heroCanvasBare]}>
        <View style={[styles.resumeGlow, compact && styles.resumeGlowCompact]} />
        <View style={[styles.scoreBubble, compact && styles.scoreBubbleCompact]}>
          <Text style={styles.scoreText}>{score}</Text>
        </View>

        <View style={[styles.resumeCard, compact && styles.resumeCardCompact]}>
          <View style={styles.resumeHeader}>
            <View style={styles.avatar} />
            <View style={styles.resumeHeaderLines}>
              <View style={styles.headerLinePrimary} />
              <View style={styles.headerLineSecondary} />
            </View>
          </View>

          <View style={styles.resumeBody}>
            <View style={styles.bodyLineStrong} />
            <View style={styles.bodyLine} />
            <View style={styles.bodyLine} />
            <View style={[styles.bodyLine, styles.bodyLineShort]} />
          </View>

          <View style={styles.tagRow}>
            {tags.map((tag) => (
              <View key={tag} style={styles.miniTag}>
                <Text style={styles.miniTagLabel}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );

  if (!framed) {
    return <View style={[styles.heroOnlyWrap, compact && styles.heroOnlyWrapCompact]}>{art}</View>;
  }

  return (
    <View style={styles.phoneShell}>
      {art}
    </View>
  );
}

const styles = StyleSheet.create({
  heroOnlyWrap: {
    width: 280,
    alignSelf: "center",
  },
  heroOnlyWrapCompact: {
    width: 232,
  },
  phoneShell: {
    width: 304,
    height: 612,
    borderRadius: 42,
    backgroundColor: colors.deviceShell,
    padding: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    ...shadows.float,
  },
  phoneScreen: {
    flex: 1,
    borderRadius: 36,
    overflow: "hidden",
    backgroundColor: colors.heroSurface,
  },
  heroOnlyScreen: {
    minHeight: 320,
    borderRadius: 32,
  },
  dynamicIsland: {
    alignSelf: "center",
    marginTop: 14,
    width: 92,
    height: 26,
    borderRadius: 16,
    backgroundColor: "#040404",
  },
  heroCanvas: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 116,
  },
  heroCanvasBare: {
    minHeight: 320,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  resumeGlow: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: colors.glow,
    opacity: 0.45,
    transform: [{ translateY: 36 }],
  },
  resumeGlowCompact: {
    width: 176,
    height: 176,
    borderRadius: 88,
    transform: [{ translateY: 26 }],
  },
  scoreBubble: {
    position: "absolute",
    top: 132,
    right: 50,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.soft,
  },
  scoreBubbleCompact: {
    top: 22,
    right: 24,
  },
  scoreText: {
    ...typography.title,
    fontSize: 15,
    color: colors.text,
  },
  resumeCard: {
    width: 184,
    borderRadius: 22,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    gap: spacing.md,
    transform: [{ rotate: "1.7deg" }],
    ...shadows.float,
  },
  resumeCardCompact: {
    width: 156,
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  resumeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accent,
  },
  resumeHeaderLines: {
    gap: 6,
  },
  headerLinePrimary: {
    width: 78,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.text,
  },
  headerLineSecondary: {
    width: 54,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#A7A89F",
  },
  resumeBody: {
    gap: 8,
  },
  bodyLineStrong: {
    width: "100%",
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.text,
  },
  bodyLine: {
    width: "88%",
    height: 5,
    borderRadius: 999,
    backgroundColor: "#C7C5BC",
  },
  bodyLineShort: {
    width: "62%",
  },
  tagRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: spacing.xs,
  },
  miniTag: {
    minHeight: 20,
    paddingHorizontal: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.softAccent,
    alignItems: "center",
    justifyContent: "center",
  },
  miniTagLabel: {
    ...typography.label,
    fontSize: 9,
    lineHeight: 12,
    color: colors.accentDark,
  },
});
