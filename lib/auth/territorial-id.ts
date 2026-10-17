type Row=Record<string,string>
export function resolveTerritorialId(value:string|undefined,rows:Row[],key:string):string|null{
  const input=String(value||"").trim();if(!input)return null
  const exact=rows.filter(row=>String(row[key]||"").trim()===input)
  if(exact.length)return exact.length===1?input:null
  if(!/^\d+$/.test(input))return null
  const numeric=(text:string)=>text.replace(/^0+(?=\d)/,"")
  const matches=rows.filter(row=>/^\d+$/.test(String(row[key]||""))&&numeric(row[key])===numeric(input))
  return matches.length===1?matches[0][key]:null
}
