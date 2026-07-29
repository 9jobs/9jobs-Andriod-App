import { use, useCallback, useState } from "react";
import { useFocusEffect, usePathname } from "expo-router";
import { StyleSheet, View } from "react-native";
import { BackgroundAnimationContext } from "./background-animation-provider";
import { FloatingParticlesBackground } from "./floating-particles-background";
import { SubtleMeshWave } from "./subtle-mesh-wave";
import { OrbitalGlow } from "./orbital-glow";
import { shouldShowOrbitalGlow } from "./animation-config";

export function ScreenBackground() {
  const pathname = usePathname();
  const { animationsEnabled } = use(BackgroundAnimationContext);
  const [isFocused, setIsFocused] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, []),
  );

  const shouldAnimate = animationsEnabled && isFocused;
  const showOrbit = shouldShowOrbitalGlow(pathname);

  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      <SubtleMeshWave animated={shouldAnimate} />
      <FloatingParticlesBackground animated={shouldAnimate} />
      {showOrbit ? <OrbitalGlow animated={shouldAnimate} /> : null}
    </View>
  );
}
