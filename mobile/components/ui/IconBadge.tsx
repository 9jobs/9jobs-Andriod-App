import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";

export const iconTones = {
  green: "#F2FAE8",
  purple: "#F3EEFF",
  gold: "#FFF6D8",
  lime: "#F0FBD8",
  blue: "#EAF4FF",
  rose: "#FFF0F2",
  peach: "#FFF0E5",
} as const;

export type IconTone = keyof typeof iconTones;

const semanticTones: Record<string, IconTone> = {
  home: "green", briefcase: "green", search: "blue", saved: "gold",
  tracker: "purple", profile: "peach", spark: "gold", pin: "rose",
  grid: "purple", mail: "blue", mic: "rose", resume: "lime",
  bell: "gold", story: "peach", star: "gold", pricing: "gold", settings: "purple", info: "blue",
  eye: "blue", "eye-off": "blue",
};

export function iconTone(name: string): IconTone {
  return semanticTones[name] ?? "green";
}

// The halo is decorative: keep the original icon footprint and touch target.
export function IconBadge({ children, width, height = width, tone = "green" }: PropsWithChildren<{
  width: number;
  height?: number;
  tone?: IconTone;
}>) {
  const diameter = Math.max(width, height) + (Math.max(width, height) <= 16 ? 8 : 12);
  return (
    <View style={{ width, height, alignItems: "center", justifyContent: "center" }} pointerEvents="none" accessible={false}>
      <View style={[styles.halo, { width: diameter, height: diameter, borderRadius: diameter / 2, backgroundColor: iconTones[tone] }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  halo: { position: "absolute" },
});
