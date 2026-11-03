import { forwardRef } from "react";
import { ScrollView, type ScrollViewProps } from "react-native";
import { verticalScrollProps } from "@/lib/ui/scroll";

/** Keep native in sole control of scroll position and momentum. */
export const SmoothScrollView = forwardRef<ScrollView, ScrollViewProps>(function SmoothScrollView(
  { children, horizontal, ...props },
  forwardedRef,
) {
  return (
    <ScrollView {...(horizontal ? {} : verticalScrollProps)} {...props} ref={forwardedRef} horizontal={horizontal}>
      {children}
    </ScrollView>
  );
});
