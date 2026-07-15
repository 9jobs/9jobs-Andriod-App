import express from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";
import chatRoutes from "./routes/chat";
import interviewPrepRoutes from "./routes/interviewPrep";
import trackerRoutes from "./routes/tracker";
import { socketAuthMiddleware } from "./middleware/auth";
import { sendMessage, setMessageServiceIo } from "./services/messageService";
import { supabase, hasNewSchema } from "./lib/supabase";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS
app.use(
  cors({
    origin: "*", // Adjust for production environments as needed
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10mb" }));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api", chatRoutes);
app.use("/api", interviewPrepRoutes);
app.use("/api", trackerRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "healthy", time: new Date().toISOString() });
});

// Create HTTP server and Socket.IO server
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
  pingInterval: 10000,
  pingTimeout: 5000,
});

// Configure message service with IO instance
setMessageServiceIo(io);

// Socket.IO authentication middleware
io.use(socketAuthMiddleware);

// Socket connection handler
io.on("connection", (socket: Socket) => {
  const { userId, role, email } = socket.data;

  console.log(`[Socket Server] Socket connected: id=${socket.id}, userId=${userId}, role=${role}`);

  // 1. Join user-specific room
  socket.join(`user:${userId}`);

  // 2. Join admins room if role is admin or staff
  if (role === "admin" || role === "staff") {
    socket.join("admins");
    console.log(`[Socket Server] Admin ${userId} joined room "admins"`);
  }

  // 3. Join active conversation room
  socket.on("join_conversation", (conversationId: string) => {
    // Authorization check: Clients can only join their own support conversation
    if (role === "client" && conversationId !== userId) {
      console.warn(`[Socket Server] Unauthorized join_conversation attempt by client ${userId} for room ${conversationId}`);
      socket.emit("socket_error", { error: "Unauthorized access to this conversation" });
      return;
    }

    socket.join(`conversation:${conversationId}`);
    console.log(`[Socket Server] User ${userId} (${role}) joined conversation:${conversationId}`);
  });

  // 4. Leave active conversation room
  socket.on("leave_conversation", (conversationId: string) => {
    socket.leave(`conversation:${conversationId}`);
    console.log(`[Socket Server] User ${userId} (${role}) left conversation:${conversationId}`);
  });

  // 5. Send message event (fallback/alternative to REST API)
  socket.on("send_message", async (payload: { conversationId?: string; text: string; clientMessageId: string }) => {
    const conversationId = payload.conversationId || userId;

    if (role === "client" && conversationId !== userId) {
      console.warn(`[Socket Server] Unauthorized send_message attempt by client ${userId} for room ${conversationId}`);
      socket.emit("socket_error", {
        error: "Unauthorized: Cannot send messages to other support threads",
        clientMessageId: payload.clientMessageId,
      });
      return;
    }

    const result = await sendMessage(userId, role as any, payload);
    if (!result.success) {
      socket.emit("socket_error", {
        error: result.error || "Failed to process message",
        clientMessageId: payload.clientMessageId,
      });
    }
  });

  // 6. Mark messages seen
  socket.on("mark_seen", async (conversationId: string) => {
    console.log(`[Socket Server] mark_seen received from ${userId} (${role}) for conversation ${conversationId}`);
    
    try {
      const isNew = await hasNewSchema();
      if (role === "client") {
        if (isNew) {
          // Client marks admin/bot messages as seen
          await supabase
            .from("messages")
            .update({ status: "seen", seen_at: new Date().toISOString() })
            .eq("conversation_id", userId)
            .neq("sender_role", "client")
            .is("seen_at", null);

          const { data: updatedConv } = await supabase
            .from("conversations")
            .update({ client_unread_count: 0 })
            .eq("id", userId)
            .select()
            .single();

          if (updatedConv) {
            io.to(`conversation:${userId}`).emit("message_seen", { conversationId: userId, seenBy: "client" });
            io.to("admins").emit("conversation_updated", updatedConv);
            io.to(`user:${userId}`).emit("unread_count_updated", {
              clientUnreadCount: updatedConv.client_unread_count,
              adminUnreadCount: updatedConv.admin_unread_count,
            });
          }
        } else {
          // Old schema fallback: Client marks admin messages seen (no db status column exists)
          io.to(`conversation:${userId}`).emit("message_seen", { conversationId: userId, seenBy: "client" });
          io.to(`user:${userId}`).emit("unread_count_updated", {
            clientUnreadCount: 0,
            adminUnreadCount: 0,
          });
        }
      } else {
        if (isNew) {
          // Admin marks client messages as seen
          await supabase
            .from("messages")
            .update({ status: "seen", seen_at: new Date().toISOString() })
            .eq("conversation_id", conversationId)
            .eq("sender_role", "client")
            .is("seen_at", null);

          const { data: updatedConv } = await supabase
            .from("conversations")
            .update({ admin_unread_count: 0 })
            .eq("id", conversationId)
            .select()
            .single();

          if (updatedConv) {
            io.to(`conversation:${conversationId}`).emit("message_seen", { conversationId, seenBy: "admin" });
            io.to("admins").emit("conversation_updated", updatedConv);
            io.to(`user:${conversationId}`).emit("unread_count_updated", {
              clientUnreadCount: updatedConv.client_unread_count,
              adminUnreadCount: updatedConv.admin_unread_count,
            });
          }
        } else {
          // Old schema fallback: Admin marks client messages seen
          io.to(`conversation:${conversationId}`).emit("message_seen", { conversationId, seenBy: "admin" });
        }
      }
    } catch (err) {
      console.error(`[Socket Server] Error processing mark_seen:`, err);
    }
  });

  // 7. Mark messages delivered
  socket.on("mark_delivered", async (conversationId: string) => {
    try {
      const isNew = await hasNewSchema();
      if (isNew) {
        if (role === "client") {
          await supabase
            .from("messages")
            .update({ status: "delivered", delivered_at: new Date().toISOString() })
            .eq("conversation_id", userId)
            .neq("sender_role", "client")
            .eq("status", "sent");
        } else {
          await supabase
            .from("messages")
            .update({ status: "delivered", delivered_at: new Date().toISOString() })
            .eq("conversation_id", conversationId)
            .eq("sender_role", "client")
            .eq("status", "sent");
        }
      }
      
      io.to(`conversation:${conversationId}`).emit("message_delivered", { conversationId });
    } catch (err) {
      console.error(`[Socket Server] Error processing mark_delivered:`, err);
    }
  });

  // 8. Typing indicator
  socket.on("typing_start", (conversationId: string) => {
    socket.to(`conversation:${conversationId}`).emit("typing_start", { conversationId, userId, role });
  });

  socket.on("typing_stop", (conversationId: string) => {
    socket.to(`conversation:${conversationId}`).emit("typing_stop", { conversationId, userId, role });
  });

  // Disconnect handler
  socket.on("disconnect", () => {
    console.log(`[Socket Server] Socket disconnected: id=${socket.id}, userId=${userId}`);
  });
});

// Start the server
server.listen(port, "0.0.0.0" as any, () => {
  console.log(`[Socket Server] Backend server listening on 0.0.0.0:${port}`);
});
