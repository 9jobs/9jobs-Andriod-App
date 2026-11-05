type ExistingRole = { status?: string; current_stage?: string; is_saved?: boolean };

export function jobSaveState(savedJobsPage: boolean, existing?: ExistingRole, appliedAt?: string | null) {
  const previous = String(existing?.status || "").trim().toLowerCase();
  const isSaved = savedJobsPage || Boolean(existing?.is_saved) || previous === "saved";
  const status = previous && previous !== "saved" ? existing!.status! : isSaved ? "saved" : "applied";
  const stage = String(existing?.current_stage || "").trim();
  return {
    status,
    current_stage: stage && stage.toLowerCase() !== "saved" ? stage : status,
    is_saved: isSaved,
    is_active: !["saved", "hired", "rejected", "withdrawn", "closed"].includes(status.toLowerCase()),
    applied_at: status.toLowerCase() === "saved" ? null : appliedAt || new Date().toISOString(),
  };
}
