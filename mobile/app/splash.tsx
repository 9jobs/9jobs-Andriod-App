import { useEffect } from "react";
import { router } from "expo-router";
import { SplashPresentation } from "@/components/brand/SplashPresentation";

export default function SplashScreen() {
  useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace("/(public)/auth/sign-up");
    }, 3000);

    return () => clearTimeout(timeout);
  }, []);

  return <SplashPresentation animateEntrance />;
}
