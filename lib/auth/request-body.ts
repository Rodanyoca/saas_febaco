export async function readAuthJson(request:Request):Promise<unknown>{
  const limit=8192,reader=request.body?.getReader()
  if(!reader)throw new Error("Corps absent.")
  let length=0,text="";const decoder=new TextDecoder()
  try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>limit){await reader.cancel();throw new Error("Corps trop volumineux.")}text+=decoder.decode(value,{stream:true})}text+=decoder.decode();return JSON.parse(text)}finally{reader.releaseLock()}
}
