import { PropsWithChildren } from "react";
import { StyleProp, ViewStyle } from "react-native";
import { StableEntranceView } from "./StableEntranceView";

type AnimatedScreenContainerProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

export function AnimatedScreenContainer({
  children,
  style,
}: AnimatedScreenContainerProps) {
  return (
    <StableEntranceView direction="up" distance={6} duration={280} revealOnScroll={false} style={style}>
      {children}
    </StableEntranceView>
  );
}
