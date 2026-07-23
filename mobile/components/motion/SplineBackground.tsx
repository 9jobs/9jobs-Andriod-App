import React, { useState } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { useReducedMotionPreference } from "./ReducedMotion";

export type SplineBackgroundProps = {
  sceneUrl?: string;
  style?: ViewStyle;
  fallback?: React.ReactNode;
};

export function SplineBackground({
  sceneUrl = process.env.EXPO_PUBLIC_SPLINE_SCENE_URL,
  style,
  fallback = null,
}: SplineBackgroundProps) {
  const isReducedMotion = useReducedMotionPreference();
  const [hasError, setHasError] = useState(false);

  const isValidUrl =
    Boolean(sceneUrl) &&
    typeof sceneUrl === "string" &&
    sceneUrl !== "YOUR_SPLINE_SCENE_URL" &&
    (sceneUrl.startsWith("http://") || sceneUrl.startsWith("https://"));

  if (isReducedMotion || !isValidUrl || hasError) {
    return <>{fallback}</>;
  }

  try {
    // Dynamic import safety for webview across Expo targets
    const WebView = require("react-native-webview").default;

    return (
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.container, style]}
      >
        <WebView
          source={{ uri: sceneUrl }}
          style={styles.webview}
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          onError={() => setHasError(true)}
          onHttpError={() => setHasError(true)}
          androidLayerType="hardware"
        />
      </View>
    );
  } catch (err) {
    return <>{fallback}</>;
  }
}

const styles = StyleSheet.create({
  container: {
    zIndex: -1,
    opacity: 0.6,
  },
  webview: {
    backgroundColor: "transparent",
  },
});
