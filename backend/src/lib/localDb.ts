import fs from "fs";
import path from "path";

const DB_FILE = path.resolve(__dirname, "../../local_db.json");

export interface LocalMessage {
  id: number;
  conversation_id: string;
  sender_id: string;
  sender_role: "client" | "admin" | "staff" | "bot" | "system";
  recipient_id: string | null;
  message_type: string;
  text: string;
  attachment_url?: string;
  attachment_name?: string;
  attachment_mime_type?: string;
  attachment_size?: number;
  status: string;
  created_at: string;
  client_message_id?: string;
  is_automated?: boolean;
  sender_type?: string;
}

export interface LocalConversation {
  id: string;
  client_id: string;
  type: string;
  status: string;
  last_message_id: number | null;
  last_message_text: string | null;
  last_message_at: string | null;
  last_message_sender_id: string | null;
  client_unread_count: number;
  admin_unread_count: number;
  chatbot_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocalRecruiterContact {
  id: number;
  client_id: string;
  application_id: number | null;
  recruiter_name: string;
  company_name: string;
  email: string;
  phone?: string;
  linkedin_url: string;
  contact_method: string;
  contact_date: string;
  response_status: string;
  response_date?: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface LocalInterviewPrepSession {
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
}

export interface LocalInterviewPrepResponse {
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
}

export interface LocalSuccessStory {
  id: string;
  name: string;
  position: string;
  year: string;
  message: string;
  story_rate: number;
  photo_url: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface LocalDbSchema {
  messages: LocalMessage[];
  conversations: LocalConversation[];
  recruiter_contacts: LocalRecruiterContact[];
  interview_prep_sessions: LocalInterviewPrepSession[];
  interview_prep_responses: LocalInterviewPrepResponse[];
  success_stories: LocalSuccessStory[];
}

function readDb(): LocalDbSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      return { messages: [], conversations: [], recruiter_contacts: [], interview_prep_sessions: [], interview_prep_responses: [], success_stories: [] };
    }
    const data = fs.readFileSync(DB_FILE, "utf8");
    const parsed = JSON.parse(data);
    return {
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      conversations: Array.isArray(parsed.conversations) ? parsed.conversations : [],
      recruiter_contacts: Array.isArray(parsed.recruiter_contacts) ? parsed.recruiter_contacts : [],
      interview_prep_sessions: Array.isArray(parsed.interview_prep_sessions) ? parsed.interview_prep_sessions : [],
      interview_prep_responses: Array.isArray(parsed.interview_prep_responses) ? parsed.interview_prep_responses : [],
      success_stories: Array.isArray(parsed.success_stories) ? parsed.success_stories : [],
    };
  } catch (err) {
    return { messages: [], conversations: [], recruiter_contacts: [], interview_prep_sessions: [], interview_prep_responses: [], success_stories: [] };
  }
}

function writeDb(data: LocalDbSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("[Local DB] Write failed:", err);
  }
}

export async function getLocalMessages(conversationId: string): Promise<LocalMessage[]> {
  const db = readDb();
  return db.messages.filter(
    (m) =>
      m.conversation_id === conversationId ||
      m.sender_id === conversationId ||
      m.recipient_id === conversationId
  );
}

export async function insertLocalMessage(msg: Omit<LocalMessage, "id" | "created_at">): Promise<LocalMessage> {
  const db = readDb();
  const newId = db.messages.length > 0 ? Math.max(...db.messages.map((m) => m.id)) + 1 : 1;
  const lastMessagePreview = msg.text || msg.attachment_name || (msg.message_type === "image" ? "Photo" : "Attachment");
  const newMsg: LocalMessage = {
    ...msg,
    id: newId,
    created_at: new Date().toISOString(),
  };

  db.messages.push(newMsg);

  // Update or create conversation
  let conv = db.conversations.find((c) => c.id === msg.conversation_id);
  if (!conv) {
    conv = {
      id: msg.conversation_id,
      client_id: msg.conversation_id,
      type: "support",
      status: "open",
      last_message_id: newId,
      last_message_text: lastMessagePreview,
      last_message_at: newMsg.created_at,
      last_message_sender_id: msg.sender_id,
      client_unread_count: msg.sender_role === "admin" ? 1 : 0,
      admin_unread_count: msg.sender_role === "client" ? 1 : 0,
      chatbot_enabled: true,
      created_at: newMsg.created_at,
      updated_at: newMsg.created_at,
    };
    db.conversations.push(conv);
  } else {
    conv.last_message_id = newId;
    conv.last_message_text = lastMessagePreview;
    conv.last_message_at = newMsg.created_at;
    conv.last_message_sender_id = msg.sender_id;
    if (msg.sender_role === "admin") {
      conv.client_unread_count += 1;
    } else if (msg.sender_role === "client") {
      conv.admin_unread_count += 1;
    }
    conv.updated_at = newMsg.created_at;
  }

  writeDb(db);
  return newMsg;
}

export async function getLocalConversations(): Promise<LocalConversation[]> {
  const db = readDb();
  return db.conversations;
}

export async function getLocalConversation(id: string): Promise<LocalConversation | undefined> {
  const db = readDb();
  return db.conversations.find((c) => c.id === id);
}

export async function updateLocalConversation(id: string, updates: Partial<LocalConversation>): Promise<LocalConversation | undefined> {
  const db = readDb();
  const conv = db.conversations.find((c) => c.id === id);
  if (conv) {
    Object.assign(conv, updates);
    conv.updated_at = new Date().toISOString();
    writeDb(db);
  }
  return conv;
}

export async function deleteLocalMessage(id: number): Promise<boolean> {
  const db = readDb();
  const index = db.messages.findIndex((m) => m.id === id);
  if (index !== -1) {
    db.messages.splice(index, 1);
    writeDb(db);
    return true;
  }
  return false;
}

export async function clearLocalConversation(conversationId: string): Promise<boolean> {
  const db = readDb();
  db.messages = db.messages.filter(
    (m) =>
      m.conversation_id !== conversationId &&
      m.sender_id !== conversationId &&
      m.recipient_id !== conversationId
  );

  const conv = db.conversations.find((c) => c.id === conversationId);
  if (conv) {
    conv.last_message_id = null;
    conv.last_message_text = "Chat cleared";
    conv.last_message_at = null;
    conv.client_unread_count = 0;
    conv.admin_unread_count = 0;
  }

  writeDb(db);
  return true;
}

export async function getLocalRecruiterContacts(clientId?: string): Promise<LocalRecruiterContact[]> {
  const db = readDb();
  const rows = clientId
    ? db.recruiter_contacts.filter((contact) => contact.client_id === clientId)
    : db.recruiter_contacts;

  return [...rows].sort((a, b) => {
    const aTime = new Date(a.contact_date || a.created_at).getTime();
    const bTime = new Date(b.contact_date || b.created_at).getTime();
    return bTime - aTime;
  });
}

export async function upsertLocalRecruiterContact(
  contact: Partial<LocalRecruiterContact> & {
    client_id: string;
    recruiter_name?: string;
    company_name?: string;
    email?: string;
    linkedin_url?: string;
  },
): Promise<LocalRecruiterContact> {
  const db = readDb();
  const now = new Date().toISOString();
  const existingIndex = typeof contact.id === "number"
    ? db.recruiter_contacts.findIndex((item) => item.id === contact.id)
    : -1;

  if (existingIndex >= 0) {
    const existing = db.recruiter_contacts[existingIndex];
    const updated: LocalRecruiterContact = {
      ...existing,
      ...contact,
      application_id: typeof contact.application_id === "number" ? contact.application_id : existing.application_id ?? null,
      recruiter_name: contact.recruiter_name ?? existing.recruiter_name ?? "",
      company_name: contact.company_name ?? existing.company_name ?? "",
      email: contact.email ?? existing.email ?? "",
      linkedin_url: contact.linkedin_url ?? existing.linkedin_url ?? "",
      contact_method: contact.contact_method ?? existing.contact_method ?? "other",
      contact_date: contact.contact_date ?? existing.contact_date ?? now,
      response_status: contact.response_status ?? existing.response_status ?? "no_response",
      notes: contact.notes ?? existing.notes ?? "",
      updated_at: now,
    };
    db.recruiter_contacts[existingIndex] = updated;
    writeDb(db);
    return updated;
  }

  const newId =
    db.recruiter_contacts.length > 0
      ? Math.max(...db.recruiter_contacts.map((item) => item.id)) + 1
      : 1;

  const created: LocalRecruiterContact = {
    id: newId,
    client_id: contact.client_id,
    application_id: typeof contact.application_id === "number" ? contact.application_id : null,
    recruiter_name: contact.recruiter_name ?? "",
    company_name: contact.company_name ?? "",
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    linkedin_url: contact.linkedin_url ?? "",
    contact_method: contact.contact_method ?? "other",
    contact_date: contact.contact_date ?? now,
    response_status: contact.response_status ?? "no_response",
    response_date: contact.response_date ?? null,
    notes: contact.notes ?? "",
    created_at: now,
    updated_at: now,
  };

  db.recruiter_contacts.push(created);
  writeDb(db);
  return created;
}

export async function deleteLocalRecruiterContact(id: number): Promise<boolean> {
  const db = readDb();
  const originalLength = db.recruiter_contacts.length;
  db.recruiter_contacts = db.recruiter_contacts.filter((item) => item.id !== id);

  if (db.recruiter_contacts.length === originalLength) {
    return false;
  }

  writeDb(db);
  return true;
}

export async function getLocalSuccessStories(): Promise<LocalSuccessStory[]> {
  const db = readDb();
  return [...db.success_stories].sort((a, b) => {
    if (a.display_order !== b.display_order) {
      return a.display_order - b.display_order;
    }

    const aTime = new Date(a.created_at).getTime();
    const bTime = new Date(b.created_at).getTime();
    return bTime - aTime;
  });
}

export async function upsertLocalSuccessStory(
  story: Partial<LocalSuccessStory> & {
    id: string;
    name: string;
    position: string;
    year: string;
    message: string;
    story_rate: number;
    photo_url?: string;
    display_order?: number;
    is_active?: boolean;
  },
): Promise<LocalSuccessStory> {
  const db = readDb();
  const existingIndex = db.success_stories.findIndex((item) => item.id === story.id);
  const now = new Date().toISOString();

  if (existingIndex !== -1) {
    const existing = db.success_stories[existingIndex];
    const updated: LocalSuccessStory = {
      ...existing,
      ...story,
      photo_url: story.photo_url ?? existing.photo_url ?? "",
      display_order: story.display_order ?? existing.display_order ?? 0,
      is_active: story.is_active ?? existing.is_active ?? true,
      updated_at: now,
    };
    db.success_stories[existingIndex] = updated;
    writeDb(db);
    return updated;
  }

  const created: LocalSuccessStory = {
    id: story.id,
    name: story.name,
    position: story.position,
    year: story.year,
    message: story.message,
    story_rate: story.story_rate,
    photo_url: story.photo_url ?? "",
    display_order: story.display_order ?? db.success_stories.length,
    is_active: story.is_active ?? true,
    created_at: now,
    updated_at: now,
  };

  db.success_stories.push(created);
  writeDb(db);
  return created;
}

export async function deleteLocalSuccessStory(id: string): Promise<boolean> {
  const db = readDb();
  const originalLength = db.success_stories.length;
  db.success_stories = db.success_stories.filter((item) => item.id !== id);
  if (db.success_stories.length === originalLength) {
    return false;
  }

  writeDb(db);
  return true;
}

export async function getLocalInterviewPrepSessions(clientId?: string): Promise<LocalInterviewPrepSession[]> {
  const db = readDb();
  const rows = clientId
    ? db.interview_prep_sessions.filter((session) => session.client_id === clientId)
    : db.interview_prep_sessions;

  return [...rows].sort((a, b) => {
    const aTime = new Date(a.updated_at || a.created_at).getTime();
    const bTime = new Date(b.updated_at || b.created_at).getTime();
    return bTime - aTime;
  });
}

export async function getLocalInterviewPrepSession(clientId: string): Promise<LocalInterviewPrepSession | undefined> {
  const sessions = await getLocalInterviewPrepSessions(clientId);
  return sessions[0];
}

export async function upsertLocalInterviewPrepSession(
  session: Partial<LocalInterviewPrepSession> & {
    client_id: string;
    interviewer_name: string;
    interviewer_role: string;
    interviewer_company: string;
    interviewer_avatar_url: string;
    question_total: number;
  },
): Promise<LocalInterviewPrepSession> {
  const db = readDb();
  const now = new Date().toISOString();
  const existingIndex = typeof session.id === "number"
    ? db.interview_prep_sessions.findIndex((item) => item.id === session.id)
    : db.interview_prep_sessions.findIndex((item) => item.client_id === session.client_id);

  if (existingIndex >= 0) {
    const existing = db.interview_prep_sessions[existingIndex];
    const updated: LocalInterviewPrepSession = {
      ...existing,
      ...session,
      current_question_index: typeof session.current_question_index === "number" ? session.current_question_index : existing.current_question_index,
      question_total: typeof session.question_total === "number" ? session.question_total : existing.question_total,
      status: session.status ?? existing.status,
      last_question: session.last_question ?? existing.last_question,
      last_question_tags: Array.isArray(session.last_question_tags) ? session.last_question_tags : existing.last_question_tags,
      last_transcript: session.last_transcript ?? existing.last_transcript,
      last_ai_answer: session.last_ai_answer ?? existing.last_ai_answer,
      last_feedback: session.last_feedback ?? existing.last_feedback,
      last_clarity_score: typeof session.last_clarity_score === "number" ? session.last_clarity_score : existing.last_clarity_score,
      last_impact_score: typeof session.last_impact_score === "number" ? session.last_impact_score : existing.last_impact_score,
      last_structure_score: typeof session.last_structure_score === "number" ? session.last_structure_score : existing.last_structure_score,
      updated_at: now,
    };
    db.interview_prep_sessions[existingIndex] = updated;
    writeDb(db);
    return updated;
  }

  const newId =
    db.interview_prep_sessions.length > 0
      ? Math.max(...db.interview_prep_sessions.map((item) => item.id)) + 1
      : 1;

  const created: LocalInterviewPrepSession = {
    id: newId,
    client_id: session.client_id,
    interviewer_name: session.interviewer_name,
    interviewer_role: session.interviewer_role,
    interviewer_company: session.interviewer_company,
    interviewer_avatar_url: session.interviewer_avatar_url,
    current_question_index: typeof session.current_question_index === "number" ? session.current_question_index : 0,
    question_total: session.question_total,
    status: session.status ?? "ready",
    last_question: session.last_question ?? "",
    last_question_tags: Array.isArray(session.last_question_tags) ? session.last_question_tags : [],
    last_transcript: session.last_transcript ?? "",
    last_ai_answer: session.last_ai_answer ?? "",
    last_feedback: session.last_feedback ?? "",
    last_clarity_score: typeof session.last_clarity_score === "number" ? session.last_clarity_score : 0,
    last_impact_score: typeof session.last_impact_score === "number" ? session.last_impact_score : 0,
    last_structure_score: typeof session.last_structure_score === "number" ? session.last_structure_score : 0,
    created_at: now,
    updated_at: now,
  };

  db.interview_prep_sessions.push(created);
  writeDb(db);
  return created;
}

export async function getLocalInterviewPrepResponses(clientId?: string): Promise<LocalInterviewPrepResponse[]> {
  const db = readDb();
  const rows = clientId
    ? db.interview_prep_responses.filter((response) => response.client_id === clientId)
    : db.interview_prep_responses;

  return [...rows].sort((a, b) => {
    const aTime = new Date(a.created_at).getTime();
    const bTime = new Date(b.created_at).getTime();
    return bTime - aTime;
  });
}

export async function createLocalInterviewPrepResponse(
  response: Omit<LocalInterviewPrepResponse, "id" | "created_at">,
): Promise<LocalInterviewPrepResponse> {
  const db = readDb();
  const newId =
    db.interview_prep_responses.length > 0
      ? Math.max(...db.interview_prep_responses.map((item) => item.id)) + 1
      : 1;

  const created: LocalInterviewPrepResponse = {
    ...response,
    id: newId,
    created_at: new Date().toISOString(),
  };

  db.interview_prep_responses.push(created);
  writeDb(db);
  return created;
}
