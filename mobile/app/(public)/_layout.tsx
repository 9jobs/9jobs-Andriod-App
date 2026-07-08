import { Redirect, Stack } from "expo-router";
import { useSession } from "@/providers/SessionProvider";

export default function PublicLayout() {
  const { user, hasCompletedOnboarding } = useSession();

  if (user && hasCompletedOnboarding) {
    return <Redirect href="/(app)" />;
  }

  return <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />;
}
