export function insertEmoji(text:string,selection:{start:number;end:number}|null,emoji:string,maxLength=1000){
 const start=Math.max(0,Math.min(selection?.start??text.length,text.length));
 const end=Math.max(start,Math.min(selection?.end??start,text.length));
 const next=text.slice(0,start)+emoji+text.slice(end);
 if(next.length>maxLength)return {text,selection:{start,end}};
 const cursor=start+emoji.length;
 return {text:next,selection:{start:cursor,end:cursor}};
}
