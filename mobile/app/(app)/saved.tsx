import { StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { PremiumScaffold } from "@/components/premium/PremiumScaffold";
import { JobCard } from "@/components/ui/JobCard";
import { useAllJobsQuery, useToggleSaveMutation } from "@/features/jobs/hooks";
import { colors, typography } from "@/theme";

export default function SavedScreen() {
  const { data: jobs = [] } = useAllJobsQuery();
  const saved = jobs.filter((job) => job.isSaved);
  const toggleSave = useToggleSaveMutation();

  return (
    <PremiumScaffold
      title="Saved roles"
      subtitle="Keep the strongest-fit opportunities close and revisit them fast."
      kicker="BOOKMARKS"
    >
      <Text style={styles.body}>Keep the strongest-fit opportunities close and revisit them fast.</Text>
      {saved.map((job) => (
        <JobCard
          key={job.id}
          job={job}
          onPress={() => router.push(`/(app)/jobs/${job.id}`)}
          onToggleSave={() => toggleSave.mutate(job.id)}
        />
      ))}
    </PremiumScaffold>
  );
}

const styles = StyleSheet.create({
  body: {
    ...typography.body,
    color: colors.mutedText,
  },
});
