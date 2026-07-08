import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { AppIcon } from "@/components/ui/AppIcon";
import { Screen } from "@/components/ui/Screen";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { colors, radii, shadows, spacing, typography } from "@/theme";

export default function ContactScreen() {
  return (
    <Screen>
      <BackHeader />
      <Text style={styles.title}>Contact Us</Text>
      <Text style={styles.subtitle}>We typically respond within 2 hours</Text>

      <View style={styles.contactCardRow}>
        <ContactCard
          icon="mail"
          title="Email"
          subtitle="hello@9jobs.ai"
          onPress={() => {}}
        />
        <ContactCard
          icon="mail"
          title="Live Chat"
          subtitle="Online now"
          onPress={() => router.push("/(app)/messages")}
        />
      </View>

      <Text style={styles.sectionTitle}>Send us a message</Text>

      <View style={styles.formStack}>
        <InputField placeholder="Your name" />
        <InputField placeholder="Email address" />
        <InputField placeholder="Subject" />
        <InputField placeholder="How can we help you?" multiline />
      </View>

      <PrimaryButton label="Send Message →" onPress={() => router.push("/(app)/messages")} />
    </Screen>
  );
}

function BackHeader() {
  return (
    <Pressable onPress={() => router.back()} style={styles.backRow}>
      <Text style={styles.backArrow}>←</Text>
      <Text style={styles.backText}>Back</Text>
    </Pressable>
  );
}

function ContactCard({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: "mail";
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.contactCard} onPress={onPress}>
      <View style={styles.contactIconWrap}>
        <AppIcon name={icon} size={18} color={colors.accent} />
      </View>
      <Text style={styles.contactTitle}>{title}</Text>
      <Text style={styles.contactSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}

function InputField({
  placeholder,
  multiline,
}: {
  placeholder: string;
  multiline?: boolean;
}) {
  return (
    <TextInput
      placeholder={placeholder}
      placeholderTextColor="#9A9DAA"
      multiline={multiline}
      textAlignVertical={multiline ? "top" : "center"}
      style={[styles.input, multiline && styles.inputMultiline]}
    />
  );
}

const styles = StyleSheet.create({
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: spacing.sm,
  },
  backArrow: {
    ...typography.title,
    color: colors.text,
  },
  backText: {
    ...typography.title,
    color: colors.text,
    fontSize: 16,
  },
  title: {
    ...typography.display,
    color: colors.text,
    fontSize: 24,
    lineHeight: 30,
  },
  subtitle: {
    ...typography.body,
    color: colors.mutedText,
    marginTop: -8,
  },
  contactCardRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  contactCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    gap: 8,
    ...shadows.card,
  },
  contactIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.dark,
    alignItems: "center",
    justifyContent: "center",
  },
  contactTitle: {
    ...typography.title,
    color: colors.text,
    fontSize: 16,
  },
  contactSubtitle: {
    ...typography.body,
    color: colors.mutedText,
    fontSize: 13,
  },
  sectionTitle: {
    ...typography.title,
    color: colors.text,
    fontSize: 20,
  },
  formStack: {
    gap: spacing.md,
  },
  input: {
    minHeight: 52,
    borderRadius: radii.lg,
    backgroundColor: "#EFEAE0",
    paddingHorizontal: 16,
    color: colors.text,
    fontSize: 16,
  },
  inputMultiline: {
    minHeight: 110,
    paddingTop: 16,
    paddingBottom: 16,
  },
});
