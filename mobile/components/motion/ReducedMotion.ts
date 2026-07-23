import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { useReducedMotion as useReanimatedReducedMotion } from "react-native-reanimated";

export function useReducedMotionPreference(): boolean {
  const isReanimatedReduced = useReanimatedReducedMotion();
  const [isAccessibilityReduced, setIsAccessibilityReduced] = useState(false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) {
        setIsAccessibilityReduced(enabled);
      }
    });

    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => {
        if (mounted) {
          setIsAccessibilityReduced(enabled);
        }
      }
    );

    return () => {
      mounted = false;
      subscription?.remove?.();
    };
  }, []);

  return isReanimatedReduced || isAccessibilityReduced;
}
