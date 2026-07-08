import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth, useClerk, useUser } from "@clerk/expo";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { isClerkConfigured } from "@/lib/clerk/config";
import { storageKeys } from "@/lib/utils/storage";
import type { SessionUser } from "@/types/auth";

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

function MissingClerkSessionProvider({ children }: PropsWithChildren) {
  const [isBooting, setIsBooting] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    async function bootstrap() {
      const onboarding = await AsyncStorage.getItem(storageKeys.onboardingComplete);
      setHasCompletedOnboarding(onboarding === "true");
      setIsBooting(false);
    }

    bootstrap();
  }, []);

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
        setUser({
          id: payload?.id ?? "demo-user",
          email: payload?.email ?? "candidate@9jobs.app",
          fullName: payload?.fullName ?? "Alex Johnson",
        });
      },
      async signOut() {
        return;
      },
    }),
    [hasCompletedOnboarding, isBooting, user],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

function ClerkSessionProvider({ children }: PropsWithChildren) {
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();
  const { signOut: clerkSignOut } = useClerk();
  const [isOnboardingLoaded, setIsOnboardingLoaded] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  useEffect(() => {
    async function bootstrap() {
      const onboarding = await AsyncStorage.getItem(storageKeys.onboardingComplete);
      setHasCompletedOnboarding(onboarding === "true");
      setIsOnboardingLoaded(true);
    }

    bootstrap();
  }, []);

  const sessionUser = useMemo<SessionUser | null>(() => {
    if (!isSignedIn || !user) {
      return null;
    }

    const email =
      user.primaryEmailAddress?.emailAddress ??
      user.emailAddresses[0]?.emailAddress ??
      "";

    return {
      id: user.id,
      email,
      fullName:
        user.fullName?.trim() ||
        [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
        email.split("@")[0] ||
        "9Jobs Candidate",
    };
  }, [isSignedIn, user]);

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
      async signInDemo() {
        return;
      },
      async signOut() {
        await clerkSignOut();
      },
    }),
    [
      authLoaded,
      clerkSignOut,
      hasCompletedOnboarding,
      isOnboardingLoaded,
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
