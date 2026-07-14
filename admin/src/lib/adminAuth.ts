type AdminRecord = {
  email: string;
};

type AdminLookupError = {
  code?: string | null;
  message?: string | null;
};

export const previewAdminCredentials = {
  email: "9jobsapplicationservice@gmail.com",
  password: "Akash@#1234",
} as const;

export function isMissingAdminsTableError(error: AdminLookupError | null | undefined) {
  if (!error) return false;

  return (
    error.code === "PGRST205" &&
    (error.message?.includes("public.admins") || error.message?.includes("'admins'"))
  );
}

export function resolveAdminAccess(email: string, adminList: AdminRecord[] | null | undefined, error?: AdminLookupError | null) {
  if (isMissingAdminsTableError(error)) {
    return {
      isAdmin: true,
      shouldBootstrap: false,
      fallbackReason: "missing-admins-table" as const,
    };
  }

  if (error) {
    throw error;
  }

  if (!adminList || adminList.length === 0) {
    return {
      isAdmin: true,
      shouldBootstrap: true,
      fallbackReason: null,
    };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const isAdmin = adminList.some((admin) => admin.email.toLowerCase() === normalizedEmail);

  return {
    isAdmin,
    shouldBootstrap: false,
    fallbackReason: null,
  };
}

export function validatePreviewAdminLogin(email: string, password: string) {
  return (
    email.trim().toLowerCase() === previewAdminCredentials.email.toLowerCase() &&
    password === previewAdminCredentials.password
  );
}
