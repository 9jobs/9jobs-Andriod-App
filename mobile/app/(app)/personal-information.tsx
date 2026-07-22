import { useEffect, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { AppIcon } from "@/components/ui/AppIcon";
import { verticalScrollProps } from "@/lib/ui/scroll";
import { colors, radii, shadows, spacing, typography } from "@/theme";
import { useProfileQuery, useUpdateProfileMutation } from "@/features/jobs/hooks";

export default function PersonalInformationScreen() {
  const { data: profile } = useProfileQuery();
  const { mutateAsync: updateProfile, isPending } = useUpdateProfileMutation();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    location: "",
    headline: "",
    avatarUrl: "",
    linkedinUrl: "",
    facebookUrl: "",
    instagramUrl: "",
    twitterUrl: "",
  });

  useEffect(() => {
    if (!profile) {
      return;
    }

    setForm({
      fullName: profile.fullName || "",
      email: profile.email || "",
      phoneNumber: profile.phoneNumber || "",
      location: profile.location || "",
      headline: profile.headline || "",
      avatarUrl: profile.avatarUrl || "",
      linkedinUrl: profile.linkedinUrl || "",
      facebookUrl: profile.facebookUrl || "",
      instagramUrl: profile.instagramUrl || "",
      twitterUrl: profile.twitterUrl || "",
    });
  }, [profile]);

  async function convertImageUriToDataUrl(uri: string) {
    return await new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onerror = () => reject(new Error("Failed to read selected image."));
      xhr.onload = () => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Failed to convert selected image."));
        reader.onloadend = () => resolve(String(reader.result || ""));
        reader.readAsDataURL(xhr.response);
      };
      xhr.responseType = "blob";
      xhr.open("GET", uri, true);
      xhr.send();
    });
  }

  async function handleChoosePhoto() {
    let ImagePickerModule: any;
    try {
      ImagePickerModule = require("expo-image-picker");
    } catch (error) {
      console.warn("expo-image-picker package not found:", error);
    }

    if (!ImagePickerModule?.requestMediaLibraryPermissionsAsync) {
      Alert.alert("Unavailable", "Choose from device will work after the native image picker build is ready.");
      return;
    }

    try {
      const { status } = await ImagePickerModule.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Please allow photo access to update your profile photo.");
        return;
      }

      const result = await ImagePickerModule.launchImageLibraryAsync({
        mediaTypes: ImagePickerModule.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const portableImageUrl = await convertImageUriToDataUrl(result.assets[0].uri);
        setForm((current) => ({ ...current, avatarUrl: portableImageUrl }));
      }
    } catch (error) {
      console.error("Image pick error:", error);
      Alert.alert("Error", "Failed to choose a profile photo from your device.");
    }
  }

  async function handleSave() {
    if (!form.fullName.trim() || !form.email.trim()) {
      Alert.alert("Missing Fields", "Name and email are required.");
      return;
    }

    try {
      const resolvedAvatarUrl =
        form.avatarUrl.startsWith("file:") || form.avatarUrl.startsWith("content:")
          ? await convertImageUriToDataUrl(form.avatarUrl)
          : form.avatarUrl.trim();

      await updateProfile({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phoneNumber: form.phoneNumber.trim(),
        location: form.location.trim(),
        headline: form.headline.trim(),
        avatarUrl: resolvedAvatarUrl,
        linkedinUrl: form.linkedinUrl.trim(),
        facebookUrl: form.facebookUrl.trim(),
        instagramUrl: form.instagramUrl.trim(),
        twitterUrl: form.twitterUrl.trim(),
      });

      Alert.alert("Saved", "Personal information updated successfully.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Could not update personal information.");
    }
  }

  const inputBackground = colors.background === "#090A08" ? "#2A2B27" : "#EFEAE0";

  return (
    <Screen scroll={false}>
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={styles.backRow}>
          <Text style={styles.backArrow}>←</Text>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Personal Information</Text>
      </View>

      <ScrollView
        {...verticalScrollProps}
        contentContainerStyle={styles.content}
      >
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={styles.sectionTitle}>Profile Photo</Text>
          <View style={styles.photoRow}>
            <Image
              source={{ uri: form.avatarUrl || profile?.avatarUrl || "https://randomuser.me/api/portraits/men/32.jpg" }}
              style={styles.avatar}
            />
            <Pressable style={styles.photoButton} onPress={() => void handleChoosePhoto()}>
              <AppIcon name="profile" size={16} color={colors.dark} />
              <Text style={styles.photoButtonText}>Choose Your Device</Text>
            </Pressable>
          </View>

          <InputField label="Name" value={form.fullName} onChangeText={(value) => setForm((current) => ({ ...current, fullName: value }))} backgroundColor={inputBackground} />
          <InputField label="Email" value={form.email} onChangeText={(value) => setForm((current) => ({ ...current, email: value }))} backgroundColor={inputBackground} keyboardType="email-address" autoCapitalize="none" />
          <InputField label="Phone" value={form.phoneNumber} onChangeText={(value) => setForm((current) => ({ ...current, phoneNumber: value }))} backgroundColor={inputBackground} keyboardType="phone-pad" />
          <InputField label="Address" value={form.location} onChangeText={(value) => setForm((current) => ({ ...current, location: value }))} backgroundColor={inputBackground} />
          <InputField label="Position" value={form.headline} onChangeText={(value) => setForm((current) => ({ ...current, headline: value }))} backgroundColor={inputBackground} />
          <InputField label="LinkedIn URL (Optional)" value={form.linkedinUrl} onChangeText={(value) => setForm((current) => ({ ...current, linkedinUrl: value }))} backgroundColor={inputBackground} keyboardType="default" autoCapitalize="none" />
          <InputField label="Facebook URL (Optional)" value={form.facebookUrl} onChangeText={(value) => setForm((current) => ({ ...current, facebookUrl: value }))} backgroundColor={inputBackground} keyboardType="default" autoCapitalize="none" />
          <InputField label="Instagram URL (Optional)" value={form.instagramUrl} onChangeText={(value) => setForm((current) => ({ ...current, instagramUrl: value }))} backgroundColor={inputBackground} keyboardType="default" autoCapitalize="none" />
          <InputField label="Twitter URL (Optional)" value={form.twitterUrl} onChangeText={(value) => setForm((current) => ({ ...current, twitterUrl: value }))} backgroundColor={inputBackground} keyboardType="default" autoCapitalize="none" />

          <Pressable style={[styles.button, isPending && styles.buttonDisabled]} onPress={() => void handleSave()} disabled={isPending}>
            <Text style={styles.buttonText}>{isPending ? "Saving..." : "Save Personal Information"}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

function InputField({
  label,
  value,
  onChangeText,
  backgroundColor,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  backgroundColor: string;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={`Enter ${label.toLowerCase()}`}
        placeholderTextColor="#9A9DAA"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={[styles.input, { backgroundColor }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
    marginTop: spacing.xs,
  },
  content: {
    paddingBottom: spacing.xl,
  },
  card: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    gap: spacing.md,
    ...shadows.card,
  },
  sectionTitle: {
    ...typography.title,
    color: colors.text,
    fontSize: 18,
  },
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EAEAEA",
  },
  photoButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  photoButtonText: {
    color: colors.dark,
    fontSize: 14,
    fontWeight: "700",
  },
  inputGroup: {
    gap: spacing.xs,
  },
  inputLabel: {
    ...typography.label,
    color: colors.mutedText,
    fontSize: 13,
  },
  input: {
    minHeight: 52,
    borderRadius: radii.lg,
    paddingHorizontal: 16,
    color: colors.text,
    fontSize: 16,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.dark,
    fontSize: 16,
    fontWeight: "800",
  },
});
