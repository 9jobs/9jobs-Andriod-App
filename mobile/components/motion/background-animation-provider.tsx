import {
  createContext,
  PropsWithChildren,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AppState } from "react-native";
import { useReducedMotionPreference } from "./ReducedMotion";

type BackgroundAnimationState = {
  animationsEnabled: boolean;
  reducedMotion: boolean;
};

export const BackgroundAnimationContext =
  createContext<BackgroundAnimationState>({
    animationsEnabled: true,
    reducedMotion: false,
  });

export function BackgroundAnimationProvider({
  children,
}: PropsWithChildren) {
  const reducedMotion = useReducedMotionPreference();
  const [isAppActive, setIsAppActive] = useState(
    AppState.currentState !== "background" &&
      AppState.currentState !== "inactive",
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      setIsAppActive(nextState === "active");
    });

    return () => subscription.remove();
  }, []);

  const value = useMemo(
    () => ({
      animationsEnabled: isAppActive && !reducedMotion,
      reducedMotion,
    }),
    [isAppActive, reducedMotion],
  );

  return (
    <BackgroundAnimationContext value={value}>
      {children}
    </BackgroundAnimationContext>
  );
}
