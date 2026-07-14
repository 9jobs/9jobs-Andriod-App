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

interface LocalDbSchema {
  messages: LocalMessage[];
  conversations: LocalConversation[];
}

function readDb(): LocalDbSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      return { messages: [], conversations: [] };
    }
    const data = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(data);
  } catch (err) {
    return { messages: [], conversations: [] };
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
