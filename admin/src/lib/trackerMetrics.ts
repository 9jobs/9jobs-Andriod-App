type ApplicationRow = {
  id: number;
  status: string | null;
  current_stage?: string | null;
  application_date?: string | null;
  applied_at?: string | null;
  created_at: string;
  is_saved?: boolean | null;
  is_active?: boolean | null;
  offer_received_at?: string | null;
  hired_at?: string | null;
  recruiter_email?: string | null;
  recruiter_phone?: string | null;
  hiring_manager_email?: string | null;
};

type InterviewRow = {
  application_id: number;
  status: string | null;
};

type FollowUpRow = {
  due_date: string;
  completed_at?: string | null;
  status: string | null;
};

type RecruiterContactRow = {
  id?: number;
  application_id?: number | null;
  email?: string | null;
  phone?: string | null;
  recruiter_name?: string | null;
  contact_date?: string | null;
  response_status?: string | null;
};

type ColdEmailRow = {
  sent_at?: string | null;
  delivery_status?: string | null;
};

type ClientScoreRow = {
  application_id?: number | null;
  ats_score?: number | null;
  ai_match_score?: number | null;
  calculated_at?: string | null;
};

type ActivityLogRow = {
  application_id?: number | null;
  old_value?: unknown;
  new_value?: unknown;
};

const submittedStatuses = new Set([
  "applied",
  "under_review",
  "recruiter_contacted",
  "shortlisted",
  "phone_interview",
  "video_interview",
  "face_to_face_interview",
  "interview_scheduled",
  "interview_completed",
  "second_interview",
  "reference_check",
  "offer_received",
  "hired",
  "rejected",
  "withdrawn",
  "closed",
  "contacted",
  "interviewing",
  "offer",
]);

const interviewStatuses = new Set([
  "phone_interview",
  "video_interview",
  "face_to_face_interview",
  "interview_scheduled",
  "second_interview",
  "reference_check",
  "interviewing",
]);

const successfulStatuses = new Set([
  "shortlisted",
  "phone_interview",
  "video_interview",
  "face_to_face_interview",
  "interview_scheduled",
  "interview_completed",
  "second_interview",
  "reference_check",
  "offer_received",
  "hired",
  "interviewing",
  "offer",
]);

const responseStatuses = new Set([
  "under_review",
  "recruiter_contacted",
  "shortlisted",
  "phone_interview",
  "video_interview",
  "face_to_face_interview",
  "interview_scheduled",
  "interview_completed",
  "second_interview",
  "reference_check",
  "offer_received",
  "hired",
  "rejected",
  "contacted",
  "interviewing",
  "offer",
]);

function normalizeStatus(status: string | null | undefined) {
  switch (status) {
    case "offer":
      return "offer_received";
    case "contacted":
      return "recruiter_contacted";
    case "interviewing":
      return "interview_scheduled";
    default:
      return status?.trim().toLowerCase() ?? "draft";
  }
}

function toTimezoneDateKey(isoString: string | null | undefined, timezone = "Australia/Melbourne") {
  if (!isoString) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(isoString));
  } catch {
    return isoString.slice(0, 10);
  }
}

function roundPercentage(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.round(value * 10) / 10;
}

function isSubmittedApplication(application: ApplicationRow) {
  return submittedStatuses.has(normalizeStatus(application.status));
}

function isActiveApplication(application: ApplicationRow) {
  if (typeof application.is_active === "boolean") {
    return application.is_active;
  }

  return !["hired", "rejected", "withdrawn", "closed"].includes(normalizeStatus(application.status));
}

function buildContactKey(contact: RecruiterContactRow) {
  const email = contact.email?.trim().toLowerCase();
  if (email) return `email:${email}`;

  const phone = contact.phone?.replace(/\D/g, "");
  if (phone) return `phone:${phone}`;

  const name = contact.recruiter_name?.trim().toLowerCase();
  return name ? `name:${name}` : `contact:${contact.id ?? Math.random()}`;
}

function extractNormalizedStatusesFromActivityValue(value: unknown) {
  if (!value || typeof value !== "object") {
    return [];
  }

  const record = value as Record<string, unknown>;
  const statuses = new Set<string>();
  const status = normalizeStatus(typeof record.status === "string" ? record.status : null);
  const stage = normalizeStatus(typeof record.current_stage === "string" ? record.current_stage : null);

  if (status && status !== "draft") {
    statuses.add(status);
  }
  if (stage && stage !== "draft") {
    statuses.add(stage);
  }

  return Array.from(statuses);
}

export function calculateTrackerMetrics(input: {
  applications: ApplicationRow[];
  interviews?: InterviewRow[];
  followUps?: FollowUpRow[];
  recruiterContacts?: RecruiterContactRow[];
  coldEmails?: ColdEmailRow[];
  scores?: ClientScoreRow[];
  activityLogs?: ActivityLogRow[];
  savedCount?: number;
  timezone?: string;
}) {
  const timezone = input.timezone ?? "Australia/Melbourne";
  const applications = input.applications ?? [];
  const interviews = input.interviews ?? [];
  const followUps = input.followUps ?? [];
  const recruiterContacts = input.recruiterContacts ?? [];
  const coldEmails = input.coldEmails ?? [];
  const scores = input.scores ?? [];
  const activityLogs = input.activityLogs ?? [];
  const savedCount = input.savedCount ?? 0;
  const todayKey = toTimezoneDateKey(new Date().toISOString(), timezone);

  const submittedApplications = applications.filter(isSubmittedApplication);
  const activeApplications = applications.filter(isActiveApplication);
  const existingApplicationIds = new Set(applications.map((application) => application.id));

  const recruiterContactedIds = new Set<number>();
  const underReviewIds = new Set<number>();
  const offerReceivedIds = new Set<number>();
  const hiredIds = new Set<number>();
  const rejectedIds = new Set<number>();
  applications.forEach((application) => {
    if (normalizeStatus(application.status) === "under_review") {
      underReviewIds.add(application.id);
    }
    if (normalizeStatus(application.status) === "recruiter_contacted") {
      recruiterContactedIds.add(application.id);
    }
    if (normalizeStatus(application.status) === "offer_received" || Boolean(application.offer_received_at)) {
      offerReceivedIds.add(application.id);
    }
    if (normalizeStatus(application.status) === "hired" || Boolean(application.hired_at)) {
      hiredIds.add(application.id);
    }
    if (normalizeStatus(application.status) === "rejected") {
      rejectedIds.add(application.id);
    }
  });
  recruiterContacts.forEach((contact) => {
    if (typeof contact.application_id === "number") {
      recruiterContactedIds.add(contact.application_id);
    }
  });

  const shortlistedIds = new Set<number>();
  applications.forEach((application) => {
    if (
      normalizeStatus(application.status) === "shortlisted" ||
      normalizeStatus(application.current_stage) === "shortlisted"
    ) {
      shortlistedIds.add(application.id);
    }
  });

  const interviewingIds = new Set<number>();
  activeApplications.forEach((application) => {
    if (interviewStatuses.has(normalizeStatus(application.status))) {
      interviewingIds.add(application.id);
    }
  });
  interviews.forEach((interview) => {
    if (interview.status === "scheduled") {
      interviewingIds.add(interview.application_id);
    }
  });

  const interviewCompletedIds = new Set<number>();
  interviews.forEach((interview) => {
    if (interview.status === "completed") {
      interviewCompletedIds.add(interview.application_id);
    }
  });
  applications.forEach((application) => {
    const normalizedStatus = normalizeStatus(application.status);
    const normalizedStage = normalizeStatus(application.current_stage);
    if (normalizedStatus === "interview_completed" || normalizedStage === "interview_completed") {
      interviewCompletedIds.add(application.id);
    }
  });

  activityLogs.forEach((activity) => {
    if (typeof activity.application_id !== "number" || !existingApplicationIds.has(activity.application_id)) {
      return;
    }

    const historicalStatuses = new Set<string>([
      ...extractNormalizedStatusesFromActivityValue(activity.old_value),
      ...extractNormalizedStatusesFromActivityValue(activity.new_value),
    ]);

    if (historicalStatuses.has("recruiter_contacted")) {
      recruiterContactedIds.add(activity.application_id);
    }
    if (historicalStatuses.has("under_review")) {
      underReviewIds.add(activity.application_id);
    }
    if (historicalStatuses.has("shortlisted")) {
      shortlistedIds.add(activity.application_id);
    }
    if (historicalStatuses.has("interview_completed")) {
      interviewCompletedIds.add(activity.application_id);
    }
    if (historicalStatuses.has("offer_received")) {
      offerReceivedIds.add(activity.application_id);
    }
    if (historicalStatuses.has("hired")) {
      hiredIds.add(activity.application_id);
    }
    if (historicalStatuses.has("rejected")) {
      rejectedIds.add(activity.application_id);
    }
  });

  const responseApplicationIds = new Set<number>();
  applications.forEach((application) => {
    if (responseStatuses.has(normalizeStatus(application.status))) {
      responseApplicationIds.add(application.id);
    }
  });
  recruiterContacts.forEach((contact) => {
    if (
      typeof contact.application_id === "number" &&
      contact.response_status &&
      contact.response_status !== "no_response"
    ) {
      responseApplicationIds.add(contact.application_id);
    }
  });

  const contactKeys = new Set<string>();
  recruiterContacts.forEach((contact) => {
    if (contact.contact_date || (contact.response_status && contact.response_status !== "no_response")) {
      contactKeys.add(buildContactKey(contact));
    }
  });
  applications.forEach((application) => {
    const recruiterEmail = application.recruiter_email?.trim().toLowerCase();
    const recruiterPhone = application.recruiter_phone?.replace(/\D/g, "");
    const managerEmail = application.hiring_manager_email?.trim().toLowerCase();
    if (recruiterEmail) contactKeys.add(`email:${recruiterEmail}`);
    else if (recruiterPhone) contactKeys.add(`phone:${recruiterPhone}`);
    else if (managerEmail) contactKeys.add(`email:${managerEmail}`);
  });

  const latestAtsScore = scores
    .filter((score) => Number.isFinite(score.ats_score))
    .sort((a, b) => (b.calculated_at ?? "").localeCompare(a.calculated_at ?? ""))[0]
    ?.ats_score ?? 0;

  const activeAiScores = scores.filter(
    (score) =>
      typeof score.application_id === "number" &&
      activeApplications.some((application) => application.id === score.application_id) &&
      Number.isFinite(score.ai_match_score),
  );
  const latestAiScore = activeAiScores.length > 0
    ? Math.round(activeAiScores.reduce((sum, score) => sum + Number(score.ai_match_score ?? 0), 0) / activeAiScores.length)
    : scores
        .filter((score) => Number.isFinite(score.ai_match_score))
        .sort((a, b) => (b.calculated_at ?? "").localeCompare(a.calculated_at ?? ""))[0]
        ?.ai_match_score ?? 0;

  return {
    currentFocus: {
      totalActiveRoles: activeApplications.length,
      message: `${activeApplications.length} total roles currently in active track`,
    },
    applied: submittedApplications.length,
    interviewing: interviewingIds.size,
    offers: offerReceivedIds.size,
    saved: Math.max(savedCount, applications.filter((application) => Boolean(application.is_saved) || normalizeStatus(application.status) === "saved").length),
    totalApplications: submittedApplications.length,
    applicationsToday: submittedApplications.filter((application) =>
      toTimezoneDateKey(application.application_date ?? application.applied_at ?? application.created_at, timezone) === todayKey,
    ).length,
    underReview: underReviewIds.size,
    recruiterContacted: recruiterContactedIds.size,
    shortlisted: shortlistedIds.size,
    interviewCompleted: interviewCompletedIds.size,
    hired: hiredIds.size,
    rejected: rejectedIds.size,
    successRate: roundPercentage(
      submittedApplications.length > 0
        ? (applications.filter((application) => successfulStatuses.has(normalizeStatus(application.status))).length / submittedApplications.length) * 100
        : 0,
    ),
    responseRate: roundPercentage(
      submittedApplications.length > 0
        ? (responseApplicationIds.size / submittedApplications.length) * 100
        : 0,
    ),
    followUpsDue: followUps.filter((followUp) => {
      const status = followUp.status?.toLowerCase() ?? "pending";
      return ["pending", "due", "overdue"].includes(status) && !followUp.completed_at && toTimezoneDateKey(followUp.due_date, timezone) <= todayKey;
    }).length,
    aiMatchScore: Math.max(0, Math.min(100, Math.round(Number(latestAiScore ?? 0)))),
    atsScore: Math.max(0, Math.min(100, Math.round(Number(latestAtsScore ?? 0)))),
    coldEmailsSent: coldEmails.filter((email) => Boolean(email.sent_at) && !["draft", "failed"].includes((email.delivery_status ?? "").toLowerCase())).length,
    contactsReached: contactKeys.size,
    lastUpdatedAt: new Date().toISOString(),
  };
}
