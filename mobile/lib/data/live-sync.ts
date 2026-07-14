import type { PremiumScreenContent } from "@/lib/data/premium-content";
import type { ApplicationStatus, Job, JobCategory } from "@/types/jobs";

type JobRow = {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
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
  match_score?: number | null;
};

type SavedJobRow = {
  job_id: string;
};

type InterviewRow = {
  application_id: number;
  interview_date: string;
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

export function mapJobsWithUserState(
  jobs: JobRow[],
  applications: Array<ApplicationRow & { job_id: string }>,
  savedJobs: SavedJobRow[],
  categoriesById: Record<number, string>,
): Job[] {
  const savedJobIds = new Set(savedJobs.map((job) => job.job_id));
  const applicationsByJobId = new Map(applications.map((application) => [application.job_id, application]));

  return jobs.map((job) => {
    const application = applicationsByJobId.get(job.id);
    const categoryName = categoriesById[job.category_id ?? -1] as JobCategory | undefined;

    return {
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      salary: job.salary,
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
  const submittedApplications = applications.filter(isSubmittedApplication);

  return {
    totalApplications: submittedApplications.length,
    todayApplied: submittedApplications.filter((application) =>
      toTimezoneDateKey(
        application.application_date ?? application.applied_at ?? application.created_at,
        timezone,
      ) === today,
    ).length,
    interviewing: applications.filter((application) =>
      interviewStatuses.has(normalizeStatus(application.status)),
    ).length,
    offers: applications.filter((application) => {
      const normalized = normalizeStatus(application.status);
      return normalized === "offer_received" || Boolean(application.offer_received_at);
    }).length,
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
  },
) {
  const timezone = options?.timezone ?? defaultTimezone;
  const interviews = options?.interviews ?? [];
  const followUps = options?.followUps ?? [];
  const recruiterContacts = options?.recruiterContacts ?? [];
  const coldEmails = options?.coldEmails ?? [];
  const scores = options?.scores ?? [];

  const todayKey = toTimezoneDateKey(nowIsoString, timezone);
  const submittedApplications = applications.filter(isSubmittedApplication);
  const activeApplications = applications.filter(isActiveApplication);

  const applicationsToday = submittedApplications.filter((application) =>
    toTimezoneDateKey(
      application.application_date ?? application.applied_at ?? application.created_at,
      timezone,
    ) === todayKey,
  ).length;

  const underReview = applications.filter(
    (application) => normalizeStatus(application.status) === "under_review",
  ).length;

  const recruiterContactedIds = new Set<number>();
  for (const application of applications) {
    if (normalizeStatus(application.status) === "recruiter_contacted") {
      recruiterContactedIds.add(application.id);
    }
  }
  for (const contact of recruiterContacts) {
    if (typeof contact.application_id === "number") {
      recruiterContactedIds.add(contact.application_id);
    }
  }

  const shortlisted = applications.filter((application) => {
    const normalized = normalizeStatus(application.status);
    const stage = normalizeStatus(application.current_stage);
    return normalized === "shortlisted" || stage === "shortlisted";
  }).length;

  const interviewingIds = new Set<number>();
  for (const application of activeApplications) {
    if (interviewStatuses.has(normalizeStatus(application.status))) {
      interviewingIds.add(application.id);
    }
  }
  for (const interview of interviews) {
    if (typeof interview.application_id === "number" && interview.status === "scheduled") {
      interviewingIds.add(interview.application_id);
    }
  }

  const interviewCompletedIds = new Set<number>();
  for (const interview of interviews) {
    if (typeof interview.application_id === "number" && interview.status === "completed") {
      interviewCompletedIds.add(interview.application_id);
    }
  }

  const offers = applications.filter((application) => {
    const normalized = normalizeStatus(application.status);
    return normalized === "offer_received" || Boolean(application.offer_received_at);
  }).length;

  const hired = applications.filter((application) => {
    const normalized = normalizeStatus(application.status);
    return normalized === "hired" || Boolean(application.hired_at);
  }).length;

  const rejected = applications.filter(
    (application) => normalizeStatus(application.status) === "rejected",
  ).length;

  const successfulApplications = applications.filter((application) =>
    successfulStatuses.has(normalizeStatus(application.status)),
  ).length;

  const responseApplicationIds = new Set<number>();
  for (const application of applications) {
    if (responseStatuses.has(normalizeStatus(application.status))) {
      responseApplicationIds.add(application.id);
    }
  }
  for (const contact of recruiterContacts) {
    if (
      typeof contact.application_id === "number" &&
      contact.response_status &&
      contact.response_status !== "no_response"
    ) {
      responseApplicationIds.add(contact.application_id);
    }
  }

  const followUpsDue = followUps.filter((followUp) => {
    const status = followUp.status?.toLowerCase() ?? "pending";
    const isPendingLike = ["pending", "due", "overdue"].includes(status);
    return (
      isPendingLike &&
      !followUp.completed_at &&
      toTimezoneDateKey(followUp.due_date, timezone) <= todayKey
    );
  }).length;

  const activeScoreRows = scores.filter(
    (score) =>
      typeof score.application_id === "number" &&
      activeApplications.some((application) => application.id === score.application_id),
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

  const contactKeys = new Set<string>();
  for (const contact of recruiterContacts) {
    if (contact.contact_date || (contact.response_status && contact.response_status !== "no_response")) {
      contactKeys.add(buildUniqueContactKey(contact));
    }
  }
  for (const application of applications) {
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

  const totalActiveRoles = activeApplications.filter((application) => {
    const normalized = normalizeStatus(application.status);
    return !["hired", "rejected", "withdrawn", "closed"].includes(normalized);
  }).length;

  return {
    currentFocus: {
      totalActiveRoles,
      message: `${totalActiveRoles} total roles currently in active track`,
    },
    applied: submittedApplications.length,
    saved: Math.max(
      savedCount,
      applications.filter(
        (application) =>
          Boolean(application.is_saved) || normalizeStatus(application.status) === "saved",
      ).length,
    ),
    interviewing: interviewingIds.size,
    offers,
    totalApplications: submittedApplications.length,
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
      submittedApplications.length > 0
        ? (successfulApplications / submittedApplications.length) * 100
        : 0,
    ),
    responseRate: roundPercentage(
      submittedApplications.length > 0
        ? (responseApplicationIds.size / submittedApplications.length) * 100
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
  const lastMessage = [...messages].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

  return {
    id: "admin-thread",
    name: "9Jobs Admin",
    role: "Support",
    snippet: lastMessage?.content ?? `Chat with admin for ${previewUserName}`,
    time: lastMessage ? lastMessage.created_at : "",
    unreadCount: messages.filter((message) => (message.sender_role === "admin" || message.sender_id === "admin") && message.status !== "seen").length,
  };
}
