import { Router, Response } from "express";
import {
  createLocalInterviewPrepResponse,
  getLocalInterviewPrepResponses,
  getLocalInterviewPrepSession,
  getLocalInterviewPrepSessions,
  upsertLocalInterviewPrepSession,
  deleteLocalInterviewPrepResponse,
  updateLocalInterviewPrepResponse,
  deleteLocalInterviewPrepSession,
} from "../lib/localDb";
import { AuthenticatedRequest, authMiddleware } from "../middleware/auth";

import { generateInterviewAnswer, InterviewAssistantError } from "../services/interviewAssistant";

const router = Router();

type InterviewQuestion = {
  id: string;
  text: string;
  tags: string[];
};

const QUESTION_BANK: InterviewQuestion[] = [
  {
    id: "intro",
    text: "Tell me about yourself and your background",
    tags: ["Behavioral", "Leadership"],
  },
  {
    id: "impact",
    text: "Describe a project where you delivered measurable impact under pressure",
    tags: ["Impact", "Execution"],
  },
  {
    id: "conflict",
    text: "How do you handle conflict with a teammate or stakeholder?",
    tags: ["Communication", "Behavioral"],
  },
  {
    id: "closing",
    text: "Why are you interested in this role and what would make you successful here?",
    tags: ["Motivation", "Strategy"],
  },
];

const DEFAULT_INTERVIEWER = {
  name: "AI Interviewer - Sarah",
  role: "Engineering Manager",
  company: "Google",
  avatarUrl:
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80",
};

function ensureAdminRole(req: AuthenticatedRequest, res: Response) {
  const role = req.user?.role;
  if (role !== "admin" && role !== "staff") {
    res.status(403).json({ error: "Forbidden: Admin or staff access required" });
    return false;
  }

  return true;
}

function getCurrentQuestion(index: number) {
  const safeIndex = Math.min(Math.max(index, 0), QUESTION_BANK.length - 1);
  return {
    ...QUESTION_BANK[safeIndex],
    index: safeIndex,
    total: QUESTION_BANK.length,
  };
}

async function ensureInterviewSession(clientId: string) {
  const existing = await getLocalInterviewPrepSession(clientId);
  if (existing) {
    return existing;
  }

  const firstQuestion = getCurrentQuestion(0);
  return await upsertLocalInterviewPrepSession({
    client_id: clientId,
    interviewer_name: DEFAULT_INTERVIEWER.name,
    interviewer_role: DEFAULT_INTERVIEWER.role,
    interviewer_company: DEFAULT_INTERVIEWER.company,
    interviewer_avatar_url: DEFAULT_INTERVIEWER.avatarUrl,
    question_total: QUESTION_BANK.length,
    current_question_index: 0,
    status: "ready",
    last_question: firstQuestion.text,
    last_question_tags: firstQuestion.tags,
  });
}

router.get("/interview-prep/session", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const requester = req.user;
    const requestedUserId = typeof req.query.userId === "string" ? req.query.userId : undefined;
    const clientId = requester?.role === "admin" && requestedUserId ? requestedUserId : requester?.userId;

    if (!clientId) {
      return res.status(400).json({ error: "Missing client id" });
    }

    const session = await ensureInterviewSession(clientId);
    const responses = await getLocalInterviewPrepResponses(clientId);
    const currentQuestion = getCurrentQuestion(session.current_question_index);

    return res.json({
      session,
      currentQuestion,
      responses,
      interviewer: {
        name: session.interviewer_name,
        role: session.interviewer_role,
        company: session.interviewer_company,
        avatarUrl: session.interviewer_avatar_url,
      },
    });
  } catch (error: any) {
    console.error("[Interview Prep] GET /interview-prep/session failed:", error);
    return res.status(500).json({ error: error.message || "Failed to load interview prep session" });
  }
});

router.post("/interview-prep/respond", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const clientId = req.user?.userId;
    if (!clientId) {
      return res.status(400).json({ error: "Missing client id" });
    }

    const transcript = typeof req.body?.transcript === "string" ? req.body.transcript.trim() : "";
    if (!transcript || transcript.length > 6000) return res.status(400).json({error:"Please ask a question of 1–6000 characters."});
    const session = await ensureInterviewSession(clientId);
    const currentQuestion = getCurrentQuestion(session.current_question_index);
    const history = await getLocalInterviewPrepResponses(clientId);
    const generated = await generateInterviewAnswer(currentQuestion, transcript, history);

    const savedResponse = await createLocalInterviewPrepResponse({
      session_id: session.id,
      client_id: clientId,
      question_index: currentQuestion.index,
      question_text: currentQuestion.text,
      question_tags: currentQuestion.tags,
      transcript,
      ai_answer: generated.aiAnswer,
      feedback: generated.feedback,
      clarity_score: generated.clarityScore,
      impact_score: generated.impactScore,
      structure_score: generated.structureScore,
    });

    const nextQuestionIndex = Math.min(currentQuestion.index + 1, QUESTION_BANK.length - 1);
    const nextStatus = currentQuestion.index >= QUESTION_BANK.length - 1 ? "completed" : "in_progress";
    const nextQuestion = getCurrentQuestion(nextQuestionIndex);

    const updatedSession = await upsertLocalInterviewPrepSession({
      id: session.id,
      client_id: clientId,
      interviewer_name: session.interviewer_name,
      interviewer_role: session.interviewer_role,
      interviewer_company: session.interviewer_company,
      interviewer_avatar_url: session.interviewer_avatar_url,
      question_total: QUESTION_BANK.length,
      current_question_index: nextQuestionIndex,
      status: nextStatus,
      last_question: currentQuestion.text,
      last_question_tags: currentQuestion.tags,
      last_transcript: transcript,
      last_ai_answer: generated.aiAnswer,
      last_feedback: generated.feedback,
      last_clarity_score: generated.clarityScore,
      last_impact_score: generated.impactScore,
      last_structure_score: generated.structureScore,
    });

    return res.json({
      session: updatedSession,
      response: savedResponse,
      answeredQuestion: currentQuestion,
      nextQuestion,
      provider: generated.provider,
    });
  } catch (error: any) {
    if (error instanceof InterviewAssistantError) {
      console.warn("[Interview Prep] AI request failed:", error.code);
      return res.status(error.status).json({error:error.message,code:error.code});
    }
    console.error("[Interview Prep] Response persistence failed");
    return res.status(500).json({ error: "Could not save the interview answer. Please try again." });
  }
});

router.post("/interview-prep/navigate", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const clientId = req.user?.userId;
    const direction = req.body?.direction === "prev" ? "prev" : "next";

    if (!clientId) {
      return res.status(400).json({ error: "Missing client id" });
    }

    const session = await ensureInterviewSession(clientId);
    const delta = direction === "prev" ? -1 : 1;
    const nextIndex = Math.min(Math.max(session.current_question_index + delta, 0), QUESTION_BANK.length - 1);
    const nextQuestion = getCurrentQuestion(nextIndex);

    const updatedSession = await upsertLocalInterviewPrepSession({
      id: session.id,
      client_id: clientId,
      interviewer_name: session.interviewer_name,
      interviewer_role: session.interviewer_role,
      interviewer_company: session.interviewer_company,
      interviewer_avatar_url: session.interviewer_avatar_url,
      question_total: QUESTION_BANK.length,
      current_question_index: nextIndex,
      status: nextIndex >= QUESTION_BANK.length - 1 ? session.status : "in_progress",
      last_question: session.last_question,
      last_question_tags: session.last_question_tags,
      last_transcript: session.last_transcript,
      last_ai_answer: session.last_ai_answer,
      last_feedback: session.last_feedback,
      last_clarity_score: session.last_clarity_score,
      last_impact_score: session.last_impact_score,
      last_structure_score: session.last_structure_score,
    });

    return res.json({
      session: updatedSession,
      currentQuestion: nextQuestion,
    });
  } catch (error: any) {
    console.error("[Interview Prep] POST /interview-prep/navigate failed:", error);
    return res.status(500).json({ error: error.message || "Failed to move interview question" });
  }
});

router.get("/admin/interview-prep", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdminRole(req, res)) {
    return;
  }

  try {
    const clientId = typeof req.query.clientId === "string" ? req.query.clientId : undefined;
    const sessions = await getLocalInterviewPrepSessions(clientId);
    const responses = await getLocalInterviewPrepResponses(clientId);

    return res.json({
      sessions,
      responses,
      questionBank: QUESTION_BANK,
    });
  } catch (error: any) {
    console.error("[Interview Prep] GET /admin/interview-prep failed:", error);
    return res.status(500).json({ error: error.message || "Failed to load interview preparation data" });
  }
});

router.delete("/admin/interview-prep/response/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdminRole(req, res)) return;
  try {
    const id = Number(req.params.id);
    const success = await deleteLocalInterviewPrepResponse(id);
    if (!success) {
      return res.status(404).json({ error: "Response not found" });
    }
    return res.json({ message: "Response deleted successfully" });
  } catch (error: any) {
    console.error("[Interview Prep] DELETE /admin/interview-prep/response failed:", error);
    return res.status(500).json({ error: error.message || "Failed to delete response" });
  }
});

router.put("/admin/interview-prep/response/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdminRole(req, res)) return;
  try {
    const id = Number(req.params.id);
    const updates = req.body;
    const updated = await updateLocalInterviewPrepResponse(id, updates);
    if (!updated) {
      return res.status(404).json({ error: "Response not found" });
    }
    return res.json({ message: "Response updated successfully", response: updated });
  } catch (error: any) {
    console.error("[Interview Prep] PUT /admin/interview-prep/response failed:", error);
    return res.status(500).json({ error: error.message || "Failed to update response" });
  }
});

router.delete("/admin/interview-prep/session/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdminRole(req, res)) return;
  try {
    const id = Number(req.params.id);
    const success = await deleteLocalInterviewPrepSession(id);
    if (!success) {
      return res.status(404).json({ error: "Session not found" });
    }
    return res.json({ message: "Session deleted successfully" });
  } catch (error: any) {
    console.error("[Interview Prep] DELETE /admin/interview-prep/session failed:", error);
    return res.status(500).json({ error: error.message || "Failed to delete session" });
  }
});

router.post("/admin/interview-prep/response", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdminRole(req, res)) return;
  try {
    const { client_id, session_id, question_index, question_text, question_tags, transcript, ai_answer, feedback, clarity_score, impact_score, structure_score } = req.body;
    const created = await createLocalInterviewPrepResponse({
      session_id: Number(session_id || 1),
      client_id: String(client_id || ""),
      question_index: Number(question_index || 0),
      question_text: String(question_text || ""),
      question_tags: Array.isArray(question_tags) ? question_tags : [question_tags || ""],
      transcript: String(transcript || ""),
      ai_answer: String(ai_answer || ""),
      feedback: String(feedback || ""),
      clarity_score: Number(clarity_score || 80),
      impact_score: Number(impact_score || 80),
      structure_score: Number(structure_score || 80),
    });
    return res.status(201).json({ message: "Response created successfully", response: created });
  } catch (error: any) {
    console.error("[Interview Prep] POST /admin/interview-prep/response failed:", error);
    return res.status(500).json({ error: error.message || "Failed to create response" });
  }
});

router.post("/admin/interview-prep/session", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureAdminRole(req, res)) return;
  try {
    const { client_id, interviewer_name, interviewer_role, interviewer_company, interviewer_avatar_url, current_question_index, question_total, status, last_question, last_question_tags } = req.body;
    const created = await upsertLocalInterviewPrepSession({
      client_id: String(client_id || ""),
      interviewer_name: String(interviewer_name || "AI Interviewer - Sarah"),
      interviewer_role: String(interviewer_role || "Engineering Manager"),
      interviewer_company: String(interviewer_company || "Google"),
      interviewer_avatar_url: String(interviewer_avatar_url || ""),
      current_question_index: Number(current_question_index || 0),
      question_total: Number(question_total || QUESTION_BANK.length),
      status: status || "ready",
      last_question: String(last_question || QUESTION_BANK[0].text),
      last_question_tags: Array.isArray(last_question_tags) ? last_question_tags : [last_question_tags || ""],
    });
    return res.status(201).json({ message: "Session created successfully", session: created });
  } catch (error: any) {
    console.error("[Interview Prep] POST /admin/interview-prep/session failed:", error);
    return res.status(500).json({ error: error.message || "Failed to create session" });
  }
});

export default router;
