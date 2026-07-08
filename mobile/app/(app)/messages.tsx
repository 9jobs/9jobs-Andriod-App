import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { Screen } from "@/components/ui/Screen";
import { colors, spacing, typography } from "@/theme";

const threads = [
  {
    id: "sarah",
    name: "Sarah Chen",
    role: "Google · EM",
    snippet: "Hi! Your background is exactly what we...",
    time: "now",
    unreadCount: 2,
    avatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&h=120&q=80",
    href: "/(app)/outreach",
  },
  {
    id: "marcus",
    name: "Marcus Webb",
    role: "Stripe · Recruiter",
    snippet: "We'd love to set up a call for next week",
    time: "2h",
    unreadCount: 0,
    avatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&h=120&q=80",
    href: "/(app)/interview",
  },
  {
    id: "ai",
    name: "9Jobs AI",
    role: "Assistant",
    snippet: "Your resume analysis is ready!",
    time: "1d",
    unreadCount: 1,
    isAI: true,
    href: "/(app)/resume",
  },
];

export default function MessagesScreen() {
  return (
    <Screen contentStyle={styles.screenContent}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Messages</Text>
        <Pressable style={styles.composeButton}>
          <ComposeIcon />
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <SearchIcon />
        <TextInput
          placeholder="Search messages..."
          placeholderTextColor="#A0A3B1"
          style={styles.searchInput}
        />
      </View>

      <View style={styles.listStack}>
        {threads.map((thread, index) => (
          <Pressable
            key={thread.id}
            onPress={() => router.push(thread.href as never)}
            style={styles.threadPressable}
          >
            <View style={styles.itemWrapper}>
              <View style={styles.avatarContainer}>
                {thread.isAI ? (
                  <View style={styles.aiAvatar}>
                    <Text style={styles.aiAvatarText}>AI</Text>
                  </View>
                ) : (
                  <Image source={{ uri: thread.avatar }} style={styles.userAvatar} />
                )}
                {thread.unreadCount > 0 ? (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{thread.unreadCount}</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.textContainer}>
                <Text style={styles.itemName}>{thread.name}</Text>
                <Text style={styles.itemRole}>{thread.role}</Text>
                <Text style={styles.itemSnippet} numberOfLines={1}>
                  {thread.snippet}
                </Text>
              </View>

              <Text style={styles.itemTime}>{thread.time}</Text>
            </View>

            {index < threads.length - 1 ? <View style={styles.divider} /> : null}
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

function ComposeIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 20H20M16.5 3.5A2.12 2.12 0 0 1 19.5 6.5L7 19L3 20L4 16L16.5 3.5Z"
        stroke={colors.text}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SearchIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z"
        stroke="#B1B5C3"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingHorizontal: 0,
    paddingTop: spacing.sm,
    paddingBottom: 108,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xs,
  },
  title: {
    ...typography.display,
    color: colors.text,
    fontSize: 27,
    lineHeight: 32,
    letterSpacing: -0.8,
  },
  composeButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: spacing.lg,
    backgroundColor: "#EFEBE2",
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 40,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: "500",
    paddingVertical: 0,
  },
  listStack: {
    marginTop: 10,
  },
  threadPressable: {
    width: "100%",
  },
  itemWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  avatarContainer: {
    position: "relative",
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E8E5DB",
  },
  aiAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  aiAvatarText: {
    ...typography.title,
    color: colors.text,
    fontSize: 17,
  },
  unreadBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.dark,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  unreadBadgeText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: "800",
  },
  textContainer: {
    flex: 1,
    gap: 2,
    justifyContent: "center",
  },
  itemName: {
    ...typography.title,
    color: colors.text,
    fontSize: 16,
    lineHeight: 20,
  },
  itemRole: {
    ...typography.body,
    color: "#8F93A3",
    fontSize: 13,
    lineHeight: 16,
  },
  itemSnippet: {
    ...typography.body,
    color: "#667085",
    fontSize: 13,
    lineHeight: 17,
    marginTop: 1,
  },
  itemTime: {
    ...typography.label,
    color: "#8F93A3",
    fontSize: 12,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "#E3DFD4",
    marginLeft: spacing.lg,
  },
});
