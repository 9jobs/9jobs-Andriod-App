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
    count: 14,
    duration: 8_600,
    lightOpacity: 0.18,
    lightOpacityPeak: 0.28,
    cardOpacity: 0.28,
    cardOpacityPeak: 0.48,
  },
  mesh: {
    duration: 11_500,
    lightOpacity: 0.12,
  },
  orbit: {
    duration: 12_000,
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
