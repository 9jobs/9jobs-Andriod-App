import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { PremiumStatGrid } from "@/components/premium/PremiumCollections";
import { DarkHeroCard, PremiumScaffold, SoftPanel } from "@/components/premium/PremiumScaffold";
import { useAllJobsQuery } from "@/features/jobs/hooks";
import { getTrackerSummary } from "@/lib/data/premium-content";
import { colors, spacing, typography } from "@/theme";

export default function TrackerScreen() {
  const { data: jobs = [] } = useAllJobsQuery();
  const appliedJobs = jobs.filter((job) => job.isApplied);
  const summary = getTrackerSummary(jobs);

  return (
    <PremiumScaffold
      title="Tracker"
      subtitle="See every applied role and the exact stage it is in."
      kicker="PIPELINE"
      hero={
        <DarkHeroCard>
          <Text style={styles.heroTitle}>Stay close to the next move.</Text>
          <Text style={styles.heroBody}>
            Applied roles, interviews, and offers stay organized here so nothing slips.
          </Text>
          <View style={styles.heroSummary}>
            <Text style={styles.heroSummaryLabel}>Current focus</Text>
            <Text style={styles.heroSummaryValue}>
              {summary.interviewing > 0
                ? `${summary.interviewing} roles are waiting on interview momentum`
                : "No interview blockers right now"}
            </Text>
          </View>
        </DarkHeroCard>
      }
    >
      <PremiumStatGrid
        items={[
          { label: "Applied", value: String(summary.applied) },
          { label: "Interviewing", value: String(summary.interviewing) },
          { label: "Offers", value: String(summary.offers) },
          { label: "Saved", value: String(summary.saved) },
        ]}
      />
      <View style={styles.stack}>
        {appliedJobs.map((job) => (
          <SoftPanel key={job.id}>
            <View style={styles.row}>
              <View style={styles.copy}>
                <Text style={styles.jobTitle} onPress={() => router.push(`/(app)/jobs/${job.id}`)}>
                  {job.title}
                </Text>
                <Text style={styles.meta}>
                  {job.company} - {job.status}
                </Text>
              </View>
              <View style={styles.stageBadge}>
                <Text style={styles.stageBadgeText}>{job.status}</Text>
              </View>
            </View>
            <Text style={styles.time}>{job.postedAt}</Text>
          </SoftPanel>
        ))}
      </View>
    </PremiumScaffold>
  );
}

const styles = StyleSheet.create({
  heroTitle: {
    ...typography.headline,
    color: colors.surface,
  },
  heroBody: {
    ...typography.body,
    color: colors.darkMuted,
  },
  heroSummary: {
    gap: 4,
  },
  heroSummaryLabel: {
    ...typography.label,
    color: colors.accent,
  },
  heroSummaryValue: {
    ...typography.body,
    color: colors.surface,
  },
  stack: {
    gap: spacing.md,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  jobTitle: {
    ...typography.title,
    color: colors.text,
  },
  meta: {
    ...typography.body,
    color: colors.mutedText,
    textTransform: "capitalize",
  },
  time: {
    ...typography.label,
    color: colors.mutedText,
  },
  stageBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.softAccent,
  },
  stageBadgeText: {
    ...typography.label,
    color: colors.accentDark,
    textTransform: "capitalize",
  },
});
