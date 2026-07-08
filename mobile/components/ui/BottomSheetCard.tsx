import { PropsWithChildren } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { colors, radii, shadows, spacing } from "@/theme";

type BottomSheetCardProps = PropsWithChildren<{
  style?: ViewStyle;
}>;

export function BottomSheetCard({ children, style }: BottomSheetCardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
});
