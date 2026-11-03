import { Platform } from "react-native";
import { useSyncExternalStore } from "react";

let darkThemeActive = false;
let themeVersion = 0;
const themeListeners = new Set<() => void>();

export const colors = {
  background: "#FBF9F7",
  surface: "#FFFFFF",
  surfaceMuted: "#F5F3F1",
  surfaceRaised: "#FFFFFF",
  text: "#1B1C1B",
  mutedText: "#434933",
  subtleText: "#747A60",
  accent: "#C5FF00",
  accentDark: "#4E6700",
  border: "#EFEEEB",
  borderStrong: "#E4E3DF",
  shadow: "rgba(10, 10, 8, 0.12)",
  chip: "#171816",
  chipMuted: "rgba(23, 24, 22, 0.08)",
  success: "#6EE7B7",
  dark: "#1B1C1B",
  darkCard: "#1A1A1A",
  darkMuted: "#A1A595",
  heroSurface: "#F5F3F1",
  deviceShell: "#1B1C18",
  glow: "rgba(2, 254, 0, 0.38)",
  softAccent: "#CCEB84",
  panel: "#F5F3F1",
  tabBackground: "#FBF9F7",
  heroBorder: "rgba(255,255,255,0.08)",
  darkChip: "rgba(255,255,255,0.06)",
  darkChipStrong: "rgba(255,255,255,0.12)",
  warning: "#FACC15",
};

export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};

export const radii = {
  sm: 12,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
};

export const shadows = {
  soft: Platform.select({
    web: {
      boxShadow: "0px 18px 42px rgba(10, 10, 8, 0.14)",
    },
    default: {
      shadowColor: "#000000",
      shadowOpacity: 0.04,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 10 },
      elevation: 2,
    },
  }),
  card: Platform.select({
    web: {
      boxShadow: "0px 10px 26px rgba(10, 10, 8, 0.10)",
    },
    default: {
      shadowColor: "#000000",
      shadowOpacity: 0.03,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 1,
    },
  }),
  float: Platform.select({
    web: {
      boxShadow: "10px 18px 32px rgba(10, 10, 8, 0.18)",
    },
    default: {
      shadowColor: "#000000",
      shadowOpacity: 0.06,
      shadowRadius: 24,
      shadowOffset: { width: 8, height: 12 },
      elevation: 3,
    },
  }),
  glow: Platform.select({
    web: {
      boxShadow: "0px 24px 60px rgba(163, 230, 53, 0.18)",
    },
    default: {
      shadowColor: "#A3E635",
      shadowOpacity: 0.06,
      shadowRadius: 34,
      shadowOffset: { width: 0, height: 10 },
      elevation: 2,
    },
  }),
};

export const typography = {
  display: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "800" as const,
    letterSpacing: -0.7,
   fontFamily: "PlusJakartaSans_600SemiBold" },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700" as const,
   fontFamily: "PlusJakartaSans_600SemiBold" },
  headline: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "800" as const,
    letterSpacing: -0.5,
   fontFamily: "PlusJakartaSans_600SemiBold" },
  body: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "400" as const,
   fontFamily: "Inter_400Regular" },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600" as const,
    letterSpacing: 0.2,
   fontFamily: "Inter_400Regular" },
};

export function setTheme(isDark: boolean) {
  const themeChanged = darkThemeActive !== isDark;
  darkThemeActive = isDark;
  if (isDark) {
    colors.background = "#000000";
    colors.surface = "#1A1A1A";
    colors.surfaceMuted = "#242424";
    colors.surfaceRaised = "#2E2E2E";
    colors.text = "#FFFFFF";
    colors.mutedText = "#A1A595";
    colors.subtleText = "#434933";
    colors.border = "#2A2B27";
    colors.borderStrong = "#3A3B36";
    colors.tabBackground = "#1A1A1A";
    colors.panel = "#1A1A1A";
  } else {
    colors.background = "#FBF9F7";
    colors.surface = "#FFFFFF";
    colors.surfaceMuted = "#F5F3F1";
    colors.surfaceRaised = "#FFFFFF";
    colors.text = "#1B1C1B";
    colors.mutedText = "#434933";
    colors.subtleText = "#747A60";
    colors.border = "#EFEEEB";
    colors.borderStrong = "#E4E3DF";
    colors.tabBackground = "#FBF9F7";
    colors.panel = "#F5F3F1";
  }

  if (themeChanged) {
    themeVersion += 1;
    themeListeners.forEach((listener) => listener());
  }
}

export function useThemeVersion() {
  return useSyncExternalStore(
    (listener) => {
      themeListeners.add(listener);
      return () => themeListeners.delete(listener);
    },
    () => themeVersion,
    () => themeVersion,
  );
}
