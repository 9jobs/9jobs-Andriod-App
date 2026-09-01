import React, { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View, InteractionManager } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Path } from "react-native-svg";
import { Screen } from "@/components/ui/Screen";
import { usePreviewSyncQuery } from "@/features/mobile-sync/hooks";
import { AppIcon } from "@/components/ui/AppIcon";
import type { MobileSyncSnapshot } from "@/lib/data/mobile-sync-repository";
import { normalizeTrackerSummary } from "@/lib/data/tracker-summary";
import { colors, radii, shadows, spacing, typography } from "@/theme";
import { FadeInView } from "@/components/motion/FadeInView";
import { AnimatedPressable } from "@/components/motion/AnimatedPressable";
import { useScreenPerf } from "@/lib/perf/livePerf";

const categoryFilterList = [
  "Applied",
  "Interviewing",
  "Offers",
  "Saved",
  "Applications Today",
  "Recruiter Contacted",
  "Shortlisted",
  "Interview Completed",
  "Hired",
  "Rejected",
  "Follow-ups Due",
  "Cold Emails Sent",
  "Hiring Managers Contacted",
];

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

function normalizeTrackerStatus(status: string | null | undefined) {
  switch (String(status || "").trim().toLowerCase()) {
    case "offer":
      return "offer_received";
    case "contacted":
      return "recruiter_contacted";
    case "interviewing":
      return "interview_scheduled";
    default:
      return String(status || "").trim().toLowerCase();
  }
}

function extractTrackerMilestoneStatuses(value: unknown) {
  if (!value || typeof value !== "object") {
    return [];
  }

  const record = value as Record<string, unknown>;
  const statuses = new Set<string>();
  const status = normalizeTrackerStatus(typeof record.status === "string" ? record.status : null);
  const stage = normalizeTrackerStatus(typeof record.current_stage === "string" ? record.current_stage : null);

  if (status) {
    statuses.add(status);
  }
  if (stage) {
    statuses.add(stage);
  }

  return Array.from(statuses);
}

export default function TrackerDetailsScreen() {
  const { filter } = useLocalSearchParams<{ filter?: string }>();
  const [selectedFilter, setSelectedFilter] = useState<string>(filter || "Applied");

  React.useEffect(() => {
    if (filter) {
      setSelectedFilter(filter);
    }
  }, [filter]);

  const activeFilter = selectedFilter;
  const { data: snapshot, refetch } = usePreviewSyncQuery();
  const jobs = snapshot?.jobs ?? [];
  const summary = normalizeTrackerSummary(snapshot?.trackerSummary);
  const [screenshotMap, setScreenshotMap] = useState<Record<string, string>>({});
  const [beforeScreenshotMap, setBeforeScreenshotMap] = useState<Record<string, string>>({});
  const [afterScreenshotMap, setAfterScreenshotMap] = useState<Record<string, string>>({});
  useScreenPerf("/(app)/tracker-details", Boolean(snapshot), {
    screen: "tracker-details",
    filter: activeFilter,
    jobs: jobs.length,
  });

  useFocusEffect(
    React.useCallback(() => {
      void refetch();
    }, [refetch]),
  );

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
    const mapped = new Map<string, MobileSyncSnapshot["rawApplications"][number]>();
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
  const completedInterviewAppIds = useMemo(() => {
    const ids = new Set<number>();
    (snapshot?.trackerInterviews ?? []).forEach((interview) => {
      if (interview.status === "completed" && typeof interview.application_id === "number") {
        ids.add(interview.application_id);
      }
    });
    return ids;
  }, [snapshot?.trackerInterviews]);
  const milestoneApplicationIds = useMemo(() => {
    const existingApplicationIds = new Set(
      (snapshot?.rawApplications ?? [])
        .map((application) => (typeof application?.id === "number" ? application.id : null))
        .filter((applicationId): applicationId is number => applicationId !== null),
    );
    const underReview = new Set<number>();
    const recruiterContacted = new Set<number>();
    const shortlisted = new Set<number>();
    const interviewCompleted = new Set<number>();
    const offerReceived = new Set<number>();
    const hired = new Set<number>();
    const rejected = new Set<number>();

    (snapshot?.rawApplications ?? []).forEach((application) => {
      const normalizedStatus = normalizeTrackerStatus(application.status);
      const normalizedStage = normalizeTrackerStatus(application.current_stage);

      if (normalizedStatus === "under_review" || normalizedStage === "under_review") {
        underReview.add(application.id);
      }
      if (normalizedStatus === "recruiter_contacted" || normalizedStage === "recruiter_contacted") {
        recruiterContacted.add(application.id);
      }
      if (normalizedStatus === "shortlisted" || normalizedStage === "shortlisted") {
        shortlisted.add(application.id);
      }
      if (normalizedStatus === "interview_completed" || normalizedStage === "interview_completed") {
        interviewCompleted.add(application.id);
      }
      if (normalizedStatus === "offer_received" || Boolean(application.offer_received_at)) {
        offerReceived.add(application.id);
      }
      if (normalizedStatus === "hired" || Boolean(application.hired_at)) {
        hired.add(application.id);
      }
      if (normalizedStatus === "rejected") {
        rejected.add(application.id);
      }
    });

    (snapshot?.trackerRecruiterContacts ?? []).forEach((contact) => {
      if (typeof contact.application_id === "number") {
        recruiterContacted.add(contact.application_id);
      }
    });

    completedInterviewAppIds.forEach((applicationId) => {
      interviewCompleted.add(applicationId);
    });

    (snapshot?.trackerActivityLogs ?? []).forEach((activity) => {
      if (typeof activity.application_id !== "number" || !existingApplicationIds.has(activity.application_id)) {
        return;
      }

      const historicalStatuses = new Set<string>([
        ...extractTrackerMilestoneStatuses(activity.old_value),
        ...extractTrackerMilestoneStatuses(activity.new_value),
      ]);

      if (historicalStatuses.has("recruiter_contacted")) {
        recruiterContacted.add(activity.application_id);
      }
      if (historicalStatuses.has("under_review")) {
        underReview.add(activity.application_id);
      }
      if (historicalStatuses.has("shortlisted")) {
        shortlisted.add(activity.application_id);
      }
      if (historicalStatuses.has("interview_completed")) {
        interviewCompleted.add(activity.application_id);
      }
      if (historicalStatuses.has("offer_received")) {
        offerReceived.add(activity.application_id);
      }
      if (historicalStatuses.has("hired")) {
        hired.add(activity.application_id);
      }
      if (historicalStatuses.has("rejected")) {
        rejected.add(activity.application_id);
      }
    });

    return { underReview, recruiterContacted, shortlisted, interviewCompleted, offerReceived, hired, rejected };
  }, [
    completedInterviewAppIds,
    snapshot?.rawApplications,
    snapshot?.trackerActivityLogs,
    snapshot?.trackerRecruiterContacts,
  ]);
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
          const submitted = submittedTrackerStatuses.has(normalizeTrackerStatus(application.status) || "draft");
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
      const normalizedStatus = normalizeTrackerStatus(rawApplication?.status);

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
          return job.isApplied && typeof rawApplication?.id === "number" && milestoneApplicationIds.offerReceived.has(rawApplication.id);
        case "Saved":
          return job.isSaved;
        case "Recruiter Contacted":
          return job.isApplied && typeof rawApplication?.id === "number" && milestoneApplicationIds.recruiterContacted.has(rawApplication.id);
        case "Shortlisted":
          return job.isApplied && typeof rawApplication?.id === "number" && milestoneApplicationIds.shortlisted.has(rawApplication.id);
        case "Interview Completed":
          return job.isApplied && typeof rawApplication?.id === "number" && milestoneApplicationIds.interviewCompleted.has(rawApplication.id);
        case "Hired":
          return job.isApplied && typeof rawApplication?.id === "number" && milestoneApplicationIds.hired.has(rawApplication.id);
        case "Rejected":
          return job.isApplied && typeof rawApplication?.id === "number" && milestoneApplicationIds.rejected.has(rawApplication.id);
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
  }, [activeFilter, applicationsByJobId, jobs, todayApplicationJobIds, milestoneApplicationIds]);

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
      <View style={styles.headerTopContainer}>
        <BackHeader label="Tracker" />
        <View style={styles.livePulseBadge}>
          <View style={styles.pulseDot} />
          <Text style={styles.pulseText}>ADMIN LIVE SYNC</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled={true}
        contentContainerStyle={styles.categoryScrollContainer}
      >
        {categoryFilterList.map((cat) => {
          const isActive = cat === activeFilter;
          return (
            <AnimatedPressable
              key={cat}
              onPress={() => setSelectedFilter(cat)}
              style={[styles.categoryPill, isActive && styles.categoryPillActive]}
              scaleTo={0.96}
            >
              <Text style={[styles.categoryPillText, isActive && styles.categoryPillTextActive]}>
                {cat}
              </Text>
            </AnimatedPressable>
          );
        })}
      </ScrollView>

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
          {detailEntries.map((entry, idx) => (
            <FadeInView key={entry.id} type="fade-up" delay={idx * 50}>
              {entry.type === "cold-email" ? (
                <View style={styles.emailThreadCard}>
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
                <View style={styles.detailCard}>
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
              )}
            </FadeInView>
          ))}
        </View>
      ) : filteredJobs.length > 0 ? (
        <View style={styles.cards}>
          {filteredJobs.map((job, idx) => {
            const rawApplication = applicationsByJobId.get(job.id);
            const typedApplication = rawApplication as
              | (typeof rawApplication & {
                  job_title?: string | null;
                  company_name?: string | null;
                  job_location?: string | null;
                })
              | undefined;
            const jobTitle = typedApplication?.job_title?.trim() || job.title || "Job Application";
            const companyName = typedApplication?.company_name?.trim() || job.company || "Company";
            const locationName = typedApplication?.job_location?.trim() || job.location || "Australia";
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
            const shouldShowScreenshots = activeFilter !== "Interview Completed";
            const completedInterviews = rawApplication
              ? (snapshot?.trackerInterviews ?? []).filter(
                  (interview) =>
                    interview.application_id === rawApplication.id &&
                    interview.status === "completed"
                )
              : [];

            const card = (
              <View style={styles.detailCard}>
                <View style={styles.detailHeader}>
                  <View style={styles.detailCopy}>
                    <Text style={styles.detailTitle}>{jobTitle}</Text>
                    <Text style={styles.detailMeta}>{companyName} • {locationName}</Text>
                  </View>
                  <View
                    style={[
                      styles.stageBadge,
                      job.status === "offer" && styles.offerBadge,
                      job.status === "interviewing" && styles.interviewBadge,
                      job.status === "rejected" && styles.rejectedBadge,
                      job.status === "interview_completed" && styles.interviewCompletedBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.stageBadgeText,
                        job.status === "offer" && styles.offerBadgeText,
                        job.status === "interviewing" && styles.interviewBadgeText,
                        job.status === "rejected" && styles.rejectedBadgeText,
                        job.status === "interview_completed" && styles.interviewCompletedBadgeText,
                      ]}
                    >
                      {job.status === "interview_completed" ? "Interview Completed" : formatStatusLabel(job.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.factGrid}>
                  <FactPill label="Applied" value={syncedDate ? toTimezoneDateKey(syncedDate) : "Live"} />
                  {shouldShowScreenshots ? (
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
                  ) : null}
                </View>

                <Text style={styles.description}>
                  {job.description || "Admin-managed tracker updates for this role appear here as soon as they sync."}
                </Text>

                {shouldShowScreenshots && (hasBeforeScreenshot || hasAfterScreenshot) ? (
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

                {activeFilter === "Interview Completed" && completedInterviews.length > 0 ? (
                  <View style={styles.completedInterviewsSection}>
                    <Text style={styles.sectionTitle}>Completed Interviews</Text>
                    {completedInterviews.map((interview) => (
                      <View key={interview.id} style={styles.interviewDetailRow}>
                        <View style={styles.interviewDot} />
                        <View style={styles.interviewInfo}>
                          <Text style={styles.interviewRoundText}>
                            {interview.interview_round || "Completed Round"} ({interview.interview_type || "video"})
                          </Text>
                          <Text style={styles.interviewDateText}>
                            Date: {interview.interview_date ? toTimezoneDateKey(interview.interview_date) : "N/A"}
                          </Text>
                          {interview.interviewer_name || interview.interviewer_email ? (
                            <Text style={styles.interviewerText}>
                              Interviewer: {interview.interviewer_name || "N/A"}{" "}
                              {interview.interviewer_email ? `(${interview.interviewer_email})` : ""}
                            </Text>
                          ) : null}
                          {interview.admin_notes ? (
                            <Text style={styles.interviewNotesText}>
                              Notes: {interview.admin_notes}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}

                <AnimatedPressable
                  style={styles.actionButton}
                  onPress={() => router.push(`/(app)/jobs/${job.id}`)}
                  scaleTo={0.98}
                >
                  <Text style={styles.actionButtonText}>Open Full Role View</Text>
                </AnimatedPressable>
              </View>
            );

            if (idx < 8) {
              return (
                <FadeInView key={job.id} type="fade-up" delay={idx * 30}>
                  {card}
                </FadeInView>
              );
            }

            return <View key={job.id}>{card}</View>;
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

function formatStatusLabel(status: string | null | undefined) {
  const normalized = String(status || "live")
    .replace(/[_-]+/g, " ")
    .trim();

  if (!normalized) {
    return "Live";
  }

  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
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
    gap: spacing.md,
  },
  headerTopContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  livePulseBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.softAccent,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.accentDark,
  },
  pulseText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: 0.5,
  },
  categoryScrollContainer: {
    gap: 8,
    paddingVertical: 4,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryPillActive: {
    backgroundColor: colors.accentDark,
    borderColor: colors.accentDark,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.mutedText,
  },
  categoryPillTextActive: {
    color: colors.surface,
    fontWeight: "800",
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
  interviewCompletedBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
  },
  interviewCompletedBadgeText: {
    color: "#10B981",
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
    textAlign: "justify",
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
  completedInterviewsSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.title,
    fontSize: 14,
    color: colors.text,
  },
  interviewDetailRow: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  interviewDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accentDark,
    marginTop: 6,
  },
  interviewInfo: {
    flex: 1,
    gap: 4,
  },
  interviewRoundText: {
    ...typography.title,
    fontSize: 13,
    color: colors.text,
    textTransform: "capitalize",
  },
  interviewDateText: {
    ...typography.body,
    fontSize: 12,
    color: colors.mutedText,
  },
  interviewerText: {
    ...typography.body,
    fontSize: 12,
    color: colors.mutedText,
  },
  interviewNotesText: {
    ...typography.body,
    fontSize: 12,
    color: colors.text,
    backgroundColor: "rgba(163, 230, 53, 0.04)",
    padding: 8,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
  },
});
