"use client";
import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Edit, Eye, MoreVertical, Trash2 } from "lucide-react";

function hasText(node:React.ReactNode):boolean {
 return React.Children.toArray(node).some(child=>typeof child==="string"?!!child.trim():typeof child==="number"||React.isValidElement<{children?:React.ReactNode}>(child)&&hasText(child.props.children));
}
function labelActions(node:React.ReactNode):React.ReactNode {
 return React.Children.map(node,child=>{
  if(!React.isValidElement<any>(child))return child;
  const element=child as React.ReactElement<any>;
  if(element.type==="button"||element.type==="a"){
   const icons=React.Children.toArray(element.props.children).filter(React.isValidElement);
   const label=element.props.title||element.props["aria-label"]||(icons.some(icon=>icon.type===Trash2)?"Delete":icons.some(icon=>icon.type===Edit)?"Edit":icons.some(icon=>icon.type===Eye)?"View":"Open");
   return React.cloneElement(element,{role:"menuitem","aria-label":label},element.props.children,!hasText(element.props.children)&&<span>{label}</span>);
  }
  return React.cloneElement(element,{},labelActions(element.props.children));
 });
}
export function RowActionsMenu({children}:{children:React.ReactNode}){
 const id=useId(),button=useRef<HTMLButtonElement>(null),menu=useRef<HTMLDivElement>(null);
 const [position,setPosition]=useState<{left:number;top:number}|null>(null);
 const close=()=>setPosition(null);
 useEffect(()=>{
  if(!position)return;
  const outside=(event:PointerEvent)=>{if(!menu.current?.contains(event.target as Node)&&!button.current?.contains(event.target as Node))close();};
  const key=(event:KeyboardEvent)=>{
   if(event.key==="Escape"){close();button.current?.focus();}
   if(event.target instanceof HTMLSelectElement||event.target instanceof HTMLInputElement||event.target instanceof HTMLTextAreaElement)return;
   if(event.key==="ArrowDown"||event.key==="ArrowUp"){
    event.preventDefault();const items=Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)')||[]);
    const index=items.indexOf(document.activeElement as HTMLElement),step=event.key==="ArrowDown"?1:-1;
    items[(index+step+items.length)%items.length]?.focus();
   }
  };
  document.addEventListener("pointerdown",outside);document.addEventListener("keydown",key);
  const scrolled=(event:Event)=>{if(!menu.current?.contains(event.target as Node))close();};
  window.addEventListener("resize",close);window.addEventListener("scroll",scrolled,true);
  menu.current?.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')?.focus();
  return()=>{document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",key);window.removeEventListener("resize",close);window.removeEventListener("scroll",scrolled,true);};
 },[position]);
 return <>
  <button ref={button} type="button" className="row-actions-trigger" aria-label="Row actions" aria-haspopup="menu" aria-expanded={!!position} aria-controls={position?id:undefined} onClick={()=>{
   if(position){close();return;}const rect=button.current!.getBoundingClientRect();
   setPosition({left:Math.max(8,Math.min(rect.right-176,window.innerWidth-184)),top:rect.bottom+6});
  }}><MoreVertical size={17}/></button>
  {position&&createPortal(<div ref={menu} id={id} role="menu" aria-label="Row actions menu" className="row-actions-popover" style={{left:position.left,top:Math.min(position.top,Math.max(8,window.innerHeight-210))}} onClick={event=>{if((event.target as HTMLElement).closest('button:not(:disabled),a[href]'))close();}}>{labelActions(children)}</div>,document.body)}
 </>;
}
