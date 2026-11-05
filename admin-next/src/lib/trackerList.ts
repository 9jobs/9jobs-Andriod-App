export function paginateTrackerRows<T extends Record<string, unknown>>(rows:T[], query:string, page:number, size:number) {
  const text=query.trim().toLowerCase();
  const filtered=rows.filter(row=>!text || Object.entries(row).some(([key,value])=>
    !key.endsWith("_url") && !key.endsWith("_id") && ["string","number"].includes(typeof value) && String(value).toLowerCase().includes(text)));
  const pages=Math.max(1,Math.ceil(filtered.length/size));
  const currentPage=Math.min(Math.max(1,page),pages),offset=(currentPage-1)*size;
  return {rows:filtered.slice(offset,offset+size),total:filtered.length,pages,page:currentPage,offset};
}
