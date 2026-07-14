import React, { useState, useMemo } from "react";
import { StyleSheet, Text, View, Pressable, ScrollView, Modal, Image, Alert, TouchableOpacity, ActivityIndicator } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { DarkHeroCard, PremiumScaffold, SoftPanel } from "@/components/premium/PremiumScaffold";
import { usePreviewSyncQuery } from "@/features/mobile-sync/hooks";
import { useUpdateApplicationStatusMutation } from "@/features/jobs/hooks";
import { normalizeTrackerSummary } from "@/lib/data/tracker-summary";
import { colors, spacing, typography, radii, shadows } from "@/theme";
import { AppIcon } from "@/components/ui/AppIcon";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

const stageOptions = [
  { label: "Saved", value: "saved" },
  { label: "Applied", value: "applied" },
  { label: "Contacted", value: "contacted" },
  { label: "Shortlisted", value: "shortlisted" },
  { label: "Interviewing", value: "interviewing" },
  { label: "Interview Done", value: "interview_completed" },
  { label: "Offer", value: "offer" },
  { label: "Hired", value: "hired" },
  { label: "Rejected", value: "rejected" },
] as const;

export default function TrackerScreen() {
  const { data: snapshot, isLoading, isRefetching, isError, refetch } = usePreviewSyncQuery();
  const { mutate: updateApplicationStage, isPending: isUpdatingStage } = useUpdateApplicationStatusMutation();
  const jobs = snapshot?.jobs ?? [];
  const summary = normalizeTrackerSummary(snapshot?.trackerSummary);

  const [activeFilter, setActiveFilter] = useState<string>("Applied");
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [screenshotMap, setScreenshotMap] = useState<Record<string, string>>({});

  // Load saved screenshots from AsyncStorage
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

  const handleUploadScreenshot = async (jobId: string) => {
    let ImagePickerModule: any;
    try {
      ImagePickerModule = require("expo-image-picker");
    } catch (e) {
      console.warn(e);
    }

    if (!ImagePickerModule || !ImagePickerModule.requestMediaLibraryPermissionsAsync) {
      Alert.alert("Picker Unavailable", "Device image picker is not compiled in this build.");
      return;
    }

    try {
      const { status } = await ImagePickerModule.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Please grant access to photo library.");
        return;
      }

      const result = await ImagePickerModule.launchImageLibraryAsync({
        mediaTypes: ImagePickerModule.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedUri = result.assets[0].uri;
        const newMap = { ...screenshotMap, [jobId]: selectedUri };
        setScreenshotMap(newMap);
        await AsyncStorage.setItem("job_screenshots_cache", JSON.stringify(newMap));
        if (selectedJob && selectedJob.id === jobId) {
          setSelectedJob({ ...selectedJob, screenshotUri: selectedUri });
        }
      }
    } catch (err) {
      Alert.alert("Error", "Failed to select screenshot.");
    }
  };

  const openMetricDetails = React.useCallback((filter: string) => {
    setActiveFilter(filter);
    router.push({
      pathname: "/(app)/tracker-details",
      params: { filter },
    });
  }, []);

  // Filtering logic
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const rawApplication = applicationsByJobId.get(job.id);
      const normalizedStatus = rawApplication?.status?.trim().toLowerCase() ?? "";

      switch (activeFilter) {
        case "Applied":
        case "Total Applications":
        case "All Applications":
          return job.isApplied;
        case "Applications Today":
          return job.isApplied && todayApplicationJobIds.has(job.id);
        case "Under Review":
          return job.isApplied && normalizedStatus === "under_review";
        case "Recruiter Contacted":
          return job.isApplied && normalizedStatus === "recruiter_contacted";
        case "Shortlisted":
          return job.isApplied && normalizedStatus === "shortlisted";
        case "Upcoming Interviews":
        case "Interviewing":
          return job.isApplied && ["phone_interview", "video_interview", "face_to_face_interview", "interview_scheduled", "second_interview", "reference_check"].includes(normalizedStatus);
        case "Interview Completed":
          return job.isApplied && normalizedStatus === "interview_completed";
        case "Offers Received":
        case "Offers":
          return job.isApplied && (normalizedStatus === "offer_received" || Boolean(rawApplication?.offer_received_at));
        case "Hired":
          return job.isApplied && (normalizedStatus === "hired" || Boolean(rawApplication?.hired_at));
        case "Rejected":
          return job.isApplied && normalizedStatus === "rejected";
        case "Saved":
          return job.isSaved;
        default:
          return job.isApplied;
      }
    });
  }, [jobs, activeFilter, applicationsByJobId, todayApplicationJobIds]);

  const activeFocusText = useMemo(() => {
    switch (activeFilter) {
      case "Applications Today":
        return `${summary.applicationsToday} applications were logged today`;
      case "Upcoming Interviews":
      case "Interviewing":
        return `${summary.interviewing} roles are waiting on interview loops`;
      case "Offers Received":
      case "Offers":
        return `${summary.offers} competitive offers received! 🎉`;
      case "Saved":
        return `${summary.saved} tracked opportunities saved for review`;
      case "Follow-ups Due":
        return `${summary.followupsDue} applications need active follow-up`;
      default:
        return summary.currentFocus?.message || "0 total roles currently in active track";
    }
  }, [activeFilter, summary]);

  // Activity Timeline items
  const timelineItems = useMemo(() => {
    const items: Array<{ title: string; subtitle: string; time: string; icon: string }> = [];
    jobs.forEach((job) => {
      if (job.isApplied) {
        if (job.status === "offer") {
          items.push({
            title: `Offer Received from ${job.company}`,
            subtitle: `Congratulations! ${job.title} package details sent.`,
            time: job.postedAt,
            icon: "check-circle",
          });
        } else if (job.status === "interviewing") {
          items.push({
            title: `Interview Scheduled: ${job.company}`,
            subtitle: `Round 2 prep loops initialized for ${job.title}.`,
            time: job.postedAt,
            icon: "calendar",
          });
        } else {
          items.push({
            title: `Applied to ${job.company}`,
            subtitle: `Successfully logged application for ${job.title}.`,
            time: job.postedAt,
            icon: "send",
          });
        }
      }
    });
    return items.slice(0, 4);
  }, [jobs]);

  return (
    <PremiumScaffold
      title="Tracker"
      subtitle="See every applied role and the exact stage it is in."
      kicker="PIPELINE"
      hero={
        <DarkHeroCard>
          <Text style={styles.heroTitle}>Stay close to the next move.</Text>
          <Text style={styles.heroBody}>
            Interactive tracking dashboard connected to your real-time recruitment sync.
          </Text>
          <View style={styles.heroSummary}>
            <Text style={styles.heroSummaryLabel}>Current focus</Text>
            <Text style={styles.heroSummaryValue}>{activeFocusText}</Text>
            {isLoading || isRefetching ? (
              <View style={styles.heroStatusRow}>
                <ActivityIndicator color={colors.accent} size="small" />
                <Text style={styles.heroStatusText}>Refreshing live tracker...</Text>
              </View>
            ) : null}
            {isError ? (
              <Pressable onPress={() => refetch()} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Retry live sync</Text>
              </Pressable>
            ) : null}
          </View>
        </DarkHeroCard>
      }
    >
      {/* Primary Clickable Circular Metrics Grid */}
      <View style={styles.topMetricsCard}>
        <View style={styles.topMetricsGrid}>
          <Pressable
            style={styles.topMetricTile}
            onPress={() => openMetricDetails("Applied")}
          >
            <View style={[
              styles.metricCircle,
              { backgroundColor: colors.softAccent, borderColor: colors.borderStrong },
              activeFilter === "Applied" && { borderColor: colors.accent, borderWidth: 2 }
            ]}>
              <AppIcon name="spark" color={colors.accentDark} size={20} />
            </View>
            <Text style={styles.metricVal}>{summary.applied}</Text>
            <Text style={styles.metricLbl}>Applied</Text>
          </Pressable>

          <Pressable
            style={styles.topMetricTile}
            onPress={() => openMetricDetails("Upcoming Interviews")}
          >
            <View style={[
              styles.metricCircle,
              { backgroundColor: colors.softAccent, borderColor: colors.borderStrong },
              (activeFilter === "Upcoming Interviews" || activeFilter === "Interviewing") && { borderColor: colors.accent, borderWidth: 2 }
            ]}>
              <AppIcon name="mic" color={colors.accentDark} size={20} />
            </View>
            <Text style={styles.metricVal}>{summary.interviewing}</Text>
            <Text style={styles.metricLbl}>Interviewing</Text>
          </Pressable>

          <Pressable
            style={styles.topMetricTile}
            onPress={() => openMetricDetails("Offers Received")}
          >
            <View style={[
              styles.metricCircle,
              { backgroundColor: colors.softAccent, borderColor: colors.borderStrong },
              (activeFilter === "Offers Received" || activeFilter === "Offers") && { borderColor: colors.accent, borderWidth: 2 }
            ]}>
              <AppIcon name="briefcase" color={colors.accentDark} size={20} />
            </View>
            <Text style={styles.metricVal}>{summary.offers}</Text>
            <Text style={styles.metricLbl}>Offers</Text>
          </Pressable>

          <Pressable
            style={styles.topMetricTile}
            onPress={() => openMetricDetails("Saved")}
          >
            <View style={[
              styles.metricCircle,
              { backgroundColor: colors.softAccent, borderColor: colors.borderStrong },
              activeFilter === "Saved" && { borderColor: colors.accent, borderWidth: 2 }
            ]}>
              <AppIcon name="saved" color={colors.accentDark} size={20} />
            </View>
            <Text style={styles.metricVal}>{summary.saved}</Text>
            <Text style={styles.metricLbl}>Saved</Text>
          </Pressable>
        </View>
      </View>

      {/* Advanced Recruitment Insights */}
      <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionLabel, { color: colors.accent }]}>ADVANCED METRICS</Text>
        <View style={styles.metricsGrid}>
          <Pressable
            style={styles.metricTile}
            onPress={() => openMetricDetails("Applications Today")}
          >
            <View style={[styles.metricCircle, { backgroundColor: colors.softAccent, borderColor: colors.borderStrong }, activeFilter === "Applications Today" && { borderColor: colors.accent, borderWidth: 2 }]}>
              <AppIcon name="spark" color={colors.accentDark} size={20} />
            </View>
            <Text style={styles.metricVal}>{summary.applicationsToday}</Text>
            <Text style={styles.metricLbl}>Applications Today</Text>
          </Pressable>

          <Pressable
            style={styles.metricTile}
            onPress={() => openMetricDetails("Recruiter Contacted")}
          >
            <View style={[styles.metricCircle, { backgroundColor: colors.softAccent, borderColor: colors.borderStrong }, activeFilter === "Recruiter Contacted" && { borderColor: colors.accent, borderWidth: 2 }]}>
              <AppIcon name="mail" color={colors.accentDark} size={20} />
            </View>
            <Text style={styles.metricVal}>{summary.recruiterContacted}</Text>
            <Text style={styles.metricLbl}>Recruiter Contacted</Text>
          </Pressable>

          <Pressable
            style={styles.metricTile}
            onPress={() => openMetricDetails("Shortlisted")}
          >
            <View style={[styles.metricCircle, { backgroundColor: colors.softAccent, borderColor: colors.borderStrong }, activeFilter === "Shortlisted" && { borderColor: colors.accent, borderWidth: 2 }]}>
              <AppIcon name="saved" color={colors.accentDark} size={20} />
            </View>
            <Text style={styles.metricVal}>{summary.shortlisted}</Text>
            <Text style={styles.metricLbl}>Shortlisted</Text>
          </Pressable>

          <Pressable
            style={styles.metricTile}
            onPress={() => openMetricDetails("Interview Completed")}
          >
            <View style={[styles.metricCircle, { backgroundColor: colors.softAccent, borderColor: colors.borderStrong }, activeFilter === "Interview Completed" && { borderColor: colors.accent, borderWidth: 2 }]}>
              <AppIcon name="briefcase" color={colors.accentDark} size={20} />
            </View>
            <Text style={styles.metricVal}>{summary.interviewCompleted}</Text>
            <Text style={styles.metricLbl}>Interview Completed</Text>
          </Pressable>

          <Pressable
            style={styles.metricTile}
            onPress={() => openMetricDetails("Hired")}
          >
            <View style={[styles.metricCircle, { backgroundColor: colors.softAccent, borderColor: colors.borderStrong }, activeFilter === "Hired" && { borderColor: colors.accent, borderWidth: 2 }]}>
              <AppIcon name="profile" color={colors.accentDark} size={20} />
            </View>
            <Text style={styles.metricVal}>{summary.hired}</Text>
            <Text style={styles.metricLbl}>Hired</Text>
          </Pressable>

          <Pressable
            style={styles.metricTile}
            onPress={() => openMetricDetails("Rejected")}
          >
            <View style={[styles.metricCircle, { backgroundColor: colors.softAccent, borderColor: colors.borderStrong }, activeFilter === "Rejected" && { borderColor: colors.accent, borderWidth: 2 }]}>
              <AppIcon name="eye-off" color={colors.accentDark} size={20} />
            </View>
            <Text style={styles.metricVal}>{summary.rejected}</Text>
            <Text style={styles.metricLbl}>Rejected</Text>
          </Pressable>

          <Pressable
            style={styles.metricTile}
            onPress={() => openMetricDetails("Follow-ups Due")}
          >
            <View style={[styles.metricCircle, { backgroundColor: colors.softAccent, borderColor: colors.borderStrong }, activeFilter === "Follow-ups Due" && { borderColor: colors.accent, borderWidth: 2 }]}>
              <AppIcon name="info" color={colors.accentDark} size={20} />
            </View>
            <Text style={styles.metricVal}>{summary.followupsDue}</Text>
            <Text style={styles.metricLbl}>Follow-ups Due</Text>
          </Pressable>

          <Pressable
            style={styles.metricTile}
            onPress={() => openMetricDetails("Cold Emails Sent")}
          >
            <View style={[styles.metricCircle, { backgroundColor: colors.softAccent, borderColor: colors.borderStrong }, activeFilter === "Cold Emails Sent" && { borderColor: colors.accent, borderWidth: 2 }]}>
              <AppIcon name="mail" color={colors.accentDark} size={20} />
            </View>
            <Text style={styles.metricVal}>{summary.coldEmailsSent}</Text>
            <Text style={styles.metricLbl}>Cold Emails Sent</Text>
          </Pressable>

          <Pressable
            style={styles.metricTile}
            onPress={() => openMetricDetails("Hiring Managers Contacted")}
          >
            <View style={[styles.metricCircle, { backgroundColor: colors.softAccent, borderColor: colors.borderStrong }, activeFilter === "Hiring Managers Contacted" && { borderColor: colors.accent, borderWidth: 2 }]}>
              <AppIcon name="profile" color={colors.accentDark} size={20} />
            </View>
            <Text style={styles.metricVal}>{summary.hiringManagersContacted}</Text>
            <Text style={styles.metricLbl}>Contacts Reached</Text>
          </Pressable>
        </View>
      </View>

      {/* Active Filter Header */}
      <View style={styles.listHeaderRow}>
        <Text style={[styles.listTitle, { color: colors.text }]}>{activeFilter} ({filteredJobs.length})</Text>
        {activeFilter !== "Applied" && (
          <TouchableOpacity onPress={() => setActiveFilter("Applied")}>
            <Text style={styles.resetFilter}>Reset</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Job list */}
      <View style={styles.stack}>
        {filteredJobs.length > 0 ? (
          filteredJobs.map((job) => {
            const hasScreenshot = Boolean(screenshotMap[job.id]);
            return (
              <SoftPanel key={job.id}>
                <Pressable
                  onPress={() =>
                    setSelectedJob({
                      ...job,
                      screenshotUri: screenshotMap[job.id] || null,
                    })
                  }
                  style={styles.row}
                >
                  <View style={styles.copy}>
                    <Text style={styles.jobTitle}>{job.title}</Text>
                    <Text style={styles.meta}>
                      {job.company} • {job.location}
                    </Text>
                    {hasScreenshot && (
                      <View style={styles.screenshotIndicator}>
                        <AppIcon name="resume" size={12} color={colors.accent} />
                        <Text style={styles.screenshotIndicatorText}>Screenshot Attached</Text>
                      </View>
                    )}
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
                </Pressable>
                <Text style={styles.time}>{job.postedAt}</Text>
                <Text style={styles.tapHint}>Tap to update stage and sync with admin</Text>
              </SoftPanel>
            );
          })
        ) : (
          <Text style={styles.emptyText}>No applications match this filter.</Text>
        )}
      </View>

      {/* Activity Timeline */}
      <View style={[styles.sectionCard, { backgroundColor: colors.surface, marginTop: spacing.lg }]}>
        <Text style={[styles.sectionLabel, { color: colors.accent }]}>ACTIVITY TIMELINE</Text>
        <View style={styles.timelineContainer}>
          {timelineItems.length > 0 ? (
            timelineItems.map((item, index) => (
              <View key={index} style={styles.timelineRow}>
                <View style={styles.timelineLeft}>
                  <View style={[styles.timelineIconBubble, { backgroundColor: colors.background }]}>
                    <AppIcon name={item.icon as any} size={14} color={colors.text} />
                  </View>
                  {index < timelineItems.length - 1 && <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />}
                </View>
                <View style={styles.timelineRight}>
                  <Text style={[styles.timelineTitleText, { color: colors.text }]}>{item.title}</Text>
                  <Text style={styles.timelineSubtitleText}>{item.subtitle}</Text>
                  <Text style={styles.timelineTimeText}>{item.time}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No recent activity logged.</Text>
          )}
        </View>
      </View>

      {/* Job Details Confirmation Modal */}
      {selectedJob && (
        <Modal
          animationType="slide"
          transparent
          visible={selectedJob !== null}
          onRequestClose={() => setSelectedJob(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedJob.title}</Text>
                <Pressable onPress={() => setSelectedJob(null)} style={styles.closeButton}>
                  <Text style={[styles.closeButtonText, { color: colors.text }]}>✕</Text>
                </Pressable>
              </View>
              <Text style={styles.modalMeta}>{selectedJob.company} • {selectedJob.location}</Text>

              <ScrollView contentContainerStyle={styles.modalScroll}>
                {/* Status and Details */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Application Stage</Text>
                  <View style={[styles.stageBadge, selectedJob.status === "offer" && styles.offerBadge]}>
                    <Text style={[styles.stageBadgeText, selectedJob.status === "offer" && styles.offerBadgeText]}>
                      {selectedJob.status}
                    </Text>
                  </View>
                </View>

                <Text style={styles.sectionHeading}>UPDATE TRACKING STAGE</Text>
                <View style={styles.stageSelectorGrid}>
                  {stageOptions.map((option) => {
                    const isActive = selectedJob.status === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        style={[styles.stageOptionChip, isActive && styles.stageOptionChipActive]}
                        disabled={isUpdatingStage}
                        onPress={() => {
                          updateApplicationStage(
                            { jobId: selectedJob.id, status: option.value },
                            {
                              onSuccess: () => setSelectedJob({ ...selectedJob, status: option.value }),
                            },
                          );
                        }}
                      >
                        <Text style={[styles.stageOptionChipText, isActive && styles.stageOptionChipTextActive]}>
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {isUpdatingStage ? (
                  <View style={styles.inlineLoader}>
                    <ActivityIndicator color={colors.accent} />
                    <Text style={styles.inlineLoaderText}>Syncing with admin panel...</Text>
                  </View>
                ) : null}

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Compensation</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedJob.salary || "Not Specified"}</Text>
                </View>

                {/* Screenshot Section */}
                <Text style={styles.sectionHeading}>APPLICATION SCREENSHOT</Text>
                {selectedJob.screenshotUri ? (
                  <View style={styles.screenshotContainer}>
                    <Image
                      source={{ uri: selectedJob.screenshotUri }}
                      style={styles.screenshotImage}
                      resizeMode="contain"
                    />
                    <TouchableOpacity
                      style={styles.removeScreenshotButton}
                      onPress={async () => {
                        const newMap = { ...screenshotMap };
                        delete newMap[selectedJob.id];
                        setScreenshotMap(newMap);
                        await AsyncStorage.setItem("job_screenshots_cache", JSON.stringify(newMap));
                        setSelectedJob({ ...selectedJob, screenshotUri: null });
                      }}
                    >
                      <Text style={styles.removeScreenshotText}>Remove Screenshot</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={[styles.uploadBox, { borderColor: colors.border }]}>
                    <AppIcon name="resume" size={32} color={colors.subtleText} />
                    <Text style={styles.uploadBoxTitle}>No screenshot uploaded</Text>
                    <Text style={styles.uploadBoxBody}>Attach confirmation email, portal submission status, or offer letter screenshot.</Text>
                    <TouchableOpacity
                      style={styles.uploadButton}
                      onPress={() => handleUploadScreenshot(selectedJob.id)}
                    >
                      <Text style={styles.uploadButtonText}>Upload Screenshot</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </PremiumScaffold>
  );
}

const styles = StyleSheet.create({
  topMetricsCard: {
    borderRadius: radii.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    ...shadows.card,
    marginBottom: spacing.md,
  },
  topMetricsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  topMetricTile: {
    width: "22%",
    alignItems: "center",
    gap: 4,
    minHeight: 94,
    justifyContent: "flex-start",
  },
  heroTitle: {
    ...typography.headline,
    color: colors.surface,
  },
  heroBody: {
    ...typography.body,
    color: colors.darkMuted,
  },
  heroSummary: {
    gap: 4,
  },
  heroSummaryLabel: {
    ...typography.label,
    color: colors.accent,
  },
  heroSummaryValue: {
    ...typography.body,
    color: colors.surface,
  },
  heroStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  heroStatusText: {
    ...typography.label,
    color: colors.darkMuted,
  },
  retryButton: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: "rgba(163, 230, 53, 0.16)",
  },
  retryButtonText: {
    ...typography.label,
    color: colors.accent,
    fontWeight: "700",
  },
  sectionCard: {
    borderRadius: radii.lg,
    padding: spacing.md,
    ...shadows.card,
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.label,
    letterSpacing: 1.1,
    fontWeight: "700",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: spacing.md,
    columnGap: spacing.xs,
    justifyContent: "flex-start",
  },
  metricTile: {
    flexBasis: "31%",
    maxWidth: "31%",
    alignItems: "center",
    gap: 4,
    minHeight: 112,
    justifyContent: "flex-start",
  },
  metricCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  metricVal: {
    ...typography.title,
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    marginTop: 4,
    minHeight: 22,
  },
  metricLbl: {
    ...typography.label,
    color: colors.mutedText,
    fontSize: 10,
    lineHeight: 13,
    textAlign: "center",
    minHeight: 26,
  },
  listHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    paddingHorizontal: 4,
  },
  listTitle: {
    ...typography.title,
    fontSize: 18,
    fontWeight: "700",
  },
  resetFilter: {
    ...typography.body,
    color: colors.accent,
    fontWeight: "600",
  },
  stack: {
    gap: spacing.md,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  jobTitle: {
    ...typography.title,
    color: colors.text,
  },
  meta: {
    ...typography.body,
    color: colors.mutedText,
  },
  tapHint: {
    ...typography.label,
    color: colors.accent,
    marginTop: 6,
    fontSize: 10,
  },
  time: {
    ...typography.label,
    color: colors.mutedText,
    marginTop: 4,
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
  emptyText: {
    ...typography.body,
    color: colors.subtleText,
    textAlign: "center",
    paddingVertical: spacing.lg,
  },
  screenshotIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  screenshotIndicatorText: {
    ...typography.label,
    color: colors.accent,
    fontSize: 11,
  },
  timelineContainer: {
    marginTop: spacing.xs,
    paddingLeft: 4,
  },
  timelineRow: {
    flexDirection: "row",
    minHeight: 64,
  },
  timelineLeft: {
    alignItems: "center",
    width: 24,
    marginRight: spacing.sm,
  },
  timelineIconBubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  timelineLine: {
    width: 1,
    flex: 1,
    marginVertical: 4,
  },
  timelineRight: {
    flex: 1,
    paddingBottom: spacing.sm,
  },
  timelineTitleText: {
    ...typography.title,
    fontSize: 14,
    fontWeight: "600",
  },
  timelineSubtitleText: {
    ...typography.body,
    color: colors.mutedText,
    fontSize: 12,
    marginTop: 2,
  },
  timelineTimeText: {
    ...typography.label,
    color: colors.subtleText,
    fontSize: 10,
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    maxHeight: "85%",
  },
  metricModalContent: {
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    maxHeight: "92%",
    minHeight: "78%",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.borderStrong,
    marginBottom: spacing.md,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  metricModalHeaderCopy: {
    flex: 1,
    gap: 4,
    marginRight: spacing.md,
  },
  metricModalSubtitle: {
    ...typography.body,
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 18,
  },
  metricModalCountCard: {
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.dark,
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 4,
    flex: 1.1,
  },
  metricModalCountValue: {
    ...typography.display,
    fontSize: 28,
    color: colors.surface,
  },
  metricModalCountLabel: {
    ...typography.label,
    color: colors.accent,
    fontWeight: "700",
  },
  metricSummaryGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  metricSummarySideCard: {
    flex: 0.9,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
    justifyContent: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricSummarySideLabel: {
    ...typography.label,
    color: colors.subtleText,
    fontSize: 11,
  },
  metricSummarySideValue: {
    ...typography.title,
    color: colors.text,
    fontSize: 18,
  },
  metricSummarySideHint: {
    ...typography.body,
    color: colors.mutedText,
    fontSize: 11,
  },
  metricInsightCard: {
    marginTop: spacing.md,
    borderRadius: radii.lg,
    padding: spacing.md,
    backgroundColor: "rgba(163, 230, 53, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(163, 230, 53, 0.2)",
    gap: 4,
  },
  metricInsightLabel: {
    ...typography.label,
    color: colors.accent,
    fontWeight: "700",
  },
  metricInsightValue: {
    ...typography.body,
    color: colors.text,
  },
  metricModalList: {
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  metricDetailCard: {
    borderRadius: radii.lg,
    padding: spacing.md,
    backgroundColor: colors.background,
    gap: spacing.sm,
    ...shadows.card,
  },
  metricDetailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  metricDetailCopy: {
    flex: 1,
    gap: 4,
  },
  metricDetailTitle: {
    ...typography.title,
    color: colors.text,
    fontSize: 16,
  },
  metricDetailMeta: {
    ...typography.body,
    color: colors.mutedText,
    fontSize: 12,
  },
  metricDetailFacts: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  metricFactPill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  metricFactLabel: {
    ...typography.label,
    color: colors.subtleText,
    fontSize: 10,
  },
  metricFactValue: {
    ...typography.label,
    color: colors.text,
    fontWeight: "700",
  },
  metricDetailBody: {
    ...typography.body,
    color: colors.mutedText,
    fontSize: 12,
    lineHeight: 18,
  },
  metricDetailHint: {
    ...typography.body,
    color: colors.accentDark,
    fontSize: 12,
  },
  metricEmptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  metricEmptyTitle: {
    ...typography.title,
    color: colors.text,
    fontSize: 18,
  },
  metricEmptyBody: {
    ...typography.body,
    color: colors.mutedText,
    textAlign: "center",
    paddingHorizontal: spacing.md,
    lineHeight: 20,
  },
  metricEmptyInfoCard: {
    marginTop: spacing.sm,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
    alignItems: "center",
    gap: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricEmptyInfoLabel: {
    ...typography.label,
    color: colors.subtleText,
  },
  metricEmptyInfoValue: {
    ...typography.title,
    color: colors.text,
    fontSize: 14,
  },
  modalTitle: {
    ...typography.headline,
    fontSize: 20,
    flex: 1,
    marginRight: spacing.md,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  modalMeta: {
    ...typography.body,
    color: colors.mutedText,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  modalScroll: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    ...typography.body,
    color: colors.mutedText,
  },
  detailValue: {
    ...typography.title,
    fontSize: 14,
  },
  sectionHeading: {
    ...typography.label,
    color: colors.subtleText,
    fontWeight: "700",
    letterSpacing: 1.1,
    marginTop: spacing.md,
  },
  stageSelectorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  stageOptionChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stageOptionChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.softAccent,
  },
  stageOptionChipText: {
    ...typography.label,
    color: colors.subtleText,
    fontSize: 11,
  },
  stageOptionChipTextActive: {
    color: colors.accentDark,
    fontWeight: "700",
  },
  inlineLoader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: spacing.sm,
  },
  inlineLoaderText: {
    ...typography.label,
    color: colors.subtleText,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  uploadBoxTitle: {
    ...typography.title,
    fontSize: 15,
    color: colors.text,
    marginTop: spacing.xs,
  },
  uploadBoxBody: {
    ...typography.body,
    color: colors.subtleText,
    fontSize: 11,
    textAlign: "center",
    paddingHorizontal: spacing.md,
  },
  uploadButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.md,
    marginTop: spacing.sm,
    ...shadows.card,
  },
  uploadButtonText: {
    ...typography.title,
    color: colors.dark,
    fontSize: 12,
    fontWeight: "700",
  },
  screenshotContainer: {
    gap: spacing.sm,
  },
  screenshotImage: {
    width: "100%",
    height: 200,
    borderRadius: radii.md,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  removeScreenshotButton: {
    alignSelf: "center",
    paddingVertical: 6,
  },
  removeScreenshotText: {
    ...typography.body,
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "600",
  },
});
