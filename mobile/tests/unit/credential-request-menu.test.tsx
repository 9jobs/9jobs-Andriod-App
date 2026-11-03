import { fireEvent, render } from "@testing-library/react-native";
import { CredentialRequestMenu } from "@/components/chat/CredentialRequestMenu";
jest.mock('react-native-safe-area-context',()=>({useSafeAreaInsets:()=>({top:24,bottom:0,left:0,right:0})}));
jest.mock('@/theme',()=>({colors:{accentDark:'#4E6700',accent:'#C5FF00',surface:'#fff',border:'#eee',text:'#111',mutedText:'#666',panel:'#fafafa'}}));
jest.mock('react-native/Libraries/Components/View/View',()=>{
 const React=require('react');
 return {__esModule:true,default:React.forwardRef((props:any,ref:any)=>{
  React.useImperativeHandle(ref,()=>({measureInWindow:(callback:Function)=>callback(80,600,32,44)}));
  return React.createElement('View',props,props.children);
 })};
});
it('opens the plus popup and requests only the selected platform',async()=>{
 const onRequest=jest.fn();
 const view=await render(<CredentialRequestMenu onRequest={onRequest}/>);
 expect(view.queryByText('Request Credentials')).toBeNull();
 await fireEvent.press(view.getByLabelText('Request credentials'));
 expect(view.getByText('LinkedIn Credentials')).toBeTruthy();
 expect(view.getByText('SEEK Credentials')).toBeTruthy();
 expect(onRequest).not.toHaveBeenCalled();
 await fireEvent.press(view.getByLabelText('Request LinkedIn credentials'));
 expect(onRequest).toHaveBeenCalledWith('LinkedIn');
 expect(view.queryByText('Request Credentials')).toBeNull();
});
it('closes without requesting credentials when the backdrop is tapped',async()=>{
 const onRequest=jest.fn();
 const view=await render(<CredentialRequestMenu onRequest={onRequest}/>);
 await fireEvent.press(view.getByLabelText('Request credentials'));
 await fireEvent.press(view.getByLabelText('Close credential requests',{includeHiddenElements:true}));
 expect(onRequest).not.toHaveBeenCalled();
 expect(view.queryByText('Request Credentials')).toBeNull();
});
