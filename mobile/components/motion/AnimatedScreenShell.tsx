import { PropsWithChildren } from "react";
import { StableEntranceView } from "./StableEntranceView";

export function AnimatedScreenShell({ children }: PropsWithChildren) {
  return (
    <StableEntranceView direction="up" duration={420}>
      {children}
    </StableEntranceView>
  );
}
