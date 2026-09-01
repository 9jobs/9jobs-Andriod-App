const ANDROID_EMULATOR_HOST = "10.0.2.2";

function getBackendOrigin(backendUrl: string) {
  try {
    return new URL(backendUrl).origin;
  } catch {
    return backendUrl;
  }
}

function getBackendHost(backendUrl: string) {
  try {
    return new URL(backendUrl).hostname;
  } catch {
    return "";
  }
}

function isNetworkFailure(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("fetch failed") ||
    normalized.includes("network request failed") ||
    normalized.includes("connectexception") ||
    normalized.includes("failed to connect") ||
    normalized.includes("connection refused")
  );
}

export function normalizeBackendError(
  error: unknown,
  backendUrl: string,
  fallbackMessage: string,
) {
  const origin = getBackendOrigin(backendUrl);
  const host = getBackendHost(backendUrl);
  const baseMessage = error instanceof Error ? error.message : String(error || "");

  if (baseMessage.toLowerCase().includes("aborted")) {
    return new Error(`${fallbackMessage} The request to ${origin} timed out.`);
  }

  if (isNetworkFailure(baseMessage)) {
    if (host === ANDROID_EMULATOR_HOST) {
      return new Error(
        `Could not reach the local backend at ${origin}. Make sure the backend is running. If you are testing on a real Android phone, set EXPO_PUBLIC_BACKEND_URL to your computer's LAN IP instead of 10.0.2.2.`,
      );
    }

    return new Error(`Could not reach the backend at ${origin}. Make sure the backend is running and reachable from this device.`);
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error(fallbackMessage);
}
