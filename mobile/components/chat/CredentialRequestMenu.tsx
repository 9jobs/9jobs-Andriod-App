import { useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/theme";

export function CredentialRequestMenu({onRequest}:{onRequest:(platform:"LinkedIn"|"SEEK")=>void}) {
  const anchor=useRef<View>(null);
  const [position,setPosition]=useState<{x:number;y:number}|null>(null);
  const [cardHeight,setCardHeight]=useState(170);
  const {width}=useWindowDimensions();
  const insets=useSafeAreaInsets();
  const cardWidth=Math.min(290,width-32);
  const left=position?Math.max(16,Math.min(position.x-28,width-cardWidth-16)):16;
  const close=()=>setPosition(null);
  return <>
    <View ref={anchor} collapsable={false}>
      <Pressable accessibilityRole="button" accessibilityLabel="Request credentials" accessibilityState={{expanded:!!position}}
        style={styles.trigger} onPress={()=>anchor.current?.measureInWindow((x,y)=>setPosition({x,y}))}>
        <View style={styles.plusBox}><Text style={styles.plus}>+</Text></View>
      </Pressable>
    </View>
    <Modal visible={!!position} transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
      <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Close credential requests" onPress={close}/>
      <View accessibilityViewIsModal onAccessibilityEscape={close} onLayout={event=>setCardHeight(event.nativeEvent.layout.height)}
        style={[styles.card,{width:cardWidth,left,top:Math.max(insets.top+8,(position?.y??0)-cardHeight-12)}]}>
        <View style={styles.header}>
          <View style={styles.headerAccent}/>
          <View style={styles.copy}>
            <Text style={styles.heading}>Request Credentials</Text>
          </View>
        </View>
        {(["LinkedIn","SEEK"] as const).map(platform=><Pressable key={platform} accessibilityRole="button"
          accessibilityLabel={`Request ${platform} credentials`} style={({pressed})=>[styles.row,pressed&&styles.pressed]}
          onPress={()=>{close();onRequest(platform);}}>
          <View style={[styles.logo,{backgroundColor:platform==="LinkedIn"?"#0A66C2":"#1B1C1B"}]}>
            <Text style={[styles.logoText,platform==="SEEK"&&{color:colors.accent,fontSize:10}]}>{platform==="LinkedIn"?"in":"SEEK"}</Text>
          </View>
          <View style={styles.copy}>
            <Text style={styles.title}>{platform} Credentials</Text>
          </View>
          <View style={styles.chevronWrap}><Text style={styles.chevron}>›</Text></View>
        </Pressable>)}
        <View style={[styles.pointer,{left:Math.max(20,Math.min(cardWidth-32,(position?.x??0)-left+6))}]}/>
      </View>
    </Modal>
  </>;
}
const styles=StyleSheet.create({
 trigger:{width:32,height:44,alignItems:"center",justifyContent:"center"},
 plusBox:{width:27,height:27,borderRadius:8,borderWidth:1,borderColor:colors.accentDark,alignItems:"center",justifyContent:"center",backgroundColor:colors.surface},
 plus:{fontSize:25,lineHeight:27,color:colors.accentDark,fontFamily:"Inter_400Regular"},
 card:{position:"absolute",backgroundColor:colors.surface,borderRadius:16,borderWidth:1,borderColor:colors.border,padding:10,elevation:5,shadowColor:"#000",shadowOffset:{width:0,height:4},shadowOpacity:0.09,shadowRadius:14},
 header:{flexDirection:"row",alignItems:"center",gap:8,paddingHorizontal:4,paddingTop:2,paddingBottom:8,borderBottomWidth:1,borderBottomColor:colors.border},
 headerAccent:{width:3,height:18,borderRadius:2,backgroundColor:colors.accent},
 heading:{fontFamily:"Inter_600SemiBold",fontSize:14,lineHeight:20,color:colors.text},
 row:{flexDirection:"row",alignItems:"center",paddingHorizontal:9,paddingVertical:8,gap:9,minHeight:48,marginTop:6,borderRadius:10,borderWidth:1,borderColor:colors.border,backgroundColor:colors.background},
 pressed:{backgroundColor:colors.panel},
 logo:{width:28,height:28,borderRadius:7,alignItems:"center",justifyContent:"center"},
 logoText:{fontSize:21,fontFamily:"Inter_600SemiBold",color:"#fff"},
 copy:{flex:1},title:{fontSize:13,lineHeight:18,fontFamily:"Inter_600SemiBold",color:colors.text},
 chevronWrap:{width:24,height:24,borderRadius:12,backgroundColor:colors.surface,alignItems:"center",justifyContent:"center"},
 chevron:{fontSize:22,lineHeight:24,color:colors.text},
 pointer:{position:"absolute",bottom:-7,width:14,height:14,transform:[{rotate:"45deg"}],backgroundColor:colors.surface,borderRightWidth:1,borderBottomWidth:1,borderColor:colors.border},
});
