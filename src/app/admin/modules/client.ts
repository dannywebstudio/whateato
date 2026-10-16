export async function json(url:string,init:RequestInit={}):Promise<any>{
 const response=await fetch(url,{credentials:'same-origin',cache:'no-store',...init});
 const data=await response.json().catch(()=>({error:'invalid_response'}));
 if(!response.ok)throw Error(String(data.error||'HTTP '+response.status));
 return data;
}
export const post=(url:string,body:unknown,method='POST')=>json(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});

