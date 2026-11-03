import { createHash } from "node:crypto";
import type { Pool } from "pg";
import { readSheetJobs } from "./sheetStore";

export function sourceDateCandidates(value: string): string[] {
  const valid=(year:number,month:number,day:number)=>{
    const d=new Date(Date.UTC(year,month-1,day));
    return d.getUTCFullYear()===year&&d.getUTCMonth()===month-1&&d.getUTCDate()===day?`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`:null;
  };
  const slash=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  const iso=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if(slash)return [...new Set([valid(+slash[3],+slash[2],+slash[1]),valid(+slash[3],+slash[1],+slash[2])].filter(Boolean))] as string[];
  if(iso){const d=valid(+iso[1],+iso[2],+iso[3]);return d?[d]:[];}
  const match=/^(\d{1,2})-([A-Za-z]+)-(\d{4})$/.exec(value);
  if(!match)return [];
  const month=[['jan','january'],['feb','february'],['mar','march'],['apr','april'],['may'],['jun','june'],['jul','july'],['aug','august'],['sep','sept','september'],['oct','october'],['nov','november'],['dec','december']].findIndex(names=>names.includes(match[2].toLowerCase()))+1;
  const d=month?valid(+match[3],month,+match[1]):null;return d?[d]:[];
}
export function sourceDate(value:string){
 const dates=sourceDateCandidates(value);return dates.length===1?dates[0]:null;
}

export function sheetApplication(job: any, userId: string) {
  const f = job.source_fields || {};
  // Preserve missing status rather than assigning progress from a row's existence.
  if (String(f.Recruiter || "").trim().toLowerCase() !== "applied") return null;
  const date = job.source_resolved_date || sourceDate(String(f["Applied Date"] || ""));
  if (!date) return null;
  const id = -Number.parseInt(createHash("sha256").update(job.id).digest("hex").slice(0,12),16);
  return { id, user_id:userId,client_id:userId,job_id:job.id,status:"applied",current_stage:"applied",
    application_date:date,applied_at:date,created_at:date,is_saved:false,
    job_title:job.title,company_name:job.company,source_url:job.job_link,
    recruiter_email:/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(f.Email || "").trim()) ? String(f.Email).trim() : "",
    recruiter_phone:/^\+?[\d ()-]{7,}$/.test(String(f.Contact || "").trim()) ? String(f.Contact).trim() : "",
    job_description:job.description,source:"duplicate-sheet",source_fields:f };
}

export async function readSheetActivity(userId: string, db: Pool) {
  const result: NonNullable<ReturnType<typeof sheetApplication>>[] = [];
  const jobs: any[] = [];
  let offset = 0, snapshotId: string | undefined;
  do {
    const page = await readSheetJobs({userId,limit:1000,offset,snapshotId},db);
    if (snapshotId && snapshotId !== page.snapshotId) throw new Error("Snapshot changed during pagination");
    snapshotId = page.snapshotId || undefined;
    jobs.push(...page.jobs);
    for (const job of page.jobs) { const row = sheetApplication(job,userId); if (row) result.push(row); }
    offset += page.jobs.length;
    if (offset >= page.total) break;
    if (!page.jobs.length) throw new Error("Incomplete sheet application pagination");
  } while (true);
  if (new Set(result.map(row=>row.id)).size !== result.length) throw new Error("Source application identity collision");
  return { applications: result, ...sheetActivity(jobs) };
}

export function sheetActivity(jobs: any[]) {
  const recruiterContacts: any[] = [], coldEmails: any[] = [];
  let messagesSent = 0, messagesShared = 0;
  for (const job of jobs) {
    const f = job.source_fields || {}, email = String(f.Email || "").trim().toLowerCase();
    const message = String(f.Message || "").trim().toLowerCase(), name = String(f.Contact || "").trim();
    if (message === "sent") messagesSent++;
    if (message === "shared") messagesShared++;
    const provenance = { source:"duplicate-sheet", source_job_id:job.id, source_fields:f };
    if (email === "sent") coldEmails.push({ ...provenance, id:job.id, delivery_status:"sent", sent_at:null, source_sent_confirmed:true });
    if (name && !/^[.\-–—]+$/.test(name)) recruiterContacts.push({ ...provenance,
      id:-Number.parseInt(createHash("sha256").update("contact:"+job.id).digest("hex").slice(0,12),16),
      recruiter_name:name, company_name:job.company, email:/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)?email:"",
      contact_date:null, response_status:null, source_outreach_confirmed:email === "sent" || ["sent","shared"].includes(message) });
  }
  return { recruiterContacts, coldEmails, sourceActivity:{ records:jobs.length, emailsSent:coldEmails.length,
    contactsAdded:new Set(recruiterContacts.map(c=>c.recruiter_name.toLowerCase().replace(/\s+/g," "))).size,
    messagesSent, messagesShared } };
}

export async function readSheetApplications(userId: string, db: Pool) {
  return (await readSheetActivity(userId,db)).applications;
}
