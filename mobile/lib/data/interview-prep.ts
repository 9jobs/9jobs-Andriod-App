import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SessionUser } from "@/types/auth";

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

async function ensureBackendToken(sessionUser?: SessionUser | null) {
  const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || "http://10.0.2.2:3000";
  let token = await AsyncStorage.getItem("auth_token");

  if (!token && sessionUser) {
    const res = await fetch(`${backendUrl}/api/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: sessionUser.id,
        email: sessionUser.email,
        fullName: sessionUser.fullName,
        role: "client",
      }),
    });

    if (!res.ok) {
      throw new Error(`Backend token bootstrap failed with HTTP ${res.status}`);
    }

    const data = await res.json();
    token = data?.token ?? null;
    if (token) {
      await AsyncStorage.setItem("auth_token", token);
    }
  }

  if (!token) {
    throw new Error("Client auth token missing");
  }

  return { backendUrl, token };
}

export async function fetchInterviewPrepSession(sessionUser?: SessionUser | null): Promise<InterviewPrepPayload> {
  const { backendUrl, token } = await ensureBackendToken(sessionUser);
  const res = await fetch(`${backendUrl}/api/interview-prep/session`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Interview prep session failed with HTTP ${res.status}`);
  }

  return await res.json();
}

export async function requestInterviewPrepAnswer(sessionUser?: SessionUser | null, transcript = "") {
  const { backendUrl, token } = await ensureBackendToken(sessionUser);
  const res = await fetch(`${backendUrl}/api/interview-prep/respond`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ transcript }),
  });

  if (!res.ok) {
    throw new Error(`Interview answer failed with HTTP ${res.status}`);
  }

  return await res.json();
}

export async function navigateInterviewPrep(sessionUser?: SessionUser | null, direction: "prev" | "next" = "next") {
  const { backendUrl, token } = await ensureBackendToken(sessionUser);
  const res = await fetch(`${backendUrl}/api/interview-prep/navigate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ direction }),
  });

  if (!res.ok) {
    throw new Error(`Interview navigation failed with HTTP ${res.status}`);
  }

  return await res.json();
}
