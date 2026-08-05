import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { Screen } from "@/components/ui/Screen";
import { AppIcon } from "@/components/ui/AppIcon";
import { AnimatedPressable } from "@/components/motion/AnimatedPressable";
import { usePreviewSyncQuery } from "@/features/mobile-sync/hooks";
import { colors, radii, spacing } from "@/theme";

function formatInterviewDate(dateString: string) {
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return dateString;
  }
}

function getCountdownText(interviewDate: string) {
  const now = new Date();
  const target = new Date(interviewDate);
  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (diffDays > 0) {
    return `${diffDays}d ${diffHours}h left`;
  }
  if (diffHours > 0) {
    return `${diffHours}h left`;
  }
  return "Starting soon";
}

export default function UpcomingInterviewScreen() {
  const { data: snapshot } = usePreviewSyncQuery(true);

  const upcomingInterviews = useMemo(() => {
    const interviews = snapshot?.trackerInterviews ?? [];
    const now = new Date();
    return interviews
      .filter((int) => {
        if (!int.interview_date) return false;
        return new Date(int.interview_date).getTime() > now.getTime();
      })
      .sort(
        (a, b) =>
          new Date(a.interview_date).getTime() - new Date(b.interview_date).getTime(),
      );
  }, [snapshot?.trackerInterviews]);

  return (
    <Screen scroll={false} contentStyle={styles.screenContent}>
      <BackHeader label="Back" />

      <View style={styles.titleRow}>
        <View style={styles.titleIconWrap}>
          <AppIcon name="mic" size={22} color={colors.accentDark} />
        </View>
        <Text style={styles.title}>Upcoming Interview</Text>
      </View>

      {upcomingInterviews.length > 0 ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {upcomingInterviews.map((interview, index) => {
            const countdown = getCountdownText(interview.interview_date);
            return (
              <View key={interview.id} style={styles.interviewCard}>
                {upcomingInterviews.length > 1 ? (
                  <Text style={styles.interviewIndex}>Interview {index + 1}</Text>
                ) : null}

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>ROUND</Text>
                  <Text style={styles.detailValue}>
                    {interview.interview_round || "Round Detail"}
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>DATE & TIME</Text>
                  <Text style={styles.detailValue}>
                    {formatInterviewDate(interview.interview_date)}
                  </Text>
                  <View style={styles.countdownBadge}>
                    <Text style={styles.countdownText}>{countdown}</Text>
                  </View>
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>INTERVIEW TYPE</Text>
                  <Text style={[styles.detailValue, styles.capitalize]}>
                    {interview.interview_type || "Video"}
                  </Text>
                </View>

                {interview.status ? (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>STATUS</Text>
                    <Text style={[styles.detailValue, styles.capitalize]}>
                      {interview.status.replace(/_/g, " ")}
                    </Text>
                  </View>
                ) : null}

                {interview.interviewer_name ? (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>INTERVIEWER</Text>
                    <Text style={styles.detailValue}>{interview.interviewer_name}</Text>
                  </View>
                ) : null}

                {interview.interviewer_email ? (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>INTERVIEWER EMAIL</Text>
                    <Text style={styles.detailValue}>{interview.interviewer_email}</Text>
                  </View>
                ) : null}

                {interview.meeting_link ? (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>MEETING LINK</Text>
                    <Text style={[styles.detailValue, styles.linkText]}>
                      {interview.meeting_link}
                    </Text>
                  </View>
                ) : null}

                {interview.location ? (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>LOCATION</Text>
                    <Text style={styles.detailValue}>{interview.location}</Text>
                  </View>
                ) : null}

                {interview.admin_notes ? (
                  <View style={[styles.detailItem, styles.detailItemLast]}>
                    <Text style={styles.detailLabel}>ADMIN NOTES</Text>
                    <Text style={[styles.detailValue, styles.notesText]}>
                      {interview.admin_notes}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <AppIcon name="mic" size={28} color={colors.accentDark} />
          </View>
          <Text style={styles.emptyStateText}>No scheduled interviews at the moment.</Text>
          <Text style={styles.emptyStateSubtext}>
            Apply to recommended roles on the home screen to secure your next interview!
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  interviewCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 0,
  },
  interviewIndex: {
    color: colors.accentDark,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  detailItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 4,
  },
  detailItemLast: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    color: colors.mutedText,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  detailValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  capitalize: {
    textTransform: "capitalize",
  },
  linkText: {
    color: "#2563EB",
  },
  notesText: {
    fontSize: 13,
    fontStyle: "italic",
  },
  countdownBadge: {
    alignSelf: "flex-start",
    marginTop: 6,
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
