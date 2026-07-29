import { use, useCallback, useState } from "react";
import { useFocusEffect, usePathname } from "expo-router";
import { StyleSheet, View } from "react-native";
import Animated, {
  type SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { BackgroundAnimationContext } from "./background-animation-provider";
import { FloatingParticlesBackground } from "./floating-particles-background";
import { SubtleMeshWave } from "./subtle-mesh-wave";
import { OrbitalGlow } from "./orbital-glow";
import { shouldShowOrbitalGlow } from "./animation-config";

export function ScreenBackground({
  scrollOffset,
}: {
  scrollOffset?: SharedValue<number>;
}) {
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
  const minimalParticles =
    pathname.includes("/chat/") || pathname.includes("/messages");
  const parallaxStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: Math.min(Math.max((scrollOffset?.value ?? 0) * 0.14, 0), 76),
      },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, parallaxStyle]}
    >
      <SubtleMeshWave animated={shouldAnimate} />
      <FloatingParticlesBackground
        animated={shouldAnimate}
        minimal={minimalParticles}
      />
      {showOrbit ? <OrbitalGlow animated={shouldAnimate} /> : null}
    </Animated.View>
  );
}
