import { officePrincipal, requestAccess, resourceAction, resourceOwners, allowedUsers } from "../superAdmin/permissions";
import { createDatabasePool } from "./database";

// Transitional PostgREST request adapter. Queries execute on the server using
// node-postgres; database credentials never reach the browser/mobile client.
const tables = new Set([
  "profiles", "admins", "job_categories", "jobs", "saved_jobs", "applications",
  "interviews", "follow_ups", "recruiter_contacts", "cold_emails", "client_scores",
  "activity_logs", "conversations", "messages", "chat_activity_logs", "services",
  "success_stories", "pricing_plans", "user_subscriptions", "notifications",
  "resume_scores", "system_settings", "candidate_questionnaires", "cover_letters",
  "interview_prep_sessions", "interview_prep_responses", "website_admin_records",
]);
const catalog = new Set(["jobs", "job_categories", "services", "success_stories", "pricing_plans", "system_settings"]);
const owners: Record<string, string> = {
  profiles: "id", saved_jobs: "user_id", applications: "user_id", interviews: "client_id",
  follow_ups: "client_id", recruiter_contacts: "client_id", cold_emails: "client_id",
  client_scores: "client_id", activity_logs: "client_id", conversations: "client_id",
  messages: "conversation_id", user_subscriptions: "user_id", notifications: "user_id",
  resume_scores: "user_id", candidate_questionnaires: "user_id", cover_letters: "user_id",
  interview_prep_sessions: "client_id", interview_prep_responses: "client_id",
};
const clientWrites: Record<string, Set<string>> = {
  profiles: new Set("id full_name email phone_number headline location avatar_url linkedin_url facebook_url instagram_url twitter_url dark_mode biometric push_notifications weekly_goal timezone".split(" ")),
  saved_jobs: new Set(["user_id", "job_id"]),
  applications: new Set("user_id client_id job_id status current_stage is_saved is_active application_date applied_at".split(" ")),
  notifications: new Set(["status"]),
  resume_scores: new Set("user_id score suggestions notes updated_at".split(" ")),
};
let pool: ReturnType<typeof createDatabasePool> | undefined;
function db() {
  if (!pool) {
    pool = createDatabasePool();
    pool.on("error", () => console.error("[Neon] Idle database connection lost"));
  }
  return pool;
}
function ident(value: string) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) throw new Error("Invalid database identifier");
  return `"${value}"`;
}
function split(value: string) {
  const parts: string[] = []; let depth = 0; let quoted = false; let start = 0;
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '"' && value[i - 1] !== "\\") quoted = !quoted;
    if (!quoted) {
      if (value[i] === "(") depth++;
      if (value[i] === ")") depth--;
      if (value[i] === "," && depth === 0) { parts.push(value.slice(start, i)); start = i + 1; }
    }
  }
  return [...parts, value.slice(start)].map(part => part.trim()).filter(Boolean);
}
function value(raw: string): unknown {
  if (raw === "null") return null;
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw.startsWith('"') && raw.endsWith('"')) return JSON.parse(raw);
  return raw;
}
function projection(selection: string, table: string): string {
  return split(selection).map(field => {
    if (field === "*") return "t.*";
    const relation = /^(jobs|profiles)\((.*)\)$/.exec(field);
    if (relation) {
      const related = relation[1];
      const foreignKey = related === "jobs" ? "job_id" : (table === "conversations" ? "client_id" : "user_id");
      const fields = relation[2] === "*" ? "r.*" : split(relation[2]).map(name => `r.${ident(name)}`).join(",");
      return `(select row_to_json(nested) from (select ${fields} from public.${ident(related)} r where r.id=t.${ident(foreignKey)}) nested) as ${ident(related)}`;
    }
    return `t.${ident(field)}`;
  }).join(", ");
}
export type DatabasePrincipal = { userId: string; role: string };

export async function handleNeonRest(request: Request, principal?: DatabasePrincipal): Promise<Response> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const fail = (status: number, code: string, message: string) => new Response(JSON.stringify({ code, message, details: null, hint: null }), { status, headers });
  try {
    const url = new URL(request.url);
    const table = decodeURIComponent(url.pathname.split("/rest/v1/")[1] || "");
    if (!tables.has(table)) return fail(400, "INVALID_TABLE", "Unsupported database resource");
    const method = request.method.toUpperCase();
    if (!["GET", "HEAD", "POST", "PATCH", "DELETE"].includes(method)) return fail(405, "METHOD", "Unsupported method");
    principal ||= requestAccess.getStore();
    const office = officePrincipal(principal);
    const sideEffect=office?.operation==='applications.update' && ['saved_jobs','follow_ups','activity_logs'].includes(table) && !['GET','HEAD'].includes(method);
    const action = office ? sideEffect?'applications.update':resourceAction(table,method) : null;
    if(office && table==='profiles' && method==='DELETE')return fail(403,'FORBIDDEN','Account deletion requires owner management');
    if(office && !action && !(["GET","HEAD"].includes(method) && ["job_categories","services","pricing_plans"].includes(table))) return fail(403,"FORBIDDEN","Owner-only resource");
    let scopedUsers = office && action ? await allowedUsers(action,principal) : null;
    // Existing record/application mutations append activity rows as part of the
    // same capability. They do not require an unrelated add-record grant.
    if(office && table==='activity_logs' && method==='POST')scopedUsers=[...new Set((await Promise.all(['applications.update','client.records.add','client.records.edit'].map(action=>allowedUsers(action as import('../superAdmin/store').Action,principal)))).flatMap(ids=>ids||[]))];
    if(office && action && !['GET','HEAD'].includes(method) && !scopedUsers?.length)return fail(403,'FORBIDDEN','No permission for this action');
    const admin = !principal || principal.role === "admin" || principal.role === "staff";
    const owner = owners[table];
    if (!admin && !catalog.has(table) && !owner) return fail(403, "FORBIDDEN", "Access denied");
    if (!admin && !["GET", "HEAD"].includes(method) && !clientWrites[table]) return fail(403, "FORBIDDEN", "Use the authorized app API for this change");
    const params: unknown[] = [];
    const bind = (item: unknown) => { params.push(item); return `$${params.length}`; };
    function filter(column: string, expression: string): string {
      const key = `t.${ident(column)}`;
      const dot = expression.indexOf(".");
      const operator = expression.slice(0, dot); const raw = expression.slice(dot + 1);
      if (operator === "not") return `not (${filter(column, raw)})`;
      const operators: Record<string, string> = { eq: "=", neq: "<>", gt: ">", gte: ">=", lt: "<", lte: "<=", like: "like", ilike: "ilike" };
      if (operators[operator]) return `${key} ${operators[operator]} ${bind(value(raw))}`;
      if (operator === "is" && ["null", "true", "false"].includes(raw)) return `${key} is ${raw}`;
      if (operator === "in" && raw.startsWith("(") && raw.endsWith(")")) {
        const values = split(raw.slice(1, -1)).map(item => bind(value(item)));
        return values.length ? `${key} in (${values.join(",")})` : "false";
      }
      throw new Error("Unsupported filter operator");
    }
    function group(expression: string, operation: string): string {
      if (!expression.startsWith("(") || !expression.endsWith(")")) throw new Error("Invalid filter group");
      return "(" + split(expression.slice(1, -1)).map(part => {
        if (part.startsWith("and(")) return group(part.slice(3), "and");
        if (part.startsWith("or(")) return group(part.slice(2), "or");
        const dot = part.indexOf(".");
        if (dot < 0) throw new Error("Invalid filter");
        return filter(part.slice(0, dot), part.slice(dot + 1));
      }).join(` ${operation} `) + ")";
    }
    const conditions: string[] = [];
    for (const [key, expression] of url.searchParams) {
      if (["select", "order", "limit", "offset", "on_conflict", "columns"].includes(key)) continue;
      conditions.push(key === "or" || key === "and" ? group(expression, key) : filter(key, expression));
    }
    if (!admin && owner) conditions.push(`t.${ident(owner)}=${bind(principal!.userId)}`);
    if(office && scopedUsers && method!=="POST"){
      const owned=resourceOwners[table];
      if(owned)conditions.push(`t.${ident(owned)}=any(${bind(scopedUsers)}::text[])`);
      else if(table==='jobs')conditions.push(`exists(select 1 from public.applications sa where sa.job_id=t.id and sa.user_id=any(${bind(scopedUsers)}::text[]))`);
      else return fail(403,"FORBIDDEN","No client ownership mapping");
    }
    const where = conditions.length ? " where " + conditions.join(" and ") : "";
    const prefer = request.headers.get("prefer") || "";
    const selection = url.searchParams.get("select") || "*";
    let rows: any[] = []; let count: number | null = null;
    if (method === "GET" || method === "HEAD") {
      let sql = `select ${projection(selection, table)} from public.${ident(table)} t${where}`;
      if (prefer.includes("count=exact")) {
        const result = await db().query(`select count(*)::int as total from public.${ident(table)} t${where}`, params);
        count = result.rows[0].total;
      }
      const orders = split(url.searchParams.get("order") || "");
      if (orders.length) sql += " order by " + orders.map(order => {
        const [column, direction = "asc", nulls] = order.split(".");
        if (!["asc", "desc"].includes(direction) || (nulls && !["nullsfirst", "nullslast"].includes(nulls))) throw new Error("Invalid ordering");
        return `t.${ident(column)} ${direction}${nulls ? nulls === "nullsfirst" ? " nulls first" : " nulls last" : ""}`;
      }).join(",");
      const limit = Number(url.searchParams.get("limit") || 10000);
      const offset = Number(url.searchParams.get("offset") || 0);
      if (!Number.isInteger(limit) || limit < 0 || limit > 10000 || !Number.isInteger(offset) || offset < 0) throw new Error("Invalid pagination");
      sql += ` limit ${bind(limit)} offset ${bind(offset)}`;
      rows = (await db().query(sql, params)).rows;
    } else if (method === "DELETE") {
      if (!conditions.length) throw new Error("Unfiltered delete is not allowed");
      rows = (await db().query(`delete from public.${ident(table)} t${where} returning *`, params)).rows;
    } else {
      const body = await request.json();
      const records = Array.isArray(body) ? body : [body];
      if (!records.length || records.length > 1000 || records.some(row => !row || typeof row !== "object" || Array.isArray(row))) throw new Error("Invalid records");
      if(office){
        const owned=resourceOwners[table];
        const protectedFields=['role','account_status','subscription_plan','subscription_status','assigned_consultant_id','email','created_by_admin_id'];
        for(const row of records){
          if(protectedFields.some(key=>key in row)){
            if(table!=='profiles')return fail(403,'FORBIDDEN','Protected account field');
            const original=(await db().query('select * from public.profiles where id=$1 and id=any($2::text[])',[row.id,scopedUsers])).rows[0];
            if(!original || protectedFields.some(key=>key in row && JSON.stringify(row[key])!==JSON.stringify(original[key])))return fail(403,'FORBIDDEN','Protected account field');
          }
          if(owned && (method==='POST'||owned in row) && !scopedUsers?.includes(String(row[owned])))return fail(403,'FORBIDDEN','Client ownership required');
          if(row.application_id && table!=='applications'){
            const application=(await db().query('select user_id from public.applications where id=$1',[row.application_id])).rows[0];
            if(!application||!scopedUsers?.includes(application.user_id)||row[owned]&&String(row[owned])!==application.user_id)return fail(403,'FORBIDDEN','Application ownership mismatch');
          }
          if(table!=='profiles' && 'client_id' in row && !scopedUsers?.includes(String(row.client_id)))return fail(403,'FORBIDDEN','Client mismatch');
        }
      }
      if (!admin) {
        for (const row of records) {
          if (Object.keys(row).some(key => !clientWrites[table].has(key))) return fail(403, "FORBIDDEN", "Protected database field");
          if (method === "POST" && owner && row[owner] !== principal!.userId) return fail(403, "FORBIDDEN", "Record owner does not match session");
          if (owner && owner in row && row[owner] !== principal!.userId) return fail(403, "FORBIDDEN", "Cannot change record owner");
          if (table === "applications" && "client_id" in row && row.client_id !== principal!.userId) return fail(403, "FORBIDDEN", "Invalid client");
        }
      }
      if (method === "PATCH") {
        if (records.length !== 1 || !conditions.length) throw new Error("Filtered single update required");
        const keys = Object.keys(records[0]);
        if (!keys.length) throw new Error("Empty update");
        const updates = keys.map(key => `${ident(key)}=${bind(records[0][key])}`);
        rows = (await db().query(`update public.${ident(table)} t set ${updates.join(",")}${where} returning *`, params)).rows;
      } else {
        const keys = Array.from(new Set(records.flatMap(row => Object.keys(row))));
        const values = records.map(row => "(" + keys.map(key => key in row ? bind(row[key]) : "default").join(",") + ")");
        let conflict = "";
        if (prefer.includes("resolution=")) {
          const onConflict = split(url.searchParams.get("on_conflict") || "id");
          const updates = keys.filter(key => !onConflict.includes(key)).map(key => `${ident(key)}=excluded.${ident(key)}`);
          conflict = ` on conflict (${onConflict.map(ident).join(",")}) ` + (prefer.includes("ignore-duplicates") || !updates.length ? "do nothing" : `do update set ${updates.join(",")}`);
          if(office && resourceOwners[table] && updates.length && !prefer.includes('ignore-duplicates')) conflict += ` where ${ident(table)}.${ident(resourceOwners[table])}=any(${bind(scopedUsers)}::text[])`;
          // An upsert may only update a record already owned by the caller.
          if (!admin && owner && updates.length && !prefer.includes("ignore-duplicates")) conflict += ` where ${ident(table)}.${ident(owner)}=${bind(principal!.userId)}`;
        }
        rows = (await db().query(`insert into public.${ident(table)} (${keys.map(ident).join(",")}) values ${values.join(",")}${conflict} returning *`, params)).rows;
      }
      count = rows.length;
    }
    const ownedDelete=method==='DELETE'&&owner&&scopedUsers?.includes(String(url.searchParams.get(owner)||'').replace(/^eq\./,''));
    if(office && (method==='PATCH'||method==='DELETE'&&!ownedDelete) && !rows.length)return fail(403,'FORBIDDEN','Target record is not assigned');
    if (count !== null) headers["Content-Range"] = rows.length ? `0-${rows.length - 1}/${count}` : `*/${count}`;
    if (method === "HEAD") return new Response(null, { status: 200, headers });
    if (!["GET", "HEAD"].includes(method) && !prefer.includes("return=representation")) return new Response(null, { status: method === "POST" ? 201 : 204, headers });
    if (request.headers.get("accept")?.includes("vnd.pgrst.object+json")) {
      if (rows.length !== 1) return fail(406, "PGRST116", "JSON object requested, multiple (or no) rows returned");
      return new Response(JSON.stringify(rows[0]), { status: 200, headers });
    }
    return new Response(JSON.stringify(rows), { status: 200, headers });
  } catch (error: any) {
    console.error("[Neon database query]", error.code || "QUERY_ERROR");
    return fail(400, error.code || "QUERY_ERROR", error.message || "Database query failed");
  }
}

export async function closeNeonRestPool(){await pool?.end();pool=undefined;}
