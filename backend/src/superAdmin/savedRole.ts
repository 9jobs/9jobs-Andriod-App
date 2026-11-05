import { managementDb } from "./store";
import { requireClient, type ManagedPrincipal } from "./permissions";

// Office saved-role writes are client-scoped and atomic; shared jobs/profiles are not edited.
export async function saveOfficeRole(principal: ManagedPrincipal, application: Record<string, any>, job: Record<string, any> | null, id?: unknown) {
  const userId = application.user_id;
  if (principal.management_kind !== "office" || application.is_saved !== true || userId !== application.client_id || String(application.job_id).startsWith("sheet:")) throw Error("Invalid saved role identity");
  await requireClient(userId, "client.view", principal);
  await requireClient(userId, "jobs.manage", principal);
  if (job && job.id !== application.job_id) throw Error("Job identity mismatch");
  const c = await managementDb().connect();
  try {
    await c.query("begin");
    await c.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [userId + ":" + application.job_id]);
    const old = id
      ? (await c.query("select * from public.applications where id=$1 for update", [id])).rows[0]
      : (await c.query("select * from public.applications where user_id=$1 and job_id=$2 order by created_at desc limit 1 for update", [userId, application.job_id])).rows[0];
    if ((id && !old) || (old && (old.user_id !== userId || old.job_id !== application.job_id))) throw Error("Application ownership mismatch");
    await requireClient(userId, old ? "client.records.edit" : "client.records.add", principal);
    if (old) await requireClient(userId, "applications.update", principal);
    const exists = await c.query("select id from public.jobs where id=$1", [application.job_id]);
    if (!exists.rowCount) {
      if (!job) throw Error("Job details required");
      const fields = Object.keys(job);
      if (fields.some(key => !/^[a-z_]+$/.test(key))) throw Error("Invalid job fields");
      await c.query(`insert into public.jobs(${fields.join(",")}) values(${fields.map((_,i)=>"$"+(i+1)).join(",")}) on conflict(id) do nothing`, fields.map(key=>job[key]));
    }
    const fields = Object.keys(application);
    if (fields.some(key => !/^[a-z_]+$/.test(key))) throw Error("Invalid application fields");
    const values = fields.map(key=>application[key]);
    const saved = old
      ? (await c.query(`update public.applications set ${fields.map((key,i)=>key+"=$"+(i+1)).join(",")},updated_at=now() where id=$${values.length+1} returning *`, [...values,old.id])).rows[0]
      : (await c.query(`insert into public.applications(${fields.join(",")}) values(${fields.map((_,i)=>"$"+(i+1)).join(",")}) returning *`, values)).rows[0];
    await c.query("insert into public.saved_jobs(user_id,job_id) values($1,$2) on conflict(user_id,job_id) do nothing", [userId,application.job_id]);
    await c.query("insert into admin_management.audit_events(actor,action,target,before_value,after_value) values($1,'saved_job.save',$2,$3,$4)", [principal.userId,String(saved.id),JSON.stringify(old||null),JSON.stringify(saved)]);
    await c.query("commit");
    return { success:true,application:saved,previousApplication:old||null };
  } catch (error) { await c.query("rollback"); throw error; }
  finally { c.release(); }
}
