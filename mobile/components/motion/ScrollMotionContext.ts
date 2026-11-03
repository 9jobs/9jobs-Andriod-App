import { createContext } from "react";
import type { ScrollView } from "react-native";
import type { AnimatedRef, SharedValue } from "react-native-reanimated";

export type ScrollMotion = {
  viewportRef: AnimatedRef<ScrollView>;
  offset: SharedValue<number>;
};

export const ScrollMotionContext = createContext<ScrollMotion | null>(null);
