import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { DarkHeroCard, PremiumScaffold, SoftPanel } from "@/components/premium/PremiumScaffold";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Pill } from "@/components/ui/Pill";
import { useApplyMutation, useJobDetailQuery, useToggleSaveMutation } from "@/features/jobs/hooks";
import { colors, spacing, typography } from "@/theme";

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: job } = useJobDetailQuery(id);
  const apply = useApplyMutation();
  const toggleSave = useToggleSaveMutation();

  if (!job) {
    return (
      <PremiumScaffold title="Job not found">
        <Text style={styles.title}>Job not found</Text>
      </PremiumScaffold>
    );
  }

  return (
    <PremiumScaffold
      title={job.title}
      subtitle={`${job.company} • ${job.location}`}
      kicker="JOB DETAIL"
      hero={
        <DarkHeroCard>
          <Text style={styles.heroTitle}>{job.salary}</Text>
          <Text style={styles.heroBody}>{job.description}</Text>
        </DarkHeroCard>
      }
    >
      <Text style={styles.back} onPress={() => router.back()}>
        Back
      </Text>
      <SoftPanel>
        <Text style={styles.score}>{job.matchScore}</Text>
        <Text style={styles.meta}>
          {job.company} • {job.location}
        </Text>
        <Text style={styles.salary}>{job.salary}</Text>
      </SoftPanel>
      <View style={styles.tags}>
        {job.tags.map((tag) => (
          <Pill key={tag} label={tag} selected />
        ))}
      </View>
      <SoftPanel>
        <Text style={styles.sectionTitle}>Role summary</Text>
        <Text style={styles.description}>{job.description}</Text>
      </SoftPanel>
      <View style={styles.actionRow}>
        <PrimaryButton
          label={job.isApplied ? "Applied" : "Apply now"}
          onPress={() => apply.mutate(job.id)}
          style={styles.cta}
          disabled={job.isApplied}
        />
        <PrimaryButton
          label={job.isSaved ? "Saved" : "Save"}
          onPress={() => toggleSave.mutate(job.id)}
          variant="ghost"
        />
      </View>
    </PremiumScaffold>
  );
}

const styles = StyleSheet.create({
  back: {
    ...typography.label,
    color: colors.mutedText,
    marginTop: spacing.sm,
  },
  heroTitle: {
    ...typography.headline,
    color: colors.surface,
  },
  heroBody: {
    ...typography.body,
    color: colors.darkMuted,
  },
  score: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
    textAlign: "center",
    textAlignVertical: "center",
    overflow: "hidden",
    color: colors.text,
    ...typography.title,
  },
  title: {
    ...typography.display,
    color: colors.text,
    fontSize: 32,
    lineHeight: 36,
  },
  meta: {
    ...typography.body,
    color: colors.mutedText,
  },
  salary: {
    ...typography.title,
    color: colors.text,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  sectionTitle: {
    ...typography.title,
    color: colors.text,
  },
  description: {
    ...typography.body,
    color: colors.mutedText,
  },
  actionRow: {
    gap: spacing.md,
  },
  cta: {
    width: "100%",
  },
});
