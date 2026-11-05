import { managementDb,transaction } from './store';

export class ClientSourceError extends Error {constructor(public status:number,message:string){super(message);}}

export async function listClientSources() {
  const rows=(await managementDb().query(`select s.client_id,s.candidate_name,s.source_spreadsheet_id,s.source_sheet_id,
    a.user_id,v.email as verified_email,
    case when a.user_id is null or v.user_id is null then 'account_pending' when a.revoked_at is not null then 'revoked' else 'verified' end as verification_status
    from sheet_sync.clients s left join sheet_sync.client_accounts a on a.client_id=s.client_id
    left join sheet_sync.verified_accounts v on v.user_id=a.user_id order by s.candidate_name,s.client_id`)).rows;
  return {sources:rows};
}

export async function linkClientSource(actor:string,managedId:string,canonical:string) {
  if(!/^9JOBS-CL-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(canonical))throw new ClientSourceError(400,'Enter the existing permanent Client ID, starting with 9JOBS-CL-.');
  return transaction(actor,'client.link',managedId,async c=>{
    const client=(await c.query('select * from admin_management.managed_clients where id=$1 for update',[managedId])).rows[0];
    if(!client)throw new ClientSourceError(404,'Client record not found.');
    const source=(await c.query(`select s.client_id,a.user_id,a.revoked_at,v.email from sheet_sync.clients s
      left join sheet_sync.client_accounts a on a.client_id=s.client_id
      left join sheet_sync.verified_accounts v on v.user_id=a.user_id where s.client_id=$1`,[canonical])).rows[0];
    if(!source)throw new ClientSourceError(404,'This Client ID is not available in the local verified source list. Load its existing verified mapping first.');
    if(!source.user_id||!source.email||source.revoked_at)throw new ClientSourceError(409,'This client needs a verified account mapping before it can be linked.');
    if(client.email&&client.email.toLowerCase()!==source.email.toLowerCase())throw new ClientSourceError(409,'The selected Client ID belongs to a different verified email. Choose the correct client.');
    const existing=(await c.query('select * from admin_management.client_identity_links where client_id=$1 or permanent_client_id=$2 or clerk_user_id=$3',[managedId,canonical,source.user_id])).rows;
    if(existing.length) {
      if(existing.length===1&&existing[0].client_id===managedId&&existing[0].permanent_client_id===canonical)return {result:existing[0],notifyAccess:false};
      throw new ClientSourceError(409,'This identity is already linked. Existing Client IDs cannot be reassigned.');
    }
    const row=(await c.query('insert into admin_management.client_identity_links(client_id,permanent_client_id,clerk_user_id,verified_by) values($1,$2,$3,$4) returning *',[managedId,canonical,source.user_id,actor])).rows[0];
    await c.query("update admin_management.managed_clients set source_kind='existing',updated_at=now() where id=$1",[managedId]);
    return {after:row,result:row};
  });
}
