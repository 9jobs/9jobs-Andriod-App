import React, { PropsWithChildren } from "react";
import { StyleProp, ViewStyle } from "react-native";
import { EntranceDirection, StableEntranceView } from "./StableEntranceView";

export type AnimationType =
  | "fade"
  | "fade-up"
  | "fade-down"
  | "fade-left"
  | "fade-right"
  | "scale-in";

type FadeInViewProps = PropsWithChildren<{
  type?: AnimationType;
  delay?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}>;

const directionByType: Record<AnimationType, EntranceDirection> = {
  fade: "none",
  "fade-up": "up",
  "fade-down": "down",
  "fade-left": "left",
  "fade-right": "right",
  "scale-in": "scale",
};

export function FadeInView({
  children,
  type = "fade-up",
  delay = 0,
  duration = 320,
  style,
}: FadeInViewProps) {

  return (
    <StableEntranceView
      direction={directionByType[type]}
      delay={delay}
      duration={duration}
      style={style}
    >
      {children}
    </StableEntranceView>
  );
}
