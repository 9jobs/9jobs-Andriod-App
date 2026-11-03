import { FigmaAsset } from "@/components/ui/FigmaAsset";
import { HomeMetricCard } from "@/components/ui/HomeMetricCard";
import { AppSearchResults } from "@/components/ui/AppSearchResults";
import Svg, { Circle, Path } from "react-native-svg";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View, TextInput } from "react-native";
import { router } from "expo-router";
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
        </View>
      </FadeInView>

      {/* 2. Search Bar Row */}
      <FadeInView type="fade" delay={40}>
        <View style={styles.searchRow}>
          <View style={styles.searchInputContainer}>
            <AppIcon name="search" size={22} color={colors.text} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={openSearchScreen}
              returnKeyType="search"
              accessibilityLabel="Search jobs and app sections"
              placeholder="Search jobs, companies..."
              placeholderTextColor={colors.subtleText}
              style={styles.searchInput}
            />
          </View>
          <AnimatedPressable
            style={styles.filterButton}
            onPress={openSearchScreen}
            scaleTo={0.94}
          >
            <Svg width={23} height={23} viewBox="0 0 24 24" fill="none">
              <Path d="M3 6h18M3 12h18M3 18h18" stroke={colors.accent} strokeWidth={1.8} strokeLinecap="round" />
              <Circle cx="9" cy="6" r="2.2" fill={colors.dark} stroke={colors.accent} strokeWidth={1.8} />
              <Circle cx="16" cy="12" r="2.2" fill={colors.dark} stroke={colors.accent} strokeWidth={1.8} />
              <Circle cx="11" cy="18" r="2.2" fill={colors.dark} stroke={colors.accent} strokeWidth={1.8} />
            </Svg>
          </AnimatedPressable>
        </View>
      </FadeInView>

      {/* 3. Stat Cards Row */}
      <AppSearchResults query={searchQuery} onSelect={() => setSearchQuery("")} />
      <FadeInView type="fade-up" delay={100}>
        <View style={styles.statsRow}>
          <HomeMetricCard label="Applications" value={metrics?.totalApplications ?? 0} delta={metrics?.todayApplied ?? 0} icon="Home-imgContainer2" tone="green" onPress={() => router.push("/(app)/tracker")} />
          <HomeMetricCard label="Interviews" value={metrics?.interviewing ?? 0} icon="Home-imgContainer3" tone="purple" onPress={() => router.push("/(app)/upcoming-interview")} />
          <HomeMetricCard label="Offers" value={metrics?.offers ?? 0} icon="Home-imgContainer4" tone="gold" onPress={() => router.push({pathname:"/(app)/tracker-details", params:{filter:"Offers"}} as never)} />
          <HomeMetricCard label="Resume Score" value={metrics?.resumeScore ?? 0} icon="Home-imgContainer5" tone="lime" onPress={() => router.push("/(app)/resume")} />
        </View>
      </FadeInView>

      {/* 4. Quick Action Grid Row */}
      <FadeInView type="fade-left" delay={80}>
        <View style={styles.quickActionRow}>
          <AnimatedPressable
            style={styles.quickActionCard}
            onPress={() => traceNavigation("/(app)/resume", "home.resume", () => router.push("/(app)/resume" as never))}
            scaleTo={0.96}
          >
            <View style={styles.actionIcon}><FigmaAsset name="Home-imgContainer6" /></View>
            <View style={styles.actionCopy}><Text style={styles.quickActionLabel}>Resume AI</Text><Text style={styles.actionSubtitle}>Smart tuning</Text></View>
          </AnimatedPressable>
          <AnimatedPressable
            style={styles.quickActionCard}
            onPress={() => traceNavigation("/(app)/outreach", "home.outreach", () => router.push("/(app)/outreach" as never))}
            scaleTo={0.96}
          >
            <View style={styles.actionIcon}><FigmaAsset name="Home-imgContainer7" /></View>
            <View style={styles.actionCopy}><Text style={styles.quickActionLabel}>Outreach</Text><Text style={styles.actionSubtitle}>Direct inbox</Text></View>
          </AnimatedPressable>
          <AnimatedPressable
            style={styles.quickActionCard}
            onPress={() => traceNavigation("/(app)/interview", "home.interview", () => router.push("/(app)/interview" as never))}
            scaleTo={0.96}
          >
            <View style={styles.actionIcon}><FigmaAsset name="Home-imgContainer8" /></View>
            <View style={styles.actionCopy}><Text style={styles.quickActionLabel}>Interview</Text><Text style={styles.actionSubtitle}>Mock prep</Text></View>
          </AnimatedPressable>
          <AnimatedPressable
            style={styles.quickActionCard}
            onPress={() => traceNavigation("/(app)/services", "home.services", () => router.push("/(app)/services" as never))}
            scaleTo={0.96}
          >
            <View style={styles.actionIcon}><FigmaAsset name="Home-imgContainer9" /></View>
            <View style={styles.actionCopy}><Text style={styles.quickActionLabel}>Services</Text><Text style={styles.actionSubtitle}>Full suite</Text></View>
          </AnimatedPressable>
        </View>
      </FadeInView>

      {/* 5. Pro Tip Hero Card with Star Twinkle Background */}
      <FadeInView type="fade-right" delay={60}>
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
            accessibilityRole="button"
            accessibilityLabel="Activate Hiring Manager Outreach"
          >
            <Text numberOfLines={1} style={styles.heroButtonText}>Activate Outreach</Text>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" accessible={false}>
              <Path d="M5 12h14m-6-6 6 6-6 6" stroke={colors.dark} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </AnimatedPressable>

          <View pointerEvents="none" style={styles.preservedRocket}><RocketLaunchGlow /></View>
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
                <FigmaAsset name="Home-imgContainer10" />
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
    paddingTop: 12,
    paddingBottom: 100,
    gap: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 0,
  },
  headerLeft: {
    gap: 0,
    flex: 1,
    minWidth: 0,
    paddingRight: spacing.md,
  },
  greetingText: {
    fontSize: 13,
    color: colors.mutedText,
    fontWeight: "400",

    lineHeight: 18,
   fontFamily: "Inter_400Regular" },
  userNameText: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.7,
    lineHeight: 34,
    flexShrink: 1,
   fontFamily: "PlusJakartaSans_700Bold" },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingTop: 0,
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceMuted,
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
    backgroundColor: "#BA1A1A",
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
    marginTop: 0,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 50,
    gap: 8,
  borderWidth: 1,
borderColor: colors.border,},
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 0,
   fontFamily: "Inter_400Regular" },
  filterButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.dark,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  borderWidth: 1,
borderColor: colors.softAccent,},
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,

    flexWrap: "wrap",
  },
  statCard: {
    flex: undefined,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 14,
    alignItems: "flex-start",
    gap: 3,

    width: "48%",
    flexGrow: 1,
    minHeight: 126,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#1B1C1B",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.025,
    shadowRadius: 8,
    elevation: 1,
  },
  statValue: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.text,

    lineHeight: 32,
    marginTop: 12,
    fontFamily: "PlusJakartaSans_700Bold",
    letterSpacing: -0.7,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.mutedText,

    lineHeight: 18,
   fontFamily: "Inter_500Medium" },
  statDelta: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.accentDark,
    marginTop: 0,

    position: "absolute",
    top: 19,
    right: 14,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 2,
    lineHeight: 14,
   fontFamily: "Inter_600SemiBold" },
  quickActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,

    flexWrap: "wrap",
  },
  quickActionCard: {
    flex: undefined,
    backgroundColor: colors.surface,
    borderRadius: 16,
    aspectRatio: undefined,
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 10,

    flexGrow: 1,
    width: "48%",
    minHeight: 72,
    padding: 12,
    flexDirection: "row",
  borderWidth: 1,
borderColor: colors.border,},
  quickActionLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",

    flexShrink: 1,
   fontFamily: "Inter_600SemiBold" },
  heroCardContainer: {
    backgroundColor: colors.dark,
    borderRadius: 16,
    padding: 24,
    position: "relative",
    overflow: "hidden",
    gap: 8,
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
    backgroundColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
  },
  heroBadgeText: {
    color: colors.dark,
    fontSize: 10,
    fontWeight: "700",
   fontFamily: "Inter_600SemiBold" },
  heroTitleText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.4,
    paddingRight: 80,

    lineHeight: 26,
   fontFamily: "PlusJakartaSans_700Bold" },
  heroSubtitleText: {
    color: "#CFD0CB",
    fontSize: 13,
    lineHeight: 20,
    paddingRight: 80,
   fontFamily: "Inter_400Regular" },
  heroButton: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,

    minHeight: 48,
    paddingHorizontal: 16,
  },
  heroButtonText: {
    color: colors.dark,
    fontSize: 14,
    fontWeight: "600",

    lineHeight: 20,
    flexShrink: 1,
    textAlign: "center",
   fontFamily: "Inter_600SemiBold" },
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
   fontFamily: "PlusJakartaSans_700Bold" },
  sectionAction: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.mutedText,
   fontFamily: "Inter_600SemiBold" },
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
   fontFamily: "PlusJakartaSans_700Bold" },
  cardCopy: {
    flex: 1,
    gap: 2,
  },
  jobTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
   fontFamily: "Inter_600SemiBold" },
  jobSubtitle: {
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: "500",
   fontFamily: "Inter_500Medium" },
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
   fontFamily: "Inter_600SemiBold" },
  cardBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  salaryText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
   fontFamily: "PlusJakartaSans_700Bold" },
  salaryPeriod: {
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: "500",
   fontFamily: "Inter_500Medium" },
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
   fontFamily: "Inter_600SemiBold" },
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
    gap: 24,
  },
  highlightCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 0,
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
    backgroundColor: colors.surfaceMuted,
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
    fontWeight: "600",
   fontFamily: "Inter_600SemiBold" },
  highlightSubtitle: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "500",

    lineHeight: 18,
   fontFamily: "Inter_500Medium" },
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
   fontFamily: "Inter_600SemiBold" },
  highlightPlaceholderText: {
    color: colors.mutedText,
    fontSize: 12,
    fontStyle: "normal",
    paddingLeft: 8,

    padding: 8,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    lineHeight: 18,
   fontFamily: "Inter_400Regular" },
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
    fontSize: 12,
    fontWeight: "800",

    backgroundColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
   fontFamily: "Inter_600SemiBold" },
  progressBarContainer: {
    height: 8,
    backgroundColor: "rgba(23, 24, 22, 0.05)",
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 2,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.accent,
    borderRadius: 4,
  },

  statIcon: {width: 30, height: 30, borderRadius: 9, backgroundColor: colors.surfaceMuted, alignItems: "center", justifyContent: "center"},
  actionIcon: {width: 34, height: 34, borderRadius: 17, backgroundColor: "transparent", alignItems: "center", justifyContent: "center"},
  actionCopy: {flex: 1, gap: 2},
  actionSubtitle: {fontSize: 11, lineHeight: 16, color: colors.mutedText, fontFamily: "Inter_400Regular" },
  preservedRocket: {
    position: "absolute",
    right: -12,
    top: -16,
    width: 140,
    height: 140,
    opacity: 0.85,
    transform: [{ scale: 0.65 }],
  },
});
