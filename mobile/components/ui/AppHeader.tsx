import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { colors } from "@/theme";
import { FigmaAsset } from "./FigmaAsset";
import { usePreviewSyncSelector } from "@/features/mobile-sync/hooks";

export function AppHeader({ title }: { title: string }) {
  const { data: profile } = usePreviewSyncSelector((snapshot) => snapshot.profile, true);
  const { data: notifications } = usePreviewSyncSelector((snapshot) => snapshot.notifications, true);
  const hasUnread = notifications?.some((item) => item.unread) ?? false;

  return (
    <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      <View style={styles.brand}>
        <View style={styles.mark}><Text style={styles.nine}>9</Text></View>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      </View>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Notifications" style={styles.notification} onPress={() => router.push("/(app)/notifications")}>
          <FigmaAsset name="Home-imgContainer16" />
          {hasUnread ? <View style={styles.unreadDot} /> : null}
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Profile" style={styles.profileTarget} onPress={() => router.push("/(app)/profile")}>
          <Image
            source={{ uri: profile?.avatarUrl ?? "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80" }}
            style={styles.profile}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { height:64, paddingHorizontal:20, flexDirection:"row", alignItems:"center", justifyContent:"space-between", borderBottomWidth:0.5 },
  brand: { flexDirection:"row", alignItems:"center", gap:8 },
  mark: { width:36, height:36, borderRadius:12, backgroundColor:"#1B1C1B", alignItems:"center", justifyContent:"center" },
  nine: { fontFamily:"PlusJakartaSans_700Bold", fontSize:20, lineHeight:24, color:"#C5FF00" },
  title: { fontFamily:"PlusJakartaSans_700Bold", fontSize:20, lineHeight:28, letterSpacing:-0.5 },
  actions: { flexDirection:"row", alignItems:"center", gap:4 },
  notification: { width:44, height:44, alignItems:"center", justifyContent:"center" },
  profileTarget: { width:44, height:44, alignItems:"center", justifyContent:"center" },
  profile: { width:34, height:34, borderRadius:17, backgroundColor:colors.surfaceMuted, borderWidth:1, borderColor:colors.border },
  unreadDot: { position:"absolute", top:9, right:11, width:6, height:6, borderRadius:3, backgroundColor:colors.accentDark, borderWidth:1, borderColor:colors.background },
});
