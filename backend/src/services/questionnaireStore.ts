import { questionnairePool } from "../lib/questionnaireDatabase";
import { ownsDocumentPath } from "./questionnaireDocuments";

export async function readStoredQuestionnaires(userId?: string) {
  const pool = questionnairePool();
  return (await pool.query("select * from candidate_questionnaires" +
      (userId ? " where user_id=$1" : " order by completed_at desc"), userId ? [userId] : [])).rows;
}

export async function saveStoredQuestionnaire(userId: string, email: string, row: Record<string, unknown>) {
  if (row.user_id !== userId || !email || !ownsDocumentPath(userId, String(row.resume_path), "resume") ||
      (row.visa_path && !ownsDocumentPath(userId, String(row.visa_path), "visa"))) throw new Error("Invalid questionnaire ownership");
  // This explicit allowlist prevents unexpected input from becoming SQL identifiers.
  const columns = "user_id full_name contact_number working_rights full_address date_of_birth gender expected_salary preferred_job_locations work_types notice_period preferred_roles resume_path resume_name visa_type visa_path visa_name completed_at updated_at".split(" ");
  const pool = questionnairePool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    for (const [field, kind] of [["resume_path", "resume"], ["visa_path", "visa"]]) {
      if (!row[field]) continue;
      const exists = await client.query("select 1 from questionnaire_documents where user_id=$1 and storage_path=$2", [userId, row[field]]);
      if (!exists.rowCount || !ownsDocumentPath(userId, String(row[field]), kind)) throw new Error("Document must be uploaded first");
    }
    await client.query(`insert into profiles(id,email,full_name,phone_number,location,headline)
      values($1,$2,$3,$4,$5,$6) on conflict(id) do update set
      full_name=excluded.full_name,phone_number=excluded.phone_number,
      location=excluded.location,headline=excluded.headline,updated_at=now()`,
      [userId,email,row.full_name,row.contact_number,row.full_address,(row.preferred_roles as string[]).join(", ")]);
    const result = await client.query(`insert into candidate_questionnaires(${columns.join(",")})
      values(${columns.map((_,i)=>"$"+(i+1)).join(",")}) on conflict(user_id) do update set
      ${columns.filter(c=>c!=="user_id").map(c=>`${c}=excluded.${c}`).join(",")} returning *`, columns.map(c=>row[c]));
    await client.query("commit");
    return result.rows[0];
  } catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}
