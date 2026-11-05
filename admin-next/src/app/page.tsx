"use client";

import dynamic from "next/dynamic";
import {useEffect} from "react";
import {useRouter} from "next/navigation";

// The Vite admin initializes browser storage during its first render.
// Mount it only in the browser to preserve that execution model in Next.js.
const App = dynamic(() => import("../App"), { ssr: false });

export default function AdminPage() {
  const router=useRouter();
  const managed=process.env.NEXT_PUBLIC_MANAGEMENT_MODE==='true';
  useEffect(()=>{if(managed)router.replace('/admin/login');},[managed,router]);
  return managed?<p role="status">Opening Office Admin login…</p>:<App />;
}
