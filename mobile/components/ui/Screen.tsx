import { SmoothScrollView } from "@/components/ui/SmoothScrollView";
import { PropsWithChildren, useCallback, useRef } from "react";
import { useFocusEffect, usePathname, useSegments } from "expo-router";
import { ScrollView, StyleSheet, View, ViewStyle } from "react-native";
import { SafeAreaView, type SafeAreaViewProps } from "react-native-safe-area-context";
import { verticalScrollProps } from "@/lib/ui/scroll";
import { colors, spacing, useThemeVersion } from "@/theme";
import { ScreenBackground } from "@/components/motion/screen-background";
import { AppHeader } from "./AppHeader";

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  preserveScroll?: boolean;
  showHeader?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  safeAreaEdges?: SafeAreaViewProps["edges"];
}>;

const screenScrollOffsets = new Map<string, number>();

export function Screen({
  children,
  scroll = true,
  preserveScroll = false,
  showHeader = true,
  style,
  contentStyle,
  safeAreaEdges,
}: ScreenProps) {
  useThemeVersion();
  const pathname = usePathname();
  const segments = useSegments();
  const mainTitles: Record<string, string> = { "/": "Home", "/about": "About", "/services": "Services", "/tracker": "Tracker", "/messages": "Chat", "/profile": "Profile" };
  const mainTitle = segments.some(segment => String(segment) === "(app)") ? mainTitles[pathname] : undefined;
  const scrollRef = useRef<ScrollView | null>(null);
  const lastOffsetRef = useRef(screenScrollOffsets.get(pathname) ?? 0);

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
    <View style={[styles.content, contentStyle]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView edges={safeAreaEdges} style={[styles.safeArea, { backgroundColor: colors.background }, style]}>
      {/* Keep native SVG backing surfaces bounded by the viewport, not long scroll content. */}
      <ScreenBackground />
      {showHeader && mainTitle ? <AppHeader title={mainTitle} /> : null}
      {scroll ? (
        <SmoothScrollView
          ref={scrollRef}
          {...verticalScrollProps}
          onScroll={preserveScroll ? (event) => saveOffset(event.nativeEvent.contentOffset.y) : undefined}
          contentContainerStyle={styles.scrollInner}
        >
          {body}
        </SmoothScrollView>
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
    width: "100%",
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
    gap: 24,

    paddingTop: 8,
  },
  scrollInner: {
    flexGrow: 1,
    paddingBottom: 12,
  },
});
