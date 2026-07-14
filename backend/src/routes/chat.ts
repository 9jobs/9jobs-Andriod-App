import express, { Router, Response } from "express";
import { AuthenticatedRequest, authMiddleware } from "../middleware/auth";
import { supabase, hasNewSchema } from "../lib/supabase";
import {
  sendMessage,
  deleteMessage,
  clearConversation,
  startConversation,
  getConversationsList,
  getMessagesHistory,
  getConversationDetails,
} from "../services/messageService";

const router = Router();
const CHAT_ATTACHMENT_BUCKET = "assets";

function sanitizeAttachmentName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
}

async function ensureChatAttachmentBucket() {
  const { data: bucket, error: bucketError } = await supabase.storage.getBucket(CHAT_ATTACHMENT_BUCKET);
  if (!bucketError && bucket) {
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(CHAT_ATTACHMENT_BUCKET, {
    public: true,
    fileSizeLimit: 15 * 1024 * 1024,
  });

  if (createError && !/already exists/i.test(createError.message || "")) {
    throw createError;
  }
}

// =========================================================================
// CLIENT SUPPORT CHAT APIS (Require Client Access)
// =========================================================================

// Resolve active conversation
router.get("/chat/conversation", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(400).json({ error: "Missing user credentials" });

  try {
    const activeConversation = await getConversationDetails(userId);
    if (activeConversation) {
      return res.json(activeConversation);
    }

    return res.json({
      id: userId,
      client_id: userId,
      status: "open",
      type: "support",
      client_unread_count: 0,
      admin_unread_count: 0,
      chatbot_enabled: true,
    });
  } catch (err: any) {
    console.error("[Chat Route] GET /chat/conversation failed:", err);
    return res.status(500).json({ error: err.message || "Internal database error" });
  }
});

// Fetch client messages
router.get("/chat/messages", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(400).json({ error: "Missing user credentials" });

  try {
    const messages = await getMessagesHistory(userId);
    return res.json(messages);
  } catch (err: any) {
    console.error("[Chat Route] GET /chat/messages failed:", err);
    return res.status(500).json({ error: err.message || "Internal database error" });
  }
});

// Send client message
router.post("/chat/messages", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  const role = req.user?.role as any;
  if (!userId || role !== "client") {
    return res.status(403).json({ error: "Forbidden: Client role required" });
  }

  const { text, clientMessageId, messageType, attachmentUrl, attachmentName, attachmentMimeType, attachmentSize } = req.body;
  if ((!text && !attachmentUrl) || !clientMessageId) {
    return res.status(400).json({ error: "Missing message payload or clientMessageId" });
  }

  const result = await sendMessage(userId, "client", {
    text,
    clientMessageId,
    messageType,
    attachmentUrl,
    attachmentName,
    attachmentMimeType,
    attachmentSize,
  });
  if (result.success) {
    return res.json(result);
  } else {
    return res.status(400).json(result);
  }
});

router.post(
  "/chat/attachments",
  authMiddleware,
  express.raw({ type: "*/*", limit: "15mb" }),
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(400).json({ error: "Missing user credentials" });
    }

    const fileNameHeader = req.headers["x-file-name"];
    const mimeTypeHeader = req.headers["x-file-type"];
    const fileName = Array.isArray(fileNameHeader) ? fileNameHeader[0] : fileNameHeader;
    const mimeType = Array.isArray(mimeTypeHeader) ? mimeTypeHeader[0] : mimeTypeHeader;
    const body = req.body;

    if (!fileName || !mimeType || !Buffer.isBuffer(body) || body.length === 0) {
      return res.status(400).json({ error: "Missing attachment payload" });
    }

    try {
      await ensureChatAttachmentBucket();
      const safeName = sanitizeAttachmentName(fileName);
      const storagePath = `chat-attachments/${userId}/${Date.now()}-${safeName}`;
      const { error } = await supabase.storage.from(CHAT_ATTACHMENT_BUCKET).upload(storagePath, body, {
        contentType: mimeType,
        upsert: false,
      });

      if (error) {
        throw error;
      }

      const { data } = supabase.storage.from(CHAT_ATTACHMENT_BUCKET).getPublicUrl(storagePath);
      return res.json({
        success: true,
        url: data.publicUrl,
        path: storagePath,
      });
    } catch (err: any) {
      console.error("[Chat Route] POST /chat/attachments failed:", err);
      return res.status(500).json({ error: err.message || "Could not upload attachment" });
    }
  },
);

// Mark admin/bot messages as seen by client
router.post("/chat/messages/seen", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(400).json({ error: "Missing user credentials" });

  try {
    const isNew = await hasNewSchema();
    if (isNew) {
      // Update unseen messages sent by admin/bot/system
      const { error: msgErr } = await supabase
        .from("messages")
        .update({ status: "seen", seen_at: new Date().toISOString() })
        .eq("conversation_id", userId)
        .neq("sender_role", "client")
        .is("seen_at", null);

      if (msgErr) throw msgErr;

      // Reset unread count for client
      const { data: updatedConv, error: convErr } = await supabase
        .from("conversations")
        .update({ client_unread_count: 0 })
        .eq("id", userId)
        .select()
        .single();

      if (convErr) throw convErr;

      return res.json({ success: true, conversation: updatedConv });
    } else {
      // Old schema fallback: mock success
      return res.json({
        success: true,
        conversation: {
          id: userId,
          client_id: userId,
          client_unread_count: 0,
          admin_unread_count: 0,
        },
      });
    }
  } catch (err: any) {
    console.error("[Chat Route] POST /chat/messages/seen failed:", err);
    return res.status(500).json({ error: err.message || "Internal database error" });
  }
});

// Delete client message
router.delete("/chat/messages/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(400).json({ error: "Missing user credentials" });

  const { id } = req.params;
  const result = await deleteMessage(userId, "client", id);
  if (result.success) {
    return res.json(result);
  } else {
    return res.status(400).json(result);
  }
});

// Clear all client messages
router.post("/chat/messages/clear", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(400).json({ error: "Missing user credentials" });

  const result = await clearConversation(userId, "client", userId);
  if (result.success) {
    return res.json(result);
  } else {
    return res.status(400).json(result);
  }
});

router.post("/chat/messages/new", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(400).json({ error: "Missing user credentials" });

  const result = await startConversation(userId, "client", userId);
  if (result.success) {
    return res.json(result);
  } else {
    return res.status(400).json(result);
  }
});

// =========================================================================
// ADMIN SUPPORT CHAT APIS (Require Admin/Staff Access)
// =========================================================================

// Fetch list of conversations for Admin Panel
router.get("/admin/conversations", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const role = req.user?.role;
  if (role !== "admin" && role !== "staff") {
    return res.status(403).json({ error: "Forbidden: Admin or staff access required" });
  }

  try {
    const conversations = await getConversationsList();
    return res.json(conversations);
  } catch (err: any) {
    console.error("[Chat Route] GET /admin/conversations failed:", err);
    return res.status(500).json({ error: err.message || "Internal database error" });
  }
});

// Fetch detailed messages for a support thread in Admin Panel
router.get("/admin/conversations/:conversationId/messages", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const role = req.user?.role;
  if (role !== "admin" && role !== "staff") {
    return res.status(403).json({ error: "Forbidden: Admin or staff access required" });
  }

  const { conversationId } = req.params;

  try {
    const messages = await getMessagesHistory(conversationId);
    return res.json(messages);
  } catch (err: any) {
    console.error("[Chat Route] GET admin messages failed:", err);
    return res.status(500).json({ error: err.message || "Internal database error" });
  }
});

// Send admin/staff reply
router.post("/admin/conversations/:conversationId/messages", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  const role = req.user?.role;
  if (role !== "admin" && role !== "staff") {
    return res.status(403).json({ error: "Forbidden: Admin or staff access required" });
  }

  const { conversationId } = req.params;
  const { text, clientMessageId, messageType, attachmentUrl, attachmentName, attachmentMimeType, attachmentSize } = req.body;

  if ((!text && !attachmentUrl) || !clientMessageId) {
    return res.status(400).json({ error: "Missing message payload or clientMessageId" });
  }

  const result = await sendMessage(userId || "admin", role as any, {
    conversationId,
    text,
    clientMessageId,
    messageType,
    attachmentUrl,
    attachmentName,
    attachmentMimeType,
    attachmentSize,
  });

  if (result.success) {
    return res.json(result);
  } else {
    return res.status(400).json(result);
  }
});

// Mark messages as seen by admin
router.post("/admin/conversations/:conversationId/seen", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const role = req.user?.role;
  if (role !== "admin" && role !== "staff") {
    return res.status(403).json({ error: "Forbidden: Admin or staff access required" });
  }

  const { conversationId } = req.params;

  try {
    const isNew = await hasNewSchema();
    if (isNew) {
      const { error: msgErr } = await supabase
        .from("messages")
        .update({ status: "seen", seen_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .eq("sender_role", "client")
        .is("seen_at", null);

      if (msgErr) throw msgErr;

      const { data: updatedConv, error: convErr } = await supabase
        .from("conversations")
        .update({ admin_unread_count: 0 })
        .eq("id", conversationId)
        .select()
        .single();

      if (convErr) throw convErr;

      return res.json({ success: true, conversation: updatedConv });
    } else {
      // Old schema fallback: mock success
      return res.json({
        success: true,
        conversation: {
          id: conversationId,
          client_id: conversationId,
          client_unread_count: 0,
          admin_unread_count: 0,
        },
      });
    }
  } catch (err: any) {
    console.error("[Chat Route] POST admin seen failed:", err);
    return res.status(500).json({ error: err.message || "Internal database error" });
  }
});

// Delete admin message
router.delete("/admin/conversations/:conversationId/messages/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const role = req.user?.role;
  if (role !== "admin" && role !== "staff") {
    return res.status(403).json({ error: "Forbidden: Admin or staff access required" });
  }

  const { conversationId, id } = req.params;
  const result = await deleteMessage("admin", "admin", id, conversationId);
  if (result.success) {
    return res.json(result);
  } else {
    return res.status(400).json(result);
  }
});

// Clear admin conversation
router.post("/admin/conversations/:conversationId/clear", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const role = req.user?.role;
  if (role !== "admin" && role !== "staff") {
    return res.status(403).json({ error: "Forbidden: Admin or staff access required" });
  }

  const { conversationId } = req.params;
  const result = await clearConversation("admin", "admin", conversationId);
  if (result.success) {
    return res.json(result);
  } else {
    return res.status(400).json(result);
  }
});

export default router;
