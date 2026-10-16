import {NextRequest,NextResponse} from 'next/server';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {currentStaff,hasPermission,ownerHeaders,safeSameOrigin} from '@/lib/owner-cms-auth';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const respond=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:ownerHeaders});
const marker='.whateato-storage-probe-v1.json';

export async function POST(req:NextRequest){
 const staff=await currentStaff();
 if(!staff||!hasPermission(staff,'publish'))return respond({error:'owner_required'},403);
 if(!safeSameOrigin(req))return respond({error:'cross_site_request'},403);
 const configured=process.env.WHATEATO_MEDIA_DIR||'';
 if(!configured||!path.isAbsolute(configured))
   return respond({error:'media_directory_not_configured',hint:'WHATEATO_MEDIA_DIR에 검증할 절대 경로를 지정해 줘.'},422);
 const directory=path.resolve(configured);
 // Never create diagnostics inside code/deployment trees, OS directories, or the public web root.
 const blocked=['/','/tmp','/var','/etc','/usr','/bin','/opt','/root','/home','/app','/workspace','/public_html'];
 const normalized=directory.replace(/\\/g,'/');
 if(blocked.includes(normalized)||normalized.includes('/hbuilds')||
    normalized.endsWith('/public_html')||normalized.includes('/public_html/')||
    normalized.includes('/node_modules/')||normalized.includes('/.next/'))
   return respond({error:'unsafe_media_directory'},422);
 const file=path.join(directory,marker);
 let previous=false;let previousCreatedAt:string|null=null;let readBack=false;
 try{
   await mkdir(directory,{recursive:true,mode:0o700});
   try{
     const old=JSON.parse(await readFile(file,'utf8')) as {probe?:string;createdAt?:string};
     previous=old.probe==='whateato-storage-probe-v1';
     if(previous)previousCreatedAt=typeof old.createdAt==='string'?old.createdAt:null;
     else return respond({error:'unexpected_existing_probe_file'},409);
   }catch(e){
     if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;
   }
   if(!previous){
     const payload={probe:'whateato-storage-probe-v1',createdAt:new Date().toISOString(),nonce:randomBytes(12).toString('hex')};
     await writeFile(file,JSON.stringify(payload),{flag:'wx',mode:0o600});
     const check=JSON.parse(await readFile(file,'utf8')) as typeof payload;
     readBack=check.probe===payload.probe&&check.nonce===payload.nonce;
   }else readBack=true;
   return respond({writable:true,readBack,previousMarkerFound:previous,
     previousCreatedAt,meaning:previous?
     '이전 실행에서 만든 파일이 남아 있어. 재배포 전후에 실행했다면 보존을 확인할 수 있어.':
     '새 테스트 파일을 만들고 읽었어. 재배포 후 다시 실행해야 보존 여부를 확인할 수 있어.'});
 }catch(e){
   const code=(e as NodeJS.ErrnoException).code||'filesystem_error';
   return respond({writable:false,error:code},code==='EACCES'||code==='EPERM'||code==='EROFS'?403:500);
 }
}
