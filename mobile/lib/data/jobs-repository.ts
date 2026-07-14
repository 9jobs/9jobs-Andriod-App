import { applyToJob as applyLiveToJob, fetchMobileSyncSnapshot, toggleSavedJob as toggleLiveSavedJob, updateProfile as updateLiveProfile } from "@/lib/data/mobile-sync-repository";
import type { CandidateProfile } from "@/types/profile";

export async function listJobs() {
  const snapshot = await fetchMobileSyncSnapshot();
  return snapshot.jobs;
}

export async function getJobById(id: string) {
  const snapshot = await fetchMobileSyncSnapshot();
  return snapshot.jobs.find((job) => job.id === id) ?? null;
}

export async function toggleSavedJob(id: string) {
  return toggleLiveSavedJob(id);
}

export async function applyToJob(id: string) {
  return applyLiveToJob(id);
}

export async function getProfile() {
  const snapshot = await fetchMobileSyncSnapshot();
  return snapshot.profile;
}

export async function updateProfile(
  patch: Partial<CandidateProfile & { avatarUrl?: string }>,
) {
  return updateLiveProfile(patch);
}
