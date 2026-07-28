import { PropsWithChildren, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { LogBox } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { clerkPublishableKey, isClerkConfigured } from "@/lib/clerk/config";
import { SessionProvider } from "@/providers/SessionProvider";
import { BackgroundAnimationProvider } from "@/components/motion/background-animation-provider";

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 0,
          },
        },
      }),
  );

  useEffect(() => {
    if (__DEV__) {
      LogBox.ignoreAllLogs();
    }
  }, []);

  const app = (
    <SafeAreaProvider>
      <BackgroundAnimationProvider>
        <QueryClientProvider client={queryClient}>
          <SessionProvider>{children}</SessionProvider>
        </QueryClientProvider>
      </BackgroundAnimationProvider>
    </SafeAreaProvider>
  );

  if (!isClerkConfigured) {
    return app;
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey} tokenCache={tokenCache}>
      {app}
    </ClerkProvider>
  );
}
