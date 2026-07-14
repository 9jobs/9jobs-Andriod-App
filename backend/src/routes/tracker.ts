import { Router, Response } from "express";
import { Pool } from "pg";
import { AuthenticatedRequest, authMiddleware } from "../middleware/auth";
import { supabase } from "../lib/supabase";

const router = Router();

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
    posted_at: String(job.posted_at || "Just now"),
    match_score: Number(job.match_score || 80),
    tags: Array.isArray(job.tags) ? job.tags : [],
    description: String(job.description || ""),
  };
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

function createPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
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
    await client.query(
      `
      insert into jobs (
        id, title, company, location, salary, job_type, posted_at, match_score, tags, description
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      )
      on conflict (id) do update set
        title = excluded.title,
        company = excluded.company,
        location = excluded.location,
        salary = excluded.salary,
        job_type = excluded.job_type,
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

router.post("/admin/tracker/applications", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdminRole(req, res)) {
    return;
  }

  const { application, job } = req.body || {};
  if (!application?.user_id || !application?.client_id || !application?.job_id || !application?.status) {
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
        ? await updateApplicationWithPostgres(Number(application.id), application)
        : await createApplicationWithPostgres(application);
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
      if (jobError) throw jobError;
    }

    const query = application.id
      ? supabase.from("applications").update(application).eq("id", Number(application.id)).select().single()
      : supabase.from("applications").insert([application]).select().single();
    const { data, error } = await query;
    if (error) throw error;

    return res.json({ success: true, application: data });
  } catch (err: any) {
    console.error("[Tracker Route] POST /admin/tracker/applications failed:", err);
    return res.status(500).json({ error: err.message || "Failed to create tracker application" });
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
      supabase.from("profiles").select("*").eq("id", targetUserId).maybeSingle(),
      supabase.from("jobs").select("*").order("created_at", { ascending: false }),
      supabase.from("applications").select("*").eq("user_id", targetUserId).order("created_at", { ascending: false }),
      supabase.from("saved_jobs").select("*").eq("user_id", targetUserId),
      supabase.from("job_categories").select("*"),
      messagesPromise,
      supabase.from("services").select("*").order("created_at", { ascending: true }),
      supabase.from("pricing_plans").select("*").order("created_at", { ascending: true }),
      supabase.from("user_subscriptions").select("*").eq("user_id", targetUserId).maybeSingle(),
      supabase.from("resume_scores").select("*").eq("user_id", targetUserId).maybeSingle(),
      supabase.from("system_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("interviews").select("*").eq("client_id", targetUserId).order("interview_date", { ascending: false }),
      supabase.from("follow_ups").select("*").eq("client_id", targetUserId).order("due_date", { ascending: true }),
      supabase.from("recruiter_contacts").select("*").eq("client_id", targetUserId).order("contact_date", { ascending: false }),
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
