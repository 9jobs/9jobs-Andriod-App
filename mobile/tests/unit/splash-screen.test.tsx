jest.mock("expo-router", () => {
  const replaceMock = jest.fn();
  return {
    router: {
      replace: replaceMock,
    },
    useLocalSearchParams: jest.fn(),
    Redirect: ({ href }: { href: string }) => {
      replaceMock(href);
      return null;
    },
  };
});

jest.mock("@/providers/SessionProvider", () => ({
  useSession: jest.fn(),
}));

jest.mock("@/components/brand/BrandLogo", () => ({
  BrandLogo: () => null,
}));

import TestRenderer, { act } from "react-test-renderer";
import IndexScreen from "@/app/index";
import SplashScreen from "@/app/splash";
import { router, useLocalSearchParams } from "expo-router";
import { useSession } from "@/providers/SessionProvider";

describe("IndexScreen", () => {
  beforeAll(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true;
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test("keeps the user on splash when returning from auth", () => {
    (useSession as jest.Mock).mockReturnValue({
      isBooting: false,
      hasCompletedOnboarding: true,
      user: null,
    });
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      fromAuth: "1",
    });

    let tree: TestRenderer.ReactTestRenderer;

    act(() => {
      tree = TestRenderer.create(<IndexScreen />);
    });

    (useLocalSearchParams as jest.Mock).mockReturnValue({});

    act(() => {
      tree.update(<IndexScreen />);
    });

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(router.replace).not.toHaveBeenCalled();
  });

  test("redirects to the next route on a normal app launch", () => {
    (useSession as jest.Mock).mockReturnValue({
      isBooting: false,
      hasCompletedOnboarding: true,
      user: null,
    });
    (useLocalSearchParams as jest.Mock).mockReturnValue({});

    act(() => {
      TestRenderer.create(<IndexScreen />);
    });

    act(() => {
      jest.advanceTimersByTime(1100);
    });

    expect(router.replace).toHaveBeenCalledWith("/(public)/auth/sign-up");
  });
});

describe("SplashScreen", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test("redirects to sign up after 5 seconds", () => {
    act(() => {
      TestRenderer.create(<SplashScreen />);
    });

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(router.replace).toHaveBeenCalledWith("/(public)/auth/sign-up");
  });
});
