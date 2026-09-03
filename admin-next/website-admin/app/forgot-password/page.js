import AuthPanel from "../../components/AuthPanel";

export const metadata = {
  title: "Forgot Password | 9 Jobs (9jobs)",
  description: "Reset access to your 9 Jobs (9jobs) account.",
  alternates: {
    canonical: "/forgot-password",
  },
};

export default function ForgotPasswordPage() {
  return (
    <main className="site-main">
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">
            <span className="eyebrow-mark">Reset</span>
            Account recovery
          </span>
        </div>
      </section>
      <section className="section section-tight" style={{ paddingTop: 0 }}>
        <AuthPanel mode="forgot" />
      </section>
    </main>
  );
}
