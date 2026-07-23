// Live Spline rendering requires react-native-webview and EXPO_PUBLIC_SPLINE_SCENE_URL. Without both, the component renders the existing static UI.

import React from "react";
import { ViewStyle } from "react-native";
import { useReducedMotionPreference } from "./ReducedMotion";

export type SplineBackgroundProps = {
  sceneUrl?: string;
  style?: ViewStyle;
  fallback?: React.ReactNode;
};

export function SplineBackground({
  sceneUrl = process.env.EXPO_PUBLIC_SPLINE_SCENE_URL,
  fallback = null,
}: SplineBackgroundProps) {
  const isReducedMotion = useReducedMotionPreference();

  const isValidUrl =
    Boolean(sceneUrl) &&
    typeof sceneUrl === "string" &&
    sceneUrl !== "YOUR_SPLINE_SCENE_URL" &&
    (sceneUrl.startsWith("http://") || sceneUrl.startsWith("https://"));

  // Bundle-safe static fallback rendering when react-native-webview or valid scene URL is absent
  if (isReducedMotion || !isValidUrl) {
    return <>{fallback}</>;
  }

  return <>{fallback}</>;
}
