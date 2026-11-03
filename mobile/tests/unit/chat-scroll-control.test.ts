import { type NativeScrollEvent } from "react-native";
import { shouldFollowChatScroll } from "@/lib/ui/scroll";

function event(y:number):NativeScrollEvent {
  return {contentOffset:{x:0,y},contentSize:{width:360,height:2000},layoutMeasurement:{width:360,height:600},contentInset:{top:0,left:0,right:0,bottom:0},zoomScale:1};
}
it("releases bottom following on a small upward wheel movement even near the bottom",()=>{
  expect(shouldFollowChatScroll(event(1380),1400,false)).toBe(false);
  expect(shouldFollowChatScroll(event(1399),1400,false)).toBe(false);
});
it("does not follow a refresh while the user is dragging or stopped mid-list",()=>{
  expect(shouldFollowChatScroll(event(1400),1400,true)).toBe(false);
  expect(shouldFollowChatScroll(event(900),900,false)).toBe(false);
});
it("allows normal chat following when the user returns to the bottom",()=>{
  expect(shouldFollowChatScroll(event(1400),1380,false)).toBe(true);
  expect(shouldFollowChatScroll(event(1400),1400,false)).toBe(true);
});
