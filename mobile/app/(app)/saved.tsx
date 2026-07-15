import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { PremiumScaffold } from "@/components/premium/PremiumScaffold";
import { useAllJobsQuery, useToggleSaveMutation } from "@/features/jobs/hooks";
import { colors, radii, shadows, spacing, typography } from "@/theme";

export default function SavedScreen() {
  const { data: jobs = [] } = useAllJobsQuery();
  const saved = jobs.filter((job) => job.isSaved);
  const toggleSave = useToggleSaveMutation();

  const handleViewJob = async (job: (typeof saved)[number]) => {
    if (job.jobLink) {
      await Linking.openURL(job.jobLink);
      return;
    }

    router.push(`/(app)/jobs/${job.id}`);
  };

  return (
    <PremiumScaffold
      title="Saved roles"
      subtitle="Keep the strongest-fit opportunities close and revisit them fast."
      kicker="BOOKMARKS"
    >
      <Text style={styles.body}>Review your saved opportunities and open any role when you are ready.</Text>

      <View style={styles.list}>
        {saved.map((job, index) => (
          <View key={job.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.scoreBadge}>
                <Text style={styles.scoreText}>{String(index + 1).padStart(2, "0")}</Text>
              </View>
              <Pressable onPress={() => toggleSave.mutate(job.id)} style={styles.savedBadge}>
                <Text style={styles.savedBadgeText}>Saved</Text>
              </Pressable>
            </View>

            <View style={styles.copyBlock}>
              <Text style={styles.title}>{job.title}</Text>
              <Text style={styles.meta}>{job.company} • {job.location}</Text>
              <Text style={styles.salary}>{job.salary}</Text>
              <Text style={styles.description} numberOfLines={3}>{job.description}</Text>
            </View>

            <View style={styles.actions}>
              <Pressable onPress={() => void handleViewJob(job)} style={[styles.actionButton, styles.viewButton]}>
                <Text style={[styles.actionLabel, styles.viewLabel]}>View Job</Text>
              </Pressable>
              <Pressable onPress={() => toggleSave.mutate(job.id)} style={[styles.actionButton, styles.removeButton]}>
                <Text style={styles.actionLabel}>Remove</Text>
              </Pressable>
            </View>
          </View>
        ))}

        {saved.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No saved roles yet</Text>
            <Text style={styles.emptyBody}>Saved jobs from the admin panel will appear here automatically.</Text>
          </View>
        ) : null}
      </View>
    </PremiumScaffold>
  );
}

const styles = StyleSheet.create({
  body: {
    ...typography.body,
    color: colors.mutedText,
  },
  list: {
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.soft,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scoreBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreText: {
    ...typography.title,
    color: colors.text,
    fontSize: 18,
  },
  savedBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.softAccent,
  },
  savedBadgeText: {
    ...typography.label,
    color: colors.accentDark,
    fontSize: 13,
  },
  copyBlock: {
    gap: spacing.xs,
  },
  title: {
    ...typography.headline,
    color: colors.text,
    fontSize: 24,
  },
  meta: {
    ...typography.body,
    color: colors.mutedText,
  },
  salary: {
    ...typography.title,
    color: colors.text,
    fontSize: 20,
  },
  description: {
    ...typography.body,
    color: colors.subtleText,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
  },
  actionButton: {
    minHeight: 56,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  viewButton: {
    backgroundColor: colors.text,
    flex: 1,
  },
  removeButton: {
    backgroundColor: colors.accent,
    minWidth: 104,
  },
  actionLabel: {
    ...typography.title,
    fontSize: 16,
    color: colors.text,
  },
  viewLabel: {
    color: colors.surface,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.xs,
    alignItems: "center",
    ...shadows.card,
  },
  emptyTitle: {
    ...typography.title,
    color: colors.text,
  },
  emptyBody: {
    ...typography.body,
    color: colors.mutedText,
    textAlign: "center",
  },
});
