import { SmoothScrollView } from "@/components/ui/SmoothScrollView";
import { useEffect } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { PremiumScaffold } from "@/components/premium/PremiumScaffold";
import { JobCard } from "@/components/ui/JobCard";
import { Pill } from "@/components/ui/Pill";
import { AnimatedPressable } from "@/components/motion/AnimatedPressable";
import { AppIcon } from "@/components/ui/AppIcon";
import { useJobsQuery, useToggleSaveMutation } from "@/features/jobs/hooks";
import { useJobFilters } from "@/features/jobs/useJobFilters";
import { filterJobs } from "@/features/jobs/filterJobs";
import { searchAppSections } from "@/lib/navigation/home-search-destination";
import { AppSearchResults } from "@/components/ui/AppSearchResults";
import { colors, spacing, typography } from "@/theme";

const categories = ["All", "Career Growth", "AI Resume", "Outreach", "Interview", "Remote"] as const;
const locations = ["Australia", "Remote", "Sydney", "Melbourne", "Brisbane", "Perth", "Geelong", "Adelaide", "Canberra", "Hobart", "Darwin"] as const;

export default function SearchScreen() {
  const params = useLocalSearchParams<{ query?: string }>();
  const filters = useJobFilters();
  const { data: jobs = [] } = useJobsQuery();
  const toggleSave = useToggleSaveMutation();

  const setQuery = filters.setQuery;
  useEffect(() => {
    if (typeof params.query === "string") {
      setQuery(params.query);
    }
  }, [setQuery, params.query]);

  const filteredJobs = filterJobs(jobs, filters);
  const appResults = searchAppSections(filters.query);

  return (
    <PremiumScaffold
      title="Search roles"
      subtitle="Filter high-fit opportunities by skill, location, and saved state."
      kicker="JOBS"
    >
      <TextInput
        value={filters.query}
        onChangeText={filters.setQuery}
        placeholder="Search jobs, skills, companies"
        placeholderTextColor={colors.mutedText}
        style={styles.search}
        onSubmitEditing={() => { if (appResults.length === 1) router.push(appResults[0].destination as never); }}
        accessibilityLabel="Search jobs and app sections"
        returnKeyType="search"
      />
      <AppSearchResults query={filters.query} />
      <View style={styles.filterBlock}>
        <Text style={styles.label}>Category</Text>
        <SmoothScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled={true}
          contentContainerStyle={styles.scrollRow}
        >
          {categories.map((category) => (
            <Pill
              key={category}
              label={category}
              selected={filters.category === category}
              onPress={() => filters.setCategory(category)}
            />
          ))}
        </SmoothScrollView>
      </View>
      <View style={styles.filterBlock}>
        <Text style={styles.label}>Location</Text>
        <SmoothScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled={true}
          contentContainerStyle={styles.scrollRow}
        >
          {locations.map((location) => (
            <Pill
              key={location}
              label={location}
              selected={filters.location === location}
              onPress={() => filters.setLocation(location)}
            />
          ))}
        </SmoothScrollView>
      </View>
      <Pill
        label={filters.onlySaved ? "Saved only: on" : "Saved only: off"}
        selected={filters.onlySaved}
        onPress={filters.toggleOnlySaved}
      />


      <View style={styles.results}>
        {filteredJobs.length > 0 ? (
          filteredJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onPress={() => router.push(`/(app)/jobs/${job.id}`)}
              onToggleSave={() => toggleSave.mutate(job.id)}
            />
          ))
        ) : appResults.length === 0 ? (
          <View style={styles.noResultsContainer}>
            <AppIcon name="search" size={48} color={colors.mutedText} />
            <Text style={styles.noResultsTitle}>No roles found</Text>
            <Text style={styles.noResultsSubtitle}>
              Try adjusting your search query, category, or location filter.
            </Text>
            <AnimatedPressable
              style={styles.resetButton}
              onPress={() => filters.reset()}
            >
              <Text style={styles.resetButtonText}>Reset Filters</Text>
            </AnimatedPressable>
          </View>
        ) : null}
      </View>
    </PremiumScaffold>
  );
}

const styles = StyleSheet.create({
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
  scrollRow: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingVertical: 4,
  },
  shortcutCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  shortcutTextContainer: {
    flex: 1,
    gap: 2,
  },
  shortcutTitle: {
    ...typography.title,
    fontSize: 16,
    color: colors.text,
   fontFamily: "Inter_400Regular" },
  shortcutSubtitle: {
    ...typography.label,
    fontWeight: "400",
    color: colors.mutedText,
   fontFamily: "Inter_400Regular" },
  shortcutArrow: {
    fontSize: 20,
    color: colors.mutedText,
   fontFamily: "PlusJakartaSans_600SemiBold" },
  noResultsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
    marginBottom: 80,
  },
  noResultsTitle: {
    ...typography.title,
    color: colors.text,
    fontSize: 18,
    marginTop: spacing.xs,
   fontFamily: "PlusJakartaSans_600SemiBold" },
  noResultsSubtitle: {
    ...typography.body,
    color: colors.mutedText,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
   fontFamily: "Inter_400Regular" },
  resetButton: {
    backgroundColor: colors.text,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: spacing.xs,
  },
  resetButtonText: {
    ...typography.label,
    color: colors.surface,
    fontWeight: "700",
   fontFamily: "Inter_600SemiBold" },
  results: {
    gap: spacing.md,
  },
});
