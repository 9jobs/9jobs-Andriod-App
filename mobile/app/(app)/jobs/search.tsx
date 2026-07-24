import { useEffect } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { DarkHeroCard, PremiumScaffold } from "@/components/premium/PremiumScaffold";
import { JobCard } from "@/components/ui/JobCard";
import { Pill } from "@/components/ui/Pill";
import { useJobsQuery, useToggleSaveMutation } from "@/features/jobs/hooks";
import { useJobFilters } from "@/features/jobs/useJobFilters";
import { colors, spacing, typography } from "@/theme";

const categories = ["All", "Career Growth", "AI Resume", "Outreach", "Interview", "Remote"] as const;
const locations = ["All locations", "Remote", "Dubai", "Bangalore", "London"] as const;

export default function SearchScreen() {
  const params = useLocalSearchParams<{ query?: string }>();
  const filters = useJobFilters();
  const { data: jobs = [] } = useJobsQuery();
  const toggleSave = useToggleSaveMutation();

  useEffect(() => {
    if (typeof params.query === "string" && params.query !== filters.query) {
      filters.setQuery(params.query);
    }
  }, [filters, params.query]);

  return (
    <PremiumScaffold
      title="Search roles"
      subtitle="Filter high-fit opportunities by skill, location, and saved state."
      kicker="JOBS"
      hero={
        <DarkHeroCard>
          <Text style={styles.heroTitle}>Recommended job feed</Text>
          <Text style={styles.heroBody}>
            Search across the same premium pipeline shown in the design.
          </Text>
        </DarkHeroCard>
      }
    >
      <TextInput
        value={filters.query}
        onChangeText={filters.setQuery}
        placeholder="Search jobs, skills, companies"
        placeholderTextColor={colors.mutedText}
        style={styles.search}
      />
      <View style={styles.filterBlock}>
        <Text style={styles.label}>Category</Text>
        <View style={styles.rowWrap}>
          {categories.map((category) => (
            <Pill
              key={category}
              label={category}
              selected={filters.category === category}
              onPress={() => filters.setCategory(category)}
            />
          ))}
        </View>
      </View>
      <View style={styles.filterBlock}>
        <Text style={styles.label}>Location</Text>
        <View style={styles.rowWrap}>
          {locations.map((location) => (
            <Pill
              key={location}
              label={location}
              selected={filters.location === location}
              onPress={() => filters.setLocation(location)}
            />
          ))}
        </View>
      </View>
      <Pill
        label={filters.onlySaved ? "Saved only: on" : "Saved only: off"}
        selected={filters.onlySaved}
        onPress={filters.toggleOnlySaved}
      />
      <View style={styles.results}>
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            onPress={() => router.push(`/(app)/jobs/${job.id}`)}
            onToggleSave={() => toggleSave.mutate(job.id)}
          />
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
  search: {
    minHeight: 56,
    borderRadius: 24,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    color: colors.text,
    ...typography.body,
  },
  filterBlock: {
    gap: spacing.sm,
  },
  label: {
    ...typography.label,
    color: colors.mutedText,
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  results: {
    gap: spacing.md,
  },
});
