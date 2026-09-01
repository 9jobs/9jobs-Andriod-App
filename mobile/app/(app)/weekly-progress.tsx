import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { Screen } from "@/components/ui/Screen";
import { AppIcon } from "@/components/ui/AppIcon";
import { AnimatedPressable } from "@/components/motion/AnimatedPressable";
import { usePreviewSyncSelector } from "@/features/mobile-sync/hooks";
import { colors, radii, spacing } from "@/theme";

export default function WeeklyProgressScreen() {
  const { data: profile } = usePreviewSyncSelector((snapshot) => snapshot.profile, true);
  const { data: rawApplications } = usePreviewSyncSelector((snapshot) => snapshot.rawApplications, true);

  const weeklyProgress = useMemo(() => {
    const apps = rawApplications ?? [];
    const goalText = profile?.weeklyGoal || "10";
    const goal = parseInt(goalText, 10) || 10;

    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(now.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);

    const appsThisWeek = apps.filter((app) => {
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
  }, [profile?.weeklyGoal, rawApplications]);

  return (
    <Screen scroll={false} contentStyle={styles.screenContent}>
      <BackHeader label="Back" />

      <View style={styles.titleRow}>
        <View style={styles.titleIconWrap}>
          <AppIcon name="tracker" size={22} color={colors.accentDark} />
        </View>
        <Text style={styles.title}>Weekly Progress</Text>
      </View>

      <View style={styles.progressSummaryBox}>
        <Text style={styles.summaryBoxText}>
          Applied to {weeklyProgress.applied} of {weeklyProgress.goal} target jobs this week
        </Text>
        <View style={styles.progressBarContainer}>
          <View
            style={[styles.progressBarFill, { width: `${weeklyProgress.percentage}%` }]}
          />
        </View>
        <Text style={styles.summaryPercentText}>{weeklyProgress.percentage}% Complete</Text>
      </View>

      <Text style={styles.sectionTitle}>Applications Submitted This Week</Text>

      {weeklyProgress.appliedList.length > 0 ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {weeklyProgress.appliedList.map((app, idx) => {
            const appMeta = app as typeof app & {
              job_title?: string | null;
              company_name?: string | null;
            };

            return (
              <View key={app.id || idx} style={styles.appItem}>
                <View style={styles.appIconWrap}>
                  <AppIcon name="briefcase" size={16} color={colors.accentDark} />
                </View>
                <View style={styles.appCopy}>
                  <Text numberOfLines={1} style={styles.appTitle}>
                    {appMeta.job_title || "Job Application"}
                  </Text>
                  <Text numberOfLines={1} style={styles.appCompany}>
                    {appMeta.company_name || "Company"}
                  </Text>
                </View>
                <View style={styles.appStatusBadge}>
                  <Text style={styles.appStatusText}>{app.status || "applied"}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <AppIcon name="tracker" size={28} color={colors.accentDark} />
          </View>
          <Text style={styles.emptyStateText}>No applications this week yet.</Text>
          <Text style={styles.emptyStateSubtext}>
            Track new applications using the Job Tracker screen!
          </Text>
        </View>
      )}
    </Screen>
  );
}

function BackHeader({ label }: { label: string }) {
  return (
    <AnimatedPressable onPress={() => router.back()} style={styles.backRow} scaleTo={0.96}>
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
        <Path
          d="M19 12H5M5 12L12 19M5 12L12 5"
          stroke={colors.text}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      <Text style={styles.backText}>{label}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 40,
    flex: 1,
    gap: spacing.md,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  titleIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(13, 206, 6, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  progressSummaryBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 16,
    gap: 10,
  },
  summaryBoxText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: "rgba(23, 24, 22, 0.05)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.accentDark,
    borderRadius: 4,
  },
  summaryPercentText: {
    color: colors.accentDark,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  appItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  appIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(13, 206, 6, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  appCopy: {
    flex: 1,
    gap: 2,
  },
  appTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  appCompany: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "500",
  },
  appStatusBadge: {
    backgroundColor: colors.softAccent,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  appStatusText: {
    color: colors.accentDark,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 80,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(13, 206, 6, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyStateText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyStateSubtext: {
    color: colors.mutedText,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
});
