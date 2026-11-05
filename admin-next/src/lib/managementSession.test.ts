import {describe,it,expect,vi} from "vitest";
import {exchangeManagementSession,saveManagementEntry,managementLandingPath,managementLoginPath,isLockedLogin,isAlreadySignedIn,findActiveLoginSession,isManagementLoginLocation} from "./managementSession";
const account=(kind:string,id="fixture-user")=>({token:"fixture-backend-token",access:{kind},user:{role:"admin",userId:id}});
describe("separate management login flow",()=>{
 it("lands owner on permissions and employee on the existing protected panel",()=>{expect(managementLandingPath("owner")).toBe("/super-admin/permissions");expect(managementLandingPath("office")).toBe("/admin/panel");expect(managementLoginPath("owner")).not.toBe(managementLoginPath("office"));});
 it.each(["owner","office"] as const)("verifies %s with the correct backend endpoint",async kind=>{const request=vi.fn().mockResolvedValue(Response.json(account(kind)));expect((await exchangeManagementSession(kind,"fixture-clerk","fixture-user",request)).access.kind).toBe(kind);expect(request.mock.calls[0][0]).toContain(kind==="owner"?"/api/super-admin/session":"/api/office-admin/session");expect(request.mock.calls[0][1].headers.Authorization).toBe("Bearer fixture-clerk");expect(request.mock.calls[0][1].body).toBeUndefined();});
 it.each([account("owner"),account("office","another-user"),{...account("office"),token:""}])("rejects wrong roles, users or missing tokens",async payload=>{const request=vi.fn().mockResolvedValue(Response.json(payload));await expect(exchangeManagementSession("office","fixture-clerk","fixture-user",request)).rejects.toThrow("requested access");});
 it("never calls management without a real session",async()=>{const request=vi.fn();await expect(exchangeManagementSession("office",null,"fixture-user",request)).rejects.toThrow("sign in");expect(request).not.toHaveBeenCalled();});
 it("rejects unapproved employees and network failures without entering the panel",async()=>{const denied=vi.fn().mockResolvedValue(Response.json({error:"Employee disabled"},{status:403}));await expect(exchangeManagementSession("office","fixture","fixture-user",denied)).rejects.toThrow("Employee disabled");const offline=vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));await expect(exchangeManagementSession("office","fixture","fixture-user",offline)).rejects.toThrow("Login service is unavailable");});
 it("keeps employee authentication mode while clearing stale password-preview access",()=>{const storage={setItem:vi.fn(),removeItem:vi.fn()};saveManagementEntry("office","fixture-token",storage);expect(storage.removeItem).toHaveBeenCalledWith("admin_preview_authenticated");expect(storage.setItem).toHaveBeenCalledWith("9jobs_office_mode","true");expect(storage.setItem).toHaveBeenCalledWith("admin_auth_token","fixture-token");});
 it("clears employee tokens when entering owner management",()=>{const storage={setItem:vi.fn(),removeItem:vi.fn()};saveManagementEntry("owner","fixture-token",storage);expect(storage.setItem).not.toHaveBeenCalled();expect(storage.removeItem).toHaveBeenCalledWith("9jobs_office_mode");expect(storage.removeItem).toHaveBeenCalledWith("admin_auth_token");});
 it("recognizes provider account locks without treating wrong codes as locks",()=>{expect(isLockedLogin({errors:[{code:"form_identifier_locked"}]})).toBe(true);expect(isLockedLogin({errors:[{longMessage:"Your account is locked. Try again later."}]})).toBe(true);expect(isLockedLogin({errors:[{code:"form_code_incorrect"}]})).toBe(false);});
});

describe('existing Clerk session recovery',()=>{
 const employee={id:'employee-session',status:'active',user:{id:'employee-user',primaryEmailAddress:{emailAddress:'employee@example.invalid'}}};
 const owner={id:'owner-session',status:'active',user:{id:'owner-user',primaryEmailAddress:{emailAddress:'owner@example.invalid'}}};
 it('restores a matching signed-in employee even when no current session is selected',()=>{expect(findActiveLoginSession([owner,employee],' Employee@example.invalid ',null)).toBe(employee);});
 it('does not select a different signed-in account',()=>{expect(findActiveLoginSession([owner],'employee@example.invalid','owner-session')).toBeUndefined();});
 it.each(['pending','ended','revoked','expired'])('does not resume a %s session',status=>{expect(findActiveLoginSession([{...employee,status}],'employee@example.invalid')).toBeUndefined();});
 it('selects only the current session when there is no email',()=>{expect(findActiveLoginSession([owner,employee],undefined,'employee-session')).toBe(employee);expect(findActiveLoginSession([employee])).toBeUndefined();});
 it('recognizes already-signed-in errors without treating invalid passwords as signed in',()=>{expect(isAlreadySignedIn({errors:[{code:'session_exists'}]})).toBe(true);expect(isAlreadySignedIn({errors:[{longMessage:"You're already signed in."}]})).toBe(true);expect(isAlreadySignedIn({errors:[{code:'form_password_incorrect'}]})).toBe(false);});
});

describe('login redirect isolation',()=>{
 it('owner responses cannot redirect the employee login or panel',()=>{expect(isManagementLoginLocation('owner','/super-admin/login')).toBe(true);expect(isManagementLoginLocation('owner','/admin/login')).toBe(false);expect(isManagementLoginLocation('owner','/admin/panel')).toBe(false);});
 it('employee responses cannot redirect owner pages',()=>{expect(isManagementLoginLocation('office','/admin/login/')).toBe(true);expect(isManagementLoginLocation('office','/super-admin/login')).toBe(false);expect(isManagementLoginLocation('office','/super-admin/permissions')).toBe(false);});
});
