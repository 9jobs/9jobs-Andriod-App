import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { enabled, managementDb } from "../superAdmin/store";
import { Socket } from "socket.io";
import { verifyManagedClaims } from "../superAdmin/identity";
import { requestAccess, authorizeOfficeRequest, type ManagedPrincipal } from "../superAdmin/permissions";

export async function verifyBackendToken(token: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("Authentication is not configured");
  const value = jwt.verify(token, secret, {algorithms:["HS256"],issuer:"9jobs-backend",audience:"9jobs-api"}) as jwt.JwtPayload;
  if (value.identity_verified !== true || typeof value.userId !== "string" || !["client","admin","staff"].includes(value.role)) throw new Error("Verified identity required");
  if (value.management_kind) await verifyManagedClaims(value);
  if (enabled() && !value.management_kind && ["admin","staff"].includes(value.role) && (await managementDb().query("select 1 from admin_management.office_admins where clerk_user_id=$1",[value.userId])).rowCount) throw new Error("Office Admin must use a managed session");
  if (!value.management_kind && value.role === "admin" && value.email !== "9jobsapplicationservice@gmail.com") throw new Error("Approved 9Jobs admin email required");
  return value as ManagedPrincipal & {email:string};
}

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: string;
    email: string;
    management_kind?: "owner" | "office";
  };
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }

  const token = authHeader.split(" ")[1];
  let decoded: Awaited<ReturnType<typeof verifyBackendToken>>;
  try {
    decoded = await verifyBackendToken(token);
  } catch {
    return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
  }
  req.user = decoded;
  if(decoded.management_kind==="office"){
    try { await authorizeOfficeRequest(req,decoded); }
    catch { return res.status(403).json({ error:"Access restricted: your Office Admin permissions do not allow this action. Contact your Super Admin.",code:"OFFICE_ACCESS_DENIED" }); }
  }
  const operation=decoded.management_kind==='office' && req.method==='PATCH' && /^\/api\/admin\/tracker\/applications\/[^/]+$/.test(req.originalUrl.split('?')[0]) ? 'applications.update' as const : undefined;
  requestAccess.run({...decoded,operation},()=>next());
}

export async function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void) {
  const token = socket.handshake.auth?.token;
  if (!token) {
    console.warn(`[Socket Auth] Authentication failed: No token provided for socket ${socket.id}`);
    return next(new Error("Authentication error: Token required"));
  }

  try {
    const decoded = await verifyBackendToken(token);
    socket.data = {
      userId: decoded.userId,
      role: decoded.role,
      email: decoded.email,
      management_kind: decoded.management_kind,
    };
    console.log(`[Socket Auth] Success: User ${decoded.userId} (${decoded.role}) connected`);
    next();
  } catch (err) {
    console.warn(`[Socket Auth] Authentication failed: Invalid token for socket ${socket.id}`);
    next(new Error("Authentication error: Invalid token"));
  }
}
