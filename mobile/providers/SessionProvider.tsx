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
import { clearBackendAuthTokenCache, getBackendAuthToken } from "@/lib/data/backend-auth-token";
import { previewMobileUser } from "@/lib/data/preview-user";
import { fetchCandidateQuestionnaireStatus, getCachedCandidateQuestionnaire } from "@/lib/data/candidate-questionnaire";
import { connectSocket } from "@/lib/socket/socketService";
import { supabase } from "@/lib/supabase/client";
import { queryKeys } from "@/lib/queries";
import { storageKeys } from "@/lib/utils/storage";
import type { SessionUser } from "@/types/auth";
import { useQueryClient } from "@tanstack/react-query";
import { clearInMemoryTokenCache, getLocalSyncSnapshot } from "@/lib/data/mobile-sync-repository";
import { InteractionManager } from "react-native";

const shouldEnableLiveTransport =
  process.env.NODE_ENV === "test" ||
  (!__DEV__ || process.env.EXPO_PUBLIC_ENABLE_MOBILE_SOCKET === "true");
const QUESTIONNAIRE_STATUS_GRACE_MS = 1800;

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
    return;
  }
  try {
    const [[, storedToken], [, storedTokenUserId]] = await AsyncStorage.multiGet([
      storageKeys.authToken,
      storageKeys.authTokenUserId,
    ]);
    if (storedToken && storedTokenUserId === sessionUser.id) {
      if (shouldEnableLiveTransport) {
        await connectSocket();
      }
      return;
    }

    const token = await getBackendAuthToken(sessionUser, {
      label: "session.syncBackendToken",
    });
    if (token) {
      if (shouldEnableLiveTransport) {
        await connectSocket();
      }
      console.log("[SessionProvider] Sync: Backend JWT token saved successfully.");
    } else {
      console.warn("[SessionProvider] Sync: Failed to exchange token.");
    }
  } catch (err) {
    console.warn("[SessionProvider] Sync: Error connecting to backend:", err);
  }
}

async function syncSupabaseProfile(sessionUser: SessionUser | null) {
  if (!sessionUser || !supabase) {
    return;
  }

  try {
    const profilePayload = {
      id: sessionUser.id,
      email: sessionUser.email,
      full_name: sessionUser.fullName,
      phone_number: sessionUser.phoneNumber || "",
      role: "client",
      account_status: "active",
      subscription_plan: "free",
    };

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert([profilePayload], { onConflict: "id" });

    if (profileError) {
      throw profileError;
    }

    const { error: subscriptionError } = await supabase
      .from("user_subscriptions")
      .upsert([{ user_id: sessionUser.id, plan_id: "free", status: "active" }], { onConflict: "user_id" });

    if (subscriptionError) {
      throw subscriptionError;
    }
  } catch (err) {
    console.warn("[SessionProvider] Sync: Error syncing profile to Supabase:", err);
  }
}

async function clearPreviewSnapshotCache() {
  clearBackendAuthTokenCache();
  clearInMemoryTokenCache();
  const keys = await AsyncStorage.getAllKeys();
  const removableKeys = keys.filter(
    (key) =>
      key === storageKeys.snapshotCache ||
      key.startsWith(`${storageKeys.snapshotCache}:`) ||
      key === storageKeys.authToken ||
      key === storageKeys.authTokenUserId,
  );
  if (removableKeys.length > 0) {
    await AsyncStorage.multiRemove(removableKeys);
  }
}

async function persistOnboardingStatus(userId: string, completed: boolean) {
  await AsyncStorage.multiSet([
    [storageKeys.onboardingComplete, completed ? "true" : "false"],
    [`${storageKeys.onboardingComplete}:${userId}`, completed ? "true" : "false"],
  ]);
}

function resolvePreviewCompatibleUser(user: SessionUser | null) {
  return user;
}

function MissingClerkSessionProvider({ children }: PropsWithChildren) {
  const [isBooting, setIsBooting] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);
  let queryClient: any = null;
  try {
    queryClient = useQueryClient();
  } catch {}

  useEffect(() => {
    async function bootstrap() {
      const onboarding = await AsyncStorage.getItem(storageKeys.onboardingComplete);
      const savedSession = await AsyncStorage.getItem(storageKeys.mockSession);
      const resolvedUser = savedSession ? (JSON.parse(savedSession) as SessionUser) : null;
      setHasCompletedOnboarding(savedSession ? onboarding === "true" : false);
      setUser(resolvedUser);
      if (resolvedUser) {
        try {
          const cachedData = await getLocalSyncSnapshot(resolvedUser);
          if (cachedData) {
            queryClient.setQueryData(["preview-sync", resolvedUser.id], cachedData);
          }
        } catch (e) {
          console.warn("Failed to warm previewSync cache:", e);
        }
      }
      setIsBooting(false);
    }

    bootstrap();
  }, [queryClient]);

  useEffect(() => {
    syncBackendToken(user);
    syncSupabaseProfile(user);
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
          phoneNumber: payload?.phoneNumber,
        };

        await clearPreviewSnapshotCache();
        await AsyncStorage.setItem(storageKeys.mockSession, JSON.stringify(nextUser));
        setHasCompletedOnboarding(false);
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
  const [isQuestionnaireStatusLoaded, setIsQuestionnaireStatusLoaded] = useState(false);
  const [isLocallySignedOut, setIsLocallySignedOut] = useState(false);
  const [localFallbackUser, setLocalFallbackUser] = useState<SessionUser | null>(null);
  let queryClient: any = null;
  try {
    queryClient = useQueryClient();
  } catch {}

  useEffect(() => {
    async function bootstrap() {
      const savedSession = await AsyncStorage.getItem(storageKeys.clerkFallbackSession);
      await AsyncStorage.multiRemove([
        storageKeys.mockSession,
        storageKeys.mockProfile,
      ]);
      const fallbackUser = savedSession ? (JSON.parse(savedSession) as SessionUser) : null;
      setLocalFallbackUser(fallbackUser);
      if (fallbackUser) {
        try {
          const cachedData = await getLocalSyncSnapshot(fallbackUser);
          if (cachedData) {
            queryClient.setQueryData(["preview-sync", fallbackUser.id], cachedData);
          }
        } catch (e) {
          console.warn("Failed to warm previewSync cache:", e);
        }
      }
      setIsOnboardingLoaded(true);
    }

    bootstrap();
  }, [queryClient]);

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
      phoneNumber:
        user.primaryPhoneNumber?.phoneNumber ||
        (typeof user.unsafeMetadata?.phoneNumber === "string"
          ? user.unsafeMetadata.phoneNumber
          : undefined),
    });
  }, [isLocallySignedOut, isSignedIn, localFallbackUser, user]);

  useEffect(() => {
    if (sessionUser) {
      getLocalSyncSnapshot(sessionUser).then((cachedData) => {
        if (cachedData) {
          queryClient.setQueryData(["preview-sync", sessionUser.id], cachedData);
        }
      }).catch((e) => {
        console.warn("Failed to warm previewSync cache on user session change:", e);
      });
    }
  }, [sessionUser, queryClient]);

  useEffect(() => {
    let active = true;
    let cancelled = false;

    async function syncQuestionnaireStatus(sessionUserValue: SessionUser, localValue: string | null) {
      try {
        const completed = await Promise.race<boolean>([
          fetchCandidateQuestionnaireStatus(sessionUserValue),
          new Promise<boolean>((_, reject) =>
            setTimeout(() => reject(new Error("Questionnaire status timeout")), QUESTIONNAIRE_STATUS_GRACE_MS),
          ),
        ]);
        if (active) {
          setHasCompletedOnboarding(completed);
          setIsQuestionnaireStatusLoaded(true);
        }
        await persistOnboardingStatus(sessionUserValue.id, completed);
      } catch (error) {
        console.warn("[SessionProvider] Questionnaire status sync failed, using local state:", error);
        if (localValue === null && active) {
          const fallbackValue = await AsyncStorage.getItem(storageKeys.onboardingComplete);
          setHasCompletedOnboarding(fallbackValue === "true");
          setIsQuestionnaireStatusLoaded(true);
        }
      }
    }

    async function loadQuestionnaireStatus() {
      if (!sessionUser) {
        if (active) {
          setHasCompletedOnboarding(false);
          setIsQuestionnaireStatusLoaded(true);
        }
        return;
      }

      if (sessionUser.id === previewMobileUser.id) {
        await persistOnboardingStatus(sessionUser.id, true);
        if (active) {
          setHasCompletedOnboarding(true);
          setIsQuestionnaireStatusLoaded(true);
        }
        InteractionManager.runAfterInteractions(() => {
          if (!cancelled) {
            void syncQuestionnaireStatus(sessionUser, "true");
          }
        });
        return;
      }

      // 1. Try to read from local storage first to unblock booting immediately
      let localValue: string | null = null;
      try {
        localValue = await AsyncStorage.getItem(`${storageKeys.onboardingComplete}:${sessionUser.id}`);
        if (localValue === null) {
          localValue = await AsyncStorage.getItem(storageKeys.onboardingComplete);
          if (localValue !== null) {
            await AsyncStorage.setItem(`${storageKeys.onboardingComplete}:${sessionUser.id}`, localValue);
          }
        }
        if (localValue !== null && active) {
          setHasCompletedOnboarding(localValue === "true");
          setIsQuestionnaireStatusLoaded(true);
        }
      } catch (err) {
        console.warn("[SessionProvider] Failed to read local onboarding status:", err);
      }

      if (localValue === null) {
        try {
          const cachedQuestionnaire = await getCachedCandidateQuestionnaire(sessionUser.id);
          if (cachedQuestionnaire?.completed_at) {
            localValue = "true";
            await persistOnboardingStatus(sessionUser.id, true);
            if (active) {
              setHasCompletedOnboarding(true);
              setIsQuestionnaireStatusLoaded(true);
            }
          }
        } catch (err) {
          console.warn("[SessionProvider] Failed to read cached questionnaire status:", err);
        }
      }

      if (localValue !== null) {
        InteractionManager.runAfterInteractions(() => {
          if (!cancelled) {
            void syncQuestionnaireStatus(sessionUser, localValue);
          }
        });
        return;
      }

      await syncQuestionnaireStatus(sessionUser, localValue);
    }

    void loadQuestionnaireStatus();
    return () => {
      active = false;
      cancelled = true;
    };
  }, [sessionUser]);

  useEffect(() => {
    syncBackendToken(sessionUser);
    syncSupabaseProfile(sessionUser);
  }, [sessionUser]);

  const value = useMemo<SessionContextValue>(

    () => ({
      isBooting: !isOnboardingLoaded || !authLoaded || !userLoaded || !isQuestionnaireStatusLoaded,
      user: sessionUser,
      hasCompletedOnboarding,
      clerkConfigured: true,
      async setOnboardingComplete() {
        if (sessionUser) {
          await persistOnboardingStatus(sessionUser.id, true);
        } else {
          await AsyncStorage.setItem(storageKeys.onboardingComplete, "true");
        }
        setHasCompletedOnboarding(true);
      },
      async signInDemo(payload) {
        const nextUser = {
          id: payload?.id ?? previewMobileUser.id,
          email: payload?.email ?? previewMobileUser.email,
          fullName: payload?.fullName ?? previewMobileUser.fullName,
          phoneNumber: payload?.phoneNumber,
        };

        await clearPreviewSnapshotCache();
        await AsyncStorage.setItem(storageKeys.clerkFallbackSession, JSON.stringify(nextUser));
        setHasCompletedOnboarding(false);
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
      isQuestionnaireStatusLoaded,
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
