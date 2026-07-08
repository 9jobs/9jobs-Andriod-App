type InitialRouteInput = {
  hasCompletedOnboarding: boolean;
  hasSession: boolean;
};

export function getInitialRoute({
  hasCompletedOnboarding,
  hasSession,
}: InitialRouteInput) {
  if (!hasCompletedOnboarding) {
    return "/(public)" as const;
  }

  if (!hasSession) {
    return "/(public)/auth" as const;
  }

  return "/(app)" as const;
}
