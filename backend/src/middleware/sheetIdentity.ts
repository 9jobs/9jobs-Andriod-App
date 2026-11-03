import { createPublicKey } from "node:crypto";
import jwt, { JwtPayload } from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

type Principal = { userId: string; role: "admin" | "client" };
export interface SheetRequest extends Request { sheetPrincipal?: Principal }
let keys: { issuer: string; expires: number; value: any[] } | undefined;

export async function verifySheetToken(token: string): Promise<Principal> {
  // No demo, password-preview or exchanged JWT may authorize private sheet data.
  return verifyClerkSession(token);
}

export async function verifyClerkSession(token: string): Promise<Principal> {
  const issuer = process.env.CLERK_ISSUER;
  if (!issuer || !issuer.startsWith("https://") || new URL(issuer).origin !== issuer) throw new Error("Verified Clerk session required");
  const decoded = jwt.decode(token,{ complete:true });
  if (!decoded || decoded.header.alg !== "RS256" || !decoded.header.kid) throw new Error("Invalid Clerk session");
  if (!keys || keys.issuer !== issuer || keys.expires < Date.now() || !keys.value.some(key=>key.kid===decoded.header.kid)) {
    const response = await fetch(`${issuer}/.well-known/jwks.json`,{signal:AbortSignal.timeout(10000),redirect:"error"});
    if (!response.ok) throw new Error("Identity verification unavailable");
    const body = await response.json() as { keys: any[] };
    if (!Array.isArray(body.keys)) throw new Error("Invalid identity keys");
    keys = { issuer,expires:Date.now()+300000,value:body.keys };
  }
  const key = keys.value.find(item=>item.kid===decoded.header.kid && item.kty==="RSA");
  if (!key) throw new Error("Invalid identity key");
  const value = jwt.verify(token,createPublicKey({key,format:"jwk"}),{algorithms:["RS256"],issuer}) as JwtPayload;
  if (!value.exp || !value.sub || !value.sid || value.sts === "pending") throw new Error("Inactive session");
  const parties = (process.env.CLERK_AUTHORIZED_PARTIES || "").split(",").filter(Boolean);
  if (value.azp && !parties.includes(value.azp)) throw new Error("Unauthorized session origin");
  const secret=process.env.CLERK_SECRET_KEY;
  if(!secret || typeof value.sid!=="string")throw new Error("Server session verification is not configured");
  const response=await fetch(`https://api.clerk.com/v1/sessions/${encodeURIComponent(value.sid)}`,{headers:{Authorization:`Bearer ${secret}`},redirect:"error",signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error("Session verification unavailable");
  const session=await response.json() as any;
  if(session.id!==value.sid || session.user_id!==value.sub || session.status!=="active" || !Number.isFinite(session.expire_at) || session.expire_at<=Date.now())throw new Error("Inactive session");
  const admins = (process.env.SHEET_ADMIN_USER_IDS || "").split(",").filter(Boolean);
  return { userId:value.sub,role:admins.includes(value.sub) ? "admin" : "client" };
}

export async function sheetIdentity(req: SheetRequest,res: Response,next: NextFunction) {
  const token = req.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) return res.status(401).json({error:"Verified login required"});
  try { req.sheetPrincipal = await verifySheetToken(token); next(); }
  catch { return res.status(401).json({error:"Verified login required for private sheet records"}); }
}
