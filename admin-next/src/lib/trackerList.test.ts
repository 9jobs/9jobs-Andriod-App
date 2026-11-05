import { expect,test } from "vitest";
import { paginateTrackerRows } from "./trackerList";
test("filters tracker rows before numbering and pagination",()=>{
 const rows=Array.from({length:70},(_,i)=>({id:i,title:i%2?"Engineer":"Designer"}));
 const result=paginateTrackerRows(rows,"engineer",2,25);
 expect(result.total).toBe(35);expect(result.rows).toHaveLength(10);expect(result.offset).toBe(25);expect(result.page).toBe(2);
});
test("clamps page after records are removed and handles no search matches",()=>{
 expect(paginateTrackerRows([{name:"Alex"}],"",7,25).page).toBe(1);
 expect(paginateTrackerRows([{name:"Alex"}],"missing",2,25)).toMatchObject({rows:[],total:0,page:1,offset:0});
});
test("searches visible numbers and text without matching attachment data",()=>{
 expect(paginateTrackerRows([{ats_score:82,note:"Reviewed",photo_url:"secretphoto"}],"82",1,25).total).toBe(1);
 expect(paginateTrackerRows([{photo_url:"secretphoto"}],"secretphoto",1,25).total).toBe(0);
});
