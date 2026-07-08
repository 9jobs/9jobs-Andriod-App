export const clerkPublishableKey =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

export const isClerkConfigured = clerkPublishableKey.trim().length > 0;
