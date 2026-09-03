import { describe, expect, it } from "vitest";

import {
  isMissingAdminsTableError,
  previewAdminCredentials,
  resolveAdminAccess,
  validatePreviewAdminLogin,
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

describe("validatePreviewAdminLogin", () => {
  it("accepts the fixed 9Jobs preview credentials", () => {
    expect(
      validatePreviewAdminLogin(
        previewAdminCredentials.email,
        previewAdminCredentials.password,
      ),
    ).toBe(true);
  });

  it("rejects a different email", () => {
    expect(
      validatePreviewAdminLogin("admin@example.com", previewAdminCredentials.password),
    ).toBe(false);
  });

  it("rejects a different password", () => {
    expect(
      validatePreviewAdminLogin(previewAdminCredentials.email, "wrong-password"),
    ).toBe(false);
  });
});
