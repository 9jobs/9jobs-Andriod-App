import { fireEvent, render } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { JobLinkText } from '@/components/ui/JobLinkText';

it('shows a short link and opens the complete original job URL',async()=>{
 const url='https://au.jora.com/job/General-Labourer-123?abstract_type=extended&location=Melbourne%20VIC';
 const open=jest.spyOn(Linking,'openURL').mockResolvedValue(true);
 const screen=await render(<JobLinkText>{`Position: Labourer\nJob Link: ${url}\nRecruiter: Applied`}</JobLinkText>);
 expect(screen.queryByText(url)).toBeNull();
 expect(screen.getByText('Link')).toBeTruthy();
 await fireEvent.press(screen.getByRole('link'));
 expect(open).toHaveBeenCalledWith(url);
 open.mockRestore();
});
