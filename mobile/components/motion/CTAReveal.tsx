import { PropsWithChildren } from "react";
import { StableEntranceView } from "./StableEntranceView";

export function CTAReveal({ children }: PropsWithChildren) {
  return (
    <StableEntranceView direction="up" delay={80} duration={420}>
      {children}
    </StableEntranceView>
  );
}
