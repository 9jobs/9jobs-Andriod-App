import Link from "next/link";
import { Mail, Globe, ShieldCheck, Eye, Lock, FileCheck2, UserCheck } from "lucide-react";
import styles from "./page.module.css";

export const metadata = {
  title: "Privacy Policy | 9 Jobs (9jobs)",
  description: "Learn about how 9 Jobs (9jobs) Application Services collects, uses, and protects your information.",
  alternates: {
    canonical: "/privacy-policy",
  },
};

export default function PrivacyPolicy() {
  return (
    <main className="site-main fj-page">
      <section className="fj-page-hero">
        <div className="fj-container">
          <span className="fj-announcement">
            <span>Legal</span> Privacy Policy
          </span>
          <h1>
            Privacy <span className="heading-mark">Policy</span>
          </h1>
          <p>Last Updated: May 2026</p>
        </div>
      </section>

      <section className="fj-section fj-section--tight">
        <div className={styles.container}>
          <div className={styles.contentWrapper}>
            <div className={styles.section}>
              <h2>
                <Eye size={24} /> Information We Collect
              </h2>
              <p>
                9Jobs Application Services collects information submitted through our website, social media lead forms, email, phone calls, WhatsApp, and other communication channels for the purpose of providing job search support, career guidance, recruitment-related services, and customer support.
              </p>
              <p>
                The information we collect may include your name, email address, phone number, resume, visa status, employment history, and other information you choose to provide.
              </p>
            </div>

            <div className={styles.section}>
              <h2>
                <FileCheck2 size={24} /> How We Use Your Information
              </h2>
              <p>We use this information to:</p>
              <ul className={styles.list}>
                <li className={styles.listItem}>
                  <span className={styles.bullet}>•</span>
                  <span>Contact you regarding our services</span>
                </li>
                <li className={styles.listItem}>
                  <span className={styles.bullet}>•</span>
                  <span>Provide job search and career support</span>
                </li>
                <li className={styles.listItem}>
                  <span className={styles.bullet}>•</span>
                  <span>Respond to enquiries and requests</span>
                </li>
                <li className={styles.listItem}>
                  <span className={styles.bullet}>•</span>
                  <span>Improve our services and customer experience</span>
                </li>
                <li className={styles.listItem}>
                  <span className={styles.bullet}>•</span>
                  <span>Send relevant updates and communications</span>
                </li>
              </ul>
            </div>

            <div className={styles.section}>
              <h2>
                <ShieldCheck size={24} /> Information Sharing
              </h2>
              <p>
                9Jobs Application Services does not sell, rent, or trade your personal information to third parties. Information may only be shared where necessary to provide our services, comply with legal obligations, or protect our rights and interests.
              </p>
            </div>

            <div className={styles.section}>
              <h2>
                <UserCheck size={24} /> Consent and Communication
              </h2>
              <p>
                By submitting your information, you consent to being contacted by the 9Jobs team via phone, email, WhatsApp, SMS, or other communication channels regarding our services.
              </p>
            </div>

            <div className={styles.section}>
              <h2>
                <Lock size={24} /> Data Protection and Your Rights
              </h2>
              <p>
                We take reasonable steps to protect your personal information from unauthorised access, misuse, or disclosure.
              </p>
              <p>
                You may request access to, correction of, or deletion of your personal information at any time by contacting us.
              </p>
            </div>

            <div className={styles.section}>
              <h2>Contact Information</h2>
              <div className={styles.contactGrid}>
                <a href="mailto:9jobsapplicationservice@gmail.com" className={styles.contactCard}>
                  <div className={styles.contactIcon}>
                    <Mail size={20} />
                  </div>
                  <div className={styles.contactInfo}>
                    <span className={styles.contactLabel}>Email</span>
                    <span className={styles.contactValue}>9jobsapplicationservice@gmail.com</span>
                  </div>
                </a>

                <a href="https://9jobs.co" target="_blank" rel="noopener noreferrer" className={styles.contactCard}>
                  <div className={styles.contactIcon}>
                    <Globe size={20} />
                  </div>
                  <div className={styles.contactInfo}>
                    <span className={styles.contactLabel}>Website</span>
                    <span className={styles.contactValue}>https://9jobs.co</span>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
