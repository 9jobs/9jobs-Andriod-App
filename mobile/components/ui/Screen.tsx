import { PropsWithChildren, useCallback, useRef } from "react";
import { useFocusEffect, usePathname } from "expo-router";
import { ScrollView, StyleSheet, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { verticalScrollProps } from "@/lib/ui/scroll";
import { colors, spacing } from "@/theme";

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}>;

const screenScrollOffsets = new Map<string, number>();

export function Screen({ children, scroll = true, style, contentStyle }: ScreenProps) {
  const pathname = usePathname();
  const scrollRef = useRef<ScrollView | null>(null);
  const lastOffsetRef = useRef(screenScrollOffsets.get(pathname) ?? 0);
  const shouldRestoreRef = useRef(scroll);

  const saveOffset = useCallback((y: number) => {
    lastOffsetRef.current = y;
    screenScrollOffsets.set(pathname, y);
  }, [pathname]);

  const restoreOffset = useCallback(() => {
    if (!scroll || !shouldRestoreRef.current) {
      return;
    }

    const savedOffset = screenScrollOffsets.get(pathname) ?? 0;
    if (savedOffset <= 0) {
      shouldRestoreRef.current = false;
      return;
    }

    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: savedOffset, animated: false });
      shouldRestoreRef.current = false;
    });
  }, [pathname, scroll]);

  useFocusEffect(
    useCallback(() => {
      shouldRestoreRef.current = scroll;
      restoreOffset();

      return () => {
        saveOffset(lastOffsetRef.current);
      };
    }, [restoreOffset, saveOffset, scroll]),
  );

  const body = (
    <View style={[styles.content, contentStyle]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }, style]}>
      {scroll ? (
        <ScrollView
          ref={scrollRef}
          {...verticalScrollProps}
          onScroll={(event) => saveOffset(event.nativeEvent.contentOffset.y)}
          onMomentumScrollEnd={(event) => saveOffset(event.nativeEvent.contentOffset.y)}
          onScrollEndDrag={(event) => saveOffset(event.nativeEvent.contentOffset.y)}
          onContentSizeChange={restoreOffset}
          contentContainerStyle={styles.scrollInner}
        >
          {body}
        </ScrollView>
      ) : body}
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
