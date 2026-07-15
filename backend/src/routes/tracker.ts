import express, { Router, Response } from "express";
import { Pool } from "pg";
import { AuthenticatedRequest, authMiddleware } from "../middleware/auth";
import {
  deleteLocalRecruiterContact,
  getLocalRecruiterContacts,
  getLocalSuccessStories,
  deleteLocalSuccessStory,
  upsertLocalRecruiterContact,
  upsertLocalSuccessStory,
} from "../lib/localDb";
import { supabase } from "../lib/supabase";

const router = Router();
const SUCCESS_STORY_BUCKET = "assets";

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
    created_by_admin_id: String(application.created_by_admin_id || "admin"),
  };
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
  const profileMap = new Map(profilesData.map((profile) => [profile.id, profile]));
  const jobMap = new Map(jobsData.map((job) => [job.id, job]));
  const entryMap = new Map<string, any>();

  for (const row of savedJobsData) {
    const compositeKey = `${row.user_id}:${row.job_id}`;
    const job = jobMap.get(row.job_id) || null;
    const profile = profileMap.get(row.user_id) || null;
    const linkedApplication =
      applicationsData.find((application) => (application.user_id || application.client_id) === row.user_id && application.job_id === row.job_id) || null;

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
    });
  }

  for (const application of applicationsData) {
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
        created_by_admin_id
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
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
        created_by_admin_id = $18,
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

    if (hasUsableDatabaseUrl()) {
      if (normalizedProfile?.id) {
        await ensureProfileWithPostgres(application);
      }
      if (normalizedJob?.id) {
        await upsertJobWithPostgres(normalizedJob);
      }
      const saved = application.id
        ? await updateApplicationWithPostgres(Number(application.id), normalizedApplication)
        : await createApplicationWithPostgres(normalizedApplication);
      if (normalizedApplication.is_saved) {
        await upsertSavedJobWithPostgres(normalizedApplication.user_id, normalizedApplication.job_id);
      } else {
        await deleteSavedJobWithPostgres(normalizedApplication.user_id, normalizedApplication.job_id);
      }
      return res.json({ success: true, application: saved });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({
        error:
          "Backend write credentials are missing. Set SUPABASE_SERVICE_ROLE_KEY or a real DATABASE_URL in backend/.env to create tracker records without RLS errors.",
      });
    }

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

    const query = application.id
      ? supabase.from("applications").update(normalizedApplication).eq("id", Number(application.id)).select().single()
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
  } catch (err: any) {
    console.error("[Tracker Route] POST /admin/tracker/applications failed:", err);
    return res.status(500).json({ error: err.message || "Failed to create tracker application" });
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

router.get("/admin/tracker/contacts", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdminRole(req, res)) {
    return;
  }

  const clientId = typeof req.query.clientId === "string" ? req.query.clientId : undefined;

  try {
    if (hasUsableDatabaseUrl()) {
      const contacts = await getRecruiterContactsWithPostgres(clientId);
      return res.json({ success: true, contacts });
    }

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
    if (hasUsableDatabaseUrl()) {
      const deleted = await deleteRecruiterContactWithPostgres(contactId);
      return res.json({ success: deleted });
    }

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

    const deleted = await deleteLocalRecruiterContact(contactId);
    return res.json({ success: deleted, mode: "local_preview" });
  } catch (err: any) {
    console.error("[Tracker Route] DELETE /admin/tracker/contacts/:id failed:", err);
    return res.status(500).json({ error: err.message || "Failed to delete hiring manager" });
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
    })();

    const recruiterContactsPromise = (async () => {
      if (hasUsableDatabaseUrl()) {
        return { data: await getRecruiterContactsWithPostgres(targetUserId), error: null };
      }

      const result = await supabase
        .from("recruiter_contacts")
        .select("*")
        .eq("client_id", targetUserId)
        .order("contact_date", { ascending: false });

      if (!result.error) {
        return result;
      }

      if (isMissingRelationError(result.error)) {
        return { data: await getLocalRecruiterContacts(targetUserId), error: null };
      }

      return result;
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
      successStoriesResult,
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

    return res.json({
      userId: targetUserId,
      profile: profileResult.data,
      jobs: jobsResult.data ?? [],
      applications: applicationsResult.data ?? [],
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
    });
  } catch (err: any) {
    console.error("[Tracker Route] GET /mobile/snapshot failed:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch mobile snapshot" });
  }
});

export default router;
