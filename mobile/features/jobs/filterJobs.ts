import type { Job, JobFilters } from "@/types/jobs";

export function filterJobs(jobs: Job[], filters: JobFilters) {
  const query = filters.query.trim().toLowerCase();

  return jobs.filter((job) => {
    const matchesQuery =
      query.length === 0 ||
      job.title.toLowerCase().includes(query) ||
      job.company.toLowerCase().includes(query) ||
      job.description.toLowerCase().includes(query) ||
      job.tags.some((tag) => tag.toLowerCase().includes(query));

    const matchesCategory =
      filters.category === "All" || job.category === filters.category;

    const matchesLocation =
      filters.location === "All locations" ||
      job.location.toLowerCase().includes(filters.location.toLowerCase());

    const matchesSaved = !filters.onlySaved || job.isSaved;

    return matchesQuery && matchesCategory && matchesLocation && matchesSaved;
  });
}
