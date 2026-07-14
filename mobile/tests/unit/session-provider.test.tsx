jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("@clerk/expo", () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: false }),
  useClerk: () => ({ signOut: jest.fn() }),
  useUser: () => ({ isLoaded: true, user: null }),
}));

jest.mock("@/lib/clerk/config", () => ({
  isClerkConfigured: false,
}));

const mockConnectSocket = jest.fn(() => Promise.resolve());

jest.mock("@/lib/socket/socketService", () => ({
  connectSocket: () => mockConnectSocket(),
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Text } from "react-native";
import TestRenderer, { act } from "react-test-renderer";
import { storageKeys } from "@/lib/utils/storage";
import { SessionProvider, useSession } from "@/providers/SessionProvider";

function SessionProbe() {
  const { user, signInDemo, signOut } = useSession();

  return (
    <>
      <Text testID="session-state">{user ? user.email : "signed-out"}</Text>
      <Text
        testID="sign-in"
        onPress={() => {
          void signInDemo({ email: "candidate@9jobs.app", fullName: "Test User" });
        }}
      >
        sign-in
      </Text>
      <Text
        testID="sign-out"
        onPress={() => {
          void signOut();
        }}
      >
        sign-out
      </Text>
    </>
  );
}

describe("SessionProvider", () => {
  beforeAll(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true;
  });

  beforeEach(async () => {
    await AsyncStorage.clear();
    mockConnectSocket.mockClear();
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: "test-backend-token" }),
      status: 200,
    } as Response);
  });

  test("clears the demo user on sign out when Clerk is not configured", async () => {
    let tree: TestRenderer.ReactTestRenderer;

    await act(async () => {
      tree = TestRenderer.create(
        <SessionProvider>
          <SessionProbe />
        </SessionProvider>,
      );
    });

    const getByTestId = (testID: string) =>
      tree.root.findByProps({ testID }) as TestRenderer.ReactTestInstance;

    expect(getByTestId("session-state").props.children).toBe("signed-out");

    await act(async () => {
      getByTestId("sign-in").props.onPress();
    });

    expect(getByTestId("session-state").props.children).toBe("candidate@9jobs.app");
    expect(await AsyncStorage.getItem(storageKeys.mockSession)).toContain(
      "candidate@9jobs.app",
    );

    await act(async () => {
      getByTestId("sign-out").props.onPress();
    });

    expect(getByTestId("session-state").props.children).toBe("signed-out");
    expect(await AsyncStorage.getItem(storageKeys.mockSession)).toBeNull();
  });

  test("restores the demo user from storage on app boot", async () => {
    await AsyncStorage.setItem(
      storageKeys.mockSession,
      JSON.stringify({
        id: "demo-user",
        email: "restored@9jobs.app",
        fullName: "Restored User",
      }),
    );
    await AsyncStorage.setItem(storageKeys.onboardingComplete, "true");

    let tree: TestRenderer.ReactTestRenderer;

    await act(async () => {
      tree = TestRenderer.create(
        <SessionProvider>
          <SessionProbe />
        </SessionProvider>,
      );
    });

    const getByTestId = (testID: string) =>
      tree.root.findByProps({ testID }) as TestRenderer.ReactTestInstance;

    expect(getByTestId("session-state").props.children).toBe("restored@9jobs.app");
  });

  test("connects the socket after saving the backend auth token", async () => {
    let tree!: TestRenderer.ReactTestRenderer;

    await act(async () => {
      tree = TestRenderer.create(
        <SessionProvider>
          <SessionProbe />
        </SessionProvider>,
      );
    });

    const getByTestId = (testID: string) =>
      tree.root.findByProps({ testID }) as TestRenderer.ReactTestInstance;

    await act(async () => {
      getByTestId("sign-in").props.onPress();
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(await AsyncStorage.getItem("auth_token")).toBe("test-backend-token");
    expect(mockConnectSocket).toHaveBeenCalled();
  });
});
