"use client";

import { ClerkProvider } from "@clerk/clerk-react";

const clerkPublishableKey =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  "pk_test_dXNhYmxlLWZsZWEtNzAuY2xlcmsuYWNjb3VudHMuZGV2JA";

export function Providers({ children }: Readonly<{ children: React.ReactNode }>) {
  return <ClerkProvider publishableKey={clerkPublishableKey}>{children}</ClerkProvider>;
}
