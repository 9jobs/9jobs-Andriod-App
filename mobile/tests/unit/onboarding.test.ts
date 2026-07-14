import { getInitialRoute } from "@/features/onboarding/getInitialRoute";

describe("getInitialRoute", () => {
  test("returns onboarding when the user has not completed it", () => {
    expect(
      getInitialRoute({
        hasCompletedOnboarding: false,
        hasSession: false,
      }),
    ).toBe("/(public)");
  });

  test("returns auth when onboarding is complete but no session exists", () => {
    expect(
      getInitialRoute({
        hasCompletedOnboarding: true,
        hasSession: false,
      }),
    ).toBe("/(public)/auth/sign-up");
  });

  test("returns the app when both onboarding and session are ready", () => {
    expect(
      getInitialRoute({
        hasCompletedOnboarding: true,
        hasSession: true,
      }),
    ).toBe("/(app)");
  });
});
