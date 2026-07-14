import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { colors, radii, spacing, shadows, typography } from "@/theme";

export default function SecurityScreen() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function handleUpdatePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in all password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New password and confirmation do not match.");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long.");
      return;
    }

    setIsLoading(true);

    // Simulate password change API call
    setTimeout(() => {
      setIsLoading(false);
      Alert.alert(
        "Success",
        "Your password has been changed successfully.",
        [
          {
            text: "OK",
            onPress: () => {
              setCurrentPassword("");
              setNewPassword("");
              setConfirmPassword("");
              router.back();
            },
          },
        ]
      );
    }, 1200);
  }

  return (
    <Screen>
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={styles.backRow}>
          <Text style={styles.backArrow}>←</Text>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Password & Security</Text>
      </View>

      <View style={[styles.formContainer, { backgroundColor: colors.surface }]}>
        <Text style={styles.sectionTitle}>Change Password</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Current Password</Text>
          <TextInput
            placeholder="Enter current password"
            placeholderTextColor="#9A9DAA"
            secureTextEntry
            value={currentPassword}
            onChangeText={setCurrentPassword}
            style={[styles.input, { backgroundColor: colors.background === "#090A08" ? "#2A2B27" : "#EFEAE0" }]}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>New Password</Text>
          <TextInput
            placeholder="Enter new password"
            placeholderTextColor="#9A9DAA"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
            style={[styles.input, { backgroundColor: colors.background === "#090A08" ? "#2A2B27" : "#EFEAE0" }]}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Confirm New Password</Text>
          <TextInput
            placeholder="Confirm new password"
            placeholderTextColor="#9A9DAA"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            style={[styles.input, { backgroundColor: colors.background === "#090A08" ? "#2A2B27" : "#EFEAE0" }]}
          />
        </View>

        <Pressable
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleUpdatePassword}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? "Updating..." : "Update Password"}
          </Text>
        </Pressable>
      </View>
    </Screen>
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
  formContainer: {
    backgroundColor: colors.surface,
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
    marginBottom: spacing.xs,
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
    backgroundColor: "#EFEAE0",
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
    backgroundColor: colors.borderStrong,
    opacity: 0.6,
  },
  buttonText: {
    color: colors.dark,
    fontSize: 16,
    fontWeight: "800",
  },
});
