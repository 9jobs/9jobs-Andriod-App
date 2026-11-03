import { StyleSheet, Text, View } from "react-native";
import { AnimatedPressable } from "@/components/motion/AnimatedPressable";
import { FigmaAsset, type FigmaAssetName } from "./FigmaAsset";
import { colors } from "@/theme";

const tones = {
  green: { background: "#F2FAE8", bars: "#D4F3AD" },
  purple: { background: "#F3EEFF", bars: "#D8C6FF" },
  gold: { background: "#FFF6D8", bars: "#FFE18A" },
  lime: { background: "#F0FBD8", bars: "#D1F3A0" },
};

type HomeMetricCardProps = {
  label: string;
  value: number;
  icon: FigmaAssetName;
  tone: keyof typeof tones;
  delta?: number;
  onPress: () => void;
};

export function HomeMetricCard({ label, value, icon, tone, delta, onPress }: HomeMetricCardProps) {
  const palette = tones[tone];
  return (
    <AnimatedPressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} onPress={onPress} style={styles.card} scaleTo={0.98}>
      <View style={styles.badge}>
        {delta === undefined ? <View style={styles.liveDot} /> : <Text style={styles.trend}>↗</Text>}
        <Text style={styles.badgeText}>{delta === undefined ? "Live" : `+${delta}`}</Text>
      </View>
      <View style={styles.main}>
        <View style={[styles.icon, { backgroundColor: palette.background }]}><FigmaAsset name={icon} decorated={false} /></View>
        <View style={styles.copy}>
          <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{value}</Text>
          <Text style={styles.label}>{label}</Text>
        </View>
      </View>
      <View style={styles.footer} accessible={false} pointerEvents="none">
        <View style={styles.bars}>{[7, 11, 15, 20].map((height, index) => <View key={height} style={[styles.bar, { height, backgroundColor: palette.bars, opacity: 0.45 + index * 0.18 }]} />)}</View>
        <View style={styles.arrow}><Text style={styles.arrowText}>→</Text></View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {width:"48%", flexGrow:1, minWidth:0, minHeight:120, padding:12, borderRadius:18, backgroundColor:colors.surface, borderWidth:1, borderColor:colors.border, shadowColor:"#292B20", shadowOpacity:0.035, shadowRadius:12, shadowOffset:{width:0,height:4}, elevation:1},
  badge: {position:"absolute", top:9, right:11, minHeight:20, paddingHorizontal:8, borderRadius:20, backgroundColor:"#F0FBEA", flexDirection:"row", alignItems:"center", gap:4},
  badgeText: {fontFamily:"Inter_500Medium", fontSize:10, lineHeight:14, color:"#16852F"},
  trend: {fontFamily:"Inter_600SemiBold", fontSize:13, lineHeight:16, color:"#16852F"},
  liveDot: {width:5, height:5, borderRadius:3, backgroundColor:"#16852F"},
  main: {flexDirection:"row", alignItems:"center", gap:10, marginTop:17},
  icon: {width:36, height:36, borderRadius:18, alignItems:"center", justifyContent:"center"},
  copy: {flex:1, minWidth:0, gap:1},
  value: {fontFamily:"PlusJakartaSans_700Bold", fontSize:26, lineHeight:32, letterSpacing:-0.7, color:colors.text},
  label: {fontFamily:"Inter_400Regular", fontSize:11, lineHeight:16, color:colors.mutedText},
  footer: {flexDirection:"row", alignItems:"center", justifyContent:"flex-end", gap:12, marginTop:5},
  bars: {height:20, flexDirection:"row", alignItems:"flex-end", gap:3},
  bar: {width:4, borderRadius:3},
  arrow: {width:24, height:24, borderRadius:12, backgroundColor:colors.surfaceMuted, alignItems:"center", justifyContent:"center"},
  arrowText: {fontSize:20, lineHeight:23, color:colors.text},
});
