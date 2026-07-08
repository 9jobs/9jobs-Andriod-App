import { Pressable, StyleSheet, Text } from "react-native";
import { colors, radii, typography } from "@/theme";

type PillProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

export function Pill({ label, selected, onPress }: PillProps) {
  const content = (
    <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
  );

  if (!onPress) {
    return <Pressable style={[styles.base, selected && styles.selected]}>{content}</Pressable>;
  }

  return (
    <Pressable onPress={onPress} style={[styles.base, selected && styles.selected]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.chipMuted,
  },
  selected: {
    backgroundColor: colors.accent,
  },
  label: {
    color: colors.text,
    ...typography.label,
  },
  selectedLabel: {
    color: colors.text,
  },
});
