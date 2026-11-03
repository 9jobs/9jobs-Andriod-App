import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearBackendAuthTokenCache, getBackendAuthToken } from "@/lib/data/backend-auth-token";
import { fetchInterviewPrepSession, navigateInterviewPrep, requestInterviewPrepAnswer } from "@/lib/data/interview-prep";
import { storageKeys } from "@/lib/utils/storage";
import type { SessionUser } from "@/types/auth";

jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("@/lib/perf/livePerf", () => ({ startTrackedRequest: () => ({ finish: jest.fn() }) }));

function reply(status: number, payload: unknown) {
  return { status, ok: status >= 200 && status < 300, json: async () => payload, headers: { get: () => null } } as unknown as Response;
}

let user: SessionUser;
let sequence = 0;
let fetchMock: jest.Mock;
const session = { session: { id: 7 }, currentQuestion: { text: "Tell me about yourself" }, responses: [] };

beforeEach(async () => {
  clearBackendAuthTokenCache();
  jest.clearAllMocks();
  await AsyncStorage.clear();
  user = { id: `interview-client-${++sequence}`, email: "candidate@example.com", fullName: "Candidate" };
  await AsyncStorage.multiSet([[storageKeys.authToken, "rejected-token"], [storageKeys.authTokenUserId, user.id]]);
  fetchMock = jest.fn();
  globalThis.fetch = fetchMock;
});

function authorization(call: number) {
  return (fetchMock.mock.calls[call][1].headers as Headers).get("Authorization");
}

test("renews a rejected stored token and loads the interview session without signing out", async () => {
  fetchMock.mockResolvedValueOnce(reply(401, {})).mockResolvedValueOnce(reply(200, { token: "renewed-token" })).mockResolvedValueOnce(reply(200, session));
  await expect(fetchInterviewPrepSession(user, { force: true })).resolves.toEqual(session);
  expect(authorization(0)).toBe("Bearer rejected-token");
  expect(fetchMock.mock.calls[1][0]).toMatch(/\/api\/auth\/token$/);
  expect(authorization(2)).toBe("Bearer renewed-token");
  expect(await AsyncStorage.getItem(storageKeys.authToken)).toBe("renewed-token");
  expect(await AsyncStorage.getItem(storageKeys.authTokenUserId)).toBe(user.id);
});

test.each(["answer", "navigate"])("preserves the %s request body when retrying after a 401", async (operation) => {
  fetchMock.mockResolvedValueOnce(reply(401, {})).mockResolvedValueOnce(reply(200, { token: "renewed-token" })).mockResolvedValueOnce(reply(200, { response: "ok" }));
  if (operation === "answer") await requestInterviewPrepAnswer(user, "My experience is in customer support.");
  else await navigateInterviewPrep(user, "next");
  expect(fetchMock.mock.calls[0][1].body).toBe(fetchMock.mock.calls[2][1].body);
  expect(fetchMock.mock.calls[2][1].method).toBe("POST");
  expect((fetchMock.mock.calls[2][1].headers as Headers).get("Content-Type")).toBe("application/json");
  expect(authorization(2)).toBe("Bearer renewed-token");
});

test("stops after one renewal when the backend also rejects the new token", async () => {
  fetchMock.mockResolvedValueOnce(reply(401, {})).mockResolvedValueOnce(reply(200, { token: "renewed-token" })).mockResolvedValueOnce(reply(401, {}));
  await expect(fetchInterviewPrepSession(user, { force: true })).rejects.toThrow("Please sign out and sign in again");
  expect(fetchMock).toHaveBeenCalledTimes(3);
});

test("does not exchange tokens for a permission error", async () => {
  fetchMock.mockResolvedValueOnce(reply(403, {}));
  await expect(fetchInterviewPrepSession(user, { force: true })).rejects.toThrow("HTTP 403");
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("does not reuse a token saved for a different account", async () => {
  await AsyncStorage.setItem(storageKeys.authTokenUserId, "another-client");
  fetchMock.mockResolvedValueOnce(reply(200, { token: "current-client-token" })).mockResolvedValueOnce(reply(200, session));
  await fetchInterviewPrepSession(user, { force: true });
  expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/auth\/token$/);
  expect(JSON.parse(fetchMock.mock.calls[0][1].body).userId).toBe(user.id);
  expect(authorization(1)).toBe("Bearer current-client-token");
});

test("shares a token renewal across concurrent rejected requests", async () => {
  fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
    if (url.endsWith("/api/auth/token")) return reply(200, { token: "renewed-token" });
    return (init.headers as Headers).get("Authorization") === "Bearer rejected-token" ? reply(401, {}) : reply(200, { response: "ok" });
  });
  await Promise.all([requestInterviewPrepAnswer(user, "A sample answer"), navigateInterviewPrep(user, "next")]);
  expect(fetchMock.mock.calls.filter(([url]) => url.endsWith("/api/auth/token"))).toHaveLength(1);
});

test("reuses the already-renewed token when a late request reports the same rejection", async () => {
  await getBackendAuthToken(user);
  fetchMock.mockResolvedValue(reply(200, { token: "renewed-token" }));
  const options = { forceRefresh: true, rejectedToken: "rejected-token" };
  await expect(getBackendAuthToken(user, options)).resolves.toBe("renewed-token");
  await expect(getBackendAuthToken(user, options)).resolves.toBe("renewed-token");
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("leaves the rejected token cleared when its renewal fails", async () => {
  fetchMock.mockResolvedValueOnce(reply(401, {})).mockResolvedValueOnce(reply(503, { error: "Authentication unavailable" }));
  await expect(fetchInterviewPrepSession(user, { force: true })).rejects.toThrow("Authentication unavailable");
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(await AsyncStorage.getItem(storageKeys.authToken)).toBeNull();
});

test("requires a signed-in user instead of sending an unscoped saved token", async () => {
  await expect(fetchInterviewPrepSession(null, { force: true })).rejects.toThrow("Please sign in");
  expect(fetchMock).not.toHaveBeenCalled();
});
