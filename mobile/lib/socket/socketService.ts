import { io, Socket } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "../queries";
import {
  mergeIncomingSocketMessage,
  persistIncomingSocketMessage,
  type MobileSyncSnapshot,
} from "../data/mobile-sync-repository";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://10.0.2.2:3000";

let socket: Socket | null = null;
let activeConversationId: string | null = null;
let queryClientInstance: QueryClient | null = null;
let currentUserId: string | null = null;
let hasLoggedConnectError = false;

export function initializeSocket(userId: string, queryClient: QueryClient) {
  currentUserId = userId;
  queryClientInstance = queryClient;

  if (socket) {
    console.log("[Socket Service] Socket already initialized. Reconnecting if needed.");
    if (socket.disconnected) {
      void connectSocket();
    }
    return socket;
  }

  console.log("[Socket Service] Initializing socket connection to:", BACKEND_URL);

  socket = io(BACKEND_URL, {
    autoConnect: false,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1500,
    timeout: 10000,
  });

  // Attach auth token dynamically before connect
  socket.on("connect_error", async (err) => {
    if (!hasLoggedConnectError) {
      console.warn("[Socket Service] Connect error:", err.message);
      hasLoggedConnectError = true;
    }
  });

  socket.on("connect", () => {
    hasLoggedConnectError = false;
    console.log("[Socket Service] Connected successfully. Socket ID:", socket?.id);
    
    // Rejoin active conversation room if we reconnect
    if (activeConversationId) {
      console.log(`[Socket Service] Rejoining room conversation:${activeConversationId}`);
      socket?.emit("join_conversation", activeConversationId);
    }
    
    // Invalidate query cache to fetch any messages missed while offline
    if (queryClientInstance) {
      console.log("[Socket Service] Connected: Invalidating previewSync cache to sync missed messages.");
      queryClientInstance.invalidateQueries({ queryKey: queryKeys.previewSync });
    }
  });

  socket.on("disconnect", (reason) => {
    console.log("[Socket Service] Disconnected. Reason:", reason);
  });

  // Handle incoming live message
  socket.on("new_message", (message: any) => {
    console.log("[Socket Service] Received live new_message:", message.id);

    if (queryClientInstance) {
      queryClientInstance.setQueriesData(
        { queryKey: queryKeys.previewSync },
        (current) => {
          if (!current) return current;
          return mergeIncomingSocketMessage(current as MobileSyncSnapshot, message, currentUserId ?? undefined);
        },
      );
    }

    void persistIncomingSocketMessage(message, currentUserId ?? undefined);

    if (queryClientInstance) {
      // Invalidate queries so the messages list and detail refetch immediately
      queryClientInstance.invalidateQueries({ queryKey: queryKeys.previewSync });
    }
  });

  socket.on("unread_count_updated", (data: any) => {
    console.log("[Socket Service] Received unread_count_updated:", data);
    if (queryClientInstance) {
      queryClientInstance.invalidateQueries({ queryKey: queryKeys.previewSync });
    }
  });

  socket.on("conversation_updated", (conv: any) => {
    console.log("[Socket Service] Received conversation_updated:", conv.id);
    if (queryClientInstance) {
      queryClientInstance.invalidateQueries({ queryKey: queryKeys.previewSync });
    }
  });

  socket.on("message_deleted", (data: any) => {
    console.log("[Socket Service] Received message_deleted:", data);
    if (queryClientInstance) {
      queryClientInstance.invalidateQueries({ queryKey: queryKeys.previewSync });
    }
  });

  socket.on("chat_cleared", (data: any) => {
    console.log("[Socket Service] Received chat_cleared:", data);
    if (queryClientInstance) {
      queryClientInstance.invalidateQueries({ queryKey: queryKeys.previewSync });
    }
  });


  // Connect manually after resolving token
  connectSocket();

  return socket;
}

export async function connectSocket() {
  if (!socket) return;

  if (socket.connected || socket.active) {
    return;
  }
  
  try {
    const token = await AsyncStorage.getItem("auth_token");
    if (token) {
      socket.auth = { token };
      socket.connect();
    } else {
      console.warn("[Socket Service] No auth token found. Socket will not connect yet.");
    }
  } catch (err) {
    console.warn("[Socket Service] Error reading auth token for socket connection:", err);
  }
}

export function disconnectSocket() {
  if (socket) {
    console.log("[Socket Service] Disconnecting socket manually.");
    socket.disconnect();
    socket = null;
    activeConversationId = null;
    currentUserId = null;
    hasLoggedConnectError = false;
  }
}

export function joinSocketConversation(conversationId: string) {
  activeConversationId = conversationId;
  if (socket && socket.connected) {
    console.log(`[Socket Service] Joining conversation room: conversation:${conversationId}`);
    socket.emit("join_conversation", conversationId);
    socket.emit("mark_seen", conversationId);
  } else {
    console.log(`[Socket Service] Cannot join room: Socket not connected. Room queued: ${conversationId}`);
  }
}

export function leaveSocketConversation(conversationId: string) {
  if (activeConversationId === conversationId) {
    activeConversationId = null;
  }
  if (socket && socket.connected) {
    console.log(`[Socket Service] Leaving conversation room: conversation:${conversationId}`);
    socket.emit("leave_conversation", conversationId);
  }
}

export function getSocketInstance() {
  return socket;
}
