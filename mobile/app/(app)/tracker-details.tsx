import React, { useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Path } from "react-native-svg";
import { Screen } from "@/components/ui/Screen";
import { usePreviewSyncQuery } from "@/features/mobile-sync/hooks";
import { AppIcon } from "@/components/ui/AppIcon";
import { normalizeTrackerSummary } from "@/lib/data/tracker-summary";
import { colors, radii, shadows, spacing, typography } from "@/theme";

const submittedTrackerStatuses = new Set([
  "applied",
  "under_review",
  "recruiter_contacted",
  "shortlisted",
  "phone_interview",
  "video_interview",
  "face_to_face_interview",
  "interview_scheduled",
  "second_interview",
  "reference_check",
  "interview_completed",
  "offer_received",
  "offer",
  "hired",
  "rejected",
  "contacted",
  "interviewing",
]);

export default function TrackerDetailsScreen() {
  const { filter } = useLocalSearchParams<{ filter?: string }>();
  const activeFilter = filter || "Applied";
  const { data: snapshot, refetch } = usePreviewSyncQuery();
  const jobs = snapshot?.jobs ?? [];
  const summary = normalizeTrackerSummary(snapshot?.trackerSummary);
  const [screenshotMap, setScreenshotMap] = useState<Record<string, string>>({});

  React.useEffect(() => {
    AsyncStorage.getItem("job_screenshots_cache").then((data) => {
      if (data) {
        setScreenshotMap(JSON.parse(data));
      }
    });
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const toTimezoneDateKey = React.useCallback((isoString: string | null | undefined) => {
    if (!isoString) {
      return "";
    }

    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: snapshot?.profile?.timezone || "Australia/Melbourne",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(isoString));
    } catch {
      return isoString.slice(0, 10);
    }
  }, [snapshot?.profile?.timezone]);

  const applicationsByJobId = useMemo(() => {
    const mapped = new Map<string, {
      status?: string | null;
      application_date?: string | null;
      applied_at?: string | null;
      created_at: string;
      offer_received_at?: string | null;
      hired_at?: string | null;
    }>();
    (snapshot?.rawApplications ?? []).forEach((application) => {
      mapped.set(application.job_id, application);
    });
    return mapped;
  }, [snapshot?.rawApplications]);

  const todayApplicationJobIds = useMemo(() => {
    const todayKey = toTimezoneDateKey(new Date().toISOString());
    return new Set(
      (snapshot?.rawApplications ?? [])
        .filter((application) => {
          const submitted = submittedTrackerStatuses.has(application.status?.trim().toLowerCase() ?? "draft");
          if (!submitted) {
            return false;
          }

          const activityDate =
            application.application_date ??
            application.applied_at ??
            application.created_at;

          return toTimezoneDateKey(activityDate) === todayKey;
        })
        .map((application) => application.job_id),
    );
  }, [snapshot?.rawApplications, toTimezoneDateKey]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const rawApplication = applicationsByJobId.get(job.id);
      const normalizedStatus = rawApplication?.status?.trim().toLowerCase() ?? "";

      switch (activeFilter) {
        case "Applied":
          return job.isApplied;
        case "Applications Today":
          return job.isApplied && todayApplicationJobIds.has(job.id);
        case "Upcoming Interviews":
        case "Interviewing":
          return job.isApplied && ["phone_interview", "video_interview", "face_to_face_interview", "interview_scheduled", "second_interview", "reference_check"].includes(normalizedStatus);
        case "Offers Received":
        case "Offers":
          return job.isApplied && (normalizedStatus === "offer_received" || Boolean(rawApplication?.offer_received_at));
        case "Saved":
          return job.isSaved;
        case "Recruiter Contacted":
          return job.isApplied && normalizedStatus === "recruiter_contacted";
        case "Shortlisted":
          return job.isApplied && normalizedStatus === "shortlisted";
        case "Interview Completed":
          return job.isApplied && normalizedStatus === "interview_completed";
        case "Hired":
          return job.isApplied && (normalizedStatus === "hired" || Boolean(rawApplication?.hired_at));
        case "Rejected":
          return job.isApplied && normalizedStatus === "rejected";
        case "Follow-ups Due":
          return job.isApplied;
        case "Cold Emails Sent":
          return job.isApplied;
        case "Hiring Managers Contacted":
          return job.isApplied;
        default:
          return job.isApplied;
      }
    });
  }, [activeFilter, applicationsByJobId, jobs, todayApplicationJobIds]);

  const activeFocusText = useMemo(() => {
    switch (activeFilter) {
      case "Applications Today":
        return `${summary.applicationsToday} applications were logged today`;
      case "Upcoming Interviews":
      case "Interviewing":
        return `${summary.interviewing} roles are waiting on interview loops`;
      case "Offers Received":
      case "Offers":
        return `${summary.offers} competitive offers received`;
      case "Saved":
        return `${summary.saved} tracked opportunities saved for review`;
      case "Follow-ups Due":
        return `${summary.followupsDue} applications need active follow-up`;
      default:
        return summary.currentFocus?.message || "0 total roles currently in active track";
    }
  }, [activeFilter, summary]);

  const activeFilterDescription = useMemo(() => {
    switch (activeFilter) {
      case "Applied":
        return "Submitted applications synced from the admin panel.";
      case "Applications Today":
        return "Applications logged today in your synced tracker.";
      case "Upcoming Interviews":
      case "Interviewing":
        return "Roles currently moving through interview stages.";
      case "Offers Received":
      case "Offers":
        return "Offer-stage roles updated by your 9Jobs team.";
      case "Saved":
        return "Saved opportunities you can revisit anytime.";
      case "Recruiter Contacted":
        return "Applications with recruiter outreach or replies recorded by admin.";
      case "Shortlisted":
        return "Roles that have moved into a shortlist stage.";
      case "Interview Completed":
        return "Applications with completed interview loops.";
      case "Hired":
        return "Roles marked hired in your admin-managed pipeline.";
      case "Rejected":
        return "Applications closed with rejection outcomes.";
      case "Follow-ups Due":
        return "Applications that still need an action or follow-up.";
      case "Cold Emails Sent":
        return "Outreach records synced from admin cold-email activity.";
      case "Hiring Managers Contacted":
        return "Recruiter or hiring-manager contact activity logged by admin.";
      default:
        return "Live tracker details synced from the admin panel.";
    }
  }, [activeFilter]);

  const activeMetricValue = useMemo(() => {
    switch (activeFilter) {
      case "Applied":
        return summary.applied;
      case "Applications Today":
        return summary.applicationsToday;
      case "Upcoming Interviews":
      case "Interviewing":
        return summary.interviewing;
      case "Offers Received":
      case "Offers":
        return summary.offers;
      case "Saved":
        return summary.saved;
      case "Recruiter Contacted":
        return summary.recruiterContacted;
      case "Shortlisted":
        return summary.shortlisted;
      case "Interview Completed":
        return summary.interviewCompleted;
      case "Hired":
        return summary.hired;
      case "Rejected":
        return summary.rejected;
      case "Follow-ups Due":
        return summary.followupsDue;
      case "Cold Emails Sent":
        return summary.coldEmailsSent;
      case "Hiring Managers Contacted":
        return summary.hiringManagersContacted;
      default:
        return filteredJobs.length;
    }
  }, [activeFilter, filteredJobs.length, summary]);

  const lastSyncedLabel = summary.lastUpdatedAt ? toTimezoneDateKey(summary.lastUpdatedAt) : "Live";

  return (
    <Screen contentStyle={styles.content}>
      <BackHeader label="Tracker" />

      <View style={styles.heroCard}>
        <Text style={styles.title}>{activeFilter}</Text>
        <Text style={styles.subtitle}>{activeFilterDescription}</Text>

        <View style={styles.summaryGrid}>
          <View style={styles.metricCardPrimary}>
            <Text style={styles.metricCardValue}>{activeMetricValue}</Text>
            <Text style={styles.metricCardLabel}>Live synced records</Text>
          </View>
          <View style={styles.metricCardSecondary}>
            <Text style={styles.sideLabel}>Last synced</Text>
            <Text style={styles.sideValue}>{lastSyncedLabel}</Text>
            <Text style={styles.sideHint}>Updated from admin panel</Text>
          </View>
        </View>

        <View style={styles.focusCard}>
          <Text style={styles.focusLabel}>Current focus</Text>
          <Text style={styles.focusValue}>{activeFocusText}</Text>
        </View>
      </View>

      {filteredJobs.length > 0 ? (
        <View style={styles.cards}>
          {filteredJobs.map((job) => {
            const rawApplication = applicationsByJobId.get(job.id);
            const syncedDate =
              rawApplication?.application_date ??
              rawApplication?.applied_at ??
              rawApplication?.created_at;
            const hasScreenshot = Boolean(screenshotMap[job.id]);

            return (
              <View key={job.id} style={styles.detailCard}>
                <View style={styles.detailHeader}>
                  <View style={styles.detailCopy}>
                    <Text style={styles.detailTitle}>{job.title}</Text>
                    <Text style={styles.detailMeta}>{job.company} • {job.location}</Text>
                  </View>
                  <View
                    style={[
                      styles.stageBadge,
                      job.status === "offer" && styles.offerBadge,
                      job.status === "interviewing" && styles.interviewBadge,
                      job.status === "rejected" && styles.rejectedBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.stageBadgeText,
                        job.status === "offer" && styles.offerBadgeText,
                        job.status === "interviewing" && styles.interviewBadgeText,
                        job.status === "rejected" && styles.rejectedBadgeText,
                      ]}
                    >
                      {job.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.factGrid}>
                  <FactPill label="Match" value={`${job.matchScore ?? 0}%`} />
                  <FactPill label="Salary" value={job.salary || "N/A"} />
                  <FactPill label="Updated" value={syncedDate ? toTimezoneDateKey(syncedDate) : "Live"} />
                  <FactPill label="Screenshot" value={hasScreenshot ? "Attached" : "Pending"} />
                </View>

                <Text style={styles.description}>
                  {job.description || "Admin-managed tracker updates for this role appear here as soon as they sync."}
                </Text>

                {hasScreenshot ? (
                  <Image
                    source={{ uri: screenshotMap[job.id] }}
                    style={styles.screenshot}
                    resizeMode="cover"
                  />
                ) : null}

                <Pressable
                  style={styles.actionButton}
                  onPress={() => router.push(`/(app)/jobs/${job.id}`)}
                >
                  <Text style={styles.actionButtonText}>Open Full Role View</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <AppIcon name="tracker" size={28} color={colors.subtleText} />
          <Text style={styles.emptyTitle}>No synced details yet</Text>
          <Text style={styles.emptyBody}>
            Jaise hi admin panel se is metric ke under koi update save hoga, uski details yahin clean view mein dikh jayengi.
          </Text>
          <View style={styles.emptyInfoCard}>
            <Text style={styles.emptyInfoLabel}>Live sync source</Text>
            <Text style={styles.emptyInfoValue}>Admin panel tracker updates</Text>
          </View>
        </View>
      )}
    </Screen>
  );
}

function BackHeader({ label }: { label: string }) {
  return (
    <Pressable onPress={() => router.back()} style={styles.backRow}>
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
    </Pressable>
  );
}

function FactPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.factPill}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: spacing.xs,
  },
  backText: {
    ...typography.title,
    color: colors.text,
    fontSize: 16,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  title: {
    ...typography.display,
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    ...typography.body,
    color: colors.mutedText,
  },
  summaryGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "stretch",
  },
  metricCardPrimary: {
    flex: 1.1,
    backgroundColor: colors.dark,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 4,
    justifyContent: "center",
  },
  metricCardValue: {
    ...typography.display,
    color: colors.surface,
    fontSize: 32,
  },
  metricCardLabel: {
    ...typography.label,
    color: colors.accent,
    fontWeight: "700",
  },
  metricCardSecondary: {
    flex: 0.9,
    backgroundColor: colors.background,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 4,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  sideLabel: {
    ...typography.label,
    color: colors.subtleText,
    fontSize: 11,
  },
  sideValue: {
    ...typography.title,
    color: colors.text,
    fontSize: 18,
  },
  sideHint: {
    ...typography.body,
    color: colors.mutedText,
    fontSize: 11,
  },
  focusCard: {
    borderRadius: radii.md,
    padding: spacing.md,
    backgroundColor: "rgba(163, 230, 53, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(163, 230, 53, 0.2)",
    gap: 4,
  },
  focusLabel: {
    ...typography.label,
    color: colors.accent,
    fontWeight: "700",
  },
  focusValue: {
    ...typography.body,
    color: colors.text,
  },
  cards: {
    gap: spacing.md,
  },
  detailCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  detailCopy: {
    flex: 1,
    gap: 4,
  },
  detailTitle: {
    ...typography.title,
    color: colors.text,
    fontSize: 18,
  },
  detailMeta: {
    ...typography.body,
    color: colors.mutedText,
    fontSize: 12,
  },
  stageBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(10, 10, 8, 0.04)",
  },
  stageBadgeText: {
    ...typography.label,
    color: colors.subtleText,
    textTransform: "capitalize",
  },
  offerBadge: {
    backgroundColor: "rgba(163, 230, 53, 0.15)",
  },
  offerBadgeText: {
    color: colors.accentDark,
    fontWeight: "700",
  },
  interviewBadge: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
  },
  interviewBadgeText: {
    color: "#3B82F6",
    fontWeight: "700",
  },
  rejectedBadge: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
  },
  rejectedBadgeText: {
    color: "#EF4444",
    fontWeight: "700",
  },
  factGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  factPill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  factLabel: {
    ...typography.label,
    color: colors.subtleText,
    fontSize: 10,
  },
  factValue: {
    ...typography.label,
    color: colors.text,
    fontWeight: "700",
  },
  description: {
    ...typography.body,
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
  },
  screenshot: {
    width: "100%",
    height: 180,
    borderRadius: radii.md,
    backgroundColor: colors.background,
  },
  actionButton: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.dark,
  },
  actionButtonText: {
    ...typography.label,
    color: colors.accent,
    fontWeight: "700",
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: "center",
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
    textAlign: "center",
    lineHeight: 20,
  },
  emptyInfoCard: {
    marginTop: spacing.sm,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
    alignItems: "center",
    gap: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyInfoLabel: {
    ...typography.label,
    color: colors.subtleText,
  },
  emptyInfoValue: {
    ...typography.title,
    color: colors.text,
    fontSize: 14,
  },
});
