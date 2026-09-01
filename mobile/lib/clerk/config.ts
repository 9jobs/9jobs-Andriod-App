export const clerkPublishableKey =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

const clerkAuthToggle = process.env.EXPO_PUBLIC_ENABLE_CLERK_AUTH
  ?.trim()
  .toLowerCase();

const isClerkAuthEnabled =
  clerkAuthToggle === undefined || clerkAuthToggle === ""
    ? true
    : clerkAuthToggle === "true";

export const isClerkConfigured =
  isClerkAuthEnabled && clerkPublishableKey.trim().length > 0;
