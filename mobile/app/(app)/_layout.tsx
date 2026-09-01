import { ActivityIndicator, InteractionManager, StyleSheet, View } from "react-native";
import type { ColorValue } from "react-native";
import { Redirect, Tabs } from "expo-router";
import { AppIcon } from "@/components/ui/AppIcon";
import { colors, radii, setTheme, spacing, typography, useThemeVersion } from "@/theme";
import { useSession } from "@/providers/SessionProvider";
import { usePreviewSyncSelector } from "@/features/mobile-sync/hooks";
import React, { useEffect, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { initializeSocket, disconnectSocket } from "@/lib/socket/socketService";
import Animated, { FadeIn, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { markNavigationDispatch, markNavigationTap } from "@/lib/perf/livePerf";

const shouldEnableLiveTransport =
  process.env.NODE_ENV === "test" ||
  (!__DEV__ || process.env.EXPO_PUBLIC_ENABLE_MOBILE_SOCKET === "true");

export default function AppLayout() {
  const { isBooting, user, hasCompletedOnboarding } = useSession();
  const shouldWarmMainApp = Boolean(user && hasCompletedOnboarding);
  const { data: profileDarkMode } = usePreviewSyncSelector(
    (snapshot) => snapshot.profile.darkMode ?? false,
    shouldWarmMainApp,
    { enabled: shouldWarmMainApp },
  );
  const { data: darkModeOverride } = usePreviewSyncSelector(
    (snapshot) => snapshot.systemSettings.darkModeOverride ?? false,
    shouldWarmMainApp,
    { enabled: shouldWarmMainApp },
  );
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const prewarmedUserIdRef = useRef<string | null>(null);
  const warmupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deepWarmupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (shouldWarmMainApp && user && shouldEnableLiveTransport) {
      initializeSocket(user.id, queryClient);
    } else {
      disconnectSocket();
    }
  }, [queryClient, shouldWarmMainApp, user]);

  const isDarkMode = Boolean(profileDarkMode) && !Boolean(darkModeOverride);

  useEffect(() => {
    setTheme(isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    if (!shouldWarmMainApp || !user || prewarmedUserIdRef.current === user.id) {
      return;
    }

    let cancelled = false;
    const interactionTask = InteractionManager.runAfterInteractions(() => {
      if (cancelled) {
        return;
      }

      prewarmedUserIdRef.current = user.id;
      warmupTimeoutRef.current = setTimeout(() => {
        if (cancelled) {
          return;
        }

        void Promise.allSettled([
          import("./services"),
          import("./tracker"),
          import("./profile/index"),
        ]);

        deepWarmupTimeoutRef.current = setTimeout(() => {
          if (cancelled) {
            return;
          }

          void Promise.allSettled([
            import("./messages"),
            import("./resume"),
            import("./outreach"),
            import("./interview"),
          ]);
        }, 5500);
      }, 3500);
    });

    return () => {
      cancelled = true;
      if (warmupTimeoutRef.current) {
        clearTimeout(warmupTimeoutRef.current);
        warmupTimeoutRef.current = null;
      }
      if (deepWarmupTimeoutRef.current) {
        clearTimeout(deepWarmupTimeoutRef.current);
        deepWarmupTimeoutRef.current = null;
      }
      interactionTask.cancel?.();
    };
  }, [queryClient, shouldWarmMainApp, user]);

  const themeVersion = useThemeVersion();

  const screenOptions = useMemo(
    () => ({
      headerShown: false,
      lazy: true,
      freezeOnBlur: true,
      sceneStyle: {
        backgroundColor: colors.background,
      },
      tabBarHideOnKeyboard: true,
      tabBarActiveTintColor: colors.text,
      tabBarInactiveTintColor: colors.mutedText,
      tabBarStyle: {
        position: "absolute" as const,
        left: 14,
        right: 14,
        bottom: insets.bottom > 0 ? insets.bottom + 4 : 10,
        backgroundColor: "transparent",
        borderTopWidth: 0,
        borderRadius: 0,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        overflow: "hidden" as const,
        elevation: 0,
        shadowOpacity: 0,
        shadowColor: "transparent",
        height: 72,
        paddingTop: 6,
        paddingBottom: 8,
        paddingHorizontal: 8,
      },
      tabBarItemStyle: {
        height: 56,
        alignItems: "center" as const,
        justifyContent: "center" as const,
      },
      tabBarLabelStyle: {
        ...typography.label,
        fontSize: 9,
        marginTop: 0,
        lineHeight: 12,
      },
      tabBarBackground: () => <View style={styles.tabBarBackground} />,
    }),
    [themeVersion, insets.bottom],
  );

  if (isBooting) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.accentDark} />
      </View>
    );
  }

  if (!hasCompletedOnboarding) {
    return <Redirect href="/questionnaire" />;
  }

  if (!user) {
    return <Redirect href="/(public)/auth/sign-up" />;
  }

  return (
    <Tabs
      screenOptions={screenOptions}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <TabGlyph name="home" color={color} focused={focused} />
          ),
        }}
        listeners={{
          tabPress: () => {
            markNavigationTap("/(app)", "tab.home");
            markNavigationDispatch("/(app)", { navigation_type: "tab" });
          },
        }}
      />
      <Tabs.Screen
        name="about"
        options={{
          title: "About",
          tabBarIcon: ({ color, focused }) => (
            <TabGlyph name="info" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: "Services",
          tabBarIcon: ({ color, focused }) => (
            <TabGlyph name="grid" color={color} focused={focused} />
          ),
        }}
        listeners={{
          tabPress: () => {
            markNavigationTap("/(app)/services", "tab.services");
            markNavigationDispatch("/(app)/services", { navigation_type: "tab" });
          },
        }}
      />
      <Tabs.Screen
        name="tracker"
        options={{
          title: "Tracker",
          tabBarIcon: ({ color, focused }) => (
            <TabGlyph name="tracker" color={color} focused={focused} />
          ),
        }}
        listeners={{
          tabPress: () => {
            markNavigationTap("/(app)/tracker", "tab.tracker");
            markNavigationDispatch("/(app)/tracker", { navigation_type: "tab" });
          },
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, focused }) => (
            <TabGlyph name="mail" color={color} focused={focused} />
          ),
        }}
        listeners={{
          tabPress: () => {
            markNavigationTap("/(app)/messages", "tab.chat");
            markNavigationDispatch("/(app)/messages", { navigation_type: "tab" });
          },
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <TabGlyph name="profile" color={color} focused={focused} />
          ),
        }}
        listeners={{
          tabPress: () => {
            markNavigationTap("/(app)/profile", "tab.profile");
            markNavigationDispatch("/(app)/profile", { navigation_type: "tab" });
          },
        }}
      />
      <Tabs.Screen name="jobs/search" options={{ href: null }} />
      <Tabs.Screen name="saved" options={{ href: null }} />
      <Tabs.Screen name="jobs/[id]" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="chat/[threadId]" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="resume" options={{ href: null }} />
      <Tabs.Screen name="outreach" options={{ href: null }} />
      <Tabs.Screen name="interview" options={{ href: null }} />
      <Tabs.Screen name="pricing" options={{ href: null }} />
      <Tabs.Screen name="screens" options={{ href: null }} />
      <Tabs.Screen name="stories" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="settings" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="personal-information" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="about-detail" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="contact" options={{ href: null }} />
      <Tabs.Screen name="security" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="tracker-details" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="upcoming-interview" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="weekly-progress" options={{ href: null, tabBarStyle: { display: "none" } }} />
    </Tabs>
  );
}

function TabGlyph({
  color,
  focused,
  name,
}: {
  color: ColorValue;
  focused: boolean;
  name: "home" | "grid" | "tracker" | "mail" | "profile" | "info";
}) {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: withSpring(focused ? 1.1 : 1, {
            damping: 14,
            stiffness: 260,
          }),
        },
      ],
    };
  }, [focused]);

  return (
    <Animated.View style={[styles.iconWrap, focused && styles.iconWrapActive, animatedStyle]}>
      <AppIcon name={name} color={focused ? colors.text : color} />
      {focused ? <Animated.View entering={FadeIn.duration(140)} style={styles.indicator} /> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  iconWrapActive: {
    backgroundColor: "rgba(163, 230, 53, 0.16)",
  },
  indicator: {
    position: "absolute",
    bottom: 2,
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.accentDark,
  },
  tabBarBackground: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.tabBackground,
    borderRadius: 0,
    overflow: "hidden",
  },
});
