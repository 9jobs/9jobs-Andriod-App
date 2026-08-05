import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppProviders } from "@/providers/AppProviders";

// Global navigation lock to prevent double-tap screen transition stutters/pushes
try {
  const originalPush = router.push;
  let lastNavTime = 0;
  router.push = (href: any, options: any) => {
    const now = Date.now();
    if (now - lastNavTime < 500) return;
    lastNavTime = now;
    return originalPush(href, options);
  };

  const originalReplace = router.replace;
  router.replace = (href: any, options: any) => {
    const now = Date.now();
    if (now - lastNavTime < 500) return;
    lastNavTime = now;
    return originalReplace(href, options);
  };
} catch (e) {
  console.warn("Global router patch failed:", e);
}

export default function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(public)" />
        <Stack.Screen name="questionnaire" />
        <Stack.Screen name="(app)" />
      </Stack>
    </AppProviders>
  );
}
