import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View, Image, Animated } from "react-native";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { AppIcon } from "@/components/ui/AppIcon";
import { Screen } from "@/components/ui/Screen";
import { colors, radii, spacing } from "@/theme";
import { useSession } from "@/providers/SessionProvider";
import { usePreviewSyncQuery } from "@/features/mobile-sync/hooks";
import { useApplyMutation } from "@/features/jobs/hooks";

// Twinkling Spark component for background stars animation
function TwinklingSpark({ style }: { style: any }) {
  const opacity = useRef(new Animated.Value(Math.random())).current;

  useEffect(() => {
    const startTwinkle = () => {
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.15 + Math.random() * 0.85,
          duration: 800 + Math.random() * 1500,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.05 + Math.random() * 0.2,
          duration: 800 + Math.random() * 1500,
          useNativeDriver: true,
        }),
      ]).start(() => startTwinkle());
    };

    startTwinkle();
  }, [opacity]);

  return <Animated.View style={[style, { opacity }]} />;
}

export default function HomeScreen() {
  const { user } = useSession();
  const { data: snapshot } = usePreviewSyncQuery();
  const profile = snapshot?.profile;
  const metrics = snapshot?.homeMetrics;
  const recommendedJobs = snapshot?.jobs.slice(0, 3) ?? [];
  const applyMutation = useApplyMutation();

  return (
    <Screen scroll={true} contentStyle={styles.screenContent}>
      {/* 1. Header Row */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greetingText}>Good morning 👋</Text>
          <Text style={styles.userNameText}>{profile?.fullName ?? user?.fullName ?? "Test User"}</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable
            style={styles.bellButton}
            onPress={() => router.push("/(app)/notifications" as never)}
          >
            <AppIcon name="bell" size={22} color={colors.text} />
            <View style={styles.bellDot} />
          </Pressable>
          <Image
            source={{
              uri: profile?.avatarUrl ?? "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80",
            }}
            style={styles.avatarImage}
          />
        </View>
      </View>

      {/* 2. Search Bar Row */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputContainer}>
          <AppIcon name="search" size={20} color={colors.mutedText} />
          <Text style={styles.searchPlaceholderText}>Search jobs, companies...</Text>
        </View>
        <Pressable
          style={styles.filterButton}
          onPress={() => router.push("/(app)/jobs/search" as never)}
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path
              d="M4 6H20L14 12V18L10 20V12L4 6Z"
              stroke={colors.accent}
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>
      </View>

      {/* 3. Stat Cards Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{String(metrics?.totalApplications ?? 0)}</Text>
          <Text style={styles.statLabel}>Applications</Text>
          <Text style={styles.statDelta}>+{metrics?.todayApplied ?? 0}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{String(metrics?.interviewing ?? 0)}</Text>
          <Text style={styles.statLabel}>Interviews</Text>
          <Text style={styles.statDelta}>Live</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{String(metrics?.offers ?? 0)}</Text>
          <Text style={styles.statLabel}>Offers</Text>
          <Text style={styles.statDelta}>Live</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{String(metrics?.resumeScore ?? 0)}</Text>
          <Text style={styles.statLabel}>Resume Score</Text>
          <Text style={[styles.statDelta, { color: "#22C55E" }]}>Live</Text>
        </View>
      </View>

      {/* 4. Quick Action Grid Row */}
      <View style={styles.quickActionRow}>
        <Pressable
          style={styles.quickActionCard}
          onPress={() => router.push("/(app)/resume" as never)}
        >
          <AppIcon name="resume" size={24} color={colors.accent} />
          <Text style={styles.quickActionLabel}>Resume AI</Text>
        </Pressable>
        <Pressable
          style={styles.quickActionCard}
          onPress={() => router.push("/(app)/outreach" as never)}
        >
          <AppIcon name="mail" size={24} color={colors.accent} />
          <Text style={styles.quickActionLabel}>Outreach</Text>
        </Pressable>
        <Pressable
          style={styles.quickActionCard}
          onPress={() => router.push("/(app)/interview" as never)}
        >
          <AppIcon name="mic" size={24} color={colors.accent} />
          <Text style={styles.quickActionLabel}>Interview</Text>
        </Pressable>
        <Pressable
          style={styles.quickActionCard}
          onPress={() => router.push("/(app)/services" as never)}
        >
          <AppIcon name="grid" size={24} color={colors.accent} />
          <Text style={styles.quickActionLabel}>Services</Text>
        </Pressable>
      </View>

      {/* 5. Pro Tip Hero Card with Star Twinkle Background */}
      <View style={styles.heroCardContainer}>
        {/* Background Twinkling Sparks */}
        <View style={StyleSheet.absoluteFill}>
          {Array.from({ length: 18 }).map((_, index) => (
            <TwinklingSpark
              key={index}
              style={[
                styles.heroSpark,
                {
                  top: `${10 + (index * 7) % 80}%`,
                  left: `${5 + (index * 19) % 90}%`,
                },
              ]}
            />
          ))}
        </View>

        {/* Hero Content */}
        <View style={styles.heroBadgeContainer}>
          <Text style={styles.heroBadgeText}>PRO TIP</Text>
        </View>
        <Text style={styles.heroTitleText}>Your resume ranks in top 3%</Text>
        <Text style={styles.heroSubtitleText}>
          Upgrade to Pro to unlock personalized recruiter outreach
        </Text>
        <Pressable
          style={styles.heroButton}
          onPress={() => router.push("/(app)/pricing" as never)}
        >
          <Text style={styles.heroButtonText}>Unlock Outreach →</Text>
        </Pressable>
      </View>

      {/* 6. Recommended Roles Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recommended</Text>
        <Text
          style={styles.sectionAction}
          onPress={() => router.push("/(app)/jobs/search" as never)}
        >
          See all →
        </Text>
      </View>

      <View style={styles.jobStack}>
        {recommendedJobs.map((job) => (
          <View key={job.id} style={styles.recommendedCard}>
            <View style={styles.cardTopRow}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarLetter}>{job.company.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.cardCopy}>
                <Text style={styles.jobTitle}>{job.title}</Text>
                <Text style={styles.jobSubtitle}>
                  {job.company} · {job.location}
                </Text>
              </View>
              <View style={styles.matchBadge}>
                <Text style={styles.matchText}>Match {job.matchScore}%</Text>
              </View>
            </View>

            <View style={styles.cardBottomRow}>
              <Text style={styles.salaryText}>
                {job.salary.split("/")[0]}
                <Text style={styles.salaryPeriod}>/yr</Text>
              </Text>
              <Pressable
                style={[styles.applyButton, job.isApplied && styles.appliedButton]}
                onPress={() => {
                  if (!job.isApplied) {
                    applyMutation.mutate(job.id);
                  }
                }}
                disabled={job.isApplied || applyMutation.isPending}
              >
                <Text style={[styles.applyButtonText, job.isApplied && styles.appliedButtonText]}>
                  {job.isApplied ? "Applied" : "Apply →"}
                </Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 100,
    gap: spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xs,
  },
  headerLeft: {
    gap: 4,
  },
  greetingText: {
    fontSize: 14,
    color: colors.mutedText,
    fontWeight: "500",
  },
  userNameText: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(23, 24, 22, 0.05)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  bellDot: {
    position: "absolute",
    top: 11,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.border,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(23, 24, 22, 0.04)",
    borderRadius: radii.md,
    paddingHorizontal: 16,
    height: 48,
    gap: 10,
  },
  searchPlaceholderText: {
    fontSize: 15,
    color: colors.subtleText,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.dark,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 12,
    alignItems: "flex-start",
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.mutedText,
  },
  statDelta: {
    fontSize: 11,
    fontWeight: "700",
    color: "#22C55E",
    marginTop: 2,
  },
  quickActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: colors.dark,
    borderRadius: 20,
    aspectRatio: 1.05,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  quickActionLabel: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: "700",
  },
  heroCardContainer: {
    backgroundColor: colors.dark,
    borderRadius: radii.xl,
    padding: 24,
    position: "relative",
    overflow: "hidden",
    gap: 12,
  },
  heroSpark: {
    position: "absolute",
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 4,
  },
  heroBadgeContainer: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(163, 230, 53, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  heroBadgeText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "800",
  },
  heroTitleText: {
    color: colors.surface,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  heroSubtitleText: {
    color: colors.darkMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  heroButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  heroButtonText: {
    color: colors.dark,
    fontSize: 16,
    fontWeight: "800",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
  },
  sectionAction: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.mutedText,
  },
  jobStack: {
    gap: spacing.md,
  },
  recommendedCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 16,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  cardCopy: {
    flex: 1,
    gap: 2,
  },
  jobTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  jobSubtitle: {
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: "500",
  },
  matchBadge: {
    backgroundColor: colors.softAccent,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  matchText: {
    color: colors.accentDark,
    fontSize: 11,
    fontWeight: "700",
  },
  cardBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  salaryText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  salaryPeriod: {
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: "500",
  },
  applyButton: {
    backgroundColor: colors.dark,
    borderRadius: radii.pill,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  applyButtonText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "800",
  },
  appliedButton: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.pill,
  },
  appliedButtonText: {
    color: colors.mutedText,
  },
});
