import { PropsWithChildren, useEffect, useRef } from "react";
import Animated, { FadeInUp } from "react-native-reanimated";

export function CTAReveal({ children }: PropsWithChildren) {
  const isFirstRender = useRef(true);

  useEffect(() => {
    isFirstRender.current = false;
  }, []);

  if (isFirstRender.current) {
    return (
      <Animated.View entering={FadeInUp.delay(120).springify().damping(15)}>
        {children}
      </Animated.View>
    );
  }

  return <Animated.View>{children}</Animated.View>;
}
