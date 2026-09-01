import AsyncStorage from "@react-native-async-storage/async-storage";
import { getBackendAuthToken } from "@/lib/data/backend-auth-token";
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
  const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || "http://10.0.2.2:3000";
  let token = await AsyncStorage.getItem("auth_token");

  if (!token && sessionUser) {
    token = await getBackendAuthToken(sessionUser, {
      backendUrl,
      label: "interview.auth.token",
    });
    if (token) {
      await AsyncStorage.setItem("auth_token", token);
    }
  }

  if (!token) {
    throw new Error("Client auth token missing");
  }

  return { backendUrl, token };
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
    const { backendUrl, token } = await ensureBackendToken(sessionUser);
    const tracker = startTrackedRequest("interview.session", {
      user_id: sessionUser?.id ?? "unknown",
      url: `${backendUrl}/api/interview-prep/session`,
    });
    const res = await fetch(`${backendUrl}/api/interview-prep/session`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    tracker.finish({
      status: res.status,
      user_id: sessionUser?.id ?? "unknown",
      payload_bytes: Number(res.headers.get("content-length") || 0),
    });
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
  const { backendUrl, token } = await ensureBackendToken(sessionUser);
  const tracker = startTrackedRequest("interview.answer", {
    user_id: sessionUser?.id ?? "unknown",
    url: `${backendUrl}/api/interview-prep/respond`,
  });
  const res = await fetch(`${backendUrl}/api/interview-prep/respond`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ transcript }),
  });

  tracker.finish({
    status: res.status,
    user_id: sessionUser?.id ?? "unknown",
    payload_bytes: Number(res.headers.get("content-length") || 0),
  });
  if (!res.ok) {
    throw new Error(`Interview answer failed with HTTP ${res.status}`);
  }

  const payload = await res.json();
  if (sessionUser?.id) {
    cachedSessionByUserId.delete(sessionUser.id);
  }
  return payload;
}

export async function navigateInterviewPrep(sessionUser?: SessionUser | null, direction: "prev" | "next" = "next") {
  const { backendUrl, token } = await ensureBackendToken(sessionUser);
  const tracker = startTrackedRequest("interview.navigate", {
    user_id: sessionUser?.id ?? "unknown",
    url: `${backendUrl}/api/interview-prep/navigate`,
    direction,
  });
  const res = await fetch(`${backendUrl}/api/interview-prep/navigate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ direction }),
  });

  tracker.finish({
    status: res.status,
    user_id: sessionUser?.id ?? "unknown",
    payload_bytes: Number(res.headers.get("content-length") || 0),
    direction,
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
