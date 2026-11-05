import { describe,it,expect,vi } from "vitest";
import { hasSuperAdminAccess } from "./superAdminEntry";
describe("owner navigation visibility",()=>{
 it("does not use an email or local flag to authorize an unauthenticated identity",async()=>{const request=vi.fn();expect(await hasSuperAdminAccess(async()=>null,undefined,request)).toBe(false);expect(request).not.toHaveBeenCalled();});
 it.each([403,404,503])("hides management when the verified endpoint returns %s",async status=>{const request=vi.fn().mockResolvedValue(Response.json({error:"denied"},{status}));expect(await hasSuperAdminAccess(async()=>"fixture",undefined,request)).toBe(false);});
 it("requires a server-confirmed owner and hides office access",async()=>{const request=vi.fn().mockResolvedValueOnce(Response.json({access:{kind:"office"}})).mockResolvedValueOnce(Response.json({access:{kind:"owner"}}));expect(await hasSuperAdminAccess(async()=>"fixture",undefined,request)).toBe(false);expect(await hasSuperAdminAccess(async()=>"fixture",undefined,request)).toBe(true);expect(request.mock.calls[0][1].headers.Authorization).toBe("Bearer fixture");expect(request.mock.calls[0][1].cache).toBe("no-store");});
 it("fails closed on network errors",async()=>{const request=vi.fn().mockRejectedValue(Error("offline"));expect(await hasSuperAdminAccess(async()=>"fixture",undefined,request)).toBe(false);});
});
