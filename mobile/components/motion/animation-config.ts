export const animationConfig = {
  entrance: {
    distance: 12,
    duration: 400,
  },
  press: {
    duration: 130,
    opacity: 0.92,
    scale: 0.98,
  },
  particles: {
    count: 14,
    duration: 9_500,
  },
  mesh: {
    duration: 10_000,
  },
  orbit: {
    duration: 12_000,
  },
} as const;

export type BackgroundEffect = "minimal" | "particles" | "mesh" | "orbital";

export function getBackgroundEffect(pathname: string): BackgroundEffect {
  if (
    pathname.includes("/auth") ||
    pathname.includes("/chat/") ||
    pathname.includes("/security") ||
    pathname.includes("/personal-information") ||
    pathname.includes("/contact")
  ) {
    return "minimal";
  }

  if (
    pathname.includes("/resume") ||
    pathname.includes("/interview") ||
    pathname.includes("/pricing")
  ) {
    return "orbital";
  }

  if (
    pathname === "/" ||
    pathname === "/(app)" ||
    pathname.endsWith("/(app)") ||
    pathname.endsWith("/services")
  ) {
    return "mesh";
  }

  return "particles";
}
