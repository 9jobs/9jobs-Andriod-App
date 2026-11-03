import { describe, expect, it } from "vitest";

import {
  isMissingAdminsTableError,
  previewAdminCredentials,
  resolveAdminAccess,
  requestAdminPasswordToken,
} from "./adminAuth";

describe("isMissingAdminsTableError", () => {
  it("detects the missing admins table schema error", () => {
    expect(
      isMissingAdminsTableError({
        code: "PGRST205",
        message: "Could not find the table 'public.admins' in the schema cache",
      }),
    ).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(
      isMissingAdminsTableError({
        code: "23505",
        message: "duplicate key value violates unique constraint",
      }),
    ).toBe(false);
  });
});

describe("resolveAdminAccess", () => {
  it("bootstraps the first admin when the list is empty", () => {
    expect(resolveAdminAccess("owner@9jobs.app", [])).toEqual({
      isAdmin: true,
      shouldBootstrap: true,
      fallbackReason: null,
    });
  });

  it("allows any authenticated user through when the admins table is missing", () => {
    expect(
      resolveAdminAccess("viewer@9jobs.app", null, {
        code: "PGRST205",
        message: "Could not find the table 'public.admins' in the schema cache",
      }),
    ).toEqual({
      isAdmin: true,
      shouldBootstrap: false,
      fallbackReason: "missing-admins-table",
    });
  });

  it("matches admins case-insensitively", () => {
    expect(resolveAdminAccess("Admin@9jobs.app", [{ email: "admin@9jobs.app" }])).toEqual({
      isAdmin: true,
      shouldBootstrap: false,
      fallbackReason: null,
    });
  });

  it("rejects authenticated users not present in the admin list", () => {
    expect(resolveAdminAccess("viewer@9jobs.app", [{ email: "admin@9jobs.app" }])).toEqual({
      isAdmin: false,
      shouldBootstrap: false,
      fallbackReason: null,
    });
  });
});

describe("server-only password authentication", () => {
  it("ships no default password", () => {
    expect(previewAdminCredentials.password).toBe("");
  });

  it("requires server confirmation of admin role", async () => {
    const rejected=(async()=>({ok:false})) as unknown as typeof fetch;
    expect(await requestAdminPasswordToken("admin@example.invalid","fixture-password","http://127.0.0.1",rejected)).toBeNull();
    const client=(async()=>({ok:true,json:async()=>({token:"client-token",user:{role:"client"}})})) as unknown as typeof fetch;
    expect(await requestAdminPasswordToken("admin@example.invalid","fixture-password","http://127.0.0.1",client)).toBeNull();
  });

  it("uses the existing endpoint and returns a confirmed admin token", async () => {
    const confirmed=(async(url:unknown,options:RequestInit)=>{expect(String(url)).toBe("http://127.0.0.1/api/auth/token");expect(options.method).toBe("POST");return{ok:true,json:async()=>({token:"admin-token",user:{role:"admin"}})};}) as unknown as typeof fetch;
    expect(await requestAdminPasswordToken("admin@example.invalid","fixture-password","http://127.0.0.1",confirmed)).toBe("admin-token");
  });
});
