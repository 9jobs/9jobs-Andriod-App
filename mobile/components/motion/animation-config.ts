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

export function shouldShowOrbitalGlow(pathname: string): boolean {
  return true;
}
