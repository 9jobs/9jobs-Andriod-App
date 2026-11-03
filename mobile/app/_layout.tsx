import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppProviders } from "@/providers/AppProviders";
import { useFonts } from "expo-font";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold } from "@expo-google-fonts/plus-jakarta-sans";

function normalizeHref(href: any) {
  if (typeof href === "string") {
    return href;
  }

  if (href && typeof href === "object" && "pathname" in href) {
    return String(href.pathname ?? "");
  }

  return "";
}

// Global navigation lock to prevent duplicate user taps without blocking redirects.
try {
  const originalPush = router.push;
  let lastNavTime = 0;
  let lastRoute = "";
  router.push = (href: any, options: any) => {
    const now = Date.now();
    const nextRoute = normalizeHref(href);
    if (nextRoute === lastRoute && now - lastNavTime < 500) return;
    lastNavTime = now;
    lastRoute = nextRoute;
    return originalPush(href, options);
  };

  const originalReplace = router.replace;
  router.replace = (href: any, options: any) => {
    const now = Date.now();
    const nextRoute = normalizeHref(href);
    if (nextRoute === lastRoute && now - lastNavTime < 500) return;
    lastNavTime = now;
    lastRoute = nextRoute;
    return originalReplace(href, options);
  };
} catch (e) {
  console.warn("Global router patch failed:", e);
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold,
    PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold,
  });
  if (!fontsLoaded && !fontError) return null;

  return (
    <AppProviders>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(public)" />
        <Stack.Screen name="sso-callback" />
        <Stack.Screen name="questionnaire" />
        <Stack.Screen name="(app)" />
      </Stack>
    </AppProviders>
  );
}
