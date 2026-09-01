import AsyncStorage from "@react-native-async-storage/async-storage";
import { getBackendAuthToken } from "@/lib/data/backend-auth-token";
import { normalizeBackendError } from "@/lib/network/backend-errors";
import { storageKeys } from "@/lib/utils/storage";
import type { SessionUser } from "@/types/auth";
import { startTrackedRequest } from "@/lib/perf/livePerf";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://10.0.2.2:3000";
const QUESTIONNAIRE_CACHE_PREFIX = "candidate_questionnaire_cache";

export type QuestionnaireDocument = {
  name: string;
  mimeType?: string | null;
  uri: string;
  size?: number | null;
};

export type CandidateQuestionnaireInput = {
  fullName: string;
  contactNumber: string;
  workingRights: string;
  fullAddress: string;
  dateOfBirth: string;
  gender: string;
  expectedSalary: string;
  preferredJobLocations: string[];
  workTypes: string[];
  noticePeriod: string;
  preferredRoles: string[];
  resumePath: string;
  resumeName: string;
  visaType: string;
  visaPath: string;
  visaName: string;
};

const DOCUMENT_MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

const QUESTIONNAIRE_STATUS_TIMEOUT_MS = 2500;
let questionnairePromiseByUserId = new Map<string, Promise<any>>();

async function fetchWithTimeout(input: string, init: RequestInit | undefined, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export function normalizeDocumentMimeType(fileName: string, reportedMimeType?: string | null) {
  const extension = fileName.split(".").pop()?.toLowerCase() || "";
  return DOCUMENT_MIME_BY_EXTENSION[extension]
    || (reportedMimeType && reportedMimeType !== "application/octet-stream" ? reportedMimeType : "application/octet-stream");
}

async function getBackendToken(user: SessionUser) {
  return await getBackendAuthToken(user, {
    backendUrl: BACKEND_URL,
    label: "questionnaire.auth.token",
  });
}

export async function fetchCandidateQuestionnaireStatus(user: SessionUser) {
  const questionnaire = await fetchCandidateQuestionnaire(user);
  return Boolean(questionnaire?.completed_at);
}

export async function fetchCandidateQuestionnaire(user: SessionUser) {
  const existingPromise = questionnairePromiseByUserId.get(user.id);
  if (existingPromise) {
    return await existingPromise;
  }

  const requestPromise = (async () => {
    const token = await getBackendToken(user);
    const tracker = startTrackedRequest("questionnaire.fetch", {
      user_id: user.id,
      url: `${BACKEND_URL}/api/mobile/questionnaire`,
    });
    const response = await fetchWithTimeout(
      `${BACKEND_URL}/api/mobile/questionnaire`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
      QUESTIONNAIRE_STATUS_TIMEOUT_MS,
    );
    const payload = await response.json().catch(() => null);
    tracker.finish({
      status: response.status,
      user_id: user.id,
      payload_bytes: Number(response.headers.get("content-length") || 0),
    });
    if (!response.ok) throw new Error(payload?.error || `Questionnaire status failed with HTTP ${response.status}`);
    const questionnaire = payload?.questionnaire || null;
    await AsyncStorage.setItem(`${QUESTIONNAIRE_CACHE_PREFIX}:${user.id}`, JSON.stringify(questionnaire));
    return questionnaire;
  })().finally(() => {
    questionnairePromiseByUserId.delete(user.id);
  });

  questionnairePromiseByUserId.set(user.id, requestPromise);
  return await requestPromise;
}

export async function fetchCandidateQuestionnaireSafe(user: SessionUser) {
  try {
    return await fetchCandidateQuestionnaire(user);
  } catch (error) {
    console.warn("[Questionnaire] fetchCandidateQuestionnaireSafe failed, using cached questionnaire:", error);
    return await getCachedCandidateQuestionnaire(user.id);
  }
}

export async function getCachedCandidateQuestionnaire(userId: string) {
  const cached = await AsyncStorage.getItem(`${QUESTIONNAIRE_CACHE_PREFIX}:${userId}`);
  return cached ? JSON.parse(cached) : null;
}

export async function uploadQuestionnaireDocument(
  user: SessionUser,
  documentType: "resume" | "visa",
  file: QuestionnaireDocument,
) {
  if (file.size && file.size > 12 * 1024 * 1024) {
    throw new Error("Document must be smaller than 12 MB.");
  }

  const token = await getBackendToken(user);
  const mimeType = normalizeDocumentMimeType(file.name, file.mimeType);

  try {
    const prepareResponse = await fetch(`${BACKEND_URL}/api/mobile/questionnaire/upload-url`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ documentType, fileName: file.name, mimeType, fileSize: file.size || 0 }),
    });
    const prepared = await prepareResponse.json().catch(() => null);
    if (!prepareResponse.ok || !prepared?.storagePath) {
      throw new Error(prepared?.error || "Could not prepare document upload.");
    }

    const source = await fetch(file.uri);
    if (!source.ok) throw new Error("Could not read the selected document.");
    if (prepared?.uploadMode === "local-inline" && prepared?.uploadUrl) {
      const sourceBlob = await source.blob();
      const normalizedBlob = sourceBlob.type === mimeType ? sourceBlob : new Blob([sourceBlob], { type: mimeType });
      const uploadResponse = await fetch(String(prepared.uploadUrl), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": mimeType,
          "x-9jobs-storage-path": String(prepared.storagePath),
        },
        body: normalizedBlob,
      });
      const uploadPayload = await uploadResponse.json().catch(() => null);
      if (!uploadResponse.ok) {
        throw new Error(uploadPayload?.message || uploadPayload?.error || `Document upload failed with HTTP ${uploadResponse.status}.`);
      }
    } else {
      const sourceBlob = await source.blob();
      const normalizedBlob = sourceBlob.type === mimeType ? sourceBlob : new Blob([sourceBlob], { type: mimeType });
      const uploadBody = new FormData();
      uploadBody.append("cacheControl", "3600");
      uploadBody.append("", normalizedBlob);
      const upload = await fetch(String(prepared.signedUrl), {
        method: "PUT",
        headers: { "x-upsert": "false" },
        body: uploadBody,
      });
      if (!upload.ok) {
        const uploadError = await upload.json().catch(() => null);
        throw new Error(uploadError?.message || uploadError?.error || `Document upload failed with HTTP ${upload.status}.`);
      }
    }
    return { path: String(prepared.storagePath), name: file.name };
  } catch (error) {
    throw normalizeBackendError(error, BACKEND_URL, "Could not upload the selected document.");
  }
}

export async function submitCandidateQuestionnaire(user: SessionUser, input: CandidateQuestionnaireInput) {
  const token = await getBackendToken(user);
  try {
    const response = await fetch(`${BACKEND_URL}/api/mobile/questionnaire`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || `Questionnaire submission failed with HTTP ${response.status}`);
    return payload;
  } catch (error) {
    throw normalizeBackendError(error, BACKEND_URL, "Could not save your questionnaire.");
  }
}
