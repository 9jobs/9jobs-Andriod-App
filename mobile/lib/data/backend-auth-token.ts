import AsyncStorage from "@react-native-async-storage/async-storage";
import { startTrackedRequest } from "@/lib/perf/livePerf";
import { normalizeBackendError } from "@/lib/network/backend-errors";
import { storageKeys } from "@/lib/utils/storage";
import type { SessionUser } from "@/types/auth";

const LIVE_BACKEND_URL = "https://backend-theta-ten-27.vercel.app";
const LOCAL_BACKEND_URLS = new Set([
  "http://10.0.2.2:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3000",
]);

export function resolveBackendUrl(backendUrl?: string): string {
  const resolved = (backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL || "").trim();
  if (!resolved) {
    return LIVE_BACKEND_URL;
  }

  return LOCAL_BACKEND_URLS.has(resolved) ? LIVE_BACKEND_URL : resolved;
}

const DEFAULT_BACKEND_URL = resolveBackendUrl();

let cachedToken: string | null = null;
let cachedTokenUserId: string | null = null;
let inFlightBackendTokenPromise: Promise<string> | null = null;
let inFlightBackendTokenUserId: string | null = null;

type BackendAuthTokenOptions = {
  backendUrl?: string;
  label?: string;
};

export function clearBackendAuthTokenCache() {
  cachedToken = null;
  cachedTokenUserId = null;
  inFlightBackendTokenPromise = null;
  inFlightBackendTokenUserId = null;
}

export async function getBackendAuthToken(
  user: SessionUser,
  options?: BackendAuthTokenOptions,
): Promise<string> {
  const backendUrl = options?.backendUrl || DEFAULT_BACKEND_URL;
  const label = options?.label || "mobile.auth.token";

  if (cachedToken && cachedTokenUserId === user.id) {
    return cachedToken;
  }

  if (inFlightBackendTokenPromise && inFlightBackendTokenUserId === user.id) {
    return await inFlightBackendTokenPromise;
  }

  inFlightBackendTokenUserId = user.id;
  inFlightBackendTokenPromise = (async () => {
    const [[, storedToken], [, storedTokenUserId]] = await AsyncStorage.multiGet([
      storageKeys.authToken,
      storageKeys.authTokenUserId,
    ]);

    if (storedToken && storedTokenUserId === user.id) {
      cachedToken = storedToken;
      cachedTokenUserId = storedTokenUserId;
      return storedToken;
    }

    await AsyncStorage.multiRemove([storageKeys.authToken, storageKeys.authTokenUserId]);
    cachedToken = null;
    cachedTokenUserId = null;

    const tracker = startTrackedRequest(label, {
      user_id: user.id,
      url: `${backendUrl}/api/auth/token`,
    });
    try {
      const response = await fetch(`${backendUrl}/api/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          role: "client",
        }),
      });
      const payload = await response.json().catch(() => null);
      tracker.finish({
        status: response.status,
        user_id: user.id,
        payload_bytes: Number(response.headers.get("content-length") || 0),
      });
      if (!response.ok || !payload?.token) {
        throw new Error(payload?.error || "Could not authenticate backend request.");
      }

      const token = String(payload.token);
      cachedToken = token;
      cachedTokenUserId = user.id;
      await AsyncStorage.multiSet([
        [storageKeys.authToken, token],
        [storageKeys.authTokenUserId, user.id],
      ]);
      return token;
    } catch (error) {
      tracker.finish({
        status: 0,
        user_id: user.id,
      });
      throw normalizeBackendError(error, backendUrl, "Could not authenticate backend request.");
    }
  })().finally(() => {
    inFlightBackendTokenPromise = null;
    inFlightBackendTokenUserId = null;
  });

  return await inFlightBackendTokenPromise;
}
