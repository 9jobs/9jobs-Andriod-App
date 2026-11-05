import { afterEach, describe, expect, it, vi } from "vitest";
import { managementRequest, managementBackend } from "./superAdminApi";
afterEach(()=>vi.unstubAllGlobals());
describe("protected management requests",()=>{
 it("never contacts management when no Clerk session exists",async()=>{const fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);await expect(managementRequest(async()=>null,"/admins")).rejects.toThrow("Sign in");expect(fetcher).not.toHaveBeenCalled();});
 it("stops before reading or changing data when owner exchange is denied",async()=>{const fetcher=vi.fn().mockResolvedValue(Response.json({error:"Owner unbound"},{status:403}));vi.stubGlobal("fetch",fetcher);await expect(managementRequest(async()=>"clerk-fixture","/admins","POST",{name:"Employee"})).rejects.toThrow("Owner unbound");expect(fetcher).toHaveBeenCalledTimes(1);});
 it("exchanges verified Clerk identity before each change and sends only backend token to management",async()=>{const fetcher=vi.fn().mockResolvedValueOnce(Response.json({token:"managed-fixture"})).mockResolvedValueOnce(Response.json({saved:true}));vi.stubGlobal("fetch",fetcher);expect(await managementRequest(async()=>"clerk-fixture","/permissions/fixture","PUT",{assignments:[]})).toEqual({saved:true});expect(fetcher.mock.calls[0][0]).toBe(managementBackend+"/api/super-admin/session");expect(fetcher.mock.calls[1][1].headers.Authorization).toBe("Bearer managed-fixture");expect(fetcher.mock.calls[1][1].cache).toBe("no-store");expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({assignments:[]});});
});
