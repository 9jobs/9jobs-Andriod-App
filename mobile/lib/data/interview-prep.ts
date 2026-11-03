import { getBackendAuthToken, resolveBackendUrl } from "@/lib/data/backend-auth-token";
import type { SessionUser } from "@/types/auth";
import { startTrackedRequest } from "@/lib/perf/livePerf";

export type InterviewQuestion = {
  id: string;
  text: string;
  tags: string[];
  index: number;
  total: number;
};

export type InterviewPrepSession = {
  id: number;
  client_id: string;
  interviewer_name: string;
  interviewer_role: string;
  interviewer_company: string;
  interviewer_avatar_url: string;
  current_question_index: number;
  question_total: number;
  status: "ready" | "in_progress" | "completed";
  last_question: string;
  last_question_tags: string[];
  last_transcript: string;
  last_ai_answer: string;
  last_feedback: string;
  last_clarity_score: number;
  last_impact_score: number;
  last_structure_score: number;
  created_at: string;
  updated_at: string;
};

export type InterviewPrepResponse = {
  id: number;
  session_id: number;
  client_id: string;
  question_index: number;
  question_text: string;
  question_tags: string[];
  transcript: string;
  ai_answer: string;
  feedback: string;
  clarity_score: number;
  impact_score: number;
  structure_score: number;
  created_at: string;
};

export type InterviewPrepPayload = {
  session: InterviewPrepSession;
  currentQuestion: InterviewQuestion;
  responses: InterviewPrepResponse[];
  interviewer: {
    name: string;
    role: string;
    company: string;
    avatarUrl: string;
  };
};

let cachedSessionByUserId = new Map<string, InterviewPrepPayload>();
let inFlightSessionPromiseByUserId = new Map<string, Promise<InterviewPrepPayload>>();
const activeInterviewScreenUserIds = new Set<string>();

export function setInterviewPrepScreenActive(userId: string, active: boolean) {
  if (!userId) {
    return;
  }

  if (active) {
    activeInterviewScreenUserIds.add(userId);
    return;
  }

  activeInterviewScreenUserIds.delete(userId);
}

async function ensureBackendToken(sessionUser?: SessionUser | null) {
  const backendUrl = resolveBackendUrl();
  if (!sessionUser) throw new Error("Please sign in to use Interview Preparation.");
  const token = await getBackendAuthToken(sessionUser, { backendUrl, label: "interview.auth.token" });

  return { backendUrl, token };
}

async function requestInterviewEndpoint(
  sessionUser: SessionUser | null | undefined,
  endpoint: string,
  label: string,
  init?: RequestInit,
) {
  const { backendUrl, token } = await ensureBackendToken(sessionUser);
  const request = async (authToken: string, attempt: number) => {
    const tracker = startTrackedRequest(label, { user_id: sessionUser!.id, url: `${backendUrl}${endpoint}`, attempt });
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${authToken}`);
    try {
      const response = await fetch(`${backendUrl}${endpoint}`, { ...init, headers });
      tracker.finish({ status: response.status, user_id: sessionUser!.id, payload_bytes: Number(response.headers?.get?.("content-length") || 0) });
      return response;
    } catch (error) {
      tracker.finish({ status: 0, user_id: sessionUser!.id });
      throw error;
    }
  };

  const response = await request(token, 1);
  if (response.status !== 401) return response;

  // Renew once; concurrent requests reuse the same token exchange.
  const renewedToken = await getBackendAuthToken(sessionUser!, {
    backendUrl,
    label: "interview.auth.refresh",
    forceRefresh: true,
    rejectedToken: token,
  });
  const retry = await request(renewedToken, 2);
  if (retry.status === 401) throw new Error("Your session could not be renewed. Please sign out and sign in again.");
  return retry;
}

export async function fetchInterviewPrepSession(
  sessionUser?: SessionUser | null,
  options?: { force?: boolean; allowBackground?: boolean },
): Promise<InterviewPrepPayload> {
  const cacheKey = sessionUser?.id ?? "anonymous";
  if (!options?.force) {
    const cached = cachedSessionByUserId.get(cacheKey);
    if (cached) {
      return cached;
    }
    if (sessionUser && !options?.allowBackground && !activeInterviewScreenUserIds.has(cacheKey)) {
      throw new Error("Interview preparation requested before the screen became active.");
    }
    const existingPromise = inFlightSessionPromiseByUserId.get(cacheKey);
    if (existingPromise) {
      return await existingPromise;
    }
  }

  const requestPromise = (async () => {
    const res = await requestInterviewEndpoint(sessionUser, "/api/interview-prep/session", "interview.session");
    if (!res.ok) {
      throw new Error(`Interview prep session failed with HTTP ${res.status}`);
    }

    const payload = (await res.json()) as InterviewPrepPayload;
    cachedSessionByUserId.set(cacheKey, payload);
    return payload;
  })().finally(() => {
    inFlightSessionPromiseByUserId.delete(cacheKey);
  });

  inFlightSessionPromiseByUserId.set(cacheKey, requestPromise);
  return await requestPromise;
}

export async function requestInterviewPrepAnswer(sessionUser?: SessionUser | null, transcript = "") {
  const res = await requestInterviewEndpoint(sessionUser, "/api/interview-prep/respond", "interview.answer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ transcript }),
  });

  if (!res.ok) {
    const failure = await res.json().catch(() => null);
    throw new Error(failure?.error || `Interview answer failed with HTTP ${res.status}`);
  }

  const payload = await res.json();
  if (sessionUser?.id) {
    cachedSessionByUserId.delete(sessionUser.id);
  }
  return payload;
}

export async function navigateInterviewPrep(sessionUser?: SessionUser | null, direction: "prev" | "next" = "next") {
  const res = await requestInterviewEndpoint(sessionUser, "/api/interview-prep/navigate", "interview.navigate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ direction }),
  });

  if (!res.ok) {
    throw new Error(`Interview navigation failed with HTTP ${res.status}`);
  }

  const payload = await res.json();
  if (sessionUser?.id) {
    cachedSessionByUserId.delete(sessionUser.id);
  }
  return payload;
}

export async function prefetchInterviewPrepSession(sessionUser?: SessionUser | null) {
  if (!sessionUser) {
    return null;
  }

  try {
    return await fetchInterviewPrepSession(sessionUser, { allowBackground: true });
  } catch (error) {
    console.warn("[Interview Prep] Background prefetch failed:", error);
    return null;
  }
}
