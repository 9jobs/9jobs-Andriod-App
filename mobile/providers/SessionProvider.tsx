import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth, useUser } from "@clerk/expo";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { isClerkConfigured } from "@/lib/clerk/config";
import { previewMobileUser } from "@/lib/data/preview-user";
import { connectSocket } from "@/lib/socket/socketService";
import { storageKeys } from "@/lib/utils/storage";
import type { SessionUser } from "@/types/auth";

const previewCompatibleEmails = new Set([
  previewMobileUser.email.toLowerCase(),
  "9jobsapplicationservice@gmail.com",
]);

type SessionContextValue = {
  isBooting: boolean;
  user: SessionUser | null;
  hasCompletedOnboarding: boolean;
  clerkConfigured: boolean;
  setOnboardingComplete: () => Promise<void>;
  signOut: () => Promise<void>;
  signInDemo: (payload?: Partial<SessionUser>) => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  if (isClerkConfigured) {
    return <ClerkSessionProvider>{children}</ClerkSessionProvider>;
  }

  return <MissingClerkSessionProvider>{children}</MissingClerkSessionProvider>;
}

async function syncBackendToken(sessionUser: SessionUser | null) {
  if (!sessionUser) {
    await AsyncStorage.removeItem("auth_token");
    return;
  }
  try {
    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || "http://10.0.2.2:3000";
    const res = await fetch(`${backendUrl}/api/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: sessionUser.id,
        email: sessionUser.email,
        fullName: sessionUser.fullName,
        role: "client",
      }),
    });
    if (res.ok) {
      const data = await res.json();
      await AsyncStorage.setItem("auth_token", data.token);
      await connectSocket();
      console.log("[SessionProvider] Sync: Backend JWT token saved successfully.");
    } else {
      console.warn("[SessionProvider] Sync: Failed to exchange token:", res.status);
    }
  } catch (err) {
    console.warn("[SessionProvider] Sync: Error connecting to backend:", err);
  }
}

async function clearPreviewSnapshotCache() {
  await AsyncStorage.removeItem("mobile_sync_snapshot_cache");
}

function resolvePreviewCompatibleUser(user: SessionUser | null) {
  if (!user) {
    return null;
  }

  if (!previewCompatibleEmails.has(user.email.trim().toLowerCase())) {
    return user;
  }

  return {
    id: previewMobileUser.id,
    email: previewMobileUser.email,
    fullName: previewMobileUser.fullName,
  } satisfies SessionUser;
}

function MissingClerkSessionProvider({ children }: PropsWithChildren) {
  const [isBooting, setIsBooting] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    async function bootstrap() {
      const onboarding = await AsyncStorage.getItem(storageKeys.onboardingComplete);
      const savedSession = await AsyncStorage.getItem(storageKeys.mockSession);
      setHasCompletedOnboarding(onboarding === "true");
      setUser(savedSession ? (JSON.parse(savedSession) as SessionUser) : null);
      setIsBooting(false);
    }

    bootstrap();
  }, []);

  useEffect(() => {
    syncBackendToken(user);
  }, [user]);

  const value = useMemo<SessionContextValue>(
    () => ({
      isBooting,
      user,
      hasCompletedOnboarding,
      clerkConfigured: false,
      async setOnboardingComplete() {
        await AsyncStorage.setItem(storageKeys.onboardingComplete, "true");
        setHasCompletedOnboarding(true);
      },
      async signInDemo(payload) {
        const nextUser = {
          id: payload?.id ?? previewMobileUser.id,
          email: payload?.email ?? previewMobileUser.email,
          fullName: payload?.fullName ?? previewMobileUser.fullName,
        };

        await clearPreviewSnapshotCache();
        await AsyncStorage.setItem(storageKeys.mockSession, JSON.stringify(nextUser));
        setUser(nextUser);
      },
      async signOut() {
        await clearPreviewSnapshotCache();
        await AsyncStorage.removeItem(storageKeys.mockSession);
        setUser(null);
      },
    }),
    [hasCompletedOnboarding, isBooting, user],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

function ClerkSessionProvider({ children }: PropsWithChildren) {
  const { isLoaded: authLoaded, isSignedIn, signOut: authSignOut } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();
  const [isOnboardingLoaded, setIsOnboardingLoaded] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isLocallySignedOut, setIsLocallySignedOut] = useState(false);
  const [localFallbackUser, setLocalFallbackUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    async function bootstrap() {
      const onboarding = await AsyncStorage.getItem(storageKeys.onboardingComplete);
      const savedSession = await AsyncStorage.getItem(storageKeys.clerkFallbackSession);
      await AsyncStorage.multiRemove([
        storageKeys.mockSession,
        storageKeys.mockProfile,
      ]);
      setHasCompletedOnboarding(onboarding === "true");
      setLocalFallbackUser(savedSession ? (JSON.parse(savedSession) as SessionUser) : null);
      setIsOnboardingLoaded(true);
    }

    bootstrap();
  }, []);

  useEffect(() => {
    if (isSignedIn) {
      setIsLocallySignedOut(false);
      setLocalFallbackUser(null);
      void AsyncStorage.removeItem(storageKeys.clerkFallbackSession);
    }
  }, [isSignedIn]);

    const sessionUser = useMemo<SessionUser | null>(() => {
    if (isLocallySignedOut) {
      return null;
    }

    if (localFallbackUser) {
      return resolvePreviewCompatibleUser(localFallbackUser);
    }

    if (!isSignedIn || !user) {
      return null;
    }

    const email =
      user.primaryEmailAddress?.emailAddress ??
      user.emailAddresses[0]?.emailAddress ??
      "";

    return resolvePreviewCompatibleUser({
      id: user.id,
      email,
      fullName:
        user.fullName?.trim() ||
        [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
        email.split("@")[0] ||
        "9Jobs Candidate",
    });
  }, [isLocallySignedOut, isSignedIn, localFallbackUser, user]);

  useEffect(() => {
    syncBackendToken(sessionUser);
  }, [sessionUser]);

  const value = useMemo<SessionContextValue>(

    () => ({
      isBooting: !isOnboardingLoaded || !authLoaded || !userLoaded,
      user: sessionUser,
      hasCompletedOnboarding,
      clerkConfigured: true,
      async setOnboardingComplete() {
        await AsyncStorage.setItem(storageKeys.onboardingComplete, "true");
        setHasCompletedOnboarding(true);
      },
      async signInDemo(payload) {
        const nextUser = {
          id: payload?.id ?? previewMobileUser.id,
          email: payload?.email ?? previewMobileUser.email,
          fullName: payload?.fullName ?? previewMobileUser.fullName,
        };

        await clearPreviewSnapshotCache();
        await AsyncStorage.setItem(storageKeys.clerkFallbackSession, JSON.stringify(nextUser));
        setIsLocallySignedOut(false);
        setLocalFallbackUser(nextUser);
      },
      async signOut() {
        setIsLocallySignedOut(true);
        await clearPreviewSnapshotCache();
        await AsyncStorage.multiRemove([
          storageKeys.mockSession,
          storageKeys.clerkFallbackSession,
        ]);
        setLocalFallbackUser(null);

        if (!authSignOut) {
          return;
        }

        const signOutTask = authSignOut();
        await Promise.race([
          signOutTask,
          new Promise((resolve) => setTimeout(resolve, 1500)),
        ]);
      },
    }),
    [
      authLoaded,
      authSignOut,
      hasCompletedOnboarding,
      isOnboardingLoaded,
      localFallbackUser,
      sessionUser,
      userLoaded,
    ],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be used inside SessionProvider");
  }

  return context;
}
