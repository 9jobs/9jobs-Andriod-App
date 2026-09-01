import express, { Router, Response } from "express";
import { Pool } from "pg";
import { AuthenticatedRequest, authMiddleware } from "../middleware/auth";
import {
  deleteLocalRecruiterContact,
  deleteLocalProfile,
  getLocalRecruiterContacts,
  getLocalProfile,
  getLocalProfiles,
  getLocalSuccessStories,
  deleteLocalSuccessStory,
  upsertLocalRecruiterContact,
  upsertLocalProfile,
  upsertLocalSuccessStory,
} from "../lib/localDb";
import { canReachDatabaseUpstream, canReachSupabaseUpstream, supabase } from "../lib/supabase";
import { getMessagesHistory } from "../services/messageService";

const router = Router();
const SUCCESS_STORY_BUCKET = "assets";
const RESUME_BUCKET = "assets";
const GEMINI_RESUME_TIMEOUT_MS = 20_000;
const GEMINI_RESUME_TEXT_LIMIT = 18_000;
const snapshotResourceCache = new Map<string, { expiresAt: number; value: unknown; inFlight?: Promise<unknown> }>();
const LOCAL_SNAPSHOT_CATEGORY_ROWS = [
  { id: 1, name: "Career Growth" },
  { id: 2, name: "AI Resume" },
  { id: 3, name: "Outreach" },
  { id: 4, name: "Interview" },
  { id: 5, name: "Remote" },
];
const LOCAL_SNAPSHOT_SERVICE_ROWS = [
  {
    id: "job-tracker",
    title: "Job Application Service",
    description: "Apply, track applications, deadlines, and offer-stage updates in one synced workflow.",
    status: "active",
    visibility: true,
    created_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "resume-intelligence",
    title: "Resume Intelligence",
    description: "AI scoring, ATS optimization, keyword guidance, and recruiter-ready upgrades.",
    status: "active",
    visibility: true,
    created_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "hiring-manager-outreach",
    title: "Hiring Manager Outreach",
    description: "Find contacts, craft messages, and track response momentum from one place.",
    status: "active",
    visibility: true,
    created_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "interview-prep",
    title: "Interview Prep",
    description: "Mock interviews, AI feedback, and role-specific preparation loops.",
    status: "active",
    visibility: true,
    created_at: "2026-01-01T00:00:00.000Z",
  },
];
const LOCAL_SNAPSHOT_PRICING_PLAN_ROWS = [
  {
    id: "free",
    name: "Free Starter",
    price: "₹0/month",
    features: ["Basic job search", "1 Resume score scan", "Saved jobs"],
    created_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "pro",
    name: "Pro Candidate",
    price: "₹999/month",
    features: ["Unlimited jobs", "AI resume intelligence", "Hiring manager outreach", "Priority support"],
    created_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "elite",
    name: "Elite Premium",
    price: "₹2999/month",
    features: ["Everything in Pro", "Mock interviews", "Dedicated career coach", "Resume writing service"],
    created_at: "2026-01-01T00:00:00.000Z",
  },
];

type ResumeAnalysis = {
  atsScore: number;
  aiMatchScore: number;
  keywords: number;
  formatting: number;
  experience: number;
  impactVerbs: number;
  summary: string;
  suggestions: string[];
  roleSpecificScore: number;
  missingKeywords: string[];
  skillGapAnalysis: string[];
  formattingIssues: string[];
  grammarSuggestions: string[];
  achievementRewriting: Array<{ original: string; rewritten: string }>;
  resumeVersionComparison: string;
  jobDescriptionCompatibility: number;
  recruiterReadabilityScore: number;
  australianResumeComplianceCheck: { compliant: boolean; issues: string[] };
  coverLetter?: string;
};

function sanitizeAttachmentName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
}

async function ensurePublicAssetBucket() {
  const { data: bucket, error: bucketError } = await supabase.storage.getBucket(SUCCESS_STORY_BUCKET);
  if (!bucketError && bucket) {
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(SUCCESS_STORY_BUCKET, {
    public: true,
    fileSizeLimit: 15 * 1024 * 1024,
  });

  if (createError && !/already exists/i.test(createError.message || "")) {
    throw createError;
  }
}

function normalizeSuccessStoryPayload(story: any) {
  if (!story?.name || !story?.position || !story?.message) {
    return null;
  }

  const storyRate = Number(story.story_rate ?? story.storyRate ?? 5);
  const displayOrder = Number(story.display_order ?? story.displayOrder ?? 0);

  return {
    id: String(story.id || `story_${Math.random().toString(36).slice(2, 10)}`),
    name: String(story.name).trim(),
    position: String(story.position).trim(),
    year: String(story.year || "Recent").trim(),
    message: String(story.message).trim(),
    story_rate: Number.isFinite(storyRate) ? Math.max(1, Math.min(5, Math.round(storyRate))) : 5,
    photo_url: String(story.photo_url || story.photoUrl || "").trim(),
    display_order: Number.isFinite(displayOrder) ? displayOrder : 0,
    is_active: story.is_active === undefined ? true : Boolean(story.is_active),
  };
}

function normalizeJobPayload(job: any) {
  if (!job?.id) {
    return null;
  }

  return {
    id: String(job.id),
    title: String(job.title || "Untitled Role"),
    company: String(job.company || "9Jobs"),
    location: String(job.location || "Remote"),
    salary: String(job.salary || "Not disclosed"),
    job_type: String(job.job_type || "Full-time"),
    job_link: String(job.job_link || ""),
    posted_at: String(job.posted_at || "Just now"),
    match_score: Number(job.match_score || 80),
    tags: Array.isArray(job.tags) ? job.tags : [],
    description: String(job.description || ""),
  };
}

function normalizeApplicationPayload(application: any) {
  if (!application?.user_id || !application?.client_id || !application?.job_id || !application?.status) {
    return null;
  }

  return {
    user_id: String(application.user_id),
    client_id: String(application.client_id),
    job_id: String(application.job_id),
    status: String(application.status),
    current_stage: String(application.current_stage || application.status),
    is_saved: Boolean(application.is_saved),
    is_active: application.is_active === undefined ? true : Boolean(application.is_active),
    application_date: application.application_date || null,
    applied_at: application.applied_at || null,
    company_name: String(application.company_name || ""),
    job_title: String(application.job_title || ""),
    job_location: String(application.job_location || ""),
    state: String(application.state || ""),
    country: String(application.country || "Australia"),
    work_type: String(application.work_type || ""),
    employment_type: String(application.employment_type || ""),
    source: String(application.source || ""),
    source_url: String(application.source_url || ""),
    job_reference_number: String(application.job_reference_number || ""),
    priority: String(application.priority || "medium"),
    salary_range: String(application.salary_range || ""),
    recruiter_name: String(application.recruiter_name || ""),
    recruiter_email: String(application.recruiter_email || ""),
    recruiter_phone: String(application.recruiter_phone || ""),
    hiring_manager_name: String(application.hiring_manager_name || ""),
    hiring_manager_email: String(application.hiring_manager_email || ""),
    job_description: String(application.job_description || ""),
    notes: String(application.notes || ""),
    next_action: String(application.next_action || ""),
    next_action_date: application.next_action_date || null,
    follow_up_required: Boolean(application.follow_up_required),
    rejection_reason: String(application.rejection_reason || ""),
    offer_amount: application.offer_amount ?? null,
    offer_received_at: application.offer_received_at || null,
    hired_at: application.hired_at || null,
    before_screenshot_url: String(application.before_screenshot_url || ""),
    after_screenshot_url: String(application.after_screenshot_url || ""),
    created_by_admin_id: String(application.created_by_admin_id || "admin"),
  };
}

function normalizeRolePart(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function getApplicationTimestamp(application: any) {
  return new Date(
    application?.application_date ||
      application?.applied_at ||
      application?.updated_at ||
      application?.created_at ||
      0,
  ).getTime();
}

function getApplicationRichnessScore(application: any) {
  const before = String(application?.before_screenshot_url || "").trim();
  const after = String(application?.after_screenshot_url || "").trim();
  const title = String(application?.job_title || "").trim();
  const company = String(application?.company_name || "").trim();
  const location = String(application?.job_location || "").trim();
  const salary = String(application?.salary_range || "").trim();
  const appliedAt = String(application?.applied_at || "").trim();
  const status = normalizeRolePart(application?.status);

  return (
    (before ? 50 : 0) +
    (after ? 50 : 0) +
    (title ? 10 : 0) +
    (company ? 10 : 0) +
    (location ? 5 : 0) +
    (salary ? 5 : 0) +
    (appliedAt ? 5 : 0) +
    (status && status !== "saved" ? 5 : 0)
  );
}

function buildApplicationRoleKey(application: any) {
  return [
    normalizeRolePart(application?.user_id || application?.client_id),
    normalizeRolePart(application?.job_title),
    normalizeRolePart(application?.company_name),
    normalizeRolePart(application?.job_location),
    normalizeRolePart(application?.employment_type || application?.work_type),
  ].join("|");
}

function buildApplicationCanonicalKey(application: any) {
  const ownerKey = normalizeRolePart(application?.user_id || application?.client_id);
  const jobIdKey = normalizeRolePart(application?.job_id);
  if (ownerKey && jobIdKey) {
    return `${ownerKey}|job:${jobIdKey}`;
  }

  const applicationIdKey = normalizeRolePart(application?.id);
  if (applicationIdKey) {
    return `application:${applicationIdKey}`;
  }

  const roleKey = buildApplicationRoleKey(application);
  return roleKey.replace(/\|/g, "") ? roleKey : "";
}

function buildJobRoleKey(job: any) {
  return [
    normalizeRolePart(job?.title),
    normalizeRolePart(job?.company),
    normalizeRolePart(job?.location),
    normalizeRolePart(job?.job_type),
  ].join("|");
}

function choosePreferredApplication(left: any, right: any) {
  const leftScore = getApplicationRichnessScore(left);
  const rightScore = getApplicationRichnessScore(right);
  if (rightScore !== leftScore) {
    return rightScore > leftScore ? right : left;
  }

  return getApplicationTimestamp(right) > getApplicationTimestamp(left) ? right : left;
}

function mergeApplicationRecords(base: any, supplement: any) {
  const preferred = choosePreferredApplication(base, supplement);
  const fallback = preferred === base ? supplement : base;

  return {
    ...fallback,
    ...preferred,
    job_title: String(preferred?.job_title || fallback?.job_title || "").trim(),
    company_name: String(preferred?.company_name || fallback?.company_name || "").trim(),
    job_location: String(preferred?.job_location || fallback?.job_location || "").trim(),
    salary_range: String(preferred?.salary_range || fallback?.salary_range || "").trim(),
    employment_type: String(preferred?.employment_type || fallback?.employment_type || "").trim(),
    work_type: String(preferred?.work_type || fallback?.work_type || "").trim(),
    job_description: String(preferred?.job_description || fallback?.job_description || "").trim(),
    source_url: String(preferred?.source_url || fallback?.source_url || "").trim(),
    before_screenshot_url:
      String(preferred?.before_screenshot_url || "").trim() ||
      String(fallback?.before_screenshot_url || "").trim(),
    after_screenshot_url:
      String(preferred?.after_screenshot_url || "").trim() ||
      String(fallback?.after_screenshot_url || "").trim(),
    applied_at: preferred?.applied_at || fallback?.applied_at || null,
    application_date: preferred?.application_date || fallback?.application_date || null,
    updated_at: preferred?.updated_at || fallback?.updated_at || null,
    created_at: preferred?.created_at || fallback?.created_at || null,
  };
}

function dedupeApplicationsByRole(applications: any[]) {
  const applicationsByKey = new Map<string, any>();

  for (const application of applications) {
    const key =
      buildApplicationCanonicalKey(application) ||
      `${normalizeRolePart(application?.user_id || application?.client_id)}|job:${normalizeRolePart(application?.job_id)}`;
    const existing = applicationsByKey.get(key);

    if (!existing) {
      applicationsByKey.set(key, application);
      continue;
    }

    applicationsByKey.set(key, mergeApplicationRecords(existing, application));
  }

  return Array.from(applicationsByKey.values()).sort(
    (left, right) => getApplicationTimestamp(right) - getApplicationTimestamp(left),
  );
}

function mergeSavedJobEntries({
  savedJobsData,
  applicationsData,
  profilesData,
  jobsData,
}: {
  savedJobsData: any[];
  applicationsData: any[];
  profilesData: any[];
  jobsData: any[];
}) {
  const canonicalApplications = dedupeApplicationsByRole(applicationsData);
  const profileMap = new Map(profilesData.map((profile) => [profile.id, profile]));
  const jobMap = new Map(jobsData.map((job) => [job.id, job]));
  const entryMap = new Map<string, any>();

  for (const row of savedJobsData) {
    const compositeKey = `${row.user_id}:${row.job_id}`;
    const job = jobMap.get(row.job_id) || null;
    const profile = profileMap.get(row.user_id) || null;
    const linkedApplication =
      canonicalApplications.find((application) => (application.user_id || application.client_id) === row.user_id && application.job_id === row.job_id) || null;

    entryMap.set(compositeKey, {
      id: linkedApplication?.id ? String(linkedApplication.id) : compositeKey,
      application_id: linkedApplication?.id ? String(linkedApplication.id) : null,
      user_id: row.user_id,
      client_id: row.user_id,
      job_id: row.job_id,
      status: linkedApplication?.status || "saved",
      current_stage: linkedApplication?.current_stage || linkedApplication?.status || "saved",
      is_saved: true,
      application_date: linkedApplication?.application_date || null,
      applied_at: linkedApplication?.applied_at || null,
      created_at: row.created_at || linkedApplication?.created_at,
      profiles: profile,
      jobs: job,
      job_title: linkedApplication?.job_title || job?.title || "",
      company_name: linkedApplication?.company_name || job?.company || "",
      job_location: linkedApplication?.job_location || job?.location || "",
      salary_range: linkedApplication?.salary_range || job?.salary || "",
      employment_type: linkedApplication?.employment_type || job?.job_type || "Full-time",
      job_description: linkedApplication?.job_description || job?.description || "",
      source_url: linkedApplication?.source_url || job?.job_link || "",
      before_screenshot_url: linkedApplication?.before_screenshot_url || "",
      after_screenshot_url: linkedApplication?.after_screenshot_url || "",
    });
  }

  for (const application of canonicalApplications) {
    const isSaved = Boolean(application.is_saved) || application.status === "saved";
    if (!isSaved) continue;

    const compositeKey = `${application.user_id || application.client_id}:${application.job_id}`;
    if (entryMap.has(compositeKey)) continue;

    const job = jobMap.get(application.job_id) || null;
    const profile = profileMap.get(application.user_id || application.client_id) || null;
    entryMap.set(compositeKey, {
      id: String(application.id),
      application_id: String(application.id),
      user_id: application.user_id || application.client_id,
      client_id: application.client_id || application.user_id,
      job_id: application.job_id,
      status: application.status || "saved",
      current_stage: application.current_stage || application.status || "saved",
      is_saved: Boolean(application.is_saved) || application.status === "saved",
      application_date: application.application_date || null,
      applied_at: application.applied_at || null,
      created_at: application.created_at,
      profiles: profile,
      jobs: job,
      job_title: application.job_title || job?.title || "",
      company_name: application.company_name || job?.company || "",
      job_location: application.job_location || job?.location || "",
      salary_range: application.salary_range || job?.salary || "",
      employment_type: application.employment_type || job?.job_type || "Full-time",
      job_description: application.job_description || job?.description || "",
      source_url: application.source_url || job?.job_link || "",
      before_screenshot_url: application.before_screenshot_url || "",
      after_screenshot_url: application.after_screenshot_url || "",
    });
  }

  return Array.from(entryMap.values()).sort((a, b) => {
    const aTime = new Date(a.created_at || 0).getTime();
    const bTime = new Date(b.created_at || 0).getTime();
    return bTime - aTime;
  });
}

function canRetryJobWithoutLink(error: unknown) {
  const message =
    typeof error === "object" && error && "message" in error
      ? String((error as { message?: string }).message).toLowerCase()
      : "";

  return message.includes("job_link");
}

function ensureAdminRole(req: AuthenticatedRequest, res: Response) {
  const role = req.user?.role;
  if (role !== "admin" && role !== "staff") {
    res.status(403).json({ error: "Forbidden: Admin or staff access required" });
    return false;
  }

  return true;
}

function hasUsableDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL || "";
  return Boolean(databaseUrl) && !databaseUrl.includes("[YOUR_DB_PASSWORD]");
}

function isMissingRelationError(error: unknown) {
  const message =
    typeof error === "object" && error && "message" in error
      ? String((error as { message?: string }).message).toLowerCase()
      : "";

  return (
    message.includes("schema cache") ||
    message.includes("could not find the table") ||
    message.includes("relation") ||
    message.includes("404")
  );
}

async function getCachedSnapshotResource<T>(
  cacheKey: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const cached = snapshotResourceCache.get(cacheKey);
  if (cached && cached.expiresAt > now && cached.value !== undefined) {
    return cached.value as T;
  }

  if (cached?.inFlight) {
    return cached.inFlight as Promise<T>;
  }

  const inFlight = loader()
    .then((value) => {
      snapshotResourceCache.set(cacheKey, {
        value,
        expiresAt: Date.now() + ttlMs,
      });
      return value;
    })
    .catch((error) => {
      snapshotResourceCache.delete(cacheKey);
      throw error;
    });

  snapshotResourceCache.set(cacheKey, {
    value: cached?.value,
    expiresAt: cached?.expiresAt ?? 0,
    inFlight,
  });

  return inFlight;
}

async function runOptionalSnapshotListQuery<T>(
  label: string,
  loader: () => Promise<{ data: T[] | null; error: any }>,
): Promise<{ data: T[]; error: null }> {
  const result = await loader();
  if (!result.error) {
    return { data: result.data ?? [], error: null };
  }

  if (isMissingRelationError(result.error)) {
    console.warn(`[Tracker Route] Optional snapshot table '${label}' missing, using empty fallback.`);
    return { data: [], error: null };
  }

  throw result.error;
}

async function runOptionalSnapshotSingleQuery<T>(
  label: string,
  loader: () => Promise<{ data: T | null; error: any }>,
): Promise<{ data: T | null; error: null }> {
  const result = await loader();
  if (!result.error) {
    return { data: result.data ?? null, error: null };
  }

  if (isMissingRelationError(result.error)) {
    console.warn(`[Tracker Route] Optional snapshot table '${label}' missing, using null fallback.`);
    return { data: null, error: null };
  }

  throw result.error;
}

function createPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
}

async function insertTrackerActivityLog(input: {
  clientId: string;
  applicationId?: number | null;
  performedBy?: string | null;
  activityType: string;
  title: string;
  description: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}) {
  const row = {
    client_id: input.clientId,
    application_id: typeof input.applicationId === "number" ? input.applicationId : null,
    performed_by: String(input.performedBy || "admin"),
    activity_type: input.activityType,
    title: input.title,
    description: input.description,
    old_value: input.oldValue ?? null,
    new_value: input.newValue ?? null,
    metadata: input.metadata ?? {},
  };

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { error } = await supabase.from("activity_logs").insert([row]);
    if (error) {
      throw error;
    }
    return;
  }

  if (!hasUsableDatabaseUrl()) {
    return;
  }

  const pool = createPool();
  const client = await pool.connect();
  try {
    await client.query(
      `
        insert into activity_logs (
          client_id,
          application_id,
          performed_by,
          activity_type,
          title,
          description,
          old_value,
          new_value,
          metadata
        )
        values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb)
      `,
      [
        row.client_id,
        row.application_id,
        row.performed_by,
        row.activity_type,
        row.title,
        row.description,
        JSON.stringify(row.old_value),
        JSON.stringify(row.new_value),
        JSON.stringify(row.metadata),
      ],
    );
  } finally {
    client.release();
    await pool.end();
  }
}

async function listProfilesByIds(profileIds: string[]) {
  const uniqueIds = Array.from(new Set(profileIds.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", uniqueIds);
  if (error) throw error;
  return data ?? [];
}

async function buildNotificationsWithProfiles(rows: any[]) {
  const profileIds = rows.map((row) => String(row.user_id || "")).filter(Boolean);
  const profiles = await listProfilesByIds(profileIds);
  const profileMap = new Map(profiles.map((profile: any) => [String(profile.id), profile]));

  return rows.map((row) => ({
    ...row,
    profiles: row.user_id ? profileMap.get(String(row.user_id)) ?? null : null,
  }));
}

async function ensureRecruiterContactsTable(client: any) {
  await client.query(`
    create table if not exists recruiter_contacts (
      id bigint generated always as identity primary key,
      client_id text not null,
      application_id bigint null,
      recruiter_name text default '',
      company_name text default '',
      email text default '',
      phone text default '',
      linkedin_url text default '',
      contact_method text not null default 'other',
      contact_date timestamptz default now(),
      response_status text not null default 'no_response',
      response_date timestamptz,
      notes text default '',
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    )
  `);
}

async function ensureJobsTableColumns(client: any) {
  await client.query(`
    alter table if exists jobs
    add column if not exists job_link text default ''
  `);
}

async function ensureApplicationScreenshotColumns(client: any) {
  await client.query(`
    alter table if exists applications
    add column if not exists before_screenshot_url text default ''
  `);
  await client.query(`
    alter table if exists applications
    add column if not exists after_screenshot_url text default ''
  `);
}

async function ensureSuccessStoriesTable(client: any) {
  await client.query(`
    create table if not exists success_stories (
      id text primary key,
      name text not null,
      position text not null,
      year text not null default 'Recent',
      message text not null,
      story_rate integer not null default 5,
      photo_url text default '',
      display_order integer not null default 0,
      is_active boolean not null default true,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    )
  `);

  await client.query(`
    alter table if exists success_stories
    add column if not exists year text not null default 'Recent'
  `);

  await client.query(`
    alter table if exists success_stories
    add column if not exists story_rate integer not null default 5
  `);

  await client.query(`
    alter table if exists success_stories
    add column if not exists photo_url text default ''
  `);

  await client.query(`
    alter table if exists success_stories
    add column if not exists display_order integer not null default 0
  `);

  await client.query(`
    alter table if exists success_stories
    add column if not exists is_active boolean not null default true
  `);

  await client.query(`
    alter table if exists success_stories
    add column if not exists updated_at timestamptz default now()
  `);
}

function buildProfilePayload(application: any) {
  const userId = String(application?.user_id || application?.client_id || "");
  if (!userId) {
    return null;
  }

  const isPreviewUser = userId === "preview-user-9jobs";
  const fallbackEmail = isPreviewUser ? "preview-user-9jobs@9jobs.app" : `${userId}@9jobs.app`;

  return {
    id: userId,
    full_name: String(application?.client_name || application?.full_name || (isPreviewUser ? "Test User" : "9Jobs Client")),
    email: String(application?.client_email || application?.email || fallbackEmail),
    phone_number: String(application?.client_phone || ""),
    timezone: String(application?.timezone || "Australia/Melbourne"),
    role: "client",
    account_status: "active",
    subscription_plan: "free",
  };
}

async function syncQuickUpdateReminder(application: any, patch: Record<string, unknown>) {
  if (!Object.prototype.hasOwnProperty.call(patch, "next_action_date")) {
    return;
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return;
  }

  const applicationId = Number(application?.id);
  const clientId = String(application?.user_id || application?.client_id || "").trim();
  if (!Number.isFinite(applicationId) || !clientId) {
    return;
  }

  const existingReminderQuery = supabase
    .from("follow_ups")
    .select("id")
    .eq("application_id", applicationId)
    .eq("created_by", "admin-quick-update")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!application?.next_action_date) {
    const { data: existingReminder, error: readError } = await existingReminderQuery;
    if (readError) throw readError;

    if (existingReminder?.id) {
      const { error: deleteError } = await supabase
        .from("follow_ups")
        .delete()
        .eq("id", Number(existingReminder.id));
      if (deleteError) throw deleteError;
    }

    return;
  }

  const reminderPayload = {
    client_id: clientId,
    application_id: applicationId,
    follow_up_type: "Reminder",
    due_date: application.next_action_date,
    status: "pending",
    contact_person: String(application?.hiring_manager_name || application?.recruiter_name || "").trim(),
    contact_email: String(application?.hiring_manager_email || application?.recruiter_email || "").trim(),
    notes: JSON.stringify({
      notes: String(application?.next_action || "").trim() || "Reminder updated from admin quick update.",
    }),
    created_by: "admin-quick-update",
  };

  const { data: existingReminder, error: readError } = await existingReminderQuery;
  if (readError) throw readError;

  if (existingReminder?.id) {
    const { error: updateError } = await supabase
      .from("follow_ups")
      .update(reminderPayload)
      .eq("id", Number(existingReminder.id));
    if (updateError) throw updateError;
    return;
  }

  const { error: insertError } = await supabase.from("follow_ups").insert([reminderPayload]);
  if (insertError) throw insertError;
}

function clampScore(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? Math.max(0, Math.min(100, Math.round(numberValue))) : 0;
}

function normalizeResumeText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function extractLoosePdfText(fileBytes: Buffer) {
  const rawText = fileBytes.toString("latin1");
  const chunks = Array.from(rawText.matchAll(/\(([^()]*)\)/g))
    .map((match) => match[1]
      ?.replace(/\\[()\\]/g, "")
      .replace(/\\r/g, " ")
      .replace(/\\n/g, " ")
      .replace(/\\t/g, " ")
      .trim())
    .filter((chunk) => chunk && /[a-zA-Z]{2,}/.test(chunk))
    .sort((left, right) => right.length - left.length)
    .slice(0, 40)
    .filter(Boolean);

  return normalizeResumeText(chunks.join(" "));
}

function getResumeTokens(resumeText: string) {
  return new Set(
    normalizeResumeText(resumeText)
      .toLowerCase()
      .split(/[^a-z0-9+#./-]+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2),
  );
}

function inferResumeRoleProfile(tokens: Set<string>) {
  const roleProfiles = [
    {
      name: "software engineer",
      requiredKeywords: ["react", "typescript", "javascript", "node", "graphql", "aws", "docker", "testing", "jest", "ci/cd", "git"],
      defaultMissing: ["testing", "ci/cd", "aws", "docker"],
    },
    {
      name: "sales",
      requiredKeywords: ["sales", "retail", "crm", "upselling", "customer", "targets", "inventory", "billing", "merchandising", "negotiation"],
      defaultMissing: ["crm", "targets", "negotiation", "merchandising"],
    },
    {
      name: "data analyst",
      requiredKeywords: ["sql", "python", "excel", "power", "bi", "tableau", "dashboard", "analytics", "etl", "reporting"],
      defaultMissing: ["sql", "python", "tableau", "etl"],
    },
    {
      name: "product or project",
      requiredKeywords: ["agile", "stakeholder", "roadmap", "jira", "sprint", "delivery", "planning", "coordination", "research", "workflow"],
      defaultMissing: ["agile", "stakeholder", "roadmap", "jira"],
    },
  ];

  let bestProfile = roleProfiles[0];
  let bestScore = -1;
  for (const profile of roleProfiles) {
    const score = profile.requiredKeywords.reduce((total, keyword) => {
      const keywordParts = keyword.split(/[\/\s]+/).filter(Boolean);
      const matched = keywordParts.every((part) => tokens.has(part));
      return total + (matched ? 1 : 0);
    }, 0);

    if (score > bestScore) {
      bestProfile = profile;
      bestScore = score;
    }
  }

  return bestProfile;
}

function getHeuristicResumeAnalysis(resumeText?: string): ResumeAnalysis {
  const normalizedText = normalizeResumeText(String(resumeText || ""));
  if (!normalizedText) {
    return {
      atsScore: 82,
      aiMatchScore: 79,
      keywords: 85,
      formatting: 80,
      experience: 84,
      impactVerbs: 81,
      summary: "The resume was uploaded successfully, but readable content could not be extracted for a resume-specific ATS review.",
      suggestions: [
        "Upload a text-based PDF or DOCX so the ATS review can inspect the actual resume content.",
        "Avoid scanned-image resumes when possible.",
        "Ensure the file contains selectable text and standard headings.",
      ],
      roleSpecificScore: 81,
      missingKeywords: ["Target role keywords", "Quantified achievements", "ATS-friendly section headings"],
      skillGapAnalysis: ["Readable resume content was unavailable, so role-specific skill gaps could not be verified."],
      formattingIssues: ["The uploaded file did not expose enough readable text for formatting validation."],
      grammarSuggestions: ["Re-upload the resume in an editable text-based format for sentence-level review."],
      achievementRewriting: [],
      resumeVersionComparison: "Comparison could not be completed because the uploaded file did not expose enough readable text.",
      jobDescriptionCompatibility: 78,
      recruiterReadabilityScore: 75,
      australianResumeComplianceCheck: {
        compliant: true,
        issues: ["Readable content could not be fully verified."],
      },
      coverLetter: "Dear Hiring Manager,\n\nI am excited to apply for this opportunity. My resume has been uploaded for review, and I would welcome the chance to discuss how my background aligns with your team's needs.\n\nThank you for your time and consideration.\n\nSincerely,\nCandidate",
    };
  }

  const tokens = getResumeTokens(normalizedText);
  const roleProfile = inferResumeRoleProfile(tokens);
  const lowerText = normalizedText.toLowerCase();
  const hasEmail = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(normalizedText);
  const hasPhone = /(\+\d{1,3}[\s-]?)?(\d[\s-]?){8,}/.test(normalizedText);
  const hasLinkedIn = /linkedin/i.test(lowerText);
  const hasSummary = /\b(summary|profile|objective)\b/i.test(normalizedText);
  const hasExperienceSection = /\b(experience|employment|work history)\b/i.test(normalizedText);
  const hasEducation = /\b(education|qualification|university|college)\b/i.test(normalizedText);
  const hasSkills = /\b(skills|technical skills|core competencies)\b/i.test(normalizedText);
  const hasMetrics = /(\d+%|\$\d+|\b\d+\+?\b)/.test(normalizedText);
  const actionVerbMatches = normalizedText.match(/\b(led|built|developed|designed|implemented|managed|delivered|improved|increased|reduced|created|optimized|launched|supported|coordinated|negotiated|sold)\b/gi) ?? [];

  const presentRoleKeywords = roleProfile.requiredKeywords.filter((keyword) => {
    const parts = keyword.split(/[\/\s]+/).filter(Boolean);
    return parts.every((part) => tokens.has(part));
  });
  const missingKeywords = roleProfile.defaultMissing
    .filter((keyword) => {
      const parts = keyword.split(/[\/\s]+/).filter(Boolean);
      return !parts.every((part) => tokens.has(part));
    })
    .slice(0, 6);

  const sectionCount = [hasSummary, hasExperienceSection, hasEducation, hasSkills, hasEmail, hasPhone].filter(Boolean).length;
  const keywordsScore = Math.max(35, Math.min(96, 45 + presentRoleKeywords.length * 9 - missingKeywords.length * 2));
  const formattingScore = Math.max(35, Math.min(96, 42 + sectionCount * 8 + (hasLinkedIn ? 4 : 0) - (hasSummary ? 0 : 6)));
  const experienceScore = Math.max(35, Math.min(96, 40 + (hasExperienceSection ? 18 : 0) + (hasMetrics ? 12 : 0) + Math.min(12, actionVerbMatches.length * 2)));
  const impactVerbsScore = Math.max(30, Math.min(96, 35 + Math.min(45, actionVerbMatches.length * 5)));
  const atsScore = Math.max(40, Math.min(97, Math.round((keywordsScore + formattingScore + experienceScore + impactVerbsScore) / 4)));
  const aiMatchScore = Math.max(35, Math.min(96, Math.round((keywordsScore * 0.55) + (experienceScore * 0.45) - missingKeywords.length)));
  const roleSpecificScore = Math.max(35, Math.min(96, Math.round((presentRoleKeywords.length / Math.max(roleProfile.requiredKeywords.length, 1)) * 100)));
  const jobDescriptionCompatibility = Math.max(35, Math.min(96, Math.round((keywordsScore * 0.65) + (roleSpecificScore * 0.35))));
  const recruiterReadabilityScore = Math.max(35, Math.min(96, Math.round((formattingScore * 0.6) + (impactVerbsScore * 0.4))));

  const formattingIssues: string[] = [];
  if (!hasSummary) formattingIssues.push("Add a short professional summary or objective near the top of the resume.");
  if (!hasSkills) formattingIssues.push("Add a dedicated skills section so ATS systems can parse core competencies more reliably.");
  if (!hasEmail || !hasPhone) formattingIssues.push("Keep complete contact details visible with email and phone number.");
  if (!hasExperienceSection) formattingIssues.push("Use a clearly labeled experience section so work history is easy to parse.");

  const skillGapAnalysis: string[] = [];
  if (missingKeywords.length > 0) {
    skillGapAnalysis.push(`The resume is missing role-relevant terms for a ${roleProfile.name} profile: ${missingKeywords.join(", ")}.`);
  }
  if (!hasMetrics) {
    skillGapAnalysis.push("Add quantified outcomes such as percentages, revenue impact, hiring volume, response rates, or delivery improvements.");
  }
  if (actionVerbMatches.length < 3) {
    skillGapAnalysis.push("Strengthen bullet points with clearer action verbs that show ownership and measurable execution.");
  }

  const grammarSuggestions: string[] = [];
  if (!hasMetrics) grammarSuggestions.push("Rewrite experience bullets to include measurable outcomes instead of only responsibilities.");
  if (actionVerbMatches.length < 3) grammarSuggestions.push("Start more bullets with action verbs such as led, built, improved, delivered, or negotiated.");

  const achievementRewriting = hasMetrics
    ? []
    : [
        {
          original: "Worked on daily responsibilities across the role.",
          rewritten: "Delivered role-specific work with measurable results, stronger ownership, and clearer business impact.",
        },
      ];

  const summary = `This resume reads like a ${roleProfile.name} profile with ${presentRoleKeywords.length} strong role signals. The main ATS gaps are ${missingKeywords.slice(0, 3).join(", ") || "clearer role keywords"}, along with ${hasMetrics ? "deeper role alignment" : "more quantified achievements"} to strengthen recruiter confidence.`;

  return {
    atsScore,
    aiMatchScore,
    keywords: keywordsScore,
    formatting: formattingScore,
    experience: experienceScore,
    impactVerbs: impactVerbsScore,
    summary: summary.slice(0, 600),
    suggestions: [
      missingKeywords.length > 0
        ? `Add missing role keywords: ${missingKeywords.slice(0, 4).join(", ")}.`
        : `Keep reinforcing ${roleProfile.name} keywords consistently across the summary, skills, and experience sections.`,
      hasMetrics
        ? "Make sure each major role has at least one quantified achievement that is easy for recruiters to scan."
        : "Add measurable outcomes to recent experience so ATS and recruiters can see impact quickly.",
      hasSummary
        ? "Tighten the summary to align directly with the target role and strongest proof points."
        : "Add a short top summary that states target role, experience focus, and strongest skills.",
    ].filter(Boolean),
    roleSpecificScore,
    missingKeywords,
    skillGapAnalysis,
    formattingIssues,
    grammarSuggestions,
    achievementRewriting,
    resumeVersionComparison: `The resume shows a ${roleProfile.name}-leaning profile, but it will match modern ATS expectations better once missing keywords, measurable outcomes, and core sections are more explicit.`,
    jobDescriptionCompatibility,
    recruiterReadabilityScore,
    australianResumeComplianceCheck: {
      compliant: true,
      issues: [],
    },
    coverLetter: `Dear Hiring Manager,\n\nI am writing to express my interest in this opportunity. My background aligns most closely with ${roleProfile.name} work, and I have built experience around ${presentRoleKeywords.slice(0, 5).join(", ") || "relevant core responsibilities"}.\n\nI would welcome the opportunity to discuss how my experience can support your team and contribute measurable results.\n\nSincerely,\nCandidate`,
  };
}

function getFallbackResumeAnalysis(): ResumeAnalysis {
  return {
    atsScore: 82,
    aiMatchScore: 79,
    keywords: 85,
    formatting: 80,
    experience: 84,
    impactVerbs: 81,
    summary: "The candidate has demonstrated strong technical proficiency and solid experience. The resume is generally well-structured and contains industry-standard terms, but can be optimized by adding more quantifiable achievements and refining target role focus.",
    suggestions: [
      "Include more metrics and quantifiable outcomes for projects (e.g. $, %, numbers).",
      "Tailor the resume summary section to highlight specific alignment with target roles.",
      "Refine spacing and bullet design to ensure maximum ATS parseability."
    ],
    roleSpecificScore: 81,
    missingKeywords: [
      "Agile",
      "CI/CD",
      "Unit Testing",
      "Cloud Integration"
    ],
    skillGapAnalysis: [
      "Consider adding certifications or direct experience in cloud architectures and CI/CD pipelines."
    ],
    formattingIssues: [
      "Ensure consistent fonts are used across headings and descriptions."
    ],
    grammarSuggestions: [
      "Use more active voice verbs instead of passive phrases (e.g., replace 'responsible for writing code' with 'Developed and optimized code modules')."
    ],
    achievementRewriting: [
      {
        "original": "Worked on the development of several features.",
        "rewritten": "Designed and deployed key application features, increasing active user engagement by 15%."
      }
    ],
    resumeVersionComparison: "Highly compliant with standard software resume models. Layout matches professional norms.",
    jobDescriptionCompatibility: 78,
    recruiterReadabilityScore: 83,
    australianResumeComplianceCheck: {
      compliant: true,
      issues: []
    },
    coverLetter: "Dear Hiring Manager,\n\nI am writing to express my strong interest in the Software Engineer position. With a solid foundation in frontend and backend development, and experience in building scalable applications, I am confident in my ability to contribute effectively to your team.\n\nDuring my career, I have focused on design patterns, clean code, and optimizing performance to deliver reliable user experiences. I look forward to the opportunity to discuss how my skills and background align with your organization's goals.\n\nSincerely,\nJohn Doe"
  };
}

function parseGeminiResumeAnalysis(rawText: string): ResumeAnalysis {
  const jsonText = rawText.match(/\{[\s\S]*\}/)?.[0];
  if (!jsonText) {
    throw new Error("Gemini returned an invalid ATS analysis.");
  }

  const parsed = JSON.parse(jsonText);
  const suggestions = Array.isArray(parsed.suggestions)
    ? parsed.suggestions.map((item: unknown) => String(item).trim()).filter(Boolean).slice(0, 8)
    : [];

  const summary = String(parsed.summary || "").trim();
  const atsScoreVal = clampScore(parsed.atsScore);
  const aiMatchScoreVal = clampScore(parsed.aiMatchScore);
  const keywordsVal = clampScore(parsed.keywords);
  const formattingVal = clampScore(parsed.formatting);
  const experienceVal = clampScore(parsed.experience);
  const impactVerbsVal = clampScore(parsed.impactVerbs);

  const roleSpecificScoreVal = clampScore(parsed.roleSpecificScore) || Math.max(30, Math.min(95, atsScoreVal - 5));
  const jobDescriptionCompatibilityVal = clampScore(parsed.jobDescriptionCompatibility) || Math.max(30, Math.min(95, aiMatchScoreVal || atsScoreVal - 8));
  const recruiterReadabilityScoreVal = clampScore(parsed.recruiterReadabilityScore) || Math.max(30, Math.min(95, formattingVal - 4));

  return {
    atsScore: atsScoreVal,
    aiMatchScore: aiMatchScoreVal,
    keywords: keywordsVal,
    formatting: formattingVal,
    experience: experienceVal,
    impactVerbs: impactVerbsVal,
    summary: summary.length >= 20 && /[a-zA-Z]/.test(summary)
      ? summary.slice(0, 600)
      : "Resume analyzed by Gemini for ATS readiness.",
    suggestions,

    // New fields:
    roleSpecificScore: roleSpecificScoreVal,
    missingKeywords: Array.isArray(parsed.missingKeywords)
      ? parsed.missingKeywords.map((item: unknown) => String(item).trim()).filter(Boolean)
      : [],
    skillGapAnalysis: Array.isArray(parsed.skillGapAnalysis)
      ? parsed.skillGapAnalysis.map((item: unknown) => String(item).trim()).filter(Boolean)
      : [],
    formattingIssues: Array.isArray(parsed.formattingIssues)
      ? parsed.formattingIssues.map((item: unknown) => String(item).trim()).filter(Boolean)
      : [],
    grammarSuggestions: Array.isArray(parsed.grammarSuggestions)
      ? parsed.grammarSuggestions.map((item: unknown) => String(item).trim()).filter(Boolean)
      : [],
    achievementRewriting: Array.isArray(parsed.achievementRewriting)
      ? parsed.achievementRewriting.map((item: any) => ({
          original: String(item?.original || "").trim(),
          rewritten: String(item?.rewritten || "").trim(),
        })).filter((x: { original: string; rewritten: string }) => x.original && x.rewritten)
      : [],
    resumeVersionComparison: String(parsed.resumeVersionComparison || "").trim(),
    jobDescriptionCompatibility: jobDescriptionCompatibilityVal,
    recruiterReadabilityScore: recruiterReadabilityScoreVal,
    australianResumeComplianceCheck: {
      compliant: typeof parsed.australianResumeComplianceCheck?.compliant === "boolean"
        ? parsed.australianResumeComplianceCheck.compliant
        : true,
      issues: Array.isArray(parsed.australianResumeComplianceCheck?.issues)
        ? parsed.australianResumeComplianceCheck.issues.map((item: unknown) => String(item).trim()).filter(Boolean)
        : [],
    },
    coverLetter: parsed.coverLetter ? String(parsed.coverLetter).trim() : undefined,
  };
}

async function extractResumeText(fileBytes: Buffer, mimeType: string): Promise<string> {
  try {
    if (mimeType === "application/pdf") {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: fileBytes });
      try {
        const parsed = await parser.getText();
        const normalized = normalizeResumeText(String(parsed.text || ""));
        return normalized || extractLoosePdfText(fileBytes);
      } finally {
        await parser.destroy().catch(() => undefined);
      }
    }

    if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const mammoth = await import("mammoth");
      const parsed = await mammoth.extractRawText({ buffer: fileBytes });
      return normalizeResumeText(String(parsed.value || ""));
    }
  } catch (error) {
    console.warn("[Resume Intelligence] text extraction failed, falling back to binary Gemini input:", error);
  }

  return "";
}

async function analyzeResumeWithGemini(base64: string, mimeType: string, resumeText?: string): Promise<ResumeAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
  
  try {
    if (!apiKey) {
      console.warn("[Gemini API] Gemini API key not configured. Using fallback.");
      return getHeuristicResumeAnalysis(resumeText);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GEMINI_RESUME_TIMEOUT_MS);
    const normalizedResumeText = String(resumeText || "").replace(/\s+/g, " ").trim().slice(0, GEMINI_RESUME_TEXT_LIMIT);
    const prompt = [
      "Act as a strict Applicant Tracking System resume auditor and career advisor.",
      "Evaluate only the supplied resume. Do not invent experience or skills.",
      "Return strict JSON only.",
      "Required keys: atsScore, aiMatchScore, keywords, formatting, experience, impactVerbs, summary, suggestions, roleSpecificScore, missingKeywords, skillGapAnalysis, formattingIssues, grammarSuggestions, achievementRewriting, resumeVersionComparison, jobDescriptionCompatibility, recruiterReadabilityScore, australianResumeComplianceCheck, coverLetter.",
      "Scoring keys must be integers from 0 to 100.",
      "summary must be under 600 characters.",
      "suggestions must be a short actionable array.",
      "achievementRewriting must be an array of { original, rewritten } objects.",
      "australianResumeComplianceCheck must be { compliant, issues }.",
      "coverLetter must be a polished professional cover letter using \\n newlines.",
      normalizedResumeText
        ? `Resume text:\n${normalizedResumeText}`
        : "Resume file is attached below.",
    ].join("\n");

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: normalizedResumeText
              ? [{ text: prompt }]
              : [{ text: prompt }, { inlineData: { mimeType, data: base64 } }],
          }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
            maxOutputTokens: 1400,
          },
        }),
        signal: controller.signal,
      },
      );

      const payload: any = await response.json().catch(() => null);
      if (!response.ok) {
        console.warn(`[Gemini API] Failed with status ${response.status}: ${payload?.error?.message}. Using fallback.`);
        return getHeuristicResumeAnalysis(resumeText);
      }

      const rawText = payload?.candidates?.[0]?.content?.parts
        ?.map((part: any) => part?.text || "")
        .join("")
        .trim();
      if (!rawText) {
        console.warn("[Gemini API] Empty response. Using fallback.");
        return getHeuristicResumeAnalysis(resumeText);
      }

      return parseGeminiResumeAnalysis(rawText);
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (err: any) {
    console.error("[Gemini API] Error calling Gemini API:", err.message || err);
    console.warn("Using fallback resume analysis.");
    return getHeuristicResumeAnalysis(resumeText);
  }
}

async function findLatestSupabaseApplicationId(userId: string, jobId: string) {
  const { data, error } = await supabase
    .from("applications")
    .select("id, created_at")
    .eq("user_id", userId)
    .eq("job_id", jobId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  return data?.[0]?.id ? Number(data[0].id) : null;
}

async function findEquivalentSupabaseApplicationId(application: any) {
  const userId = String(application?.user_id || "").trim();
  if (!userId) {
    return null;
  }

  const { data, error } = await supabase
    .from("applications")
    .select("id, user_id, client_id, job_id, job_title, company_name, job_location, employment_type, work_type, salary_range, before_screenshot_url, after_screenshot_url, application_date, applied_at, updated_at, created_at, status")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const targetKey = buildApplicationRoleKey(application);
  const targetFallbackKey = `${normalizeRolePart(application?.user_id || application?.client_id)}|job:${normalizeRolePart(application?.job_id)}`;
  const target = targetKey.replace(/\|/g, "") ? targetKey : targetFallbackKey;

  const matching = (data || []).filter((candidate: any) => {
    const roleKey = buildApplicationRoleKey(candidate);
    const fallbackKey = `${normalizeRolePart(candidate?.user_id || candidate?.client_id)}|job:${normalizeRolePart(candidate?.job_id)}`;
    const key = roleKey.replace(/\|/g, "") ? roleKey : fallbackKey;
    return key === target;
  });

  if (matching.length === 0) {
    return null;
  }

  const preferred = matching.reduce((best: any, current: any) => choosePreferredApplication(best, current));
  return preferred?.id ? Number(preferred.id) : null;
}

function normalizePersonalInfoPayload(profile: any, fallbackUserId?: string, fallbackEmail?: string) {
  const profileId = String(profile?.id || fallbackUserId || "").trim();
  const email = String(profile?.email || fallbackEmail || "").trim();
  const fullName = String(profile?.full_name || profile?.fullName || "").trim();

  if (!profileId || !email || !fullName) {
    return null;
  }

  return {
    id: profileId,
    full_name: fullName,
    email,
    phone_number: String(profile?.phone_number || profile?.phoneNumber || "").trim(),
    location: String(profile?.location || "").trim(),
    headline: String(profile?.headline || "").trim(),
    avatar_url: String(profile?.avatar_url || profile?.avatarUrl || "").trim(),
    linkedin_url: String(profile?.linkedin_url || profile?.linkedinUrl || "").trim(),
    facebook_url: String(profile?.facebook_url || profile?.facebookUrl || "").trim(),
    instagram_url: String(profile?.instagram_url || profile?.instagramUrl || "").trim(),
    twitter_url: String(profile?.twitter_url || profile?.twitterUrl || "").trim(),
    timezone: String(profile?.timezone || "Australia/Melbourne").trim(),
    role: String(profile?.role || "client").trim(),
    account_status: String(profile?.account_status || "active").trim(),
    subscription_plan: String(profile?.subscription_plan || profile?.subscriptionPlan || "free").trim(),
  };
}

function normalizeClientScorePayload(score: any) {
  if (!score?.client_id) {
    return null;
  }

  const atsScore = Number(score.ats_score);
  const aiMatchScore = Number(score.ai_match_score);

  if (!Number.isFinite(atsScore) || !Number.isFinite(aiMatchScore)) {
    return null;
  }

  return {
    id: score.id ? Number(score.id) : null,
    client_id: String(score.client_id),
    application_id: score.application_id ? Number(score.application_id) : null,
    ats_score: atsScore,
    ai_match_score: aiMatchScore,
    score_reason: String(score.score_reason || ""),
    recommendations: Array.isArray(score.recommendations) ? score.recommendations.map(String) : [],
    calculated_at: String(score.calculated_at || new Date().toISOString()),
    updated_by: String(score.updated_by || "admin"),
  };
}

function buildLocalSnapshotProfile(userId: string, email: string, localProfile: any) {
  const normalizedLocalProfile = normalizePersonalInfoPayload(localProfile, userId, email);
  if (normalizedLocalProfile) {
    return normalizedLocalProfile;
  }

  return {
    id: userId,
    full_name: "Test User",
    email,
    phone_number: "+91 99999 99999",
    location: "Australia",
    headline: "9Jobs preview candidate",
    avatar_url: "",
    linkedin_url: "https://linkedin.com/in/test-user",
    facebook_url: "",
    instagram_url: "",
    twitter_url: "",
    timezone: "Australia/Melbourne",
    role: "client",
    account_status: "active",
    subscription_plan: "free",
  };
}

async function buildLocalSnapshotResponse(targetUserId: string, requesterEmail: string) {
  const nowIso = new Date().toISOString();
  const localProfile = await getLocalProfile(targetUserId);
  const localSuccessStories = await getLocalSuccessStories();
  const localRecruiterContacts = await getLocalRecruiterContacts(targetUserId);
  const localMessages = await getMessagesHistory(targetUserId).catch((error) => {
    console.warn("[Tracker Route] Local snapshot message hydration failed:", error);
    return [];
  });
  const profile = buildLocalSnapshotProfile(targetUserId, requesterEmail, localProfile);
  const jobs = [
    {
      id: "job_resume_lead",
      title: "Sr. Frontend Engineer",
      company: "Stripe",
      location: "Geelong",
      salary: "$165k/yr",
      job_type: "Full-time",
      category_id: 1,
      posted_at: "5h ago",
      match_score: 98,
      tags: ["React", "Remote"],
      description: "Build polished candidate-facing experiences across the premium 9Jobs workflow.",
      created_at: nowIso,
    },
    {
      id: "job_growth_specialist",
      title: "Product Designer",
      company: "Figma",
      location: "Sydney",
      salary: "$145k/yr",
      job_type: "Full-time",
      category_id: 2,
      posted_at: "2d ago",
      match_score: 94,
      tags: ["Design", "Systems"],
      description: "Shape the systems and product surfaces used by thousands of design-led teams.",
      created_at: nowIso,
    },
    {
      id: "job_interview_coach",
      title: "DX Engineer",
      company: "Vercel",
      location: "Perth",
      salary: "$155k/yr",
      job_type: "Remote",
      category_id: 5,
      posted_at: "1d ago",
      match_score: 91,
      tags: ["Developer Experience", "Remote"],
      description: "Improve developer workflows and platform adoption across global engineering teams.",
      created_at: nowIso,
    },
    {
      id: "job_pipeline_growth",
      title: "Job Search Growth Specialist",
      company: "Greenline Talent",
      location: "Melbourne",
      salary: "$140k/yr",
      job_type: "Full-time",
      category_id: 4,
      posted_at: "5h ago",
      match_score: 88,
      tags: ["Pipeline", "Recruiting"],
      description: "Support high-output job-search operations with strong follow-up and funnel tracking.",
      created_at: nowIso,
    },
  ];
  const applications = [
    {
      id: 1,
      user_id: targetUserId,
      client_id: targetUserId,
      job_id: "job_resume_lead",
      status: "applied",
      current_stage: "applied",
      application_date: nowIso,
      applied_at: nowIso,
      company_name: "Stripe",
      job_title: "Sr. Frontend Engineer",
      job_location: "Remote",
      employment_type: "Full-time",
      is_active: true,
      created_at: nowIso,
      updated_at: nowIso,
    },
    {
      id: 2,
      user_id: targetUserId,
      client_id: targetUserId,
      job_id: "job_growth_specialist",
      status: "interview_scheduled",
      current_stage: "interview_scheduled",
      application_date: nowIso,
      applied_at: nowIso,
      company_name: "Figma",
      job_title: "Product Designer",
      job_location: "Sydney",
      employment_type: "Full-time",
      is_active: true,
      created_at: nowIso,
      updated_at: nowIso,
    },
    {
      id: 3,
      user_id: targetUserId,
      client_id: targetUserId,
      job_id: "job_interview_coach",
      status: "offer_received",
      current_stage: "offer_received",
      application_date: nowIso,
      applied_at: nowIso,
      company_name: "Vercel",
      job_title: "DX Engineer",
      job_location: "Remote",
      employment_type: "Remote",
      offer_received_at: nowIso,
      is_active: true,
      created_at: nowIso,
      updated_at: nowIso,
    },
  ];
  const savedJobs = [{ user_id: targetUserId, job_id: "job_pipeline_growth", created_at: nowIso }];
  const interviews = [
    {
      id: 1,
      client_id: targetUserId,
      application_id: 2,
      interview_date: nowIso,
      status: "scheduled",
      created_at: nowIso,
      updated_at: nowIso,
    },
  ];

  return {
    userId: targetUserId,
    profile,
    jobs,
    applications,
    savedJobs,
    categories: LOCAL_SNAPSHOT_CATEGORY_ROWS,
    messages: localMessages,
    services: LOCAL_SNAPSHOT_SERVICE_ROWS,
    pricingPlans: LOCAL_SNAPSHOT_PRICING_PLAN_ROWS,
    successStories: localSuccessStories,
    subscription: {
      user_id: targetUserId,
      plan_id: "free",
      status: "active",
      created_at: nowIso,
      updated_at: nowIso,
    },
    resumeScore: {
      user_id: targetUserId,
      score: 97,
      ats_score: 97,
      ai_match_score: 84,
      calculated_at: nowIso,
      suggestions: [],
      notes: "Local preview score",
    },
    systemSettings: {
      id: 1,
      maintenance_mode: false,
      push_notifications_enabled: true,
      dark_mode_override: false,
    },
    interviews,
    followUps: [],
    recruiterContacts: localRecruiterContacts,
    coldEmails: [],
    clientScores: [
      {
        id: 1,
        client_id: targetUserId,
        application_id: null,
        ats_score: 97,
        ai_match_score: 84,
        calculated_at: nowIso,
      },
    ],
    notifications: [],
    coverLetter: null,
    activityLogs: [],
  };
}

async function upsertJobWithPostgres(job: any) {
  const normalizedJob = normalizeJobPayload(job);
  if (!normalizedJob) {
    return;
  }

  const pool = createPool();
  const client = await pool.connect();

  try {
    await ensureJobsTableColumns(client);
    await client.query(
      `
      insert into jobs (
        id, title, company, location, salary, job_type, job_link, posted_at, match_score, tags, description
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      )
      on conflict (id) do update set
        title = excluded.title,
        company = excluded.company,
        location = excluded.location,
        salary = excluded.salary,
        job_type = excluded.job_type,
        job_link = excluded.job_link,
        posted_at = excluded.posted_at,
        match_score = excluded.match_score,
        tags = excluded.tags,
        description = excluded.description,
        updated_at = now()
      `,
      [
        normalizedJob.id,
        normalizedJob.title,
        normalizedJob.company,
        normalizedJob.location,
        normalizedJob.salary,
        normalizedJob.job_type,
        normalizedJob.job_link,
        normalizedJob.posted_at,
        normalizedJob.match_score,
        normalizedJob.tags,
        normalizedJob.description,
      ],
    );
  } finally {
    client.release();
    await pool.end();
  }
}

async function upsertSavedJobWithPostgres(userId: string, jobId: string) {
  const pool = createPool();
  const client = await pool.connect();

  try {
    await client.query(
      `
      insert into saved_jobs (user_id, job_id)
      values ($1, $2)
      on conflict (user_id, job_id) do nothing
      `,
      [userId, jobId],
    );
  } finally {
    client.release();
    await pool.end();
  }
}

async function getSuccessStoriesWithPostgres() {
  const pool = createPool();
  const client = await pool.connect();

  try {
    await ensureSuccessStoriesTable(client);
    const result = await client.query(`
      select *
      from success_stories
      order by display_order asc, created_at desc nulls last
    `);
    return result.rows;
  } finally {
    client.release();
    await pool.end();
  }
}

async function upsertSuccessStoryWithPostgres(story: any) {
  const normalizedStory = normalizeSuccessStoryPayload(story);
  if (!normalizedStory) {
    throw new Error("Missing success story fields");
  }

  const pool = createPool();
  const client = await pool.connect();

  try {
    await ensureSuccessStoriesTable(client);
    const result = await client.query(
      `
      insert into success_stories (
        id, name, position, year, message, story_rate, photo_url, display_order, is_active
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      )
      on conflict (id) do update set
        name = excluded.name,
        position = excluded.position,
        year = excluded.year,
        message = excluded.message,
        story_rate = excluded.story_rate,
        photo_url = excluded.photo_url,
        display_order = excluded.display_order,
        is_active = excluded.is_active,
        updated_at = now()
      returning *
      `,
      [
        normalizedStory.id,
        normalizedStory.name,
        normalizedStory.position,
        normalizedStory.year,
        normalizedStory.message,
        normalizedStory.story_rate,
        normalizedStory.photo_url,
        normalizedStory.display_order,
        normalizedStory.is_active,
      ],
    );

    return result.rows[0];
  } finally {
    client.release();
    await pool.end();
  }
}

async function deleteSuccessStoryWithPostgres(id: string) {
  const pool = createPool();
  const client = await pool.connect();

  try {
    await ensureSuccessStoriesTable(client);
    await client.query(
      `
      delete from success_stories
      where id = $1
      `,
      [id],
    );
    return true;
  } finally {
    client.release();
    await pool.end();
  }
}

async function deleteSavedJobWithPostgres(userId: string, jobId: string) {
  const pool = createPool();
  const client = await pool.connect();

  try {
    await client.query(
      `
      delete from saved_jobs
      where user_id = $1 and job_id = $2
      `,
      [userId, jobId],
    );
  } finally {
    client.release();
    await pool.end();
  }
}

async function getApplicationByUserAndJobWithPostgres(userId: string, jobId: string) {
  const pool = createPool();
  const client = await pool.connect();

  try {
    const result = await client.query(
      `
      select *
      from applications
      where user_id = $1 and job_id = $2
      order by created_at desc nulls last
      limit 1
      `,
      [userId, jobId],
    );

    return result.rows[0] ?? null;
  } finally {
    client.release();
    await pool.end();
  }
}

async function ensureProfileWithPostgres(application: any) {
  const profile = buildProfilePayload(application);
  if (!profile) {
    return;
  }

  const pool = createPool();
  const client = await pool.connect();

  try {
    await client.query(
      `
      insert into profiles (
        id, full_name, email, phone_number, timezone, role, account_status, subscription_plan
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8
      )
      on conflict (id) do update set
        full_name = excluded.full_name,
        email = excluded.email,
        phone_number = excluded.phone_number,
        timezone = excluded.timezone,
        role = excluded.role,
        account_status = excluded.account_status,
        subscription_plan = excluded.subscription_plan,
        updated_at = now()
      `,
      [
        profile.id,
        profile.full_name,
        profile.email,
        profile.phone_number,
        profile.timezone,
        profile.role,
        profile.account_status,
        profile.subscription_plan,
      ],
    );
  } finally {
    client.release();
    await pool.end();
  }
}

async function createApplicationWithPostgres(application: any) {
  const pool = createPool();
  const client = await pool.connect();

  try {
    await ensureApplicationScreenshotColumns(client);
    const result = await client.query(
      `
      insert into applications (
        user_id,
        client_id,
        job_id,
        status,
        current_stage,
        is_saved,
        is_active,
        application_date,
        applied_at,
        company_name,
        job_title,
        job_location,
        salary_range,
        work_type,
        employment_type,
        job_description,
        before_screenshot_url,
        after_screenshot_url,
        created_by_admin_id
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
      )
      returning *
      `,
      [
        application.user_id,
        application.client_id,
        application.job_id,
        application.status,
        application.current_stage,
        application.is_saved,
        application.is_active,
        application.application_date,
        application.applied_at,
        application.company_name || "",
        application.job_title || "",
        application.job_location || "",
        application.salary_range || "",
        application.work_type || "",
        application.employment_type || "",
        application.job_description || "",
        application.before_screenshot_url || "",
        application.after_screenshot_url || "",
        application.created_by_admin_id || "admin",
      ],
    );

    return result.rows[0];
  } finally {
    client.release();
    await pool.end();
  }
}

async function updateApplicationWithPostgres(applicationId: number, application: any) {
  const pool = createPool();
  const client = await pool.connect();

  try {
    await ensureApplicationScreenshotColumns(client);
    const result = await client.query(
      `
      update applications set
        user_id = $2,
        client_id = $3,
        job_id = $4,
        status = $5,
        current_stage = $6,
        is_saved = $7,
        is_active = $8,
        application_date = $9,
        applied_at = $10,
        company_name = $11,
        job_title = $12,
        job_location = $13,
        salary_range = $14,
        work_type = $15,
        employment_type = $16,
        job_description = $17,
        before_screenshot_url = $18,
        after_screenshot_url = $19,
        created_by_admin_id = $20,
        updated_at = now()
      where id = $1
      returning *
      `,
      [
        applicationId,
        application.user_id,
        application.client_id,
        application.job_id,
        application.status,
        application.current_stage,
        application.is_saved,
        application.is_active,
        application.application_date,
        application.applied_at,
        application.company_name || "",
        application.job_title || "",
        application.job_location || "",
        application.salary_range || "",
        application.work_type || "",
        application.employment_type || "",
        application.job_description || "",
        application.before_screenshot_url || "",
        application.after_screenshot_url || "",
        application.created_by_admin_id || "admin",
      ],
    );

    return result.rows[0];
  } finally {
    client.release();
    await pool.end();
  }
}

async function updateApplicationSavedFlagWithPostgres(applicationId: number, isSaved: boolean) {
  const pool = createPool();
  const client = await pool.connect();

  try {
    const result = await client.query(
      `
      update applications set
        is_saved = $2,
        updated_at = now()
      where id = $1
      returning *
      `,
      [applicationId, isSaved],
    );

    return result.rows[0] ?? null;
  } finally {
    client.release();
    await pool.end();
  }
}

async function createRecruiterContactWithPostgres(contact: any) {
  const pool = createPool();
  const client = await pool.connect();

  try {
    await ensureRecruiterContactsTable(client);
    const result = await client.query(
      `
      insert into recruiter_contacts (
        client_id,
        application_id,
        recruiter_name,
        company_name,
        email,
        linkedin_url,
        contact_method,
        contact_date,
        response_status,
        notes
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      )
      returning *
      `,
      [
        contact.client_id,
        contact.application_id,
        contact.recruiter_name || "",
        contact.company_name || "",
        contact.email || "",
        contact.linkedin_url || "",
        contact.contact_method || "other",
        contact.contact_date || new Date().toISOString(),
        contact.response_status || "no_response",
        contact.notes || "",
      ],
    );

    return result.rows[0];
  } finally {
    client.release();
    await pool.end();
  }
}

async function updateRecruiterContactWithPostgres(contactId: number, contact: any) {
  const pool = createPool();
  const client = await pool.connect();

  try {
    await ensureRecruiterContactsTable(client);
    const result = await client.query(
      `
      update recruiter_contacts set
        client_id = $2,
        application_id = $3,
        recruiter_name = $4,
        company_name = $5,
        email = $6,
        linkedin_url = $7,
        contact_method = $8,
        contact_date = $9,
        response_status = $10,
        notes = $11,
        updated_at = now()
      where id = $1
      returning *
      `,
      [
        contactId,
        contact.client_id,
        contact.application_id,
        contact.recruiter_name || "",
        contact.company_name || "",
        contact.email || "",
        contact.linkedin_url || "",
        contact.contact_method || "other",
        contact.contact_date || new Date().toISOString(),
        contact.response_status || "no_response",
        contact.notes || "",
      ],
    );

    return result.rows[0];
  } finally {
    client.release();
    await pool.end();
  }
}

async function getRecruiterContactsWithPostgres(clientId?: string) {
  const pool = createPool();
  const client = await pool.connect();

  try {
    await ensureRecruiterContactsTable(client);
    const values: unknown[] = [];
    let whereClause = "";

    if (clientId) {
      values.push(clientId);
      whereClause = `where client_id = $1`;
    }

    const result = await client.query(
      `
      select *
      from recruiter_contacts
      ${whereClause}
      order by contact_date desc nulls last, created_at desc nulls last
      `,
      values,
    );

    return result.rows;
  } finally {
    client.release();
    await pool.end();
  }
}

async function deleteRecruiterContactWithPostgres(contactId: number) {
  const pool = createPool();
  const client = await pool.connect();

  try {
    await ensureRecruiterContactsTable(client);
    const result = await client.query(
      `
      delete from recruiter_contacts
      where id = $1
      returning id
      `,
      [contactId],
    );

    return (result.rowCount ?? 0) > 0;
  } finally {
    client.release();
    await pool.end();
  }
}

async function runBestEffortProfileDeleteQuery(client: any, queryText: string, values: any[]) {
  try {
    await client.query(queryText, values);
  } catch (error: any) {
    if (error?.code === "42P01") {
      return;
    }
    throw error;
  }
}

async function deleteProfileWithPostgres(profileId: string) {
  const pool = createPool();
  const client = await pool.connect();

  try {
    await runBestEffortProfileDeleteQuery(client, `delete from messages where conversation_id = $1 or sender_id = $1 or recipient_id = $1`, [profileId]);
    await runBestEffortProfileDeleteQuery(client, `delete from conversations where id = $1 or client_id = $1`, [profileId]);
    await runBestEffortProfileDeleteQuery(client, `delete from candidate_questionnaires where user_id = $1`, [profileId]);
    await runBestEffortProfileDeleteQuery(client, `delete from user_subscriptions where user_id = $1`, [profileId]);
    await runBestEffortProfileDeleteQuery(client, `delete from activity_logs where client_id = $1`, [profileId]);
    await runBestEffortProfileDeleteQuery(client, `delete from interviews where client_id = $1`, [profileId]);
    await runBestEffortProfileDeleteQuery(client, `delete from resume_scores where user_id = $1`, [profileId]);
    await runBestEffortProfileDeleteQuery(client, `delete from cover_letters where user_id = $1`, [profileId]);
    await runBestEffortProfileDeleteQuery(client, `delete from notifications where user_id = $1`, [profileId]);
    await runBestEffortProfileDeleteQuery(client, `delete from follow_ups where client_id = $1`, [profileId]);
    await runBestEffortProfileDeleteQuery(client, `delete from cold_emails where client_id = $1`, [profileId]);
    await runBestEffortProfileDeleteQuery(client, `delete from client_scores where client_id = $1`, [profileId]);
    await runBestEffortProfileDeleteQuery(client, `delete from recruiter_contacts where client_id = $1`, [profileId]);
    await runBestEffortProfileDeleteQuery(client, `delete from saved_jobs where user_id = $1`, [profileId]);
    await runBestEffortProfileDeleteQuery(client, `delete from applications where user_id = $1 or client_id = $1`, [profileId]);
    await runBestEffortProfileDeleteQuery(client, `delete from profiles where id = $1`, [profileId]);
  } finally {
    client.release();
    await pool.end();
  }
}

router.get("/admin/dashboard", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdminRole(req, res)) {
    return;
  }

  try {
    const [usersResult, jobsResult, applicationsResult, messagesResult, subscriptionsResult] = await Promise.all([
      runOptionalSnapshotListQuery("profiles", async () => supabase.from("profiles").select("id")),
      runOptionalSnapshotListQuery("jobs", async () => supabase.from("jobs").select("id")),
      runOptionalSnapshotListQuery("applications", async () => supabase.from("applications").select("id")),
      runOptionalSnapshotListQuery("messages", async () => supabase.from("messages").select("id")),
      runOptionalSnapshotListQuery("user_subscriptions", async () =>
        supabase.from("user_subscriptions").select("id, user_id, status").eq("status", "active"),
      ),
    ]);

    return res.json({
      success: true,
      stats: {
        usersCount: usersResult.data.length,
        jobsCount: jobsResult.data.length,
        applicationsCount: applicationsResult.data.length,
        messagesCount: messagesResult.data.length,
        activeSubscriptionsCount: subscriptionsResult.data.length,
      },
    });
  } catch (err: any) {
    console.error("[Tracker Route] GET /admin/dashboard failed:", err);
    return res.json({
      success: true,
      stats: {
        usersCount: 0,
        jobsCount: 0,
        applicationsCount: 0,
        messagesCount: 0,
        activeSubscriptionsCount: 0,
      },
    });
  }
});

router.get("/admin/services", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdminRole(req, res)) {
    return;
  }

  try {
    const result = await runOptionalSnapshotListQuery("services", async () =>
      supabase.from("services").select("*").order("created_at", { ascending: false }),
    );
    return res.json({ success: true, services: result.data });
  } catch (err: any) {
    console.error("[Tracker Route] GET /admin/services failed:", err);
    return res.json({ success: true, services: LOCAL_SNAPSHOT_SERVICE_ROWS });
  }
});

router.get("/admin/pricing-plans", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdminRole(req, res)) {
    return;
  }

  try {
    const result = await runOptionalSnapshotListQuery("pricing_plans", async () =>
      supabase.from("pricing_plans").select("*").order("created_at", { ascending: false }),
    );
    return res.json({ success: true, plans: result.data });
  } catch (err: any) {
    console.error("[Tracker Route] GET /admin/pricing-plans failed:", err);
    return res.json({ success: true, plans: LOCAL_SNAPSHOT_PRICING_PLAN_ROWS });
  }
});

router.get("/admin/system-settings", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdminRole(req, res)) {
    return;
  }

  try {
    const result = await runOptionalSnapshotSingleQuery("system_settings", async () =>
      supabase.from("system_settings").select("*").eq("id", 1).maybeSingle(),
    );
    return res.json({
      success: true,
      settings: result.data ?? {
        id: 1,
        maintenance_mode: false,
        push_notifications_enabled: true,
        dark_mode_override: false,
      },
    });
  } catch (err: any) {
    console.error("[Tracker Route] GET /admin/system-settings failed:", err);
    return res.json({
      success: true,
      settings: {
        id: 1,
        maintenance_mode: false,
        push_notifications_enabled: true,
        dark_mode_override: false,
      },
    });
  }
});

router.post("/admin/tracker/applications", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdminRole(req, res)) {
    return;
  }

  const { application, job } = req.body || {};
  const normalizedApplication = normalizeApplicationPayload(application);
  if (!normalizedApplication) {
    return res.status(400).json({ error: "Missing tracker application payload" });
  }

  try {
    const normalizedJob = normalizeJobPayload(job);
    const normalizedProfile = buildProfilePayload(application);
    let previousApplication: any = null;
    const performedBy = req.user?.email || req.user?.userId || "admin";

    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      if (normalizedProfile?.id) {
        const { error: profileError } = await supabase.from("profiles").upsert([normalizedProfile], { onConflict: "id" });
        if (profileError) throw profileError;
      }

      if (normalizedJob?.id) {
        const { error: jobError } = await supabase.from("jobs").upsert([normalizedJob], { onConflict: "id" });
        if (jobError) {
          if (!canRetryJobWithoutLink(jobError)) {
            throw jobError;
          }

          const { job_link: _jobLink, ...legacyJobPayload } = normalizedJob;
          const { error: legacyJobError } = await supabase.from("jobs").upsert([legacyJobPayload], { onConflict: "id" });
          if (legacyJobError) throw legacyJobError;
        }
      }

      const existingApplicationId = application.id
        ? Number(application.id)
        : (await findEquivalentSupabaseApplicationId(normalizedApplication)) ??
          (await findLatestSupabaseApplicationId(
            normalizedApplication.user_id,
            normalizedApplication.job_id,
          ));
      if (existingApplicationId) {
        const { data: existingApplicationData, error: existingApplicationError } = await supabase
          .from("applications")
          .select("*")
          .eq("id", existingApplicationId)
          .maybeSingle();
        if (existingApplicationError) throw existingApplicationError;
        previousApplication = existingApplicationData ?? null;
      }
      const query = existingApplicationId
        ? supabase.from("applications").update(normalizedApplication).eq("id", existingApplicationId).select().single()
        : supabase.from("applications").insert([normalizedApplication]).select().single();
      const { data, error } = await query;
      if (error) throw error;

      if (normalizedApplication.is_saved) {
        const { error: savedJobError } = await supabase
          .from("saved_jobs")
          .upsert([{ user_id: normalizedApplication.user_id, job_id: normalizedApplication.job_id }], { onConflict: "user_id,job_id" });
        if (savedJobError) throw savedJobError;
      } else {
        const { error: savedJobDeleteError } = await supabase
          .from("saved_jobs")
          .delete()
          .eq("user_id", normalizedApplication.user_id)
          .eq("job_id", normalizedApplication.job_id);
        if (savedJobDeleteError) throw savedJobDeleteError;
      }

      await insertTrackerActivityLog({
        clientId: normalizedApplication.user_id,
        applicationId: Number(data?.id ?? existingApplicationId ?? 0) || null,
        performedBy,
        activityType: "application_saved",
        title: "Application saved",
        description: "Application tracker entry created or updated from admin panel.",
        oldValue: previousApplication,
        newValue: data,
      });

      return res.json({ success: true, application: data, previousApplication });
    }

    if (!hasUsableDatabaseUrl()) {
      return res.status(500).json({
        error:
          "Backend write credentials are missing. Set SUPABASE_SERVICE_ROLE_KEY or a real DATABASE_URL in backend/.env to create tracker records without RLS errors.",
      });
    }

    if (normalizedProfile?.id) {
      await ensureProfileWithPostgres(application);
    }

    if (normalizedJob?.id) {
      await upsertJobWithPostgres(normalizedJob);
    }

    const existingApplication = application.id
      ? { id: Number(application.id) }
      : await getApplicationByUserAndJobWithPostgres(
          normalizedApplication.user_id,
          normalizedApplication.job_id,
        );
    previousApplication = existingApplication ?? null;
    const saved = existingApplication?.id
      ? await updateApplicationWithPostgres(Number(existingApplication.id), normalizedApplication)
      : await createApplicationWithPostgres(normalizedApplication);
    if (normalizedApplication.is_saved) {
      await upsertSavedJobWithPostgres(normalizedApplication.user_id, normalizedApplication.job_id);
    } else {
      await deleteSavedJobWithPostgres(normalizedApplication.user_id, normalizedApplication.job_id);
    }

    await insertTrackerActivityLog({
      clientId: normalizedApplication.user_id,
      applicationId: Number(saved?.id ?? existingApplication?.id ?? 0) || null,
      performedBy,
      activityType: "application_saved",
      title: "Application saved",
      description: "Application tracker entry created or updated from admin panel.",
      oldValue: previousApplication,
      newValue: saved,
    });

    return res.json({ success: true, application: saved, previousApplication });
  } catch (err: any) {
    console.error("[Tracker Route] POST /admin/tracker/applications failed:", err);
    return res.status(500).json({ error: err.message || "Failed to create tracker application" });
  }
});

router.post("/admin/tracker/jobs", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdminRole(req, res)) {
    return;
  }

  const normalizedJob = normalizeJobPayload(req.body?.job || req.body);
  if (!normalizedJob) {
    return res.status(400).json({ error: "Missing opportunity payload" });
  }

  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { error: jobError } = await supabase.from("jobs").upsert([normalizedJob], { onConflict: "id" });
      if (jobError) {
        if (!canRetryJobWithoutLink(jobError)) {
          throw jobError;
        }

        const { job_link: _jobLink, ...legacyJobPayload } = normalizedJob;
        const { error: legacyJobError } = await supabase.from("jobs").upsert([legacyJobPayload], { onConflict: "id" });
        if (legacyJobError) throw legacyJobError;
      }

      return res.json({ success: true, job: normalizedJob });
    }

    if (!hasUsableDatabaseUrl()) {
      return res.status(500).json({
        error:
          "Backend write credentials are missing. Set SUPABASE_SERVICE_ROLE_KEY or a real DATABASE_URL in backend/.env to save opportunities without RLS errors.",
      });
    }

    await upsertJobWithPostgres(normalizedJob);
    return res.json({ success: true, job: normalizedJob });
  } catch (err: any) {
    console.error("[Tracker Route] POST /admin/tracker/jobs failed:", err);
    return res.status(500).json({ error: err.message || "Failed to save opportunity" });
  }
});

router.post("/admin/tracker/scores", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdminRole(req, res)) {
    return;
  }

  const normalizedScore = normalizeClientScorePayload(req.body?.score || req.body);
  if (!normalizedScore) {
    return res.status(400).json({ error: "Missing score payload" });
  }

  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const query = normalizedScore.id
        ? supabase.from("client_scores").update({
            client_id: normalizedScore.client_id,
            application_id: normalizedScore.application_id,
            ats_score: normalizedScore.ats_score,
            ai_match_score: normalizedScore.ai_match_score,
            score_reason: normalizedScore.score_reason,
            recommendations: normalizedScore.recommendations,
            calculated_at: normalizedScore.calculated_at,
            updated_by: normalizedScore.updated_by,
          }).eq("id", normalizedScore.id).select().single()
        : supabase.from("client_scores").insert([{
            client_id: normalizedScore.client_id,
            application_id: normalizedScore.application_id,
            ats_score: normalizedScore.ats_score,
            ai_match_score: normalizedScore.ai_match_score,
            score_reason: normalizedScore.score_reason,
            recommendations: normalizedScore.recommendations,
            calculated_at: normalizedScore.calculated_at,
            updated_by: normalizedScore.updated_by,
          }]).select().single();
      const { data, error } = await query;
      if (error) throw error;
      return res.json({ success: true, score: data });
    }

    if (!hasUsableDatabaseUrl()) {
      return res.status(500).json({
        error:
          "Backend write credentials are missing. Set SUPABASE_SERVICE_ROLE_KEY or a real DATABASE_URL in backend/.env to save scores without RLS errors.",
      });
    }

    const pool = createPool();
    const client = await pool.connect();
    try {
      const result = normalizedScore.id
        ? await client.query(
            `
              update client_scores
              set
                client_id = $2,
                application_id = $3,
                ats_score = $4,
                ai_match_score = $5,
                score_reason = $6,
                recommendations = $7,
                calculated_at = $8,
                updated_by = $9
              where id = $1
              returning *
            `,
            [
              normalizedScore.id,
              normalizedScore.client_id,
              normalizedScore.application_id,
              normalizedScore.ats_score,
              normalizedScore.ai_match_score,
              normalizedScore.score_reason,
              normalizedScore.recommendations,
              normalizedScore.calculated_at,
              normalizedScore.updated_by,
            ],
          )
        : await client.query(
            `
              insert into client_scores (
                client_id,
                application_id,
                ats_score,
                ai_match_score,
                score_reason,
                recommendations,
                calculated_at,
                updated_by
              )
              values ($1, $2, $3, $4, $5, $6, $7, $8)
              returning *
            `,
            [
              normalizedScore.client_id,
              normalizedScore.application_id,
              normalizedScore.ats_score,
              normalizedScore.ai_match_score,
              normalizedScore.score_reason,
              normalizedScore.recommendations,
              normalizedScore.calculated_at,
              normalizedScore.updated_by,
            ],
          );

      return res.json({ success: true, score: result.rows[0] ?? null });
    } finally {
      client.release();
      await pool.end();
    }
  } catch (err: any) {
    console.error("[Tracker Route] POST /admin/tracker/scores failed:", err);
    return res.status(500).json({ error: err.message || "Failed to save score" });
  }
});

router.get("/admin/tracker/client-data", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdminRole(req, res)) {
    return;
  }

  const clientId = String(req.query.clientId || "").trim();
  if (!clientId) {
    return res.status(400).json({ error: "Missing tracker client id" });
  }

  try {
    const [
      applicationsResult,
      interviewsResult,
      followUpsResult,
      contactsResult,
      coldEmailsResult,
      scoresResult,
      activityResult,
    ] = await Promise.all([
      supabase
        .from("applications")
        .select("*, jobs(*)")
        .eq("user_id", clientId)
        .order("created_at", { ascending: false }),
      supabase
        .from("interviews")
        .select("*")
        .eq("client_id", clientId)
        .order("interview_date", { ascending: false }),
      supabase
        .from("follow_ups")
        .select("*")
        .eq("client_id", clientId)
        .order("due_date", { ascending: true }),
      supabase
        .from("recruiter_contacts")
        .select("*")
        .eq("client_id", clientId)
        .order("contact_date", { ascending: false }),
      supabase
        .from("cold_emails")
        .select("*")
        .eq("client_id", clientId)
        .order("sent_at", { ascending: false }),
      supabase
        .from("client_scores")
        .select("*")
        .eq("client_id", clientId)
        .order("calculated_at", { ascending: false }),
      supabase
        .from("activity_logs")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false }),
    ]);

    const results = [
      applicationsResult,
      interviewsResult,
      followUpsResult,
      contactsResult,
      coldEmailsResult,
      scoresResult,
      activityResult,
    ];
    const firstError = results.find((result) => result.error)?.error;
    if (firstError) {
      throw firstError;
    }

    return res.json({
      applications: dedupeApplicationsByRole((applicationsResult.data ?? []) as any[]),
      interviews: interviewsResult.data ?? [],
      followUps: followUpsResult.data ?? [],
      contacts: contactsResult.data ?? [],
      coldEmails: coldEmailsResult.data ?? [],
      scores: scoresResult.data ?? [],
      activity: activityResult.data ?? [],
    });
  } catch (err: any) {
    console.error("[Tracker Route] GET /admin/tracker/client-data failed:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch tracker client data" });
  }
});

router.post("/admin/tracker/interviews", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdminRole(req, res)) {
    return;
  }

  const interview = req.body || {};
  const applicationId = Number(interview.application_id);
  if (!interview.client_id || !Number.isFinite(applicationId) || !interview.interview_date) {
    return res.status(400).json({ error: "Missing required interview details" });
  }

  const payload = {
    client_id: String(interview.client_id),
    application_id: applicationId,
    interview_type: String(interview.interview_type || "video"),
    interview_round: String(interview.interview_round || ""),
    interview_date: interview.interview_date,
    status: String(interview.status || "scheduled"),
    interviewer_name: String(interview.interviewer_name || ""),
    interviewer_email: String(interview.interviewer_email || ""),
    meeting_link: String(interview.meeting_link || ""),
    location: String(interview.location || ""),
    admin_notes: typeof interview.admin_notes === "string" && interview.admin_notes.trim().startsWith("{") 
      ? interview.admin_notes
      : JSON.stringify({
          notes: String(interview.admin_notes || ""),
          about_company: String(interview.about_company || ""),
          key_responsibilities: String(interview.key_responsibilities || ""),
          job_link: String(interview.job_link || ""),
          company: String(interview.company || ""),
        }),
  };

  try {
    const interviewId = Number(interview.id);
    const query = Number.isFinite(interviewId) && interviewId > 0
      ? supabase.from("interviews").update(payload).eq("id", interviewId).select().single()
      : supabase.from("interviews").insert([payload]).select().single();
    const { data, error } = await query;
    if (error) throw error;

    if (payload.status === "completed") {
      const { error: applicationError } = await supabase
        .from("applications")
        .update({ status: "interview_completed", current_stage: "interview_completed" })
        .eq("id", applicationId);
      if (applicationError) throw applicationError;
    }

    return res.json({ success: true, interview: data });
  } catch (err: any) {
    console.error("[Tracker Route] POST /admin/tracker/interviews failed:", err);
    return res.status(500).json({ error: err.message || "Failed to save interview" });
  }
});

router.patch("/admin/tracker/applications/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdminRole(req, res)) {
    return;
  }

  const applicationId = Number(req.params.id);
  if (!Number.isFinite(applicationId)) {
    return res.status(400).json({ error: "Invalid tracker application id" });
  }

  const allowedFields = [
    "status",
    "current_stage",
    "is_saved",
    "is_active",
    "next_action",
    "next_action_date",
    "notes",
    "offer_received_at",
    "hired_at",
    "before_screenshot_url",
    "after_screenshot_url",
  ];
  const patch = Object.fromEntries(
    allowedFields
      .filter((field) => Object.prototype.hasOwnProperty.call(req.body || {}, field))
      .map((field) => [field, req.body[field]]),
  );

  if (Object.keys(patch).length === 0) {
    return res.status(400).json({ error: "No tracker application fields supplied" });
  }

  try {
    const { data: previousApplication, error: previousApplicationError } = await supabase
      .from("applications")
      .select("*")
      .eq("id", applicationId)
      .maybeSingle();
    if (previousApplicationError) throw previousApplicationError;

    const { data, error } = await supabase
      .from("applications")
      .update(patch)
      .eq("id", applicationId)
      .select()
      .single();
    if (error) throw error;

    await syncQuickUpdateReminder(data, patch);

    if (data?.user_id && data?.job_id) {
      if (data.is_saved || data.status === "saved") {
        const { error: savedJobError } = await supabase
          .from("saved_jobs")
          .upsert([{ user_id: data.user_id, job_id: data.job_id }], { onConflict: "user_id,job_id" });
        if (savedJobError) throw savedJobError;
      } else {
        const { error: savedJobDeleteError } = await supabase
          .from("saved_jobs")
          .delete()
          .eq("user_id", data.user_id)
          .eq("job_id", data.job_id);
        if (savedJobDeleteError) throw savedJobDeleteError;
      }
    }

    await insertTrackerActivityLog({
      clientId: String(data?.user_id || previousApplication?.user_id || ""),
      applicationId: Number(data?.id ?? applicationId),
      performedBy: req.user?.email || req.user?.userId || "admin",
      activityType: "application_saved",
      title: "Application saved",
      description: "Application tracker entry created or updated from admin panel.",
      oldValue: previousApplication,
      newValue: data,
    });

    return res.json({ success: true, application: data });
  } catch (err: any) {
    console.error("[Tracker Route] PATCH /admin/tracker/applications/:id failed:", err);
    return res.status(500).json({ error: err.message || "Failed to update tracker application" });
  }
});

router.delete("/admin/tracker/applications/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdminRole(req, res)) {
    return;
  }

  const applicationId = Number(req.params.id);
  if (!Number.isFinite(applicationId)) {
    return res.status(400).json({ error: "Invalid tracker application id" });
  }

  try {
    const { data: application, error: readError } = await supabase
      .from("applications")
      .select("id,user_id,job_id")
      .eq("id", applicationId)
      .maybeSingle();
    if (readError) throw readError;

    const { error: deleteError } = await supabase
      .from("applications")
      .delete()
      .eq("id", applicationId);
    if (deleteError) throw deleteError;

    if (application?.user_id && application?.job_id) {
      const { error: savedJobDeleteError } = await supabase
        .from("saved_jobs")
        .delete()
        .eq("user_id", application.user_id)
        .eq("job_id", application.job_id);
      if (savedJobDeleteError) throw savedJobDeleteError;
    }

    return res.json({ success: true });
  } catch (err: any) {
    console.error("[Tracker Route] DELETE /admin/tracker/applications/:id failed:", err);
    return res.status(500).json({ error: err.message || "Failed to delete tracker application" });
  }
});

router.get("/admin/personal-info", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdminRole(req, res)) {
    return;
  }

  try {
    const isServerlessRuntime = Boolean(process.env.VERCEL || process.env.AWS_REGION);
    const { data: profilesData, error } = await supabase
      .from("profiles")
      .select("*")
      .neq("role", "admin")
      .neq("role", "staff")
      .order("updated_at", { ascending: false });

    if (error && !isMissingRelationError(error)) {
      throw error;
    }

    const supabaseProfiles = (profilesData || []) as any[];
    if (isServerlessRuntime && supabaseProfiles.length > 0) {
      return res.json({
        profiles: supabaseProfiles.sort((left, right) =>
          String(right.updated_at || right.created_at || "").localeCompare(String(left.updated_at || left.created_at || "")),
        ),
      });
    }

    const localProfiles = await getLocalProfiles();
    const mergedProfiles = new Map<string, any>();

    for (const profile of supabaseProfiles) {
      mergedProfiles.set(profile.id, profile);
    }

    for (const profile of localProfiles) {
      const isPreviewSeed = profile.id === "preview-user-9jobs";
      const hasSupabaseProfile = mergedProfiles.has(profile.id);

      if (isPreviewSeed && !hasSupabaseProfile) {
        continue;
      }

      mergedProfiles.set(profile.id, { ...mergedProfiles.get(profile.id), ...profile });
    }

    return res.json({
      profiles: Array.from(mergedProfiles.values()).sort((left, right) =>
        String(right.updated_at || right.created_at || "").localeCompare(String(left.updated_at || left.created_at || "")),
      ),
    });
  } catch (err: any) {
    console.error("[Tracker Route] GET /admin/personal-info failed:", err);
    return res.json({ profiles: [] });
  }
});

router.post("/admin/personal-info", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdminRole(req, res)) {
    return;
  }

  const normalizedProfile = normalizePersonalInfoPayload(req.body?.profile);
  if (!normalizedProfile) {
    return res.status(400).json({ error: "Missing personal information payload" });
  }

  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { error } = await supabase.from("profiles").upsert([normalizedProfile], { onConflict: "id" });
      if (error) throw error;
    }

    const savedProfile = await upsertLocalProfile(normalizedProfile);
    return res.json({
      success: true,
      profile: savedProfile,
      mode: process.env.SUPABASE_SERVICE_ROLE_KEY ? "supabase" : "local_preview",
    });
  } catch (err: any) {
    console.error("[Tracker Route] POST /admin/personal-info failed:", err);
    return res.status(500).json({ error: err.message || "Failed to save personal information" });
  }
});

router.delete("/admin/personal-info/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdminRole(req, res)) {
    return;
  }

  const profileId = String(req.params.id || "").trim();
  if (!profileId) {
    return res.status(400).json({ error: "Missing personal information id" });
  }

  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const deleteQueries = [
        supabase.from("messages").delete().or(`conversation_id.eq.${profileId},sender_id.eq.${profileId},recipient_id.eq.${profileId}`),
        supabase.from("conversations").delete().or(`id.eq.${profileId},client_id.eq.${profileId}`),
        supabase.from("candidate_questionnaires").delete().eq("user_id", profileId),
        supabase.from("user_subscriptions").delete().eq("user_id", profileId),
        supabase.from("activity_logs").delete().eq("client_id", profileId),
        supabase.from("interviews").delete().eq("client_id", profileId),
        supabase.from("resume_scores").delete().eq("user_id", profileId),
        supabase.from("cover_letters").delete().eq("user_id", profileId),
        supabase.from("notifications").delete().eq("user_id", profileId),
        supabase.from("follow_ups").delete().eq("client_id", profileId),
        supabase.from("cold_emails").delete().eq("client_id", profileId),
        supabase.from("client_scores").delete().eq("client_id", profileId),
        supabase.from("recruiter_contacts").delete().eq("client_id", profileId),
        supabase.from("saved_jobs").delete().eq("user_id", profileId),
        supabase.from("applications").delete().or(`user_id.eq.${profileId},client_id.eq.${profileId}`),
        supabase.from("profiles").delete().eq("id", profileId),
      ];

      const results = await Promise.all(deleteQueries);
      for (const result of results) {
        if (result.error && !isMissingRelationError(result.error)) {
          throw result.error;
        }
      }
    } else if (hasUsableDatabaseUrl()) {
      await deleteProfileWithPostgres(profileId);
    }

    await deleteLocalProfile(profileId);
    return res.json({ success: true });
  } catch (err: any) {
    console.error("[Tracker Route] DELETE /admin/personal-info/:id failed:", err);
    return res.status(500).json({ error: err.message || "Failed to delete personal information" });
  }
});

router.post("/mobile/profile", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const requester = req.user;
  if (!requester?.userId) {
    return res.status(400).json({ error: "Missing authenticated user" });
  }

  const normalizedProfile = normalizePersonalInfoPayload(req.body?.profile, requester.userId, requester.email);
  if (!normalizedProfile) {
    return res.status(400).json({ error: "Missing personal information payload" });
  }

  if (normalizedProfile.id !== requester.userId && requester.role !== "admin" && requester.role !== "staff") {
    return res.status(403).json({ error: "Forbidden: Cannot update another user's profile" });
  }

  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { error } = await supabase.from("profiles").upsert([normalizedProfile], { onConflict: "id" });
      if (error) throw error;
    }

    const savedProfile = await upsertLocalProfile(normalizedProfile);
    return res.json({
      success: true,
      profile: savedProfile,
      mode: process.env.SUPABASE_SERVICE_ROLE_KEY ? "supabase" : "local_preview",
    });
  } catch (err: any) {
    console.error("[Tracker Route] POST /mobile/profile failed:", err);
    return res.status(500).json({ error: err.message || "Failed to update profile" });
  }
});

router.delete("/admin/tracker/saved-jobs", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdminRole(req, res)) {
    return;
  }

  const { applicationId, jobId, userId, status } = req.body || {};
  if (!jobId || !userId) {
    return res.status(400).json({ error: "Missing saved job identifiers" });
  }

  const normalizedStatus = String(status || "").toLowerCase();
  const numericApplicationId = Number(applicationId);
  const hasApplicationId = Number.isFinite(numericApplicationId);

  try {
    if (hasUsableDatabaseUrl()) {
      await deleteSavedJobWithPostgres(String(userId), String(jobId));

      if (hasApplicationId) {
        if (normalizedStatus === "saved") {
          const pool = createPool();
          const client = await pool.connect();
          try {
            await client.query(`delete from applications where id = $1`, [numericApplicationId]);
          } finally {
            client.release();
            await pool.end();
          }
        } else {
          await updateApplicationSavedFlagWithPostgres(numericApplicationId, false);
        }
      }

      return res.json({ success: true });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({
        error:
          "Backend write credentials are missing. Set SUPABASE_SERVICE_ROLE_KEY or a real DATABASE_URL in backend/.env to delete tracker records without RLS errors.",
      });
    }

    const { error: savedJobDeleteError } = await supabase
      .from("saved_jobs")
      .delete()
      .eq("user_id", String(userId))
      .eq("job_id", String(jobId));
    if (savedJobDeleteError) throw savedJobDeleteError;

    if (hasApplicationId) {
      if (normalizedStatus === "saved") {
        const { error: applicationDeleteError } = await supabase.from("applications").delete().eq("id", numericApplicationId);
        if (applicationDeleteError) throw applicationDeleteError;
      } else {
        const { error: applicationUpdateError } = await supabase
          .from("applications")
          .update({ is_saved: false })
          .eq("id", numericApplicationId);
        if (applicationUpdateError) throw applicationUpdateError;
      }
    }

    return res.json({ success: true });
  } catch (err: any) {
    console.error("[Tracker Route] DELETE /admin/tracker/saved-jobs failed:", err);
    return res.status(500).json({ error: err.message || "Failed to delete saved job" });
  }
});

router.post("/mobile/saved-jobs/toggle", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const requester = req.user;
  const requestedJobId = String(req.body?.jobId || "");

  if (!requester?.userId || !requestedJobId) {
    return res.status(400).json({ error: "Missing saved job toggle payload" });
  }

  const userId = requester.userId;

  try {
    if (hasUsableDatabaseUrl()) {
      const existingApplication = await getApplicationByUserAndJobWithPostgres(userId, requestedJobId);

      const pool = createPool();
      const client = await pool.connect();
      try {
        const existingSavedJobResult = await client.query(
          `
          select user_id, job_id
          from saved_jobs
          where user_id = $1 and job_id = $2
          limit 1
          `,
          [userId, requestedJobId],
        );
        const existingSavedJob = existingSavedJobResult.rows[0] ?? null;

        const serverSaved = Boolean(existingSavedJob) || Boolean(existingApplication?.is_saved) || existingApplication?.status === "saved";

        if (serverSaved) {
          await client.query(
            `
            delete from saved_jobs
            where user_id = $1 and job_id = $2
            `,
            [userId, requestedJobId],
          );

          if (existingApplication?.id) {
            if (String(existingApplication.status || "").toLowerCase() === "saved") {
              await client.query(`delete from applications where id = $1`, [existingApplication.id]);
            } else {
              await client.query(
                `
                update applications
                set is_saved = false,
                    updated_at = now()
                where id = $1
                `,
                [existingApplication.id],
              );
            }
          }

          return res.json({ success: true, isSaved: false });
        }

        await client.query(
          `
          insert into saved_jobs (user_id, job_id)
          values ($1, $2)
          on conflict (user_id, job_id) do nothing
          `,
          [userId, requestedJobId],
        );

        if (existingApplication?.id) {
          const shouldPromoteToSaved = !existingApplication.status || String(existingApplication.status).toLowerCase() === "draft";
          await client.query(
            `
            update applications
            set is_saved = true,
                status = case when $2 then 'saved' else status end,
                current_stage = case when $2 then 'saved' else current_stage end,
                is_active = case when $2 then false else is_active end,
                updated_at = now()
            where id = $1
            `,
            [existingApplication.id, shouldPromoteToSaved],
          );
        }

        return res.json({ success: true, isSaved: true });
      } finally {
        client.release();
        await pool.end();
      }
    }

    const { data: existingSavedJob, error: savedJobReadError } = await supabase
      .from("saved_jobs")
      .select("user_id,job_id")
      .eq("user_id", userId)
      .eq("job_id", requestedJobId)
      .maybeSingle();
    if (savedJobReadError) throw savedJobReadError;

    const { data: existingApplication, error: applicationReadError } = await supabase
      .from("applications")
      .select("id,status,current_stage,is_saved,is_active")
      .eq("user_id", userId)
      .eq("job_id", requestedJobId)
      .maybeSingle();
    if (applicationReadError) throw applicationReadError;

    const serverSaved =
      Boolean(existingSavedJob) ||
      Boolean(existingApplication?.is_saved) ||
      existingApplication?.status === "saved";

    if (serverSaved) {
      if (existingSavedJob) {
        const { error: deleteSavedJobError } = await supabase
          .from("saved_jobs")
          .delete()
          .eq("user_id", userId)
          .eq("job_id", requestedJobId);
        if (deleteSavedJobError) throw deleteSavedJobError;
      }

      if (existingApplication?.id) {
        if (existingApplication.status === "saved") {
          const { error: deleteApplicationError } = await supabase
            .from("applications")
            .delete()
            .eq("id", existingApplication.id);
          if (deleteApplicationError) throw deleteApplicationError;
        } else {
          const { error: updateApplicationError } = await supabase
            .from("applications")
            .update({ is_saved: false })
            .eq("id", existingApplication.id);
          if (updateApplicationError) throw updateApplicationError;
        }
      }

      return res.json({ success: true, isSaved: false });
    }

    const { error: insertSavedJobError } = await supabase
      .from("saved_jobs")
      .upsert([{ user_id: userId, job_id: requestedJobId }], { onConflict: "user_id,job_id" });
    if (insertSavedJobError) throw insertSavedJobError;

    if (existingApplication?.id) {
      const shouldPromoteToSaved = !existingApplication.status || existingApplication.status === "draft";
      const patch: Record<string, unknown> = { is_saved: true };
      if (shouldPromoteToSaved) {
        patch.status = "saved";
        patch.current_stage = "saved";
        patch.is_active = false;
      }
      const { error: updateApplicationError } = await supabase
        .from("applications")
        .update(patch)
        .eq("id", existingApplication.id);
      if (updateApplicationError) throw updateApplicationError;
    }

    return res.json({ success: true, isSaved: true });
  } catch (err: any) {
    console.error("[Tracker Route] POST /mobile/saved-jobs/toggle failed:", err);
    return res.status(500).json({ error: err.message || "Failed to toggle saved job" });
  }
});

router.post("/mobile/tracker/applications", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const requester = req.user;
  const requestedJobId = String(req.body?.jobId || "").trim();
  const requestedStatus = String(req.body?.status || "applied").trim().toLowerCase();

  if (!requester?.userId || !requestedJobId) {
    return res.status(400).json({ error: "Missing tracker application payload" });
  }

  const userId = requester.userId;
  const normalizedStatus =
    requestedStatus === "offer"
      ? "offer_received"
      : requestedStatus === "contacted"
      ? "recruiter_contacted"
      : requestedStatus === "interviewing"
      ? "interview_scheduled"
      : requestedStatus;

  const applicationPatch = {
    user_id: userId,
    client_id: userId,
    job_id: requestedJobId,
    status: normalizedStatus,
    current_stage: normalizedStatus,
    is_saved: normalizedStatus === "saved",
    is_active: !["saved", "hired", "rejected", "withdrawn", "closed"].includes(normalizedStatus),
    application_date: new Date().toISOString(),
    applied_at: normalizedStatus === "saved" ? null : new Date().toISOString(),
    offer_received_at: normalizedStatus === "offer_received" ? new Date().toISOString() : null,
    hired_at: normalizedStatus === "hired" ? new Date().toISOString() : null,
  };

  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const existingApplicationId = await findLatestSupabaseApplicationId(userId, requestedJobId);

      const query = existingApplicationId
        ? supabase.from("applications").update(applicationPatch).eq("id", existingApplicationId).select().single()
        : supabase.from("applications").insert([applicationPatch]).select().single();
      const { data, error } = await query;
      if (error) throw error;

      if (normalizedStatus === "saved") {
        const { error: savedJobError } = await supabase
          .from("saved_jobs")
          .upsert([{ user_id: userId, job_id: requestedJobId }], { onConflict: "user_id,job_id" });
        if (savedJobError) throw savedJobError;
      } else {
        const { error: deleteSavedJobError } = await supabase
          .from("saved_jobs")
          .delete()
          .eq("user_id", userId)
          .eq("job_id", requestedJobId);
        if (deleteSavedJobError) throw deleteSavedJobError;
      }

      return res.json({
        success: true,
        application: data,
        isSaved: normalizedStatus === "saved",
      });
    }

    if (!hasUsableDatabaseUrl()) {
      return res.status(500).json({
        error:
          "Backend write credentials are missing. Set SUPABASE_SERVICE_ROLE_KEY or a real DATABASE_URL in backend/.env to save tracker records without RLS errors.",
      });
    }

    const existingApplication = await getApplicationByUserAndJobWithPostgres(userId, requestedJobId);
    const saved = existingApplication?.id
      ? await updateApplicationWithPostgres(Number(existingApplication.id), applicationPatch)
      : await createApplicationWithPostgres(applicationPatch);

    if (normalizedStatus === "saved") {
      await upsertSavedJobWithPostgres(userId, requestedJobId);
    } else {
      await deleteSavedJobWithPostgres(userId, requestedJobId);
    }

    return res.json({
      success: true,
      application: saved,
      isSaved: normalizedStatus === "saved",
    });
  } catch (err: any) {
    console.error("[Tracker Route] POST /mobile/tracker/applications failed:", err);
    return res.status(500).json({ error: err.message || "Failed to save tracker application" });
  }
});

router.post("/admin/tracker/contacts", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdminRole(req, res)) {
    return;
  }

  const { contact, contacts } = req.body || {};
  const batchContacts = Array.isArray(contacts) ? contacts : [];
  const singleContact = contact && !Array.isArray(contact) ? contact : null;

  if (!singleContact && batchContacts.length === 0) {
    return res.status(400).json({ error: "Missing hiring manager payload" });
  }

  try {
    const performedBy = req.user?.email || req.user?.userId || "admin";
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        if (singleContact) {
          let previousContact: any = null;
          if (singleContact.id) {
            const { data: existingContact, error: existingContactError } = await supabase
              .from("recruiter_contacts")
              .select("*")
              .eq("id", Number(singleContact.id))
              .maybeSingle();
            if (existingContactError) throw existingContactError;
            previousContact = existingContact ?? null;
          }
          const query = singleContact.id
            ? supabase.from("recruiter_contacts").update(singleContact).eq("id", Number(singleContact.id)).select().single()
            : supabase.from("recruiter_contacts").insert([singleContact]).select().single();
          const { data, error } = await query;
          if (error) throw error;
          await insertTrackerActivityLog({
            clientId: String(data?.client_id || singleContact.client_id || ""),
            applicationId: Number(data?.application_id ?? singleContact.application_id ?? 0) || null,
            performedBy,
            activityType: "recruiter_contact_saved",
            title: "Hiring manager saved",
            description: "Hiring manager details updated from admin panel.",
            oldValue: previousContact,
            newValue: data,
            metadata: {
              response_status: data?.response_status ?? singleContact.response_status ?? null,
            },
          });
          return res.json({ success: true, contact: data });
        }

        const { data, error } = await supabase.from("recruiter_contacts").insert(batchContacts).select();
        if (error) throw error;
        return res.json({ success: true, contacts: data ?? [] });
      } catch (error) {
        if (!isMissingRelationError(error)) {
          throw error;
        }
      }
    }

    if (hasUsableDatabaseUrl()) {
      if (singleContact) {
        let previousContact: any = null;
        if (singleContact.id) {
          const pool = createPool();
          const client = await pool.connect();
          try {
            await ensureRecruiterContactsTable(client);
            const result = await client.query(`select * from recruiter_contacts where id = $1`, [Number(singleContact.id)]);
            previousContact = result.rows[0] ?? null;
          } finally {
            client.release();
            await pool.end();
          }
        }
        const saved = singleContact.id
          ? await updateRecruiterContactWithPostgres(Number(singleContact.id), singleContact)
          : await createRecruiterContactWithPostgres(singleContact);
        await insertTrackerActivityLog({
          clientId: String(saved?.client_id || singleContact.client_id || ""),
          applicationId: Number(saved?.application_id ?? singleContact.application_id ?? 0) || null,
          performedBy,
          activityType: "recruiter_contact_saved",
          title: "Hiring manager saved",
          description: "Hiring manager details updated from admin panel.",
          oldValue: previousContact,
          newValue: saved,
          metadata: {
            response_status: saved?.response_status ?? singleContact.response_status ?? null,
          },
        });
        return res.json({ success: true, contact: saved });
      }

      const savedContacts = [];
      for (const row of batchContacts) {
        savedContacts.push(await createRecruiterContactWithPostgres(row));
      }
      return res.json({ success: true, contacts: savedContacts });
    }

    if (singleContact) {
      const saved = await upsertLocalRecruiterContact(singleContact);
      return res.json({ success: true, contact: saved, mode: "local_preview" });
    }

    const savedContacts = [];
    for (const row of batchContacts) {
      savedContacts.push(await upsertLocalRecruiterContact(row));
    }
    return res.json({ success: true, contacts: savedContacts, mode: "local_preview" });
  } catch (err: any) {
    console.error("[Tracker Route] POST /admin/tracker/contacts failed:", err);
    return res.status(500).json({ error: err.message || "Failed to save hiring manager" });
  }
});

router.get("/admin/tracker/saved-jobs", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdminRole(req, res)) {
    return;
  }

  try {
    const [savedJobsResult, applicationsResult, profilesResult, jobsResult] = await Promise.all([
      supabase.from("saved_jobs").select("*").order("created_at", { ascending: false }),
      supabase.from("applications").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*"),
      supabase.from("jobs").select("*"),
    ]);

    const results = [savedJobsResult, applicationsResult, profilesResult, jobsResult];
    const firstError = results.find((result) => result.error)?.error;
    if (firstError) {
      throw firstError;
    }

    const entries = mergeSavedJobEntries({
      savedJobsData: (savedJobsResult.data || []) as any[],
      applicationsData: (applicationsResult.data || []) as any[],
      profilesData: (profilesResult.data || []) as any[],
      jobsData: (jobsResult.data || []) as any[],
    });

    return res.json({ success: true, entries });
  } catch (err: any) {
    console.error("[Tracker Route] GET /admin/tracker/saved-jobs failed:", err);
    return res.status(500).json({ error: err.message || "Failed to load saved jobs" });
  }
});

router.get("/admin/tracker/jobs", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdminRole(req, res)) {
    return;
  }

  try {
    const [jobsResult, applicationsResult, profilesResult] = await Promise.all([
      runOptionalSnapshotListQuery("jobs", async () =>
        supabase.from("jobs").select("*").order("created_at", { ascending: false }),
      ),
      runOptionalSnapshotListQuery("applications", async () =>
        supabase.from("applications").select("*").order("created_at", { ascending: false }),
      ),
      runOptionalSnapshotListQuery("profiles", async () =>
        supabase.from("profiles").select("id, full_name, email"),
      ),
    ]);

    const profileMap = new Map(
      ((profilesResult.data ?? []) as any[]).map((profile) => [String(profile.id || ""), profile]),
    );
    const canonicalApplications = dedupeApplicationsByRole((applicationsResult.data ?? []) as any[]);
    const preferredApplicationByJobId = new Map(
      canonicalApplications
        .filter((application) => normalizeRolePart(application?.job_id))
        .map((application) => [normalizeRolePart(application.job_id), application]),
    );

    const jobsByRole = new Map<string, any>();

    for (const job of (jobsResult.data ?? []) as any[]) {
      const normalizedJob = {
        ...job,
        title: String(job.title || "").trim(),
        company: String(job.company || "").trim(),
        location: String(job.location || "").trim(),
        salary: String(job.salary || "").trim(),
        description: String(job.description || "").trim(),
      };
      const normalizedJobId = normalizeRolePart(job.id);
      const roleKey = normalizedJobId ? `job:${normalizedJobId}` : buildJobRoleKey(normalizedJob) || `job:${String(job.id || "")}`;
      const linkedApplication = normalizedJobId ? preferredApplicationByJobId.get(normalizedJobId) || null : null;
      const existing = jobsByRole.get(roleKey);
      const linkedProfile = profileMap.get(String(linkedApplication?.user_id || linkedApplication?.client_id || ""));
      const enrichedJob = {
        ...normalizedJob,
        user_id: linkedApplication?.user_id || linkedApplication?.client_id || "",
        client_id: linkedApplication?.client_id || linkedApplication?.user_id || "",
        user_name: String(linkedProfile?.full_name || "").trim(),
        user_email: String(linkedProfile?.email || "").trim(),
        application_id: linkedApplication?.id ? String(linkedApplication.id) : "",
        status: linkedApplication?.status || "",
        current_stage: linkedApplication?.current_stage || linkedApplication?.status || "",
        before_screenshot_url: linkedApplication?.before_screenshot_url || "",
        after_screenshot_url: linkedApplication?.after_screenshot_url || "",
        application_date: linkedApplication?.application_date || "",
        applied_at: linkedApplication?.applied_at || "",
      };

      if (!existing) {
        jobsByRole.set(roleKey, enrichedJob);
        continue;
      }

      const existingLinkedApplication = normalizedJobId ? preferredApplicationByJobId.get(normalizedJobId) || null : null;
      const preferred = linkedApplication
        ? (existingLinkedApplication ? mergeApplicationRecords(existingLinkedApplication, linkedApplication) : linkedApplication)
        : existingLinkedApplication;

      jobsByRole.set(roleKey, {
        ...existing,
        ...enrichedJob,
        id: existing.id || enrichedJob.id,
        title: existing.title || enrichedJob.title,
        company: existing.company || enrichedJob.company,
        location: existing.location || enrichedJob.location,
        salary: existing.salary || enrichedJob.salary,
        job_type: existing.job_type || enrichedJob.job_type,
        description: existing.description || enrichedJob.description,
        user_id: preferred?.user_id || preferred?.client_id || existing.user_id || enrichedJob.user_id || "",
        client_id: preferred?.client_id || preferred?.user_id || existing.client_id || enrichedJob.client_id || "",
        user_name:
          String(profileMap.get(String(preferred?.user_id || preferred?.client_id || existing.user_id || enrichedJob.user_id || ""))?.full_name || "").trim() ||
          existing.user_name ||
          enrichedJob.user_name ||
          "",
        user_email:
          String(profileMap.get(String(preferred?.user_id || preferred?.client_id || existing.user_id || enrichedJob.user_id || ""))?.email || "").trim() ||
          existing.user_email ||
          enrichedJob.user_email ||
          "",
        application_id: preferred?.id ? String(preferred.id) : existing.application_id || enrichedJob.application_id || "",
        status: preferred?.status || existing.status || enrichedJob.status || "",
        current_stage: preferred?.current_stage || preferred?.status || existing.current_stage || enrichedJob.current_stage || "",
        before_screenshot_url:
          String(preferred?.before_screenshot_url || "").trim() ||
          existing.before_screenshot_url ||
          enrichedJob.before_screenshot_url ||
          "",
        after_screenshot_url:
          String(preferred?.after_screenshot_url || "").trim() ||
          existing.after_screenshot_url ||
          enrichedJob.after_screenshot_url ||
          "",
        application_date: preferred?.application_date || existing.application_date || enrichedJob.application_date || "",
        applied_at: preferred?.applied_at || existing.applied_at || enrichedJob.applied_at || "",
      });
    }

    for (const application of canonicalApplications) {
      const linkedProfile = profileMap.get(String(application.user_id || application.client_id || ""));
      const normalizedJobId = normalizeRolePart(application.job_id);
      const roleKey =
        normalizedJobId
          ? `job:${normalizedJobId}`
          : buildJobRoleKey({
              title: application.job_title,
              company: application.company_name,
              location: application.job_location,
              job_type: application.employment_type || application.work_type,
            }) || `application:${String(application.id || "")}`;

      if (jobsByRole.has(roleKey)) {
        continue;
      }

      jobsByRole.set(roleKey, {
        id: String(application.job_id || application.id || roleKey),
        title: String(application.job_title || "Untitled Role").trim(),
        company: String(application.company_name || "9Jobs").trim(),
        location: String(application.job_location || "Australia").trim(),
        salary: String(application.salary_range || "Not disclosed").trim(),
        job_type: String(application.employment_type || application.work_type || "Full-time").trim(),
        job_link: String(application.source_url || "").trim(),
        posted_at: application.application_date || application.applied_at || application.created_at || "Just now",
        match_score: 80,
        tags: [],
        description:
          String(application.job_description || "").trim() ||
          `${String(application.job_title || "This role").trim()} at ${String(application.company_name || "the company").trim()}.`,
        user_id: application.user_id || application.client_id || "",
        client_id: application.client_id || application.user_id || "",
        user_name: String(linkedProfile?.full_name || "").trim(),
        user_email: String(linkedProfile?.email || "").trim(),
        application_id: application.id ? String(application.id) : "",
        status: application.status || "",
        current_stage: application.current_stage || application.status || "",
        before_screenshot_url: application.before_screenshot_url || "",
        after_screenshot_url: application.after_screenshot_url || "",
        application_date: application.application_date || "",
        applied_at: application.applied_at || "",
      });
    }

    const jobs = Array.from(jobsByRole.values()).sort((left, right) =>
      String(right.updated_at || right.created_at || right.posted_at || "").localeCompare(
        String(left.updated_at || left.created_at || left.posted_at || ""),
      ),
    );

    return res.json({ success: true, jobs });
  } catch (err: any) {
    console.error("[Tracker Route] GET /admin/tracker/jobs failed:", err);
    return res.json({ success: true, jobs: [] });
  }
});

router.delete("/admin/tracker/jobs/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdminRole(req, res)) {
    return;
  }

  const jobId = String(req.params.id || "").trim();
  if (!jobId) {
    return res.status(400).json({ error: "Invalid opportunity id" });
  }

  try {
    const { error: savedJobsError } = await supabase
      .from("saved_jobs")
      .delete()
      .eq("job_id", jobId);
    if (savedJobsError) throw savedJobsError;

    const { error: applicationsError } = await supabase
      .from("applications")
      .delete()
      .eq("job_id", jobId);
    if (applicationsError) throw applicationsError;

    const { data, error } = await supabase
      .from("jobs")
      .delete()
      .eq("id", jobId)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: "Opportunity not found" });
    }

    return res.json({ success: true, id: data.id });
  } catch (err: any) {
    console.error("[Tracker Route] DELETE /admin/tracker/jobs/:id failed:", err);
    return res.status(500).json({ error: err.message || "Failed to delete opportunity" });
  }
});

router.get("/admin/tracker/contacts", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdminRole(req, res)) {
    return;
  }

  const clientId = typeof req.query.clientId === "string" ? req.query.clientId : undefined;

  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const query = clientId
          ? supabase.from("recruiter_contacts").select("*").eq("client_id", clientId).order("contact_date", { ascending: false })
          : supabase.from("recruiter_contacts").select("*").order("contact_date", { ascending: false });
        const { data, error } = await query;
        if (error) throw error;
        return res.json({ success: true, contacts: data ?? [] });
      } catch (error) {
        if (!isMissingRelationError(error)) {
          throw error;
        }
      }
    }

    if (hasUsableDatabaseUrl()) {
      const contacts = await getRecruiterContactsWithPostgres(clientId);
      return res.json({ success: true, contacts });
    }

    const contacts = await getLocalRecruiterContacts(clientId);
    return res.json({ success: true, contacts, mode: "local_preview" });
  } catch (err: any) {
    console.error("[Tracker Route] GET /admin/tracker/contacts failed:", err);
    return res.status(500).json({ error: err.message || "Failed to load hiring managers" });
  }
});

router.delete("/admin/tracker/contacts/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdminRole(req, res)) {
    return;
  }

  const contactId = Number(req.params.id);
  if (!Number.isFinite(contactId)) {
    return res.status(400).json({ error: "Invalid hiring manager id" });
  }

  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { error } = await supabase.from("recruiter_contacts").delete().eq("id", contactId);
        if (error) throw error;
        return res.json({ success: true });
      } catch (error) {
        if (!isMissingRelationError(error)) {
          throw error;
        }
      }
    }

    if (hasUsableDatabaseUrl()) {
      const deleted = await deleteRecruiterContactWithPostgres(contactId);
      return res.json({ success: deleted });
    }

    const deleted = await deleteLocalRecruiterContact(contactId);
    return res.json({ success: deleted, mode: "local_preview" });
  } catch (err: any) {
    console.error("[Tracker Route] DELETE /admin/tracker/contacts/:id failed:", err);
    return res.status(500).json({ error: err.message || "Failed to delete hiring manager" });
  }
});

router.get("/admin/tracker/cover-letters", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdminRole(req, res)) {
    return;
  }
  try {
    const { data: coverLetters, error: clError } = await supabase
      .from("cover_letters")
      .select("*")
      .order("created_at", { ascending: false });
    if (clError) throw clError;

    const userIds = Array.from(new Set((coverLetters || []).map((c) => c.user_id).filter(Boolean)));

    let profilesMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: profiles, error: pError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);
      if (pError) {
        console.error("[Tracker Route] Failed to fetch profiles for cover letters:", pError);
      } else if (profiles) {
        profilesMap = profiles.reduce((acc: any, p: any) => {
          acc[p.id] = p;
          return acc;
        }, {});
      }
    }

    const joinedCoverLetters = (coverLetters || []).map((cl) => ({
      ...cl,
      profiles: profilesMap[cl.user_id] || null
    }));

    return res.json({ success: true, coverLetters: joinedCoverLetters });
  } catch (err: any) {
    console.error("[Tracker Route] GET /admin/tracker/cover-letters failed:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch cover letters" });
  }
});

router.post("/admin/tracker/cover-letters", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdminRole(req, res)) {
    return;
  }
  const { user_id, content } = req.body || {};
  if (!user_id || !content) {
    return res.status(400).json({ error: "Missing required cover letter details" });
  }
  try {
    const { data, error } = await supabase
      .from("cover_letters")
      .upsert({
        user_id,
        content,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" })
      .select()
      .single();
    if (error) throw error;
    return res.json({ success: true, coverLetter: data });
  } catch (err: any) {
    console.error("[Tracker Route] POST /admin/tracker/cover-letters failed:", err);
    return res.status(500).json({ error: err.message || "Failed to save cover letter" });
  }
});

router.delete("/admin/tracker/cover-letters/:user_id", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdminRole(req, res)) {
    return;
  }
  const { user_id } = req.params;
  try {
    const { error } = await supabase
      .from("cover_letters")
      .delete()
      .eq("user_id", user_id);
    if (error) throw error;
    return res.json({ success: true });
  } catch (err: any) {
    console.error("[Tracker Route] DELETE /admin/tracker/cover-letters failed:", err);
    return res.status(500).json({ error: err.message || "Failed to delete cover letter" });
  }
});

router.get("/admin/tracker/follow-ups", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdminRole(req, res)) {
    return;
  }

  const clientId = typeof req.query.clientId === "string" ? req.query.clientId : undefined;

  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY is required for follow-up sync." });
    }

    const query = clientId
      ? supabase.from("follow_ups").select("*").eq("client_id", clientId).order("due_date", { ascending: true })
      : supabase.from("follow_ups").select("*").order("due_date", { ascending: true });
    const { data, error } = await query;
    if (error) throw error;

    return res.json({ success: true, followUps: data ?? [] });
  } catch (err: any) {
    console.error("[Tracker Route] GET /admin/tracker/follow-ups failed:", err);
    return res.status(500).json({ error: err.message || "Failed to load follow-ups" });
  }
});

router.post("/admin/tracker/follow-ups", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdminRole(req, res)) {
    return;
  }

  const followUp = req.body?.followUp;
  if (!followUp) {
    return res.status(400).json({ error: "Missing follow-up payload" });
  }

  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY is required for follow-up sync." });
    }

    const query = followUp.id
      ? supabase.from("follow_ups").update(followUp).eq("id", Number(followUp.id)).select().single()
      : supabase.from("follow_ups").insert([followUp]).select().single();
    const { data, error } = await query;
    if (error) throw error;

    return res.json({ success: true, followUp: data });
  } catch (err: any) {
    console.error("[Tracker Route] POST /admin/tracker/follow-ups failed:", err);
    return res.status(500).json({ error: err.message || "Failed to save follow-up" });
  }
});

router.delete("/admin/tracker/follow-ups/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdminRole(req, res)) {
    return;
  }

  const followUpId = Number(req.params.id);
  if (!Number.isFinite(followUpId)) {
    return res.status(400).json({ error: "Invalid follow-up id" });
  }

  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY is required for follow-up sync." });
    }

    const { error } = await supabase.from("follow_ups").delete().eq("id", followUpId);
    if (error) throw error;

    return res.json({ success: true });
  } catch (err: any) {
    console.error("[Tracker Route] DELETE /admin/tracker/follow-ups/:id failed:", err);
    return res.status(500).json({ error: err.message || "Failed to delete follow-up" });
  }
});

router.get("/admin/tracker/cold-emails", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdminRole(req, res)) {
    return;
  }

  const clientId = typeof req.query.clientId === "string" ? req.query.clientId : undefined;

  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY is required for cold email sync." });
    }

    const query = clientId
      ? supabase.from("cold_emails").select("*").eq("client_id", clientId).order("sent_at", { ascending: false })
      : supabase.from("cold_emails").select("*").order("sent_at", { ascending: false });
    const { data, error } = await query;
    if (error) throw error;

    return res.json({ success: true, coldEmails: data ?? [] });
  } catch (err: any) {
    console.error("[Tracker Route] GET /admin/tracker/cold-emails failed:", err);
    return res.status(500).json({ error: err.message || "Failed to load cold emails" });
  }
});

router.post("/admin/tracker/cold-emails", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdminRole(req, res)) {
    return;
  }

  const coldEmail = req.body?.coldEmail;
  const coldEmails = Array.isArray(req.body?.coldEmails) ? req.body.coldEmails : [];
  if (!coldEmail && coldEmails.length === 0) {
    return res.status(400).json({ error: "Missing cold email payload" });
  }

  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY is required for cold email sync." });
    }

    if (coldEmail) {
      const query = coldEmail.id
        ? supabase.from("cold_emails").update(coldEmail).eq("id", Number(coldEmail.id)).select().single()
        : supabase.from("cold_emails").insert([coldEmail]).select().single();
      const { data, error } = await query;
      if (error) throw error;
      return res.json({ success: true, coldEmail: data });
    }

    const { data, error } = await supabase.from("cold_emails").insert(coldEmails).select();
    if (error) throw error;
    return res.json({ success: true, coldEmails: data ?? [] });
  } catch (err: any) {
    console.error("[Tracker Route] POST /admin/tracker/cold-emails failed:", err);
    return res.status(500).json({ error: err.message || "Failed to save cold email" });
  }
});

router.delete("/admin/tracker/cold-emails/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdminRole(req, res)) {
    return;
  }

  const coldEmailId = Number(req.params.id);
  if (!Number.isFinite(coldEmailId)) {
    return res.status(400).json({ error: "Invalid cold email id" });
  }

  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY is required for cold email sync." });
    }

    const { error } = await supabase.from("cold_emails").delete().eq("id", coldEmailId);
    if (error) throw error;

    return res.json({ success: true });
  } catch (err: any) {
    console.error("[Tracker Route] DELETE /admin/tracker/cold-emails/:id failed:", err);
    return res.status(500).json({ error: err.message || "Failed to delete cold email" });
  }
});

router.get("/admin/success-stories", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdminRole(req, res)) {
    return;
  }

  try {
    if (hasUsableDatabaseUrl()) {
      const stories = await getSuccessStoriesWithPostgres();
      return res.json({ success: true, stories });
    }

    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { data, error } = await supabase
        .from("success_stories")
        .select("*")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (!error) {
        return res.json({ success: true, stories: data ?? [] });
      }

      if (!isMissingRelationError(error)) {
        throw error;
      }
    }

    const stories = await getLocalSuccessStories();
    return res.json({ success: true, stories, mode: "local_preview" });
  } catch (err: any) {
    console.error("[Tracker Route] GET /admin/success-stories failed:", err);
    return res.status(500).json({ error: err.message || "Failed to load success stories" });
  }
});

router.post("/admin/success-stories", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdminRole(req, res)) {
    return;
  }

  const normalizedStory = normalizeSuccessStoryPayload(req.body?.story);
  if (!normalizedStory) {
    return res.status(400).json({ error: "Missing success story fields" });
  }

  try {
    if (hasUsableDatabaseUrl()) {
      const story = await upsertSuccessStoryWithPostgres(normalizedStory);
      return res.json({ success: true, story });
    }

    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { data, error } = await supabase
        .from("success_stories")
        .upsert([{ ...normalizedStory, updated_at: new Date().toISOString() }], { onConflict: "id" })
        .select()
        .single();

      if (!error) {
        return res.json({ success: true, story: data });
      }

      if (!isMissingRelationError(error)) {
        throw error;
      }
    }

    const story = await upsertLocalSuccessStory(normalizedStory);
    return res.json({ success: true, story, mode: "local_preview" });
  } catch (err: any) {
    console.error("[Tracker Route] POST /admin/success-stories failed:", err);
    return res.status(500).json({ error: err.message || "Failed to save success story" });
  }
});

router.delete("/admin/success-stories/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdminRole(req, res)) {
    return;
  }

  try {
    if (hasUsableDatabaseUrl()) {
      await deleteSuccessStoryWithPostgres(String(req.params.id));
      return res.json({ success: true });
    }

    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { error } = await supabase.from("success_stories").delete().eq("id", String(req.params.id));
      if (!error) {
        return res.json({ success: true });
      }

      if (!isMissingRelationError(error)) {
        throw error;
      }
    }

    const deleted = await deleteLocalSuccessStory(String(req.params.id));
    return res.json({ success: deleted, mode: "local_preview" });
  } catch (err: any) {
    console.error("[Tracker Route] DELETE /admin/success-stories/:id failed:", err);
    return res.status(500).json({ error: err.message || "Failed to delete success story" });
  }
});

router.post(
  "/admin/success-stories/photo",
  authMiddleware,
  express.raw({ type: "*/*", limit: "15mb" }),
  async (req: AuthenticatedRequest, res: Response) => {
    if (!ensureAdminRole(req, res)) {
      return;
    }

    const fileNameHeader = req.headers["x-file-name"];
    const mimeTypeHeader = req.headers["x-file-type"];
    const fileName = Array.isArray(fileNameHeader) ? fileNameHeader[0] : fileNameHeader;
    const mimeType = Array.isArray(mimeTypeHeader) ? mimeTypeHeader[0] : mimeTypeHeader;
    const body = req.body;

    if (!fileName || !mimeType || !Buffer.isBuffer(body) || body.length === 0) {
      return res.status(400).json({ error: "Missing story photo payload" });
    }

    try {
      await ensurePublicAssetBucket();
      const safeName = sanitizeAttachmentName(fileName);
      const storagePath = `success-stories/${Date.now()}-${safeName}`;
      const { error } = await supabase.storage.from(SUCCESS_STORY_BUCKET).upload(storagePath, body, {
        contentType: mimeType,
        upsert: false,
      });

      if (error) {
        throw error;
      }

      const { data } = supabase.storage.from(SUCCESS_STORY_BUCKET).getPublicUrl(storagePath);
      return res.json({
        success: true,
        url: data.publicUrl,
        path: storagePath,
      });
    } catch (err: any) {
      console.error("[Tracker Route] POST /admin/success-stories/photo failed:", err);
      return res.status(500).json({ error: err.message || "Could not upload story photo" });
    }
  },
);

router.get("/admin/notifications", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdminRole(req, res)) {
    return;
  }

  try {
    const { data } = await runOptionalSnapshotListQuery("notifications", async () =>
      supabase.from("notifications").select("*").order("sent_at", { ascending: false }),
    );

    const notifications = await buildNotificationsWithProfiles(data ?? []);
    return res.json({ success: true, notifications });
  } catch (err: any) {
    console.error("[Tracker Route] GET /admin/notifications failed:", err);
    return res.json({ success: true, notifications: [] });
  }
});

router.get("/admin/resume-scores", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdminRole(req, res)) {
    return;
  }

  try {
    const { data: scores, error: scoresError } = await supabase
      .from("resume_scores")
      .select("*")
      .order("updated_at", { ascending: false });
    if (scoresError) throw scoresError;

    const userIds = [...new Set((scores ?? []).map((score: any) => score.user_id).filter(Boolean))];
    const profilesById = new Map<string, any>();
    const coverLettersById = new Map<string, any>();

    if (userIds.length > 0) {
      const [profilesRes, coverLettersRes] = await Promise.all([
        supabase.from("profiles").select("*").in("id", userIds),
        supabase.from("cover_letters").select("*").in("user_id", userIds),
      ]);

      if (profilesRes.error) throw profilesRes.error;

      for (const profile of profilesRes.data ?? []) {
        profilesById.set(String(profile.id), profile);
      }

      for (const cl of coverLettersRes.data ?? []) {
        coverLettersById.set(String(cl.user_id), cl);
      }
    }

    return res.json({
      success: true,
      resumeScores: (scores ?? []).map((score: any) => ({
        ...score,
        profiles: profilesById.get(String(score.user_id)) ?? null,
        coverLetter: coverLettersById.get(String(score.user_id)) ?? null,
      })),
    });
  } catch (err: any) {
    console.error("[Tracker Route] GET /admin/resume-scores failed:", err);
    return res.status(500).json({ error: err.message || "Failed to load resume scores" });
  }
});

router.post("/admin/notifications", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdminRole(req, res)) {
    return;
  }

  const { notification } = req.body || {};
  if (!notification?.title || !notification?.body) {
    return res.status(400).json({ error: "Missing notification payload" });
  }

  try {
    if (notification.user_id) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", String(notification.user_id))
        .maybeSingle();
      if (profileError) throw profileError;
      if (!profile) {
        return res.status(400).json({ error: "Candidate ID not found. Please use a valid client ID from Personal Information." });
      }
    }

    if (notification.id) {
      const { data, error } = await supabase
        .from("notifications")
        .update({
          title: String(notification.title),
          body: String(notification.body),
          user_id: notification.user_id ? String(notification.user_id) : null,
          status: String(notification.status || "sent"),
        })
        .eq("id", Number(notification.id))
        .select("*")
        .single();
      if (error) throw error;

      const [notificationWithProfile] = await buildNotificationsWithProfiles(data ? [data] : []);
      return res.json({ success: true, notification: notificationWithProfile ?? data });
    }

    if (notification.user_id) {
      const { data, error } = await supabase
        .from("notifications")
        .insert([
          {
            title: String(notification.title),
            body: String(notification.body),
            user_id: String(notification.user_id),
            status: String(notification.status || "sent"),
          },
        ])
        .select("*")
        .single();
      if (error) throw error;

      const [notificationWithProfile] = await buildNotificationsWithProfiles(data ? [data] : []);
      return res.json({ success: true, notification: notificationWithProfile ?? data });
    }

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id")
      .neq("role", "admin");
    if (profilesError) throw profilesError;

    const recipients = (profiles || []).map((profile) => ({
      title: String(notification.title),
      body: String(notification.body),
      user_id: String(profile.id),
      status: String(notification.status || "sent"),
    }));

    if (recipients.length === 0) {
      return res.status(400).json({ error: "No client profiles found for broadcast." });
    }

    const { data, error } = await supabase
      .from("notifications")
      .insert(recipients)
      .select("*");
    if (error) throw error;

    const notifications = await buildNotificationsWithProfiles(data ?? []);
    return res.json({ success: true, notifications });
  } catch (err: any) {
    console.error("[Tracker Route] POST /admin/notifications failed:", err);
    return res.status(500).json({ error: err.message || "Failed to save notification" });
  }
});

router.delete("/admin/notifications/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdminRole(req, res)) {
    return;
  }

  const notificationId = Number(req.params.id);
  if (!Number.isFinite(notificationId)) {
    return res.status(400).json({ error: "Invalid notification id" });
  }

  try {
    const { error } = await supabase.from("notifications").delete().eq("id", notificationId);
    if (error) throw error;

    return res.json({ success: true });
  } catch (err: any) {
    console.error("[Tracker Route] DELETE /admin/notifications/:id failed:", err);
    return res.status(500).json({ error: err.message || "Failed to delete notification" });
  }
});
router.post("/mobile/resumes/analyze", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const requester = req.user;
  if (!requester?.userId) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  const fileName = sanitizeAttachmentName(String(req.body?.fileName || "resume.pdf"));
  const extension = fileName.split(".").pop()?.toLowerCase();
  const inferredMimeType = extension === "pdf"
    ? "application/pdf"
    : extension === "doc"
      ? "application/msword"
      : extension === "docx"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "";
  const mimeType = String(req.body?.mimeType || inferredMimeType);
  const storagePath = String(req.body?.storagePath || "");
  let base64 = String(req.body?.base64 || "").replace(/^data:[^;]+;base64,/, "");
  const allowedTypes = new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]);

  if (!allowedTypes.has(mimeType)) {
    return res.status(400).json({ error: "Please upload a PDF, DOC, or DOCX resume." });
  }

  let fileBytes: Buffer;
  if (storagePath) {
    const requiredPrefix = `resumes/${sanitizeAttachmentName(requester.userId)}/`;
    if (!storagePath.startsWith(requiredPrefix)) {
      return res.status(403).json({ error: "Invalid resume upload path." });
    }
    const download = await supabase.storage.from(RESUME_BUCKET).download(storagePath);
    if (download.error || !download.data) {
      return res.status(400).json({ error: download.error?.message || "Uploaded resume could not be read." });
    }
    fileBytes = Buffer.from(await download.data.arrayBuffer());
    base64 = fileBytes.toString("base64");
  } else {
    fileBytes = Buffer.from(base64, "base64");
  }

  if (!fileBytes.length || fileBytes.length > 12 * 1024 * 1024) {
    return res.status(413).json({ error: "Resume must be smaller than 12 MB." });
  }

  try {
    const extractedResumeText = await extractResumeText(fileBytes, mimeType);
    const analysis = await analyzeResumeWithGemini(base64, mimeType, extractedResumeText);
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      await ensurePublicAssetBucket();
    }

    const resolvedStoragePath = storagePath || `resumes/${sanitizeAttachmentName(requester.userId)}/${Date.now()}-${fileName}`;
    if (!storagePath) {
      const uploadResult = await supabase.storage
        .from(RESUME_BUCKET)
        .upload(resolvedStoragePath, fileBytes, { contentType: mimeType, upsert: false });
      if (uploadResult.error) {
        throw uploadResult.error;
      }
    }

    const resumeUrl = supabase.storage.from(RESUME_BUCKET).getPublicUrl(resolvedStoragePath).data.publicUrl;
    const uploadedAt = new Date().toISOString();
    const storedNotes = JSON.stringify({
      summary: analysis.summary,
      resumeUrl,
      fileName,
      uploadedAt,
      metrics: {
        keywords: analysis.keywords,
        formatting: analysis.formatting,
        experience: analysis.experience,
        impactVerbs: analysis.impactVerbs,
        aiMatchScore: analysis.aiMatchScore,
        atsScore: analysis.atsScore,
        roleSpecificScore: analysis.roleSpecificScore,
        missingKeywords: analysis.missingKeywords,
        skillGapAnalysis: analysis.skillGapAnalysis,
        formattingIssues: analysis.formattingIssues,
        grammarSuggestions: analysis.grammarSuggestions,
        achievementRewriting: analysis.achievementRewriting,
        resumeVersionComparison: analysis.resumeVersionComparison,
        jobDescriptionCompatibility: analysis.jobDescriptionCompatibility,
        recruiterReadabilityScore: analysis.recruiterReadabilityScore,
        australianResumeComplianceCheck: analysis.australianResumeComplianceCheck,
      },
    });

    const resumeResult = await supabase.from("resume_scores").upsert({
      user_id: requester.userId,
      score: analysis.atsScore,
      suggestions: analysis.suggestions,
      notes: storedNotes,
      updated_at: uploadedAt,
    }, { onConflict: "user_id" });
    if (resumeResult.error) {
      throw resumeResult.error;
    }

    const clientScoreResult = await supabase.from("client_scores").insert({
      client_id: requester.userId,
      application_id: null,
      ats_score: analysis.atsScore,
      ai_match_score: analysis.aiMatchScore,
      score_reason: analysis.summary,
      recommendations: analysis.suggestions,
      calculated_at: uploadedAt,
      updated_by: "gemini-resume-upload",
    });
    if (clientScoreResult.error) {
      throw clientScoreResult.error;
    }

    if (analysis.coverLetter) {
      const coverLetterResult = await supabase.from("cover_letters").upsert({
        user_id: requester.userId,
        content: analysis.coverLetter,
        updated_at: uploadedAt,
      }, { onConflict: "user_id" });
      if (coverLetterResult.error) {
        console.error("[Cover Letter Save Failed]", coverLetterResult.error);
      }
    }

    return res.json({ ...analysis, resumeUrl, fileName, uploadedAt });
  } catch (err: any) {
    console.error("[Resume Intelligence] upload/analyze failed:", err);
    return res.status(502).json({ error: err?.message || "Resume could not be analyzed." });
  }
});

router.post("/mobile/resumes/upload-url", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const requester = req.user;
  if (!requester?.userId) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  const fileName = sanitizeAttachmentName(String(req.body?.fileName || "resume.pdf"));
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (!["pdf", "doc", "docx"].includes(extension || "")) {
    return res.status(400).json({ error: "Please upload a PDF, DOC, or DOCX resume." });
  }

  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      await ensurePublicAssetBucket();
    }
    const storagePath = `resumes/${sanitizeAttachmentName(requester.userId)}/${Date.now()}-${fileName}`;
    const signedUpload = await supabase.storage.from(RESUME_BUCKET).createSignedUploadUrl(storagePath);
    if (signedUpload.error || !signedUpload.data?.signedUrl) {
      throw signedUpload.error || new Error("Could not prepare resume upload.");
    }
    return res.json({ storagePath, signedUrl: signedUpload.data.signedUrl });
  } catch (err: any) {
    console.error("[Resume Intelligence] signed upload failed:", err);
    return res.status(502).json({ error: err?.message || "Could not prepare resume upload." });
  }
});

router.get("/mobile/snapshot", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const requestStartedAt = Date.now();
  const requester = req.user;
  const requestedUserId = typeof req.query.userId === "string" ? req.query.userId : undefined;
  const targetUserId =
    requester?.role === "admin" && requestedUserId ? requestedUserId : requester?.userId;

  if (!targetUserId) {
    return res.status(400).json({ error: "Missing target user id" });
  }

  try {
    const [supabaseReachable, databaseReachable] = await Promise.all([
      canReachSupabaseUpstream(),
      hasUsableDatabaseUrl() ? canReachDatabaseUpstream() : Promise.resolve(false),
    ]);
    const canUsePostgresFallback = hasUsableDatabaseUrl() && databaseReachable;

    if (!supabaseReachable) {
      const responseBody = await buildLocalSnapshotResponse(targetUserId, requester?.email || "");
      const responseDuration = Date.now() - requestStartedAt;
      res.setHeader("x-9jobs-snapshot-ms", String(responseDuration));
      res.setHeader("x-9jobs-snapshot-source", "local_seed_fallback");
      res.setHeader("x-9jobs-snapshot-bytes", String(Buffer.byteLength(JSON.stringify(responseBody), "utf8")));
      return res.json(responseBody);
    }

    const messagesPromise = (async () => {
      if (!supabaseReachable) {
        return { data: [], error: null };
      }

      try {
        const data = await getMessagesHistory(targetUserId);
        return { data, error: null };
      } catch (messageError) {
        console.warn("[Tracker Route] mobile snapshot merged message history failed:", messageError);

        const newerQuery = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", targetUserId)
          .order("created_at", { ascending: true });

        if (!newerQuery.error) {
          return newerQuery;
        }

        return await supabase
          .from("messages")
          .select("*")
          .or(`sender_id.eq.${targetUserId},recipient_id.eq.${targetUserId}`)
          .order("created_at", { ascending: true });
      }
    })();

    const recruiterContactsPromise = (async () => {
      if (!supabaseReachable) {
        return { data: await getLocalRecruiterContacts(targetUserId), error: null };
      }

      const result = await supabase
        .from("recruiter_contacts")
        .select("*")
        .eq("client_id", targetUserId)
        .order("contact_date", { ascending: false });

      if (!result.error) {
        return result;
      }

      if (!isMissingRelationError(result.error)) {
        return result;
      }

      if (canUsePostgresFallback) {
        return { data: await getRecruiterContactsWithPostgres(targetUserId), error: null };
      }

      return { data: await getLocalRecruiterContacts(targetUserId), error: null };
    })();

    const successStoriesPromise = getCachedSnapshotResource("snapshot:success-stories", 60_000, async () => {
      if (canUsePostgresFallback) {
        return { data: await getSuccessStoriesWithPostgres(), error: null };
      }

      if (!supabaseReachable) {
        return { data: await getLocalSuccessStories(), error: null };
      }

      const result = await supabase
        .from("success_stories")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (!result.error) {
        return result;
      }

      if (isMissingRelationError(result.error)) {
        return { data: await getLocalSuccessStories(), error: null };
      }

      return result;
    }) as Promise<{ data: any[]; error: any }>;

    const jobsPromise = getCachedSnapshotResource("snapshot:jobs", 20_000, async () =>
      supabase.from("jobs").select("*").order("created_at", { ascending: false }),
    ) as Promise<{ data: any[] | null; error: any }>;

    const categoriesPromise = getCachedSnapshotResource("snapshot:job-categories", 120_000, async () =>
      supabase.from("job_categories").select("*"),
    ) as Promise<{ data: any[] | null; error: any }>;

    const servicesPromise = getCachedSnapshotResource("snapshot:services", 120_000, async () =>
      supabase.from("services").select("*").order("created_at", { ascending: true }),
    ) as Promise<{ data: any[] | null; error: any }>;

    const pricingPlansPromise = getCachedSnapshotResource("snapshot:pricing-plans", 120_000, async () =>
      supabase.from("pricing_plans").select("*").order("created_at", { ascending: true }),
    ) as Promise<{ data: any[] | null; error: any }>;

    const systemSettingsPromise = getCachedSnapshotResource("snapshot:system-settings", 30_000, async () =>
      supabase.from("system_settings").select("*").eq("id", 1).maybeSingle(),
    ) as Promise<{ data: any | null; error: any }>;

    const [
      profileResult,
      jobsResult,
      applicationsResult,
      savedJobsResult,
      categoriesResult,
      messagesResult,
      servicesResult,
      plansResult,
      successStoriesResult,
      subscriptionResult,
      resumeScoreResult,
      systemSettingsResult,
      interviewsResult,
      followUpsResult,
      recruiterContactsResult,
      coldEmailsResult,
      clientScoresResult,
      notificationsResult,
      activityLogsResult,
      coverLetterResult,
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", targetUserId).maybeSingle(),
      jobsPromise,
      supabase.from("applications").select("*").eq("user_id", targetUserId).order("created_at", { ascending: false }),
      supabase.from("saved_jobs").select("*").eq("user_id", targetUserId),
      categoriesPromise,
      messagesPromise,
      servicesPromise,
      pricingPlansPromise,
      successStoriesPromise,
      supabase.from("user_subscriptions").select("*").eq("user_id", targetUserId).maybeSingle(),
      supabase.from("resume_scores").select("*").eq("user_id", targetUserId).maybeSingle(),
      systemSettingsPromise,
      runOptionalSnapshotListQuery("interviews", async () =>
        supabase.from("interviews").select("*").eq("client_id", targetUserId).order("interview_date", { ascending: false }),
      ),
      runOptionalSnapshotListQuery("follow_ups", async () =>
        supabase.from("follow_ups").select("*").eq("client_id", targetUserId).order("due_date", { ascending: true }),
      ),
      recruiterContactsPromise,
      runOptionalSnapshotListQuery("cold_emails", async () =>
        supabase.from("cold_emails").select("*").eq("client_id", targetUserId).order("sent_at", { ascending: false }),
      ),
      runOptionalSnapshotListQuery("client_scores", async () =>
        supabase.from("client_scores").select("*").eq("client_id", targetUserId).order("calculated_at", { ascending: false }),
      ),
      runOptionalSnapshotListQuery("notifications", async () =>
        supabase.from("notifications").select("*").eq("user_id", targetUserId).order("sent_at", { ascending: false }),
      ),
      runOptionalSnapshotListQuery("activity_logs", async () =>
        supabase.from("activity_logs").select("*").eq("client_id", targetUserId).order("created_at", { ascending: false }),
      ),
      runOptionalSnapshotSingleQuery("cover_letters", async () =>
        supabase.from("cover_letters").select("*").eq("user_id", targetUserId).maybeSingle(),
      ),
    ]);

    const localProfile = await getLocalProfile(targetUserId);
    const resolvedProfile = localProfile
      ? { ...(profileResult.data || {}), ...localProfile }
      : profileResult.data;

    const results = [
      profileResult,
      jobsResult,
      applicationsResult,
      savedJobsResult,
      categoriesResult,
      messagesResult,
      servicesResult,
      plansResult,
      successStoriesResult,
      subscriptionResult,
      resumeScoreResult,
      systemSettingsResult,
      interviewsResult,
      followUpsResult,
      recruiterContactsResult,
      coldEmailsResult,
      clientScoresResult,
      notificationsResult,
      activityLogsResult,
    ];

    for (const result of results) {
      if (result.error) {
        throw result.error;
      }
    }

    const canonicalApplications = dedupeApplicationsByRole((applicationsResult.data ?? []) as any[]);
    const canonicalJobsByRole = new Map<string, any>();

    for (const job of (jobsResult.data ?? []) as any[]) {
      const normalizedJob = {
        ...job,
        title: String(job.title || "").trim(),
        company: String(job.company || "").trim(),
        location: String(job.location || "").trim(),
        salary: String(job.salary || "").trim(),
        job_type: String(job.job_type || "").trim(),
        description: String(job.description || "").trim(),
      };
      const normalizedJobId = normalizeRolePart(job.id);
      const roleKey = normalizedJobId ? `job:${normalizedJobId}` : buildJobRoleKey(normalizedJob) || `job:${String(job.id || "")}`;
      if (!canonicalJobsByRole.has(roleKey)) {
        canonicalJobsByRole.set(roleKey, normalizedJob);
      }
    }

    for (const application of canonicalApplications) {
      const normalizedJobId = normalizeRolePart(application.job_id);
      const roleKey =
        normalizedJobId
          ? `job:${normalizedJobId}`
          : buildJobRoleKey({
              title: application.job_title,
              company: application.company_name,
              location: application.job_location,
              job_type: application.employment_type || application.work_type,
            }) || `application:${String(application.id || "")}`;
      const existing = canonicalJobsByRole.get(roleKey);
      if (existing) {
        canonicalJobsByRole.set(roleKey, {
          ...existing,
          title: existing.title || String(application.job_title || "").trim(),
          company: existing.company || String(application.company_name || "").trim(),
          location: existing.location || String(application.job_location || "").trim(),
          salary: existing.salary || String(application.salary_range || "").trim(),
          job_type: existing.job_type || String(application.employment_type || application.work_type || "").trim(),
          description: existing.description || String(application.job_description || "").trim(),
        });
        continue;
      }

      canonicalJobsByRole.set(roleKey, {
        id: String(application.job_id || application.id || roleKey),
        title: String(application.job_title || "Untitled Role").trim(),
        company: String(application.company_name || "9Jobs").trim(),
        location: String(application.job_location || "Australia").trim(),
        salary: String(application.salary_range || "Not disclosed").trim(),
        job_type: String(application.employment_type || application.work_type || "Full-time").trim(),
        job_link: String(application.source_url || "").trim(),
        posted_at: application.application_date || application.applied_at || application.created_at || "Just now",
        match_score: 80,
        tags: [],
        description:
          String(application.job_description || "").trim() ||
          `${String(application.job_title || "This role").trim()} at ${String(application.company_name || "the company").trim()}.`,
      });
    }

    const responseBody = {
      userId: targetUserId,
      profile: resolvedProfile,
      jobs: Array.from(canonicalJobsByRole.values()),
      applications: canonicalApplications,
      savedJobs: savedJobsResult.data ?? [],
      categories: categoriesResult.data ?? [],
      messages: messagesResult.data ?? [],
      services: servicesResult.data ?? [],
      pricingPlans: plansResult.data ?? [],
      successStories: successStoriesResult.data ?? [],
      subscription: subscriptionResult.data,
      resumeScore: resumeScoreResult.data,
      systemSettings: systemSettingsResult.data,
      interviews: interviewsResult.data ?? [],
      followUps: followUpsResult.data ?? [],
      recruiterContacts: recruiterContactsResult.data ?? [],
      coldEmails: coldEmailsResult.data ?? [],
      clientScores: clientScoresResult.data ?? [],
      notifications: notificationsResult.data ?? [],
      coverLetter: coverLetterResult.data,
      activityLogs: activityLogsResult.data ?? [],
    };

    const responseDuration = Date.now() - requestStartedAt;
    res.setHeader("x-9jobs-snapshot-ms", String(responseDuration));
    res.setHeader("x-9jobs-snapshot-bytes", String(Buffer.byteLength(JSON.stringify(responseBody), "utf8")));
    return res.json(responseBody);
  } catch (err: any) {
    console.error("[Tracker Route] GET /mobile/snapshot failed:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch mobile snapshot" });
  }
});

export default router;
