import { PropsWithChildren, useCallback, useRef } from "react";
import { useFocusEffect, usePathname } from "expo-router";
import { ScrollView, StyleSheet, ViewStyle } from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { verticalScrollProps } from "@/lib/ui/scroll";
import { colors, spacing } from "@/theme";
import { AnimatedScreenContainer } from "@/components/motion/animated-screen-container";
import { ScreenBackground } from "@/components/motion/screen-background";

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  preserveScroll?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}>;

const screenScrollOffsets = new Map<string, number>();

export function Screen({
  children,
  scroll = true,
  preserveScroll = false,
  style,
  contentStyle,
}: ScreenProps) {
  const pathname = usePathname();
  const scrollRef = useRef<ScrollView | null>(null);
  const lastOffsetRef = useRef(screenScrollOffsets.get(pathname) ?? 0);
  const scrollOffset = useSharedValue(lastOffsetRef.current);
  const animatedScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollOffset.value = event.contentOffset.y;
    },
  });

  const saveOffset = useCallback(
    (y: number) => {
      if (!preserveScroll) return;
      lastOffsetRef.current = y;
      screenScrollOffsets.set(pathname, y);
    },
    [pathname, preserveScroll]
  );

  const restoreOffset = useCallback(() => {
    if (!scroll || !preserveScroll) return;
    const savedOffset = screenScrollOffsets.get(pathname) ?? 0;
    if (savedOffset <= 0) return;

    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: savedOffset, animated: false });
    });
  }, [pathname, preserveScroll, scroll]);

  useFocusEffect(
    useCallback(() => {
      if (preserveScroll) {
        restoreOffset();
      }
      return () => {
        if (preserveScroll) {
          saveOffset(lastOffsetRef.current);
        }
      };
    }, [preserveScroll, restoreOffset, saveOffset])
  );

  const body = (
    <AnimatedScreenContainer style={[styles.content, contentStyle]}>
      <ScreenBackground scrollOffset={scrollOffset} />
      {children}
    </AnimatedScreenContainer>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }, style]}>
      {scroll ? (
        <Animated.ScrollView
          ref={scrollRef}
          {...verticalScrollProps}
          onScroll={animatedScrollHandler}
          onScrollEndDrag={(event) =>
            saveOffset(event.nativeEvent.contentOffset.y)
          }
          onMomentumScrollEnd={(event) =>
            saveOffset(event.nativeEvent.contentOffset.y)
          }
          contentContainerStyle={styles.scrollInner}
        >
          {body}
        </Animated.ScrollView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    width: "100%",
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
    gap: spacing.lg,
  },
  scrollInner: {
    paddingBottom: 12,
  },
});
