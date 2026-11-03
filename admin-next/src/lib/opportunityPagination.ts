export function matchesOpportunity(job: any, query: string) {
  const value = query.toLowerCase();
  return [job.title, job.company, job.user_name, job.user_email]
    .some(field => String(field || "").toLowerCase().includes(value));
}

// Sheet records come first, followed by existing backend-managed opportunities.
// Fetch only one Sheet page; keep the same ordering across the boundary.
export function combineOpportunityPage(
  source: { jobs: any[]; total: number }, manualJobs: any[],
  query: string, page: number, pageSize: number,
) {
  const manual = manualJobs.filter(job => matchesOpportunity(job, query));
  const offset = (page - 1) * pageSize;
  const remaining = Math.max(0, pageSize - source.jobs.length);
  const tail = offset + source.jobs.length >= source.total
    ? manual.slice(Math.max(0, offset - source.total), Math.max(0, offset - source.total) + remaining)
    : [];
  return { jobs: [...source.jobs, ...tail], total: source.total + manual.length };
}
