import AuthPanel from "../../components/AuthPanel";

export const metadata = {
  title: "Register | 9 Jobs (9jobs)",
  description: "Create a 9 Jobs (9jobs) account to manage your professional applications and resume services.",
  alternates: {
    canonical: "/register",
  },
};

export default function RegisterPage() {
  return (
    <main className="site-main">
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">
            <span className="eyebrow-mark">Start</span>
            Try 9Jobs for free
          </span>
        </div>
      </section>
      <section className="section section-tight" style={{ paddingTop: 0 }}>
        <AuthPanel mode="register" />
      </section>
    </main>
  );
}
