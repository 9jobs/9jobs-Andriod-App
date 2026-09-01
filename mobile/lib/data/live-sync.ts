import type { PremiumScreenContent } from "@/lib/data/premium-content";
import type { ApplicationStatus, Job, JobCategory } from "@/types/jobs";

type JobRow = {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  job_link?: string | null;
  posted_at: string;
  match_score: number | null;
  tags: string[] | null;
  description: string;
  category_id: number | null;
};

type ApplicationRow = {
  id: number;
  job_id?: string;
  status: string | null;
  current_stage?: string | null;
  updated_at?: string | null;
  created_at: string;
  application_date?: string | null;
  applied_at?: string | null;
  is_saved?: boolean | null;
  is_active?: boolean | null;
  offer_received_at?: string | null;
  hired_at?: string | null;
  recruiter_email?: string | null;
  recruiter_phone?: string | null;
  hiring_manager_email?: string | null;
  company_name?: string | null;
  job_title?: string | null;
  job_location?: string | null;
  salary_range?: string | null;
  job_description?: string | null;
  match_score?: number | null;
};

type SavedJobRow = {
  job_id: string;
};

type InterviewRow = {
  id?: number;
  client_id?: string;
  application_id: number;
  interview_date: string;
  status: string | null;
  interview_type?: string | null;
  interview_round?: string | null;
  interviewer_name?: string | null;
  interviewer_email?: string | null;
  admin_notes?: string | null;
  meeting_link?: string | null;
  location?: string | null;
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

type PricingPlanRow = {
  id: string;
  name: string;
  price: string;
  features: string[] | null;
};

type MessageRow = {
  id: number;
  conversation_id: string;
  sender_id: string;
  sender_role: string;
  recipient_id?: string | null;
  message_type?: string;
  text?: string;
  content?: string;
  status?: string;
  seen_at?: string | null;
  delivered_at?: string | null;
  created_at: string;
};

const categoryFallback: JobCategory = "Career Growth";
const defaultTimezone = "Australia/Melbourne";
const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();

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

function safeNumber(value: unknown, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function normalizeStatus(status: string | null | undefined): string {
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

function normalizeJobStatus(status: string | null | undefined): ApplicationStatus {
  const normalized = normalizeStatus(status);
  switch (normalized) {
    case "saved":
      return "saved";
    case "applied":
    case "under_review":
    case "recruiter_contacted":
      return normalized === "recruiter_contacted" ? "contacted" : "applied";
    case "shortlisted":
      return "shortlisted";
    case "phone_interview":
    case "video_interview":
    case "face_to_face_interview":
    case "interview_scheduled":
    case "second_interview":
    case "reference_check":
      return "interviewing";
    case "interview_completed":
      return "interview_completed";
    case "offer_received":
      return "offer";
    case "hired":
      return "hired";
    case "rejected":
      return "rejected";
    default:
      return "draft";
  }
}

function toTimezoneDateKey(isoString: string | null | undefined, timezone = defaultTimezone) {
  if (!isoString) {
    return "";
  }

  try {
    let formatter = dateFormatterCache.get(timezone);
    if (!formatter) {
      formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      dateFormatterCache.set(timezone, formatter);
    }
    return formatter.format(new Date(isoString));
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

function getApplicationOrderingTime(application: ApplicationRow) {
  return new Date(
    application.updated_at ??
      application.application_date ??
      application.applied_at ??
      application.created_at ??
      0,
  ).getTime();
}

function isSubmittedApplication(application: ApplicationRow) {
  return submittedStatuses.has(normalizeStatus(application.status));
}

function isActiveApplication(application: ApplicationRow) {
  if (typeof application.is_active === "boolean") {
    return application.is_active;
  }

  const normalized = normalizeStatus(application.status);
  return !["hired", "rejected", "withdrawn", "closed"].includes(normalized);
}

function buildUniqueContactKey(contact: RecruiterContactRow) {
  const email = contact.email?.trim().toLowerCase();
  if (email) {
    return `email:${email}`;
  }

  const phone = contact.phone?.replace(/\D/g, "");
  if (phone) {
    return `phone:${phone}`;
  }

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

export function mapJobsWithUserState(
  jobs: JobRow[],
  applications: Array<ApplicationRow & { job_id: string }>,
  savedJobs: SavedJobRow[],
  categoriesById: Record<number, string>,
): Job[] {
  const savedJobIds = new Set(savedJobs.map((job) => job.job_id));
  const applicationsByJobId = new Map<string, ApplicationRow & { job_id: string }>();

  for (const application of applications) {
    const existing = applicationsByJobId.get(application.job_id);
    if (!existing || getApplicationOrderingTime(application) >= getApplicationOrderingTime(existing)) {
      applicationsByJobId.set(application.job_id, application);
    }
  }

  return jobs.map((job) => {
    const application = applicationsByJobId.get(job.id);
    const categoryName = categoriesById[job.category_id ?? -1] as JobCategory | undefined;

    return {
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      salary: job.salary,
      jobLink: job.job_link ?? "",
      category: categoryName ?? categoryFallback,
      postedAt: job.posted_at,
      matchScore: job.match_score ?? 80,
      tags: job.tags ?? [],
      description: job.description,
      isSaved: savedJobIds.has(job.id) || Boolean(application?.is_saved),
      isApplied: Boolean(application) && normalizeStatus(application?.status) !== "saved",
      status: application ? normalizeJobStatus(application.status) : "draft",
    };
  });
}

export function buildUserHomeMetrics(
  applications: ApplicationRow[],
  resumeScore: number,
  nowIsoString: string,
  timezone = defaultTimezone,
) {
  const today = toTimezoneDateKey(nowIsoString, timezone);
  let totalApplications = 0;
  let todayApplied = 0;
  let interviewing = 0;
  let offers = 0;

  for (const application of applications) {
    const normalizedStatus = normalizeStatus(application.status);
    const isSubmitted = submittedStatuses.has(normalizedStatus);

    if (isSubmitted) {
      totalApplications += 1;
      if (
        toTimezoneDateKey(
          application.application_date ?? application.applied_at ?? application.created_at,
          timezone,
        ) === today
      ) {
        todayApplied += 1;
      }
    }

    if (interviewStatuses.has(normalizedStatus)) {
      interviewing += 1;
    }

    if (normalizedStatus === "offer_received" || Boolean(application.offer_received_at)) {
      offers += 1;
    }
  }

  return {
    totalApplications,
    todayApplied,
    interviewing,
    offers,
    resumeScore: safeNumber(resumeScore, 0),
  };
}

export function buildTrackerSummaryFromApplications(
  applications: ApplicationRow[],
  savedCount: number,
  resumeScore: number = 0,
  nowIsoString: string = new Date().toISOString(),
  options?: {
    timezone?: string;
    interviews?: InterviewRow[];
    followUps?: FollowUpRow[];
    recruiterContacts?: RecruiterContactRow[];
    coldEmails?: ColdEmailRow[];
    scores?: ClientScoreRow[];
    activityLogs?: ActivityLogRow[];
  },
) {
  const timezone = options?.timezone ?? defaultTimezone;
  const interviews = options?.interviews ?? [];
  const followUps = options?.followUps ?? [];
  const recruiterContacts = options?.recruiterContacts ?? [];
  const coldEmails = options?.coldEmails ?? [];
  const scores = options?.scores ?? [];
  const activityLogs = options?.activityLogs ?? [];

  const todayKey = toTimezoneDateKey(nowIsoString, timezone);
  const existingApplicationIds = new Set(applications.map((application) => application.id));
  const activeApplicationIds = new Set<number>();
  const underReviewIds = new Set<number>();
  const recruiterContactedIds = new Set<number>();
  const interviewingIds = new Set<number>();
  const shortlistedIds = new Set<number>();
  const offerReceivedIds = new Set<number>();
  const hiredIds = new Set<number>();
  const rejectedIds = new Set<number>();
  const responseApplicationIds = new Set<number>();
  const contactKeys = new Set<string>();
  const activeApplicationScoreIds = new Set<number>();

  let applied = 0;
  let applicationsToday = 0;
  let underReview = 0;
  let shortlisted = 0;
  let offers = 0;
  let hired = 0;
  let rejected = 0;
  let successfulApplications = 0;
  let saved = 0;
  let totalActiveRoles = 0;

  for (const application of applications) {
    const normalizedStatus = normalizeStatus(application.status);
    const normalizedStage = normalizeStatus(application.current_stage);
    const submitted = submittedStatuses.has(normalizedStatus);
    const active = isActiveApplication(application);

    if (submitted) {
      applied += 1;
      if (
        toTimezoneDateKey(
          application.application_date ?? application.applied_at ?? application.created_at,
          timezone,
        ) === todayKey
      ) {
        applicationsToday += 1;
      }
    }

    if (active) {
      activeApplicationIds.add(application.id);
      totalActiveRoles += 1;
      activeApplicationScoreIds.add(application.id);
      if (interviewStatuses.has(normalizedStatus)) {
        interviewingIds.add(application.id);
      }
    }

    if (normalizedStatus === "under_review") {
      underReviewIds.add(application.id);
    }

    if (normalizedStatus === "recruiter_contacted") {
      recruiterContactedIds.add(application.id);
    }

    if (normalizedStatus === "shortlisted" || normalizedStage === "shortlisted") {
      shortlistedIds.add(application.id);
    }

    if (normalizedStatus === "offer_received" || Boolean(application.offer_received_at)) {
      offerReceivedIds.add(application.id);
    }

    if (normalizedStatus === "hired" || Boolean(application.hired_at)) {
      hiredIds.add(application.id);
    }

    if (normalizedStatus === "rejected") {
      rejectedIds.add(application.id);
    }

    if (successfulStatuses.has(normalizedStatus)) {
      successfulApplications += 1;
    }

    if (responseStatuses.has(normalizedStatus)) {
      responseApplicationIds.add(application.id);
    }

    if (Boolean(application.is_saved) || normalizedStatus === "saved") {
      saved += 1;
    }

    const recruiterEmail = application.recruiter_email?.trim().toLowerCase();
    const recruiterPhone = application.recruiter_phone?.replace(/\D/g, "");
    const managerEmail = application.hiring_manager_email?.trim().toLowerCase();
    if (recruiterEmail) {
      contactKeys.add(`email:${recruiterEmail}`);
    } else if (recruiterPhone) {
      contactKeys.add(`phone:${recruiterPhone}`);
    } else if (managerEmail) {
      contactKeys.add(`email:${managerEmail}`);
    }
  }

  for (const contact of recruiterContacts) {
    if (typeof contact.application_id === "number") {
      recruiterContactedIds.add(contact.application_id);
      if (contact.response_status && contact.response_status !== "no_response") {
        responseApplicationIds.add(contact.application_id);
      }
    }

    if (contact.contact_date || (contact.response_status && contact.response_status !== "no_response")) {
      contactKeys.add(buildUniqueContactKey(contact));
    }
  }

  const interviewCompletedIds = new Set<number>();
  for (const interview of interviews) {
    if (typeof interview.application_id === "number" && interview.status === "scheduled") {
      interviewingIds.add(interview.application_id);
    }
    if (typeof interview.application_id === "number" && interview.status === "completed") {
      interviewCompletedIds.add(interview.application_id);
    }
  }

  for (const application of applications) {
    const normalizedStatus = normalizeStatus(application.status);
    const normalizedStage = normalizeStatus(application.current_stage);
    if (normalizedStatus === "interview_completed" || normalizedStage === "interview_completed") {
      interviewCompletedIds.add(application.id);
    }
  }

  for (const activity of activityLogs) {
    if (typeof activity.application_id !== "number" || !existingApplicationIds.has(activity.application_id)) {
      continue;
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
  }

  shortlisted = shortlistedIds.size;
  underReview = underReviewIds.size;
  offers = offerReceivedIds.size;
  hired = hiredIds.size;
  rejected = rejectedIds.size;

  const followUpsDue = followUps.filter((followUp) => {
    const status = followUp.status?.toLowerCase() ?? "pending";
    const isPendingLike = ["pending", "due", "overdue"].includes(status);
    return (
      isPendingLike &&
      !followUp.completed_at &&
      toTimezoneDateKey(followUp.due_date, timezone) <= todayKey
    );
  }).length;

  const activeScoreRows = scores.filter((score) =>
    typeof score.application_id === "number" && activeApplicationScoreIds.has(score.application_id),
  );
  const aiScoreSource = activeScoreRows.filter((score) => Number.isFinite(score.ai_match_score));
  const aiMatchScore = aiScoreSource.length > 0
    ? Math.round(
        aiScoreSource.reduce((sum, score) => sum + safeNumber(score.ai_match_score), 0) /
          aiScoreSource.length,
      )
    : Math.round(
        safeNumber(
          scores
            .filter((score) => Number.isFinite(score.ai_match_score))
            .sort((a, b) => (b.calculated_at ?? "").localeCompare(a.calculated_at ?? ""))[0]
            ?.ai_match_score,
          0,
        ),
      );

  const latestAtsScore = Math.round(
    safeNumber(
      scores
        .filter((score) => Number.isFinite(score.ats_score))
        .sort((a, b) => (b.calculated_at ?? "").localeCompare(a.calculated_at ?? ""))[0]
        ?.ats_score,
      resumeScore,
    ),
  );

  const coldEmailsSent = coldEmails.filter((email) => {
    const deliveryStatus = email.delivery_status?.toLowerCase() ?? "";
    return Boolean(email.sent_at) && !["draft", "failed"].includes(deliveryStatus);
  }).length;

  return {
    currentFocus: {
      totalActiveRoles,
      message: `${totalActiveRoles} total roles currently in active track`,
    },
    applied,
    saved: Math.max(savedCount, saved),
    interviewing: interviewingIds.size,
    offers,
    totalApplications: applied,
    applicationsToday,
    underReview,
    recruiterContacted: recruiterContactedIds.size,
    shortlisted,
    upcomingInterviews: interviewingIds.size,
    interviewCompleted: interviewCompletedIds.size,
    offersReceived: offers,
    hired,
    rejected,
    successRate: roundPercentage(
      applied > 0
        ? (successfulApplications / applied) * 100
        : 0,
    ),
    responseRate: roundPercentage(
      applied > 0
        ? (responseApplicationIds.size / applied) * 100
        : 0,
    ),
    followupsDue: followUpsDue,
    aiMatchScore: Math.max(0, Math.min(100, aiMatchScore || 0)),
    atsResumeScore: Math.max(0, Math.min(100, latestAtsScore || 0)),
    coldEmailsSent,
    hiringManagersContacted: contactKeys.size,
    lastUpdatedAt: new Date().toISOString(),
  };
}

export function buildPricingScreenContent(
  plans: PricingPlanRow[],
  activePlanId: string | null,
): PremiumScreenContent {
  return {
    key: "pricing",
    title: "A plan for anyone, anytime",
    subtitle: "Choose the level of support that matches your job-search stage and urgency.",
    kicker: "UPGRADE",
    primaryCta: { label: "Start Pro plan", href: "/(app)/contact" },
    secondaryCta: { label: "Talk to support", href: "/(app)/contact" },
    highlights: plans.slice(0, 3).map((plan) => plan.name),
    sections: [
      {
        title: "Plan options",
        items: plans.map((plan) => ({
          title: plan.name,
          subtitle: (plan.features ?? []).join(" • "),
          badge: plan.id === activePlanId ? "Active" : "Plan",
          detail: plan.price,
        })),
      },
    ],
  };
}

export function buildMessageThread(messages: MessageRow[], previewUserName: string) {
  let latestMessage: MessageRow | null = null;
  let unreadCount = 0;

  for (const message of messages) {
    if ((message.sender_role === "admin" || message.sender_id === "admin") && message.status !== "seen") {
      unreadCount += 1;
    }

    if (!latestMessage) {
      latestMessage = message;
      continue;
    }

    const currentTime = message.created_at ? new Date(message.created_at).getTime() : 0;
    const latestTime = latestMessage.created_at ? new Date(latestMessage.created_at).getTime() : 0;
    if (currentTime > latestTime) {
      latestMessage = message;
    }
  }

  return {
    id: "admin-thread",
    name: "9Jobs Admin",
    role: "Support",
    snippet: latestMessage?.content || latestMessage?.text || "Welcome! How can we help you today?",
    time: latestMessage ? latestMessage.created_at : "",
    unreadCount,
  };
}
