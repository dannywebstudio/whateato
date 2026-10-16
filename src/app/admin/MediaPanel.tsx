'use client';
import type {Detail} from './modules/types';
import {useEffect,useState} from 'react';
import {post} from './modules/client';
import styles from './admin.module.css';
type Props={selected:Detail;owner:boolean;busy:boolean;image:File|null;setImage:(file:File|null)=>void;rights:boolean;setRights:(value:boolean)=>void;photoRole:'cover'|'gallery';photoOrigin:'owner_original'|'external_licensed';setPhotoOrigin:(v:'owner_original'|'external_licensed')=>void;setPhotoRole:(value:'cover'|'gallery')=>void;imagePosition:number;setImagePosition:(value:number)=>void;imageEvidence:string;setImageEvidence:(value:string)=>void;rightsEvidence:string;setRightsEvidence:(value:string)=>void;imageResult:string;setBusy:(value:boolean)=>void;uploadPhoto:(file?:File,position?:number)=>Promise<void>;inform:(error:unknown)=>void;select:(id:string)=>Promise<void>};
export default function MediaPanel({selected,owner,busy,image,setImage,rights,setRights,photoRole,photoOrigin,setPhotoOrigin,setPhotoRole,imagePosition,setImagePosition,imageEvidence,setImageEvidence,rightsEvidence,setRightsEvidence,imageResult,setBusy,uploadPhoto,inform,select}:Props){
 const [preview,setPreview]=useState('');
 const [queue,setQueue]=useState<File[]>([]);
 const [progress,setProgress]=useState('');
 const [uploading,setUploading]=useState(false);
 useEffect(()=>{if(!image){setPreview('');return}const url=URL.createObjectURL(image);setPreview(url);return()=>URL.revokeObjectURL(url)},[image]);
 const canUpload=Boolean(queue.length&&rights&&!busy&&!uploading&&(photoOrigin==='owner_original'||(/^https:\/\//.test(imageEvidence)&&/^https:\/\//.test(rightsEvidence))));
 return (<section className={styles.panel} aria-label="사진 관리">
     <h2>식당 사진 관리</h2>
     <p className={styles.note}>사진을 선택하면 WebP로 최적화해 비공개 저장하고, 관리자 승인 후 카드나 상세페이지에 노출해.</p>
     <div className={styles.grid}>
       <label className={styles.field}>표시 위치
         <select value={photoRole} onChange={e=>setPhotoRole(e.target.value as 'cover'|'gallery')}>
           <option value="cover">카드 대표사진 · 권장 가로형</option>
           <option value="gallery">상세페이지 사진 · 권장 4:3</option>
         </select>
       </label>
       <label className={styles.field}>사진 출처 유형
         <select value={photoOrigin} onChange={e=>setPhotoOrigin(e.target.value as 'owner_original'|'external_licensed')}>
           <option value="owner_original">내가 권리를 보유한 사진</option>
           <option value="external_licensed">외부 제공·사용 허락받은 사진</option>
         </select>
       </label>
     </div>
     <label className={styles.field}>사진 선택 (JPG · PNG · WebP / 최대 8MB)
       <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>{const selectedFiles=Array.from(e.target.files||[]).slice(0,20);setQueue(selectedFiles);setImage(selectedFiles[0]||null)}}/>
     </label>
     {queue.length>0&&<p role="status" className={styles.note}>{queue.length}장 선택됨 · 순서대로 업로드 (최대 20장)</p>}
     {preview&&<div style={{display:'flex',gap:14,alignItems:'center',flexWrap:'wrap',padding:12,border:'1px solid #d7e5da',borderRadius:10,background:'#f6faf7'}}>
       {/* eslint-disable-next-line @next/next/no-img-element */}
       <img src={preview} alt="업로드 전 사진 미리보기" style={{width:140,height:100,objectFit:'contain',background:'#e9eeeb',borderRadius:7}}/>
       <div><strong>{image?.name}</strong><p className={styles.note}>{((image?.size||0)/1024/1024).toFixed(2)} MB · {photoRole==='cover'?'대표사진':'상세사진'}</p></div>
     </div>}
     {photoRole==='gallery'&&<label className={styles.field}>상세페이지 사진 순서
       <input type="number" min={0} max={100} value={imagePosition} onChange={e=>setImagePosition(Number(e.target.value))}/>
     </label>}
     {photoOrigin==='external_licensed'&&<div className={styles.panel}>
       <p className={styles.note}>외부 사진은 실제 출처와 게시 권한을 확인할 수 있는 서로 다른 HTTPS URL을 입력해야 해.</p>
       <label className={styles.field}>사진 원본 출처 URL
         <input type="url" placeholder="https://..." value={imageEvidence} onChange={e=>setImageEvidence(e.target.value)}/>
       </label>
       <label className={styles.field}>사용권 증빙 URL
         <input type="url" placeholder="https://..." value={rightsEvidence} onChange={e=>setRightsEvidence(e.target.value)}/>
       </label>
     </div>}
     <label className={styles.chip}>
       <input type="checkbox" checked={rights} onChange={e=>setRights(e.target.checked)}/>
       {photoOrigin==='owner_original'?'내가 사진의 이용 권리를 보유하며 WhatEatO 게시·변환에 동의해.':'외부 사진의 사용 허락을 확인했어.'}
     </label>
     <div className={styles.actions}>
       <button className={styles.button} disabled={!canUpload} onClick={()=>void(async()=>{
         setUploading(true);let done=0;const failures:string[]=[];
         try{for(const file of queue){setImage(file);setProgress((done+1)+' / '+queue.length+' 업로드 중');try{await uploadPhoto(file,photoRole==='gallery'?imagePosition+done:0);done++}catch(e){failures.push(file.name+': '+(e instanceof Error?e.message:'업로드 실패'))}}
          setProgress(done+' / '+queue.length+'장 업로드 완료'+(failures.length?' · 실패 '+failures.length+'장: '+failures.join(' / '):''));
          if(!failures.length){setQueue([]);setImage(null)}
         }finally{setUploading(false)}
       })()}>{uploading?'사진 업로드 중…':'사진 업로드 · 검수 대기'}</button>
     </div>
     {progress&&<p role="status" className={styles.note}>{progress}</p>}
     {imageResult&&<p role="status" className={styles.note}>{imageResult}</p>}
     <h3>등록된 사진 <span className={styles.small}>{selected.images.length}장</span></h3>
       <div className={styles.cardList}>{selected.images.map(i=><div key={i.id} className={styles.row}>
         <span style={{display:'inline-flex',alignItems:'center',gap:9,flexWrap:'wrap'}}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={'/api/v1/owner/media/'+i.id+'/preview'} alt="등록 사진" loading="lazy" style={{width:64,height:54,objectFit:'cover',borderRadius:5}}/><span className={styles.code}>{i.cms_photo_role==='cover'?'카드 대표사진':'상세페이지 사진'} · {i.id} · {i.rights_status} · {i.publication_state}</span></span>
         {owner&&i.rights_status==='pending'&&<>
           <button className={styles.button+' '+styles.secondary} onClick={()=>void(async()=>{
             if(!window.confirm('원본과 사용권 증빙을 검수했어? 승인 후 공개돼.'))return;
             try{await post('/api/v1/owner/media/'+i.id,{decision:'approve'},'PATCH');await select(selected.restaurant.id)}catch(e){inform(e)}
           })()}>사진 게시 승인</button>
           <button className={styles.button+' '+styles.danger} onClick={()=>void(async()=>{
             if(!window.confirm('사진 사용을 거절할까?'))return;
             try{await post('/api/v1/owner/media/'+i.id,{decision:'reject'},'PATCH');await select(selected.restaurant.id)}catch(e){inform(e)}
           })()}>거절</button>
         </>}
         {owner&&<button className={styles.button+' '+styles.danger} disabled={busy||uploading}
           onClick={()=>void(async()=>{
             if(!window.confirm('사진을 영구 삭제할까? 게시 중인 경우 상세페이지·카드에서도 즉시 사라지며 복구할 수 없어.'))return;
             try{const response=await fetch('/api/v1/owner/media/'+i.id+'/delete',{method:'DELETE',credentials:'same-origin',headers:{'x-whateato-confirm-delete':i.id}});
               const result=await response.json();if(!response.ok)throw Error(result.error||'image_delete_failed');
               await select(selected.restaurant.id);if(result.warning)inform(Error(result.warning));
             }catch(e){inform(e)}
           })()}>영구 삭제</button>}
         {owner&&i.publication_state==='published'&&<button className={styles.button+' '+styles.danger}
           onClick={()=>void(async()=>{
             if(!window.confirm('게시된 이미지를 즉시 비공개 처리할까?'))return;
             try{await post('/api/v1/owner/media/'+i.id,{decision:'hide'},'PATCH');await select(selected.restaurant.id)}catch(e){inform(e)}
           })()}>비공개</button>}
       </div>)}</div>
   </section>);}
