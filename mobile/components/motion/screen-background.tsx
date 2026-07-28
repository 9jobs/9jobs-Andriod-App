import { use, useCallback, useState } from "react";
import { useFocusEffect, usePathname } from "expo-router";
import { StyleSheet, View } from "react-native";
import { getBackgroundEffect } from "./animation-config";
import { BackgroundAnimationContext } from "./background-animation-provider";
import { FloatingParticlesBackground } from "./floating-particles-background";
import { OrbitalGlow } from "./orbital-glow";
import { SubtleMeshWave } from "./subtle-mesh-wave";

export function ScreenBackground() {
  const pathname = usePathname();
  const { animationsEnabled } = use(BackgroundAnimationContext);
  const [isFocused, setIsFocused] = useState(true);
  const effect = getBackgroundEffect(pathname);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, []),
  );

  const shouldAnimate = animationsEnabled && isFocused;

  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      <FloatingParticlesBackground
        animated={shouldAnimate}
        minimal={effect === "minimal"}
      />
      {effect === "mesh" ? (
        <SubtleMeshWave animated={shouldAnimate} />
      ) : null}
      {effect === "orbital" ? (
        <OrbitalGlow animated={shouldAnimate} />
      ) : null}
    </View>
  );
}
