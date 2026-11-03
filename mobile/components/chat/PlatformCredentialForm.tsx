import { useState, useRef } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSession } from "@/providers/SessionProvider";
import { getBackendAuthToken, resolveBackendUrl } from "@/lib/data/backend-auth-token";
import { colors } from "@/theme";
import { AppIcon } from "@/components/ui/AppIcon";
import Svg, { Path, Rect } from "react-native-svg";

export function PlatformCredentialForm({platform,onClose}:{platform:"LinkedIn"|"SEEK";onClose:()=>void}){
 const {user}=useSession();
 const [email,setEmail]=useState(""),[password,setPassword]=useState("");
 const [showPassword,setShowPassword]=useState(false);
 const [consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const pending=useRef(false);
 const requestId=useRef(`credential-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);
 const close=()=>{if(!pending.current){setPassword("");setEmail("");onClose();}};
 async function submit(){
  if(pending.current)return;
  if(!/^\S+@\S+\.\S+$/.test(email.trim())||!password||!consent){setError("Enter your login email and password, then confirm permission.");return;}
  if(!user){setError("Please sign in again.");return;}
  pending.current=true;setBusy(true);setError("");
  try{
   const backendUrl=resolveBackendUrl(),token=await getBackendAuthToken(user,{backendUrl});
   const response=await fetch(`${backendUrl}/api/mobile/platform-credentials`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({platform,email:email.trim(),password,consent,requestId:requestId.current})});
   if(!response.ok)throw new Error("Could not submit credentials. Please try again.");
   setPassword("");setEmail("");
   Alert.alert("Submitted",`${platform} credentials are available to your authorized administrator.`);
   onClose();
  }catch{setError("Secure submission failed. Please try again later.");}
  finally{pending.current=false;setBusy(false);}
 }
 return <Modal transparent visible animationType="fade" statusBarTranslucent onRequestClose={close}>
  <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS==="ios"?"padding":"height"}>
   <ScrollView contentContainerStyle={styles.center} keyboardShouldPersistTaps="handled">
    <View style={styles.card} accessibilityViewIsModal>
     <View style={styles.header}>
      <View style={styles.platformBadge}><Text style={[styles.platformText,platform==="SEEK"&&{fontSize:10}]}>{platform==="LinkedIn"?"in":"SEEK"}</Text></View>
      <View style={styles.headingWrap}><Text style={styles.heading}>{platform} Credentials</Text><View style={styles.headingAccent}/></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Close credential form" disabled={busy} onPress={close} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable>
     </View>
     <Text style={styles.message}>These credentials are needed to apply for jobs on your behalf.</Text>
     <Text style={styles.label}>{platform} login email</Text>
     <View style={styles.inputRow}>
      <AppIcon name="mail" size={17} color={colors.mutedText} decorated={false}/>
      <TextInput accessibilityLabel={`${platform} login email`} placeholder={`Enter your ${platform} email`} placeholderTextColor={colors.mutedText} style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="off" editable={!busy} maxLength={254}/>
     </View>
     <Text style={styles.label}>Password</Text>
     <View style={styles.inputRow}>
      <Svg width={17} height={17} viewBox="0 0 24 24" fill="none"><Path d="M7 10V7a5 5 0 0 1 10 0v3" stroke={colors.mutedText} strokeWidth={1.6}/><Rect x={4} y={10} width={16} height={12} rx={2} stroke={colors.mutedText} strokeWidth={1.6}/><Path d="M12 15v3" stroke={colors.mutedText} strokeWidth={1.6}/></Svg>
      <TextInput accessibilityLabel={`${platform} password`} placeholder={`Enter your ${platform} password`} placeholderTextColor={colors.mutedText} style={styles.input} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} autoComplete="off" textContentType="none" editable={!busy} maxLength={1024}/>
      <Pressable accessibilityRole="button" accessibilityLabel={showPassword?"Hide password":"Show password"} disabled={busy} onPress={()=>setShowPassword(!showPassword)} style={styles.eye}><AppIcon name={showPassword?"eye-off":"eye"} size={18} color={colors.text} decorated={false}/></Pressable>
     </View>
     <Pressable accessibilityRole="checkbox" accessibilityState={{checked:consent}} disabled={busy} onPress={()=>setConsent(!consent)} style={styles.consent}>
      <View style={[styles.checkbox,consent&&{backgroundColor:colors.accent,borderColor:colors.accent}]}><Text style={styles.check}>{consent?"✓":""}</Text></View>
      <Text style={styles.consentText}>I authorize 9JOBS to use these credentials for my job applications.</Text>
     </Pressable>
     <Text style={styles.note}>Local testing: use test credentials only.</Text>
     {!!error&&<Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
     <Pressable accessibilityRole="button" accessibilityLabel="Submit credentials" disabled={busy} onPress={()=>void submit()} style={styles.submit}>{busy?<ActivityIndicator color={colors.accent}/>:<Text style={styles.submitText}>Submit Credentials</Text>}</Pressable>
    </View>
   </ScrollView>
  </KeyboardAvoidingView>
 </Modal>;
}
const styles=StyleSheet.create({
 backdrop:{flex:1,backgroundColor:"rgba(0,0,0,0.38)"},center:{flexGrow:1,justifyContent:"center",padding:16},
 card:{backgroundColor:colors.surface,padding:16,borderRadius:12,borderWidth:1.5,borderColor:colors.accent,width:"100%",maxWidth:360,alignSelf:"center"},header:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:10},
 platformBadge:{width:32,height:32,borderRadius:6,backgroundColor:colors.accent,alignItems:"center",justifyContent:"center"},platformText:{fontFamily:"Inter_600SemiBold",fontSize:22,color:colors.dark},headingWrap:{flex:1},headingAccent:{height:3,width:72,borderRadius:1,backgroundColor:colors.accent,marginTop:4},
 heading:{fontFamily:"Inter_600SemiBold",fontSize:17,lineHeight:22,color:colors.text},close:{width:32,height:32,alignItems:"center",justifyContent:"center"},closeText:{fontSize:25,color:colors.text},
 message:{fontSize:11,lineHeight:17,fontFamily:"Inter_400Regular",color:colors.mutedText,marginTop:8,marginBottom:12},label:{fontFamily:"Inter_600SemiBold",fontSize:11,color:colors.text,marginBottom:5},
 inputRow:{minHeight:40,borderRadius:6,borderWidth:1,borderColor:colors.accentDark,paddingLeft:10,paddingRight:4,backgroundColor:"rgba(197,255,0,0.05)",marginBottom:12,flexDirection:"row",alignItems:"center",gap:8},input:{flex:1,minHeight:40,paddingVertical:8,paddingHorizontal:0,fontSize:12,color:colors.text},eye:{width:32,minHeight:40,alignItems:"center",justifyContent:"center"},
 consent:{flexDirection:"row",alignItems:"center",gap:9,marginVertical:4},checkbox:{width:18,height:18,borderWidth:1,borderColor:colors.accentDark,borderRadius:3,alignItems:"center",justifyContent:"center"},check:{color:colors.dark,fontSize:13},
 consentText:{flex:1,fontSize:10,lineHeight:16,color:colors.mutedText,fontFamily:"Inter_400Regular"},note:{fontSize:9,color:colors.mutedText,marginTop:4,marginBottom:8},error:{color:"#B42318",fontSize:11,marginBottom:8},
 submit:{minHeight:40,borderRadius:20,backgroundColor:colors.dark,alignItems:"center",justifyContent:"center",marginTop:4},submitText:{fontSize:14,color:colors.accent,fontFamily:"Inter_600SemiBold"},
});
