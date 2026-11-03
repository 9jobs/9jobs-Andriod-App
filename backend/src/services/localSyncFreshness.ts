import type { Pool } from "pg";
import { SHEET_ID } from "./sheetStore";
export async function requestLocalSheetRefresh(db:Pool){
 if(!['isolated-e2e','neon-development'].includes(process.env.LOCAL_DATABASE_MODE||'')||process.env.LOCAL_AUTOMATIC_SHEET_SYNC!=="true")return;
 // A constant-time signal, never a Google fetch or import on a login/request.
 await db.query(`update sheet_sync.automation_status set refresh_requested_at=now()
  where source_id=$1 and (last_success_at is null or last_success_at<now()-interval '10 minutes')
  and (refresh_requested_at is null or refresh_requested_at<=completed_request_at)`,[SHEET_ID]);
}
