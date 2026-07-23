import { StyleSheet, Text, ViewStyle } from "react-native";
import { colors, radii, typography } from "@/theme";
import { AnimatedPressable } from "@/components/motion/AnimatedPressable";

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "ghost";
  style?: ViewStyle;
  disabled?: boolean;
};

export function PrimaryButton({
  label,
  onPress,
  variant = "primary",
  style,
  disabled,
}: PrimaryButtonProps) {
  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.98}
      opacityTo={0.88}
      duration={120}
      style={[
        styles.base,
        variant === "primary" ? styles.primary : styles.ghost,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.label, variant === "ghost" && styles.ghostLabel]}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  primary: {
    backgroundColor: colors.accent,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.55,
  },
  label: {
    color: colors.text,
    ...typography.title,
    fontSize: 16,
  },
  ghostLabel: {
    color: colors.mutedText,
    fontSize: 14,
  },
});
