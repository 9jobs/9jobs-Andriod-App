import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SmoothScrollView } from "@/components/ui/SmoothScrollView";
import { verticalScrollProps } from "@/lib/ui/scroll";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { emojiCategories, filterEmojiCatalog, type EmojiEntry } from "@/lib/data/emoji-catalog";
import { colors } from "@/theme";

const tones=[{id:"default" as const,label:"Default",icon:"✋"},{id:1,label:"Light",icon:"🏻"},{id:2,label:"Medium light",icon:"🏼"},{id:3,label:"Medium",icon:"🏽"},{id:4,label:"Medium dark",icon:"🏾"},{id:5,label:"Dark",icon:"🏿"},{id:"all" as const,label:"All tones",icon:"🌈"}];
const ROW_HEIGHT=46;
const EmojiCell=memo(function EmojiCell({entry,onPick}:{entry:EmojiEntry;onPick:(entry:EmojiEntry)=>void}){
 return <Pressable accessibilityRole="button" accessibilityLabel={`Insert ${entry.emoji}`} accessibilityHint={entry.label} style={({pressed})=>[styles.cell,pressed&&styles.pressed]} onPress={()=>onPick(entry)}><Text style={styles.emoji}>{entry.emoji}</Text></Pressable>;
});
export function EmojiPicker({visible,onClose,onSelect,userId="local"}:{visible:boolean;onClose:()=>void;onSelect:(emoji:string)=>void;userId?:string}){
 const insets=useSafeAreaInsets(),{height}=useWindowDimensions();
 const [query,setQuery]=useState(""),[category,setCategory]=useState(-2);
 const [tone,setTone]=useState<"default"|"all"|number>("default");
 const [recent,setRecent]=useState<string[]>([]);
 const recentRef=useRef<string[]>([]),list=useRef<FlatList<EmojiEntry>>(null);
 const callbackRef=useRef(onSelect);callbackRef.current=onSelect;
 const storageKey=`ninejobs.emoji-recents:${userId}`;
 const writeQueue=useRef(Promise.resolve());
 useEffect(()=>{
  let active=true;recentRef.current=[];setRecent([]);
  void AsyncStorage.getItem(storageKey).then(value=>{
   if(!active)return;
   try{const parsed=JSON.parse(value||"[]");if(Array.isArray(parsed)){const ids=[...new Set([...recentRef.current,...parsed.filter(id=>typeof id==="string")])].slice(0,36);recentRef.current=ids;setRecent(ids);}}catch{}
  }).catch(()=>{});
  return()=>{active=false;};
 },[storageKey]);
 const results=useMemo(()=>filterEmojiCatalog(query,category,tone,recent),[query,category,tone,recent]);
 const pick=useCallback((entry:EmojiEntry)=>{
  callbackRef.current(entry.emoji);
  const next=[entry.id,...recentRef.current.filter(id=>id!==entry.id)].slice(0,36);
  recentRef.current=next;setRecent(next);
  writeQueue.current=writeQueue.current.catch(()=>{}).then(()=>AsyncStorage.setItem(storageKey,JSON.stringify(next))).catch(()=>{});
 },[storageKey]);
 const resetOffset=()=>list.current?.scrollToOffset({offset:0,animated:false});
 const changeQuery=(value:string)=>{setQuery(value);setCategory(-2);resetOffset();};
 return <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
  <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS==="ios"?"padding":"height"}>
   <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Close emoji picker" onPress={onClose}/>
   <View accessibilityViewIsModal onAccessibilityEscape={onClose} style={[styles.sheet,{paddingBottom:Math.max(insets.bottom,12)}]}>
    <View style={styles.header}><Text style={styles.heading}>Emojis</Text><Pressable accessibilityRole="button" accessibilityLabel="Done selecting emojis" onPress={onClose} style={styles.close}><Text style={styles.done}>Done</Text></Pressable></View>
    <View style={styles.searchRow}>
     <TextInput accessibilityLabel="Search emojis" placeholder="Search emojis: smile, heart, food…" placeholderTextColor={colors.mutedText} value={query} onChangeText={changeQuery} autoCapitalize="none" autoCorrect={false} returnKeyType="search" style={styles.search}/>
     {!!query&&<Pressable accessibilityRole="button" accessibilityLabel="Clear emoji search" style={styles.clear} onPress={()=>changeQuery("")}><Text style={styles.done}>×</Text></Pressable>}
    </View>
    <SmoothScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories} style={styles.categoryScroller} keyboardShouldPersistTaps="always">
     {emojiCategories.map(item=><Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Emoji category ${item.label}`} accessibilityState={{selected:category===item.id}} style={[styles.category,category===item.id&&styles.selected]} onPress={()=>{setCategory(item.id);resetOffset();}}><Text style={styles.categoryEmoji}>{item.icon}</Text><Text style={styles.categoryLabel}>{item.label}</Text></Pressable>)}
    </SmoothScrollView>
    <SmoothScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toneRow} style={styles.toneScroller} keyboardShouldPersistTaps="always">
     {tones.map(item=><Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Skin tone ${item.label}`} accessibilityState={{selected:tone===item.id}} style={[styles.tone,tone===item.id&&styles.selected]} onPress={()=>{setTone(item.id);resetOffset();}}><Text>{item.icon}</Text></Pressable>)}
    </SmoothScrollView>
    <FlatList ref={list} data={results} numColumns={6} keyExtractor={entry=>entry.id} renderItem={({item})=><EmojiCell entry={item} onPick={pick}/>}
     {...verticalScrollProps} style={[styles.scroller,{height:Math.min(276,height*0.3)}]} contentContainerStyle={styles.grid} keyboardShouldPersistTaps="always" keyboardDismissMode="none"
     initialNumToRender={12} maxToRenderPerBatch={12} windowSize={5} getItemLayout={(_data,index)=>({length:ROW_HEIGHT,offset:ROW_HEIGHT*index,index})}
     ListEmptyComponent={<Text style={styles.empty}>{category===-1&&!query?"Your recently used emojis will appear here.":"No matching emojis. Try another word or category."}</Text>}/>
   </View>
  </KeyboardAvoidingView>
 </Modal>;
}
const styles=StyleSheet.create({
 overlay:{flex:1,backgroundColor:"rgba(0,0,0,0.22)",justifyContent:"flex-end"},
 sheet:{backgroundColor:colors.surface,borderTopLeftRadius:18,borderTopRightRadius:18,paddingHorizontal:16,paddingTop:10,maxHeight:"90%"},
 header:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",paddingBottom:4},heading:{fontSize:16,fontFamily:"Inter_600SemiBold",color:colors.text},close:{minHeight:40,paddingHorizontal:12,justifyContent:"center"},done:{fontSize:13,fontFamily:"Inter_600SemiBold",color:colors.accentDark},
 searchRow:{flexDirection:"row",alignItems:"center",backgroundColor:colors.background,borderWidth:1,borderColor:colors.border,borderRadius:10},search:{flex:1,minHeight:40,paddingHorizontal:12,fontSize:12,color:colors.text},clear:{width:38,minHeight:40,alignItems:"center",justifyContent:"center"},
 categoryScroller:{flexGrow:0},categories:{gap:6,paddingVertical:8},category:{minWidth:52,paddingHorizontal:6,paddingVertical:5,borderRadius:8,alignItems:"center"},selected:{backgroundColor:"rgba(197,255,0,0.17)"},categoryEmoji:{fontSize:20,lineHeight:25,color:colors.text},categoryLabel:{fontSize:9,lineHeight:14,color:colors.mutedText},
 toneScroller:{flexGrow:0},toneRow:{gap:8,paddingBottom:7},tone:{width:32,height:30,borderRadius:7,alignItems:"center",justifyContent:"center"},
 scroller:{flexGrow:0,flexShrink:1},grid:{paddingBottom:8},cell:{width:"16.666666%",height:ROW_HEIGHT,alignItems:"center",justifyContent:"center",borderRadius:8},pressed:{backgroundColor:colors.panel},emoji:{fontSize:26,lineHeight:36},empty:{padding:20,color:colors.mutedText,fontSize:12,lineHeight:18,textAlign:"center"},
});
