import { fireEvent, render } from '@testing-library/react-native';
import { EmojiPicker } from '@/components/chat/EmojiPicker';
import { insertEmoji } from '@/lib/ui/insertEmoji';
jest.mock('@react-native-async-storage/async-storage',()=>require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('react-native-safe-area-context',()=>({useSafeAreaInsets:()=>({top:0,bottom:20,left:0,right:0})}));
jest.mock('@/theme',()=>({colors:{surface:'#fff',border:'#ddd',text:'#111',accentDark:'#4E6700',panel:'#eee'}}));
it('selects an emoji and supports closing the picker',async()=>{
 const onSelect=jest.fn(),onClose=jest.fn();
 const view=await render(<EmojiPicker visible onSelect={onSelect} onClose={onClose}/>);
 await fireEvent.press(view.getByLabelText('Insert 😊'));
 expect(onSelect).toHaveBeenCalledWith('😊');
 await fireEvent.press(view.getByLabelText('Done selecting emojis'));
 expect(onClose).toHaveBeenCalledTimes(1);
});
it('inserts at the cursor, preserves surrounding text and replaces a selection',()=>{
 expect(insertEmoji('Hi there',{start:3,end:3},'😊')).toEqual({text:'Hi 😊there',selection:{start:5,end:5}});
 expect(insertEmoji('Hi there',{start:3,end:8},'👍').text).toBe('Hi 👍');
 expect(insertEmoji('',null,'❤️').text).toBe('❤️');
});
it('allows multiple emoji inserts without splitting characters or exceeding the message limit',()=>{
 const first=insertEmoji('Hi ',null,'😊');
 expect(insertEmoji(first.text,first.selection,'👍').text).toBe('Hi 😊👍');
 expect(insertEmoji('a'.repeat(999),null,'😊').text).toBe('a'.repeat(999));
});

it('finds emoji through search and category selection',async()=>{
 const onSelect=jest.fn();
 const view=await render(<EmojiPicker visible onSelect={onSelect} onClose={jest.fn()}/>);
 await fireEvent.changeText(view.getByLabelText('Search emojis'),'pizza');
 await fireEvent.press(view.getByLabelText('Insert 🍕'));
 expect(onSelect).toHaveBeenCalledWith('🍕');
 await fireEvent.press(view.getByLabelText('Clear emoji search'));
 await fireEvent.press(view.getByLabelText('Emoji category Food'));
 expect(view.getByLabelText('Emoji category Food').props.accessibilityState.selected).toBe(true);
});
