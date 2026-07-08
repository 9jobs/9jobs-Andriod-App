import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  applyToJob,
  getJobById,
  getProfile,
  listJobs,
  toggleSavedJob,
  updateProfile,
} from "@/lib/data/jobs-repository";
import { queryKeys } from "@/lib/queries";
import { filterJobs } from "@/features/jobs/filterJobs";
import { useJobFilters } from "@/features/jobs/useJobFilters";

export function useJobsQuery() {
  const filters = useJobFilters();

  return useQuery({
    queryKey: [...queryKeys.jobs, filters],
    queryFn: async () => {
      const jobs = await listJobs();
      return filterJobs(jobs, filters);
    },
  });
}

export function useAllJobsQuery() {
  return useQuery({
    queryKey: queryKeys.jobs,
    queryFn: listJobs,
  });
}

export function useJobDetailQuery(id: string) {
  return useQuery({
    queryKey: [...queryKeys.jobs, id],
    queryFn: () => getJobById(id),
  });
}

export function useToggleSaveMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleSavedJob,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.jobs });
    },
  });
}

export function useApplyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: applyToJob,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.jobs });
    },
  });
}

export function useProfileQuery() {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: getProfile,
  });
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile });
    },
  });
}
