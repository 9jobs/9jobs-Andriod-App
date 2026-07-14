import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Socket } from "socket.io";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-9jobs-chat-key-2026";

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
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      role: string;
      email: string;
    };
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
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      role: string;
      email: string;
    };
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
