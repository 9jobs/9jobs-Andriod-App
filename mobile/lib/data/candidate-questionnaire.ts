import AsyncStorage from "@react-native-async-storage/async-storage";
import { storageKeys } from "@/lib/utils/storage";
import type { SessionUser } from "@/types/auth";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://10.0.2.2:3000";

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

export function normalizeDocumentMimeType(fileName: string, reportedMimeType?: string | null) {
  const extension = fileName.split(".").pop()?.toLowerCase() || "";
  return DOCUMENT_MIME_BY_EXTENSION[extension]
    || (reportedMimeType && reportedMimeType !== "application/octet-stream" ? reportedMimeType : "application/octet-stream");
}

let cachedToken: string | null = null;
let cachedTokenUserId: string | null = null;

async function getBackendToken(user: SessionUser) {
  if (cachedToken && cachedTokenUserId === user.id) {
    return cachedToken;
  }
  const [[, storedToken], [, storedUserId]] = await AsyncStorage.multiGet([
    storageKeys.authToken,
    storageKeys.authTokenUserId,
  ]);
  if (storedToken && storedUserId === user.id) {
    cachedToken = storedToken;
    cachedTokenUserId = storedUserId;
    return storedToken;
  }

  const response = await fetch(`${BACKEND_URL}/api/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      role: "client",
    }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.token) {
    throw new Error(payload?.error || "Could not authenticate questionnaire request.");
  }
  await AsyncStorage.multiSet([
    [storageKeys.authToken, payload.token],
    [storageKeys.authTokenUserId, user.id],
  ]);
  cachedToken = String(payload.token);
  cachedTokenUserId = user.id;
  return String(payload.token);
}

export async function fetchCandidateQuestionnaireStatus(user: SessionUser) {
  const questionnaire = await fetchCandidateQuestionnaire(user);
  return Boolean(questionnaire?.completed_at);
}

export async function fetchCandidateQuestionnaire(user: SessionUser) {
  const token = await getBackendToken(user);
  const response = await fetch(`${BACKEND_URL}/api/mobile/questionnaire`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || `Questionnaire status failed with HTTP ${response.status}`);
  return payload?.questionnaire || null;
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

  const prepareResponse = await fetch(`${BACKEND_URL}/api/mobile/questionnaire/upload-url`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ documentType, fileName: file.name, mimeType, fileSize: file.size || 0 }),
  });
  const prepared = await prepareResponse.json().catch(() => null);
  if (!prepareResponse.ok || !prepared?.signedUrl || !prepared?.storagePath) {
    throw new Error(prepared?.error || "Could not prepare document upload.");
  }

  const source = await fetch(file.uri);
  if (!source.ok) throw new Error("Could not read the selected document.");
  const sourceBlob = await source.blob();
  const normalizedBlob = sourceBlob.type === mimeType ? sourceBlob : new Blob([sourceBlob], { type: mimeType });
  const uploadBody = new FormData();
  uploadBody.append("cacheControl", "3600");
  uploadBody.append("", normalizedBlob);
  const upload = await fetch(prepared.signedUrl, {
    method: "PUT",
    headers: { "x-upsert": "false" },
    body: uploadBody,
  });
  if (!upload.ok) {
    const uploadError = await upload.json().catch(() => null);
    throw new Error(uploadError?.message || uploadError?.error || `Document upload failed with HTTP ${upload.status}.`);
  }
  return { path: String(prepared.storagePath), name: file.name };
}

export async function submitCandidateQuestionnaire(user: SessionUser, input: CandidateQuestionnaireInput) {
  const token = await getBackendToken(user);
  const response = await fetch(`${BACKEND_URL}/api/mobile/questionnaire`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || `Questionnaire submission failed with HTTP ${response.status}`);
  return payload;
}
