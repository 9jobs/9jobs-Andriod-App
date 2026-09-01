import { Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { BottomSheetCard } from "@/components/ui/BottomSheetCard";
import { Screen } from "@/components/ui/Screen";
import { colors, spacing, typography } from "@/theme";

const sections = [
  {
    title: "1. Introduction",
    paragraphs: [
      "Welcome to 9JOBS. 9 JOBS PTY LTD (\"9JOBS\", \"we\", \"our\", \"us\") is committed to protecting your privacy and handling your personal information responsibly, in accordance with applicable privacy laws, including the Australian Privacy Principles (APPs) under the Privacy Act 1988 (Cth).",
      "This Privacy Policy explains how we collect, use, store, disclose, and protect your personal information when you use our website, mobile application, and job search support services (collectively, the \"Services\"). By accessing or using our Services, you agree to the collection and use of your information in accordance with this Privacy Policy.",
    ],
  },
  {
    title: "2. Information We Collect",
    paragraphs: ["To provide our comprehensive job search services, we collect information across three main categories:"],
    bullets: [
      "A. Information You Provide to Us",
      "Contact Details: Full name, email address, phone number, and residential location.",
      "Professional Background: Employment history, education history, professional qualifications, resume and cover letter content, and salary expectations.",
      "Right to Work: Work rights, visa status, and citizenship information required for job applications.",
      "Account Credentials: Where strictly required and voluntarily provided by you, login credentials for employment platforms (e.g., SEEK, LinkedIn, Jora) to allow us to submit applications and manage communications on your behalf.",
      "B. Information We Collect Automatically (App & Device Data)",
      "Device Information: Device type, operating system version, and unique device identifiers.",
      "Usage Data: App activity, feature usage, session duration, and navigation paths.",
      "Technical Data: IP address, error logs, and performance diagnostics to ensure platform stability.",
      "C. Information from Third Parties",
      "Application Data: Job applications submitted, recruiter communications, interview schedules, and employment outcomes tracked via your connected platforms.",
    ],
  },
  {
    title: "3. How We Use Your Information",
    bullets: [
      "We use your personal data strictly to deliver and improve our Services. Specifically, we use your information to:",
      "Deliver our core job search support, including optimising resumes and LinkedIn profiles.",
      "Submit high-volume job applications on your behalf to relevant employers.",
      "Communicate directly with recruiters, hiring managers, and employers.",
      "Manage your job application inbox and schedule interviews.",
      "Provide customer support and verify your identity.",
      "Analyse app performance, troubleshoot bugs, and improve user experience.",
      "Comply with our legal, regulatory, and reporting obligations.",
    ],
  },
  {
    title: "4. How We Share Your Information",
    paragraphs: ["We do not sell your personal information to third parties. We only share your data under the following circumstances:"],
    bullets: [
      "Potential Employers & Recruiters: We share your professional profile, resume, and contact details with hiring entities as part of the job application process.",
      "Service Providers: We may share data with trusted third-party vendors (e.g., cloud storage, email delivery, app analytics) who assist us in operating our business. These providers are contractually obligated to protect your data.",
      "Legal Requirements: We may disclose your information to legal, regulatory, or law enforcement authorities if required by law, or to protect our rights, safety, and property.",
    ],
  },
  {
    title: "5. Third-Party Account Access & Security",
    bullets: [
      "A core function of our Service may involve accessing your third-party employment accounts (e.g., SEEK, LinkedIn).",
      "Access is used solely for the purpose of executing agreed-upon job search campaigns.",
      "Access is strictly limited to authorised 9JOBS team members.",
      "We strongly recommend users enable Multi-Factor Authentication (MFA) on all third-party platforms where available.",
      "You retain the right to revoke our access or request the deletion of stored credentials at any time.",
    ],
  },
  {
    title: "6. Data Storage and Security",
    paragraphs: [
      "We implement robust administrative, technical, and organisational measures to safeguard your personal information against unauthorised access, alteration, disclosure, loss, or misuse. However, please acknowledge that no digital platform or internet transmission is 100% secure, and use of our Services is at your own risk.",
    ],
  },
  {
    title: "7. Overseas Disclosure",
    paragraphs: [
      "To provide our Services efficiently, some of our operations, service providers, or cloud infrastructure may be located outside of Australia. By using our Services, you consent to the transfer, storage, and processing of your information in overseas jurisdictions. We ensure any international data transfers comply with applicable privacy standards.",
    ],
  },
  {
    title: "8. Your Rights and Data Deletion",
    paragraphs: ["You maintain control over your personal information. You have the right to:"],
    bullets: [
      "Access: Request a copy of the personal data we hold about you.",
      "Correction: Request updates or corrections to inaccurate or incomplete information.",
      "Data Deletion: Request the complete deletion of your account and associated personal data.",
    ],
    footer:
      "To request access, correction, or deletion of your data, please email us at 9jobsapplicationservice@gmail.com. We will process your request promptly and in accordance with legal requirements.",
  },
  {
    title: "9. Data Retention",
    paragraphs: [
      "We retain your personal information only for as long as reasonably necessary to fulfil the purposes outlined in this policy (e.g., providing active job search services), resolve disputes, enforce agreements, and meet legal obligations. Once no longer required, data is securely deleted or permanently de-identified.",
    ],
  },
  {
    title: "10. Cookies and Analytics",
    paragraphs: [
      "Our website and application may use cookies, tracking pixels, and analytics tools to enhance user experience, monitor service quality, and track usage trends. You can manage or disable cookie preferences through your device or browser settings.",
    ],
  },
  {
    title: "11. Children's Privacy",
    paragraphs: [
      "Our Services are intended strictly for individuals aged 18 years and older. We do not knowingly collect personal information from minors. If we become aware that we have inadvertently collected data from a child, we will take immediate steps to delete it.",
    ],
  },
  {
    title: "12. Changes to This Policy",
    paragraphs: [
      "We may update this Privacy Policy periodically to reflect changes in our practices or legal obligations. Updates will be published directly within the 9JOBS application and website, and the revised date will be noted at the top of the policy. Continued use of the Services after updates constitutes acceptance of the revised terms.",
    ],
  },
  {
    title: "13. Contact Us",
    paragraphs: ["If you have any questions, concerns, or requests regarding this Privacy Policy, please contact our team:"],
    bullets: [
      "9 JOBS PTY LTD",
      "ABN: 83 679 842 972",
      "Website: 9jobs.co",
      "Email: 9jobsapplicationservice@gmail.com",
      "Phone: +61 422 279 428",
    ],
  },
];

export default function PrivacyPolicyScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Privacy Policy", headerShown: true }} />
      <Screen>
        <BottomSheetCard style={styles.card}>
          <Text style={styles.title}>Privacy Policy</Text>
          <Text style={styles.updated}>Last Updated: August 26, 2026</Text>

          {sections.map((section) => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.paragraphs?.map((paragraph) => (
                <Text key={paragraph} style={styles.paragraph}>
                  {paragraph}
                </Text>
              ))}
              {section.bullets?.map((bullet) => renderBullet(bullet))}
              {section.footer ? <Text style={styles.paragraph}>{section.footer}</Text> : null}
            </View>
          ))}
        </BottomSheetCard>
      </Screen>
    </>
  );
}

function renderBullet(bullet: string) {
  const groupHeadingMatch = bullet.match(/^([A-Z]\.\s.+)$/);
  const detailHeadingMatch = bullet.match(/^([^:]+:)\s(.+)$/);

  if (groupHeadingMatch) {
    return (
      <View key={bullet} style={styles.bulletRow}>
        <Text style={styles.bulletMarker}>•</Text>
        <Text style={styles.bullet}>
          <Text style={styles.bulletHeading}>{groupHeadingMatch[1]}</Text>
        </Text>
      </View>
    );
  }

  if (detailHeadingMatch) {
    return (
      <View key={bullet} style={styles.bulletRow}>
        <Text style={styles.bulletMarker}>•</Text>
        <Text style={styles.bullet}>
          <Text style={styles.bulletHeading}>{detailHeadingMatch[1]}</Text>{" "}
          {detailHeadingMatch[2]}
        </Text>
      </View>
    );
  }

  return (
    <View key={bullet} style={styles.bulletRow}>
      <Text style={styles.bulletMarker}>•</Text>
      <Text style={styles.bullet}>{bullet}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
  },
  title: {
    ...typography.display,
    fontSize: 38,
    lineHeight: 44,
    color: colors.text,
    letterSpacing: -1.4,
    fontWeight: "800",
  },
  updated: {
    ...typography.title,
    color: colors.mutedText,
    fontSize: 16,
    lineHeight: 22,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.headline,
    color: colors.text,
    fontSize: 22,
    lineHeight: 28,
  },
  paragraph: {
    ...typography.body,
    color: colors.mutedText,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "justify",
  },
  bullet: {
    ...typography.body,
    color: colors.mutedText,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "justify",
    flex: 1,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  bulletMarker: {
    ...typography.body,
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
    width: 12,
    textAlign: "center",
  },
  bulletHeading: {
    color: colors.text,
    fontWeight: "700",
  },
});
