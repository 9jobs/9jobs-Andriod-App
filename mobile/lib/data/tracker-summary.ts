type TrackerSummaryLike = {
  currentFocus?: {
    totalActiveRoles?: number;
    message?: string;
  };
  applied?: number;
  saved?: number;
  interviewing?: number;
  offers?: number;
  totalApplications?: number;
  applicationsToday?: number;
  underReview?: number;
  recruiterContacted?: number;
  shortlisted?: number;
  upcomingInterviews?: number;
  interviewCompleted?: number;
  offersReceived?: number;
  hired?: number;
  rejected?: number;
  successRate?: number;
  responseRate?: number;
  followupsDue?: number;
  followUpsDue?: number;
  aiMatchScore?: number;
  atsResumeScore?: number;
  atsScore?: number;
  coldEmailsSent?: number;
  hiringManagersContacted?: number;
  contactsReached?: number;
  lastUpdatedAt?: string;
} | null | undefined;

export const trackerSummaryDefaults = {
  currentFocus: {
    totalActiveRoles: 0,
    message: "0 total roles currently in active track",
  },
  applied: 0,
  saved: 0,
  interviewing: 0,
  offers: 0,
  totalApplications: 0,
  applicationsToday: 0,
  underReview: 0,
  recruiterContacted: 0,
  shortlisted: 0,
  upcomingInterviews: 0,
  interviewCompleted: 0,
  offersReceived: 0,
  hired: 0,
  rejected: 0,
  successRate: 0,
  responseRate: 0,
  followupsDue: 0,
  aiMatchScore: 0,
  atsResumeScore: 0,
  coldEmailsSent: 0,
  hiringManagersContacted: 0,
  lastUpdatedAt: "",
};

export function normalizeTrackerSummary(summary: TrackerSummaryLike) {
  const next = { ...trackerSummaryDefaults, ...(summary ?? {}) };

  return {
    ...next,
    currentFocus: {
      totalActiveRoles:
        summary?.currentFocus?.totalActiveRoles ??
        next.currentFocus.totalActiveRoles,
      message:
        summary?.currentFocus?.message ??
        next.currentFocus.message,
    },
    followupsDue:
      summary?.followupsDue ??
      summary?.followUpsDue ??
      next.followupsDue,
    atsResumeScore:
      summary?.atsResumeScore ??
      summary?.atsScore ??
      next.atsResumeScore,
    hiringManagersContacted:
      summary?.hiringManagersContacted ??
      summary?.contactsReached ??
      next.hiringManagersContacted,
  };
}
