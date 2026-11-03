import { resolveBackendUrl } from "./backend-auth-token";
type SheetSession = { userId: string; getToken: () => Promise<string | null> };
let session: SheetSession | null = null;
let cached: { session: SheetSession; version: string; jobs: any[] } | null = null;

// Uses the existing Clerk login session. No Google key or client-supplied identity.
export function registerSheetSession(userId: string, getter: () => Promise<string | null>) {
  const registered = { userId, getToken: getter };
  session = registered;
  cached = null;
  return () => { if (session === registered) { session = null; cached = null; } };
}

export async function fetchAuthorizedSheetJobs(expectedUserId: string): Promise<any[]> {
  if (process.env.EXPO_PUBLIC_SHEET_INTEGRATION_ENABLED !== "true") return [];
  const current = session;
  if (!current || current.userId !== expectedUserId) return [];
  const token = await current.getToken();
  if (!token || current !== session) return [];
  const versionResponse = await fetch(`${resolveBackendUrl()}/api/mobile/sheet-records/version`, {
    headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20000),
  });
  if (!versionResponse.ok) throw new Error("Authorized sheet version is temporarily unavailable");
  const { version } = await versionResponse.json() as { version: string | null };
  if (current !== session) throw new Error("Login changed while loading private sheet records");
  if (!version) { cached = null; return []; }
  if (cached?.session === current && cached.version === version) return cached.jobs;
  const jobs: any[] = [];
  let offset = 0;
  let snapshotId: string | null = null;
  for (;;) {
    const response: Response = await fetch(`${resolveBackendUrl()}/api/mobile/sheet-records?limit=1000&offset=${offset}${snapshotId ? `&snapshotId=${encodeURIComponent(snapshotId)}` : ""}`, {
      headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error("Authorized sheet records are temporarily unavailable");
    const data: { jobs: any[]; total: number; snapshotId: string | null } = await response.json();
    if (current !== session) throw new Error("Login changed while loading private sheet records");
    if (!Array.isArray(data.jobs) || !Number.isInteger(data.total)) throw new Error("Invalid sheet record response");
    if (snapshotId && snapshotId !== data.snapshotId) throw new Error("Sheet snapshot changed during pagination");
    snapshotId = data.snapshotId;
    jobs.push(...data.jobs);
    offset += data.jobs.length;
    if (offset >= data.total) { cached = {session:current,version,jobs}; return jobs; }
    if (!data.jobs.length) throw new Error("Incomplete sheet pagination");
  }
}
