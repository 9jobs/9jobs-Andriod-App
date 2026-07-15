import { buildMessageThread, buildPricingScreenContent, buildTrackerSummaryFromApplications, buildUserHomeMetrics, mapJobsWithUserState } from "@/lib/data/live-sync";
import { previewMobileUser } from "@/lib/data/preview-user";
import { supabase } from "@/lib/supabase/client";
import { setTheme } from "@/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PremiumScreenContent } from "@/lib/data/premium-content";
import type { Job } from "@/types/jobs";
import type { CandidateProfile } from "@/types/profile";
import type { SessionUser } from "@/types/auth";

type ProfileRow = {
  id: string;
  full_name: string;
  headline: string | null;
  location: string | null;
  email: string;
  phone_number: string | null;
  avatar_url: string | null;
  linkedin_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  dark_mode: boolean | null;
  biometric: boolean | null;
  push_notifications: boolean | null;
  weekly_goal: string | null;
  subscription_plan: string | null;
  role?: string | null;
  account_status?: string | null;
  assigned_consultant_id?: string | null;
  timezone?: string | null;
};

type SystemSettingsRow = {
  id: number;
  maintenance_mode: boolean;
  push_notifications_enabled: boolean;
  dark_mode_override: boolean;
};

type ApplicationRow = {
  id: number;
  user_id: string;
  client_id?: string | null;
  job_id: string;
  status: string;
  current_stage?: string | null;
  application_date?: string | null;
  applied_at?: string | null;
  is_saved?: boolean | null;
  is_active?: boolean | null;
  offer_received_at?: string | null;
  hired_at?: string | null;
  recruiter_email?: string | null;
  recruiter_phone?: string | null;
  hiring_manager_email?: string | null;
  created_at: string;
};

type InterviewRow = {
  id: number;
  client_id: string;
  application_id: number;
  interview_date: string;
  status: string;
};

type FollowUpRow = {
  id: number;
  client_id: string;
  application_id: number;
  due_date: string;
  completed_at: string | null;
  status: string;
};

type RecruiterContactRow = {
  id: number;
  client_id: string;
  application_id: number | null;
  recruiter_name: string | null;
  company_name?: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url?: string | null;
  contact_date: string | null;
  response_status: string | null;
};

type ColdEmailRow = {
  id: number;
  client_id: string;
  application_id: number | null;
  sent_at: string | null;
  delivery_status: string | null;
};

type ClientScoreRow = {
  id: number;
  client_id: string;
  application_id: number | null;
  ats_score: number | null;
  ai_match_score: number | null;
  calculated_at: string | null;
  recommendations: string[] | null;
  score_reason: string | null;
};

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

type SavedJobRow = {
  user_id: string;
  job_id: string;
};

type CategoryRow = {
  id: number;
  name: string;
};

type ServiceRow = {
  id: string;
  title: string;
  description: string;
  status: string;
  visibility: boolean | null;
};

type PricingPlanRow = {
  id: string;
  name: string;
  price: string;
  features: string[] | null;
};

type SubscriptionRow = {
  user_id: string;
  plan_id: string | null;
  status: string;
};

type ResumeScoreRow = {
  user_id: string;
  score: number;
  suggestions: string[] | null;
  notes: string | null;
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
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_mime_type?: string | null;
  attachment_size?: number | null;
  status: string;
  seen_at?: string | null;
  delivered_at?: string | null;
  created_at: string;
};

const seedCategoryNames = [
  "Career Growth",
  "AI Resume",
  "Outreach",
  "Interview",
  "Remote",
] as const;

const seedServices = [
  {
    id: "job-tracker",
    title: "Job Application Service",
    description: "Apply, track applications, deadlines, and offer-stage updates in one synced workflow.",
    status: "active",
    visibility: true,
  },
  {
    id: "resume-intelligence",
    title: "Resume Intelligence",
    description: "AI scoring, ATS optimization, keyword guidance, and recruiter-ready upgrades.",
    status: "active",
    visibility: true,
  },
  {
    id: "hiring-manager-outreach",
    title: "Hiring Manager Outreach",
    description: "Find contacts, craft messages, and track response momentum from one place.",
    status: "active",
    visibility: true,
  },
  {
    id: "interview-prep",
    title: "Interview Prep",
    description: "Mock interviews, AI feedback, and role-specific preparation loops.",
    status: "active",
    visibility: true,
  },
  {
    id: "success-stories",
    title: "Success Stories",
    description: "Learn from real 9Jobs journeys and offer wins.",
    status: "active",
    visibility: true,
  },
];

const seedPricingPlans = [
  {
    id: "free",
    name: "Free Starter",
    price: "₹0/month",
    features: ["Basic job search", "1 Resume score scan", "Saved jobs"],
  },
  {
    id: "pro",
    name: "Pro Candidate",
    price: "₹999/month",
    features: ["Unlimited jobs", "AI resume intelligence", "Hiring manager outreach", "Priority support"],
  },
  {
    id: "elite",
    name: "Elite Premium",
    price: "₹2999/month",
    features: ["Everything in Pro", "Mock interviews", "Dedicated career coach", "Resume writing service"],
  },
];

const supportWelcomeMessage = "Welcome to the live 9Jobs preview. This thread is synced with the admin panel.";
const fallbackSupportReply =
  "Thanks for contacting 9Jobs. Your message has been received and shared with our support team. An admin will respond shortly.";

export type LiveServiceCard = {
  id: string;
  title: string;
  subtitle: string;
  icon: "resume" | "mail" | "mic" | "tracker" | "star" | "pricing";
  route: string;
  badge: string | null;
  isIconDark: boolean;
};

export type LiveMessage = MessageRow & {
  direction: "incoming" | "outgoing";
};

export type LiveOutreachContact = {
  id: number;
  name: string;
  email: string;
  position: string;
  profileLink: string;
  responseStatus: string;
};

export type MobileSyncSnapshot = {
  profile: CandidateProfile & {
    id: string;
    avatarUrl: string;
    phoneNumber: string;
    linkedinUrl: string;
    facebookUrl: string;
    instagramUrl: string;
    twitterUrl: string;
    subscriptionPlanId: string | null;
    timezone: string;
  };
  systemSettings: {
    maintenanceMode: boolean;
    pushNotificationsEnabled: boolean;
    darkModeOverride: boolean;
  };
  jobs: Job[];
  rawApplications: ApplicationRow[];
  homeMetrics: {
    totalApplications: number;
    todayApplied: number;
    interviewing: number;
    offers: number;
    resumeScore: number;
  };
  trackerSummary: {
    currentFocus: {
      totalActiveRoles: number;
      message: string;
    };
    applied: number;
    interviewing: number;
    offers: number;
    saved: number;
    totalApplications: number;
    applicationsToday: number;
    underReview: number;
    recruiterContacted: number;
    shortlisted: number;
    upcomingInterviews: number;
    interviewCompleted: number;
    offersReceived: number;
    hired: number;
    rejected: number;
    successRate: number;
    responseRate: number;
    followupsDue: number;
    aiMatchScore: number;
    atsResumeScore: number;
    coldEmailsSent: number;
    hiringManagersContacted: number;
    lastUpdatedAt: string;
  };
  messages: LiveMessage[];
  outreachContacts: LiveOutreachContact[];
  messageThread: ReturnType<typeof buildMessageThread>;
  services: LiveServiceCard[];
  pricingContent: PremiumScreenContent;
  activePlanId: string | null;
};

function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured for the mobile app.");
  }

  return supabase;
}

async function ensurePreviewUserRecords(sessionUser?: SessionUser | null) {
  const client = requireSupabase();
  const activeUser = resolveActiveUser(sessionUser);

  try {
    const { error: categoryError } = await client
      .from("job_categories")
      .upsert(seedCategoryNames.map((name) => ({ name })), { onConflict: "name" });
    if (categoryError) throw categoryError;
  } catch (e: any) {
    console.warn("Seeding job_categories failed (likely due to RLS):", e.message || e);
  }

  try {
    const { error: serviceError } = await client.from("services").upsert(seedServices, { onConflict: "id" });
    if (serviceError) throw serviceError;
  } catch (e: any) {
    console.warn("Seeding services failed (likely due to RLS):", e.message || e);
  }

  try {
    const { error: planError } = await client.from("pricing_plans").upsert(seedPricingPlans, { onConflict: "id" });
    if (planError) throw planError;
  } catch (e: any) {
    console.warn("Seeding pricing_plans failed (likely due to RLS):", e.message || e);
  }

  try {
    const profilePayload = {
      id: activeUser.id,
      full_name: activeUser.fullName,
      headline: activeUser.headline,
      location: activeUser.location,
      email: activeUser.email,
      avatar_url: activeUser.avatarUrl,
      weekly_goal: activeUser.weeklyGoal,
      subscription_plan: activeUser.subscriptionPlan,
      role: "client",
      account_status: "active",
    };
    const { error: profileError } = await client.from("profiles").upsert([profilePayload], { onConflict: "id" });
    if (profileError) throw profileError;
  } catch (e: any) {
    console.warn("Seeding profile failed (likely due to RLS):", e.message || e);
  }

  try {
    const { error: systemSettingsError } = await client
      .from("system_settings")
      .upsert([{ id: 1, maintenance_mode: false, push_notifications_enabled: true, dark_mode_override: false }], { onConflict: "id" });
    if (systemSettingsError) throw systemSettingsError;
  } catch (e: any) {
    console.warn("Seeding system_settings failed (likely due to RLS):", e.message || e);
  }

  try {
    const { error: subscriptionError } = await client
      .from("user_subscriptions")
      .upsert([{ user_id: activeUser.id, plan_id: activeUser.subscriptionPlan, status: "active" }], { onConflict: "user_id" });
    if (subscriptionError) throw subscriptionError;
  } catch (e: any) {
    console.warn("Seeding user_subscriptions failed (likely due to RLS):", e.message || e);
  }

  try {
    const { error: resumeError } = await client
      .from("resume_scores")
      .upsert([{ user_id: activeUser.id, score: 97, suggestions: [], notes: "Live preview score" }], { onConflict: "user_id" });
    if (resumeError) throw resumeError;
  } catch (e: any) {
    console.warn("Seeding resume_scores failed (likely due to RLS):", e.message || e);
  }

  try {
    const seedJobs = [
      {
        id: "job_resume_lead",
        title: "Sr. Frontend Engineer",
        company: "Stripe",
        location: "Remote",
        salary: "$165k/yr",
        job_type: "Full-time",
        posted_at: "5h ago",
        match_score: 98,
        tags: ["React", "Remote"],
        description: "Build polished candidate-facing experiences across the premium 9Jobs workflow.",
      },
      {
        id: "job_growth_specialist",
        title: "Product Designer",
        company: "Figma",
        location: "SF",
        salary: "$145k/yr",
        job_type: "Full-time",
        posted_at: "2d ago",
        match_score: 94,
        tags: ["Design", "Systems"],
        description: "Shape the systems and product surfaces used by thousands of design-led teams.",
      },
      {
        id: "job_interview_coach",
        title: "DX Engineer",
        company: "Vercel",
        location: "Remote",
        salary: "$155k/yr",
        job_type: "Remote",
        posted_at: "1d ago",
        match_score: 91,
        tags: ["Developer Experience", "Remote"],
        description: "Improve developer workflows and platform adoption across global engineering teams.",
      },
      {
        id: "job_pipeline_growth",
        title: "Job Search Growth Specialist",
        company: "Greenline Talent",
        location: "Interview",
        salary: "$140k/yr",
        job_type: "Full-time",
        posted_at: "5h ago",
        match_score: 88,
        tags: ["Pipeline", "Recruiting"],
        description: "Support high-output job-search operations with strong follow-up and funnel tracking.",
      },
    ];

    const { error: jobsError } = await client.from("jobs").upsert(seedJobs, { onConflict: "id" });
    if (jobsError) throw jobsError;
  } catch (e: any) {
    console.warn("Seeding jobs failed (likely due to RLS):", e.message || e);
  }

  try {
    const { data: existingApplications, error: applicationsError } = await client
      .from("applications")
      .select("id")
      .eq("user_id", activeUser.id);
    if (applicationsError) throw applicationsError;

    if (!existingApplications || existingApplications.length === 0) {
      const { error } = await client.from("applications").insert([
        { user_id: activeUser.id, client_id: activeUser.id, job_id: "job_resume_lead", status: "applied", current_stage: "applied", application_date: new Date().toISOString(), applied_at: new Date().toISOString(), company_name: "Stripe", job_title: "Sr. Frontend Engineer", job_location: "Remote", is_active: true },
        { user_id: activeUser.id, client_id: activeUser.id, job_id: "job_growth_specialist", status: "interview_scheduled", current_stage: "interview_scheduled", application_date: new Date().toISOString(), applied_at: new Date().toISOString(), company_name: "Figma", job_title: "Product Designer", job_location: "SF", is_active: true },
        { user_id: activeUser.id, client_id: activeUser.id, job_id: "job_interview_coach", status: "offer_received", current_stage: "offer_received", application_date: new Date().toISOString(), applied_at: new Date().toISOString(), company_name: "Vercel", job_title: "DX Engineer", job_location: "Remote", offer_received_at: new Date().toISOString(), is_active: true },
      ]);
      if (error) throw error;
    }
  } catch (e: any) {
    console.warn("Seeding applications failed (likely due to RLS):", e.message || e);
  }

  try {
    const { data: existingSavedJobs, error: savedJobsError } = await client
      .from("saved_jobs")
      .select("job_id")
      .eq("user_id", activeUser.id);
    if (savedJobsError) throw savedJobsError;

    if (!existingSavedJobs || existingSavedJobs.length === 0) {
      const { error } = await client.from("saved_jobs").insert([
        { user_id: activeUser.id, job_id: "job_pipeline_growth" },
      ]);
      if (error) throw error;
    }
  } catch (e: any) {
    console.warn("Seeding saved_jobs failed (likely due to RLS):", e.message || e);
  }

  try {
    let existingMessages;
    try {
      const { data, error } = await client
        .from("messages")
        .select("id")
        .eq("conversation_id", activeUser.id);
      if (error) throw error;
      existingMessages = data;
    } catch (e: any) {
      const { data, error } = await client
        .from("messages")
        .select("id")
        .or(`sender_id.eq.${activeUser.id},recipient_id.eq.${activeUser.id}`);
      if (error) throw error;
      existingMessages = data;
    }

    if (!existingMessages || existingMessages.length === 0) {
      try {
        const { error: convError } = await client.from("conversations").upsert([
          {
            id: activeUser.id,
            client_id: activeUser.id,
            status: "open",
            type: "support",
          }
        ], { onConflict: "id" });
        if (convError) throw convError;

        const { error } = await client.from("messages").insert([
          {
            conversation_id: activeUser.id,
            sender_id: "admin",
            sender_role: "admin",
            recipient_id: activeUser.id,
            text: "Welcome to the live 9Jobs preview. This thread is synced with the admin panel.",
            status: "delivered",
          },
        ]);
        if (error) throw error;
      } catch (newSchemaErr: any) {
        const { error } = await client.from("messages").insert([
          {
            sender_id: "admin",
            recipient_id: activeUser.id,
            content: "Welcome to the live 9Jobs preview. This thread is synced with the admin panel.",
          },
        ]);
        if (error) throw error;
      }
    }
  } catch (e: any) {
    console.warn("Seeding messages failed (likely due to RLS):", e.message || e);
  }
}

function mapProfile(profile: ProfileRow, activePlanId: string | null): MobileSyncSnapshot["profile"] {
  return {
    id: profile.id,
    fullName: profile.full_name,
    headline: profile.headline ?? "",
    location: profile.location ?? "",
    email: profile.email,
    darkMode: profile.dark_mode ?? false,
    biometric: profile.biometric ?? false,
    pushNotifications: profile.push_notifications ?? true,
    weeklyGoal: profile.weekly_goal ?? "",
    avatarUrl: profile.avatar_url ?? previewMobileUser.avatarUrl,
    phoneNumber: profile.phone_number ?? "",
    linkedinUrl: profile.linkedin_url ?? "",
    facebookUrl: profile.facebook_url ?? "",
    instagramUrl: profile.instagram_url ?? "",
    twitterUrl: profile.twitter_url ?? "",
    subscriptionPlanId: activePlanId,
    timezone: profile.timezone ?? "Australia/Melbourne",
  };
}

function mapServices(services: ServiceRow[]): LiveServiceCard[] {
  const metadata: Record<string, Omit<LiveServiceCard, "id">> = {
    "job-tracker": {
      title: "Job Application Service",
      subtitle: "Apply, track applications, deadlines, and offer-stage updates in one synced workflow.",
      icon: "tracker",
      route: "/(app)/tracker",
      badge: null,
      isIconDark: true,
    },
    tracker: {
      title: "Job Application Service",
      subtitle: "Apply, track applications, deadlines, and offer-stage updates in one synced workflow.",
      icon: "tracker",
      route: "/(app)/tracker",
      badge: null,
      isIconDark: true,
    },
    "resume-intelligence": {
      title: "Resume Intelligence",
      subtitle: "AI scoring, ATS optimization, keyword guidance, and recruiter-ready upgrades.",
      icon: "resume",
      route: "/(app)/resume",
      badge: "AI",
      isIconDark: true,
    },
    "hiring-manager-outreach": {
      title: "Hiring Manager Outreach",
      subtitle: "Find contacts, craft messages, and track response momentum from one place.",
      icon: "mail",
      route: "/(app)/outreach",
      badge: "PRO",
      isIconDark: true,
    },
    "interview-prep": {
      title: "Interview Prep",
      subtitle: "Mock interviews, AI feedback, and role-specific preparation loops.",
      icon: "mic",
      route: "/(app)/interview",
      badge: "AI",
      isIconDark: true,
    },
    "success-stories": {
      title: "Success Stories",
      subtitle: "Learn from real 9Jobs journeys and offer wins.",
      icon: "star",
      route: "/(app)/stories",
      badge: null,
      isIconDark: true,
    },
  };

  const serviceOrder = [
    "job-tracker",
    "tracker",
    "resume-intelligence",
    "hiring-manager-outreach",
    "interview-prep",
    "success-stories",
  ];

  const activeServices = services
    .filter((service) => service.visibility !== false && service.status === "active")
    .map((service) => {
      const override = metadata[service.id];
      return {
        id: service.id,
        title: override?.title ?? service.title,
        subtitle: override?.subtitle ?? service.description,
        icon: override?.icon ?? ("resume" as const),
        route: override?.route ?? "/(app)/services",
        badge: override?.badge ?? null,
        isIconDark: override?.isIconDark ?? false,
      };
    })
    .sort((left, right) => {
      const leftIndex = serviceOrder.indexOf(left.id);
      const rightIndex = serviceOrder.indexOf(right.id);
      const normalizedLeft = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
      const normalizedRight = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;
      return normalizedLeft - normalizedRight;
    });

  activeServices.push({
    id: "pricing",
    title: "Pricing & Plans",
    subtitle: "Free, Pro, and Enterprise tiers",
    icon: "pricing",
    route: "/(app)/pricing",
    badge: null,
    isIconDark: false,
  });

  return activeServices;
}

function resolveMessageDirection(
  message: Pick<MessageRow, "sender_id" | "sender_role" | "recipient_id">,
  activeUserId: string,
): "incoming" | "outgoing" {
  if (message.sender_id === activeUserId) {
    return "outgoing";
  }

  if (message.recipient_id === activeUserId) {
    return "incoming";
  }

  return message.sender_role === "client" ? "outgoing" : "incoming";
}

function mapMessages(messages: MessageRow[], activeUserId: string): LiveMessage[] {
  return messages
    .slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((message) => ({
      ...message,
      content: message.text || message.content || "",
      direction: resolveMessageDirection(message, activeUserId),
    }));
}

let inMemoryStore: any = null;

function resolveActiveUser(sessionUser?: SessionUser | null) {
  return {
    id: sessionUser?.id ?? previewMobileUser.id,
    email: sessionUser?.email ?? previewMobileUser.email,
    fullName: sessionUser?.fullName ?? previewMobileUser.fullName,
    headline: previewMobileUser.headline,
    location: previewMobileUser.location,
    avatarUrl: previewMobileUser.avatarUrl,
    weeklyGoal: previewMobileUser.weeklyGoal,
    subscriptionPlan: previewMobileUser.subscriptionPlan,
  };
}

function buildSnapshotFromSource({
  activeUser,
  profileRow,
  jobsRows,
  applicationsRows,
  savedJobsRows,
  categoriesRows,
  messagesRows,
  servicesRows,
  plansRows,
  subscriptionRow,
  resumeScoreRow,
  systemSettingsRow,
  interviewsRows,
  followUpsRows,
  recruiterContactsRows,
  coldEmailsRows,
  clientScoresRows,
}: {
  activeUser: ReturnType<typeof resolveActiveUser>;
  profileRow?: ProfileRow | null;
  jobsRows: JobRow[];
  applicationsRows: ApplicationRow[];
  savedJobsRows: SavedJobRow[];
  categoriesRows: CategoryRow[];
  messagesRows: MessageRow[];
  servicesRows: ServiceRow[];
  plansRows: PricingPlanRow[];
  subscriptionRow?: SubscriptionRow | null;
  resumeScoreRow?: ResumeScoreRow | null;
  systemSettingsRow?: SystemSettingsRow | null;
  interviewsRows: InterviewRow[];
  followUpsRows: FollowUpRow[];
  recruiterContactsRows: RecruiterContactRow[];
  coldEmailsRows: ColdEmailRow[];
  clientScoresRows: ClientScoreRow[];
}): MobileSyncSnapshot {
  const categoriesById = Object.fromEntries(
    categoriesRows.map((category) => [category.id, category.name]),
  );

  const jobs = mapJobsWithUserState(
    jobsRows,
    applicationsRows,
    savedJobsRows,
    categoriesById,
  );

  const rawApplications = applicationsRows.map((application) => ({
    ...application,
    status: application.status === "interview" ? "interviewing" : application.status,
  }));

  const activePlanId = subscriptionRow?.plan_id ?? null;
  const resumeScore = resumeScoreRow?.score ?? 0;
  const profile = mapProfile(
    profileRow ?? {
      id: activeUser.id,
      full_name: activeUser.fullName,
      headline: activeUser.headline,
      location: activeUser.location,
      email: activeUser.email,
      phone_number: "",
      avatar_url: activeUser.avatarUrl,
      linkedin_url: "",
      facebook_url: "",
      instagram_url: "",
      twitter_url: "",
      dark_mode: false,
      biometric: false,
      push_notifications: true,
      weekly_goal: activeUser.weeklyGoal,
      subscription_plan: activeUser.subscriptionPlan,
      role: "client",
      account_status: "active",
      timezone: "Australia/Melbourne",
    },
    activePlanId,
  );
  const messages = mapMessages(messagesRows, activeUser.id);
  const systemSettings = {
    maintenanceMode: systemSettingsRow?.maintenance_mode ?? false,
    pushNotificationsEnabled: systemSettingsRow?.push_notifications_enabled ?? true,
    darkModeOverride: systemSettingsRow?.dark_mode_override ?? false,
  };

  return {
    profile,
    systemSettings,
    jobs,
    rawApplications,
    homeMetrics: buildUserHomeMetrics(
      rawApplications,
      resumeScore,
      new Date().toISOString(),
      profile.timezone || "Australia/Melbourne",
    ),
    trackerSummary: buildTrackerSummaryFromApplications(
      rawApplications,
      savedJobsRows.length,
      resumeScore,
      new Date().toISOString(),
      {
        timezone: profile.timezone || "Australia/Melbourne",
        interviews: interviewsRows,
        followUps: followUpsRows,
        recruiterContacts: recruiterContactsRows,
        coldEmails: coldEmailsRows,
        scores: clientScoresRows,
      },
    ),
    messages,
    outreachContacts: recruiterContactsRows.map((contact) => ({
      id: contact.id,
      name: contact.recruiter_name?.trim() || "Hiring Manager",
      email: contact.email?.trim() || "",
      position: contact.company_name?.trim() || "",
      profileLink: contact.linkedin_url?.trim() || "",
      responseStatus: contact.response_status?.trim() || "no_response",
    })),
    messageThread: buildMessageThread(messages, profile.fullName),
    services: mapServices(servicesRows),
    pricingContent: buildPricingScreenContent(plansRows, activePlanId),
    activePlanId,
  };
}

async function fetchBackendSnapshot(activeUser: ReturnType<typeof resolveActiveUser>) {
  const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || "http://10.0.2.2:3000";
  if (!backendUrl) {
    return null;
  }

  const token = await ensureBackendAuthToken(activeUser, backendUrl);

  if (!token) {
    return null;
  }

  const res = await fetch(
    `${backendUrl}/api/mobile/snapshot?userId=${encodeURIComponent(activeUser.id)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!res.ok) {
    throw new Error(`Backend mobile snapshot failed with HTTP ${res.status}`);
  }

  return await res.json();
}

async function ensureBackendAuthToken(activeUser: ReturnType<typeof resolveActiveUser>, backendUrl?: string) {
  const resolvedBackendUrl = backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL || "http://10.0.2.2:3000";
  if (!resolvedBackendUrl) {
    return null;
  }

  let token = await AsyncStorage.getItem("auth_token");
  if (token) {
    return token;
  }

  const tokenRes = await fetch(`${resolvedBackendUrl}/api/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: activeUser.id,
      email: activeUser.email,
      fullName: activeUser.fullName,
      role: "client",
    }),
  });

  if (!tokenRes.ok) {
    throw new Error(`Backend token bootstrap failed with HTTP ${tokenRes.status}`);
  }

  const tokenData = await tokenRes.json();
  token = tokenData?.token ?? null;
  if (token) {
    await AsyncStorage.setItem("auth_token", token);
  }

  return token;
}

async function getLocalSyncSnapshot(sessionUser?: SessionUser | null): Promise<MobileSyncSnapshot> {
  if (inMemoryStore) {
    return inMemoryStore;
  }

  try {
    const cached = await AsyncStorage.getItem("mobile_sync_snapshot_cache");
    if (cached) {
      inMemoryStore = JSON.parse(cached);
      return inMemoryStore;
    }
  } catch (err) {
    console.error("Failed to read from AsyncStorage cache:", err);
  }

  const activePlanId = "free";
  const resumeScore = 97;
  const activeUser = resolveActiveUser(sessionUser);

  const seedProfile: ProfileRow = {
    id: activeUser.id,
    full_name: activeUser.fullName,
    headline: activeUser.headline,
    location: activeUser.location,
    email: activeUser.email,
    phone_number: "+91 99999 99999",
    avatar_url: activeUser.avatarUrl,
    linkedin_url: "https://linkedin.com/in/ayesha",
    facebook_url: "",
    instagram_url: "",
    twitter_url: "",
    dark_mode: false,
    biometric: false,
    push_notifications: true,
    weekly_goal: activeUser.weeklyGoal,
    subscription_plan: activeUser.subscriptionPlan,
    timezone: "Australia/Melbourne",
  };

  const profile = mapProfile(seedProfile, activePlanId);

  const seedJobs = [
    {
      id: "job_resume_lead",
      title: "Sr. Frontend Engineer",
      company: "Stripe",
      location: "Remote",
      salary: "$165k/yr",
      job_type: "Full-time",
      category_id: 1,
      posted_at: "5h ago",
      match_score: 98,
      tags: ["React", "Remote"],
      description: "Build polished candidate-facing experiences across the premium 9Jobs workflow.",
    },
    {
      id: "job_growth_specialist",
      title: "Product Designer",
      company: "Figma",
      location: "SF",
      salary: "$145k/yr",
      job_type: "Full-time",
      category_id: 2,
      posted_at: "2d ago",
      match_score: 94,
      tags: ["Design", "Systems"],
      description: "Shape the systems and product surfaces used by thousands of design-led teams.",
    },
    {
      id: "job_interview_coach",
      title: "DX Engineer",
      company: "Vercel",
      location: "Remote",
      salary: "$155k/yr",
      job_type: "Remote",
      category_id: 5,
      posted_at: "1d ago",
      match_score: 91,
      tags: ["Developer Experience", "Remote"],
      description: "Improve developer workflows and platform adoption across global engineering teams.",
    },
    {
      id: "job_pipeline_growth",
      title: "Job Search Growth Specialist",
      company: "Greenline Talent",
      location: "Interview",
      salary: "$140k/yr",
      job_type: "Full-time",
      category_id: 4,
      posted_at: "5h ago",
      match_score: 88,
      tags: ["Pipeline", "Recruiting"],
      description: "Support high-output job-search operations with strong follow-up and funnel tracking.",
    },
  ];

  const categoriesById = {
    1: "Career Growth",
    2: "AI Resume",
    4: "Interview",
    5: "Remote",
  };

  const applications = [
    { id: 1, user_id: activeUser.id, client_id: activeUser.id, job_id: "job_resume_lead", status: "applied", current_stage: "applied", application_date: new Date().toISOString(), applied_at: new Date().toISOString(), is_active: true, created_at: new Date().toISOString() },
    { id: 2, user_id: activeUser.id, client_id: activeUser.id, job_id: "job_growth_specialist", status: "interview_scheduled", current_stage: "interview_scheduled", application_date: new Date().toISOString(), applied_at: new Date().toISOString(), is_active: true, created_at: new Date().toISOString() },
    { id: 3, user_id: activeUser.id, client_id: activeUser.id, job_id: "job_interview_coach", status: "offer_received", current_stage: "offer_received", application_date: new Date().toISOString(), applied_at: new Date().toISOString(), offer_received_at: new Date().toISOString(), is_active: true, created_at: new Date().toISOString() },
  ];

  const savedJobs = [{ user_id: activeUser.id, job_id: "job_pipeline_growth" }];

  const jobs = mapJobsWithUserState(
    seedJobs,
    applications,
    savedJobs,
    categoriesById,
  );

  const rawApplications = applications.map((app) => ({
    ...app,
    status: app.status === "interview" ? "interviewing" : app.status,
  }));

  const messages = [
    {
      id: 1,
      conversation_id: activeUser.id,
      sender_id: "admin",
      sender_role: "admin",
      recipient_id: activeUser.id,
      text: "Welcome to the live 9Jobs preview. This thread is synced with the admin panel.",
      content: "Welcome to the live 9Jobs preview. This thread is synced with the admin panel.",
      status: "seen",
      created_at: new Date().toISOString(),
    },
  ];


  const systemSettings = {
    maintenanceMode: false,
    pushNotificationsEnabled: true,
    darkModeOverride: false,
  };

  inMemoryStore = {
    profile,
    systemSettings,
    jobs,
    rawApplications,
    homeMetrics: buildUserHomeMetrics(rawApplications, resumeScore, new Date().toISOString()),
    trackerSummary: buildTrackerSummaryFromApplications(rawApplications, savedJobs.length, resumeScore, new Date().toISOString(), {
      timezone: seedProfile.timezone ?? "Australia/Melbourne",
      interviews: [{ application_id: 2, interview_date: new Date().toISOString(), status: "scheduled" }],
      coldEmails: [],
      followUps: [],
      recruiterContacts: [],
      scores: [{ application_id: null, ats_score: resumeScore, ai_match_score: 84, calculated_at: new Date().toISOString() }],
    }),
    messages: mapMessages(messages, activeUser.id),
    messageThread: buildMessageThread(mapMessages(messages, activeUser.id), profile.fullName),
    services: mapServices(seedServices as any),
    pricingContent: buildPricingScreenContent(seedPricingPlans as any, activePlanId),
    activePlanId,
  };

  return inMemoryStore;
}

export async function fetchMobileSyncSnapshot(sessionUser?: SessionUser | null): Promise<MobileSyncSnapshot> {
  try {
    const activeUser = resolveActiveUser(sessionUser);
    await ensurePreviewUserRecords(sessionUser);

    try {
      const backendSnapshot = await fetchBackendSnapshot(activeUser);
      if (backendSnapshot) {
        const snapshot = buildSnapshotFromSource({
          activeUser,
          profileRow: (backendSnapshot.profile as ProfileRow | null) ?? null,
          jobsRows: (backendSnapshot.jobs as JobRow[]) ?? [],
          applicationsRows: (backendSnapshot.applications as ApplicationRow[]) ?? [],
          savedJobsRows: (backendSnapshot.savedJobs as SavedJobRow[]) ?? [],
          categoriesRows: (backendSnapshot.categories as CategoryRow[]) ?? [],
          messagesRows: (backendSnapshot.messages as MessageRow[]) ?? [],
          servicesRows: (backendSnapshot.services as ServiceRow[]) ?? [],
          plansRows: (backendSnapshot.pricingPlans as PricingPlanRow[]) ?? [],
          subscriptionRow: (backendSnapshot.subscription as SubscriptionRow | null) ?? null,
          resumeScoreRow: (backendSnapshot.resumeScore as ResumeScoreRow | null) ?? null,
          systemSettingsRow: (backendSnapshot.systemSettings as SystemSettingsRow | null) ?? null,
          interviewsRows: (backendSnapshot.interviews as InterviewRow[]) ?? [],
          followUpsRows: (backendSnapshot.followUps as FollowUpRow[]) ?? [],
          recruiterContactsRows: (backendSnapshot.recruiterContacts as RecruiterContactRow[]) ?? [],
          coldEmailsRows: (backendSnapshot.coldEmails as ColdEmailRow[]) ?? [],
          clientScoresRows: (backendSnapshot.clientScores as ClientScoreRow[]) ?? [],
        });

        const isDarkMode = (snapshot.profile.darkMode ?? false) && !(snapshot.systemSettings.darkModeOverride ?? false);
        setTheme(isDarkMode);
        inMemoryStore = snapshot;
        void AsyncStorage.setItem("mobile_sync_snapshot_cache", JSON.stringify(snapshot));
        return snapshot;
      }
    } catch (backendErr) {
      console.warn("Backend mobile snapshot failed, falling back to direct Supabase fetch:", backendErr);
    }

    const client = requireSupabase();

    const messagesPromise = (async () => {
      try {
        const token = await AsyncStorage.getItem("auth_token");
        const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || "http://10.0.2.2:3000";
        const res = await fetch(`${backendUrl}/api/chat/messages`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data = await res.json();
        return { data, error: null };
      } catch (err) {
        console.warn("fetchMobileSyncSnapshot messages query failed, falling back to old query:", err);
        return await client.from("messages").select("*").or(`sender_id.eq.${activeUser.id},recipient_id.eq.${activeUser.id}`).order("created_at", { ascending: true });
      }
    })();


    const [
      profileResult,
      jobsResult,
      applicationsResult,
      savedJobsResult,
      categoriesResult,
      messagesResult,
      servicesResult,
      plansResult,
      subscriptionResult,
      resumeScoreResult,
      systemSettingsResult,
      interviewsResult,
      followUpsResult,
      recruiterContactsResult,
      coldEmailsResult,
      clientScoresResult,
    ] = await Promise.all([
      client.from("profiles").select("*").eq("id", activeUser.id).single(),
      client.from("jobs").select("*").order("created_at", { ascending: false }),
      client.from("applications").select("*").eq("user_id", activeUser.id).order("created_at", { ascending: false }),
      client.from("saved_jobs").select("*").eq("user_id", activeUser.id),
      client.from("job_categories").select("*"),
      messagesPromise,
      client.from("services").select("*").order("created_at", { ascending: true }),
      client.from("pricing_plans").select("*").order("created_at", { ascending: true }),
      client.from("user_subscriptions").select("*").eq("user_id", activeUser.id).maybeSingle(),
      client.from("resume_scores").select("*").eq("user_id", activeUser.id).maybeSingle(),
      client.from("system_settings").select("*").eq("id", 1).maybeSingle(),
      client.from("interviews").select("*").eq("client_id", activeUser.id).order("interview_date", { ascending: false }),
      client.from("follow_ups").select("*").eq("client_id", activeUser.id).order("due_date", { ascending: true }),
      client.from("recruiter_contacts").select("*").eq("client_id", activeUser.id).order("contact_date", { ascending: false }),
      client.from("cold_emails").select("*").eq("client_id", activeUser.id).order("sent_at", { ascending: false }),
      client.from("client_scores").select("*").eq("client_id", activeUser.id).order("calculated_at", { ascending: false }),
    ]);

    const results = [
      profileResult,
      jobsResult,
      applicationsResult,
      savedJobsResult,
      categoriesResult,
      messagesResult,
      servicesResult,
      plansResult,
      subscriptionResult,
      resumeScoreResult,
      systemSettingsResult,
      interviewsResult,
      followUpsResult,
      recruiterContactsResult,
      coldEmailsResult,
      clientScoresResult,
    ];

    for (const result of results) {
      if (result.error) {
        throw result.error;
      }
    }

    const snapshot = buildSnapshotFromSource({
      activeUser,
      profileRow: (profileResult.data as ProfileRow | null) ?? null,
      jobsRows: (jobsResult.data as JobRow[]) ?? [],
      applicationsRows: (applicationsResult.data as ApplicationRow[]) ?? [],
      savedJobsRows: (savedJobsResult.data as SavedJobRow[] | null) ?? [],
      categoriesRows: (categoriesResult.data as CategoryRow[]) ?? [],
      messagesRows: (messagesResult.data as MessageRow[]) ?? [],
      servicesRows: (servicesResult.data as ServiceRow[]) ?? [],
      plansRows: (plansResult.data as PricingPlanRow[]) ?? [],
      subscriptionRow: (subscriptionResult.data as SubscriptionRow | null) ?? null,
      resumeScoreRow: (resumeScoreResult.data as ResumeScoreRow | null) ?? null,
      systemSettingsRow: (systemSettingsResult.data as SystemSettingsRow | null) ?? null,
      interviewsRows: (interviewsResult.data as InterviewRow[] | null) ?? [],
      followUpsRows: (followUpsResult.data as FollowUpRow[] | null) ?? [],
      recruiterContactsRows: (recruiterContactsResult.data as RecruiterContactRow[] | null) ?? [],
      coldEmailsRows: (coldEmailsResult.data as ColdEmailRow[] | null) ?? [],
      clientScoresRows: (clientScoresResult.data as ClientScoreRow[] | null) ?? [],
    });

    const isDarkMode = (snapshot.profile.darkMode ?? false) && !(snapshot.systemSettings.darkModeOverride ?? false);
    setTheme(isDarkMode);

    inMemoryStore = snapshot;
    void AsyncStorage.setItem("mobile_sync_snapshot_cache", JSON.stringify(snapshot));

    return snapshot;
  } catch (err) {
    console.warn("Supabase fetch failed, falling back to local store:", err);
    const local = await getLocalSyncSnapshot(sessionUser);
    const isDarkMode = (local.profile.darkMode ?? false) && !(local.systemSettings.darkModeOverride ?? false);
    setTheme(isDarkMode);
    return local;
  }
}

export async function toggleSavedJob(jobId: string, sessionUser?: SessionUser | null) {
  const activeUser = resolveActiveUser(sessionUser);
  try {
    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || "http://10.0.2.2:3000";
    const token = await ensureBackendAuthToken(activeUser, backendUrl);
    if (!token) {
      throw new Error("Backend auth token missing.");
    }

    const res = await fetch(`${backendUrl}/api/mobile/saved-jobs/toggle`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ jobId }),
    });

    if (!res.ok) {
      const errorPayload = await res.json().catch(() => null);
      throw new Error(errorPayload?.error || `HTTP error ${res.status}`);
    }

    const payload = await res.json();
    const current = await getLocalSyncSnapshot(sessionUser);
    current.jobs = current.jobs.map((job) =>
      job.id === jobId ? { ...job, isSaved: Boolean(payload?.isSaved) } : job,
    );
    inMemoryStore = { ...current };
    void AsyncStorage.setItem("mobile_sync_snapshot_cache", JSON.stringify(inMemoryStore));
    return Boolean(payload?.isSaved);
  } catch (err) {
    console.warn("Backend toggleSavedJob failed, falling back to local store:", err);
  }

  const current = await getLocalSyncSnapshot(sessionUser);
  const hasJob = current.jobs.find((j) => j.id === jobId)?.isSaved;
  current.jobs = current.jobs.map((j) => (j.id === jobId ? { ...j, isSaved: !hasJob } : j));
  inMemoryStore = { ...current };
  void AsyncStorage.setItem("mobile_sync_snapshot_cache", JSON.stringify(inMemoryStore));
  return !hasJob;
}

export async function applyToJob(jobId: string, sessionUser?: SessionUser | null) {
  let appId = 0;
  const activeUser = resolveActiveUser(sessionUser);
  try {
    await ensurePreviewUserRecords(sessionUser);
    const client = requireSupabase();
    const { data: existing, error: readError } = await client
      .from("applications")
      .select("id")
      .eq("user_id", activeUser.id)
      .eq("job_id", jobId)
      .maybeSingle();

    if (readError) throw readError;

    if (existing?.id) {
      const { error } = await client.from("applications").update({ status: "applied" }).eq("id", existing.id);
      if (error) throw error;
      appId = existing.id;
    } else {
      const { data, error } = await client
        .from("applications")
        .insert([{ user_id: activeUser.id, client_id: activeUser.id, job_id: jobId, status: "applied", current_stage: "applied", application_date: new Date().toISOString(), applied_at: new Date().toISOString(), is_active: true }])
        .select("id")
        .single();
      if (error) throw error;
      appId = data.id;
    }
  } catch (err) {
    console.warn("Supabase applyToJob failed, updating local store:", err);
    appId = Math.floor(Math.random() * 1000000);
  }

  const current = await getLocalSyncSnapshot();
  current.jobs = current.jobs.map((j) => (j.id === jobId ? { ...j, isApplied: true, status: "applied" } : j));
  if (!current.rawApplications.find((app) => app.job_id === jobId)) {
    current.rawApplications.push({
      id: appId,
      user_id: activeUser.id,
      client_id: activeUser.id,
      job_id: jobId,
      status: "applied",
      current_stage: "applied",
      application_date: new Date().toISOString(),
      applied_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });
  }
  inMemoryStore = { ...current };
  void AsyncStorage.setItem("mobile_sync_snapshot_cache", JSON.stringify(inMemoryStore));
  return appId;
}

export async function updateApplicationStatus(jobId: string, status: ApplicationRow["status"], sessionUser?: SessionUser | null) {
  let applicationId = 0;
  const activeUser = resolveActiveUser(sessionUser);
  const normalizedStatus = status === "offer" ? "offer_received" : status === "contacted" ? "recruiter_contacted" : status === "interviewing" ? "interview_scheduled" : status;

  try {
    await ensurePreviewUserRecords(sessionUser);
    const client = requireSupabase();
    const { data: existing, error: readError } = await client
      .from("applications")
      .select("id")
      .eq("user_id", activeUser.id)
      .eq("job_id", jobId)
      .maybeSingle();

    if (readError) throw readError;

    if (existing?.id) {
      const patch: Record<string, unknown> = {
        status: normalizedStatus,
        current_stage: normalizedStatus,
        is_saved: normalizedStatus === "saved",
        is_active: !["hired", "rejected", "withdrawn", "closed"].includes(normalizedStatus),
      };
      if (normalizedStatus === "offer_received") patch.offer_received_at = new Date().toISOString();
      if (normalizedStatus === "hired") patch.hired_at = new Date().toISOString();
      const { error } = await client.from("applications").update(patch).eq("id", existing.id);
      if (error) throw error;
      applicationId = existing.id;
    } else {
      const { data, error } = await client
        .from("applications")
        .insert([{
          user_id: activeUser.id,
          client_id: activeUser.id,
          job_id: jobId,
          status: normalizedStatus,
          current_stage: normalizedStatus,
          is_saved: normalizedStatus === "saved",
          is_active: !["hired", "rejected", "withdrawn", "closed"].includes(normalizedStatus),
          application_date: new Date().toISOString(),
          applied_at: new Date().toISOString(),
          offer_received_at: normalizedStatus === "offer_received" ? new Date().toISOString() : null,
          hired_at: normalizedStatus === "hired" ? new Date().toISOString() : null,
        }])
        .select("id")
        .single();
      if (error) throw error;
      applicationId = data.id;
    }
  } catch (err) {
    console.warn("Supabase updateApplicationStatus failed, updating local store:", err);
    applicationId = Math.floor(Math.random() * 1000000);
  }

  const current = await getLocalSyncSnapshot();
  const existingIndex = current.rawApplications.findIndex((app) => app.job_id === jobId);
  if (existingIndex >= 0) {
    current.rawApplications[existingIndex] = {
      ...current.rawApplications[existingIndex],
      status,
    };
  } else {
    current.rawApplications.push({
      id: applicationId,
      user_id: activeUser.id,
      client_id: activeUser.id,
      job_id: jobId,
      status: normalizedStatus,
      current_stage: normalizedStatus,
      application_date: new Date().toISOString(),
      applied_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });
  }

  current.jobs = current.jobs.map((job) =>
    job.id === jobId
      ? {
          ...job,
          isApplied: normalizedStatus !== "saved",
          isSaved: normalizedStatus === "saved" ? true : job.isSaved,
          status: status as any,
        }
      : job,
  );

  const savedCount = current.jobs.filter((job) => job.isSaved).length;
  const resumeScore = current.homeMetrics.resumeScore ?? 75;
  current.homeMetrics = buildUserHomeMetrics(current.rawApplications, resumeScore, new Date().toISOString(), current.profile.timezone);
  current.trackerSummary = buildTrackerSummaryFromApplications(
    current.rawApplications,
    savedCount,
    resumeScore,
    new Date().toISOString(),
    { timezone: current.profile.timezone },
  );

  inMemoryStore = { ...current };
  void AsyncStorage.setItem("mobile_sync_snapshot_cache", JSON.stringify(inMemoryStore));

  return applicationId;
}

export async function updateProfile(
  patch: Partial<CandidateProfile & { avatarUrl?: string }>,
  sessionUser?: SessionUser | null,
) {
  const activeUser = resolveActiveUser(sessionUser);
  try {
    await ensurePreviewUserRecords(sessionUser);
    const client = requireSupabase();
    const dbPatch: Record<string, any> = {};
    if (typeof patch.darkMode === "boolean") dbPatch.dark_mode = patch.darkMode;
    if (typeof patch.biometric === "boolean") dbPatch.biometric = patch.biometric;
    if (typeof patch.pushNotifications === "boolean") dbPatch.push_notifications = patch.pushNotifications;
    if (typeof patch.avatarUrl === "string") dbPatch.avatar_url = patch.avatarUrl;

    const { error } = await client.from("profiles").update(dbPatch).eq("id", activeUser.id);
    if (error) throw error;
  } catch (err) {
    console.warn("Supabase updateProfile failed, updating local store:", err);
  }

  const current = await getLocalSyncSnapshot();
  if (typeof patch.darkMode === "boolean") current.profile.darkMode = patch.darkMode;
  if (typeof patch.biometric === "boolean") current.profile.biometric = patch.biometric;
  if (typeof patch.pushNotifications === "boolean") current.profile.pushNotifications = patch.pushNotifications;
  if (typeof patch.avatarUrl === "string") current.profile.avatarUrl = patch.avatarUrl;

  inMemoryStore = { ...current };
  void AsyncStorage.setItem("mobile_sync_snapshot_cache", JSON.stringify(inMemoryStore));
  
  const isDarkMode = (current.profile.darkMode ?? false) && !(current.systemSettings.darkModeOverride ?? false);
  setTheme(isDarkMode);

  return current.profile;
}

export async function updateSystemSettings(
  patch: Partial<{ maintenanceMode: boolean; pushNotificationsEnabled: boolean; darkModeOverride: boolean }>,
) {
  try {
    await ensurePreviewUserRecords();
    const client = requireSupabase();
    const dbPatch: Record<string, boolean> = {};
    if (typeof patch.maintenanceMode === "boolean") dbPatch.maintenance_mode = patch.maintenanceMode;
    if (typeof patch.pushNotificationsEnabled === "boolean") dbPatch.push_notifications_enabled = patch.pushNotificationsEnabled;
    if (typeof patch.darkModeOverride === "boolean") dbPatch.dark_mode_override = patch.darkModeOverride;

    const { error } = await client.from("system_settings").update(dbPatch).eq("id", 1);
    if (error) throw error;
  } catch (err) {
    console.warn("Supabase updateSystemSettings failed, updating local store:", err);
  }

  const current = await getLocalSyncSnapshot();
  if (typeof patch.maintenanceMode === "boolean") current.systemSettings.maintenanceMode = patch.maintenanceMode;
  if (typeof patch.pushNotificationsEnabled === "boolean") current.systemSettings.pushNotificationsEnabled = patch.pushNotificationsEnabled;
  if (typeof patch.darkModeOverride === "boolean") current.systemSettings.darkModeOverride = patch.darkModeOverride;

  inMemoryStore = { ...current };
  void AsyncStorage.setItem("mobile_sync_snapshot_cache", JSON.stringify(inMemoryStore));

  const isDarkMode = (current.profile.darkMode ?? false) && !(current.systemSettings.darkModeOverride ?? false);
  setTheme(isDarkMode);

  return current.systemSettings;
}

async function persistLocalSnapshot(snapshot: MobileSyncSnapshot) {
  inMemoryStore = { ...snapshot };
  await AsyncStorage.setItem("mobile_sync_snapshot_cache", JSON.stringify(inMemoryStore));
}

function normalizeLiveMessageFromSocketEvent(
  message: Partial<LiveMessage> & {
    sender_id: string;
    sender_role: string;
    content?: string;
    text?: string;
    client_message_id?: string;
    is_automated?: boolean;
    sender_type?: string;
  },
  activeUserId: string,
): LiveMessage {
  return buildLocalChatMessage({
    id:
      typeof message.id === "number"
        ? message.id
        : typeof message.id === "string" && /^\d+$/.test(message.id)
        ? Number(message.id)
        : undefined,
    conversation_id: message.conversation_id ?? activeUserId,
    sender_id: message.sender_id,
    sender_role: message.sender_role,
    recipient_id: message.recipient_id ?? (message.sender_role === "client" ? "admin" : activeUserId),
    content: message.content ?? message.text ?? "",
    client_message_id: message.client_message_id,
    direction: message.sender_role === "client" ? "outgoing" : "incoming",
    status: message.status ?? (message.sender_role === "client" ? "sent" : "delivered"),
    is_automated: message.is_automated ?? message.sender_id === "bot",
    sender_type:
      message.sender_type ?? (message.sender_id === "bot" ? "bot" : message.sender_role === "client" ? "client" : "admin"),
    created_at: message.created_at,
    seen_at: message.seen_at,
    delivered_at: message.delivered_at,
    message_type: message.message_type,
    attachment_url: message.attachment_url,
    attachment_name: message.attachment_name,
    attachment_mime_type: message.attachment_mime_type,
    attachment_size: message.attachment_size,
  }) as LiveMessage;
}

export function mergeIncomingSocketMessage(
  snapshot: MobileSyncSnapshot,
  message: Partial<LiveMessage> & {
    sender_id: string;
    sender_role: string;
    content?: string;
    text?: string;
    client_message_id?: string;
    is_automated?: boolean;
    sender_type?: string;
  },
  activeUserId?: string,
): MobileSyncSnapshot {
  const resolvedUserId = activeUserId ?? snapshot.profile.id ?? previewMobileUser.id;
  const normalizedMessage = normalizeLiveMessageFromSocketEvent(message, resolvedUserId);
  const nextMessages = [...snapshot.messages];
  const normalizedClientMessageId = (normalizedMessage as { client_message_id?: string }).client_message_id;

  const existingIndex = nextMessages.findIndex(
    (item) =>
      item.id === normalizedMessage.id ||
      (!!normalizedClientMessageId &&
        (item as { client_message_id?: string }).client_message_id === normalizedClientMessageId),
  );

  if (existingIndex >= 0) {
    nextMessages[existingIndex] = {
      ...nextMessages[existingIndex],
      ...normalizedMessage,
    };
  } else {
    nextMessages.push(normalizedMessage);
  }

  nextMessages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return {
    ...snapshot,
    messages: nextMessages,
    messageThread: buildMessageThread(nextMessages, snapshot.profile.fullName),
  };
}

export async function persistIncomingSocketMessage(
  message: Partial<LiveMessage> & {
    sender_id: string;
    sender_role: string;
    content?: string;
    text?: string;
    client_message_id?: string;
    is_automated?: boolean;
    sender_type?: string;
  },
  activeUserId?: string,
) {
  const current = await getLocalSyncSnapshot();
  const next = mergeIncomingSocketMessage(current, message, activeUserId);
  await persistLocalSnapshot(next);
  return next;
}

function buildLocalChatMessage(
  overrides: Partial<MobileSyncSnapshot["messages"][number]> & {
    content: string;
    sender_id: string;
    sender_role: string;
    direction: "incoming" | "outgoing";
    client_message_id?: string;
    is_automated?: boolean;
    sender_type?: string;
  }
) {
  const normalizedId =
    typeof overrides.id === "number"
      ? overrides.id
      : typeof overrides.id === "string" && /^\d+$/.test(overrides.id)
      ? Number(overrides.id)
      : Math.floor(Math.random() * 1000000);

  return {
    id: normalizedId,
    conversation_id: overrides.conversation_id ?? previewMobileUser.id,
    sender_id: overrides.sender_id,
    sender_role: overrides.sender_role,
    recipient_id: overrides.recipient_id ?? (overrides.direction === "incoming" ? previewMobileUser.id : "admin"),
    message_type: overrides.message_type ?? "text",
    text: overrides.content,
    content: overrides.content,
    attachment_url: overrides.attachment_url ?? null,
    attachment_name: overrides.attachment_name ?? null,
    attachment_mime_type: overrides.attachment_mime_type ?? null,
    attachment_size: overrides.attachment_size ?? null,
    status: overrides.status ?? (overrides.direction === "incoming" ? "delivered" : "sent"),
    client_message_id:
      overrides.client_message_id ??
      `${overrides.direction === "incoming" ? "bot" : "msg"}_${Math.random().toString(36).slice(2)}_${Date.now()}`,
    created_at: overrides.created_at ?? new Date().toISOString(),
    direction: overrides.direction,
    is_automated: overrides.is_automated ?? overrides.direction === "incoming",
    sender_type:
      overrides.sender_type ??
      (overrides.direction === "incoming" ? "bot" : "client"),
    seen_at: overrides.seen_at,
    delivered_at: overrides.delivered_at,
  };
}

async function resolveFallbackBotReply(userMessage: string, activeUserId: string) {
  try {
    return await getChatbotResponse(userMessage, activeUserId);
  } catch (error) {
    console.warn("Fallback bot reply generation failed, using generic support response:", error);
    return fallbackSupportReply;
  }
}

export async function clearAdminConversation(sessionUser?: SessionUser | null) {
  const activeUser = resolveActiveUser(sessionUser);
  let backendSucceeded = false;

  try {
    const token = await AsyncStorage.getItem("auth_token");
    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || "http://10.0.2.2:3000";
    const res = await fetch(`${backendUrl}/api/chat/messages/clear`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }

    backendSucceeded = true;
  } catch (error) {
    console.warn("clearAdminConversation backend call failed, falling back locally:", error);

    try {
      const client = requireSupabase();
      await client
        .from("messages")
        .delete()
        .or(`conversation_id.eq.${activeUser.id},sender_id.eq.${activeUser.id},recipient_id.eq.${activeUser.id}`);
    } catch (fallbackError) {
      console.warn("clearAdminConversation direct DB fallback failed, continuing with local cache reset:", fallbackError);
    }
  }

  const current = await getLocalSyncSnapshot(sessionUser);
  current.messages = [];
  current.messageThread = buildMessageThread(current.messages, current.profile.fullName);
  await persistLocalSnapshot(current);

  return { success: true, backendSucceeded };
}

export async function startNewAdminConversation(sessionUser?: SessionUser | null) {
  const activeUser = resolveActiveUser(sessionUser);
  let backendSucceeded = false;

  try {
    const token = await AsyncStorage.getItem("auth_token");
    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || "http://10.0.2.2:3000";
    const res = await fetch(`${backendUrl}/api/chat/messages/new`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }

    backendSucceeded = true;
  } catch (error) {
    console.warn("startNewAdminConversation backend call failed, falling back locally:", error);

    try {
      const client = requireSupabase();
      await client
        .from("messages")
        .delete()
        .or(`conversation_id.eq.${activeUser.id},sender_id.eq.${activeUser.id},recipient_id.eq.${activeUser.id}`);

      await client.from("messages").insert([
        {
          conversation_id: activeUser.id,
          sender_id: "admin",
          sender_role: "admin",
          recipient_id: activeUser.id,
          text: supportWelcomeMessage,
          status: "delivered",
        },
      ]);
    } catch (fallbackError) {
      console.warn("startNewAdminConversation direct DB fallback failed, continuing with local cache reset:", fallbackError);
    }
  }

  const current = await getLocalSyncSnapshot(sessionUser);
  current.messages = [
    buildLocalChatMessage({
      conversation_id: activeUser.id,
      sender_id: "admin",
      sender_role: "admin",
      recipient_id: activeUser.id,
      content: supportWelcomeMessage,
      direction: "incoming",
      status: "delivered",
      is_automated: true,
      sender_type: "bot",
    }) as any,
  ];
  current.messageThread = buildMessageThread(current.messages, current.profile.fullName);
  await persistLocalSnapshot(current);

  return { success: true, backendSucceeded };
}

export async function sendMessageToAdmin(content: string, sessionUser?: SessionUser | null) {
  const activeUser = resolveActiveUser(sessionUser);
  const clientMessageId = "msg_" + Math.random().toString(36).substring(2) + "_" + Date.now();
  return sendChatPayloadToAdmin({ text: content }, activeUser, clientMessageId, sessionUser);
}

export async function sendRichMessageToAdmin(
  payload: {
    text?: string;
    messageType?: "text" | "image" | "document";
    attachmentUrl?: string;
    attachmentName?: string;
    attachmentMimeType?: string;
    attachmentSize?: number;
  },
  sessionUser?: SessionUser | null,
) {
  const activeUser = resolveActiveUser(sessionUser);
  const clientMessageId = "msg_" + Math.random().toString(36).substring(2) + "_" + Date.now();
  return sendChatPayloadToAdmin(payload, activeUser, clientMessageId, sessionUser);
}

async function sendChatPayloadToAdmin(
  payload: {
    text?: string;
    messageType?: "text" | "image" | "document";
    attachmentUrl?: string;
    attachmentName?: string;
    attachmentMimeType?: string;
    attachmentSize?: number;
  },
  activeUser: SessionUser,
  clientMessageId: string,
  sessionUser?: SessionUser | null,
) {
  const content = payload.text ?? "";
  let backendSucceeded = false;
  let backendResult: {
    message?: {
      id?: number | string;
      conversation_id?: string;
      sender_id?: string;
      sender_role?: string;
      recipient_id?: string;
      content?: string;
      text?: string;
      status?: string;
      created_at?: string;
      client_message_id?: string;
      is_automated?: boolean;
      sender_type?: string;
      direction?: string;
      message_type?: string;
      attachment_url?: string;
      attachment_name?: string;
      attachment_mime_type?: string;
      attachment_size?: number;
    };
    botMessage?: {
      id?: number | string;
      conversation_id?: string;
      sender_id?: string;
      sender_role?: string;
      recipient_id?: string;
      content?: string;
      text?: string;
      status?: string;
      created_at?: string;
      client_message_id?: string;
      is_automated?: boolean;
      sender_type?: string;
      direction?: string;
      message_type?: string;
      attachment_url?: string;
      attachment_name?: string;
      attachment_mime_type?: string;
      attachment_size?: number;
    };
  } | null = null;
  
  try {
    const token = await AsyncStorage.getItem("auth_token");
    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || "http://10.0.2.2:3000";
    const res = await fetch(`${backendUrl}/api/chat/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        text: payload.text,
        clientMessageId,
        messageType: payload.messageType ?? "text",
        attachmentUrl: payload.attachmentUrl,
        attachmentName: payload.attachmentName,
        attachmentMimeType: payload.attachmentMimeType,
        attachmentSize: payload.attachmentSize,
      })
    });
    
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }
    const result = await res.json();
    console.log("[mobile-sync-repository] Message sent successfully to backend:", result.message?.id);
    backendResult = result;
    backendSucceeded = true;
  } catch (err) {
    console.warn("[mobile-sync-repository] sendMessageToAdmin backend call failed, falling back to direct db:", err);
    try {
      await ensurePreviewUserRecords(sessionUser);
      const client = requireSupabase();
      await client.from("conversations").upsert([
        { id: activeUser.id, client_id: activeUser.id, status: "open", type: "support" }
      ], { onConflict: "id" });
      await client.from("messages").insert([
        {
          conversation_id: activeUser.id,
          sender_id: activeUser.id,
          sender_role: "client",
          recipient_id: "admin",
          message_type: payload.messageType ?? "text",
          text: content,
          attachment_url: payload.attachmentUrl,
          attachment_name: payload.attachmentName,
          attachment_mime_type: payload.attachmentMimeType,
          attachment_size: payload.attachmentSize,
          client_message_id: clientMessageId,
          status: "sent",
        }
      ]);
    } catch (fallbackErr) {
      console.error("[mobile-sync-repository] Fallback DB insert failed:", fallbackErr);
    }
  }

  // Update local memory and AsyncStorage cache for instant UI feedback (optimistic update)
  const current = await getLocalSyncSnapshot();
  const outgoingMessage = backendSucceeded && backendResult?.message
    ? buildLocalChatMessage({
        id:
          typeof backendResult.message.id === "number"
            ? backendResult.message.id
            : typeof backendResult.message.id === "string" && /^\d+$/.test(backendResult.message.id)
            ? Number(backendResult.message.id)
            : undefined,
        conversation_id: backendResult.message.conversation_id ?? activeUser.id,
        sender_id: backendResult.message.sender_id ?? activeUser.id,
        sender_role: backendResult.message.sender_role ?? "client",
        recipient_id: backendResult.message.recipient_id ?? "admin",
        content: backendResult.message.content ?? backendResult.message.text ?? content,
        client_message_id: backendResult.message.client_message_id ?? clientMessageId,
        direction: "outgoing",
        status: backendResult.message.status ?? "sent",
        is_automated: false,
        sender_type: backendResult.message.sender_type ?? "client",
        message_type: backendResult.message.message_type ?? payload.messageType ?? "text",
        attachment_url: backendResult.message.attachment_url ?? payload.attachmentUrl,
        attachment_name: backendResult.message.attachment_name ?? payload.attachmentName,
        attachment_mime_type: backendResult.message.attachment_mime_type ?? payload.attachmentMimeType,
        attachment_size: backendResult.message.attachment_size ?? payload.attachmentSize,
      })
    : buildLocalChatMessage({
        conversation_id: activeUser.id,
        sender_id: activeUser.id,
        sender_role: "client",
        recipient_id: "admin",
        content,
        client_message_id: clientMessageId,
        direction: "outgoing",
        status: "sent",
        is_automated: false,
        sender_type: "client",
        message_type: payload.messageType ?? "text",
        attachment_url: payload.attachmentUrl,
        attachment_name: payload.attachmentName,
        attachment_mime_type: payload.attachmentMimeType,
        attachment_size: payload.attachmentSize,
      });
  current.messages.push(outgoingMessage as any);

  if (backendSucceeded && backendResult?.botMessage) {
    current.messages.push(
      buildLocalChatMessage({
        id:
          typeof backendResult.botMessage.id === "number"
            ? backendResult.botMessage.id
            : typeof backendResult.botMessage.id === "string" && /^\d+$/.test(backendResult.botMessage.id)
            ? Number(backendResult.botMessage.id)
            : undefined,
        conversation_id: backendResult.botMessage.conversation_id ?? activeUser.id,
        sender_id: backendResult.botMessage.sender_id ?? "bot",
        sender_role: backendResult.botMessage.sender_role ?? "admin",
        recipient_id: backendResult.botMessage.recipient_id ?? activeUser.id,
        content: backendResult.botMessage.content ?? backendResult.botMessage.text ?? fallbackSupportReply,
        client_message_id: backendResult.botMessage.client_message_id,
        direction: "incoming",
        status: backendResult.botMessage.status ?? "delivered",
        is_automated: backendResult.botMessage.is_automated ?? true,
        sender_type: backendResult.botMessage.sender_type ?? "bot",
        message_type: backendResult.botMessage.message_type ?? "text",
        attachment_url: backendResult.botMessage.attachment_url,
        attachment_name: backendResult.botMessage.attachment_name,
        attachment_mime_type: backendResult.botMessage.attachment_mime_type,
        attachment_size: backendResult.botMessage.attachment_size,
      }) as any,
    );
  } else if (!backendSucceeded) {
    const fallbackReply = await resolveFallbackBotReply(content, activeUser.id);
    current.messages.push(
      buildLocalChatMessage({
        conversation_id: activeUser.id,
        sender_id: "admin",
        sender_role: "admin",
        recipient_id: activeUser.id,
        content: fallbackReply,
        direction: "incoming",
        status: "delivered",
        is_automated: true,
        sender_type: "bot",
      }) as any,
    );
  }

  current.messageThread = buildMessageThread(current.messages, current.profile.fullName);
  await persistLocalSnapshot(current);
}


async function getChatbotResponse(userMessage: string, activeUserId: string): Promise<string> {
  const query = userMessage.toLowerCase();
  const client = requireSupabase();

  if (query.includes("ats") || query.includes("resume") || query.includes("cv") || query.includes("score")) {
    try {
      const { data: scoreData } = await client
        .from("resume_scores")
        .select("score")
        .eq("user_id", activeUserId)
        .maybeSingle();
      const score = scoreData?.score;
      if (score !== undefined && score !== null) {
        return `Your latest resume ATS score is ${score}/100. Navigate to the 'Optimize' section to get detailed feedback and recommendations to improve your score!`;
      }
    } catch (e) {
      console.warn("Error fetching ATS score for chatbot:", e);
    }
    return "9Jobs can prepare and optimize your resume for Australian employers and ATS systems. Your current ATS score can be reviewed from your profile or tracker when available.";
  }

  if (query.includes("how many") || query.includes("applied") || query.includes("jobs") || query.includes("applications") || query.includes("progress")) {
    try {
      const { count } = await client
        .from("applications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", activeUserId);
      if (count !== null && count !== undefined) {
        return `We have submitted ${count} targeted job applications on your behalf so far. You can track their status and details in the Tracker tab of the app!`;
      }
    } catch (e) {
      console.warn("Error fetching application count for chatbot:", e);
    }
    return "I can help you check your application progress. You can review all your submitted applications in the Tracker section.";
  }

  if (query.includes("interview") || query.includes("prep")) {
    try {
      const { data: interviews } = await client
        .from("interviews")
        .select("*")
        .eq("client_id", activeUserId)
        .order("interview_date", { ascending: true });
        
      if (interviews && interviews.length > 0) {
        const next = interviews[0];
        const dateStr = new Date(next.interview_date).toLocaleDateString();
        return `You have an upcoming interview for the role of '${next.job_title}' on ${dateStr}. 9Jobs can assist with interview preparation, common questions, and response practice. Please let us know if you need specific prep material!`;
      }
    } catch (e) {
      console.warn("Error fetching interviews for chatbot:", e);
    }
    return "9Jobs can assist with interview preparation, common questions, response practice, and interview follow-up support. Please share the job title and interview date if you have one scheduled.";
  }

  if (query.includes("plan") || query.includes("pricing") || query.includes("premium") || query.includes("upgrade") || query.includes("pro")) {
    return "9Jobs Premium offers three tiers: Free, Pro, and Enterprise. Upgrading unlocks AI Match scoring, custom cover letters, and direct cold email outreach to hiring managers. Check the 'Pricing' tab for details!";
  }
  if (query.includes("services") || query.includes("what do you do") || query.includes("how can you help")) {
    return "9Jobs supports clients with ATS resume preparation, cover letters, LinkedIn and SEEK optimization, targeted job applications, application tracking, recruiter follow-ups, and interview support.";
  }
  if (query.includes("hello") || query.includes("hi") || query.includes("hey") || query.includes("hii")) {
    return "Hello! Welcome to 9Jobs support. How can I help you with your job search today?";
  }
  if (query.includes("thanks") || query.includes("thank you")) {
    return "You're welcome! Please message us anytime you need assistance with your job search.";
  }
  if (query.includes("admin") || query.includes("human") || query.includes("person") || query.includes("consultant")) {
    return "I've notified the 9Jobs support team. An admin will review this conversation and respond as soon as possible.";
  }
  
  return "Thanks for contacting 9Jobs. Your message has been received and shared with our support team. An admin will review it and respond shortly.";
}

export async function markMessagesAsSeen(sessionUser?: SessionUser | null) {
  const activeUser = resolveActiveUser(sessionUser);
  try {
    const client = requireSupabase();
    const { error: msgError } = await client
      .from("messages")
      .update({ status: "seen", seen_at: new Date().toISOString() })
      .eq("conversation_id", activeUser.id)
      .neq("sender_role", "client")
      .is("seen_at", null);
    if (msgError) throw msgError;

    const { error: convError } = await client
      .from("conversations")
      .update({ client_unread_count: 0 })
      .eq("id", activeUser.id);
    if (convError) throw convError;
  } catch (err) {
    console.warn("Supabase markMessagesAsSeen failed:", err);
  }

  const current = await getLocalSyncSnapshot();
  current.messages = current.messages.map((m: any) => {
    if (m.direction === "incoming" && m.status !== "seen") {
      return { ...m, status: "seen", seen_at: new Date().toISOString() };
    }
    return m;
  });
  if (current.messageThread) {
    current.messageThread.unreadCount = 0;
  }
  inMemoryStore = { ...current };
  void AsyncStorage.setItem("mobile_sync_snapshot_cache", JSON.stringify(inMemoryStore));
}

export async function markMessagesAsDelivered(sessionUser?: SessionUser | null) {
  const activeUser = resolveActiveUser(sessionUser);
  try {
    const client = requireSupabase();
    const { error } = await client
      .from("messages")
      .update({ status: "delivered", delivered_at: new Date().toISOString() })
      .eq("conversation_id", activeUser.id)
      .neq("sender_role", "client")
      .eq("status", "sent");
    if (error) throw error;
  } catch (err) {
    console.warn("Supabase markMessagesAsDelivered failed:", err);
  }
}

export async function updateResumeScore(score: number, sessionUser?: SessionUser | null) {
  const activeUser = resolveActiveUser(sessionUser);
  try {
    await ensurePreviewUserRecords(sessionUser);
    const client = requireSupabase();
    const { error } = await client
      .from("resume_scores")
      .upsert([{ user_id: activeUser.id, score, suggestions: [], notes: "Scanned from mobile device" }], { onConflict: "user_id" });
    if (error) throw error;
  } catch (err) {
    console.warn("Supabase updateResumeScore failed, updating local store:", err);
  }

  const current = await getLocalSyncSnapshot();
  if (current.trackerSummary) {
    current.trackerSummary.atsResumeScore = score;
  }
  inMemoryStore = { ...current };
  void AsyncStorage.setItem("mobile_sync_snapshot_cache", JSON.stringify(inMemoryStore));
}
