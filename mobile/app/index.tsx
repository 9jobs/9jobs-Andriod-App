import { useEffect, useRef, useState } from "react";
import { Redirect, useLocalSearchParams } from "expo-router";
import { SplashPresentation } from "@/components/brand/SplashPresentation";
import { getInitialRoute } from "@/features/onboarding/getInitialRoute";
import { useSession } from "@/providers/SessionProvider";

export default function IndexScreen() {
  const { isBooting, hasCompletedOnboarding, user } = useSession();
  const { fromAuth } = useLocalSearchParams<{ fromAuth?: string }>();
  const shouldHoldSplashRef = useRef(fromAuth === "1");
  const [isReadyToRoute, setIsReadyToRoute] = useState(false);

  if (fromAuth === "1") {
    shouldHoldSplashRef.current = true;
  }

  useEffect(() => {
    if (isBooting) {
      setIsReadyToRoute(false);
      return;
    }

    if (shouldHoldSplashRef.current) {
      return;
    }

    const timeout = setTimeout(() => {
      setIsReadyToRoute(true);
    }, 50);

    return () => clearTimeout(timeout);
  }, [hasCompletedOnboarding, isBooting, user]);

  const target = getInitialRoute({
    hasCompletedOnboarding,
    hasSession: Boolean(user),
  });

  if (!isBooting && !shouldHoldSplashRef.current && isReadyToRoute) {
    return <Redirect href={target} />;
  }

  return <SplashPresentation />;
}
