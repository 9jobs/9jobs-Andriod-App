import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { AppIcon } from "./AppIcon";
import { AnimatedPressable } from "@/components/motion/AnimatedPressable";
import { searchAppSections } from "@/lib/navigation/home-search-destination";
import { colors } from "@/theme";

export function AppSearchResults({ query, onSelect }: { query: string; onSelect?: () => void }) {
  const results = searchAppSections(query);
  if (!results.length) return null;
  return <View style={styles.list}>
    <Text style={styles.heading}>App sections</Text>
    {results.map(result => <AnimatedPressable key={result.id} accessibilityRole="button" accessibilityLabel={`Open ${result.label}`} style={styles.card} onPress={() => {
      router.push(result.destination as never);
      onSelect?.();
    }}>
      <View style={styles.icon}><AppIcon name={result.icon} size={20} /></View>
      <View style={styles.copy}><Text style={styles.label}>{result.label}</Text><Text style={styles.detail}>{result.detail}</Text></View>
      <Text style={styles.arrow}>→</Text>
    </AnimatedPressable>)}
  </View>;
}
const styles = StyleSheet.create({
  list: { gap: 10 }, heading: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: colors.mutedText },
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, minHeight: 68 },
  icon: { width: 32, alignItems: "center" }, copy: { flex: 1, gap: 3 },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 14, lineHeight: 20, color: colors.text },
  detail: { fontFamily: "Inter_400Regular", fontSize: 11, color: colors.mutedText }, arrow: { fontSize: 22, color: colors.text },
});
