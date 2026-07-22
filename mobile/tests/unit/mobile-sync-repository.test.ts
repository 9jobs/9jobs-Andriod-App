jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

type MockQueryResult = {
  data: any;
  error: any;
  select: (...args: any[]) => MockQueryResult;
  eq: (...args: any[]) => MockQueryResult;
  or: (...args: any[]) => MockQueryResult;
  order: (...args: any[]) => MockQueryResult;
  update: (...args: any[]) => MockQueryResult;
  delete: (...args: any[]) => MockQueryResult;
  neq: (...args: any[]) => MockQueryResult;
  is: (...args: any[]) => MockQueryResult;
  single: () => MockQueryResult;
  maybeSingle: () => MockQueryResult;
  upsert: (...args: any[]) => Promise<{ data: any; error: any }>;
  insert: (...args: any[]) => Promise<{ data: any; error: any }>;
};

function createQuery(initialData: any): MockQueryResult {
  const query: MockQueryResult = {
    data: initialData,
    error: null,
    select: () => query,
    eq: () => query,
    or: () => query,
    order: () => query,
    update: () => query,
    delete: () => query,
    neq: () => query,
    is: () => query,
    single: () => {
      query.data = Array.isArray(query.data) ? query.data[0] ?? null : query.data;
      return query;
    },
    maybeSingle: () => {
      query.data = Array.isArray(query.data) ? query.data[0] ?? null : query.data;
      return query;
    },
    upsert: async () => ({ data: null, error: null }),
    insert: async () => ({ data: null, error: null }),
  };

  return query;
}

const mockSupabase = {
  from: (table: string) => {
    switch (table) {
      case "profiles":
      case "user_subscriptions":
      case "resume_scores":
      case "system_settings":
        return createQuery([]);
      default:
        return createQuery([]);
    }
  },
};

jest.mock("@/lib/supabase/client", () => ({
  supabase: mockSupabase,
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
      "Hello! Welcome to 9Jobs support. How can I help you with your job search today?",
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

  test("reconciles a stale backend profile with the currently signed-in user identity", async () => {
    const { fetchMobileSyncSnapshot } = loadRepository();

    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: "session-token" }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          profile: {
            id: "preview-user-9jobs",
            full_name: "Karan",
            headline: "Old preview profile",
            location: "Remote",
            email: "preview-user-9jobs@9jobs.app",
            phone_number: "",
            avatar_url: null,
            linkedin_url: "",
            facebook_url: "",
            instagram_url: "",
            twitter_url: "",
            dark_mode: false,
            biometric: false,
            push_notifications: true,
            weekly_goal: "",
            subscription_plan: "free",
            role: "client",
            account_status: "active",
            timezone: "Australia/Melbourne",
          },
          jobs: [],
          applications: [],
          savedJobs: [],
          categories: [],
          messages: [],
          services: [],
          pricingPlans: [],
          successStories: [],
          subscription: null,
          resumeScore: null,
          systemSettings: null,
          interviews: [],
          followUps: [],
          recruiterContacts: [],
          coldEmails: [],
          clientScores: [],
          notifications: [],
        }),
      } as Response) as jest.Mock;

    const snapshot = await fetchMobileSyncSnapshot({
      id: "local-akash@9jobs.app",
      email: "Akash@9jobs.app",
      fullName: "Akash",
      phoneNumber: "9999999999",
    });

    expect(snapshot.profile.id).toBe("local-akash@9jobs.app");
    expect(snapshot.profile.email).toBe("Akash@9jobs.app");
    expect(snapshot.profile.fullName).toBe("Akash");

    const storage = require("@react-native-async-storage/async-storage");
    const rawSnapshot = await storage.getItem("mobile_sync_snapshot_cache:local-akash@9jobs.app");
    expect(rawSnapshot).toContain("\"fullName\":\"Akash\"");
  });
});
