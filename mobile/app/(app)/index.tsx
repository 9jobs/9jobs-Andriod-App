import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View, Image, TextInput } from "react-native";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { AppIcon } from "@/components/ui/AppIcon";
import { Screen } from "@/components/ui/Screen";
import { colors, radii, spacing } from "@/theme";
import { useSession } from "@/providers/SessionProvider";
import { usePreviewSyncSelector } from "@/features/mobile-sync/hooks";
import { useJobFilters } from "@/features/jobs/useJobFilters";

import { AnimatedPressable } from "@/components/motion/AnimatedPressable";
import { FadeInView } from "@/components/motion/FadeInView";
import { CardFloatingParticles } from "@/components/motion/card-floating-particles";
import { RocketLaunchGlow } from "@/components/motion/rocket-launch-glow";
import { resolveHomeSearchDestination } from "@/lib/navigation/home-search-destination";
import { traceNavigation, useScreenPerf } from "@/lib/perf/livePerf";
import { TestBannerAd } from "@/components/ads/TestBannerAd";

export default function HomeScreen() {
  const { user } = useSession();
  const { data: profile } = usePreviewSyncSelector((snapshot) => snapshot.profile, true);
  const { data: metrics } = usePreviewSyncSelector((snapshot) => snapshot.homeMetrics, true);
  const { data: notifications } = usePreviewSyncSelector((snapshot) => snapshot.notifications, true);
  const { data: trackerInterviews } = usePreviewSyncSelector((snapshot) => snapshot.trackerInterviews, true);
  const { data: rawApplications } = usePreviewSyncSelector((snapshot) => snapshot.rawApplications, true);
  const jobFilters = useJobFilters();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const hasUnreadNotifications = notifications?.some((item) => item.unread) ?? false;
  useScreenPerf("/(app)", Boolean(profile && metrics && notifications && trackerInterviews && rawApplications), {
    screen: "home",
  });

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(new Date());
    }, 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

  const greetingText = useMemo(() => {
    const hour = currentTime.getHours();

    if (hour < 12) {
      return "Good morning 👋";
    }

    if (hour < 17) {
      return "Good afternoon 👋";
    }

    if (hour < 21) {
      return "Good evening 👋";
    }

    return "Good night 👋";
  }, [currentTime]);

  // 1. Calculate next upcoming interview
  const nextInterview = useMemo(() => {
    const interviews = trackerInterviews ?? [];
    const now = new Date();
    const upcoming = interviews
      .filter((int: any) => {
        if (!int.interview_date) return false;
        return new Date(int.interview_date).getTime() > now.getTime();
      })
      .sort((a: any, b: any) => new Date(a.interview_date).getTime() - new Date(b.interview_date).getTime());
    return upcoming[0] || null;
  }, [trackerInterviews]);

  // 2. Calculate countdown text
  const countdownInfo = useMemo(() => {
    if (!nextInterview) return null;
    const now = new Date();
    const target = new Date(nextInterview.interview_date);
    const diffMs = target.getTime() - now.getTime();
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) {
      return `${diffDays}d ${diffHours}h left`;
    } else if (diffHours > 0) {
      return `${diffHours}h left`;
    } else {
      return "Starting soon";
    }
  }, [nextInterview]);

  // 3. Calculate weekly progress
  const weeklyProgress = useMemo(() => {
    const apps = rawApplications ?? [];
    const goalText = profile?.weeklyGoal || "10";
    const goal = parseInt(goalText, 10) || 10;

    // Start of current week (Monday 00:00:00)
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(now.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);

    const appsThisWeek = apps.filter((app: any) => {
      const appDate = new Date(app.application_date ?? app.applied_at ?? app.created_at);
      return appDate >= startOfWeek;
    });

    const percentage = Math.min(100, Math.round((appsThisWeek.length / goal) * 100));

    return {
      appliedList: appsThisWeek,
      applied: appsThisWeek.length,
      goal,
      percentage,
    };
  }, [rawApplications, profile?.weeklyGoal]);

  function openSearchScreen() {
    const normalizedQuery = searchQuery.trim();
    jobFilters.setQuery(normalizedQuery);
    setSearchQuery("");
    router.push({
      pathname: "/(app)/jobs/search",
      params: normalizedQuery ? { query: normalizedQuery } : undefined,
    } as never);
  }

  return (
    <Screen scroll={true} contentStyle={styles.screenContent}>
      {/* 1. Header Row */}
      <FadeInView type="fade-down" delay={0}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greetingText}>{greetingText}</Text>
            <Text numberOfLines={2} style={styles.userNameText}>
              {profile?.fullName ?? user?.fullName ?? "Test User"}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <AnimatedPressable
              style={styles.bellButton}
              onPress={() => traceNavigation("/(app)/notifications", "home.notifications", () => router.push("/(app)/notifications" as never))}
              scaleTo={0.95}
            >
              <AppIcon name="bell" size={22} color={colors.text} />
              {hasUnreadNotifications ? <View style={styles.bellDot} /> : null}
            </AnimatedPressable>
            <Image
              source={{
                uri: profile?.avatarUrl ?? "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80",
              }}
              style={styles.avatarImage}
            />
          </View>
        </View>
      </FadeInView>

      {/* 2. Search Bar Row */}
      <FadeInView type="fade-up" delay={50}>
        <View style={styles.searchRow}>
          <Pressable style={styles.searchInputContainer} onPress={openSearchScreen}>
            <AppIcon name="search" size={20} color={colors.mutedText} />
            <TextInput
              value={searchQuery}
              editable={false}
              pointerEvents="none"
              placeholder="Search jobs, companies..."
              placeholderTextColor={colors.subtleText}
              style={styles.searchInput}
            />
          </Pressable>
          <AnimatedPressable
            style={styles.filterButton}
            onPress={openSearchScreen}
            scaleTo={0.94}
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
          </AnimatedPressable>
        </View>
      </FadeInView>

      {/* 3. Stat Cards Row */}
      <FadeInView type="fade-up" delay={100}>
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
      </FadeInView>

      {/* 4. Quick Action Grid Row */}
      <FadeInView type="fade-up" delay={150}>
        <View style={styles.quickActionRow}>
          <AnimatedPressable
            style={styles.quickActionCard}
            onPress={() => traceNavigation("/(app)/resume", "home.resume", () => router.push("/(app)/resume" as never))}
            scaleTo={0.96}
          >
            <AppIcon name="resume" size={24} color={colors.accent} />
            <Text style={styles.quickActionLabel}>Resume AI</Text>
          </AnimatedPressable>
          <AnimatedPressable
            style={styles.quickActionCard}
            onPress={() => traceNavigation("/(app)/outreach", "home.outreach", () => router.push("/(app)/outreach" as never))}
            scaleTo={0.96}
          >
            <AppIcon name="mail" size={24} color={colors.accent} />
            <Text style={styles.quickActionLabel}>Outreach</Text>
          </AnimatedPressable>
          <AnimatedPressable
            style={styles.quickActionCard}
            onPress={() => traceNavigation("/(app)/interview", "home.interview", () => router.push("/(app)/interview" as never))}
            scaleTo={0.96}
          >
            <AppIcon name="mic" size={24} color={colors.accent} />
            <Text style={styles.quickActionLabel}>Interview</Text>
          </AnimatedPressable>
          <AnimatedPressable
            style={styles.quickActionCard}
            onPress={() => traceNavigation("/(app)/services", "home.services", () => router.push("/(app)/services" as never))}
            scaleTo={0.96}
          >
            <AppIcon name="grid" size={24} color={colors.accent} />
            <Text style={styles.quickActionLabel}>Services</Text>
          </AnimatedPressable>
        </View>
      </FadeInView>

      {/* 5. Pro Tip Hero Card with Star Twinkle Background */}
      <FadeInView type="fade-up" delay={180}>
        <View style={styles.heroCardContainer}>
          {/* Background Twinkling Sparks */}
          <CardFloatingParticles />

          {/* Hero Content */}
          <View style={styles.heroBadgeContainer}>
            <Text style={styles.heroBadgeText}>PRO TIP</Text>
          </View>
          <Text style={styles.heroTitleText}>Your resume ranks in the top 3%</Text>
          <Text style={styles.heroSubtitleText}>
            Upgrade to Pro to activate Hiring Manager Outreach
          </Text>
          <AnimatedPressable
            style={styles.heroButton}
            onPress={() => router.push("/(app)/pricing" as never)}
            scaleTo={0.97}
          >
            <Text style={styles.heroButtonText}>Activate Hiring Manager Outreach →</Text>
          </AnimatedPressable>

          <RocketLaunchGlow />
        </View>
      </FadeInView>

      {/* 4.5. Tracker & Interview Highlights */}
      <FadeInView type="fade-up" delay={200}>
        <View style={styles.highlightsContainer}>
          {/* Interview Countdown Section */}
          <AnimatedPressable 
            style={styles.highlightCard} 
            onPress={() => router.push("/(app)/upcoming-interview" as never)}
            scaleTo={0.98}
          >
            <View style={styles.highlightHeader}>
              <View style={styles.highlightIconWrap}>
                <AppIcon name="mic" size={20} color={colors.accentDark} />
              </View>
              <View style={styles.highlightTitleWrap}>
                <Text style={styles.highlightTitle}>Upcoming Interview</Text>
                <Text numberOfLines={1} style={styles.highlightSubtitle}>
                  {nextInterview 
                    ? `${nextInterview.interview_round || "Round"} · ${nextInterview.interview_type || "Interview"}` 
                    : "No interviews scheduled yet"}
                </Text>
              </View>
              {nextInterview && countdownInfo ? (
                <View style={styles.countdownBadge}>
                  <Text style={styles.countdownText}>{countdownInfo}</Text>
                </View>
              ) : null}
            </View>
            {!nextInterview ? (
              <Text style={styles.highlightPlaceholderText}>
                Apply to recommended roles below to secure your next interview!
              </Text>
            ) : null}
          </AnimatedPressable>

          {/* Weekly Progress Section */}
          <AnimatedPressable 
            style={styles.highlightCard} 
            onPress={() => router.push("/(app)/weekly-progress" as never)}
            scaleTo={0.98}
          >
            <View style={styles.progressHeader}>
              <View style={styles.highlightIconWrap}>
                <AppIcon name="tracker" size={20} color={colors.accentDark} />
              </View>
              <View style={styles.progressTextWrap}>
                <Text style={styles.highlightTitle}>Weekly Progress</Text>
                <Text numberOfLines={1} style={styles.highlightSubtitle}>
                  Applied to {weeklyProgress.applied} of {weeklyProgress.goal} target jobs this week
                </Text>
              </View>
              <Text style={styles.progressPercentText}>{weeklyProgress.percentage}%</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarFill, { width: `${weeklyProgress.percentage}%` }]} />
            </View>
          </AnimatedPressable>
        </View>
      </FadeInView>

      <TestBannerAd />

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
    alignItems: "flex-start",
    marginTop: spacing.xs,
  },
  headerLeft: {
    gap: 4,
    flex: 1,
    minWidth: 0,
    paddingRight: spacing.md,
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
    lineHeight: 31,
    flexShrink: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 2,
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
    marginTop: 2,
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
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 0,
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
    paddingRight: 110,
  },
  heroSubtitleText: {
    color: colors.darkMuted,
    fontSize: 14,
    lineHeight: 20,
    paddingRight: 110,
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
  highlightsContainer: {
    gap: spacing.md,
  },
  highlightCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  highlightHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  highlightIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(13, 206, 6, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  highlightTitleWrap: {
    flex: 1,
    gap: 2,
  },
  highlightTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  highlightSubtitle: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "500",
  },
  countdownBadge: {
    backgroundColor: colors.softAccent,
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  countdownText: {
    color: colors.accentDark,
    fontSize: 11,
    fontWeight: "700",
  },
  highlightPlaceholderText: {
    color: colors.subtleText,
    fontSize: 12,
    fontStyle: "italic",
    paddingLeft: 48,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  progressTextWrap: {
    flex: 1,
    gap: 2,
  },
  progressPercentText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: "rgba(23, 24, 22, 0.05)",
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 2,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.accentDark,
    borderRadius: 4,
  },
});
