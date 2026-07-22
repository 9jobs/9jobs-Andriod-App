jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const clerkState = {
  isSignedIn: false,
  user: null as
    | null
    | {
        id: string;
        fullName?: string | null;
        firstName?: string | null;
        lastName?: string | null;
        primaryEmailAddress?: { emailAddress: string } | null;
        emailAddresses: Array<{ emailAddress: string }>;
      },
};

jest.mock("@clerk/expo", () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: clerkState.isSignedIn, signOut: jest.fn() }),
  useUser: () => ({ isLoaded: true, user: clerkState.user }),
}));

jest.mock("@/lib/clerk/config", () => ({
  isClerkConfigured: true,
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Text } from "react-native";
import TestRenderer, { act } from "react-test-renderer";
import { storageKeys } from "@/lib/utils/storage";
import { SessionProvider, useSession } from "@/providers/SessionProvider";

function SessionProbe() {
  const { user } = useSession();

  return <Text testID="session-state">{user ? user.email : "signed-out"}</Text>;
}

describe("SessionProvider in Clerk mode", () => {
  beforeAll(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true;
  });

  beforeEach(async () => {
    await AsyncStorage.clear();
    clerkState.isSignedIn = false;
    clerkState.user = null;
  });

  test("clears the legacy demo session when Clerk is configured", async () => {
    await AsyncStorage.setItem(
      storageKeys.mockSession,
      JSON.stringify({
        id: "demo-user",
        email: "candidate@9jobs.app",
        fullName: "Demo Candidate",
      }),
    );
    await AsyncStorage.setItem(storageKeys.onboardingComplete, "true");

    let tree!: TestRenderer.ReactTestRenderer;

    await act(async () => {
      tree = TestRenderer.create(
        <SessionProvider>
          <SessionProbe />
        </SessionProvider>,
      );
    });

    const sessionState = tree.root.findByProps({ testID: "session-state" });

    expect(sessionState.props.children).toBe("signed-out");
    expect(await AsyncStorage.getItem(storageKeys.mockSession)).toBeNull();
  });

  test("keeps the admin test email as its own logged-in identity", async () => {
    clerkState.isSignedIn = true;
    clerkState.user = {
      id: "clerk-admin-user",
      fullName: "9Jobs Administrator",
      firstName: "9Jobs",
      lastName: "Administrator",
      primaryEmailAddress: { emailAddress: "9jobsapplicationservice@gmail.com" },
      emailAddresses: [{ emailAddress: "9jobsapplicationservice@gmail.com" }],
    };

    let tree!: TestRenderer.ReactTestRenderer;

    await act(async () => {
      tree = TestRenderer.create(
        <SessionProvider>
          <SessionProbe />
        </SessionProvider>,
      );
    });

    const sessionState = tree.root.findByProps({ testID: "session-state" });

    expect(sessionState.props.children).toBe("9jobsapplicationservice@gmail.com");
  });
});
