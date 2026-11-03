import data from "./emoji-catalog.json";

export type EmojiEntry={id:string;emoji:string;label:string;group:number;tones:number[];search:string};
export const emojiCatalog:EmojiEntry[]=data;
export const emojiCategories=[
 {id:-2,label:"All",icon:"◉"},{id:-1,label:"Recent",icon:"◷"},
 {id:0,label:"Smileys",icon:"😀"},{id:1,label:"People",icon:"👋"},
 {id:2,label:"Components",icon:"🦰"},{id:3,label:"Nature",icon:"🐻"},
 {id:4,label:"Food",icon:"🍔"},{id:5,label:"Travel",icon:"🚗"},
 {id:6,label:"Activities",icon:"⚽"},{id:7,label:"Objects",icon:"💡"},
 {id:8,label:"Symbols",icon:"❤️"},{id:9,label:"Flags",icon:"🏁"},
];
const aliases:Record<string,string>={dil:"heart",pyar:"heart",pyaar:"heart",khushi:"happy",hansi:"laugh",rona:"cry",aag:"fire",namaste:"folded hands",dhanyavad:"folded hands",janamdin:"birthday"};
const normalizedSearch=new Map(emojiCatalog.map(entry=>[entry.id,entry.search.normalize("NFKC")]));
export function filterEmojiCatalog(query:string,category=-2,tone:"default"|"all"|number="default",recentIds:string[]=[]){
 const input=query.normalize("NFKC").trim().toLowerCase().replace(/[:_]/g," ").trim();
 const terms=(aliases[input]||input).split(/\s+/).filter(Boolean);
 const recentSet=new Set(recentIds);
 const result=emojiCatalog.filter(entry=>{
  if(category===-1&&!recentSet.has(entry.id))return false;
  if(category>=0&&entry.group!==category)return false;
  const exactEmoji=input.length>0&&entry.emoji.replace(/\uFE0F/g,"")===input.replace(/\uFE0F/g,"");
  if(category!==-1&&tone==="default"&&entry.tones.length&&!exactEmoji)return false;
  if(category!==-1&&typeof tone==="number"&&entry.tones.length&&!entry.tones.includes(tone))return false;
  return terms.every(term=>normalizedSearch.get(entry.id)!.includes(term)||entry.emoji.includes(term));
 });
 if(category===-1)result.sort((a,b)=>recentIds.indexOf(a.id)-recentIds.indexOf(b.id));
 return result;
}
