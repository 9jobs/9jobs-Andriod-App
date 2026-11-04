import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Socket } from "socket.io";

function verifyBackendToken(token: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("Authentication is not configured");
  const value = jwt.verify(token, secret, {algorithms:["HS256"],issuer:"9jobs-backend",audience:"9jobs-api"}) as jwt.JwtPayload;
  if (value.identity_verified !== true || typeof value.userId !== "string" || !["client","admin","staff"].includes(value.role)) throw new Error("Verified identity required");
  if (value.role === "admin" && value.email !== "9jobsapplicationservice@gmail.com") throw new Error("Approved 9Jobs admin email required");
  return value as {userId:string;role:string;email:string};
}

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: string;
    email: string;
  };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = verifyBackendToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
  }
}

export function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void) {
  const token = socket.handshake.auth?.token;
  if (!token) {
    console.warn(`[Socket Auth] Authentication failed: No token provided for socket ${socket.id}`);
    return next(new Error("Authentication error: Token required"));
  }

  try {
    const decoded = verifyBackendToken(token);
    socket.data = {
      userId: decoded.userId,
      role: decoded.role,
      email: decoded.email,
    };
    console.log(`[Socket Auth] Success: User ${decoded.userId} (${decoded.role}) connected`);
    next();
  } catch (err) {
    console.warn(`[Socket Auth] Authentication failed: Invalid token for socket ${socket.id}`);
    next(new Error("Authentication error: Invalid token"));
  }
}
