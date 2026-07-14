import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import Svg, { Circle, Path } from "react-native-svg";
import { Screen } from "@/components/ui/Screen";
import { usePreviewSyncQuery } from "@/features/mobile-sync/hooks";
import { colors, spacing } from "@/theme";

type FilterKey = "All" | "Unread" | "Open" | "Resolved";

type ChatItem = {
  initials: string;
  name: string;
  preview: string;
  time: string;
  unread: number;
  tone: string;
  status: FilterKey;
  primary?: boolean;
};

const sampleChats: ChatItem[] = [
  { initials: "JW", name: "Jack Wilson", preview: "Can you share today's update?", time: "3:45 PM", unread: 1, tone: "#DDF2DB", status: "Unread" as FilterKey },
  { initials: "EC", name: "Emily Clark", preview: "Please review my resume.", time: "2:20 PM", unread: 0, tone: "#E2E6FF", status: "Open" as FilterKey },
  { initials: "LM", name: "Liam Murphy", preview: "Do you provide cover letter writing?", time: "1:15 PM", unread: 1, tone: "#F8E8B9", status: "Unread" as FilterKey },
];

export default function MessagesScreen() {
  const { data: snapshot } = usePreviewSyncQuery(true, {
    refetchInterval: 3000,
  });
  const thread = snapshot?.messageThread;
  const [activeFilter, setActiveFilter] = useState<FilterKey>("All");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");

  const supportChat = useMemo<ChatItem | null>(() => {
    if (!thread) return null;
    const normalizedPreview = normalizeChatPreview(thread.snippet);
    return {
      initials: "9Jobs",
      name: "9JOBS customer support",
      preview: normalizedPreview,
      time: formatThreadTime(thread.time) || "4:31 PM",
      unread: thread.unreadCount,
      tone: "#050505",
      primary: true,
      status: thread.unreadCount > 0 ? ("Unread" as FilterKey) : ("Open" as FilterKey),
    };
  }, [thread]);

  const allChats = useMemo(() => {
    const items = [];
    if (supportChat) items.push(supportChat);
    return [...items, ...sampleChats];
  }, [supportChat]);

  const filteredChats = useMemo(() => {
    const byFilter =
      activeFilter === "All"
        ? allChats
        : allChats.filter((chat) => (activeFilter === "Unread" ? chat.unread > 0 : chat.status === activeFilter));

    const query = searchText.trim().toLowerCase();
    if (!query) return byFilter;

    return byFilter.filter(
      (chat) =>
        chat.name.toLowerCase().includes(query) ||
        chat.preview.toLowerCase().includes(query),
    );
  }, [activeFilter, allChats, searchText]);

  const filters = useMemo(
    () => [
      { label: "All" as FilterKey, count: allChats.length },
      { label: "Unread" as FilterKey, count: allChats.filter((chat) => chat.unread > 0).length },
      { label: "Open" as FilterKey, count: allChats.filter((chat) => chat.status === "Open").length },
      { label: "Resolved" as FilterKey, count: allChats.filter((chat) => chat.status === "Resolved").length },
    ],
    [allChats],
  );

  const openSupportChat = () => router.push("/(app)/chat/admin-thread" as never);

  return (
    <Screen scroll={false} contentStyle={styles.screenContent}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Chats</Text>
        <View style={styles.headerIcons}>
          <Pressable style={styles.iconButton} onPress={() => setSearchOpen((value) => !value)}>
            <SearchIcon />
          </Pressable>
          <Pressable
            style={styles.iconButton}
            onPress={() =>
              Alert.alert("Chat Actions", "Choose an action", [
                { text: "Cancel", style: "cancel" },
                { text: "Reset filters", onPress: () => {
                  setActiveFilter("All");
                  setSearchText("");
                  setSearchOpen(false);
                } },
                { text: "Open support chat", onPress: openSupportChat },
              ])
            }
          >
            <MenuIcon />
          </Pressable>
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

      <View style={styles.filterRow}>
        {filters.map((filter) => {
          const active = activeFilter === filter.label;
          return (
            <Pressable key={filter.label} onPress={() => setActiveFilter(filter.label)} style={[styles.filterChip, active && styles.filterChipActive]}>
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{filter.label}</Text>
              <View style={[styles.filterBadge, active && styles.filterBadgeActive]}>
                <Text style={[styles.filterBadgeText, active && styles.filterBadgeTextActive]}>{filter.count}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredChats.map((chat) => (
          <Pressable key={chat.name} style={styles.row} onPress={openSupportChat}>
            <View style={[styles.avatar, chat.primary ? styles.primaryAvatar : { backgroundColor: chat.tone }]}>
              <Text style={chat.primary ? styles.primaryAvatarText : styles.avatarInitials}>{chat.initials}</Text>
            </View>

            <View style={styles.body}>
              <View style={styles.topRow}>
                <View style={styles.nameGroup}>
                  <Text style={styles.name}>{chat.name}</Text>
                  {chat.primary ? <VerifiedIcon /> : null}
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
          </Pressable>
        ))}
      </ScrollView>

      <Pressable style={styles.fab} onPress={openSupportChat}>
        <ChatBubbleIcon />
      </Pressable>
    </Screen>
  );
}

function formatThreadTime(isoString: string) {
  if (!isoString) return "";
  const value = new Date(isoString);
  if (Number.isNaN(value.getTime())) return "";
  return value.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
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
  },
  title: {
    fontSize: 31,
    lineHeight: 36,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.8,
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
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
});
