'use client';
import type {Detail} from './modules/types';
import {post} from './modules/client';
import styles from './admin.module.css';
type Props={selected:Detail;owner:boolean;busy:boolean;image:File|null;setImage:(file:File|null)=>void;rights:boolean;setRights:(value:boolean)=>void;photoRole:'cover'|'gallery';setPhotoRole:(value:'cover'|'gallery')=>void;imagePosition:number;setImagePosition:(value:number)=>void;imageEvidence:string;setImageEvidence:(value:string)=>void;rightsEvidence:string;setRightsEvidence:(value:string)=>void;imageResult:string;setBusy:(value:boolean)=>void;uploadPhoto:()=>Promise<void>;inform:(error:unknown)=>void;select:(id:string)=>Promise<void>};
export default function MediaPanel({selected,owner,busy,image,setImage,rights,setRights,photoRole,setPhotoRole,imagePosition,setImagePosition,imageEvidence,setImageEvidence,rightsEvidence,setRightsEvidence,imageResult,setBusy,uploadPhoto,inform,select}:Props){return (<section className={styles.panel} aria-label="사진 관리">
     <h2>사진 관리 · 업로드 및 검수</h2><p className={styles.note}>원본 최대 8MB · JPEG/PNG/WebP. 저장 전에 서버에서 회전/디코딩/EXIF 제거 및 WebP 최적화해. 스토리지 연결이 없으면 업로드하지 않아.</p>
     <label className={styles.field}>사진 유형
       <select value={photoRole} onChange={e=>setPhotoRole(e.target.value as 'cover'|'gallery')}>
         <option value="cover">카드 대표사진 · 1200×810px</option>
         <option value="gallery">상세페이지에 게시될 사진 · 1200×900px</option>
       </select></label>
     <div className={styles.photoHelp}>
       <p><strong>카드 대표사진:</strong> 권장 1200×810px (1.48:1). 검색 카드 전용으로 우선 노출하고, 새 대표사진 승인 시 기존 대표사진은 비공개해.</p>
       <p><strong>상세페이지 사진:</strong> 권장 1200×900px (4:3). 대표메뉴 위 갤러리에 노출. PC 3장, 모바일 1장.</p>
       <p>JPG/PNG/WebP 원본 최대 8MB · 자동 회전·크기·WebP 최적화.</p>
     </div>
     <>
       <h3>{selected.restaurant.name_ko}</h3>
       <div className={styles.grid}>
         <label className={styles.field}>이미지 원본<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setImage(e.target.files?.[0]||null)}/></label>
         <label className={styles.field}>상세사진 표시 순서<input type="number" disabled={photoRole==='cover'} value={imagePosition} min={0} max={100} onChange={e=>setImagePosition(Number(e.target.value))}/></label>
       </div>
       {image&&<p className={styles.small}>{image.name} · {(image.size/1024/1024).toFixed(2)}MB</p>}
       <label className={styles.field}>이미지 원본 출처 HTTPS<input type="url" value={imageEvidence} onChange={e=>setImageEvidence(e.target.value)}/></label>
       <label className={styles.field}>사진 사용권 증빙 URL HTTPS (원본 출처와 구분)<input type="url" value={rightsEvidence} onChange={e=>setRightsEvidence(e.target.value)}/></label>
       <label className={styles.chip}><input type="checkbox" checked={rights} onChange={e=>setRights(e.target.checked)}/> 해당 사진을 게시·변환할 사용권을 확인했어.</label>
       <div className={styles.actions}>
         <button className={styles.button} disabled={!image||!rights||busy} onClick={()=>void(async()=>{setBusy(true);try{await uploadPhoto()}catch(e){inform(e)}finally{setBusy(false)}})()}>이미지 업로드 · 승인 대기</button>
       </div>
       {imageResult&&<p role="status">{imageResult}</p>}
       <div className={styles.cardList}>{selected.images.map(i=><div key={i.id} className={styles.row}>
         <span className={styles.code}>{i.cms_photo_role==='cover'?'카드 대표사진':'상세페이지 사진'} · {i.id} · {i.rights_status} · {i.publication_state}</span>
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
         {owner&&i.publication_state==='published'&&<button className={styles.button+' '+styles.danger}
           onClick={()=>void(async()=>{
             if(!window.confirm('게시된 이미지를 즉시 비공개 처리할까?'))return;
             try{await post('/api/v1/owner/media/'+i.id,{decision:'hide'},'PATCH');await select(selected.restaurant.id)}catch(e){inform(e)}
           })()}>비공개</button>}
       </div>)}</div>
     </>
   </section>);}
