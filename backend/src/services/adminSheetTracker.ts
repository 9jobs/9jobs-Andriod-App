import type {Pool} from 'pg';
import {readSheetActivity,sheetApplication} from './sheetApplications';
import {SHEET_ID,sheetJob} from './sheetStore';

// Admin access is enforced by the route. Candidate ownership still comes from
// the approved account-to-source mapping used by the Android API.
export async function readAdminSheetTracker(userId:string,db:Pool){
  const source=await readSheetActivity(userId,db);
  const account=(await db.query('select user_id as id,full_name,email from sheet_sync.verified_accounts where user_id=$1',[userId])).rows[0]||null;
  const jobs=new Map(source.jobs.map(job=>[job.id,job]));
  return {...source,applications:source.applications.map(application=>({...application,
    jobs:jobs.get(application.job_id)||null,profiles:account,
    recruiter_name:String(application.source_fields?.Contact||'').trim(),
  }))};
}

export async function readApprovedAdminSheetApplications(db:Pool){
  const rows=(await db.query(`select r.id,r.fields,m.source_row,n.resolved_date,
      a.user_id,v.full_name,v.email
    from sheet_sync.head h
    join sheet_sync.snapshots s on s.id=h.snapshot_id and s.source_completed=true
    join sheet_sync.snapshot_records m on m.snapshot_id=h.snapshot_id
    join sheet_sync.records r on r.id=m.record_id
    join sheet_sync.client_record_owners o on o.snapshot_id=m.snapshot_id and o.record_id=m.record_id
    join sheet_sync.clients c on c.client_id=o.client_id and c.source_spreadsheet_id=$1
    join sheet_sync.client_accounts a on a.client_id=c.client_id and a.revoked_at is null
    join sheet_sync.verified_accounts v on v.user_id=a.user_id
    left join sheet_sync.record_annotations n on n.record_id=r.id
    where h.source_id=$1 and lower(trim(r.fields->>7))='applied'
    order by m.ordinal desc`,[SHEET_ID])).rows;
  return rows.flatMap(row=>{
    const job=sheetJob(row),application=sheetApplication(job,row.user_id);
    return application?[{...application,jobs:job,profiles:{id:row.user_id,full_name:row.full_name,email:row.email}}]:[];
  });
}
