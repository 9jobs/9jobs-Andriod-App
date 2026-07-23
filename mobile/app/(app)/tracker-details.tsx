import React, { useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Path } from "react-native-svg";
import { Screen } from "@/components/ui/Screen";
import { usePreviewSyncQuery } from "@/features/mobile-sync/hooks";
import { AppIcon } from "@/components/ui/AppIcon";
import type { MobileSyncSnapshot } from "@/lib/data/mobile-sync-repository";
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
  const [beforeScreenshotMap, setBeforeScreenshotMap] = useState<Record<string, string>>({});
  const [afterScreenshotMap, setAfterScreenshotMap] = useState<Record<string, string>>({});

  React.useEffect(() => {
    AsyncStorage.getItem("job_screenshots_cache").then((data) => {
      if (data) {
        setScreenshotMap(JSON.parse(data));
      }
    });
    AsyncStorage.getItem("job_screenshots_before_cache").then((data) => {
      if (data) {
        setBeforeScreenshotMap(JSON.parse(data));
      }
    });
    AsyncStorage.getItem("job_screenshots_after_cache").then((data) => {
      if (data) {
        setAfterScreenshotMap(JSON.parse(data));
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
      id: number;
      status?: string | null;
      application_date?: string | null;
      applied_at?: string | null;
      created_at: string;
      offer_received_at?: string | null;
      hired_at?: string | null;
      before_screenshot_url?: string | null;
      after_screenshot_url?: string | null;
    }>();
    (snapshot?.rawApplications ?? []).forEach((application) => {
      mapped.set(application.job_id, application);
    });
    return mapped;
  }, [snapshot?.rawApplications]);

  const applicationsById = useMemo(() => {
    const mapped = new Map<number, MobileSyncSnapshot["rawApplications"][number]>();
    (snapshot?.rawApplications ?? []).forEach((application) => {
      mapped.set(application.id, application);
    });
    return mapped;
  }, [snapshot?.rawApplications]);

  const jobsById = useMemo(() => new Map(jobs.map((job) => [job.id, job])), [jobs]);
  const applicationScreenshotMap = useMemo(() => {
    const mapped = new Map<number, { before?: string; after?: string }>();

    (snapshot?.trackerActivityLogs ?? []).forEach((activity) => {
      if (!activity.application_id || !activity.new_value) {
        return;
      }

      const nextValue = activity.new_value as Record<string, unknown>;
      const beforeScreenshot = typeof nextValue.before_screenshot_url === "string" ? nextValue.before_screenshot_url : "";
      const afterScreenshot = typeof nextValue.after_screenshot_url === "string" ? nextValue.after_screenshot_url : "";

      if (!beforeScreenshot && !afterScreenshot) {
        return;
      }

      const current = mapped.get(activity.application_id) || {};
      mapped.set(activity.application_id, {
        before: current.before || beforeScreenshot || undefined,
        after: current.after || afterScreenshot || undefined,
      });
    });

    return mapped;
  }, [snapshot?.trackerActivityLogs]);

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
    const matchingJobs = jobs.filter((job) => {
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
          return false;
        case "Cold Emails Sent":
          return false;
        case "Hiring Managers Contacted":
          return false;
        default:
          return job.isApplied;
      }
    });

    return matchingJobs.sort((left, right) => {
      const leftApplication = applicationsByJobId.get(left.id);
      const rightApplication = applicationsByJobId.get(right.id);
      const leftDate = new Date(leftApplication?.application_date ?? leftApplication?.applied_at ?? leftApplication?.created_at ?? 0).getTime();
      const rightDate = new Date(rightApplication?.application_date ?? rightApplication?.applied_at ?? rightApplication?.created_at ?? 0).getTime();
      return rightDate - leftDate;
    });
  }, [activeFilter, applicationsByJobId, jobs, todayApplicationJobIds]);

  const detailEntries = useMemo(() => {
    if (activeFilter === "Follow-ups Due") {
      return (snapshot?.trackerFollowUps ?? [])
        .filter((item) => item.status?.toLowerCase() !== "completed")
        .map((item) => {
          const application = applicationsById.get(item.application_id);
          const job = application ? jobsById.get(application.job_id) : undefined;
          return {
            id: `follow-up-${item.id}`,
            type: "follow-up" as const,
            title: item.contact_person?.trim() || job?.title || "Follow-up",
            subtitle: [job?.company, item.contact_email?.trim()].filter(Boolean).join(" • "),
            badge: item.status || "pending",
            timestamp: item.due_date,
            message: item.notes?.trim() || item.message?.trim() || "Admin panel follow-up note synced here.",
            facts: [
              { label: "Type", value: item.follow_up_type?.trim() || "email" },
              { label: "Due", value: item.due_date ? toTimezoneDateKey(item.due_date) : "Live" },
              { label: "Role", value: job?.title || "Linked application" },
              { label: "Company", value: job?.company || "9Jobs Tracker" },
            ],
          };
        });
    }

    if (activeFilter === "Cold Emails Sent") {
      return (snapshot?.trackerColdEmails ?? []).map((item) => {
        const application = item.application_id ? applicationsById.get(item.application_id) : undefined;
        const job = application ? jobsById.get(application.job_id) : undefined;
        const companyName = item.company_name?.trim() || job?.company || "Company";
        return {
          id: `cold-email-${item.id}`,
          type: "cold-email" as const,
          title: item.recipient_name?.trim() || item.recipient_email?.trim() || "Hiring Team",
          subtitle: companyName,
          badge: item.delivery_status || "sent",
          timestamp: item.sent_at,
          emailSubject: item.subject?.trim() || "Cold outreach",
          emailTo: item.recipient_email?.trim() || "No recipient email",
          emailBody: item.message?.trim() || "Cold email content synced from admin panel.",
          facts: [
            { label: "Sent", value: item.sent_at ? toTimezoneDateKey(item.sent_at) : "Live" },
            { label: "Response", value: item.response_status?.trim() || "no_response" },
            { label: "Role", value: job?.title || "Direct outreach" },
            { label: "Company", value: companyName },
          ],
        };
      });
    }

    if (activeFilter === "Recruiter Contacted" || activeFilter === "Hiring Managers Contacted") {
      return (snapshot?.trackerRecruiterContacts ?? []).map((item) => {
        const application = item.application_id ? applicationsById.get(item.application_id) : undefined;
        const job = application ? jobsById.get(application.job_id) : undefined;
        return {
          id: `contact-${item.id}`,
          type: "contact" as const,
          title: item.recruiter_name?.trim() || "Hiring Manager",
          subtitle: item.company_name?.trim() || job?.company || "Company",
          badge: item.response_status || "no_response",
          timestamp: item.contact_date,
          message: item.notes?.trim() || item.email?.trim() || "Recruiter contact synced from admin panel.",
          facts: [
            { label: "Email", value: item.email?.trim() || "Not added" },
            { label: "Role", value: job?.title || "Linked application" },
            { label: "Date", value: item.contact_date ? toTimezoneDateKey(item.contact_date) : "Live" },
            { label: "Status", value: item.response_status?.trim() || "no_response" },
          ],
        };
      });
    }

    return [];
  }, [
    activeFilter,
    applicationsById,
    jobsById,
    snapshot?.trackerColdEmails,
    snapshot?.trackerFollowUps,
    snapshot?.trackerRecruiterContacts,
    toTimezoneDateKey,
  ]);

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
  const isColdEmailView = activeFilter === "Cold Emails Sent";

  return (
    <Screen contentStyle={styles.content}>
      <BackHeader label="Tracker" />

      {isColdEmailView ? (
        <View style={styles.emailScreenHeader}>
          <Text style={styles.title}>Cold Emails</Text>
          <Text style={styles.subtitle}>Admin panel se bheje gaye emails yahan direct mail format me dikhte hain.</Text>
          <Text style={styles.emailHeaderMeta}>
            {activeMetricValue} email synced • {lastSyncedLabel}
          </Text>
        </View>
      ) : (
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
      )}

      {detailEntries.length > 0 ? (
        <View style={styles.cards}>
          {detailEntries.map((entry) => (
            entry.type === "cold-email" ? (
              <View key={entry.id} style={styles.emailThreadCard}>
                <View style={styles.emailThreadTop}>
                  <View style={styles.detailCopy}>
                    <Text style={styles.emailSubject}>{entry.emailSubject}</Text>
                    <Text style={styles.detailMeta}>To: {entry.emailTo}</Text>
                    <Text style={styles.detailMeta}>{entry.title}{entry.subtitle ? ` • ${entry.subtitle}` : ""}</Text>
                  </View>
                  <Text style={styles.emailDate}>{entry.timestamp ? toTimezoneDateKey(entry.timestamp) : "Live"}</Text>
                </View>

                <View style={styles.emailBodyCard}>
                  <Text style={styles.emailGreeting}>Hi {entry.title},</Text>
                  <Text style={styles.emailBodyText}>{entry.emailBody}</Text>
                </View>

                <Text style={styles.syncedHint}>
                  {entry.badge ? `${entry.badge} • ` : ""}Synced from admin panel
                </Text>
              </View>
            ) : (
              <View key={entry.id} style={styles.detailCard}>
                <View style={styles.detailHeader}>
                  <View style={styles.detailCopy}>
                    <Text style={styles.detailTitle}>{entry.title}</Text>
                    <Text style={styles.detailMeta}>{entry.subtitle}</Text>
                  </View>
                  <View style={styles.stageBadge}>
                    <Text style={styles.stageBadgeText}>{entry.badge}</Text>
                  </View>
                </View>

                <View style={styles.factGrid}>
                  {entry.facts.map((fact) => (
                    <FactPill key={`${entry.id}-${fact.label}`} label={fact.label} value={fact.value} />
                  ))}
                </View>

                <Text style={styles.description}>{entry.message}</Text>

                <Text style={styles.syncedHint}>
                  {entry.timestamp ? `Synced ${toTimezoneDateKey(entry.timestamp)}` : "Live sync from admin panel"}
                </Text>
              </View>
            )
          ))}
        </View>
      ) : filteredJobs.length > 0 ? (
        <View style={styles.cards}>
          {filteredJobs.map((job) => {
            const rawApplication = applicationsByJobId.get(job.id);
            const syncedDate =
              rawApplication?.application_date ??
              rawApplication?.applied_at ??
              rawApplication?.created_at;
            const syncedScreenshots = rawApplication ? applicationScreenshotMap.get(rawApplication.id) : undefined;
            const beforeScreenshotUri =
              syncedScreenshots?.before ||
              rawApplication?.before_screenshot_url?.trim() ||
              beforeScreenshotMap[job.id];
            const afterScreenshotUri =
              syncedScreenshots?.after ||
              rawApplication?.after_screenshot_url?.trim() ||
              afterScreenshotMap[job.id] ||
              screenshotMap[job.id];
            const hasBeforeScreenshot = Boolean(beforeScreenshotUri);
            const hasAfterScreenshot = Boolean(afterScreenshotUri);

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
                  <FactPill label="Applied" value={syncedDate ? toTimezoneDateKey(syncedDate) : "Live"} />
                  <FactPill
                    label="Screenshots"
                    value={
                      hasBeforeScreenshot && hasAfterScreenshot
                        ? "Before & After"
                        : hasBeforeScreenshot
                        ? "Before"
                        : hasAfterScreenshot
                        ? "After"
                        : "Pending"
                    }
                  />
                </View>

                <Text style={styles.description}>
                  {job.description || "Admin-managed tracker updates for this role appear here as soon as they sync."}
                </Text>

                {hasBeforeScreenshot || hasAfterScreenshot ? (
                  <View style={styles.screenshotPair}>
                    {hasBeforeScreenshot ? (
                      <View style={styles.screenshotBlock}>
                        <Text style={styles.screenshotLabel}>Before</Text>
                        <Image
                          source={{ uri: beforeScreenshotUri }}
                          style={styles.screenshot}
                          resizeMode="cover"
                        />
                      </View>
                    ) : null}
                    {hasAfterScreenshot ? (
                      <View style={styles.screenshotBlock}>
                        <Text style={styles.screenshotLabel}>After</Text>
                        <Image
                          source={{ uri: afterScreenshotUri }}
                          style={styles.screenshot}
                          resizeMode="cover"
                        />
                      </View>
                    ) : null}
                  </View>
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
  emailScreenHeader: {
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
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
  syncedHint: {
    ...typography.body,
    color: colors.mutedText,
    fontSize: 12,
  },
  emailHeaderMeta: {
    ...typography.label,
    color: colors.subtleText,
    fontSize: 12,
  },
  emailThreadCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  emailThreadTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  emailSubject: {
    ...typography.title,
    color: colors.text,
    fontSize: 17,
  },
  emailDate: {
    ...typography.label,
    color: colors.subtleText,
    fontSize: 12,
  },
  emailBodyCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    padding: spacing.md,
    gap: spacing.sm,
  },
  emailGreeting: {
    ...typography.body,
    color: colors.text,
    fontWeight: "700",
  },
  emailBodyText: {
    ...typography.body,
    color: colors.text,
    lineHeight: 22,
  },
  emailCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    padding: spacing.md,
    gap: spacing.sm,
  },
  emailLine: {
    ...typography.body,
    color: colors.text,
    lineHeight: 22,
  },
  emailMetaBlock: {
    gap: 2,
  },
  emailMetaLabel: {
    ...typography.label,
    color: colors.subtleText,
    fontSize: 11,
  },
  emailMetaValue: {
    ...typography.body,
    color: colors.text,
  },
  screenshot: {
    width: "100%",
    height: 180,
    borderRadius: radii.md,
    backgroundColor: colors.background,
  },
  screenshotPair: {
    gap: spacing.md,
  },
  screenshotBlock: {
    gap: spacing.xs,
  },
  screenshotLabel: {
    ...typography.label,
    color: colors.subtleText,
    fontSize: 12,
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
