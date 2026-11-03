import AsyncStorage from "@react-native-async-storage/async-storage";
import { startTrackedRequest } from "@/lib/perf/livePerf";
import { normalizeBackendError } from "@/lib/network/backend-errors";
import { storageKeys } from "@/lib/utils/storage";
import type { SessionUser } from "@/types/auth";

const LIVE_BACKEND_URL = "https://backend-theta-ten-27.vercel.app";
export function resolveBackendUrl(backendUrl?: string): string {
  const resolved = (backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL || "").trim();
  if (!resolved) {
    return LIVE_BACKEND_URL;
  }

  return resolved;
}

const DEFAULT_BACKEND_URL = resolveBackendUrl();

let cachedToken: string | null = null;
let cachedTokenUserId: string | null = null;
let cachedTokenBackendUrl: string | null = null;
let inFlightBackendTokenPromise: Promise<string> | null = null;
let inFlightBackendTokenUserId: string | null = null;
let inFlightBackendTokenBackendUrl: string | null = null;
let clerkSession: {userId:string;getToken:()=>Promise<string|null>} | null = null;
export function hasBackendSession(userId:string) { return clerkSession?.userId===userId; }
export function registerBackendSession(userId:string,getToken:()=>Promise<string|null>) {
  const current={userId,getToken}; clerkSession=current;
  return ()=>{if(clerkSession===current){clerkSession=null;clearBackendAuthTokenCache();}};
}

type BackendAuthTokenOptions = {
  backendUrl?: string;
  label?: string;
  forceRefresh?: boolean;
  rejectedToken?: string;
};

export function clearBackendAuthTokenCache() {
  cachedToken = null;
  cachedTokenUserId = null;
  cachedTokenBackendUrl = null;
  inFlightBackendTokenPromise = null;
  inFlightBackendTokenUserId = null;
  inFlightBackendTokenBackendUrl = null;
}

export async function getBackendAuthToken(
  user: SessionUser,
  options?: BackendAuthTokenOptions,
): Promise<string> {
  if (!hasBackendSession(user.id)) throw new Error("Verified login required");
  const backendUrl = options?.backendUrl || DEFAULT_BACKEND_URL;
  const label = options?.label || "mobile.auth.token";
  const canReuseToken = (token: string) => !options?.forceRefresh ||
    Boolean(options.rejectedToken && token !== options.rejectedToken);

  if (cachedToken && cachedTokenUserId === user.id && cachedTokenBackendUrl === backendUrl && canReuseToken(cachedToken)) {
    return cachedToken;
  }

  if (inFlightBackendTokenPromise && inFlightBackendTokenUserId === user.id && inFlightBackendTokenBackendUrl === backendUrl) {
    const pendingToken = await inFlightBackendTokenPromise;
    if (canReuseToken(pendingToken)) return pendingToken;
  }

  inFlightBackendTokenUserId = user.id;
  inFlightBackendTokenBackendUrl = backendUrl;
  const tokenPromise = (async () => {
    const [[, storedToken], [, storedTokenUserId], [, storedBackendUrl]] = await AsyncStorage.multiGet([
      storageKeys.authToken,
      storageKeys.authTokenUserId,
      storageKeys.authTokenBackendUrl,
    ]);

    if (storedToken && storedTokenUserId === user.id && storedBackendUrl === backendUrl && canReuseToken(storedToken)) {
      cachedToken = storedToken;
      cachedTokenUserId = storedTokenUserId;
      cachedTokenBackendUrl = backendUrl;
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
      const currentSession = clerkSession;
      if (!currentSession || currentSession.userId !== user.id) throw new Error("Verified login required");
      const clerkToken = await currentSession.getToken();
      if (!clerkToken || currentSession !== clerkSession) throw new Error("Verified login changed");
      const response = await fetch(`${backendUrl}/api/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${clerkToken}` },
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
        payload_bytes: Number(response.headers?.get?.("content-length") || 0),
      });
      if (!response.ok || !payload?.token) {
        throw new Error(payload?.error || "Could not authenticate backend request.");
      }

      const token = String(payload.token);
      if (currentSession !== clerkSession) throw new Error("Verified login changed");
      cachedToken = token;
      cachedTokenUserId = user.id;
      cachedTokenBackendUrl = backendUrl;
      await AsyncStorage.multiSet([
        [storageKeys.authToken, token],
        [storageKeys.authTokenUserId, user.id],
        [storageKeys.authTokenBackendUrl, backendUrl],
      ]);
      if (currentSession !== clerkSession) {
        if (await AsyncStorage.getItem(storageKeys.authTokenUserId) === user.id) {
          await AsyncStorage.multiRemove([storageKeys.authToken,storageKeys.authTokenUserId]);
        }
        if(cachedToken===token){cachedToken=null;cachedTokenUserId=null;}
        throw new Error("Verified login changed");
      }
      return token;
    } catch (error) {
      tracker.finish({
        status: 0,
        user_id: user.id,
      });
      throw normalizeBackendError(error, backendUrl, "Could not authenticate backend request.");
    }
  })().finally(() => {
    if (inFlightBackendTokenPromise === tokenPromise) {
      inFlightBackendTokenPromise = null;
      inFlightBackendTokenUserId = null;
    }
  });

  inFlightBackendTokenPromise = tokenPromise;
  return await tokenPromise;
}
