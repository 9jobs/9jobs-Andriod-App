import { describe, expect, it, vi } from "vitest";
import { beginManagementVerification, prepareManagementChallenge, verifyManagementChallenge, type ManagementSignIn } from "./managementVerification";
function fixture() {
  const api={prepareSecondFactor:vi.fn().mockResolvedValue({}),prepareFirstFactor:vi.fn().mockResolvedValue({}),attemptSecondFactor:vi.fn().mockResolvedValue({status:"complete",createdSessionId:"fixture-session"}),attemptFirstFactor:vi.fn().mockResolvedValue({status:"complete",createdSessionId:"fixture-session"})};
  return {api,signIn:api as unknown as ManagementSignIn};
}
describe("management login verification",()=>{
 it.each(["needs_second_factor","needs_client_trust"])("prepares the offered email challenge for %s",async status=>{
   const {api,signIn}=fixture();
   const challenge=await beginManagementVerification(signIn,{status,supportedSecondFactors:[{strategy:"email_code",emailAddressId:"fixture-email",safeIdentifier:"t***@example.invalid"}]});
   expect(api.prepareSecondFactor).toHaveBeenCalledWith({strategy:"email_code",emailAddressId:"fixture-email"});
   expect(api.prepareFirstFactor).not.toHaveBeenCalled();
   expect(challenge.level).toBe("second");
   expect(await verifyManagementChallenge(signIn,challenge," 123456 ")).toEqual({status:"complete",createdSessionId:"fixture-session"});
   expect(api.attemptSecondFactor).toHaveBeenCalledWith({strategy:"email_code",code:"123456"});
 });
 it("does not invent a factor or downgrade a second factor into a first factor",async()=>{
   const {api,signIn}=fixture();
   await expect(beginManagementVerification(signIn,{status:"needs_second_factor",supportedSecondFactors:[],supportedFirstFactors:[{strategy:"email_code",emailAddressId:"unused"}]})).rejects.toThrow("verification method");
   expect(api.prepareFirstFactor).not.toHaveBeenCalled();expect(api.attemptSecondFactor).not.toHaveBeenCalled();
 });
 it("supports SMS and resends using the same factor destination",async()=>{
   const {api,signIn}=fixture();const challenge=await beginManagementVerification(signIn,{status:"needs_client_trust",supportedSecondFactors:[{strategy:"phone_code",phoneNumberId:"fixture-phone"}]});
   await prepareManagementChallenge(signIn,challenge);expect(api.prepareSecondFactor).toHaveBeenCalledTimes(2);expect(api.prepareSecondFactor).toHaveBeenLastCalledWith({strategy:"phone_code",phoneNumberId:"fixture-phone"});
 });
 it.each(["totp","backup_code"] as const)("verifies %s without sending an email or SMS",async strategy=>{
   const {api,signIn}=fixture();const challenge=await beginManagementVerification(signIn,{status:"needs_second_factor",supportedSecondFactors:[{strategy}]});
   expect(api.prepareSecondFactor).not.toHaveBeenCalled();await verifyManagementChallenge(signIn,challenge,"fixture-code");expect(api.attemptSecondFactor).toHaveBeenCalledWith({strategy,code:"fixture-code"});
 });
 it("handles first-factor verification at the correct Clerk endpoint",async()=>{
   const {api,signIn}=fixture();const challenge=await beginManagementVerification(signIn,{status:"needs_first_factor",supportedFirstFactors:[{strategy:"email_code",emailAddressId:"fixture-email"}]});
   expect(api.prepareFirstFactor).toHaveBeenCalledWith({strategy:"email_code",emailAddressId:"fixture-email"});await verifyManagementChallenge(signIn,challenge,"123456");expect(api.attemptFirstFactor).toHaveBeenCalledWith({strategy:"email_code",code:"123456"});expect(api.attemptSecondFactor).not.toHaveBeenCalled();
 });
 it("preserves incorrect-code errors and rejects empty codes before contacting Clerk",async()=>{
   const {api,signIn}=fixture();const challenge=await beginManagementVerification(signIn,{status:"needs_second_factor",supportedSecondFactors:[{strategy:"email_code",emailAddressId:"fixture-email"}]});
   await expect(verifyManagementChallenge(signIn,challenge," ")).rejects.toThrow("Enter your verification code");expect(api.attemptSecondFactor).not.toHaveBeenCalled();
   api.attemptSecondFactor.mockRejectedValue(new Error("Incorrect verification code"));await expect(verifyManagementChallenge(signIn,challenge,"000000")).rejects.toThrow("Incorrect verification code");
 });
 it("does not claim a code was sent when preparation fails",async()=>{
   const {api,signIn}=fixture();api.prepareSecondFactor.mockRejectedValue(new Error("Rate limited"));await expect(beginManagementVerification(signIn,{status:"needs_client_trust",supportedSecondFactors:[{strategy:"email_code",emailAddressId:"fixture-email"}]})).rejects.toThrow("Rate limited");
 });
});
