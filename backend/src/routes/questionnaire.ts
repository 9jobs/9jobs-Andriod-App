import fs from "fs/promises";
import path from "path";
import express, { Router, Response } from "express";
import { Pool } from "pg";
import { AuthenticatedRequest, authMiddleware } from "../middleware/auth";
import {
  getLocalCandidateQuestionnaire,
  getLocalCandidateQuestionnaires,
  upsertLocalCandidateQuestionnaire,
  upsertLocalProfile,
} from "../lib/localDb";
import { canReachSupabaseUpstream, getSupabaseReachabilityState, supabase } from "../lib/supabase";

const router = Router();
const DOCUMENT_BUCKET = "candidate-documents";
const MAX_DOCUMENT_SIZE = 12 * 1024 * 1024;
const LOCAL_UPLOADS_DIR = path.resolve(__dirname, "../../local_uploads");

let schemaReady: Promise<void> | null = null;
let schemaFailed = false;
const LOCAL_PREVIEW_QUESTIONNAIRE_USER_ID = "preview-user-9jobs";

function hasUsableDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL || "";
  return Boolean(databaseUrl) && !databaseUrl.includes("[YOUR_DB_PASSWORD]");
}

function isUpstreamResolutionFailure(error: unknown) {
  const details =
    typeof error === "object" && error && "details" in error
      ? String((error as { details?: string }).details || "")
      : "";
  const message =
    typeof error === "object" && error && "message" in error
      ? String((error as { message?: string }).message || "")
      : "";

  const combined = `${message}\n${details}`.toLowerCase();
  return combined.includes("enotfound") || combined.includes("getaddrinfo");
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function buildLocalPreviewQuestionnaire(userId: string) {
  const nowIso = new Date().toISOString();
  return {
    completed: true,
    questionnaire: {
      user_id: userId,
      full_name: "Test User",
      contact_number: "+91 99999 99999",
      working_rights: "Australian Citizen",
      full_address: "Melbourne, Australia",
      date_of_birth: "1998-01-01",
      gender: "Prefer not to say",
      expected_salary: "$120k - $150k",
      preferred_job_locations: ["Melbourne", "Remote"],
      work_types: ["Full-time", "Remote"],
      notice_period: "2 weeks",
      preferred_roles: ["Frontend Engineer", "Product Designer"],
      resume_path: "local-preview/resume.pdf",
      resume_name: "Test-User-Resume.pdf",
      visa_type: "",
      visa_path: "",
      visa_name: "",
      enhanced_resume_path: "",
      enhanced_resume_name: "",
      enhanced_resume_updated_at: null,
      enhanced_resume_url: "",
      completed_at: nowIso,
      created_at: nowIso,
      updated_at: nowIso,
    },
  };
}

function getBaseUrl(req: AuthenticatedRequest) {
  return `${req.protocol}://${req.get("host") || "127.0.0.1:3000"}`;
}

function buildLocalUploadPath(userId: string, documentType: "resume" | "visa", fileName: string) {
  return `${sanitizeFileName(userId)}/${documentType}/${Date.now()}-${sanitizeFileName(fileName)}`;
}

function buildLocalUploadFilePath(storagePath: string) {
  return path.join(LOCAL_UPLOADS_DIR, storagePath);
}

async function createLocalQuestionnaireBody(userId: string) {
  const localQuestionnaire = await getLocalCandidateQuestionnaire(userId);
  if (localQuestionnaire) {
    return {
      completed: Boolean(localQuestionnaire.completed_at),
      questionnaire: {
        ...localQuestionnaire,
        enhanced_resume_url: "",
      },
    };
  }

  if (userId === LOCAL_PREVIEW_QUESTIONNAIRE_USER_ID) {
    const preview = buildLocalPreviewQuestionnaire(userId);
    if (preview.questionnaire) {
      await upsertLocalCandidateQuestionnaire(preview.questionnaire);
    }
    return preview;
  }

  return { completed: false, questionnaire: null };
}

function ensureAdmin(req: AuthenticatedRequest, res: Response) {
  if (req.user?.role !== "admin" && req.user?.role !== "staff") {
    res.status(403).json({ error: "Forbidden: Admin or staff access required" });
    return false;
  }
  return true;
}

async function ensureQuestionnaireSchema() {
  if (schemaFailed) return;
  if (schemaReady) return schemaReady;

  schemaReady = (async () => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString || connectionString.includes("[YOUR_DB_PASSWORD]")) return;

    const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
      await pool.query(`
        create table if not exists candidate_questionnaires (
          user_id text primary key references profiles(id) on delete cascade,
          full_name text not null,
          contact_number text not null,
          working_rights text not null,
          full_address text not null,
          date_of_birth date not null,
          gender text not null,
          expected_salary text not null,
          preferred_job_locations text[] not null default '{}',
          work_types text[] not null default '{}',
          notice_period text not null,
          preferred_roles text[] not null default '{}',
          resume_path text not null default '',
          resume_name text not null default '',
          visa_type text not null default '',
          visa_path text not null default '',
          visa_name text not null default '',
          enhanced_resume_path text not null default '',
          enhanced_resume_name text not null default '',
          enhanced_resume_updated_at timestamptz,
          completed_at timestamptz not null default now(),
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        );
        alter table candidate_questionnaires add column if not exists enhanced_resume_path text not null default '';
        alter table candidate_questionnaires add column if not exists enhanced_resume_name text not null default '';
        alter table candidate_questionnaires add column if not exists enhanced_resume_updated_at timestamptz;
        alter table candidate_questionnaires add column if not exists visa_type text not null default '';
        create index if not exists idx_candidate_questionnaires_completed_at
          on candidate_questionnaires(completed_at desc);
      `);
    } finally {
      await pool.end();
    }
  })().catch((error) => {
    schemaReady = null;
    schemaFailed = true;
    throw error;
  });

  return schemaReady;
}

async function ensureDocumentBucket() {
  const { data } = await supabase.storage.getBucket(DOCUMENT_BUCKET);
  if (data) return;

  const { error } = await supabase.storage.createBucket(DOCUMENT_BUCKET, {
    public: false,
    fileSizeLimit: MAX_DOCUMENT_SIZE,
    allowedMimeTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png",
    ],
  });
  if (error && !/already exists/i.test(error.message || "")) throw error;
}

async function createDownloadUrl(path: string) {
  if (!path) return "";
  const { data, error } = await supabase.storage.from(DOCUMENT_BUCKET).createSignedUrl(path, 60 * 60);
  if (error) return "";
  return data?.signedUrl || "";
}

async function ensureSupabaseProfile(params: {
  userId: string;
  email: string;
  role: string;
  fullName: string;
  phoneNumber: string;
  location: string;
  headline: string;
  updatedAt: string;
}) {
  const { error } = await supabase.from("profiles").upsert(
    [
      {
        id: params.userId,
        email: params.email,
        role: params.role || "client",
        full_name: params.fullName,
        phone_number: params.phoneNumber,
        location: params.location,
        headline: params.headline,
        updated_at: params.updatedAt,
      },
    ],
    { onConflict: "id" },
  );

  if (error) {
    throw error;
  }
}

router.get("/mobile/questionnaire", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(400).json({ error: "Missing authenticated user" });
  const requestStartedAt = Date.now();

  try {
    const reachabilityStartedAt = Date.now();
    const supabaseReachable = await canReachSupabaseUpstream();
    const reachabilityMs = Date.now() - reachabilityStartedAt;
    if (!supabaseReachable) {
      const reachability = getSupabaseReachabilityState();
      const body = await createLocalQuestionnaireBody(userId);
      res.setHeader("x-9jobs-questionnaire-reachability-ms", String(reachabilityMs));
      res.setHeader("x-9jobs-questionnaire-fallback", "local_db");
      res.setHeader("x-9jobs-questionnaire-fallback-reason", reachability?.reason || "supabase_unreachable");
      res.setHeader("x-9jobs-questionnaire-total-ms", String(Date.now() - requestStartedAt));
      res.setHeader("x-9jobs-questionnaire-bytes", String(Buffer.byteLength(JSON.stringify(body), "utf8")));
      return res.status(200).json(body);
    }

    let schemaMs = 0;
    if (hasUsableDatabaseUrl() && !schemaFailed) {
      const schemaStartedAt = Date.now();
      try {
        await ensureQuestionnaireSchema();
      } catch (schemaError) {
        console.warn("[Questionnaire] schema ensure failed during GET /mobile/questionnaire; continuing with Supabase read:", schemaError);
      } finally {
        schemaMs = Date.now() - schemaStartedAt;
      }
    }

    const queryStartedAt = Date.now();
    const { data, error } = await supabase
      .from("candidate_questionnaires")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    const queryMs = Date.now() - queryStartedAt;
    if (error) throw error;

    const signedUrlStartedAt = Date.now();
    const questionnaire = data ? {
      ...data,
      enhanced_resume_url: await createDownloadUrl(data.enhanced_resume_path || ""),
    } : null;
    const signedUrlMs = Date.now() - signedUrlStartedAt;
    const body = { completed: Boolean(data?.completed_at), questionnaire };
    res.setHeader("x-9jobs-questionnaire-reachability-ms", String(reachabilityMs));
    res.setHeader("x-9jobs-questionnaire-schema-ms", String(schemaMs));
    res.setHeader("x-9jobs-questionnaire-db-ms", String(queryMs));
    res.setHeader("x-9jobs-questionnaire-signed-url-ms", String(signedUrlMs));
    res.setHeader("x-9jobs-questionnaire-total-ms", String(Date.now() - requestStartedAt));
    res.setHeader("x-9jobs-questionnaire-bytes", String(Buffer.byteLength(JSON.stringify(body), "utf8")));
    return res.json(body);
  } catch (error: any) {
    console.error("[Questionnaire] status load failed:", error);
    if (isUpstreamResolutionFailure(error)) {
      const body = await createLocalQuestionnaireBody(userId);
      res.setHeader("x-9jobs-questionnaire-fallback", "local_db");
      res.setHeader("x-9jobs-questionnaire-total-ms", String(Date.now() - requestStartedAt));
      res.setHeader("x-9jobs-questionnaire-bytes", String(Buffer.byteLength(JSON.stringify(body), "utf8")));
      return res.status(200).json(body);
    }
    return res.status(500).json({ error: error.message || "Could not load questionnaire status" });
  }
});

router.post("/mobile/questionnaire/upload-url", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  const documentType = String(req.body?.documentType || "");
  const fileName = sanitizeFileName(String(req.body?.fileName || "document"));
  const mimeType = String(req.body?.mimeType || "application/octet-stream");
  const fileSize = Number(req.body?.fileSize || 0);

  if (!userId) return res.status(400).json({ error: "Missing authenticated user" });
  if (!['resume', 'visa'].includes(documentType)) return res.status(400).json({ error: "Invalid document type" });
  if (fileSize > MAX_DOCUMENT_SIZE) return res.status(413).json({ error: "Document must be smaller than 12 MB" });

  try {
    const supabaseReachable = await canReachSupabaseUpstream();
    if (!supabaseReachable) {
      const storagePath = buildLocalUploadPath(userId, documentType as "resume" | "visa", fileName);
      return res.json({
        storagePath,
        uploadMode: "local-inline",
        uploadUrl: `${getBaseUrl(req)}/api/mobile/questionnaire/local-upload`,
        mimeType,
      });
    }

    await ensureDocumentBucket();
    const storagePath = `${sanitizeFileName(userId)}/${documentType}/${Date.now()}-${fileName}`;
    const { data, error } = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .createSignedUploadUrl(storagePath);
    if (error || !data?.signedUrl) throw error || new Error("Could not prepare document upload");
    return res.json({ storagePath, signedUrl: data.signedUrl, uploadToken: data.token, mimeType });
  } catch (error: any) {
    console.error("[Questionnaire] document upload preparation failed:", error);
    return res.status(502).json({ error: error.message || "Could not prepare document upload" });
  }
});

router.post("/mobile/questionnaire/local-upload", authMiddleware, express.raw({ type: "*/*", limit: "12mb" }), async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  const storagePath = String(req.headers["x-9jobs-storage-path"] || "").trim();
  if (!userId) return res.status(400).json({ error: "Missing authenticated user" });
  if (!storagePath || !storagePath.startsWith(`${sanitizeFileName(userId)}/`)) {
    return res.status(400).json({ error: "Invalid document path" });
  }
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    return res.status(400).json({ error: "Missing document payload" });
  }

  try {
    const destination = buildLocalUploadFilePath(storagePath);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, req.body);
    return res.json({ success: true, storagePath });
  } catch (error: any) {
    console.error("[Questionnaire] local document upload failed:", error);
    return res.status(500).json({ error: error.message || "Could not store local document" });
  }
});

router.post("/mobile/questionnaire", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  const input = req.body || {};
  if (!userId) return res.status(400).json({ error: "Missing authenticated user" });

  const row = {
    user_id: userId,
    full_name: String(input.fullName || "").trim(),
    contact_number: String(input.contactNumber || "").trim(),
    working_rights: String(input.workingRights || "").trim(),
    full_address: String(input.fullAddress || "").trim(),
    date_of_birth: String(input.dateOfBirth || "").trim(),
    gender: String(input.gender || "").trim(),
    expected_salary: String(input.expectedSalary || "").trim(),
    preferred_job_locations: Array.isArray(input.preferredJobLocations) ? input.preferredJobLocations.map(String) : [],
    work_types: Array.isArray(input.workTypes) ? input.workTypes.map(String) : [],
    notice_period: String(input.noticePeriod || "").trim(),
    preferred_roles: Array.isArray(input.preferredRoles) ? input.preferredRoles.map(String) : [],
    resume_path: String(input.resumePath || "").trim(),
    resume_name: String(input.resumeName || "").trim(),
    visa_type: String(input.visaType || "").trim(),
    visa_path: String(input.visaPath || "").trim(),
    visa_name: String(input.visaName || "").trim(),
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const requiredStrings = [
    row.full_name, row.contact_number, row.working_rights, row.full_address,
    row.date_of_birth, row.gender, row.expected_salary, row.notice_period,
  ];
  if (requiredStrings.some((value) => !value) || !row.preferred_job_locations.length || !row.work_types.length || !row.preferred_roles.length || !row.resume_path) {
    return res.status(400).json({ error: "Please complete all required questionnaire fields and upload your resume" });
  }

  try {
    const supabaseReachable = await canReachSupabaseUpstream();
    if (!supabaseReachable) {
      const questionnaire = await upsertLocalCandidateQuestionnaire({
        ...row,
        enhanced_resume_path: "",
        enhanced_resume_name: "",
        enhanced_resume_updated_at: null,
      });
      await upsertLocalProfile({
        id: userId,
        full_name: row.full_name,
        email: req.user?.email || `${userId}@9jobs.local`,
        phone_number: row.contact_number,
        location: row.full_address,
        headline: row.preferred_roles.join(", "),
        role: req.user?.role || "client",
      });
      return res.json({ success: true, questionnaire });
    }

    await ensureQuestionnaireSchema();
    await ensureSupabaseProfile({
      userId,
      email: req.user?.email || `${userId}@9jobs.local`,
      role: req.user?.role || "client",
      fullName: row.full_name,
      phoneNumber: row.contact_number,
      location: row.full_address,
      headline: row.preferred_roles.join(", "),
      updatedAt: row.updated_at,
    });

    const { data, error } = await supabase
      .from("candidate_questionnaires")
      .upsert(row, { onConflict: "user_id" })
      .select()
      .single();
    if (error) throw error;

    await supabase.from("profiles").update({
      full_name: row.full_name,
      phone_number: row.contact_number,
      location: row.full_address,
      headline: row.preferred_roles.join(", "),
      updated_at: row.updated_at,
    }).eq("id", userId);

    return res.json({ success: true, questionnaire: data });
  } catch (error: any) {
    console.error("[Questionnaire] submission failed:", error);
    return res.status(500).json({ error: error.message || "Could not save questionnaire" });
  }
});

router.get("/admin/questionnaires", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdmin(req, res)) return;
  try {
    const supabaseReachable = await canReachSupabaseUpstream();
    if (!supabaseReachable) {
      const questionnaires = await getLocalCandidateQuestionnaires();
      return res.json({ questionnaires });
    }

    await ensureQuestionnaireSchema();
    const { data, error } = await supabase
      .from("candidate_questionnaires")
      .select("*")
      .order("completed_at", { ascending: false });
    if (error) throw error;

    const questionnaires = await Promise.all((data || []).map(async (item: any) => ({
      ...item,
      resume_url: await createDownloadUrl(item.resume_path || ""),
      visa_url: await createDownloadUrl(item.visa_path || ""),
      enhanced_resume_url: await createDownloadUrl(item.enhanced_resume_path || ""),
    })));
    return res.json({ questionnaires });
  } catch (error: any) {
    console.error("[Questionnaire] admin load failed:", error);
    return res.status(500).json({ error: error.message || "Could not load questionnaires" });
  }
});

router.post("/admin/questionnaires/:userId/enhanced-resume/upload-url", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdmin(req, res)) return;
  const userId = sanitizeFileName(String(req.params.userId || ""));
  const fileName = sanitizeFileName(String(req.body?.fileName || "updated-resume.pdf"));
  const mimeType = String(req.body?.mimeType || "application/octet-stream");
  const fileSize = Number(req.body?.fileSize || 0);
  const allowedMimeTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  if (!userId) return res.status(400).json({ error: "Missing client user ID" });
  if (!allowedMimeTypes.includes(mimeType)) return res.status(400).json({ error: "Updated resume must be PDF, DOC or DOCX" });
  if (fileSize <= 0 || fileSize > MAX_DOCUMENT_SIZE) return res.status(413).json({ error: "Updated resume must be smaller than 12 MB" });

  try {
    await ensureQuestionnaireSchema();
    await ensureDocumentBucket();
    const storagePath = `${userId}/enhanced-resume/${Date.now()}-${fileName}`;
    const { data, error } = await supabase.storage.from(DOCUMENT_BUCKET).createSignedUploadUrl(storagePath);
    if (error || !data?.signedUrl) throw error || new Error("Could not prepare updated resume upload");
    return res.json({ storagePath, signedUrl: data.signedUrl, mimeType });
  } catch (error: any) {
    console.error("[Questionnaire] enhanced resume upload preparation failed:", error);
    return res.status(502).json({ error: error.message || "Could not prepare updated resume upload" });
  }
});

router.post("/admin/questionnaires/:userId/enhanced-resume", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdmin(req, res)) return;
  const userId = String(req.params.userId || "");
  const storagePath = String(req.body?.storagePath || "").trim();
  const fileName = sanitizeFileName(String(req.body?.fileName || "updated-resume.pdf"));
  if (!userId || !storagePath || !storagePath.startsWith(`${sanitizeFileName(userId)}/enhanced-resume/`)) {
    return res.status(400).json({ error: "Invalid updated resume details" });
  }

  try {
    await ensureQuestionnaireSchema();
    const updatedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("candidate_questionnaires")
      .update({ enhanced_resume_path: storagePath, enhanced_resume_name: fileName, enhanced_resume_updated_at: updatedAt, updated_at: updatedAt })
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw error;
    return res.json({ success: true, questionnaire: data });
  } catch (error: any) {
    console.error("[Questionnaire] enhanced resume save failed:", error);
    return res.status(500).json({ error: error.message || "Could not save updated resume" });
  }
});

export default router;
