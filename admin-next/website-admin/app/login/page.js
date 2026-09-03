import AuthPanel from "../../components/AuthPanel";

export const metadata = {
  title: "Login | 9 Jobs (9jobs)",
  description: "Sign in to your 9 Jobs (9jobs) account to manage your professional applications.",
  alternates: {
    canonical: "/login",
  },
};

export default function LoginPage() {
  return (
    <main className="site-main">
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">
            <span className="eyebrow-mark">Login</span>
            Continue your job search
          </span>
        </div>
      </section>
      <section className="section section-tight" style={{ paddingTop: 0 }}>
        <AuthPanel mode="login" />
      </section>
    </main>
  );
}
