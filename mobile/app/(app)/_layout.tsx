import { Redirect, Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";
import type { ColorValue } from "react-native";
import { AppIcon } from "@/components/ui/AppIcon";
import { colors, radii, spacing, typography } from "@/theme";
import { useSession } from "@/providers/SessionProvider";

export default function AppLayout() {
  const { user, hasCompletedOnboarding } = useSession();

  if (!hasCompletedOnboarding) {
    return <Redirect href="/(public)" />;
  }

  if (!user) {
    return <Redirect href="/(public)/auth" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: colors.background,
        },
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.mutedText,
        tabBarStyle: {
          position: "absolute",
          left: 14,
          right: 14,
          bottom: 10,
          backgroundColor: colors.tabBackground,
          borderTopWidth: 0,
          borderRadius: radii.xl,
          height: 78,
          paddingTop: 8,
          paddingBottom: 10,
          paddingHorizontal: 8,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        tabBarLabelStyle: {
          ...typography.label,
          fontSize: 10,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <TabGlyph name="home" color={color} focused={focused} />
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
      />
      <Tabs.Screen
        name="tracker"
        options={{
          title: "Tracker",
          tabBarIcon: ({ color, focused }) => (
            <TabGlyph name="tracker" color={color} focused={focused} />
          ),
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
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <TabGlyph name="profile" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen name="jobs/search" options={{ href: null }} />
      <Tabs.Screen name="saved" options={{ href: null }} />
      <Tabs.Screen name="jobs/[id]" options={{ href: null }} />
      <Tabs.Screen name="resume" options={{ href: null }} />
      <Tabs.Screen name="outreach" options={{ href: null }} />
      <Tabs.Screen name="interview" options={{ href: null }} />
      <Tabs.Screen name="pricing" options={{ href: null }} />
      <Tabs.Screen name="screens" options={{ href: null }} />
      <Tabs.Screen name="stories" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="about" options={{ href: null }} />
      <Tabs.Screen name="contact" options={{ href: null }} />
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
  name: "home" | "grid" | "tracker" | "mail" | "profile";
}) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <AppIcon name={name} color={focused ? colors.text : color} />
      {focused ? <View style={styles.indicator} /> : null}
    </View>
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
    bottom: -spacing.xs,
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.accentDark,
  },
});
