import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from "node:crypto";
import { sheetDb } from "./sheetStore";
import { assertIsolatedSyncTarget } from "./automaticSheetSync";

export const credentialSchema = `
create schema if not exists credential_vault;
revoke all on schema credential_vault from public;
create table if not exists credential_vault.submissions (
 id uuid primary key, user_id text not null, platform text not null check(platform in ('LinkedIn','SEEK')),
 ciphertext text not null, submitted_at timestamptz not null default now(), consent_at timestamptz not null default now(),
 request_id text not null, unique(user_id,request_id)
);
create table if not exists credential_vault.access_audit (
 id uuid primary key, submission_id uuid not null references credential_vault.submissions(id),
 admin_id text not null, accessed_at timestamptz not null default now()
);
revoke all on all tables in schema credential_vault from public;`;
function key(){
 const value=process.env.PLATFORM_CREDENTIALS_KEY||"";
 if(!/^[a-f0-9]{64}$/.test(value))throw new Error("Credential storage unavailable");
 return Buffer.from(value,"hex");
}
export function sealCredentials(value:{email:string;password:string},context:string){
 const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",key(),iv);
 cipher.setAAD(Buffer.from(context));
 const encrypted=Buffer.concat([cipher.update(JSON.stringify(value),"utf8"),cipher.final()]);
 return [iv.toString("base64"),cipher.getAuthTag().toString("base64"),encrypted.toString("base64")].join(".");
}
export function openCredentials(value:string,context:string){
 const [iv,tag,data]=value.split(".").map(part=>Buffer.from(part,"base64"));
 const decipher=createDecipheriv("aes-256-gcm",key(),iv);
 decipher.setAAD(Buffer.from(context));decipher.setAuthTag(tag);
 return JSON.parse(Buffer.concat([decipher.update(data),decipher.final()]).toString("utf8")) as {email:string;password:string};
}
export function credentialDb(){assertIsolatedSyncTarget();key();return sheetDb();}
export async function initializeCredentialVault(){await credentialDb().query(credentialSchema);}
export async function savePlatformCredentials(userId:string,body:any){
 const {platform,email,password,consent,requestId}=body||{};
 if(!["LinkedIn","SEEK"].includes(platform)||typeof email!=="string"||email.length>254||!/^\S+@\S+\.\S+$/.test(email.trim())||typeof password!=="string"||!password.length||password.length>1024||consent!==true||typeof requestId!=="string"||!/^[a-zA-Z0-9-]{8,100}$/.test(requestId))return null;
 const db=credentialDb();
 const verified=await db.query("select 1 from sheet_sync.verified_accounts where user_id=$1",[userId]);
 if(!verified.rowCount)throw new Error("Verified account required");
 const id=randomUUID(),ciphertext=sealCredentials({email:email.trim(),password},`${id}:${userId}:${platform}`);
 const result=await db.query(`insert into credential_vault.submissions(id,user_id,platform,ciphertext,request_id)
 values($1,$2,$3,$4,$5) on conflict(user_id,request_id) do nothing returning id,platform,submitted_at`,[id,userId,platform,ciphertext,requestId]);
 if(result.rowCount)return result.rows[0];
 return (await db.query("select id,platform,submitted_at from credential_vault.submissions where user_id=$1 and request_id=$2",[userId,requestId])).rows[0];
}
