import { PropsWithChildren, useEffect, useRef } from "react";
import Animated, { FadeInUp } from "react-native-reanimated";

export function AnimatedScreenShell({ children }: PropsWithChildren) {
  const isFirstRender = useRef(true);

  useEffect(() => {
    isFirstRender.current = false;
  }, []);

  if (isFirstRender.current) {
    return (
      <Animated.View entering={FadeInUp.springify().damping(16).stiffness(180)}>
        {children}
      </Animated.View>
    );
  }

  return <Animated.View>{children}</Animated.View>;
}
