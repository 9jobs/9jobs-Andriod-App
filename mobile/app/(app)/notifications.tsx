import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import Svg, { Path, Circle } from "react-native-svg";
import { Screen } from "@/components/ui/Screen";
import { colors, radii, shadows, spacing, typography } from "@/theme";

// Initial notification items matching mockup exactly
const INITIAL_NOTIFICATIONS = [
  {
    id: "1",
    title: "Application viewed",
    desc: "Stripe viewed your profile · Sr. Frontend Engineer",
    time: "2m ago",
    icon: "check",
    bg: "rgba(163, 230, 53, 0.15)",
    unread: true,
    accentColor: colors.accentDark,
  },
  {
    id: "2",
    title: "Interview scheduled",
    desc: "Google confirmed Jul 14 at 2:00 PM PST",
    time: "1h ago",
    icon: "bell",
    bg: "#E0F2FE",
    unread: true,
    accentColor: "#0284C7",
  },
  {
    id: "3",
    title: "New match (98%)",
    desc: "Figma — Staff Product Designer · Remote · $160k",
    time: "3h ago",
    icon: "star",
    bg: "#FEF3C7",
    unread: false,
  },
  {
    id: "4",
    title: "Resume expiring",
    desc: "Update your resume to keep your score current",
    time: "1d ago",
    icon: "alert",
    bg: "#FEE2E2",
    unread: false,
  },
  {
    id: "5",
    title: "Score improved!",
    desc: "Your ATS score jumped to 97. You're in the top 3%.",
    time: "2d ago",
    icon: "trending-up",
    bg: "rgba(163, 230, 53, 0.15)",
    unread: false,
  },
  {
    id: "6",
    title: "Recruiter replied",
    desc: "Sarah Chen replied to your outreach at Google",
    time: "3d ago",
    icon: "mail",
    bg: "#EDE9FE",
    unread: false,
  },
];

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);

  const markAllRead = () => {
    setNotifications((prev) =>
      prev.map((item) => ({ ...item, unread: false }))
    );
  };

  return (
    <Screen contentStyle={styles.screenContent}>
      {/* Header Back Button */}
      <BackHeader label="Back" />

      {/* Title Row */}
      <View style={styles.titleRow}>
        <Text style={styles.title}>Notifications</Text>
        {notifications.some((n) => n.unread) && (
          <Pressable onPress={markAllRead}>
            <Text style={styles.markReadText}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      {/* Notifications List */}
      <View style={styles.listStack}>
        {notifications.map((item) => (
          <View
            key={item.id}
            style={item.unread ? styles.unreadWrapper : styles.flatWrapper}
          >
            {item.unread && (
              <View style={[styles.accentBar, { backgroundColor: item.accentColor }]} />
            )}
            <View style={styles.contentRow}>
              {/* Left Circular Icon Container */}
              <View style={[styles.iconCircle, { backgroundColor: item.bg }]}>
                {item.icon === "check" && <CheckIcon />}
                {item.icon === "bell" && <BellIcon />}
                {item.icon === "star" && <StarIcon />}
                {item.icon === "alert" && <AlertIcon />}
                {item.icon === "trending-up" && <TrendingUpIcon />}
                {item.icon === "mail" && <MailIcon />}
              </View>

              {/* Text Information column */}
              <View style={styles.textContainer}>
                <View style={styles.itemTitleRow}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemTime}>{item.time}</Text>
                </View>
                <Text style={styles.itemDesc}>{item.desc}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}

function BackHeader({ label }: { label: string }) {
  return (
    <Pressable onPress={() => router.back()} style={styles.backRow}>
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

// Icon Components
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
    gap: spacing.lg,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: spacing.xs,
  },
  backText: {
    ...typography.title,
    color: colors.text,
    fontSize: 16,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  title: {
    ...typography.display,
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  markReadText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  listStack: {
    gap: 12,
  },
  unreadWrapper: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
    paddingVertical: 18,
    paddingLeft: 22,
    paddingRight: 18,
    ...shadows.card,
    marginHorizontal: 2,
  },
  flatWrapper: {
    paddingVertical: 14,
    paddingHorizontal: 10,
    position: "relative",
  },
  accentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
    gap: 3,
  },
  itemTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  itemTime: {
    fontSize: 11,
    color: colors.mutedText,
    fontWeight: "600",
  },
  itemDesc: {
    fontSize: 13,
    color: colors.mutedText,
    fontWeight: "500",
    lineHeight: 18,
  },
});
