import { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing } from "@/theme";

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}>;

export function Screen({ children, scroll = true, style, contentStyle }: ScreenProps) {
  const body = (
    <View style={[styles.content, contentStyle]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }, style]}>
      {scroll ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          nestedScrollEnabled
          decelerationRate="normal"
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="always"
          contentContainerStyle={styles.scrollInner}
        >
          {body}
        </ScrollView>
      ) : body}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    width: "100%",
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
    gap: spacing.lg,
  },
  scrollInner: {
    paddingBottom: 12,
  },
});
