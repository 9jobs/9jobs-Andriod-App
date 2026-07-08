import { PropsWithChildren } from "react";
import Animated, { FadeInUp } from "react-native-reanimated";

export function AnimatedScreenShell({ children }: PropsWithChildren) {
  return enteringWrapper(children);
}

function enteringWrapper(children: React.ReactNode) {
  return (
    <Animated.View entering={FadeInUp.springify().damping(16).stiffness(180)}>
      {children}
    </Animated.View>
  );
}
