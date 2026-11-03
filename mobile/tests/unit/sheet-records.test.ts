jest.mock("@/lib/data/backend-auth-token", () => ({ resolveBackendUrl: () => "https://backend.invalid" }));
import { fetchAuthorizedSheetJobs, fetchAuthorizedSheetActivity, registerSheetSession } from "@/lib/data/sheet-records";

describe("private sheet data binding", () => {
  let cleanup: (() => void) | undefined;
  const previousFetch = globalThis.fetch;
  const previousFlag = process.env.EXPO_PUBLIC_SHEET_INTEGRATION_ENABLED;
  beforeEach(() => {
    process.env.EXPO_PUBLIC_SHEET_INTEGRATION_ENABLED = "true";
    globalThis.fetch = jest.fn();
  });
  afterEach(() => { cleanup?.(); cleanup = undefined; globalThis.fetch = previousFetch; });
  afterAll(() => {
    if (previousFlag === undefined) delete process.env.EXPO_PUBLIC_SHEET_INTEGRATION_ENABLED;
    else process.env.EXPO_PUBLIC_SHEET_INTEGRATION_ENABLED = previousFlag;
  });

  it("loads private activity using the registered real-session token interface",async()=>{
    cleanup=registerSheetSession("client-a",async()=>"unit-session");
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({ok:true,json:async()=>({userId:"client-a",jobs:[],applications:[]})});
    expect(await fetchAuthorizedSheetActivity("client-a")).toMatchObject({userId:"client-a"});
    expect((globalThis.fetch as jest.Mock).mock.calls[0][0]).toBe("https://backend.invalid/api/mobile/sheet-records/activity");
    expect((globalThis.fetch as jest.Mock).mock.calls[0][1].headers.Authorization).toBe("Bearer unit-session");
  });
  it("rejects an activity response for another account",async()=>{
    cleanup=registerSheetSession("client-a",async()=>"unit-session");
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({ok:true,json:async()=>({userId:"client-b",jobs:[],applications:[]})});
    await expect(fetchAuthorizedSheetActivity("client-a")).rejects.toThrow("Login changed");
  });

  it("does not fetch without a verified session for the active account", async () => {
    expect(await fetchAuthorizedSheetJobs("client-a")).toEqual([]);
    cleanup = registerSheetSession("client-b", async () => "signed-session");
    expect(await fetchAuthorizedSheetJobs("client-a")).toEqual([]);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("pins all pages to one backend snapshot and uses the existing login token", async () => {
    cleanup = registerSheetSession("client-a", async () => "signed-session");
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({ok:true,json:async()=>({version:"version-a"})})
      .mockResolvedValueOnce({ ok: true, json: async () => ({ jobs: [{id:"one"}],total:2,snapshotId:"snapshot-a" }) })
      .mockResolvedValueOnce({ok:true,json:async()=>({jobs:[{id:"two"}],total:2,snapshotId:"snapshot-a"})});
    expect(await fetchAuthorizedSheetJobs("client-a")).toEqual([{id:"one"},{id:"two"}]);
    expect((globalThis.fetch as jest.Mock).mock.calls[2][0]).toContain("snapshotId=snapshot-a");
    expect((globalThis.fetch as jest.Mock).mock.calls[0][1].headers.Authorization).toBe("Bearer signed-session");
    expect((globalThis.fetch as jest.Mock).mock.calls[0][0]).not.toContain("userId=");
  });

  it("rejects stale-account responses after sign-out instead of caching private data", async () => {
    cleanup = registerSheetSession("client-a", async () => "signed-session");
    (globalThis.fetch as jest.Mock).mockResolvedValue({ok:true,json:async()=>{
      cleanup?.();return{jobs:[{id:"private-record"}],total:1,snapshotId:"snapshot-a"};
    }});
    await expect(fetchAuthorizedSheetJobs("client-a")).rejects.toThrow("Login changed");
  });

  it("rejects a partial or switched snapshot", async () => {
    cleanup = registerSheetSession("client-a", async () => "signed-session");
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({ok:true,json:async()=>({version:"version-a"})})
      .mockResolvedValueOnce({ok:true,json:async()=>({jobs:[{id:"one"}],total:2,snapshotId:"snapshot-a"})})
      .mockResolvedValueOnce({ok:true,json:async()=>({jobs:[{id:"two"}],total:2,snapshotId:"snapshot-b"})});
    await expect(fetchAuthorizedSheetJobs("client-a")).rejects.toThrow("snapshot changed");
  });

  it("checks mapping/version before reusing cached records and clears them after revocation", async () => {
    cleanup = registerSheetSession("client-a", async () => "signed-session");
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({ok:true,json:async()=>({version:"version-a"})})
      .mockResolvedValueOnce({ok:true,json:async()=>({jobs:[{id:"one"}],total:1,snapshotId:"snapshot-a"})})
      .mockResolvedValueOnce({ok:true,json:async()=>({version:"version-a"})})
      .mockResolvedValueOnce({ok:true,json:async()=>({version:null})});
    expect(await fetchAuthorizedSheetJobs("client-a")).toEqual([{id:"one"}]);
    expect(await fetchAuthorizedSheetJobs("client-a")).toEqual([{id:"one"}]);
    expect((globalThis.fetch as jest.Mock).mock.calls).toHaveLength(3);
    expect(await fetchAuthorizedSheetJobs("client-a")).toEqual([]);
  });
});
