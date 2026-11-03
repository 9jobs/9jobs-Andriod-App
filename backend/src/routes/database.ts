import { Router } from "express";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";
import { handleNeonRest } from "../lib/neonRest";
import { isNeonDatabase } from "../lib/database";
import { hydrateVerifiedProfiles } from "../services/verifiedAccount";
import { sheetDb, sheetEnabled } from "../services/sheetStore";

const router = Router();
router.post("/database/query", authMiddleware, async (req: AuthenticatedRequest, res) => {
  if (!isNeonDatabase()) return res.status(503).json({ message: "Neon database is not configured" });
  const { table, query = "", method = "GET", body, accept, prefer } = req.body || {};
  const records = Array.isArray(body) ? body : body ? [body] : [];
  if (!["GET", "HEAD"].includes(method) && records.some((row: any) => String(row?.id || "").startsWith("sheet:") || String(row?.job_id || "").startsWith("sheet:") || row?.source === "duplicate-sheet")) {
    return res.status(403).json({ message: "Imported sheet records are read-only; source updates are synchronized by the backend" });
  }
  if (typeof table !== "string" || typeof query !== "string" || query.length > 16000 || !["GET", "HEAD", "POST", "PATCH", "DELETE"].includes(method)) return res.status(400).json({ message: "Invalid database request" });
  const response = await handleNeonRest(new Request(`http://database.internal/rest/v1/${encodeURIComponent(table)}?${query}`, {
    method,
    headers: { "content-type": "application/json", accept: String(accept || "application/json"), prefer: String(prefer || "") },
    ...(!["GET", "HEAD"].includes(method) && body !== undefined ? { body: JSON.stringify(body) } : {}),
  }), req.user);
  let result = await response.text();
  if(response.ok && table==='profiles' && method==='GET' && sheetEnabled()) {
    try {result=JSON.stringify(await hydrateVerifiedProfiles(JSON.parse(result),sheetDb()));}
    catch {return res.status(503).json({message:"Verified account information is temporarily unavailable"});}
  }
  res.status(response.status);
  for (const header of ["content-type", "content-range"]) {
    const value = response.headers.get(header);
    if (value) res.setHeader(header, value);
  }
  return res.send(result);
});
export default router;
