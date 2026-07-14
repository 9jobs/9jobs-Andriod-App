jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("@/lib/supabase/client", () => ({
  supabase: null,
}));

jest.mock("@/theme", () => ({
  setTheme: jest.fn(),
}));

describe("mobile chat repository fallbacks", () => {
  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    const storage = require("@react-native-async-storage/async-storage");
    await storage.clear();
    globalThis.fetch = jest.fn().mockRejectedValue(new Error("backend unavailable")) as jest.Mock;
  });

  function loadRepository() {
    return require("@/lib/data/mobile-sync-repository");
  }

  async function readSnapshot() {
    const storage = require("@react-native-async-storage/async-storage");
    const rawSnapshot = await storage.getItem("mobile_sync_snapshot_cache");
    return JSON.parse(rawSnapshot ?? "{}");
  }

  test("starts a new chat locally when backend is unavailable", async () => {
    const { startNewAdminConversation } = loadRepository();

    await startNewAdminConversation();

    const snapshot = await readSnapshot();

    expect(snapshot.messages).toHaveLength(1);
    expect(snapshot.messages[0].content).toBe(
      "Welcome to the live 9Jobs preview. This thread is synced with the admin panel.",
    );
  });

  test("adds an immediate fallback bot reply when backend message send fails", async () => {
    const { startNewAdminConversation, sendMessageToAdmin } = loadRepository();

    await startNewAdminConversation();
    await sendMessageToAdmin("hi");

    const snapshot = await readSnapshot();

    expect(snapshot.messages).toHaveLength(3);
    expect(snapshot.messages[1].content).toBe("hi");
    expect(snapshot.messages[2].content).toBe(
      "Thanks for contacting 9Jobs. Your message has been received and shared with our support team. An admin will respond shortly.",
    );
  });

  test("appends the backend bot reply immediately when the API returns one", async () => {
    const { startNewAdminConversation, sendMessageToAdmin } = loadRepository();

    await startNewAdminConversation();

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          id: 2,
          conversation_id: "preview-user-9jobs",
          sender_id: "preview-user-9jobs",
          sender_role: "client",
          recipient_id: "admin",
          text: "hi",
          content: "hi",
          status: "sent",
          created_at: "2026-07-13T06:15:57.028Z",
          client_message_id: "client-msg-1",
        },
        botMessage: {
          id: 3,
          conversation_id: "preview-user-9jobs",
          sender_id: "bot",
          sender_role: "admin",
          recipient_id: "preview-user-9jobs",
          text: "Hello! Welcome to 9Jobs support. How can I help you with your job search today?",
          content: "Hello! Welcome to 9Jobs support. How can I help you with your job search today?",
          status: "delivered",
          created_at: "2026-07-13T06:15:57.226Z",
          client_message_id: "bot-msg-1",
          is_automated: true,
          sender_type: "bot",
        },
      }),
    } as Response) as jest.Mock;

    await sendMessageToAdmin("hi");

    const snapshot = await readSnapshot();

    expect(snapshot.messages).toHaveLength(3);
    expect(snapshot.messages[1].content).toBe("hi");
    expect(snapshot.messages[2].content).toBe(
      "Hello! Welcome to 9Jobs support. How can I help you with your job search today?",
    );
  });

  test("clears the local chat cache when backend clear fails", async () => {
    const { startNewAdminConversation, sendMessageToAdmin, clearAdminConversation } = loadRepository();

    await startNewAdminConversation();
    await sendMessageToAdmin("hello");
    await clearAdminConversation();

    const snapshot = await readSnapshot();

    expect(snapshot.messages).toEqual([]);
  });

  test("merges an incoming admin socket message into the local snapshot", async () => {
    const { startNewAdminConversation, persistIncomingSocketMessage } = loadRepository();

    await startNewAdminConversation();
    await persistIncomingSocketMessage({
      id: 99,
      conversation_id: "preview-user-9jobs",
      sender_id: "admin",
      sender_role: "admin",
      recipient_id: "preview-user-9jobs",
      text: "Admin reply",
      content: "Admin reply",
      status: "sent",
      created_at: "2026-07-13T06:40:00.000Z",
      client_message_id: "admin-msg-99",
      sender_type: "admin",
      is_automated: false,
    });

    const snapshot = await readSnapshot();

    expect(snapshot.messages).toHaveLength(2);
    const adminReply = snapshot.messages.find((message: any) => message.content === "Admin reply");
    expect(adminReply?.content).toBe("Admin reply");
    expect(adminReply?.direction).toBe("incoming");
  });
});
