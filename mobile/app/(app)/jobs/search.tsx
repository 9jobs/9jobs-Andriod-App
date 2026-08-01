import { useEffect } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { DarkHeroCard, PremiumScaffold } from "@/components/premium/PremiumScaffold";
import { JobCard } from "@/components/ui/JobCard";
import { Pill } from "@/components/ui/Pill";
import { AnimatedPressable } from "@/components/motion/AnimatedPressable";
import { AppIcon } from "@/components/ui/AppIcon";
import { useJobsQuery, useToggleSaveMutation } from "@/features/jobs/hooks";
import { useJobFilters } from "@/features/jobs/useJobFilters";
import { filterJobs } from "@/features/jobs/filterJobs";
import { resolveHomeSearchDestination } from "@/lib/navigation/home-search-destination";
import { colors, spacing, typography } from "@/theme";

const categories = ["All", "Career Growth", "AI Resume", "Outreach", "Interview", "Remote"] as const;
const locations = ["Australia", "Remote", "Sydney", "Melbourne", "Brisbane", "Perth", "Geelong", "Adelaide", "Canberra", "Hobart", "Darwin"] as const;

function getShortcutInfo(query: string) {
  if (!query) return null;
  const q = query.trim().toLowerCase();
  
  if (q === "about" || q === "about us" || q === "aboutus") {
    return {
      label: "About Us",
      pathname: "/(app)/about" as const,
      icon: "info" as const,
    };
  }
  
  const dest = resolveHomeSearchDestination(query);
  if (!dest) return null;
  
  if (dest.pathname === "/(app)/jobs/search") {
    return null;
  }
  
  let label = "";
  let icon: "tracker" | "resume" | "mail" | "mic" | "story" | "spark" | "settings" | "info" = "tracker";
  
  if (dest.pathname === "/(app)/tracker-details") {
    label = `Job Tracker (${dest.params?.filter || "Filtered"})`;
    icon = "tracker";
  } else if (dest.pathname === "/(app)/tracker") {
    label = "Job Tracker";
    icon = "tracker";
  } else if (dest.pathname === "/(app)/resume") {
    label = "Resume AI";
    icon = "resume";
  } else if (dest.pathname === "/(app)/outreach") {
    label = "Hiring Manager Outreach";
    icon = "mail";
  } else if (dest.pathname === "/(app)/interview") {
    label = "Interview Prep";
    icon = "mic";
  } else if (dest.pathname === "/(app)/stories") {
    label = "Success Stories";
    icon = "story";
  } else if (dest.pathname === "/(app)/pricing") {
    label = "Pricing Plans";
    icon = "spark";
  } else if (dest.pathname === "/(app)/services") {
    label = "All Services";
    icon = "settings";
  } else if (dest.pathname === "/(app)/about") {
    label = "About Us";
    icon = "info";
  }
  
  if (!label) return null;
  
  return {
    label,
    pathname: dest.pathname,
    params: dest.params,
    icon,
  };
}

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

  const filteredJobs = filterJobs(jobs, filters);
  const shortcut = getShortcutInfo(filters.query);

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
        onSubmitEditing={() => {
          if (shortcut) {
            router.push({
              pathname: shortcut.pathname as any,
              params: shortcut.params,
            });
          }
        }}
        returnKeyType="search"
      />
      <View style={styles.filterBlock}>
        <Text style={styles.label}>Category</Text>
        <ScrollView
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
        </ScrollView>
      </View>
      <View style={styles.filterBlock}>
        <Text style={styles.label}>Location</Text>
        <ScrollView
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
        </ScrollView>
      </View>
      <Pill
        label={filters.onlySaved ? "Saved only: on" : "Saved only: off"}
        selected={filters.onlySaved}
        onPress={filters.toggleOnlySaved}
      />
      
      {shortcut && (
        <AnimatedPressable
          style={styles.shortcutCard}
          onPress={() =>
            router.push({
              pathname: shortcut.pathname as any,
              params: shortcut.params,
            })
          }
        >
          <AppIcon name={shortcut.icon} size={24} color={colors.text} />
          <View style={styles.shortcutTextContainer}>
            <Text style={styles.shortcutTitle}>Go to {shortcut.label}</Text>
            <Text style={styles.shortcutSubtitle}>
              Tap to open this section of the app
            </Text>
          </View>
          <Text style={styles.shortcutArrow}>→</Text>
        </AnimatedPressable>
      )}

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
        ) : (
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
        )}
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
  },
  shortcutSubtitle: {
    ...typography.label,
    fontWeight: "400",
    color: colors.mutedText,
  },
  shortcutArrow: {
    fontSize: 20,
    color: colors.mutedText,
  },
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
  },
  noResultsSubtitle: {
    ...typography.body,
    color: colors.mutedText,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
  },
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
  },
  results: {
    gap: spacing.md,
  },
});
