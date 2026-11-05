const localDevelopment = process.env.NODE_ENV === "development";
export const superAdminLoginUrl = localDevelopment ? "http://127.0.0.1:3001/super-admin/login" : "/super-admin/login";
const ownerBackend = localDevelopment ? "http://127.0.0.1:3110" : process.env.NEXT_PUBLIC_BACKEND_URL || "";

// This check controls navigation visibility only. Management APIs always verify
// the Clerk identity and protected owner binding again on the server.
export async function hasSuperAdminAccess(getToken:()=>Promise<string|null>, signal?:AbortSignal, fetcher:typeof fetch=fetch) {
  try {
    const token=await getToken();
    if(!token)return false;
    const response=await fetcher(`${ownerBackend}/api/super-admin/session`,{method:"POST",headers:{Authorization:`Bearer ${token}`},cache:"no-store",signal});
    if(!response.ok)return false;
    const result=await response.json();
    return result?.access?.kind==="owner";
  } catch { return false; }
}
