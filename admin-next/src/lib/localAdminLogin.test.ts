import {describe,it,expect,vi} from "vitest";
import {resolveLocalAdminLoginRedirect} from "./localAdminLogin";
const healthy=()=>Response.json({status:"healthy"});
describe("local login backend recovery",()=>{
 it("preserves the existing login when its local backend is healthy",async()=>{const request=vi.fn().mockResolvedValue(healthy());expect(await resolveLocalAdminLoginRedirect("http://127.0.0.1:3100",false,request)).toBeNull();expect(request).toHaveBeenCalledTimes(1);});
 it("opens protected Super Admin login when the old backend is down and management is available",async()=>{const request=vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValueOnce(healthy());expect(await resolveLocalAdminLoginRedirect("http://127.0.0.1:3100",false,request)).toBe("http://127.0.0.1:3001/super-admin/login");expect(request.mock.calls.every(call=>!call[1].body&&!call[1].headers)).toBe(true);});
 it("does not mistake a frontend HTML response for backend readiness",async()=>{const request=vi.fn().mockResolvedValueOnce(new Response("<html>login</html>")).mockResolvedValueOnce(healthy());expect(await resolveLocalAdminLoginRedirect("http://localhost:3000",false,request)).toContain("/super-admin/login");});
 it("keeps employees on the separate Office Admin login",async()=>{const request=vi.fn().mockResolvedValue(healthy());expect(await resolveLocalAdminLoginRedirect("http://127.0.0.1:3100",true,request)).toBe("http://127.0.0.1:3001/admin/login");});
 it("uses the proper Clerk login rather than the old password form on the dedicated stack",async()=>{const request=vi.fn().mockResolvedValue(healthy());expect(await resolveLocalAdminLoginRedirect("http://127.0.0.1:3110",false,request)).toContain("/super-admin/login");});
 it("shows a clear local startup error when both backends are unavailable",async()=>{const request=vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));await expect(resolveLocalAdminLoginRedirect("http://localhost:3100",false,request)).rejects.toThrow("start-super-admin-local.cjs");});
 it("never redirects or probes production backend URLs",async()=>{const request=vi.fn();expect(await resolveLocalAdminLoginRedirect("https://example.invalid",false,request)).toBeNull();expect(request).not.toHaveBeenCalled();});
});
