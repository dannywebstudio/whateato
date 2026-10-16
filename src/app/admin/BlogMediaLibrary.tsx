'use client';
import {useRef,useState,type DragEvent} from 'react';
import styles from './blog-editor.module.css';
type BlogImage={id:string;media_role:'cover'|'inline';alt_text:string;rights_status:string;image_url:string;width:number;height:number};
export default function BlogMediaLibrary({images,onUpload,onDelete,disabled}:{images:BlogImage[];onUpload:(file:File)=>Promise<void>;onDelete:(image:BlogImage)=>Promise<void>;disabled:boolean}){
 const fileInput=useRef<HTMLInputElement>(null);
 const [uploading,setUploading]=useState(false);
 const [deleting,setDeleting]=useState<string|null>(null);
 const [error,setError]=useState('');
 const upload=async(file?:File)=>{
  if(!file||uploading)return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024){setError('JPG·PNG·WebP / 최대 8MB');return}
  setUploading(true);setError('');
  try{await onUpload(file)}catch(e){setError(e instanceof Error?e.message:'업로드 실패')}finally{setUploading(false)}
 };
 const addToBody=(image:BlogImage)=>{
  window.dispatchEvent(new CustomEvent('whateato-blog-media-insert',{detail:{id:image.id}}));
 };
 const dragStart=(event:DragEvent<HTMLButtonElement>,image:BlogImage)=>{
  event.dataTransfer.setData('application/x-whateato-blog-image',image.id);
  event.dataTransfer.setData('text/plain',image.id);
  event.dataTransfer.effectAllowed='copy';
 };
 return <aside className={styles.mediaLibrary} aria-label="사진 라이브러리">
  <h4>사진 라이브러리</h4>
  <p>업로드한 사진을 본문 원하는 위치로 끌어놓아 줘. 클릭하면 커서 위치에 삽입돼.</p>
  <button type="button" className={styles.greenButton} disabled={disabled||uploading} onClick={()=>fileInput.current?.click()}>
   {uploading?'업로드 처리 중':'＋ 사진 업로드'}
  </button>
  <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e=>{void upload(e.target.files?.[0]);e.target.value=''}}/>
  <div className={styles.libraryDrop} onDragOver={e=>e.preventDefault()} onDrop={e=>{if(e.dataTransfer.files.length){e.preventDefault();void upload(e.dataTransfer.files[0])}}}>
   여기에 사진 파일 드롭
  </div>
  {error&&<p role="alert" className={styles.editorNotice}>{error}</p>}
  <div className={styles.libraryPhotos}>{images.map(image=><div key={image.id} className={styles.libraryPhotoWrap}>
   <button type="button" draggable className={styles.libraryPhoto} onDragStart={e=>dragStart(e,image)} onClick={()=>addToBody(image)} title="본문으로 끌거나 클릭해서 삽입">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={image.image_url} alt={image.alt_text} loading="lazy"/><span>{image.alt_text}</span>
   </button>
   <button type="button" className={styles.libraryPhotoDelete} aria-label={image.alt_text+' 사진 삭제'} title="사진 삭제" disabled={disabled||Boolean(deleting)} onClick={async()=>{
    if(!window.confirm('이 사진을 라이브러리에서 영구 삭제할까? 본문에 쓰인 사진은 먼저 본문에서 제거해야 해.'))return;
    setDeleting(image.id);setError('');try{await onDelete(image)}catch(e){setError(e instanceof Error?e.message:'사진 삭제 실패')}finally{setDeleting(null)}
   }}>×</button>
  </div>)}</div>
 </aside>;
}
