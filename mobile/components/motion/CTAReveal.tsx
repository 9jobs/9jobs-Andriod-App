import { PropsWithChildren } from "react";
import Animated, { FadeInUp } from "react-native-reanimated";

export function CTAReveal({ children }: PropsWithChildren) {
  return (
    <Animated.View entering={FadeInUp.delay(120).springify().damping(15)}>
      {children}
    </Animated.View>
  );
}
