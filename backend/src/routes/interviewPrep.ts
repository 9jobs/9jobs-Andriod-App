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

type GeneratedAnswer = {
  aiAnswer: string;
  feedback: string;
  clarityScore: number;
  impactScore: number;
  structureScore: number;
  provider: "gemini" | "fallback";
};

function buildFallbackAnswer(question: InterviewQuestion, transcript: string) {
  const query = transcript.trim().toLowerCase();
  let answer = "";
  let feedback = "";

  if (query.includes("intro") || query.includes("about yourself") || query.includes("background") || query.includes("introduce")) {
    answer = "I am a results-focused professional with hands-on experience delivering cross-functional projects, improving team workflows, and communicating clearly with stakeholders. I specialize in breaking down complex objectives into weekly deliverables and tracking them to completion. I am eager to apply my skills to help candidates succeed in their job search journeys with 9Jobs.";
    feedback = "Excellent response structure. Your introduction highlights both functional skills and a strong connection to 9Jobs' core mission.";
  } else if (query.includes("why") || query.includes("choose") || query.includes("reason")) {
    answer = "I want to work with this team because 9Jobs is solving a real, high-impact problem: bridging the gap between talent and recruitment platforms using specialized local strategies. I enjoy fast-paced environments where ownership is encouraged and where daily execution directly impacts candidate success.";
    feedback = "Clear motivation. Consider adding a specific reference to a 9Jobs service line to show even deeper familiarity.";
  } else if (query.includes("conflict") || query.includes("challenge") || query.includes("problem") || query.includes("difficult")) {
    answer = "In my previous experience, I faced a tight deadline with resource constraints. I first gathered the team, aligned on critical deliverables, and kept stakeholders updated daily. By focusing on decision-making transparency, we successfully delivered the project on time and optimized workflow efficiency.";
    feedback = "Good use of the STAR method. Emphasize the quantifiable result at the end of your story for maximum impact.";
  } else if (query.includes("strength") || query.includes("weakness") || query.includes("skill")) {
    answer = "My greatest strength is structured execution and ownership. I excel at breaking down complex objectives into weekly deliverables and tracking them to completion. I actively manage my focus and communicate progress early to keep stakeholders aligned.";
    feedback = "Strong positioning. Pair your strength with a real-world example in your future responses.";
  } else if (query.length > 5) {
    answer = `Regarding your query "${transcript.trim()}", I believe the key to resolving this is structured analysis, transparent communication, and alignment with stakeholders. In my career, I always seek to break challenges down into practical tasks and deliver outcomes that directly add value to the organization.`;
    feedback = "Conversational and clear response. Try to follow up with a specific scenario to demonstrate practical execution.";
  } else {
    // Return custom model answer for the specific question if no query matches
    const answerMap: Record<string, string> = {
      intro:
        "I am a results-focused professional with hands-on experience delivering cross-functional projects, improving team workflows, and communicating clearly with stakeholders. Over the last few years, I have built strong ownership habits, solved fast-moving problems, and consistently looked for ways to create measurable impact. What excites me about this opportunity is combining that execution mindset with a team where I can contribute quickly, learn fast, and keep raising the quality of outcomes.",
      impact:
        "One strong example was a project where timelines were tight and expectations were high. I first clarified the goal, aligned the team around the highest-impact deliverables, and broke the work into short milestones. I kept stakeholders updated early, removed blockers quickly, and focused the team on decisions that moved the metric that mattered most. As a result, we delivered on time, improved efficiency, and created a clear measurable outcome the business could see.",
      conflict:
        "When conflict happens, I focus on clarity, respect, and the shared objective. I first try to understand the other person's concern, then restate the problem in neutral terms so we are aligned on facts instead of assumptions. After that, I suggest options, explain trade-offs, and move the conversation toward the best decision for the team or customer. This approach usually lowers tension quickly and helps us leave the discussion with trust intact and next steps agreed.",
      closing:
        "I am interested in this role because it matches both my strengths and the kind of impact I want to keep building. The position requires clear communication, ownership, and the ability to deliver consistently, which are all areas where I have produced strong results. I believe I would be successful here because I learn quickly, stay calm under pressure, and turn goals into structured action plans that the team can execute with confidence.",
    };
    answer = answerMap[question.id] ?? answerMap.intro;
    feedback = "Use a confident first-person story, keep it structured, and include a measurable outcome near the end.";
  }

  return {
    aiAnswer: answer,
    feedback: feedback,
    clarityScore: query.length > 0 ? 84 : 88,
    impactScore: query.length > 0 ? 79 : 82,
    structureScore: 91,
    provider: "fallback" as const,
  };
}

async function generateInterviewAnswer(question: InterviewQuestion, transcript: string): Promise<GeneratedAnswer> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
  if (!apiKey) {
    return buildFallbackAnswer(question, transcript);
  }

  try {
    const prompt = [
      "You are Sarah, a professional AI Interview Coach for 9Jobs.",
      "Return JSON ONLY with keys: aiAnswer, feedback, clarityScore, impactScore, structureScore.",
      "",
      "CRITICAL INSTRUCTIONS FOR aiAnswer:",
      "1. STRICT INTENT ALIGNMENT: ALWAYS prioritize the exact spoken text/intent from the user (`User Spoken Question / Input`). IGNORE the current interview question/topic template whenever they conflict with what the user actually said. For example, if the template says 'Describe a project...' but the user asked 'Why do you want this job?', you MUST generate an answer strictly for 'Why do you want this job?'.",
      "2. FIRST-PERSON DIRECT RESPONSES: Generate the exact response written in the first person ('I'). Do NOT include meta-advice, instructional text, or formatting steps (NEVER say 'When the interviewer asks...', 'You should structure...', 'Here is a sample answer...').",
      "3. ANSWER FORMAT & QUALITY: Keep responses concise, high-impact, and highly relevant (3 to 5 sentences maximum).",
      "",
      "CRITICAL INSTRUCTIONS FOR OTHER KEYS:",
      "- feedback: 1-2 sentences of coaching feedback or tips for improvement.",
      "- clarityScore, impactScore, structureScore: Integers between 0 and 100 evaluating the user's input.",
      "",
      `Current Interview Question/Topic Template: ${question.text}`,
      `Topic Tags: ${question.tags.join(", ")}`,
      `User Spoken Question / Input: ${transcript || "No transcript supplied. Generate a model answer."}`,
    ].join("\n");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Gemini request failed with HTTP ${response.status}`);
    }

    const payload = await response.json();
    const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Gemini returned an empty response");
    }

    const parsed = JSON.parse(text);
    return {
      aiAnswer: String(parsed.aiAnswer || "").trim(),
      feedback: String(parsed.feedback || "").trim(),
      clarityScore: Number(parsed.clarityScore || 0),
      impactScore: Number(parsed.impactScore || 0),
      structureScore: Number(parsed.structureScore || 0),
      provider: "gemini",
    };
  } catch (error) {
    console.warn("[Interview Prep] Gemini failed, using fallback:", error);
    return buildFallbackAnswer(question, transcript);
  }
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

    const transcript = String(req.body?.transcript || "").trim();
    const session = await ensureInterviewSession(clientId);
    const currentQuestion = getCurrentQuestion(session.current_question_index);
    const generated = await generateInterviewAnswer(currentQuestion, transcript);

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
    console.error("[Interview Prep] POST /interview-prep/respond failed:", error);
    return res.status(500).json({ error: error.message || "Failed to generate interview answer" });
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
