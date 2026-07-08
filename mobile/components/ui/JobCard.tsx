import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppIcon } from "@/components/ui/AppIcon";
import { Pill } from "@/components/ui/Pill";
import { colors, radii, shadows, spacing, typography } from "@/theme";
import type { Job } from "@/types/jobs";
import { SuccessPulse } from "@/components/motion/SuccessPulse";

type JobCardProps = {
  job: Job;
  onPress: () => void;
  onToggleSave?: () => void;
};

export function JobCard({ job, onPress, onToggleSave }: JobCardProps) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.matchBadge}>
          <Text style={styles.matchValue}>{job.matchScore}</Text>
        </View>
        <Pressable onPress={onToggleSave} hitSlop={8}>
          <AppIcon
            name="saved"
            color={job.isSaved ? colors.text : colors.mutedText}
            strokeWidth={2.2}
          />
        </Pressable>
      </View>
      <Text style={styles.title}>{job.title}</Text>
      <Text style={styles.company}>
        {job.company} • {job.location}
      </Text>
      <Text style={styles.salary}>{job.salary}</Text>
      <View style={styles.tags}>
        {job.tags.map((tag) => (
          <Pill key={tag} label={tag} />
        ))}
      </View>
      <View style={styles.footer}>
        <Text style={styles.posted}>{job.postedAt}</Text>
        {job.isApplied ? (
          <View style={styles.applied}>
            <SuccessPulse />
            <Text style={styles.appliedText}>{job.status}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.soft,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  matchBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  matchValue: {
    ...typography.title,
    fontSize: 15,
    color: colors.text,
  },
  title: {
    ...typography.title,
    color: colors.text,
    fontSize: 19,
  },
  company: {
    ...typography.body,
    color: colors.mutedText,
  },
  salary: {
    ...typography.body,
    color: colors.text,
    fontWeight: "700",
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  posted: {
    ...typography.label,
    color: colors.mutedText,
  },
  applied: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  appliedText: {
    ...typography.label,
    color: colors.text,
    textTransform: "capitalize",
  },
});
