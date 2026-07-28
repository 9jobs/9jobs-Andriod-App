import { useState } from "react";
import { Alert, Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { AppIcon } from "@/components/ui/AppIcon";
import { Screen } from "@/components/ui/Screen";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import ContactRobotAnimation from "@/components/contact-robot-animation";
import {
  SUPPORT_EMAIL,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_WHATSAPP,
  submitContactForm,
  type ContactFormValues,
  validateContactForm,
} from "@/lib/contact-support";
import { colors, radii, shadows, spacing, typography } from "@/theme";

export default function ContactScreen() {
  const [form, setForm] = useState<ContactFormValues>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  function updateField(field: keyof ContactFormValues, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit() {
    const validationError = validateContactForm(form);
    if (validationError) {
      Alert.alert("Check your details", validationError);
      return;
    }

    try {
      await submitContactForm(form);
      setForm({ name: "", email: "", subject: "", message: "" });
      Alert.alert("Message sent", "Your details have been emailed to the 9Jobs team.");
    } catch (error) {
      Alert.alert(
        "Message not sent",
        error instanceof Error ? error.message : "Could not send your message. Please try again.",
      );
    }
  }

  return (
    <Screen>
      <BackHeader />
      <Text style={styles.title}>Contact Us</Text>
      <Text style={styles.subtitle}>We typically respond within 2 hours</Text>

      <View style={styles.splineFrame}>
        <ContactRobotAnimation />
      </View>

      <View style={styles.contactCardRow}>
        <ContactCard
          icon="mail"
          title="Email"
          subtitle={SUPPORT_EMAIL}
          onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
        />
        <ContactCard
          icon="mail"
          title="WhatsApp"
          subtitle={SUPPORT_PHONE_DISPLAY}
          onPress={() => void Linking.openURL(`https://wa.me/${SUPPORT_PHONE_WHATSAPP}`)}
        />
      </View>

      <Text style={styles.sectionTitle}>Send us a message</Text>

      <View style={styles.formStack}>
        <InputField placeholder="Your name" value={form.name} onChangeText={(value) => updateField("name", value)} />
        <InputField
          placeholder="Email address"
          value={form.email}
          onChangeText={(value) => updateField("email", value)}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <InputField placeholder="Subject" value={form.subject} onChangeText={(value) => updateField("subject", value)} />
        <InputField
          placeholder="How can we help you?"
          value={form.message}
          onChangeText={(value) => updateField("message", value)}
          multiline
        />
      </View>

      <PrimaryButton label="Send Message →" onPress={() => void handleSubmit()} />
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
      <View style={styles.contactTextWrap}>
        <Text style={styles.contactTitle}>{title}</Text>
        <Text
          style={styles.contactSubtitle}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}

function InputField({
  placeholder,
  multiline,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize,
}: {
  placeholder: string;
  multiline?: boolean;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "sentences";
}) {
  return (
    <TextInput
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      placeholderTextColor="#9A9DAA"
      multiline={multiline}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
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
    flexDirection: "column",
    gap: spacing.sm,
  },
  splineFrame: {
    height: 190,
    overflow: "hidden",
    borderRadius: radii.lg,
    backgroundColor: colors.dark,
    ...shadows.card,
  },
  contactCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    minHeight: 82,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
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
  contactTextWrap: {
    flex: 1,
    gap: 4,
  },
  contactSubtitle: {
    ...typography.body,
    color: colors.mutedText,
    fontSize: 14,
    width: "100%",
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
