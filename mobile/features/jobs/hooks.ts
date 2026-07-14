import { useMutation, useQueryClient } from "@tanstack/react-query";
import { applyToJob, toggleSavedJob, updateApplicationStatus, updateProfile, updateResumeScore, markMessagesAsSeen, markMessagesAsDelivered } from "@/lib/data/mobile-sync-repository";
import { queryKeys } from "@/lib/queries";
import { filterJobs } from "@/features/jobs/filterJobs";
import { useJobFilters } from "@/features/jobs/useJobFilters";
import { usePreviewSyncQuery } from "@/features/mobile-sync/hooks";
import { useSession } from "@/providers/SessionProvider";

export function useJobsQuery() {
  const filters = useJobFilters();
  const query = usePreviewSyncQuery(false);
  return {
    ...query,
    data: filterJobs(query.data?.jobs ?? [], filters),
  };
}

export function useAllJobsQuery() {
  const query = usePreviewSyncQuery(false);
  return {
    ...query,
    data: query.data?.jobs ?? [],
  };
}

export function useJobDetailQuery(id: string) {
  const query = usePreviewSyncQuery(false);
  return {
    ...query,
    data: query.data?.jobs.find((job) => job.id === id) ?? null,
  };
}

export function useToggleSaveMutation() {
  const queryClient = useQueryClient();
  const { user } = useSession();

  return useMutation({
    mutationFn: (jobId: string) => toggleSavedJob(jobId, user),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.previewSync });
    },
  });
}

export function useApplyMutation() {
  const queryClient = useQueryClient();
  const { user } = useSession();

  return useMutation({
    mutationFn: (jobId: string) => applyToJob(jobId, user),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.previewSync });
    },
  });
}

export function useUpdateApplicationStatusMutation() {
  const queryClient = useQueryClient();
  const { user } = useSession();

  return useMutation({
    mutationFn: ({ jobId, status }: { jobId: string; status: string }) =>
      updateApplicationStatus(jobId, status, user),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.previewSync });
    },
  });
}

export function useProfileQuery() {
  const query = usePreviewSyncQuery(false);
  return {
    ...query,
    data: query.data?.profile ?? null,
  };
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();
  const { user } = useSession();

  return useMutation({
    mutationFn: (patch: Parameters<typeof updateProfile>[0]) => updateProfile(patch, user),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.previewSync });
    },
  });
}

export function useUpdateResumeScoreMutation() {
  const queryClient = useQueryClient();
  const { user } = useSession();

  return useMutation({
    mutationFn: (score: number) => updateResumeScore(score, user),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.previewSync });
    },
  });
}

export function useMarkMessagesAsSeenMutation() {
  const queryClient = useQueryClient();
  const { user } = useSession();

  return useMutation({
    mutationFn: () => markMessagesAsSeen(user),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.previewSync });
    },
  });
}

export function useMarkMessagesAsDeliveredMutation() {
  const queryClient = useQueryClient();
  const { user } = useSession();

  return useMutation({
    mutationFn: () => markMessagesAsDelivered(user),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.previewSync });
    },
  });
}
