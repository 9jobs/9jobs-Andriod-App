export const animationConfig = {
  entrance: {
    distance: 12,
    duration: 300,
  },
  press: {
    duration: 130,
    opacity: 0.92,
    scale: 0.98,
  },
  particles: {
    count: 16,
    duration: 5_800,
    lightOpacity: 0.24,
    lightOpacityPeak: 0.42,
    cardOpacity: 0.34,
    cardOpacityPeak: 0.64,
  },
  mesh: {
    duration: 6_800,
    lightOpacity: 0.18,
  },
  orbit: {
    duration: 6_500,
  },
} as const;

export function shouldShowOrbitalGlow(pathname: string): boolean {
  return (
    pathname === "/splash" ||
    pathname === "/(public)" ||
    pathname.includes("/resume") ||
    pathname.includes("/interview")
  );
}
