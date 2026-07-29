import { PropsWithChildren, useEffect, useRef } from "react";
import Animated, { Easing, FadeInUp } from "react-native-reanimated";

export function AnimatedScreenShell({ children }: PropsWithChildren) {
  const isFirstRender = useRef(true);

  useEffect(() => {
    isFirstRender.current = false;
  }, []);

  if (isFirstRender.current) {
    return (
      <Animated.View
        entering={FadeInUp.duration(280)
          .withInitialValues({ opacity: 0, transform: [{ translateY: 8 }] })
          .easing(Easing.out(Easing.cubic))}
      >
        {children}
      </Animated.View>
    );
  }

  return <Animated.View>{children}</Animated.View>;
}
