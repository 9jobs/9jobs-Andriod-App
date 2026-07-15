import { Pressable, StyleSheet, Text, View } from "react-native";
import { useMemo, useState } from "react";
import { router } from "expo-router";
import Svg, { Circle, Path } from "react-native-svg";
import { Screen } from "@/components/ui/Screen";
import {
  useMarkAllNotificationsAsReadMutation,
  useMarkNotificationAsReadMutation,
  usePreviewSyncQuery,
} from "@/features/mobile-sync/hooks";
import { colors, radii, shadows, spacing, typography } from "@/theme";

type NotificationVisual = {
  icon: "check" | "bell" | "star" | "alert" | "trending-up" | "mail";
  bg: string;
  accentColor: string;
};

export default function NotificationsScreen() {
  const { data: snapshot } = usePreviewSyncQuery();
  const markOneReadMutation = useMarkNotificationAsReadMutation();
  const markAllReadMutation = useMarkAllNotificationsAsReadMutation();
  const [selectedNotificationId, setSelectedNotificationId] = useState<number | null>(null);
  const notifications = (snapshot?.notifications ?? []).map((item) => {
    const parts = splitNotificationBody(item.body);
    return {
      ...item,
      ...resolveVisuals(item.title, item.body),
      ...parts,
    };
  });
  const selectedNotification = useMemo(
    () => notifications.find((item) => item.id === selectedNotificationId) ?? null,
    [notifications, selectedNotificationId],
  );

  const markAllRead = () => {
    if (!notifications.some((item) => item.unread) || markAllReadMutation.isPending) {
      return;
    }

    markAllReadMutation.mutate();
  };

  return (
    <Screen contentStyle={styles.screenContent}>
      <BackHeader
        label="Back"
        onPress={() => {
          if (selectedNotification) {
            setSelectedNotificationId(null);
            return;
          }
          router.back();
        }}
      />

      <View style={styles.titleRow}>
        {!selectedNotification ? <Text style={styles.title}>Notifications</Text> : <View />}
        {!selectedNotification && notifications.some((n) => n.unread) && (
          <Pressable onPress={markAllRead}>
            <Text style={styles.markReadText}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      {selectedNotification ? (
        <Pressable
          onPress={() => {
            if (selectedNotification.unread && !markOneReadMutation.isPending) {
              markOneReadMutation.mutate(selectedNotification.id);
            }
          }}
          style={styles.detailBubbleWrapper}
        >
          <View style={[styles.detailQuoteIconCircle, { backgroundColor: selectedNotification.bg }]}>
            <NotificationIcon icon={selectedNotification.icon} />
          </View>
          <View style={styles.detailQuoteCard}>
            <Text style={styles.quoteText}>
              {selectedNotification.quote || selectedNotification.summary}
            </Text>
          </View>
        </Pressable>
      ) : (
        <View style={styles.listStack}>
          {notifications.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => {
                if (item.unread && !markOneReadMutation.isPending) {
                  markOneReadMutation.mutate(item.id);
                }
                setSelectedNotificationId(item.id);
              }}
              style={styles.previewCard}
            >
              {item.unread ? <View style={[styles.previewAccentBar, { backgroundColor: item.accentColor }]} /> : null}
              <View style={[styles.previewIconCircle, { backgroundColor: item.bg }]}>
                <NotificationIcon icon={item.icon} />
              </View>
              <View style={styles.previewTextContainer}>
                <View style={styles.itemTitleRow}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.previewTime}>{formatRelativeTime(item.sentAt)}</Text>
                </View>
                {item.summary ? (
                  <Text style={styles.previewDesc} numberOfLines={2}>
                    {item.summary}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          ))}

          {notifications.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptyText}>Admin panel se aane wali live updates yahan dikhengi.</Text>
          </View>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

function resolveVisuals(title: string, body: string): NotificationVisual {
  const normalized = `${title} ${body}`.toLowerCase();

  if (normalized.includes("viewed")) {
    return { icon: "check", bg: "rgba(163, 230, 53, 0.15)", accentColor: colors.accentDark };
  }
  if (normalized.includes("interview")) {
    return { icon: "bell", bg: "#E0F2FE", accentColor: "#0284C7" };
  }
  if (normalized.includes("match")) {
    return { icon: "star", bg: "#FEF3C7", accentColor: "#D97706" };
  }
  if (normalized.includes("expire")) {
    return { icon: "alert", bg: "#FEE2E2", accentColor: "#DC2626" };
  }
  if (normalized.includes("score")) {
    return { icon: "trending-up", bg: "rgba(163, 230, 53, 0.15)", accentColor: colors.accentDark };
  }

  return { icon: "mail", bg: "#EDE9FE", accentColor: "#7C3AED" };
}

function formatRelativeTime(iso: string) {
  const sentAt = new Date(iso).getTime();
  const diffMs = Date.now() - sentAt;
  const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));

  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function splitNotificationBody(body: string) {
  const normalized = body.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return { summary: "", quote: "" };
  }

  const segments = normalized
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (segments.length > 1) {
    return {
      summary: segments.slice(0, -1).join("\n\n"),
      quote: segments[segments.length - 1],
    };
  }

  const quoteMatch = normalized.match(/(["'].*["'])\s*$/s);
  if (quoteMatch) {
    const quote = quoteMatch[1].trim();
    const summary = normalized.slice(0, quoteMatch.index).trim();
    return { summary, quote };
  }

  return { summary: normalized, quote: "" };
}

function BackHeader({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.backRow}>
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
        <Path
          d="M19 12H5M5 12L12 19M5 12L12 5"
          stroke={colors.text}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      <Text style={styles.backText}>{label}</Text>
    </Pressable>
  );
}

function NotificationIcon({ icon }: { icon: NotificationVisual["icon"] }) {
  if (icon === "check") return <CheckIcon />;
  if (icon === "bell") return <BellIcon />;
  if (icon === "star") return <StarIcon />;
  if (icon === "alert") return <AlertIcon />;
  if (icon === "trending-up") return <TrendingUpIcon />;
  return <MailIcon />;
}

function CheckIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 6L9 17L4 12"
        stroke={colors.accentDark}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function BellIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
        stroke="#0284C7"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="#0284C7" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function StarIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        stroke="#D97706"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function AlertIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke="#DC2626" strokeWidth={2} />
      <Path d="M12 8v4" stroke="#DC2626" strokeWidth={2} strokeLinecap="round" />
      <Path d="M12 16h.01" stroke="#DC2626" strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

function TrendingUpIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M23 6l-9.5 9.5-5-5L1 18"
        stroke={colors.accentDark}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M17 6h6v6"
        stroke={colors.accentDark}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MailIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
        stroke="#7C3AED"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M22 6l-10 7L2 6" stroke="#7C3AED" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 80,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  backText: {
    ...typography.body,
    fontWeight: "700",
    color: colors.text,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.display,
    fontSize: 24,
    color: colors.text,
  },
  markReadText: {
    ...typography.body,
    fontWeight: "700",
    color: colors.text,
  },
  listStack: {
    gap: spacing.md,
  },
  previewCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 78,
    borderRadius: 24,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.05)",
    ...shadows.card,
  },
  previewAccentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
  },
  previewIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  previewTextContainer: {
    flex: 1,
    gap: 2,
  },
  previewTime: {
    ...typography.body,
    color: colors.mutedText,
    fontSize: 13,
    flexShrink: 0,
  },
  previewDesc: {
    ...typography.body,
    color: colors.mutedText,
    lineHeight: 20,
  },
  unreadWrapper: {
    overflow: "hidden",
    borderRadius: 28,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    ...shadows.card,
  },
  flatWrapper: {
    borderRadius: 28,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    ...shadows.card,
  },
  accentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  contentRow: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  textContainer: {
    flex: 1,
    gap: 8,
  },
  itemTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  itemTitle: {
    ...typography.title,
    fontSize: 17,
    flex: 1,
  },
  itemTime: {
    ...typography.body,
    color: colors.mutedText,
    flexShrink: 0,
  },
  itemDesc: {
    ...typography.body,
    color: colors.mutedText,
    lineHeight: 22,
    fontStyle: "italic",
  },
  detailBubbleWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  detailQuoteIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  detailQuoteCard: {
    flex: 1,
    backgroundColor: "#F3EEDF",
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...shadows.card,
  },
  quoteText: {
    ...typography.body,
    color: "#6B6457",
    fontStyle: "italic",
    lineHeight: 24,
    fontSize: 15,
  },
  emptyCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    alignItems: "center",
    ...shadows.card,
  },
  emptyTitle: {
    ...typography.title,
    fontSize: 18,
    marginBottom: spacing.xs,
  },
  emptyText: {
    ...typography.body,
    color: colors.mutedText,
    textAlign: "center",
  },
});
