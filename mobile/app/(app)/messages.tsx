import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import Svg, { Circle, Path } from "react-native-svg";
import { Screen } from "@/components/ui/Screen";
import { usePreviewSyncQuery } from "@/features/mobile-sync/hooks";
import { verticalScrollProps } from "@/lib/ui/scroll";
import { colors, spacing, shadows } from "@/theme";
import { FadeInView } from "@/components/motion/FadeInView";
import { AnimatedPressable } from "@/components/motion/AnimatedPressable";

type ChatItem = {
  initials: string;
  name: string;
  preview: string;
  time: string;
  unread: number;
  tone: string;
  status: string;
  primary?: boolean;
};

const sampleChats: ChatItem[] = [];

export default function MessagesScreen() {
  const { data: snapshot } = usePreviewSyncQuery(true, {
    refetchInterval: 3000,
  });
  const thread = snapshot?.messageThread;
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState("All");

  const cardStyle = useMemo(() => {
    const isDark = colors.background === "#000000";
    return {
      container: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        paddingHorizontal: spacing.md,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.surface,
      },
      avatarWrapper: {
        position: "relative" as const,
        marginRight: 14,
      },
      advisorAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: isDark ? "#242521" : "#F2F9E8",
        borderColor: isDark ? "#3A3B36" : "#E2ECD5",
        borderWidth: 1,
        alignItems: "center" as const,
        justifyContent: "center" as const,
      },
      onlineIndicator: {
        position: "absolute" as const,
        right: 0,
        bottom: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: "#0DCE06",
        borderWidth: 1.5,
        borderColor: colors.surface,
      },
      content: {
        flex: 1,
        gap: 4,
      },
      headerRow: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "space-between" as const,
        gap: 8,
      },
      titleGroup: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 6,
        flex: 1,
      },
      title: {
        fontSize: 16,
        lineHeight: 20,
        fontWeight: "700" as const,
        color: colors.text,
      },
      time: {
        fontSize: 12,
        lineHeight: 16,
        color: colors.mutedText,
      },
      bodyGroup: {
        gap: 0,
      },
      bottomRow: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "space-between" as const,
        gap: 8,
      },
      preview: {
        flex: 1,
        fontSize: 13,
        lineHeight: 17,
        color: colors.mutedText,
      },
      unreadBadge: {
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: "#22A447",
        alignItems: "center" as const,
        justifyContent: "center" as const,
        paddingHorizontal: 5,
      },
      unreadBadgeText: {
        color: "#FFFFFF",
        fontSize: 10,
        lineHeight: 12,
        fontWeight: "800" as const,
      },
      avatarColor: "#22A447",
    };
  }, [colors.background, colors.surface, colors.border, colors.text, colors.mutedText]);

  const supportChat = useMemo<ChatItem | null>(() => {
    if (!thread) return null;
    const normalizedPreview = normalizeChatPreview(thread.snippet);
    return {
      initials: "9Jobs",
      name: "9Jobs Career Advisor",
      preview: normalizedPreview,
      time: formatThreadTime(thread.time) || "4:31 PM",
      unread: thread.unreadCount,
      tone: "#050505",
      primary: true,
      status: thread.unreadCount > 0 ? "Unread" : "Open",
    };
  }, [thread]);

  const allChats = useMemo(() => {
    const items = [];
    if (supportChat) items.push(supportChat);
    return [...items, ...sampleChats];
  }, [supportChat]);

  const filteredChats = useMemo(() => {
    let items = allChats;
    if (activeTab === "Personal") {
      items = allChats.filter(chat => !chat.primary);
    } else if (activeTab === "Work") {
      items = allChats.filter(chat => chat.primary);
    } else if (activeTab === "Groups") {
      items = [];
    }

    const query = searchText.trim().toLowerCase();
    if (!query) return items;

    return items.filter(
      (chat) =>
        chat.name.toLowerCase().includes(query) ||
        chat.preview.toLowerCase().includes(query),
    );
  }, [allChats, searchText, activeTab]);

  const openSupportChat = () => router.push("/(app)/chat/admin-thread" as never);

  return (
    <Screen scroll={false} contentStyle={styles.screenContent}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft} />

        <View style={styles.headerCenter}>
          <Text style={styles.title}>Chats</Text>
        </View>

        <View style={styles.headerRight}>
          <AnimatedPressable style={styles.iconButton} onPress={() => setSearchOpen((value) => !value)}>
            <SearchIcon />
          </AnimatedPressable>
          <AnimatedPressable
            style={styles.iconButton}
            onPress={() =>
              Alert.alert("Chat Actions", "Choose an action", [
                { text: "Cancel", style: "cancel" },
                { text: "Clear search", onPress: () => {
                  setSearchText("");
                  setSearchOpen(false);
                } },
                { text: "Open support chat", onPress: openSupportChat },
              ])
            }
          >
            <VerticalMenuIcon />
          </AnimatedPressable>
        </View>
      </View>

      {searchOpen ? (
        <View style={styles.searchShell}>
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search chats"
            placeholderTextColor="#8A9087"
            style={styles.searchInput}
            autoFocus
          />
        </View>
      ) : null}

      <View style={styles.tabsContainer}>
        {(["All", "Personal", "Work", "Groups"] as const).map((tab) => (
          <AnimatedPressable
            key={tab}
            style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
            onPress={() => setActiveTab(tab)}
            scaleTo={0.96}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === "All" ? "All chats" : tab}
            </Text>
          </AnimatedPressable>
        ))}
      </View>

      <ScrollView
        {...verticalScrollProps}
        style={styles.list}
        contentContainerStyle={styles.listContent}
      >
        {filteredChats.map((chat, idx) => {
          if (chat.primary) {
            return (
              <FadeInView key={chat.name} type="fade-up" delay={idx * 50}>
                <AnimatedPressable
                  style={cardStyle.container}
                  onPress={openSupportChat}
                  scaleTo={0.98}
                >
                  <View style={cardStyle.avatarWrapper}>
                    <View style={cardStyle.advisorAvatar}>
                      <AdvisorAvatarIcon color={cardStyle.avatarColor} />
                    </View>
                    <View style={cardStyle.onlineIndicator} />
                  </View>
                  <View style={cardStyle.content}>
                    <View style={cardStyle.headerRow}>
                      <View style={cardStyle.titleGroup}>
                        <Text style={cardStyle.title} numberOfLines={1}>
                          {chat.name}
                        </Text>
                      </View>
                      <Text style={cardStyle.time}>
                        {chat.time}
                      </Text>
                    </View>

                    <View style={cardStyle.bodyGroup}>
                      <View style={cardStyle.bottomRow}>
                        <Text style={cardStyle.preview} numberOfLines={1}>
                          {chat.preview === "remove" ? "" : chat.preview}
                        </Text>
                        {chat.unread > 0 ? (
                          <View style={cardStyle.unreadBadge}>
                            <Text style={cardStyle.unreadBadgeText}>{chat.unread}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>
                </AnimatedPressable>
              </FadeInView>
            );
          }

          return (
            <FadeInView key={chat.name} type="fade-up" delay={idx * 50}>
              <AnimatedPressable style={styles.row} onPress={openSupportChat} scaleTo={0.98}>
                <View style={[styles.avatar, { backgroundColor: chat.tone }]}>
                  <Text style={styles.avatarInitials}>{chat.initials}</Text>
                </View>

                <View style={styles.body}>
                  <View style={styles.topRow}>
                    <View style={styles.nameGroup}>
                      <Text style={styles.name}>{chat.name}</Text>
                    </View>
                    <Text style={styles.time}>{chat.time}</Text>
                  </View>

                  <View style={styles.bottomRow}>
                    <Text style={styles.preview} numberOfLines={1}>{chat.preview}</Text>
                    {chat.unread > 0 ? (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>{chat.unread}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </AnimatedPressable>
            </FadeInView>
          );
        })}
      </ScrollView>

      <AnimatedPressable style={styles.fab} onPress={openSupportChat} scaleTo={0.94}>
        <ChatBubbleIcon />
      </AnimatedPressable>
    </Screen>
  );
}

function formatThreadTime(isoString: string) {
  if (!isoString) return "";
  const value = new Date(isoString);
  if (Number.isNaN(value.getTime())) return "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const sixDaysAgo = new Date(today);
  sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);

  const compareDate = new Date(value);
  compareDate.setHours(0, 0, 0, 0);

  if (compareDate.getTime() === today.getTime()) {
    let hours = value.getHours();
    const minutes = value.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? "0" + minutes : minutes;
    return `${hours}:${minutesStr} ${ampm}`;
  } else if (compareDate.getTime() === yesterday.getTime()) {
    return "Yesterday";
  } else if (compareDate.getTime() >= sixDaysAgo.getTime()) {
    return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(value);
  } else {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(value);
  }
}

function normalizeChatPreview(preview: string | undefined) {
  const value = (preview || "").trim();
  if (!value) return "remove";
  if (value.startsWith("[Attachment]")) return "Sent an attachment";
  if (value.length > 60) return `${value.slice(0, 57).trimEnd()}...`;
  return value === "hi how are u" ? "remove" : value;
}

function SearchIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.134 17 3 13.866 3 10C3 6.134 6.134 3 10 3C13.866 3 17 6.134 17 10Z" stroke="#181A16" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function MenuIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="5" r="1.8" fill="#181A16" />
      <Circle cx="12" cy="12" r="1.8" fill="#181A16" />
      <Circle cx="12" cy="19" r="1.8" fill="#181A16" />
    </Svg>
  );
}

function VerticalMenuIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="5" r="2.2" fill="#181A16" />
      <Circle cx="12" cy="12" r="2.2" fill="#181A16" />
      <Circle cx="12" cy="19" r="2.2" fill="#181A16" />
    </Svg>
  );
}

function VerifiedIcon() {
  return (
    <View style={styles.verified}>
      <Text style={styles.verifiedText}>v</Text>
    </View>
  );
}

function ChatBubbleIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M8 18H7L3.5 20.5L4.5 17.5C3.56 16.41 3 15.01 3 13.5C3 9.91 6.58 7 11 7C15.42 7 19 9.91 19 13.5C19 17.09 15.42 20 11 20C10 20 9 19.84 8 19.53V18Z" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function AdvisorAvatarIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      {/* Sparkles/Stars on left and right */}
      <Path d="M4 6L4.5 7.5L6 8L4.5 8.5L4 10L3.5 8.5L2 8L3.5 7.5L4 6Z" fill={color} />
      <Path d="M20 4L20.5 5.5L22 6L20.5 6.5L20 8L19.5 6.5L18 6L19.5 5.5L20 4Z" fill={color} />
      {/* Main user silhouette inside shield or badge */}
      <Circle cx="12" cy="8" r="3.5" stroke={color} strokeWidth={2} />
      <Path d="M6 18.5C6 15.5 8.5 13.5 12 13.5C15.5 13.5 18 15.5 18 18.5" stroke={color} strokeWidth={2} strokeLinecap="round" />
      {/* Advisor tie/decoration inside body */}
      <Path d="M12 13.8L13 16.5H11L12 13.8Z" fill={color} />
      <Path d="M12 16.5L13 21L12 22L11 21L12 16.5Z" fill={color} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingTop: 18,
    paddingBottom: 0,
    gap: 0,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    height: 56,
  },
  headerLeft: {
    width: 80,
    alignItems: "flex-start",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerRight: {
    width: 80,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12,
  },
  circularIconButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700",
    color: colors.text,
  },
  iconButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  tabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md,
    marginTop: 6,
  },
  tabItem: {
    paddingVertical: 12,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabItemActive: {
    borderBottomColor: colors.text,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.mutedText,
  },
  tabTextActive: {
    color: colors.text,
    fontWeight: "700",
  },
  searchShell: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  searchInput: {
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F4F3EE",
    paddingHorizontal: 16,
    color: colors.text,
    fontSize: 15,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.md,
    marginTop: 14,
    marginBottom: 8,
  },
  filterChip: {
    minHeight: 32,
    borderRadius: 16,
    paddingHorizontal: 12,
    backgroundColor: "#F3F3EE",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: "#DDF6D3",
  },
  filterText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    color: "#5A5F56",
  },
  filterTextActive: {
    color: "#2B6D20",
  },
  filterBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#E1E3DB",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  filterBadgeActive: {
    backgroundColor: "#22A447",
  },
  filterBadgeText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "700",
    color: "#4C5148",
  },
  filterBadgeTextActive: {
    color: "#FFFFFF",
  },
  list: {
    flex: 1,
    marginTop: 4,
  },
  listContent: {
    paddingBottom: 92,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#F0EDE4",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  primaryAvatar: {
    backgroundColor: "#050505",
  },
  primaryAvatarText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  avatarInitials: {
    color: "#4E5450",
    fontSize: 16,
    fontWeight: "700",
  },
  body: {
    flex: 1,
    gap: 2,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  nameGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  name: {
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "700",
    color: colors.text,
  },
  time: {
    fontSize: 12,
    lineHeight: 16,
    color: "#7A7F76",
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  preview: {
    flex: 1,
    fontSize: 13,
    lineHeight: 17,
    color: "#6E756B",
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#22A447",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  unreadBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "800",
  },
  verified: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#22A447",
    alignItems: "center",
    justifyContent: "center",
  },
  verifiedText: {
    color: "#FFFFFF",
    fontSize: 8,
    lineHeight: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  fab: {
    position: "absolute",
    right: 14,
    bottom: -8,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#22A447",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#22A447",
    shadowOpacity: 0.24,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  supportCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    flexDirection: "row",
    ...shadows.card,
  },
  avatarWrapper: {
    position: "relative",
    marginRight: 14,
    alignSelf: "flex-start",
  },
  advisorAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  onlineIndicator: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#0DCE06",
    borderWidth: 2,
  },
  cardContent: {
    flex: 1,
    gap: 8,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "700",
    color: colors.text,
  },
  cardTime: {
    fontSize: 12,
    lineHeight: 16,
    color: "#7A7F76",
  },
  cardBodyGroup: {
    gap: 6,
  },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 2,
  },
  cardPreview: {
    flex: 1,
    fontSize: 13,
    lineHeight: 17,
    color: "#6E756B",
  },
  cardUnreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#22A447",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  cardUnreadBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "800",
  },
});
