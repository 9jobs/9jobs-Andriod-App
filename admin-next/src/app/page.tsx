"use client";

import dynamic from "next/dynamic";

// The Vite admin initializes browser storage during its first render.
// Mount it only in the browser to preserve that execution model in Next.js.
const App = dynamic(() => import("../App"), { ssr: false });

export default function AdminPage() {
  return <App />;
}
