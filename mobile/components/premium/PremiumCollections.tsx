import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { AppIcon } from "@/components/ui/AppIcon";
import { colors, radii, shadows, spacing, typography } from "@/theme";
import type { PremiumListItem } from "@/lib/data/premium-content";

export function PremiumStatGrid({
  items,
  activeLabel,
  onPress,
}: {
  items: Array<{ label: string; value: string; delta?: string }>;
  activeLabel?: string;
  onPress?: (label: string) => void;
}) {
  return (
    <View style={styles.grid}>
      {items.map((item) => {
        const isActive = activeLabel === item.label;
        return (
          <Pressable
            key={item.label}
            onPress={() => onPress?.(item.label)}
            style={[
              styles.statCard,
              isActive && { borderColor: colors.accent, borderWidth: 1.5 },
            ]}
          >
            <Text style={styles.statDelta}>{item.delta ?? "Live"}</Text>
            <Text style={styles.statValue}>{item.value}</Text>
            <Text style={styles.statLabel}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function PremiumActionGrid({
  items,
}: {
  items: Array<{ label: string; icon: any; href: string }>;
}) {
  return (
    <View style={styles.actionRow}>
      {items.map((item) => (
        <Pressable
          key={item.label}
          onPress={() => router.push(item.href as never)}
          style={styles.actionCard}
        >
          <View style={styles.actionIcon}>
            <AppIcon name={item.icon} color={colors.accent} />
          </View>
          <View style={styles.actionFooter}>
            <Text style={styles.actionLabel}>{item.label}</Text>
            <Text style={styles.actionArrow}>Open</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

export function PremiumList({
  items,
}: {
  items: PremiumListItem[];
}) {
  return (
    <View style={styles.list}>
      {items.map((item) => (
        <Pressable
          key={`${item.title}-${item.subtitle}`}
          disabled={!item.href}
          onPress={() => item.href && router.push(item.href as never)}
          style={styles.listCard}
        >
          <View style={styles.listMain}>
            <View style={styles.avatar}>
              <Text style={styles.avatarLabel}>{item.title.charAt(0)}</Text>
            </View>
            <View style={styles.listCopy}>
              <Text style={styles.listTitle}>{item.title}</Text>
              <Text style={styles.listSubtitle}>{item.subtitle}</Text>
            </View>
          </View>
          <View style={styles.listMeta}>
            {item.badge ? <Text style={styles.badge}>{item.badge}</Text> : null}
            {item.detail ? <Text style={styles.detail}>{item.detail}</Text> : null}
            {item.href ? <Text style={styles.chevron}>›</Text> : null}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  statCard: {
    width: "48%",
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    ...shadows.card,
  },
  statValue: {
    ...typography.headline,
    color: colors.text,
  },
  statLabel: {
    ...typography.label,
    color: colors.mutedText,
  },
  statDelta: {
    ...typography.label,
    color: colors.accentDark,
    alignSelf: "flex-start",
    backgroundColor: colors.softAccent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  actionCard: {
    width: "48%",
    minHeight: 118,
    backgroundColor: colors.dark,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.heroBorder,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(163, 230, 53, 0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionFooter: {
    width: "100%",
    gap: 6,
  },
  actionLabel: {
    ...typography.title,
    color: colors.surface,
    fontSize: 16,
  },
  actionArrow: {
    ...typography.label,
    color: colors.darkMuted,
  },
  list: {
    gap: spacing.md,
  },
  listCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.lg,
    padding: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    ...shadows.card,
  },
  listMain: {
    flexDirection: "row",
    gap: spacing.md,
    flex: 1,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.softAccent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLabel: {
    ...typography.title,
    color: colors.accentDark,
  },
  listCopy: {
    flex: 1,
    gap: 4,
  },
  listTitle: {
    ...typography.title,
    color: colors.text,
    fontSize: 17,
  },
  listSubtitle: {
    ...typography.body,
    color: colors.mutedText,
  },
  listMeta: {
    alignItems: "flex-end",
    gap: 8,
    maxWidth: 96,
    justifyContent: "space-between",
  },
  badge: {
    ...typography.label,
    color: colors.accentDark,
    backgroundColor: colors.softAccent,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  detail: {
    ...typography.label,
    color: colors.mutedText,
  },
  chevron: {
    ...typography.headline,
    color: colors.subtleText,
  },
});
