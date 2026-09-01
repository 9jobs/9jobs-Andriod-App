import { Pool } from "pg";
import { supabase, hasNewSchema } from "../lib/supabase";
import { Server } from "socket.io";
import {
  getLocalMessages,
  insertLocalMessage,
  getLocalConversations,
  getLocalConversation,
  updateLocalConversation,
  deleteLocalMessage,
  updateLocalMessage,
  clearLocalConversation,
  deleteLocalConversation,
} from "../lib/localDb";


export interface MessagePayload {
  conversationId?: string;
  text?: string;
  clientMessageId: string;
  messageType?: "text" | "image" | "document";
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentMimeType?: string;
  attachmentSize?: number;
}

export interface SendMessageResult {
  success: boolean;
  message?: any;
  botMessage?: any;
  conversation?: any;
  error?: string;
  clientMessageId?: string;
}

export const DEFAULT_SUPPORT_WELCOME_MESSAGE =
  "Welcome to the live 9Jobs preview. This thread is synced with the admin panel.";

function hasUsableDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL || "";
  return Boolean(databaseUrl) && !databaseUrl.includes("[YOUR_DB_PASSWORD]");
}

function createPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
}

type PostgresChatSchema = {
  hasConversationsTable: boolean;
  hasMessagesTable: boolean;
  messageColumns: Set<string>;
};

let postgresChatSchemaPromise: Promise<PostgresChatSchema> | null = null;

async function getPostgresChatSchema(): Promise<PostgresChatSchema> {
  if (!hasUsableDatabaseUrl()) {
    return {
      hasConversationsTable: false,
      hasMessagesTable: false,
      messageColumns: new Set<string>(),
    };
  }

  if (!postgresChatSchemaPromise) {
    postgresChatSchemaPromise = (async () => {
      const pool = createPool();
      try {
        const [tablesResult, columnsResult] = await Promise.all([
          pool.query(
            `
              select table_name
              from information_schema.tables
              where table_schema = 'public'
                and table_name in ('conversations', 'messages')
            `,
          ),
          pool.query(
            `
              select column_name
              from information_schema.columns
              where table_schema = 'public'
                and table_name = 'messages'
            `,
          ),
        ]);

        const tableNames = new Set<string>(tablesResult.rows.map((row: any) => row.table_name));
        return {
          hasConversationsTable: tableNames.has("conversations"),
          hasMessagesTable: tableNames.has("messages"),
          messageColumns: new Set<string>(columnsResult.rows.map((row: any) => row.column_name)),
        };
      } finally {
        await pool.end();
      }
    })().catch((error) => {
      postgresChatSchemaPromise = null;
      throw error;
    });
  }

  return postgresChatSchemaPromise;
}

async function getPostgresConversations() {
  if (!hasUsableDatabaseUrl()) {
    return [];
  }

  const schema = await getPostgresChatSchema();
  if (!schema.hasMessagesTable) {
    return [];
  }

  const pool = createPool();
  try {
    if (!schema.hasConversationsTable) {
      const result = await pool.query(`
        with ranked_messages as (
          select
            case
              when sender_id in ('admin', 'bot', 'staff') then recipient_id
              else sender_id
            end as conversation_id,
            sender_id,
            recipient_id,
            content,
            created_at,
            id,
            row_number() over (
              partition by case
                when sender_id in ('admin', 'bot', 'staff') then recipient_id
                else sender_id
              end
              order by created_at desc, id desc
            ) as row_num
          from messages
          where coalesce(sender_id, '') <> ''
            and coalesce(recipient_id, '') <> ''
        )
        select
          ranked_messages.conversation_id as id,
          ranked_messages.conversation_id as client_id,
          'open' as status,
          'support' as type,
          ranked_messages.id as last_message_id,
          ranked_messages.content as last_message_text,
          ranked_messages.created_at as last_message_at,
          ranked_messages.sender_id as last_message_sender_id,
          0 as admin_unread_count,
          null::text as assigned_admin_id,
          ranked_messages.created_at as created_at,
          profiles.full_name as profile_full_name,
          profiles.email as profile_email
        from ranked_messages
        join profiles
          on profiles.id = ranked_messages.conversation_id
        where row_num = 1
          and ranked_messages.conversation_id is not null
          and coalesce(profiles.role, 'client') <> 'admin'
        order by ranked_messages.created_at desc nulls last
      `);
      return result.rows;
    }

    const result = await pool.query(`
      select
        id,
        client_id,
        status,
        type,
        last_message_id,
        last_message_text,
        last_message_at,
        last_message_sender_id,
        admin_unread_count,
        assigned_admin_id,
        created_at
      from conversations
      order by coalesce(last_message_at, created_at) desc nulls last
    `);
    return result.rows;
  } finally {
    await pool.end();
  }
}

async function getPostgresMessages(conversationId: string) {
  if (!hasUsableDatabaseUrl()) {
    return [];
  }

  const schema = await getPostgresChatSchema();
  if (!schema.hasMessagesTable) {
    return [];
  }

  const pool = createPool();
  try {
    if (!schema.messageColumns.has("conversation_id")) {
      const result = await pool.query(
        `
          select
            id,
            sender_id,
            recipient_id,
            content,
            created_at
          from messages
          where sender_id = $1 or recipient_id = $1
          order by created_at asc nulls last, id asc
        `,
        [conversationId],
      );
      return result.rows.map((row: any) => ({
        ...row,
        conversation_id: conversationId,
        text: row.content,
      }));
    }

    const result = await pool.query(
      `
        select
          id,
          conversation_id,
          sender_id,
          sender_role,
          recipient_id,
          message_type,
          text,
          content,
          attachment_url,
          attachment_name,
          attachment_mime_type,
          attachment_size,
          status,
          created_at,
          sent_at,
          client_message_id,
          is_automated,
          sender_type
        from messages
        where conversation_id = $1
        order by coalesce(created_at, sent_at) asc nulls last
      `,
      [conversationId],
    );
    return result.rows;
  } finally {
    await pool.end();
  }
}

async function getPostgresConversation(conversationId: string) {
  if (!hasUsableDatabaseUrl()) {
    return null;
  }

  const schema = await getPostgresChatSchema();
  if (!schema.hasMessagesTable) {
    return null;
  }

  const pool = createPool();
  try {
    if (!schema.hasConversationsTable) {
      const result = await pool.query(
        `
          select
            id,
            sender_id,
            recipient_id,
            content,
            created_at
          from messages
          where sender_id = $1 or recipient_id = $1
          order by created_at desc nulls last, id desc
          limit 1
        `,
        [conversationId],
      );
      const latestMessage = result.rows[0];
      if (!latestMessage) {
        return null;
      }

      return {
        id: conversationId,
        client_id: conversationId,
        status: "open",
        type: "support",
        last_message_id: latestMessage.id,
        last_message_text: latestMessage.content || "No messages yet",
        last_message_at: latestMessage.created_at || new Date().toISOString(),
        last_message_sender_id: latestMessage.sender_id || "admin",
        client_unread_count: 0,
        admin_unread_count: 0,
        chatbot_enabled: true,
        assigned_admin_id: null,
        created_at: latestMessage.created_at || new Date().toISOString(),
        updated_at: latestMessage.created_at || new Date().toISOString(),
      };
    }

    const result = await pool.query(
      `
        select
          id,
          client_id,
          status,
          type,
          last_message_id,
          last_message_text,
          last_message_at,
          last_message_sender_id,
          client_unread_count,
          admin_unread_count,
          chatbot_enabled,
          assigned_admin_id,
          created_at,
          updated_at
        from conversations
        where id = $1
        limit 1
      `,
      [conversationId],
    );
    return result.rows[0] ?? null;
  } finally {
    await pool.end();
  }
}

async function ensurePostgresConversation(conversationId: string) {
  if (!hasUsableDatabaseUrl()) {
    return null;
  }

  const schema = await getPostgresChatSchema();
  if (!schema.hasMessagesTable) {
    return null;
  }

  if (!schema.hasConversationsTable) {
    return {
      id: conversationId,
      client_id: conversationId,
      status: "open",
      type: "support",
      client_unread_count: 0,
      admin_unread_count: 0,
      chatbot_enabled: true,
    };
  }

  const pool = createPool();
  try {
    const existing = await pool.query(
      `
        select *
        from conversations
        where id = $1
        limit 1
      `,
      [conversationId],
    );

    if (existing.rows[0]) {
      return existing.rows[0];
    }

    const inserted = await pool.query(
      `
        insert into conversations (
          id,
          client_id,
          status,
          type,
          client_unread_count,
          admin_unread_count,
          chatbot_enabled
        )
        values ($1, $1, 'open', 'support', 0, 0, true)
        returning *
      `,
      [conversationId],
    );

    return inserted.rows[0] ?? null;
  } finally {
    await pool.end();
  }
}

async function insertPostgresMessages(rows: any[]) {
  if (!hasUsableDatabaseUrl() || rows.length === 0) {
    return [];
  }

  const schema = await getPostgresChatSchema();
  if (!schema.hasMessagesTable) {
    return [];
  }

  const pool = createPool();
  try {
    const inserted: any[] = [];
    for (const row of rows) {
      if (!schema.messageColumns.has("conversation_id")) {
        const result = await pool.query(
          `
            insert into messages (
              sender_id,
              recipient_id,
              content,
              created_at
            )
            values ($1, $2, $3, $4)
            returning *
          `,
          [
            row.sender_id,
            row.recipient_id,
            row.text,
            row.sent_at ?? new Date().toISOString(),
          ],
        );
        if (result.rows[0]) {
          inserted.push({
            ...result.rows[0],
            conversation_id: row.conversation_id,
            text: result.rows[0].content,
            client_message_id: row.client_message_id,
            sender_role: row.sender_role,
            message_type: row.message_type,
            status: row.status,
            is_automated: row.is_automated ?? false,
            sender_type: row.sender_type ?? row.sender_role,
          });
        }
        continue;
      }

      const result = await pool.query(
        `
          insert into messages (
            conversation_id,
            sender_id,
            sender_role,
            recipient_id,
            message_type,
            text,
            attachment_url,
            attachment_name,
            attachment_mime_type,
            attachment_size,
            client_message_id,
            status,
            is_automated,
            sender_type,
            sent_at
          )
          values (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
          )
          returning *
        `,
        [
          row.conversation_id,
          row.sender_id,
          row.sender_role,
          row.recipient_id,
          row.message_type,
          row.text,
          row.attachment_url ?? null,
          row.attachment_name ?? null,
          row.attachment_mime_type ?? null,
          row.attachment_size ?? null,
          row.client_message_id,
          row.status,
          row.is_automated ?? false,
          row.sender_type ?? row.sender_role,
          row.sent_at ?? new Date().toISOString(),
        ],
      );
      if (result.rows[0]) {
        inserted.push(result.rows[0]);
      }
    }

    return inserted;
  } finally {
    await pool.end();
  }
}

async function updatePostgresConversationAfterSend(params: {
  conversationId: string;
  senderId: string;
  senderRole: "client" | "admin" | "staff";
  activeConversation: any;
  finalMessageId: any;
  finalMessageText: string;
  finalMessageAt: string;
  finalMessageSenderId: string;
  willTriggerBot: boolean;
}) {
  if (!hasUsableDatabaseUrl()) {
    return null;
  }

  const schema = await getPostgresChatSchema();
  if (!schema.hasConversationsTable) {
    return {
      id: params.conversationId,
      client_id: params.conversationId,
      status: "open",
      type: "support",
      last_message_id: params.finalMessageId,
      last_message_text: params.finalMessageText,
      last_message_at: params.finalMessageAt,
      last_message_sender_id: params.finalMessageSenderId,
      admin_unread_count:
        params.senderRole === "client"
          ? (params.activeConversation?.admin_unread_count || 0) + 1
          : params.activeConversation?.admin_unread_count || 0,
      client_unread_count:
        params.senderRole === "client"
          ? (params.activeConversation?.client_unread_count || 0) + (params.willTriggerBot ? 1 : 0)
          : (params.activeConversation?.client_unread_count || 0) + 1,
      chatbot_enabled: params.activeConversation?.chatbot_enabled ?? true,
      assigned_admin_id: params.activeConversation?.assigned_admin_id || null,
      created_at: params.finalMessageAt,
      updated_at: params.finalMessageAt,
    };
  }

  const pool = createPool();
  try {
    const adminUnreadCount =
      params.senderRole === "client"
        ? (params.activeConversation?.admin_unread_count || 0) + 1
        : params.activeConversation?.admin_unread_count || 0;
    const clientUnreadCount =
      params.senderRole === "client"
        ? (params.activeConversation?.client_unread_count || 0) + (params.willTriggerBot ? 1 : 0)
        : (params.activeConversation?.client_unread_count || 0) + 1;

    const result = await pool.query(
      `
        update conversations
        set
          status = 'open',
          last_message_id = $2,
          last_message_text = $3,
          last_message_at = $4,
          last_message_sender_id = $5,
          admin_unread_count = $6,
          client_unread_count = $7,
          updated_at = now()
        where id = $1
        returning *
      `,
      [
        params.conversationId,
        params.finalMessageId,
        params.finalMessageText,
        params.finalMessageAt,
        params.finalMessageSenderId,
        adminUnreadCount,
        clientUnreadCount,
      ],
    );

    return result.rows[0] ?? null;
  } finally {
    await pool.end();
  }
}

let ioInstance: Server | null = null;

export function setMessageServiceIo(io: Server) {
  ioInstance = io;
}

type ClearConversationOptions = {
  includeWelcomeMessage?: boolean;
};

export async function sendMessage(
  senderId: string,
  senderRole: "client" | "admin" | "staff",
  payload: MessagePayload
): Promise<SendMessageResult> {
  const {
    text,
    clientMessageId,
    messageType = "text",
    attachmentUrl,
    attachmentName,
    attachmentMimeType,
    attachmentSize,
  } = payload;
  const conversationId = payload.conversationId || senderId;

  console.log(
    `[Message Service] sendMessage: sender=${senderId} (${senderRole}), conversation=${conversationId}, text="${text}", type="${messageType}"`,
  );

  // 1. Validate message
  const trimmedText = text ? text.trim() : "";
  const hasAttachment = Boolean(attachmentUrl);
  if (!trimmedText && !hasAttachment) {
    return { success: false, error: "Message text or attachment is required", clientMessageId };
  }
  if (trimmedText.length > 5000) {
    return { success: false, error: "Message is too long (maximum 5000 characters)", clientMessageId };
  }
  const resolvedMessageType = hasAttachment ? messageType : "text";
  const lastMessagePreview = trimmedText || attachmentName || (resolvedMessageType === "image" ? "Photo" : "Attachment");
  const botInputText = trimmedText || attachmentName || (resolvedMessageType === "image" ? "image attachment" : "attachment");

  try {
    const isNew = await hasNewSchema();
    let activeConversation: any = null;

    if (isNew) {
      // 2. Resolve or create support conversation
      const { data: conversation, error: convError } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", conversationId)
        .maybeSingle();

      if (convError) throw convError;

      activeConversation = conversation;
      if (!activeConversation) {
        console.log(`[Message Service] Conversation ${conversationId} not found. Creating new conversation.`);
        const { data: newConv, error: createError } = await supabase
          .from("conversations")
          .insert([
            {
              id: conversationId,
              client_id: conversationId,
              status: "open",
              type: "support",
              client_unread_count: 0,
              admin_unread_count: 0,
              chatbot_enabled: true,
            },
          ])
          .select()
          .single();

        if (createError) throw createError;
        activeConversation = newConv;

        // Emit conversation_created to admins
        if (ioInstance) {
          ioInstance.to("admins").emit("conversation_created", activeConversation);
        }
      } else {
        // Reopen closed/resolved conversations
        if (activeConversation.status === "closed" || activeConversation.status === "resolved") {
          const { data: updatedConv, error: updateStatusError } = await supabase
            .from("conversations")
            .update({ status: "open", updated_at: new Date().toISOString() })
            .eq("id", conversationId)
            .select()
            .single();
          if (updateStatusError) throw updateStatusError;
          activeConversation = updatedConv;
        }
      }
    } else {
      activeConversation = await ensurePostgresConversation(conversationId);
      if (!activeConversation) {
        // Old schema fallback: use mock conversation
        activeConversation = {
          id: conversationId,
          client_id: conversationId,
          status: "open",
          type: "support",
          client_unread_count: 0,
          admin_unread_count: 0,
          chatbot_enabled: true,
        };
      }
    }

    // Determine chatbot response first so we can save both client and bot messages to Supabase concurrently
    let botReply = "";
    const willTriggerBot = senderRole === "client" && (activeConversation.chatbot_enabled !== false);
    
    if (willTriggerBot) {
      try {
        botReply = await getChatbotResponseText(botInputText, conversationId);
      } catch (botErr) {
        console.error(`[Chatbot] Failed to determine reply, using fallback:`, botErr);
        botReply = "Thanks for contacting 9Jobs. Your message has been received and shared with our support team. An admin will respond shortly.";
      }
    }

    // 3. Save messages in local DB
    const localMsg = await insertLocalMessage({
      conversation_id: conversationId,
      sender_id: senderId,
      sender_role: senderRole,
      recipient_id: senderRole === "client" ? "admin" : conversationId,
      message_type: resolvedMessageType,
      text: trimmedText,
      attachment_url: attachmentUrl,
      attachment_name: attachmentName,
      attachment_mime_type: attachmentMimeType,
      attachment_size: attachmentSize,
      client_message_id: clientMessageId,
      status: "sent",
      is_automated: false,
      sender_type: senderRole,
    });

    let savedMessage: any = {
      ...localMsg,
      content: trimmedText,
    };

    let savedBotMsg: any = null;
    const botMessageId = "bot_" + Math.random().toString(36).substring(2) + "_" + Date.now();

    if (willTriggerBot) {
      const localBotMsg = await insertLocalMessage({
        conversation_id: conversationId,
        sender_id: "bot",
        sender_role: "admin",
        recipient_id: conversationId,
        message_type: "text",
        text: botReply,
        client_message_id: botMessageId,
        status: "delivered",
        is_automated: true,
        sender_type: "bot",
      });

      savedBotMsg = {
        ...localBotMsg,
        content: botReply,
      };
    }

    // 4. Emit message events through Socket.IO IMMEDIATELY for instant client updates
    if (ioInstance) {
      // Emit client message immediately
      const mappedMsg = {
        ...savedMessage,
        content: savedMessage.text || savedMessage.content || "",
      };
      ioInstance.to(`conversation:${conversationId}`).emit("new_message", mappedMsg);

      ioInstance.to(`user:${senderId}`).emit("message_acknowledged", {
        success: true,
        message: mappedMsg,
        conversation: activeConversation,
        clientMessageId,
      });

      // Emit bot message immediately
      if (willTriggerBot && savedBotMsg) {
        const mappedBotMsg = {
          ...savedBotMsg,
          content: savedBotMsg.text || savedBotMsg.content || "",
        };
        ioInstance.to(`conversation:${conversationId}`).emit("chatbot_typing", { typing: false });
        ioInstance.to(`conversation:${conversationId}`).emit("new_message", mappedBotMsg);
      }

      ioInstance.to("admins").emit("conversation_updated", activeConversation);
      ioInstance.to(`user:${conversationId}`).emit("unread_count_updated", {
        clientUnreadCount: activeConversation.client_unread_count + (willTriggerBot ? 1 : 0),
        adminUnreadCount: activeConversation.admin_unread_count + (senderRole === "client" ? 1 : 0),
      });
    }

    // 5. Batch sync to Supabase (saves network roundtrips)
    try {
      if (isNew) {
        const insertPayloads: any[] = [];
        
        insertPayloads.push({
          conversation_id: conversationId,
          sender_id: senderId,
          sender_role: senderRole,
          recipient_id: senderRole === "client" ? "admin" : conversationId,
          message_type: resolvedMessageType,
          text: trimmedText,
          attachment_url: attachmentUrl,
          attachment_name: attachmentName,
          attachment_mime_type: attachmentMimeType,
          attachment_size: attachmentSize,
          client_message_id: clientMessageId,
          status: "sent",
          is_automated: false,
          sender_type: senderRole,
          sent_at: new Date().toISOString(),
        });
        
        if (willTriggerBot) {
          insertPayloads.push({
            conversation_id: conversationId,
            sender_id: "bot",
            sender_role: "admin",
            recipient_id: conversationId,
            message_type: "text",
            text: botReply,
            client_message_id: botMessageId,
            status: "delivered",
            is_automated: true,
            sender_type: "bot",
            sent_at: new Date().toISOString(),
          });
        }

        const { data: insertedData, error: msgError } = await supabase
          .from("messages")
          .insert(insertPayloads)
          .select();

        if (msgError) {
          console.warn("[Message Service] Supabase batch insert failed:", msgError.message);
        } else if (insertedData) {
          const clientData = insertedData.find((m: any) => m.client_message_id === clientMessageId);
          if (clientData) savedMessage.id = clientData.id;
          
          if (willTriggerBot) {
            const botData = insertedData.find((m: any) => m.client_message_id === botMessageId);
            if (botData) savedBotMsg.id = botData.id;
          }
        }
      } else if (hasUsableDatabaseUrl()) {
        const insertedData = await insertPostgresMessages(
          [
            {
              conversation_id: conversationId,
              sender_id: senderId,
              sender_role: senderRole,
              recipient_id: senderRole === "client" ? "admin" : conversationId,
              message_type: resolvedMessageType,
              text: trimmedText,
              attachment_url: attachmentUrl,
              attachment_name: attachmentName,
              attachment_mime_type: attachmentMimeType,
              attachment_size: attachmentSize,
              client_message_id: clientMessageId,
              status: "sent",
              is_automated: false,
              sender_type: senderRole,
              sent_at: new Date().toISOString(),
            },
            ...(willTriggerBot
              ? [
                  {
                    conversation_id: conversationId,
                    sender_id: "bot",
                    sender_role: "admin",
                    recipient_id: conversationId,
                    message_type: "text",
                    text: botReply,
                    client_message_id: botMessageId,
                    status: "delivered",
                    is_automated: true,
                    sender_type: "bot",
                    sent_at: new Date().toISOString(),
                  },
                ]
              : []),
          ],
        );

        const clientData = insertedData.find((m: any) => m.client_message_id === clientMessageId);
        if (clientData) {
          savedMessage.id = clientData.id;
          savedMessage.created_at = clientData.created_at || savedMessage.created_at;
        }

        if (willTriggerBot && savedBotMsg) {
          const botData = insertedData.find((m: any) => m.client_message_id === botMessageId);
          if (botData) {
            savedBotMsg.id = botData.id;
            savedBotMsg.created_at = botData.created_at || savedBotMsg.created_at;
          }
        }
      } else {
        const { data, error: msgError } = await supabase
          .from("messages")
          .insert([
            {
              sender_id: senderId,
              recipient_id: senderRole === "client" ? "admin" : conversationId,
              content: trimmedText,
            },
          ])
          .select()
          .single();

        if (msgError) {
          console.warn("[Message Service] Supabase old-schema insert failed (using local DB fallback):", msgError.message);
        } else {
          savedMessage.id = data.id;
        }
      }
    } catch (err: any) {
      console.warn("[Message Service] Supabase insert threw exception:", err.message);
    }

    // 6. Update conversation unread counts and last message fields
    let updatedConversation = activeConversation;
    const localConv = await getLocalConversation(conversationId);
    if (localConv) {
      updatedConversation = {
        ...updatedConversation,
        ...localConv,
      };
    }

    try {
      if (isNew) {
        const updatePayload: any = {
          last_message_id: willTriggerBot ? (savedBotMsg.id || botMessageId) : savedMessage.id,
          last_message_text: willTriggerBot ? botReply : lastMessagePreview,
          last_message_at: willTriggerBot ? savedBotMsg.created_at : savedMessage.created_at,
          last_message_sender_id: willTriggerBot ? "bot" : senderId,
          updated_at: new Date().toISOString(),
        };

        if (senderRole === "client") {
          updatePayload.admin_unread_count = (activeConversation.admin_unread_count || 0) + 1;
          if (willTriggerBot) {
            updatePayload.client_unread_count = (activeConversation.client_unread_count || 0) + 1;
          }
        } else {
          updatePayload.client_unread_count = (activeConversation.client_unread_count || 0) + 1;
        }

        const { data: updatedConv, error: updateConvError } = await supabase
          .from("conversations")
          .update(updatePayload)
          .eq("id", conversationId)
          .select()
          .single();

        if (!updateConvError && updatedConv) {
          updatedConversation = {
            ...updatedConversation,
            ...updatedConv,
          };
          
          // Emit updated conversation to admins after DB saves complete
          if (ioInstance) {
            ioInstance.to("admins").emit("conversation_updated", updatedConversation);
          }
        }
      } else if (hasUsableDatabaseUrl()) {
        const updatedConv = await updatePostgresConversationAfterSend({
          conversationId,
          senderId,
          senderRole,
          activeConversation,
          finalMessageId: willTriggerBot ? (savedBotMsg?.id || botMessageId) : savedMessage.id,
          finalMessageText: willTriggerBot ? botReply : lastMessagePreview,
          finalMessageAt: willTriggerBot ? savedBotMsg?.created_at : savedMessage.created_at,
          finalMessageSenderId: willTriggerBot ? "bot" : senderId,
          willTriggerBot,
        });

        if (updatedConv) {
          updatedConversation = {
            ...updatedConversation,
            ...updatedConv,
          };

          if (ioInstance) {
            ioInstance.to("admins").emit("conversation_updated", updatedConversation);
          }
        }
      }
    } catch (err: any) {
      console.warn("[Message Service] Supabase conversation update failed:", err.message);
    }

    return {
      success: true,
      message: { ...savedMessage, content: savedMessage.text },
      botMessage: willTriggerBot ? { ...savedBotMsg, content: savedBotMsg.text } : undefined,
      conversation: updatedConversation,
      clientMessageId,
    };
  } catch (err: any) {
    console.error(`[Message Service] sendMessage failed:`, err);
    return {
      success: false,
      error: err.message || "Internal database error",
      clientMessageId,
    };
  }
}

async function triggerChatbotResponse(clientId: string, clientMessage: string) {
  console.log(`[Chatbot] Triggered for user ${clientId}: "${clientMessage}"`);

  if (ioInstance) {
    ioInstance.to(`conversation:${clientId}`).emit("chatbot_typing", { typing: true });
  }

  let botReply = "";
  try {
    botReply = await getChatbotResponseText(clientMessage, clientId);
  } catch (err) {
    console.error(`[Chatbot] Failed to determine reply, using fallback:`, err);
    botReply = "Thanks for contacting 9Jobs. Your message has been received and shared with our support team. An admin will respond shortly.";
  }

  try {
    const isNew = await hasNewSchema();
    const botMessageId = "bot_" + Math.random().toString(36).substring(2) + "_" + Date.now();

    // 1. Save to local DB first
    const localBotMsg = await insertLocalMessage({
      conversation_id: clientId,
      sender_id: "bot",
      sender_role: "admin",
      recipient_id: clientId,
      message_type: "text",
      text: botReply,
      client_message_id: botMessageId,
      status: "delivered",
      is_automated: true,
      sender_type: "bot",
    });

    let savedBotMsg: any = {
      ...localBotMsg,
      content: botReply,
    };

    // 2. Attempt Supabase sync
    try {
      if (isNew) {
        const botMessagePayload = {
          conversation_id: clientId,
          sender_id: "bot",
          sender_role: "admin",
          recipient_id: clientId,
          message_type: "text",
          text: botReply,
          client_message_id: botMessageId,
          status: "delivered",
          is_automated: true,
          sender_type: "bot",
          sent_at: new Date().toISOString(),
        };

        const { data, error: insertErr } = await supabase
          .from("messages")
          .insert([botMessagePayload])
          .select()
          .single();

        if (insertErr) {
          console.warn("[Chatbot] Supabase insert failed (using local DB fallback):", insertErr.message);
        } else {
          savedBotMsg.id = data.id;
        }
      } else {
        const { data, error: insertErr } = await supabase
          .from("messages")
          .insert([
            {
              sender_id: "admin",
              recipient_id: clientId,
              content: botReply,
            },
          ])
          .select()
          .single();

        if (insertErr) {
          console.warn("[Chatbot] Supabase old-schema insert failed (using local DB fallback):", insertErr.message);
        } else {
          savedBotMsg.id = data.id;
        }
      }
    } catch (err: any) {
      console.warn("[Chatbot] Supabase insert threw exception:", err.message);
    }

    // Update conversation last message details
    let updatedConv: any = null;
    const localConv = await getLocalConversation(clientId);
    if (localConv) {
      updatedConv = {
        ...localConv,
        id: clientId,
        client_id: clientId,
        status: "open",
        type: "support",
      };
    }

    try {
      if (isNew) {
        const { data: conversation } = await supabase
          .from("conversations")
          .select("*")
          .eq("id", clientId)
          .maybeSingle();

        const { data, error: updateErr } = await supabase
          .from("conversations")
          .update({
            last_message_id: savedBotMsg.id,
            last_message_text: botReply,
            last_message_at: savedBotMsg.created_at,
            last_message_sender_id: "bot",
            client_unread_count: ((conversation?.client_unread_count || 0) + 1),
            updated_at: new Date().toISOString(),
          })
          .eq("id", clientId)
          .select()
          .single();

        if (!updateErr && data) {
          updatedConv = {
            ...updatedConv,
            ...data,
          };
        }
      }
    } catch (err: any) {
      console.warn("[Chatbot] Supabase conversation update failed:", err.message);
    }

    const mappedBotMsg = {
      ...savedBotMsg,
      content: savedBotMsg.text || savedBotMsg.content || "",
    };

    // Emit bot message and typing stop
    if (ioInstance) {
      ioInstance.to(`conversation:${clientId}`).emit("chatbot_typing", { typing: false });
      ioInstance.to(`conversation:${clientId}`).emit("new_message", mappedBotMsg);
      ioInstance.to("admins").emit("conversation_updated", updatedConv);
      ioInstance.to(`user:${clientId}`).emit("unread_count_updated", {
        clientUnreadCount: updatedConv?.client_unread_count ?? 0,
        adminUnreadCount: updatedConv?.admin_unread_count ?? 0,
      });
    }

    console.log(`[Chatbot] Reply sent: "${botReply}"`);
    return mappedBotMsg;
  } catch (err) {
    console.error(`[Chatbot] Error saving bot message:`, err);
    if (ioInstance) {
      ioInstance.to(`conversation:${clientId}`).emit("chatbot_typing", { typing: false });
    }
    throw err;
  }
}


async function getChatbotResponseText(userMessage: string, clientId: string): Promise<string> {
  const query = userMessage.toLowerCase().trim();

  // 1. Greeting intent
  if (
    query === "hi" ||
    query === "hello" ||
    query === "hey" ||
    query.startsWith("hi ") ||
    query.startsWith("hello ") ||
    query.startsWith("hey ") ||
    query.includes("good morning") ||
    query.includes("good evening")
  ) {
    return "Hello! Welcome to 9Jobs support. How can I help you with your job search today?";
  }

  // 2. Services intent
  if (
    query.includes("services") ||
    query.includes("what do you do") ||
    query.includes("how can you help") ||
    query.includes("9jobs help")
  ) {
    return "9Jobs supports clients with ATS resume preparation, cover letters, LinkedIn and SEEK optimisation, targeted job applications, recruiter follow-ups, application tracking, and interview support.";
  }

  // 3. Application status intent (fetch real applications count)
  if (
    query.includes("application status") ||
    query.includes("how many applications") ||
    query.includes("how many jobs") ||
    query.includes("my progress") ||
    query.includes("applied jobs")
  ) {
    try {
      const { count, error } = await supabase
        .from("applications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", clientId);

      if (!error && count !== null) {
        return `We have submitted ${count} targeted job applications on your behalf so far. You can track their status and details in the Tracker tab of the app!`;
      }
    } catch (err) {
      console.warn(`[Chatbot] Failed to fetch application count:`, err);
    }
    return "9Jobs can assist with tracking your job applications. Please review the Tracker tab in the app or ask our team for details.";
  }

  // 4. Interview prep intent (fetch real interviews)
  if (
    query.includes("interview") ||
    query.includes("interview preparation") ||
    query.includes("interview help")
  ) {
    try {
      const { data: interviews, error } = await supabase
        .from("interviews")
        .select("*")
        .eq("client_id", clientId)
        .order("interview_date", { ascending: true });

      if (!error && interviews && interviews.length > 0) {
        const next = interviews[0];
        const dateStr = new Date(next.interview_date).toLocaleDateString("en-AU", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
        return `You have an upcoming interview for the role of '${next.job_title || next.role}' on ${dateStr}. 9Jobs can assist with interview preparation, common questions, and response practice. Please let us know if you need specific prep material!`;
      }
    } catch (err) {
      console.warn(`[Chatbot] Failed to fetch interviews:`, err);
    }
    return "9Jobs can assist with interview preparation, common questions, response practice, and interview follow-up support. Please share the job title and interview date if available.";
  }

  // 5. Resume intent (fetch real ATS score)
  if (
    query.includes("resume") ||
    query.includes("cv") ||
    query.includes("ats") ||
    query.includes("resume score")
  ) {
    try {
      const { data: scoreData, error } = await supabase
        .from("resume_scores")
        .select("score")
        .eq("user_id", clientId)
        .maybeSingle();

      if (!error && scoreData && scoreData.score !== undefined && scoreData.score !== null) {
        return `Your latest resume ATS score is ${scoreData.score}/100. Navigate to the 'Optimize' section to get detailed feedback and recommendations to improve your score!`;
      }
    } catch (err) {
      console.warn(`[Chatbot] Failed to fetch resume score:`, err);
    }
    return "9Jobs can help prepare and optimise your resume for Australian employers and ATS systems.";
  }

  // 6. Payment intent
  if (
    query.includes("payment") ||
    query.includes("invoice") ||
    query.includes("price") ||
    query.includes("plan") ||
    query.includes("subscription")
  ) {
    return "For payment, invoice, or plan-related questions, please share the relevant details and the 9Jobs support team will assist you.";
  }

  // 7. Human support intent
  if (
    query.includes("admin") ||
    query.includes("human") ||
    query.includes("consultant") ||
    query.includes("call me") ||
    query.includes("talk to someone")
  ) {
    return "I’ve notified the 9Jobs support team. An admin will review this conversation and respond as soon as possible.";
  }

  // 8. Thanks intent
  if (query === "thanks" || query === "thank you" || query.startsWith("thanks ") || query.startsWith("thank you ")) {
    return "You’re welcome! Please message us anytime you need assistance with your job search.";
  }

  // 9. Fallback response
  return "Thanks for contacting 9Jobs. Your message has been received and shared with our support team. An admin will respond shortly.";
}

export async function deleteMessage(
  senderId: string,
  role: "client" | "admin" | "staff",
  messageId: string,
  targetConversationId?: string
): Promise<{ success: boolean; error?: string }> {
  const conversationId = targetConversationId || senderId;
  console.log(`[Message Service] deleteMessage: sender=${senderId} (${role}), message=${messageId}, conversation=${conversationId}`);

  try {
    const isNew = await hasNewSchema();
    let supabaseDeleted = false;
    let localDeleted = false;

    // 1. Try to delete from local DB
    localDeleted = await deleteLocalMessage(messageId);

    // 2. Try to delete from Supabase
    try {
      const { data: msg, error: fetchErr } = await supabase
        .from("messages")
        .select("*")
        .eq("id", messageId)
        .maybeSingle();

      if (!fetchErr && msg) {
        // Verify ownership: Client can only delete their own messages
        if (role === "client") {
          const msgSender = msg.sender_id;
          if (msgSender !== senderId) {
            return { success: false, error: "Unauthorized: Cannot delete messages sent by others" };
          }
        }

        const { error: deleteErr } = await supabase
          .from("messages")
          .delete()
          .eq("id", messageId);

        if (!deleteErr) {
          supabaseDeleted = true;
        }
      }
    } catch (sbErr: any) {
      console.warn("[Message Service] Supabase delete error:", sbErr.message);
    }

    if (!localDeleted && !supabaseDeleted) {
      return { success: false, error: "Message not found" };
    }

    // Emit live delete event
    if (ioInstance) {
      ioInstance.to(`conversation:${conversationId}`).emit("message_deleted", {
        conversationId,
        messageId,
      });
      ioInstance.to("admins").emit("message_deleted", {
        conversationId,
        messageId,
      });
    }

    return { success: true };
  } catch (err: any) {
    console.error("[Message Service] deleteMessage failed:", err);
    return { success: false, error: err.message };
  }
}

export async function updateMessage(
  senderId: string,
  role: "client" | "admin" | "staff",
  messageId: string,
  text: string,
  targetConversationId?: string
): Promise<{ success: boolean; message?: any; error?: string }> {
  const conversationId = targetConversationId || senderId;
  console.log(`[Message Service] updateMessage: sender=${senderId} (${role}), message=${messageId}, text="${text}"`);

  const trimmedText = text ? text.trim() : "";
  if (!trimmedText) {
    return { success: false, error: "Message text is required" };
  }

  try {
    const isNew = await hasNewSchema();
    let supabaseUpdated = false;
    let localUpdated = false;
    let updatedMsgPayload: any = null;

    // 1. Try to update in local DB
    localUpdated = await updateLocalMessage(messageId, trimmedText);

    // 2. Try to update in Supabase
    try {
      const { data: msg, error: fetchErr } = await supabase
        .from("messages")
        .select("*")
        .eq("id", messageId)
        .maybeSingle();

      if (!fetchErr && msg) {
        // Verify ownership: Client can only edit their own messages
        if (role === "client" && msg.sender_id !== senderId) {
          return { success: false, error: "Unauthorized: Cannot edit messages sent by others" };
        }

        const updatePayload: any = {};
        if (msg.hasOwnProperty("text")) {
          updatePayload.text = trimmedText;
        }
        if (msg.hasOwnProperty("content")) {
          updatePayload.content = trimmedText;
        }

        const { data: updatedMsg, error: updateErr } = await supabase
          .from("messages")
          .update(updatePayload)
          .eq("id", messageId)
          .select()
          .single();

        if (!updateErr && updatedMsg) {
          supabaseUpdated = true;
          updatedMsgPayload = {
            ...updatedMsg,
            content: updatedMsg.text || updatedMsg.content || trimmedText,
          };
        }
      }
    } catch (sbErr: any) {
      console.warn("[Message Service] Supabase update error:", sbErr.message);
    }

    if (!localUpdated && !supabaseUpdated) {
      return { success: false, error: "Message not found" };
    }

    // 3. Fallback/Standard message payload if not returned by Supabase
    if (!updatedMsgPayload) {
      updatedMsgPayload = {
        id: messageId,
        conversation_id: conversationId,
        sender_id: senderId,
        sender_role: role,
        text: trimmedText,
        content: trimmedText,
        message_type: "text",
        created_at: new Date().toISOString(),
      };
    }

    // 4. Update last message of the conversation if needed in Supabase
    try {
      if (isNew) {
        const { data: conv } = await supabase
          .from("conversations")
          .select("*")
          .eq("id", conversationId)
          .maybeSingle();

        if (conv && (conv.last_message_id === messageId || conv.last_message_text === trimmedText)) {
          await supabase
            .from("conversations")
            .update({ last_message_text: trimmedText.substring(0, 200) })
            .eq("id", conversationId);
        }
      }
    } catch (convErr: any) {
      console.warn("[Message Service] Supabase conversation last message update error:", convErr.message);
    }

    // 5. Emit live update events via Socket.IO
    if (ioInstance) {
      const socketPayload = {
        conversationId,
        messageId,
        message: updatedMsgPayload,
      };
      ioInstance.to(`conversation:${conversationId}`).emit("message_updated", socketPayload);
      ioInstance.to("admins").emit("message_updated", socketPayload);
    }

    return { success: true, message: updatedMsgPayload };
  } catch (err: any) {
    console.error("[Message Service] updateMessage failed:", err);
    return { success: false, error: err.message };
  }
}


export async function clearConversation(
  senderId: string,
  role: "client" | "admin" | "staff",
  targetConversationId: string,
  options: ClearConversationOptions = {}
): Promise<{ success: boolean; error?: string }> {
  console.log(`[Message Service] clearConversation: sender=${senderId} (${role}), conversation=${targetConversationId}`);

  try {
    const isNew = await hasNewSchema();
    const includeWelcomeMessage = options.includeWelcomeMessage === true;

    // Verify access
    if (role === "client" && targetConversationId !== senderId) {
      return { success: false, error: "Unauthorized access" };
    }

    // 1. Clear local DB conversation history
    await clearLocalConversation(targetConversationId);

    // 2. Reset conversation state locally
    const baseConversationState = {
      client_unread_count: 0,
      admin_unread_count: 0,
      chatbot_enabled: true,
      status: "open" as const,
      last_message_id: null,
      last_message_text: null,
      last_message_at: null,
      last_message_sender_id: null,
    };
    await updateLocalConversation(targetConversationId, baseConversationState);

    let welcomeMsg: any = null;
    const welcomeText = DEFAULT_SUPPORT_WELCOME_MESSAGE;
    const botMessageId = "bot_welcome_" + Date.now();
    if (includeWelcomeMessage) {
      welcomeMsg = await insertLocalMessage({
        conversation_id: targetConversationId,
        sender_id: "bot",
        sender_role: "admin",
        recipient_id: targetConversationId,
        message_type: "text",
        text: welcomeText,
        client_message_id: botMessageId,
        status: "delivered",
        is_automated: true,
        sender_type: "bot",
      });
    }

    // 3. Attempt to clear and insert welcome message in Supabase (non-blocking)
    try {
      if (isNew) {
        // Delete messages
        await supabase
          .from("messages")
          .delete()
          .eq("conversation_id", targetConversationId);

        // Reset conversation
        await supabase
          .from("conversations")
          .update({
            last_message_id: null,
            last_message_text: includeWelcomeMessage ? welcomeText : null,
            last_message_at: includeWelcomeMessage ? new Date().toISOString() : null,
            last_message_sender_id: includeWelcomeMessage ? "bot" : null,
            client_unread_count: 0,
            admin_unread_count: 0,
            chatbot_enabled: true,
            status: "open",
          })
          .eq("id", targetConversationId);

        if (includeWelcomeMessage) {
          await supabase
            .from("messages")
            .insert([{
              conversation_id: targetConversationId,
              sender_id: "bot",
              sender_role: "admin",
              recipient_id: targetConversationId,
              message_type: "text",
              text: welcomeText,
              client_message_id: botMessageId,
              status: "delivered",
              is_automated: true,
              sender_type: "bot",
              sent_at: new Date().toISOString(),
            }]);
        }
      } else {
        // Delete old messages
        await supabase
          .from("messages")
          .delete()
          .or(`sender_id.eq.${targetConversationId},recipient_id.eq.${targetConversationId}`);

        if (includeWelcomeMessage) {
          await supabase
            .from("messages")
            .insert([{
              sender_id: "admin",
              recipient_id: targetConversationId,
              content: welcomeText,
            }]);
        }
      }
    } catch (dbErr: any) {
      console.warn("[Message Service] Supabase clear database sync failed:", dbErr.message);
    }

    // 4. Emit live clear & boot message events
    if (ioInstance) {
      // Broadcast clear signal
      ioInstance.to(`conversation:${targetConversationId}`).emit("chat_cleared", {
        conversationId: targetConversationId,
      });

      // Invalidate admin list
      const updatedConversationPayload = {
        id: targetConversationId,
        client_id: targetConversationId,
        status: "open",
        type: "support",
        last_message_id: welcomeMsg?.id ?? null,
        last_message_text: includeWelcomeMessage ? welcomeText : null,
        last_message_at: includeWelcomeMessage ? welcomeMsg?.created_at ?? new Date().toISOString() : null,
        last_message_sender_id: includeWelcomeMessage ? "bot" : null,
        client_unread_count: 0,
        admin_unread_count: 0,
        chatbot_enabled: true,
      };
      ioInstance.to("admins").emit("conversation_updated", updatedConversationPayload);
      ioInstance.to(`user:${targetConversationId}`).emit("unread_count_updated", {
        clientUnreadCount: 0,
        adminUnreadCount: 0,
      });

      if (includeWelcomeMessage && welcomeMsg) {
        const mappedWelcome = {
          ...welcomeMsg,
          content: welcomeText,
        };
        ioInstance.to(`conversation:${targetConversationId}`).emit("new_message", mappedWelcome);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error("[Message Service] clearConversation failed:", err);
    return { success: false, error: err.message };
  }
}

export async function startConversation(
  senderId: string,
  role: "client" | "admin" | "staff",
  targetConversationId: string
): Promise<{ success: boolean; error?: string }> {
  return clearConversation(senderId, role, targetConversationId, { includeWelcomeMessage: true });
}

export async function deleteConversation(
  senderId: string,
  role: "client" | "admin" | "staff",
  conversationId: string
): Promise<{ success: boolean; error?: string }> {
  console.log(`[Message Service] deleteConversation: sender=${senderId} (${role}), conversation=${conversationId}`);

  try {
    const isNew = await hasNewSchema();

    await deleteLocalConversation(conversationId);

    try {
      if (isNew) {
        await supabase
          .from("messages")
          .delete()
          .eq("conversation_id", conversationId);

        const { error: convErr } = await supabase
          .from("conversations")
          .delete()
          .eq("id", conversationId);

        if (convErr) throw convErr;
      } else {
        await supabase
          .from("messages")
          .delete()
          .or(`sender_id.eq.${conversationId},recipient_id.eq.${conversationId}`);
      }
    } catch (dbErr: any) {
      console.warn("[Message Service] Supabase delete conversation failed:", dbErr.message);
    }

    if (ioInstance) {
      ioInstance.to(`conversation:${conversationId}`).emit("conversation_deleted", {
        conversationId,
      });
      ioInstance.to("admins").emit("conversation_deleted", {
        conversationId,
      });
    }

    return { success: true };
  } catch (err: any) {
    console.error("[Message Service] deleteConversation failed:", err);
    return { success: false, error: err.message };
  }
}

export async function getConversationsList(): Promise<any[]> {
  const isNew = await hasNewSchema();
  const isServerlessRuntime = Boolean(process.env.VERCEL || process.env.AWS_REGION);
  let supabaseConvs: any[] = [];
  
  try {
    if (isNew) {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .order("last_message_at", { ascending: false });
      if (!error && data) {
        supabaseConvs = data;
      }
    } else {
      // Old schema fallback: Aggregate conversations from the messages log and profiles
      const { data: msgProfiles } = await supabase.from("profiles").select("*");
      const { data: lastMsgs } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: false });

      const profilesById = new Map<string, any>();
      (msgProfiles || []).forEach((profile: any) => {
        if (profile?.id && profile.role !== "admin") {
          profilesById.set(profile.id, profile);
        }
      });

      supabaseConvs = Array.from(profilesById.entries()).flatMap(([cid, profile]) => {
        const userMsgs = (lastMsgs || []).filter((m: any) => {
          const derivedConversationId =
            m.sender_id === "admin" || m.sender_id === "bot" || m.sender_id === "staff"
              ? m.recipient_id
              : m.sender_id;
          return derivedConversationId === cid;
        });
        const lastMsg = userMsgs[0];

        if (!lastMsg) {
          return [];
        }

        return [{
          id: cid,
          client_id: cid,
          status: "open",
          type: "support",
          last_message_id: lastMsg?.id,
          last_message_text: lastMsg?.content || lastMsg?.text || "No messages yet",
          last_message_sender_id: lastMsg?.sender_id || "admin",
          last_message_at: lastMsg?.created_at || new Date().toISOString(),
          client_unread_count: 0,
          admin_unread_count: 0,
          profile_full_name: profile.full_name,
          profile_email: profile.email,
        }];
      });
    }
  } catch (err) {
    console.warn("[Message Service] Failed to fetch Supabase conversations, using local DB:", err);
  }

  if (isServerlessRuntime && supabaseConvs.length === 0) {
    try {
      supabaseConvs = await getPostgresConversations();
    } catch (err) {
      console.warn("[Message Service] Failed to fetch Postgres conversations, using local DB:", err);
    }
  }

  if (isServerlessRuntime && supabaseConvs.length > 0) {
    return supabaseConvs.map((c) => ({
      id: c.id,
      clientId: c.id,
      clientName: c.profile_full_name || `Client (${c.id.substring(0, 8)})`,
      clientEmail: c.profile_email || `${c.id}@9jobs.app`,
      lastMessageText: c.last_message_text || "No messages yet",
      lastMessageSender: c.last_message_sender_id || "bot",
      lastMessageAt: c.last_message_at || c.created_at || new Date().toISOString(),
      adminUnreadCount: c.admin_unread_count || 0,
      status: c.status || "open",
      assignedAdminId: c.assigned_admin_id || null,
    })).sort((a, b) => {
      return b.lastMessageAt.localeCompare(a.lastMessageAt);
    });
  }

  // Get local conversations
  const localConvs = await getLocalConversations();

  // Merge them by id
  const mergedMap = new Map<string, any>();
  for (const c of supabaseConvs) {
    mergedMap.set(c.id, c);
  }
  for (const c of localConvs) {
    mergedMap.set(c.id, {
      ...mergedMap.get(c.id),
      ...c,
    });
  }

  return Array.from(mergedMap.values()).map((c) => ({
    id: c.id,
    clientId: c.id,
    clientName: c.profile_full_name || `Client (${c.id.substring(0, 8)})`,
    clientEmail: c.profile_email || `${c.id}@9jobs.app`,
    lastMessageText: c.last_message_text || "No messages yet",
    lastMessageSender: c.last_message_sender_id || "bot",
    lastMessageAt: c.last_message_at || c.created_at || new Date().toISOString(),
    adminUnreadCount: c.admin_unread_count || 0,
    status: c.status || "open",
    assignedAdminId: c.assigned_admin_id || null,
  })).sort((a, b) => {
    return b.lastMessageAt.localeCompare(a.lastMessageAt);
  });
}

export async function getMessagesHistory(conversationId: string): Promise<any[]> {
  const isNew = await hasNewSchema();
  const isServerlessRuntime = Boolean(process.env.VERCEL || process.env.AWS_REGION);
  let supabaseMsgs: any[] = [];

  try {
    if (isNew) {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (!error && data) {
        supabaseMsgs = data;
      }
    } else {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${conversationId},recipient_id.eq.${conversationId}`)
        .order("created_at", { ascending: true });
      if (!error && data) {
        supabaseMsgs = data;
      }
    }
  } catch (err) {
    console.warn("[Message Service] Failed to fetch Supabase messages:", err);
  }

  if (isServerlessRuntime && supabaseMsgs.length === 0) {
    try {
      supabaseMsgs = await getPostgresMessages(conversationId);
    } catch (err) {
      console.warn("[Message Service] Failed to fetch Postgres messages:", err);
    }
  }

  if (supabaseMsgs.length === 0) {
    const localMsgs = await getLocalMessages(conversationId);
    if (localMsgs.length > 0) {
      console.log(`[Message Service] Syncing local messages to Supabase for conversation: ${conversationId}`);
      try {
        if (isNew) {
          const { data: existingConv } = await supabase
            .from("conversations")
            .select("id")
            .eq("id", conversationId)
            .maybeSingle();

          if (!existingConv) {
            const localConv = await getLocalConversation(conversationId);
            if (localConv) {
              await supabase.from("conversations").insert([
                {
                  id: localConv.id,
                  client_id: localConv.client_id || conversationId,
                  status: localConv.status || "open",
                  type: localConv.type || "support",
                  chatbot_enabled: localConv.chatbot_enabled ?? true,
                  created_at: localConv.created_at || new Date().toISOString(),
                  updated_at: localConv.updated_at || new Date().toISOString(),
                }
              ]);
            }
          }

          const msgsToInsert = localMsgs.map((m: any) => ({
            conversation_id: conversationId,
            sender_id: m.sender_id,
            sender_role: m.sender_role || (m.sender_id === "admin" ? "admin" : m.sender_id === "bot" ? "admin" : "client"),
            recipient_id: m.recipient_id || (m.sender_id === "admin" ? conversationId : "admin"),
            message_type: m.message_type || "text",
            text: m.text || m.content || "",
            content: m.content || m.text || "",
            client_message_id: m.client_message_id || `msg_${Math.random().toString(36).substring(7)}_${Date.now()}`,
            status: m.status || "seen",
            is_automated: m.is_automated || m.sender_id === "bot" || false,
            created_at: m.created_at || new Date().toISOString(),
          }));

          const { data: insertedMsgs, error: insertErr } = await supabase
            .from("messages")
            .insert(msgsToInsert)
            .select();

          if (!insertErr && insertedMsgs) {
            supabaseMsgs = insertedMsgs;
          }
        } else {
          const msgsToInsert = localMsgs.map((m: any) => ({
            sender_id: m.sender_id,
            sender_role: m.sender_role || (m.sender_id === "admin" ? "admin" : m.sender_id === "bot" ? "admin" : "client"),
            recipient_id: m.recipient_id || (m.sender_id === "admin" ? conversationId : "admin"),
            message_type: m.message_type || "text",
            text: m.text || m.content || "",
            content: m.content || m.text || "",
            client_message_id: m.client_message_id || `msg_${Math.random().toString(36).substring(7)}_${Date.now()}`,
            status: m.status || "seen",
            is_automated: m.is_automated || m.sender_id === "bot" || false,
            created_at: m.created_at || new Date().toISOString(),
          }));

          const { data: insertedMsgs, error: insertErr } = await supabase
            .from("messages")
            .insert(msgsToInsert)
            .select();

          if (!insertErr && insertedMsgs) {
            supabaseMsgs = insertedMsgs;
          }
        }
      } catch (syncErr: any) {
        console.warn("[Message Service] Failed to sync local messages to Supabase:", syncErr.message);
      }
    }
  }

  const standardize = (m: any) => ({
    id: m.id,
    conversation_id: m.conversation_id || conversationId,
    sender_id: m.sender_id,
    sender_role: m.sender_role || (m.sender_id === "admin" ? "admin" : m.sender_id === "bot" ? "admin" : "client"),
    recipient_id: m.recipient_id || (m.sender_id === "admin" ? conversationId : "admin"),
    message_type: m.message_type || "text",
    text: m.text || m.content || "",
    content: m.content || m.text || "",
    attachment_url: m.attachment_url || null,
    attachment_name: m.attachment_name || null,
    attachment_mime_type: m.attachment_mime_type || null,
    attachment_size: m.attachment_size || null,
    status: m.status || "seen",
    created_at: m.created_at || m.sent_at || new Date().toISOString(),
    client_message_id: m.client_message_id,
    is_automated: m.is_automated || m.sender_id === "bot" || false,
    sender_type: m.sender_type || (m.sender_id === "bot" ? "bot" : m.sender_id === "admin" ? "admin" : "client"),
    direction: m.sender_role === "client" ? "outgoing" : "incoming",
  });

  if (isServerlessRuntime && supabaseMsgs.length > 0) {
    return supabaseMsgs.map(standardize).sort((a, b) => {
      return a.created_at.localeCompare(b.created_at);
    });
  }

  // Get local messages
  const localMsgs = await getLocalMessages(conversationId);

  // Merge messages (de-duplicate by client_message_id or ID if they match)
  const mergedMap = new Map<string, any>();

  for (const m of supabaseMsgs) {
    const std = standardize(m);
    mergedMap.set(`supabase_${std.id}`, std);
  }

  for (const m of localMsgs) {
    const std = standardize(m);
    let foundDuplicate = false;
    if (std.client_message_id) {
      for (const [key, val] of mergedMap.entries()) {
        if (val.client_message_id === std.client_message_id) {
          mergedMap.set(key, { ...val, ...std });
          foundDuplicate = true;
          break;
        }
      }
    }
    if (!foundDuplicate) {
      mergedMap.set(`local_${std.id}`, std);
    }
  }

  return Array.from(mergedMap.values()).sort((a, b) => {
    return a.created_at.localeCompare(b.created_at);
  });
}

export async function getConversationDetails(id: string): Promise<any> {
  const isNew = await hasNewSchema();
  const isServerlessRuntime = Boolean(process.env.VERCEL || process.env.AWS_REGION);
  let supabaseConv: any = null;

  try {
    if (isNew) {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!error && data) {
        supabaseConv = data;
      }
    } else {
      supabaseConv = {
        id,
        client_id: id,
        status: "open",
        type: "support",
        client_unread_count: 0,
        admin_unread_count: 0,
        chatbot_enabled: true,
      };
    }
  } catch (err) {
    console.warn("[Message Service] Failed to fetch Supabase conversation details:", err);
  }

  if (isServerlessRuntime && !supabaseConv) {
    try {
      supabaseConv = await getPostgresConversation(id);
    } catch (err) {
      console.warn("[Message Service] Failed to fetch Postgres conversation details:", err);
    }
  }

  const localConv = isServerlessRuntime && supabaseConv ? null : await getLocalConversation(id);
  
  const merged = {
    id,
    client_id: id,
    status: "open",
    type: "support",
    client_unread_count: 0,
    admin_unread_count: 0,
    chatbot_enabled: true,
    ...supabaseConv,
    ...localConv,
  };

  return merged;
}
