type InitialRouteInput = {
  hasCompletedOnboarding: boolean;
  hasSession: boolean;
};

export function getInitialRoute({
  hasCompletedOnboarding,
  hasSession,
}: InitialRouteInput) {
  if (!hasSession) {
    return "/(public)/auth/sign-up" as const;
  }

  return "/(app)" as const;
}
