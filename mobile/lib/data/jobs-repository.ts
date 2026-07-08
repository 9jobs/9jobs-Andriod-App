import { demoJobs } from "@/lib/data/demo-jobs";
import { wait } from "@/lib/utils/time";
import type { CandidateProfile } from "@/types/profile";
import { demoProfile } from "@/lib/data/demo-profile";

let jobsDb = [...demoJobs];
let profileDb: CandidateProfile = { ...demoProfile };

export async function listJobs() {
  await wait(140);
  return [...jobsDb];
}

export async function getJobById(id: string) {
  await wait(120);
  return jobsDb.find((job) => job.id === id) ?? null;
}

export async function toggleSavedJob(id: string) {
  await wait(90);
  jobsDb = jobsDb.map((job) =>
    job.id === id ? { ...job, isSaved: !job.isSaved } : job,
  );
  return jobsDb.find((job) => job.id === id) ?? null;
}

export async function applyToJob(id: string) {
  await wait(140);
  jobsDb = jobsDb.map((job) =>
    job.id === id ? { ...job, isApplied: true, status: "applied" } : job,
  );
  return jobsDb.find((job) => job.id === id) ?? null;
}

export async function getProfile() {
  await wait(120);
  return { ...profileDb };
}

export async function updateProfile(
  patch: Partial<Pick<CandidateProfile, "darkMode" | "biometric">>,
) {
  await wait(100);
  profileDb = { ...profileDb, ...patch };
  return { ...profileDb };
}
