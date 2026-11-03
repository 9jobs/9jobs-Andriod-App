import { fireEvent, render } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { PlatformCredentialForm } from '@/components/chat/PlatformCredentialForm';
jest.mock('@/providers/SessionProvider',()=>({useSession:()=>({user:{id:'verified-fixture',email:'account@example.invalid',fullName:'Test Client'}})}));
jest.mock('@/lib/data/backend-auth-token',()=>({resolveBackendUrl:()=> 'http://127.0.0.1:3100',getBackendAuthToken:async()=> 'fixture-test-token'}));
jest.mock('@/theme',()=>({colors:{surface:'#fff',text:'#111',mutedText:'#666',background:'#fff',border:'#ddd',accent:'#C5FF00',dark:'#1B1C1B'}}));
it('requires consent, masks password, and submits only to the authenticated backend',async()=>{
 const old=globalThis.fetch;
 const onClose=jest.fn(),alert=jest.spyOn(Alert,'alert').mockImplementation(()=>{});
 const request=jest.fn().mockResolvedValue({ok:true,status:201});globalThis.fetch=request;
 try{
  const view=await render(<PlatformCredentialForm platform="LinkedIn" onClose={onClose}/>);
  expect(view.getByLabelText('LinkedIn password').props.secureTextEntry).toBe(true);
  await fireEvent.press(view.getByLabelText('Show password'));
  expect(view.getByLabelText('LinkedIn password').props.secureTextEntry).toBe(false);
  await fireEvent.press(view.getByLabelText('Hide password'));
  expect(view.getByLabelText('LinkedIn password').props.secureTextEntry).toBe(true);
  expect(view.getByText('These credentials are needed to apply for jobs on your behalf.')).toBeTruthy();
  await fireEvent.changeText(view.getByLabelText('LinkedIn login email'),'platform@example.invalid');
  await fireEvent.changeText(view.getByLabelText('LinkedIn password'),'dummy-test-only');
  await fireEvent.press(view.getByLabelText('Submit credentials'));
  expect(request).not.toHaveBeenCalled();
  await fireEvent.press(view.getByRole('checkbox'));
  await fireEvent.press(view.getByLabelText('Submit credentials'));
  expect(request).toHaveBeenCalledTimes(1);
  const [url,init]=request.mock.calls[0];expect(url).toBe('http://127.0.0.1:3100/api/mobile/platform-credentials');
  expect(init.headers.Authorization).toBe('Bearer fixture-test-token');
  const body=JSON.parse(init.body);expect(body.platform).toBe('LinkedIn');expect(body.consent).toBe(true);expect(body.userId).toBeUndefined();
  expect(onClose).toHaveBeenCalledTimes(1);
 }finally{globalThis.fetch=old;alert.mockRestore();}
});
