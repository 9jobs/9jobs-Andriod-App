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
  useAuth: () => ({ isLoaded: true, isSignedIn: clerkState.isSignedIn, signOut: jest.fn(), getToken: async () => "fixture-clerk-session" }),
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
import { QueryClient,QueryClientProvider } from "@tanstack/react-query";

function SessionProbe() {
  const { user } = useSession();

  return <Text testID="session-state">{user ? user.email : "signed-out"}</Text>;
}

describe("SessionProvider in Clerk mode", () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => { globalThis.fetch = originalFetch; });
  beforeAll(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true;
  });

  beforeEach(async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ token: "fixture-backend-token", completed: false }) });
    await AsyncStorage.clear();
    clerkState.isSignedIn = false;
    clerkState.user = null;
  });

  test("same-account renders keep session registration stable and preserve fresh query data",async()=>{
    clerkState.isSignedIn=true;
    clerkState.user={id:"unit-stable-account",fullName:"Unit Client",primaryEmailAddress:{emailAddress:"unit@example.com"},emailAddresses:[{emailAddress:"unit@example.com"}]};
    const sheet=jest.spyOn(require("@/lib/data/sheet-records"),"registerSheetSession");
    const backend=jest.spyOn(require("@/lib/data/backend-auth-token"),"registerBackendSession");
    const query=new QueryClient();
    const key=["preview-sync",clerkState.user.id];
    query.setQueryData(key,{homeMetrics:{totalApplications:66}});
    let tree!:TestRenderer.ReactTestRenderer;
    const content=()=> <QueryClientProvider client={query}><SessionProvider><SessionProbe /></SessionProvider></QueryClientProvider>;
    try{
      await act(async()=>{tree=TestRenderer.create(content());});
      const initialSheet=sheet.mock.calls.length,initialBackend=backend.mock.calls.length;
      expect(initialSheet).toBe(1);expect(initialBackend).toBe(1);
      // useAuth's test getter is a NEW function on each render, like an SDK update.
      await act(async()=>{tree.update(content());});
      expect(sheet.mock.calls.length).toBe(initialSheet);expect(backend.mock.calls.length).toBe(initialBackend);
      expect(query.getQueryData(key)).toEqual({homeMetrics:{totalApplications:66}});
      clerkState.isSignedIn=false;clerkState.user=null;
      await act(async()=>{tree.update(content());});
      expect(require("@/lib/data/backend-auth-token").hasBackendSession("unit-stable-account")).toBe(false);
    }finally{await act(async()=>{tree?.unmount();});sheet.mockRestore();backend.mockRestore();query.clear();}
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
