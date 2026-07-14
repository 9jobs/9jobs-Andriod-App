import { useState } from "react";
import {
  KeyboardTypeOptions,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from "react-native";
import { colors, spacing, typography } from "@/theme";
import { AppIcon } from "./AppIcon";

type TextFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  error?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps["autoCapitalize"];
  autoComplete?: TextInputProps["autoComplete"];
  textContentType?: TextInputProps["textContentType"];
};

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  error,
  keyboardType,
  autoCapitalize = "none",
  autoComplete,
  textContentType,
}: TextFieldProps) {
  const [isSecure, setIsSecure] = useState(secureTextEntry);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputContainer, error && styles.inputError]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedText}
          secureTextEntry={isSecure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          textContentType={textContentType}
          cursorColor={colors.text}
          selectionColor={colors.accentDark}
          underlineColorAndroid="transparent"
          autoCorrect={false}
          spellCheck={false}
          style={styles.input}
        />
        {secureTextEntry ? (
          <TouchableOpacity
            onPress={() => setIsSecure(!isSecure)}
            style={styles.iconButton}
            activeOpacity={0.7}
          >
            <AppIcon
              name={isSecure ? "eye-off" : "eye"}
              color={colors.mutedText}
              size={20}
            />
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  label: {
    ...typography.label,
    color: colors.text,
  },
  inputContainer: {
    minHeight: 54,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: spacing.md,
  },
  input: {
    flex: 1,
    minHeight: 54,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: typography.body.fontSize,
    fontWeight: typography.body.fontWeight,
  },
  iconButton: {
    padding: spacing.xs,
    justifyContent: "center",
    alignItems: "center",
  },
  inputError: {
    borderColor: "#EF4444",
  },
  error: {
    color: "#DC2626",
    ...typography.label,
  },
});
