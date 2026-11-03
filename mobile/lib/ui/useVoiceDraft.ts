import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";

type Recognition = {
  requestPermissionsAsync: () => Promise<{granted:boolean}>;
  isRecognitionAvailable?: () => boolean;
  start: (options:Record<string,unknown>) => void;
  stop: () => void;
  abort: () => void;
  addListener: (event:string, listener:(event:any)=>void) => {remove:()=>void};
};

export function useVoiceDraft(draft:string, setDraft:(text:string)=>void, active:boolean) {
  const [listening,setListening]=useState(false);
  const [recognition]=useState(()=>{
    try { return requireOptionalNativeModule<Recognition>("ExpoSpeechRecognition"); }
    catch { return null; }
  });
  const ownsSession=useRef(false);
  const baseDraft=useRef("");
  const draftRef=useRef(draft);
  draftRef.current=draft;
  const setDraftRef=useRef(setDraft);
  setDraftRef.current=setDraft;

  useEffect(()=>{
    if(!recognition || !active) return;
    const subscriptions=[
      recognition.addListener("start",()=>{if(ownsSession.current)setListening(true);}),
      recognition.addListener("result",event=>{
        if(!ownsSession.current)return;
        const text=event.results?.[0]?.transcript?.trim();
        if(text)setDraftRef.current([baseDraft.current,text].filter(Boolean).join(" ").slice(0,1000));
      }),
      recognition.addListener("end",()=>{if(ownsSession.current){ownsSession.current=false;setListening(false);}}),
      recognition.addListener("error",event=>{
        if(!ownsSession.current)return;
        ownsSession.current=false;setListening(false);
        if(event.error!=="aborted")Alert.alert("Voice input",event.error==="no-speech"?"No speech heard. Tap the mic and speak again.":"Speech recognition is unavailable right now. Please try again.");
      }),
    ];
    return ()=>{
      subscriptions.forEach(subscription=>subscription.remove());
      const wasOwned=ownsSession.current;
      ownsSession.current=false;
      if(wasOwned)recognition.abort();
    };
  },[recognition,active]);

  useEffect(()=>{if(!active)setListening(false);},[active]);

  const toggle=useCallback(async()=>{
    if(!active)return;
    if(!recognition){Alert.alert("Voice input unavailable","This development build needs the speech-recognition module. Rebuild the Android app to enable microphone input.");return;}
    if(ownsSession.current){
      if(listening){
        try{recognition.stop();}catch{ownsSession.current=false;setListening(false);}
      }
      return;
    }
    if(recognition.isRecognitionAvailable && !recognition.isRecognitionAvailable()){
      Alert.alert("Voice input unavailable","Enable a speech-recognition service on your Android device, then try again.");return;
    }
    ownsSession.current=true;
    try{
      const permission=await recognition.requestPermissionsAsync();
      if(!ownsSession.current)return; // The screen may have blurred during the permission prompt.
      if(!permission.granted){ownsSession.current=false;Alert.alert("Microphone permission required","Allow microphone access to dictate a message.");return;}
      baseDraft.current=draftRef.current.trim();
      setListening(true);
      recognition.start({lang:"en-US",interimResults:true,continuous:false,addsPunctuation:true,maxAlternatives:1});
    }catch{
      ownsSession.current=false;setListening(false);
      Alert.alert("Voice input","Could not start speech recognition. Please try again.");
    }
  },[recognition,active,listening]);
  return {listening,toggle};
}
