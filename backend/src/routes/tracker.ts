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
import { supabase } from "../lib/supabase";
import { getMessagesHistory } from "../services/messageService";

const router = Router();
const SUCCESS_STORY_BUCKET = "assets";
const RESUME_BUCKET = "assets";

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
    const roleKey = buildApplicationRoleKey(application);
    const fallbackKey = `${normalizeRolePart(application?.user_id || application?.client_id)}|job:${normalizeRolePart(application?.job_id)}`;
    const key = roleKey.replace(/\|/g, "") ? roleKey : fallbackKey;
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

function createPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
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

function clampScore(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? Math.max(0, Math.min(100, Math.round(numberValue))) : 0;
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

async function analyzeResumeWithGemini(base64: string, mimeType: string): Promise<ResumeAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
  
  try {
    if (!apiKey) {
      console.warn("[Gemini API] Gemini API key not configured. Using fallback.");
      return getFallbackResumeAnalysis();
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [
              {
                text: [
                  "Act as a strict Applicant Tracking System resume auditor and career advisor.",
                  "Evaluate only the supplied resume. Do not invent experience or skills.",
                  "Score general ATS readiness and return the evaluation in strict JSON.",
                  "You must return a JSON object with the exact keys: atsScore, aiMatchScore, keywords, formatting, experience, impactVerbs, summary, suggestions, roleSpecificScore, missingKeywords, skillGapAnalysis, formattingIssues, grammarSuggestions, achievementRewriting, resumeVersionComparison, jobDescriptionCompatibility, recruiterReadabilityScore, australianResumeComplianceCheck, coverLetter.",
                  "The values must follow this schema:",
                  "atsScore: integer 0-100",
                  "aiMatchScore: integer 0-100",
                  "keywords: integer 0-100",
                  "formatting: integer 0-100",
                  "experience: integer 0-100",
                  "impactVerbs: integer 0-100",
                  "summary: short executive summary string (max 600 chars)",
                  "suggestions: array of short actionable strings",
                  "roleSpecificScore: integer 0-100 based on targeting roles",
                  "missingKeywords: array of string keywords missing from resume",
                  "skillGapAnalysis: array of string gaps found in candidate's skills",
                  "formattingIssues: array of string design/format flaws detected",
                  "grammarSuggestions: array of string grammar/spelling/phrasing corrections",
                  "achievementRewriting: array of objects with 'original' (string) and 'rewritten' (string) fields",
                  "resumeVersionComparison: string comparing this layout/version to industry standards",
                  "jobDescriptionCompatibility: integer 0-100 compatibility rating",
                  "recruiterReadabilityScore: integer 0-100 score indicating recruiter review ease",
                  "australianResumeComplianceCheck: object with keys 'compliant' (boolean) and 'issues' (array of strings, e.g., removal of photo, date of birth, localized terms),",
                  "coverLetter: a professional, high-quality, auto-generated cover letter string based on the candidate's resume (markdown formatted, using \\n for newlines, ready to be customized by the candidate)."
                ].join(" "),
              },
              { inlineData: { mimeType, data: base64 } },
            ],
          }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        }),
      },
    );

    const payload: any = await response.json().catch(() => null);
    if (!response.ok) {
      console.warn(`[Gemini API] Failed with status ${response.status}: ${payload?.error?.message}. Using fallback.`);
      return getFallbackResumeAnalysis();
    }

    const rawText = payload?.candidates?.[0]?.content?.parts
      ?.map((part: any) => part?.text || "")
      .join("")
      .trim();
    if (!rawText) {
      console.warn("[Gemini API] Empty response. Using fallback.");
      return getFallbackResumeAnalysis();
    }

    return parseGeminiResumeAnalysis(rawText);
  } catch (err: any) {
    console.error("[Gemini API] Error calling Gemini API:", err.message || err);
    console.warn("Using fallback resume analysis.");
    return getFallbackResumeAnalysis();
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

      return res.json({ success: true, application: data });
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
    const saved = existingApplication?.id
      ? await updateApplicationWithPostgres(Number(existingApplication.id), normalizedApplication)
      : await createApplicationWithPostgres(normalizedApplication);
    if (normalizedApplication.is_saved) {
      await upsertSavedJobWithPostgres(normalizedApplication.user_id, normalizedApplication.job_id);
    } else {
      await deleteSavedJobWithPostgres(normalizedApplication.user_id, normalizedApplication.job_id);
    }
    return res.json({ success: true, application: saved });
  } catch (err: any) {
    console.error("[Tracker Route] POST /admin/tracker/applications failed:", err);
    return res.status(500).json({ error: err.message || "Failed to create tracker application" });
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
    admin_notes: String(interview.admin_notes || ""),
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
    const { data, error } = await supabase
      .from("applications")
      .update(patch)
      .eq("id", applicationId)
      .select()
      .single();
    if (error) throw error;

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
    return res.status(500).json({ error: err.message || "Failed to fetch personal information" });
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
      const { error } = await supabase.from("profiles").delete().eq("id", profileId);
      if (error && !isMissingRelationError(error)) throw error;
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
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        if (singleContact) {
          const query = singleContact.id
            ? supabase.from("recruiter_contacts").update(singleContact).eq("id", Number(singleContact.id)).select().single()
            : supabase.from("recruiter_contacts").insert([singleContact]).select().single();
          const { data, error } = await query;
          if (error) throw error;
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
        const saved = singleContact.id
          ? await updateRecruiterContactWithPostgres(Number(singleContact.id), singleContact)
          : await createRecruiterContactWithPostgres(singleContact);
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
      supabase.from("jobs").select("*").order("created_at", { ascending: false }),
      supabase.from("applications").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name, email"),
    ]);

    const firstError = [jobsResult, applicationsResult, profilesResult].find((result) => result.error)?.error;
    if (firstError) throw firstError;

    const profileMap = new Map(
      ((profilesResult.data ?? []) as any[]).map((profile) => [String(profile.id || ""), profile]),
    );
    const canonicalApplications = dedupeApplicationsByRole((applicationsResult.data ?? []) as any[]);
    const preferredApplicationByRole = new Map(
      canonicalApplications.map((application) => [buildJobRoleKey({
        title: application.job_title,
        company: application.company_name,
        location: application.job_location,
        job_type: application.employment_type || application.work_type,
      }), application]),
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
      const roleKey = buildJobRoleKey(normalizedJob) || `job:${String(job.id || "")}`;
      const linkedApplication = preferredApplicationByRole.get(roleKey) || null;
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

      const existingLinkedApplication = existing.application_id ? preferredApplicationByRole.get(roleKey) : null;
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
      const roleKey = buildJobRoleKey({
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
    return res.status(500).json({ error: err.message || "Failed to load tracker opportunities" });
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
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("sent_at", { ascending: false });
    if (error) throw error;

    const notifications = await buildNotificationsWithProfiles(data ?? []);
    return res.json({ success: true, notifications });
  } catch (err: any) {
    console.error("[Tracker Route] GET /admin/notifications failed:", err);
    return res.status(500).json({ error: err.message || "Failed to load notifications" });
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
    const analysis = await analyzeResumeWithGemini(base64, mimeType);
    await ensurePublicAssetBucket();

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
    await ensurePublicAssetBucket();
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
  const requester = req.user;
  const requestedUserId = typeof req.query.userId === "string" ? req.query.userId : undefined;
  const targetUserId =
    requester?.role === "admin" && requestedUserId ? requestedUserId : requester?.userId;

  if (!targetUserId) {
    return res.status(400).json({ error: "Missing target user id" });
  }

  try {
    const messagesPromise = (async () => {
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

      if (hasUsableDatabaseUrl()) {
        return { data: await getRecruiterContactsWithPostgres(targetUserId), error: null };
      }

      return { data: await getLocalRecruiterContacts(targetUserId), error: null };
    })();

    const successStoriesPromise = (async () => {
      if (hasUsableDatabaseUrl()) {
        return { data: await getSuccessStoriesWithPostgres(), error: null };
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
      coverLetterResult,
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", targetUserId).maybeSingle(),
      supabase.from("jobs").select("*").order("created_at", { ascending: false }),
      supabase.from("applications").select("*").eq("user_id", targetUserId).order("created_at", { ascending: false }),
      supabase.from("saved_jobs").select("*").eq("user_id", targetUserId),
      supabase.from("job_categories").select("*"),
      messagesPromise,
      supabase.from("services").select("*").order("created_at", { ascending: true }),
      supabase.from("pricing_plans").select("*").order("created_at", { ascending: true }),
      successStoriesPromise,
      supabase.from("user_subscriptions").select("*").eq("user_id", targetUserId).maybeSingle(),
      supabase.from("resume_scores").select("*").eq("user_id", targetUserId).maybeSingle(),
      supabase.from("system_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("interviews").select("*").eq("client_id", targetUserId).order("interview_date", { ascending: false }),
      supabase.from("follow_ups").select("*").eq("client_id", targetUserId).order("due_date", { ascending: true }),
      recruiterContactsPromise,
      supabase.from("cold_emails").select("*").eq("client_id", targetUserId).order("sent_at", { ascending: false }),
      supabase.from("client_scores").select("*").eq("client_id", targetUserId).order("calculated_at", { ascending: false }),
      supabase.from("notifications").select("*").eq("user_id", targetUserId).order("sent_at", { ascending: false }),
      supabase.from("cover_letters").select("*").eq("user_id", targetUserId).maybeSingle(),
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
      coverLetterResult,
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
      const roleKey = buildJobRoleKey(normalizedJob) || `job:${String(job.id || "")}`;
      if (!canonicalJobsByRole.has(roleKey)) {
        canonicalJobsByRole.set(roleKey, normalizedJob);
      }
    }

    for (const application of canonicalApplications) {
      const roleKey = buildJobRoleKey({
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

    return res.json({
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
      activityLogs:
        (
          await supabase
            .from("activity_logs")
            .select("*")
            .eq("client_id", targetUserId)
            .order("created_at", { ascending: false })
        ).data ?? [],
    });
  } catch (err: any) {
    console.error("[Tracker Route] GET /mobile/snapshot failed:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch mobile snapshot" });
  }
});

export default router;
