import { PropsWithChildren, useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";

export function FloatingHeroCard({ children }: PropsWithChildren) {
  const translateY = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const yAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -12,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const rotateAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(rotate, {
          toValue: -2,
          duration: 2400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: 2,
          duration: 2400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    yAnimation.start();
    rotateAnimation.start();

    return () => {
      yAnimation.stop();
      rotateAnimation.stop();
    };
  }, [rotate, translateY]);

  const rotateStr = rotate.interpolate({
    inputRange: [-2, 2],
    outputRange: ["-2deg", "2deg"],
  });

  return (
    <Animated.View
      style={{
        transform: [
          { translateY },
          { rotate: rotateStr },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}
