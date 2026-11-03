import { useState } from "react";
import { fireEvent, render, act } from "@testing-library/react-native";
import { Alert, Pressable, Text } from "react-native";
import { useVoiceDraft } from "@/lib/ui/useVoiceDraft";

const mockListeners:Record<string,(event?:any)=>void>={};
const mockRecognition={
 requestPermissionsAsync:jest.fn(),isRecognitionAvailable:()=>true,
 start:jest.fn(),stop:jest.fn(),abort:jest.fn(),
 addListener:jest.fn((event:string,listener:(event?:any)=>void)=>{mockListeners[event]=listener;return{remove:jest.fn()};}),
};
jest.mock('expo-modules-core',()=>({...jest.requireActual('expo-modules-core'),requireOptionalNativeModule:()=>mockRecognition}));
function Harness({active=true}:{active?:boolean}){
 const [draft,setDraft]=useState('');
 const voice=useVoiceDraft(draft,setDraft,active);
 return <><Pressable accessibilityLabel="mic" onPress={()=>void voice.toggle()}><Text>Mic</Text></Pressable><Text testID="draft">{draft}</Text><Text testID="listening">{String(voice.listening)}</Text></>;
}
beforeEach(()=>{jest.clearAllMocks();Object.keys(mockListeners).forEach(key=>delete mockListeners[key]);mockRecognition.requestPermissionsAsync.mockResolvedValue({granted:true});});
it('starts from an empty draft and replaces partial speech with the final transcript',async()=>{
 const view=await render(<Harness />);
 await fireEvent.press(view.getByLabelText('mic'));
 expect(mockRecognition.start).toHaveBeenCalledWith(expect.objectContaining({interimResults:true}));
 await act(()=>{mockListeners.result({results:[{transcript:'Hello'}]});});
 await act(()=>{mockListeners.result({isFinal:true,results:[{transcript:'Hello advisor'}]});mockListeners.end();});
 expect(view.getByTestId('draft').props.children).toBe('Hello advisor');
 expect(view.getByTestId('listening').props.children).toBe('false');
});
it('keeps listening while speech arrives and lets a second mic tap stop capture',async()=>{
 const view=await render(<Harness />);
 await fireEvent.press(view.getByLabelText('mic'));
 await act(()=>{mockListeners.result({results:[{transcript:'My question'}]});});
 expect(view.getByTestId('listening').props.children).toBe('true');
 await fireEvent.press(view.getByLabelText('mic'));
 expect(mockRecognition.stop).toHaveBeenCalledTimes(1);
});
it('does not start recording without microphone permission',async()=>{
 const alert=jest.spyOn(Alert,'alert').mockImplementation(()=>{});
 try{
  mockRecognition.requestPermissionsAsync.mockResolvedValue({granted:false});
  const view=await render(<Harness />);
  await fireEvent.press(view.getByLabelText('mic'));
  expect(mockRecognition.start).not.toHaveBeenCalled();
  expect(alert).toHaveBeenCalledWith('Microphone permission required',expect.any(String));
 }finally{alert.mockRestore();}
});
it('aborts owned capture when the chat loses focus',async()=>{
 const view=await render(<Harness />);
 await fireEvent.press(view.getByLabelText('mic'));
 await view.rerender(<Harness active={false} />);
 expect(mockRecognition.abort).toHaveBeenCalledTimes(1);
 expect(view.getByTestId('listening').props.children).toBe('false');
});
