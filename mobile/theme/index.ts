import { Platform } from "react-native";

export const colors = {
  background: "#F4F1E8",
  surface: "#FFFFFF",
  surfaceMuted: "#FCFBF7",
  surfaceRaised: "#FFFEFA",
  text: "#0A0A08",
  mutedText: "#6F7268",
  subtleText: "#8B8F82",
  accent: "#A3E635",
  accentDark: "#7FB21D",
  border: "#E8E5DB",
  borderStrong: "#DAD6C8",
  shadow: "rgba(10, 10, 8, 0.12)",
  chip: "#171816",
  chipMuted: "rgba(23, 24, 22, 0.08)",
  success: "#6EE7B7",
  dark: "#090A08",
  darkCard: "#11120F",
  darkMuted: "#A1A595",
  heroSurface: "#F2EFE6",
  deviceShell: "#1B1C18",
  glow: "rgba(163, 230, 53, 0.38)",
  softAccent: "#E6F7BB",
  panel: "#F9F7F0",
  tabBackground: "rgba(252, 252, 248, 0.96)",
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
  md: 18,
  lg: 28,
  xl: 36,
  xxl: 44,
  pill: 999,
};

export const shadows = {
  soft: Platform.select({
    web: {
      boxShadow: "0px 18px 42px rgba(10, 10, 8, 0.14)",
    },
    default: {
      shadowColor: "#000000",
      shadowOpacity: 0.09,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },
  }),
  card: Platform.select({
    web: {
      boxShadow: "0px 10px 26px rgba(10, 10, 8, 0.10)",
    },
    default: {
      shadowColor: "#000000",
      shadowOpacity: 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 5,
    },
  }),
  float: Platform.select({
    web: {
      boxShadow: "10px 18px 32px rgba(10, 10, 8, 0.18)",
    },
    default: {
      shadowColor: "#000000",
      shadowOpacity: 0.18,
      shadowRadius: 24,
      shadowOffset: { width: 8, height: 12 },
      elevation: 10,
    },
  }),
  glow: Platform.select({
    web: {
      boxShadow: "0px 24px 60px rgba(163, 230, 53, 0.18)",
    },
    default: {
      shadowColor: "#A3E635",
      shadowOpacity: 0.18,
      shadowRadius: 34,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },
  }),
};

export const typography = {
  display: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800" as const,
    letterSpacing: -1.2,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700" as const,
  },
  headline: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800" as const,
    letterSpacing: -0.5,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "400" as const,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600" as const,
    letterSpacing: 0.2,
  },
};
