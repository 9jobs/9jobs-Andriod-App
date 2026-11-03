type AdminRecord = {
  email: string;
};

type AdminLookupError = {
  code?: string | null;
  message?: string | null;
};

export const previewAdminCredentials = {
  email: "9jobsapplicationservice@gmail.com",
  password: "", // Never bundle or persist an admin password in frontend code.
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

export async function requestAdminPasswordToken(email: string, password: string, backendUrl: string, fetcher: typeof fetch = fetch): Promise<string | null> {
  if(!email.trim() || !password)return null;
  const response=await fetcher(`${backendUrl}/api/auth/token`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:email.trim(),password,role:"admin"})});
  if(!response.ok)return null;
  const body=await response.json();
  return body?.user?.role==="admin" && typeof body.token==="string" && body.token ? body.token : null;
}

export async function requestClerkAdminToken(userId:string,getToken:()=>Promise<string|null>,backendUrl:string,fetcher:typeof fetch=fetch):Promise<string>{
  const sessionToken=await getToken();
  if(!sessionToken)throw new Error("Your session is unavailable. Please sign in again.");
  const response=await fetcher(`${backendUrl}/api/auth/token`,{
    method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${sessionToken}`},
    body:JSON.stringify({role:"admin"}),signal:AbortSignal.timeout(30000),
  });
  const payload=await response.json().catch(()=>null);
  if(!response.ok)throw new Error("The backend could not verify your admin session. Please retry.");
  if(payload?.user?.role!=="admin" || payload?.user?.userId!==userId || typeof payload?.token!=="string" || !payload.token){
    throw new Error("This signed-in account is not authorized for the Admin Panel.");
  }
  return payload.token;
}
