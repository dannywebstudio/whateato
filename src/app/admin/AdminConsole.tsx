'use client';
import {useCallback,useEffect,useState,type ChangeEvent} from 'react';
import styles from './admin.module.css';

type Role='owner'|'editor'|'moderator';
type Tab='restaurants'|'batches'|'reviews';
type Place={id:string;name_ko:string;region_sigungu:string|null;road_address_ko:string|null;publication_status:string};
type Detail={
 restaurant:Place&{lot_address_ko:string|null;category_code:string|null;
  region_sido:string|null;region_dong:string|null;latitude:number|null;longitude:number|null;
  cms_origin:boolean;cms_source_url:string|null;business_status:string};
 locales:{locale:string;display_name:string;short_description:string|null;full_description:string|null;source_notes:string|null}[];
 menus:{id:string;menu_key:string;position:number;price_krw:number|null;locale:string|null;name:string|null;description:string|null;publication_state:string}[];
 tags:{tag_code:string;verification_state:string;evidence_ref:string|null}[];
 hours:{weekday:number|null;start_minute:number|null;end_minute:number|null;source_url:string;publication_state:string}[];
 images:{id:string;position:number;publication_state:string;rights_status:string;cms_photo_role:'cover'|'gallery';url:string}[];
};
type Batch={id:string;title:string;state:string;total:number;applied:number;failed:number};
type Review={id:string;restaurant_id:string;restaurant_name:string;rating:number;body:string;created_at:string};
type Day={weekday:number;closed:boolean;open:string;close:string;breakStart:string;breakEnd:string};
const weekdays=['일','월','화','수','목','금','토'];
const emptyDays=():Day[]=>weekdays.map((_,weekday)=>({weekday,closed:true,open:'11:00',close:'21:00',breakStart:'',breakEnd:''}));
const tags=['date_night','bar','lunch','dinner','solo_dining','family_dining','cafe','dessert',
 'budget_friendly','good_atmosphere','local_pick','traveler_friendly','english_menu',
 'vegetarian_options','reservation_available','near_subway'];
const locales=['en','ja','zh-CN','ko'] as const;
const timeToMin=(s:string)=>{const m=/^([01]\d|2[0-3]):([0-5]\d)$/.exec(s);
 if(!m)throw Error('시간은 HH:MM 형식이어야 해.');return Number(m[1])*60+Number(m[2])};
const minToTime=(v:number)=>String(Math.floor(v/60)).padStart(2,'0')+':'+String(v%60).padStart(2,'0');
const blankMenu=()=>({key:'',name:'',price:'',description:'',evidence:'',featured:false});
type Menu=ReturnType<typeof blankMenu>;
type Item={source_key:string;restaurant_id:string;kind:string;payload:Record<string,unknown>};
async function json(url:string,init:RequestInit={}):Promise<any>{
 const response=await fetch(url,{credentials:'same-origin',cache:'no-store',...init});
 const data=await response.json().catch(()=>({error:'invalid_response'}));
 if(!response.ok)throw Error(String(data.error||'HTTP '+response.status));
 return data;
}
const post=(url:string,body:unknown,method='POST')=>json(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});

export default function AdminConsole({role}:{role:Role}){
 const [tab,setTab]=useState<Tab>(role==='moderator'?'reviews':'restaurants');
 const [notice,setNotice]=useState('');const [busy,setBusy]=useState(false);
 const [readiness,setReadiness]=useState<Record<string,string|boolean>|null>(null);
 const [q,setQ]=useState('');const [matches,setMatches]=useState<Place[]>([]);
 const [cursor,setCursor]=useState<string|null>(null);
 const [selected,setSelected]=useState<Detail|null>(null);
 const [locale,setLocale]=useState<typeof locales[number]>('en');
 const [displayName,setDisplayName]=useState('');const [intro,setIntro]=useState('');
 const [full,setFull]=useState('');const [source,setSource]=useState('');
 const [menus,setMenus]=useState<Menu[]>([blankMenu()]);
 const [chosenTags,setChosenTags]=useState<string[]>([]);
 const [tagEvidence,setTagEvidence]=useState('');
 const [days,setDays]=useState<Day[]>(emptyDays());
 const [hoursEvidence,setHoursEvidence]=useState('');
 const [batchTitle,setBatchTitle]=useState('');const [batchId,setBatchId]=useState('');
 const [batches,setBatches]=useState<Batch[]>([]);
 const [currentBatch,setCurrentBatch]=useState<any>(null);
 const [bulkFile,setBulkFile]=useState<File|null>(null);const [imported,setImported]=useState(0);
 const [reviews,setReviews]=useState<Review[]>([]);
 const [reviewStatus,setReviewStatus]=useState<'pending'|'published'|'rejected'>('pending');
 const [reason,setReason]=useState('spam');
 const [image,setImage]=useState<File|null>(null);const [rights,setRights]=useState(false);
 const [photoRole,setPhotoRole]=useState<'cover'|'gallery'>('cover');
 const [creating,setCreating]=useState(false);
 const [newVenue,setNewVenue]=useState({name_ko:'',road_address_ko:'',lot_address_ko:'',
   region_sido:'',region_sigungu:'',region_dong:'',latitude:'',longitude:'',source_url:''});
 const [address,setAddress]=useState({road_address_ko:'',lot_address_ko:'',
   region_sido:'',region_sigungu:'',region_dong:'',latitude:'',longitude:''});
 const [addressProof,setAddressProof]=useState('');
 const [publishNew,setPublishNew]=useState(false);
 const [imageEvidence,setImageEvidence]=useState('');const [rightsEvidence,setRightsEvidence]=useState('');const [imagePosition,setImagePosition]=useState(0);
 const [imageResult,setImageResult]=useState('');
 const edit=role!=='moderator';const owner=role==='owner';const moderate=role!=='editor';
 const inform=(e:unknown)=>setNotice(e instanceof Error?e.message:String(e));
 const search=useCallback(async(after?:string)=>{
   try{
    const p=new URLSearchParams({q});if(after)p.set('after',after);
    const result=await json('/api/v1/owner/catalog?'+p);
    setMatches(prev=>after?[...prev,...result.items]:result.items);
    setCursor(result.next_cursor);
   }catch(e){inform(e)}
 },[q]);
 const select=async(id:string)=>{
   setBusy(true);try{
    const data:Detail=await json('/api/v1/owner/catalog/'+id);
    setSelected(data);setImageResult('');setPublishNew(false);
    setAddress({road_address_ko:data.restaurant.road_address_ko||'',
      lot_address_ko:data.restaurant.lot_address_ko||'',
      region_sido:data.restaurant.region_sido||'',region_sigungu:data.restaurant.region_sigungu||'',
      region_dong:data.restaurant.region_dong||'',
      latitude:data.restaurant.latitude===null?'':String(data.restaurant.latitude),
      longitude:data.restaurant.longitude===null?'':String(data.restaurant.longitude)});
    setAddressProof(data.restaurant.cms_origin?data.restaurant.cms_source_url||'':'');
    const chosen=data.locales.find(x=>x.locale===locale)||data.locales.find(x=>x.locale==='en');
    setDisplayName(chosen?.display_name||data.restaurant.name_ko);
    setIntro(chosen?.short_description||'');setFull(chosen?.full_description||'');
    setSource(chosen?.source_notes||'');
    setMenus([blankMenu()]);
    setChosenTags(data.tags.filter(t=>t.verification_state==='verified').map(t=>t.tag_code));
    const scheduled=emptyDays();
    if(data.hours.length){
      const rows=data.hours.filter(h=>h.weekday!==null&&h.start_minute!==null&&h.end_minute!==null);
      for(const d of scheduled){
        const entries=rows.filter(h=>h.weekday===d.weekday);
        if(entries.length){
          d.closed=false;d.open=minToTime(entries[0].start_minute!);
          d.close=minToTime(entries[entries.length-1].end_minute!);
          if(entries.length===2){
            d.breakStart=minToTime(entries[0].end_minute!);
            d.breakEnd=minToTime(entries[1].start_minute!);
          }
        }
      }
      setHoursEvidence(data.hours[0]?.source_url||'');
    }else setHoursEvidence('');
    setDays(scheduled);
    setNotice('식당 데이터 로드 완료. 변경할 항목만 배치에 추가해.');
   }catch(e){inform(e)}finally{setBusy(false)}
 };
 useEffect(()=>{if(edit)void search()},[edit,search]);
 useEffect(()=>{
   if(!edit)return;
   void json('/api/v1/owner/readiness').then(setReadiness).catch(()=>setReadiness(null));
 },[edit]);
 useEffect(()=>{
   const id=new URLSearchParams(window.location.search).get('restaurant');
   if(id&&/^[a-f0-9-]{36}$/i.test(id)&&edit)void select(id);
   // Intentional initial load only; no repeated account or selector requests.
   // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 useEffect(()=>{
   if(!selected)return;
   const found=selected.locales.find(x=>x.locale===locale);
   setDisplayName(found?.display_name||selected.restaurant.name_ko);
   setIntro(found?.short_description||'');setFull(found?.full_description||'');
   setSource(found?.source_notes||'');
   const m=selected.menus.filter(x=>x.locale===locale&&x.name).slice(0,20);
   setMenus(m.length?m.map((x,i)=>({
     key:x.menu_key,name:x.name||'',price:x.price_krw===null?'':String(x.price_krw),
     description:x.description||'',evidence:'',featured:i===0
   })):[blankMenu()]);
 },[locale,selected]);
 const loadBatches=async()=>{try{const r=await json('/api/v1/owner/bulk/batches?limit=30');setBatches(r.items)}catch(e){inform(e)}};
 const loadBatch=async(id:string)=>{try{const r=await json('/api/v1/owner/bulk/batches/'+id);setCurrentBatch(r);setBatchId(id)}catch(e){inform(e)}};
 const loadReviews=async()=>{try{const r=await json('/api/v1/owner/reviews?limit=50&status='+reviewStatus);setReviews(r.items)}catch(e){inform(e)}};
 useEffect(()=>{if(tab==='batches'&&edit)void loadBatches();if(tab==='reviews'&&moderate)void loadReviews()},[tab,edit,moderate,reviewStatus]);
 const makeBatch=async(items:Item[],title:string)=>{
   if(!items.length)throw Error('등록할 항목이 없어.');
   const made=await post('/api/v1/owner/bulk/batches',{client_key:'cms-'+crypto.randomUUID(),title});
   const id=made.id as string;
   for(let i=0;i<items.length;i+=50)
     await post('/api/v1/owner/bulk/batches/'+id+'/items',{items:items.slice(i,i+50)});
   setBatchId(id);setNotice('초안 '+id+' 등록 완료. [대량 작업·승인] 탭에서 내용을 검토하고 승인해.');
   await loadBatches();return id;
 };
 const buildItems=():Item[]=>{
   if(!selected)throw Error('식당을 선택해.');
   const id=selected.restaurant.id;
   const result:Item[]=[];const add=(kind:string,payload:Record<string,unknown>)=>
     result.push({source_key:'cms-'+crypto.randomUUID(),restaurant_id:id,kind,payload});
   const baseline={road_address_ko:selected.restaurant.road_address_ko||'',
     lot_address_ko:selected.restaurant.lot_address_ko||'',
     region_sido:selected.restaurant.region_sido||'',
     region_sigungu:selected.restaurant.region_sigungu||'',region_dong:selected.restaurant.region_dong||'',
     latitude:selected.restaurant.latitude===null?'':String(selected.restaurant.latitude),
     longitude:selected.restaurant.longitude===null?'':String(selected.restaurant.longitude)};
   const addressChanged=(Object.keys(baseline) as (keyof typeof baseline)[]).some(
     k=>address[k].trim()!==baseline[k].trim());
   if(addressChanged){
     if(!/^https:\/\//.test(addressProof))throw Error('주소 수정에는 HTTPS 확인 출처가 필요해.');
     const coords=(v:string,min:number,max:number)=>{
       if(!v.trim())return null;const n=Number(v);
       if(!Number.isFinite(n)||n<min||n>max)throw Error('위도·경도 값을 확인해.');
       return n;
     };
     const latitude=coords(address.latitude,33,39.5),longitude=coords(address.longitude,124,132);
     if((latitude===null)!==(longitude===null))throw Error('위도와 경도는 두 값 모두 입력하거나 모두 비워야 해.');
     add('address',{road_address_ko:address.road_address_ko.trim(),
       lot_address_ko:address.lot_address_ko.trim()||null,
       region_sido:address.region_sido.trim(),region_sigungu:address.region_sigungu.trim(),
       region_dong:address.region_dong.trim()||null,latitude,longitude,evidence_url:addressProof.trim()});
   }
   if(intro.trim()&&displayName.trim()){
     if(!source.trim())throw Error('소개 출처·검증 메모를 작성해.');
     add('localization',{locale,display_name:displayName.trim(),
       short_description:intro.trim(),full_description:full.trim()||null,source_notes:source.trim()});
   }
   for(const [mi,m] of menus.entries()){
     if(!m.name.trim())continue;
     if(!/^https:\/\//.test(m.evidence))throw Error('각 메뉴의 HTTPS 검증 출처가 필요해.');
     add('menu',{key:m.key.trim(),locale,name:m.name.trim(),
       description:m.description.trim()||null,price_krw:m.price===''?null:Number(m.price),
       position:m.featured?0:mi+1,evidence_ref:m.evidence.trim()});
   }
   const before=new Set(selected.tags.filter(x=>x.verification_state==='verified').map(x=>x.tag_code));
   for(const tag of chosenTags){
     if(!before.has(tag)){
       if(!/^https:\/\//.test(tagEvidence))throw Error('새 태그의 HTTPS 확인 출처가 필요해.');
       add('tag',{code:tag,enabled:true,evidence_ref:tagEvidence});
     }
   }
   for(const tag of before)if(!chosenTags.includes(tag))add('tag',{code:tag,enabled:false});
   if(hoursEvidence.trim()){
     const normalized=days.map(day=>{
       if(day.closed)return {weekday:day.weekday,intervals:[] as [number,number][]};
       const a=timeToMin(day.open),b=timeToMin(day.close);
       if(a>=b)throw Error(weekdays[day.weekday]+'요일: 종료시간은 시작시간보다 늦어야 해.');
       if(day.breakStart||day.breakEnd){
         if(!day.breakStart||!day.breakEnd)throw Error('브레이크타임 시작/끝 모두 입력해.');
         const x=timeToMin(day.breakStart),y=timeToMin(day.breakEnd);
         if(a>=x||x>=y||y>=b)throw Error('브레이크타임이 영업시간 안에 있어야 해.');
         return {weekday:day.weekday,intervals:[[a,x],[y,b]] as [number,number][]};
       }
       return {weekday:day.weekday,intervals:[[a,b]] as [number,number][]};
     });
     add('hours',{source_url:hoursEvidence.trim(),days:normalized});
   }
   if(publishNew){
     if(!selected.restaurant.cms_origin||selected.restaurant.publication_status!=='draft')
       throw Error('신규 수동 등록 식당만 게시 요청할 수 있어.');
     if(!/^https:\/\//.test(addressProof))throw Error('신규 식당의 게시 근거 URL을 입력해.');
     add('restaurant_publish',{evidence_url:addressProof.trim(),confirm_live:true});
   }
   return result;
 };
 const createRestaurant=async()=>{
   setBusy(true);
   try{
     const lat=newVenue.latitude.trim()?Number(newVenue.latitude):null;
     const lon=newVenue.longitude.trim()?Number(newVenue.longitude):null;
     if((lat===null)!==(lon===null))throw Error('위도와 경도를 함께 입력해.');
     const payload={...newVenue,lot_address_ko:newVenue.lot_address_ko.trim()||null,
       region_dong:newVenue.region_dong.trim()||null,latitude:lat,longitude:lon};
     const r=await post('/api/v1/owner/catalog',payload);
     setCreating(false);setQ(newVenue.name_ko);await select(r.restaurant_id);
     setNotice('신규 식당은 비공개 초안이야. 영어 소개·주소·좌표 검증 후 게시 요청해.');
   }catch(e){inform(e)}finally{setBusy(false)}
 };
 const save=async()=>{
   setBusy(true);setNotice('');
   try{await makeBatch(buildItems(),batchTitle.trim()||'Restaurant edit '+selected?.restaurant.name_ko);setTab('batches')}
   catch(e){inform(e)}finally{setBusy(false)}
 };
 const stageVisibility=async(kind:'visibility_hide'|'visibility_restore')=>{
   if(!selected)return;
   if(!window.confirm(kind==='visibility_hide'?'이 식당을 검색·지도에서 비공개 처리할 초안을 만들까?':'관리자 비공개 표시를 해제할 초안을 만들까?'))return;
   try{
     const payload=kind==='visibility_hide'?{
       evidence_ref:tagEvidence,evidence_summary:'Manually reviewed by the WhatEatO owner for catalog visibility. Confirmed hide requested.',
       confirm_hide:true
     }:{};
     await makeBatch([{source_key:'visibility-'+crypto.randomUUID(),restaurant_id:selected.restaurant.id,kind,payload}],
       'Visibility '+selected.restaurant.name_ko);
     setTab('batches');
   }catch(e){inform(e)}
 };
 const reviewAction=async(id:string,approve:boolean,hide=false)=>{
   const reason_code=approve?'approved_guidelines':hide?'other':reason;
   if(!window.confirm(approve?'실제 검토한 리뷰를 승인할까?':hide?'이미 게시된 리뷰를 비공개 처리할까?':'해당 리뷰를 거절할까?'))return;
   try{await post('/api/v1/owner/reviews/'+id,{decision:approve?'approve':hide?'hide':'reject',reason_code},'PATCH');
     setNotice('리뷰 처리 완료');await loadReviews()}catch(e){inform(e)}
 };
 const batchAction=async(action:string)=>{
   if(!batchId)return;
   if(['approve','apply','reject'].includes(action)&&!owner){setNotice('Owner 계정만 승인/게시할 수 있어.');return}
   if(!window.confirm(action==='apply'?'실제 게시 데이터가 변경돼. 선택한 배치의 20개 항목을 적용할까?':
      action==='approve'?'검수한 배치를 승인할까?':action+' 작업을 실행할까?'))return;
   try{
     setBusy(true);
     const result=await post('/api/v1/owner/bulk/batches/'+batchId+'/actions',{
       action,...(['approve','apply','reject'].includes(action)?{confirm_batch_id:batchId}:{})
     });
     setNotice('배치 상태: '+result.state+(result.chunk?' / 적용 '+result.chunk.applied+' / 실패 '+result.chunk.failed:''));
     await loadBatch(batchId);await loadBatches();
   }catch(e){inform(e)}finally{setBusy(false)}
 };
 const importFile=async()=>{
   if(!bulkFile||!batchId)throw Error('초안 배치와 NDJSON 파일을 선택해.');
   const data=await loadBatchSafe(batchId);
   if(data.batch.state!=='draft')throw Error('초안 배치에만 추가할 수 있어.');
   const text=await bulkFile.text();if(text.length>8_000_000)throw Error('파일이 너무 커. 8MB 이하로 나눠서 업로드해.');
   const rows=text.split(/\r?\n/).filter(x=>x.trim()).map(x=>JSON.parse(x));
   if(rows.length>10000)throw Error('한 배치당 최대 10,000건이야.');
   for(let i=0;i<rows.length;i+=50)await post('/api/v1/owner/bulk/batches/'+batchId+'/items',{items:rows.slice(i,i+50)});
   setImported(rows.length);setNotice(rows.length+'건의 데이터를 초안에 추가했어. 승인 전 검수해.');await loadBatch(batchId);
 };
 const loadBatchSafe=(id:string)=>json('/api/v1/owner/bulk/batches/'+id);
 const uploadPhoto=async()=>{
   if(!selected||!image)throw Error('식당과 사진을 선택해.');
   if(!rights)throw Error('사진 사용 권한을 확인해.');
   if(image.size>8*1024*1024)throw Error('8MB 이하 이미지만 업로드할 수 있어.');
   const form=new FormData();
   form.set('restaurant_id',selected.restaurant.id);
   form.set('file',image);form.set('source_reference',imageEvidence);
   form.set('rights_confirmation',rights?'yes':'no');form.set('rights_reference',rightsEvidence);
   form.set('position',String(photoRole==='cover'?0:imagePosition));
   form.set('photo_role',photoRole);
   const resp=await fetch('/api/v1/owner/media',{method:'POST',credentials:'same-origin',body:form});
   const result=await resp.json();
   if(!resp.ok)throw Error(result.error||'upload_failed');
   await select(selected.restaurant.id);
   setImageResult((photoRole==='cover'?'카드 대표사진':'상세 갤러리')+' 업로드 완료 · 검수 대기 '+result.image_id);
 };
 return <div>
   <header className={styles.hero}>
     <div><div className={styles.eyebrow}>WHAT EAT O / CONTROL ROOM</div>
       <h1>Restaurant CMS</h1>
       <p>Global First · English content priority · Public DESIGN LOCK</p></div>
     <span className={styles.badge}>권한: {role.toUpperCase()}</span>
   </header>
   {readiness&&<section className={styles.panel} aria-label="관리자 환경 연결 상태">
     <div className={styles.row}>
       <div><strong>관리자 시스템 연결</strong><p className={styles.note}>비밀키 값은 표시하지 않아.</p></div>
       <button className={styles.button+' '+styles.secondary} onClick={()=>void json('/api/v1/owner/readiness').then(setReadiness).catch(inform)}>다시 확인</button>
     </div>
     <div className={styles.chips}>
       {([['Neon DB',readiness.database_schema],['Google',readiness.google_session],
         ['대량 게시 API',readiness.bulk_api],['리뷰 검수',readiness.review_moderation],
         ['사진 저장소',readiness.photo_storage]] as const).map(([label,value])=>
         <span className={styles.chip} key={label}>{label} · {String(value)}</span>)}
     </div>
   </section>}
   <nav className={styles.tabs} aria-label="관리 탭">
     {(edit?[['restaurants','식당 편집'],['batches','대량 작업·승인']]:[]).concat(
       moderate?[['reviews','방문후기 검수']]:[]
     ).map(([key,label])=><button key={key} aria-selected={tab===key} onClick={()=>{setTab(key as Tab);setNotice('')}}>{label}</button>)}
   </nav>
   {notice&&<div className={styles.status} role="status">{notice}</div>}
   {tab==='restaurants'&&edit&&<div className={styles.split}>
     <section className={styles.panel}>
       <h2>식당 검색</h2><p className={styles.note}>기존 원본 식당 ID를 유지하며 콘텐츠만 수정해.</p>
       <label className={styles.field}>상호명 / 지역 / UUID
         <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Myeongdong / 광화문 / UUID"/>
       </label>
       <div className={styles.actions}><button className={styles.button} onClick={()=>void search()}>검색</button></div>
       <div className={styles.cardList}>{matches.map(x=><button className={styles.pick} key={x.id}
         aria-pressed={selected?.restaurant.id===x.id} onClick={()=>void select(x.id)}>
         <strong>{x.name_ko}</strong><small>{x.region_sigungu||''} · {x.road_address_ko||'주소 미등록'}</small>
       </button>)}</div>
       {cursor&&<button className={styles.button+' '+styles.secondary} onClick={()=>void search(cursor)}>다음 25곳</button>}
       <div className={styles.actions}><button className={styles.button+' '+styles.secondary}
         onClick={()=>setCreating(x=>!x)}>{creating?'입력 닫기':'+ 식당 새 추가'}</button></div>
       {creating&&<div className={styles.panel}>
         <h3>신규 식당 등록 · 비공개 초안</h3>
         <p className={styles.note}>동일 상호와 주소는 중복 등록할 수 없어. 검수 전 검색·지도에 표시되지 않아.</p>
         {([
           ['name_ko','상호명 (한국어)',120],['road_address_ko','도로명 주소',250],
           ['lot_address_ko','지번 주소 (선택)',250],['region_sido','시/도',80],
           ['region_sigungu','시/군/구',90],['region_dong','동 (선택)',90],
           ['latitude','위도 (33~39.5)',18],['longitude','경도 (124~132)',18],
           ['source_url','식당 확인 출처 HTTPS',700]
         ] as const).map(([key,label,max])=><label key={key} className={styles.field}>{label}
           <input maxLength={max} value={newVenue[key]} onChange={e=>setNewVenue(p=>({...p,[key]:e.target.value}))}/>
         </label>)}
         <p className={styles.note}>좌표가 없어도 초안 등록은 가능해. 공개하려면 정확한 좌표가 필요해.</p>
         <button className={styles.button} disabled={busy} onClick={()=>void createRestaurant()}>비공개 식당 초안 만들기</button>
       </div>}
     </section>
     <section className={styles.panel}>
       <h2>식당 콘텐츠 작성</h2>
       {!selected?<p className={styles.note}>왼쪽에서 식당을 선택하면 기존 등록 데이터를 불러와.</p>:<>
         <div className={styles.row}><div><strong>{selected.restaurant.name_ko}</strong>
           <div className={styles.code}>{selected.restaurant.id}</div></div>
           <span className={styles.badge}>{selected.restaurant.publication_status}</span></div>
         <h3>주소 수정</h3>
         <p className={styles.note}>주소는 검수·승인 후 적용돼. 위치를 바꾼다면 위도·경도도 수정해. 좌표가 없으면 기존 지도 핀을 삭제해.</p>
         <div className={styles.grid}>
           {([
             ['road_address_ko','도로명 주소',250],['lot_address_ko','지번 주소',250],
             ['region_sido','시/도',80],['region_sigungu','시/군/구',90],
             ['region_dong','동',90],['latitude','위도',18],['longitude','경도',18]
           ] as const).map(([key,label,max])=><label key={key} className={styles.field}>{label}
             <input value={address[key]} maxLength={max}
               onChange={e=>setAddress(p=>({...p,[key]:e.target.value}))}/>
           </label>)}
         </div>
         <label className={styles.field}>주소 변경·신규 게시 검증 출처 HTTPS
           <input type="url" maxLength={700} value={addressProof}
             onChange={e=>setAddressProof(e.target.value)} placeholder="https://..."/></label>
         <h3>다국어 소개</h3>
         <div className={styles.grid}>
           <label className={styles.field}>작성 언어
             <select value={locale} onChange={e=>setLocale(e.target.value as typeof locale)}>
               {locales.map(v=><option value={v} key={v}>{v}</option>)}
             </select></label>
           <label className={styles.field}>상호명 · 최대 45자
             <input maxLength={45} value={displayName} onChange={e=>setDisplayName(e.target.value)}/></label>
         </div>
         <label className={styles.field}>짧은 소개 · 15~150자
           <textarea maxLength={150} value={intro} onChange={e=>setIntro(e.target.value)}/></label>
         <p className={styles.small}>{intro.length} / 150자</p>
         <label className={styles.field}>상세 소개 · 최대 1,200자
           <textarea maxLength={1200} value={full} onChange={e=>setFull(e.target.value)}/></label>
         <label className={styles.field}>출처 / 검증 기록
           <input maxLength={700} value={source} onChange={e=>setSource(e.target.value)} placeholder="확인 출처 또는 편집 근거"/></label>
         <h3>대표 메뉴</h3>
         {menus.map((m,i)=><div className={styles.panel} key={i}>
           <div className={styles.grid}>
             <label className={styles.field}>메뉴 식별키 (영문/숫자, 기존키 재사용)
               <input maxLength={64} value={m.key} onChange={e=>setMenus(old=>old.map((x,n)=>n===i?{...x,key:e.target.value}:x))}/></label>
             <label className={styles.field}>메뉴명 · 최대 24자
               <input maxLength={24} value={m.name} onChange={e=>setMenus(old=>old.map((x,n)=>n===i?{...x,name:e.target.value}:x))}/></label>
             <label className={styles.field}>가격 KRW (선택)
               <input type="number" min={0} max={100000000} value={m.price} onChange={e=>setMenus(old=>old.map((x,n)=>n===i?{...x,price:e.target.value}:x))}/></label>
             <label className={styles.field}>메뉴 설명
               <input maxLength={140} value={m.description} onChange={e=>setMenus(old=>old.map((x,n)=>n===i?{...x,description:e.target.value}:x))}/></label>
           </div>
           <label className={styles.field}>메뉴 검증 출처 HTTPS
             <input type="url" value={m.evidence} onChange={e=>setMenus(old=>old.map((x,n)=>n===i?{...x,evidence:e.target.value}:x))}/></label>
           <label className={styles.chip}><input type="radio" checked={m.featured}
              onChange={()=>setMenus(a=>a.map((x,n)=>({...x,featured:n===i})))}/> 대표메뉴 · 카드에 우선 표시</label>
           <button className={styles.button+' '+styles.danger} onClick={()=>setMenus(a=>a.filter((_,n)=>n!==i))}>메뉴 줄 제거</button>
         </div>)}
         <div className={styles.actions}><button className={styles.button+' '+styles.secondary} onClick={()=>setMenus(a=>[...a,blankMenu()])}>+ 메뉴 추가</button></div>
         <h3>Tag</h3>
         <div className={styles.chips}>{tags.map(t=><label key={t} className={styles.chip}>
           <input type="checkbox" checked={chosenTags.includes(t)} onChange={e=>setChosenTags(a=>e.target.checked?[...a,t]:a.filter(x=>x!==t))}/> {t}
         </label>)}</div>
         <label className={styles.field}>새 태그 검증 출처 (또는 비공개 사유 근거 URL)
           <input type="url" value={tagEvidence} onChange={e=>setTagEvidence(e.target.value)}/></label>
         <h3>월~일 영업시간 · KST</h3><p className={styles.note}>일요일부터 토요일까지 저장되며, 브레이크타임은 선택사항이야. 24시 이후 영업은 별도 검증이 필요해.</p>
         {days.map(d=><div key={d.weekday} className={styles.day}>
           <strong>{weekdays[d.weekday]}</strong>
           <input type="time" aria-label={weekdays[d.weekday]+' 오픈'} disabled={d.closed} value={d.open}
             onChange={e=>setDays(a=>a.map(x=>x.weekday===d.weekday?{...x,open:e.target.value}:x))}/>
           <input type="time" aria-label={weekdays[d.weekday]+' 마감'} disabled={d.closed} value={d.close}
             onChange={e=>setDays(a=>a.map(x=>x.weekday===d.weekday?{...x,close:e.target.value}:x))}/>
           <label className={styles.small}><input type="checkbox" checked={d.closed} onChange={e=>setDays(a=>a.map(x=>x.weekday===d.weekday?{...x,closed:e.target.checked}:x))}/> 휴무</label>
           {!d.closed&&<div className={styles.grid} style={{gridColumn:'2 / -1'}}>
             <label className={styles.field}>브레이크 시작<input type="time" value={d.breakStart} onChange={e=>setDays(a=>a.map(x=>x.weekday===d.weekday?{...x,breakStart:e.target.value}:x))}/></label>
             <label className={styles.field}>브레이크 종료<input type="time" value={d.breakEnd} onChange={e=>setDays(a=>a.map(x=>x.weekday===d.weekday?{...x,breakEnd:e.target.value}:x))}/></label>
           </div>}
         </div>)}
         <label className={styles.field}>영업시간 검증 출처 HTTPS (기입한 경우에만 변경)
           <input type="url" value={hoursEvidence} onChange={e=>setHoursEvidence(e.target.value)}/></label>
         {selected.restaurant.cms_origin&&selected.restaurant.publication_status==='draft'&&owner&&
           <label className={styles.chip}><input type="checkbox" checked={publishNew}
             onChange={e=>setPublishNew(e.target.checked)}/>
             신규 식당 공개 승인 요청 (영어 소개·주소·좌표 확인 필요)
           </label>}
         <h3>게시 준비</h3>
         <label className={styles.field}>작업 이름
           <input value={batchTitle} onChange={e=>setBatchTitle(e.target.value)} placeholder="2026-10 Seoul content update"/></label>
         <div className={styles.actions}>
           <button className={styles.button} onClick={()=>void save()} disabled={busy}>초안 저장 · 검수 대기</button>
           <button className={styles.button+' '+styles.danger} onClick={()=>void stageVisibility('visibility_hide')}>비공개 초안</button>
           <button className={styles.button+' '+styles.secondary} onClick={()=>void stageVisibility('visibility_restore')}>비공개 해제 초안</button>
         </div>
         <p className={styles.note}>저장은 곧 공개가 아니야. 배치 승인 후에만 검색·상세·지도 데이터에 반영돼.</p>
         <section className={styles.panel} aria-label="사진 관리">
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
   </section>
       </>}
     </section>
   </div>}
   {tab==='batches'&&edit&&<div className={styles.split}>
     <section className={styles.panel}>
       <h2>작업 대기열</h2><div className={styles.actions}><button className={styles.button+' '+styles.secondary} onClick={()=>void loadBatches()}>새로고침</button></div>
       <div className={styles.cardList}>{batches.map(b=><button key={b.id} className={styles.pick}
         aria-pressed={batchId===b.id} onClick={()=>void loadBatch(b.id)}>
         <strong>{b.title}</strong><small>{b.state} · {b.total}건 / 적용 {b.applied} / 실패 {b.failed}</small>
         <small className={styles.code}>{b.id}</small>
       </button>)}</div>
     </section>
     <section className={styles.panel}>
       <h2>배치 검수 및 게시</h2>
       <p className={styles.note}>최대 10,000건씩 관리하고 20건씩 실행해. 실패 건은 로그에 남고 정상 건은 유지돼.</p>
       <label className={styles.field}>배치 ID
         <input value={batchId} onChange={e=>setBatchId(e.target.value)}/></label>
       <div className={styles.actions}><button className={styles.button+' '+styles.secondary} onClick={()=>void loadBatch(batchId)}>조회</button></div>
       {currentBatch&&<><div className={styles.row}>
         <strong>{currentBatch.batch.title}</strong><span className={styles.badge}>{currentBatch.batch.state}</span></div>
         <p className={styles.small}>전체 {currentBatch.batch.total} · 대기 {currentBatch.batch.pending} · 적용 {currentBatch.batch.applied} · 실패 {currentBatch.batch.failed}</p>
         <div className={styles.table}><table><thead><tr><th>ID</th><th>식당</th><th>변경</th><th>상태</th></tr></thead><tbody>
           {currentBatch.items.map((x:any)=><tr key={x.id}><td className={styles.code}>{x.id}</td>
             <td className={styles.code}>{x.restaurant_id}</td><td><details><summary>{x.kind} · 변경 내용 보기</summary>
               <pre className={styles.payloadPreview}>{JSON.stringify(x.payload,null,2)}</pre>
             </details></td><td>{x.state} {x.error_code||''}</td></tr>)}
         </tbody></table></div>
         <div className={styles.actions}>
           <button disabled={busy||currentBatch.batch.state!=='draft'} className={styles.button} onClick={()=>void batchAction('submit')}>검수 요청</button>
           <button disabled={busy||!owner||currentBatch.batch.state!=='review'} className={styles.button} onClick={()=>void batchAction('approve')}>승인</button>
           <button disabled={busy||!owner||!['approved','processing'].includes(currentBatch.batch.state)} className={styles.button} onClick={()=>void batchAction('apply')}>20건 게시 실행</button>
           <button disabled={busy||!owner||currentBatch.batch.state!=='review'} className={styles.button+' '+styles.danger} onClick={()=>void batchAction('reject')}>반려</button>
           <button disabled={busy||!['draft','review'].includes(currentBatch.batch.state)} className={styles.button+' '+styles.secondary} onClick={()=>void batchAction('cancel')}>취소</button>
         </div>
         <h3>최근 변경 기록</h3>{currentBatch.recent_audit?.map((x:any)=><p key={x.id} className={styles.small}>{x.created_at} · {x.action} {x.reason_code||''}</p>)}
       </>}
       <h3>대량 파일 등록</h3>
       <p className={styles.note}>JSON 한 줄에 한 항목인 NDJSON 파일. 먼저 초안 배치를 만들고 파일을 등록해. 최종 승인은 별도로 진행돼.</p>
       <label className={styles.field}>새 초안 이름<input value={batchTitle} onChange={e=>setBatchTitle(e.target.value)} placeholder="Bulk upload"/></label>
       <button className={styles.button+' '+styles.secondary} onClick={()=>void(async()=>{
          try{const made=await post('/api/v1/owner/bulk/batches',
            {client_key:'cms-'+crypto.randomUUID(),title:batchTitle||'Bulk import'});
            setBatchId(made.id);setNotice('빈 초안 '+made.id+' 생성 완료');await loadBatches()}
          catch(e){inform(e)}
        })()}>빈 초안 만들기</button>
       <p className={styles.small}>빈 초안은 게시할 수 없어. 검증된 항목을 추가한 뒤 검수 요청해.</p>
       <label className={styles.field}>파일 선택<input type="file" accept=".ndjson,.jsonl,application/x-ndjson" onChange={e=>setBulkFile(e.target.files?.[0]||null)}/></label>
       <button className={styles.button} disabled={!bulkFile||!batchId||busy} onClick={()=>void(async()=>{setBusy(true);try{await importFile()}catch(e){inform(e)}finally{setBusy(false)}})()}>파일을 배치에 추가</button>
     </section>
   </div>}
   {tab==='reviews'&&moderate&&<section className={styles.panel}>
     <div className={styles.row}><h2>방문후기 관리</h2><button className={styles.button+' '+styles.secondary} onClick={()=>void loadReviews()}>새로고침</button></div>
     <label className={styles.field}>보기<select value={reviewStatus} onChange={e=>setReviewStatus(e.target.value as typeof reviewStatus)}>
       <option value="pending">승인 대기</option><option value="published">게시 중</option><option value="rejected">거절·숨김</option>
     </select></label>
     <label className={styles.field}>거절 사유<select value={reason} onChange={e=>setReason(e.target.value)}>
       {['spam','abusive','personal_data','off_topic','unverifiable_claim','other'].map(v=><option key={v} value={v}>{v}</option>)}
     </select></label>
     {!reviews.length&&<p className={styles.note}>대기 중인 후기가 없어.</p>}
     {reviews.map(r=><article key={r.id} className={styles.panel}>
       <div className={styles.row}><strong>{r.restaurant_name}</strong><span className={styles.badge}>★ {r.rating}</span></div>
       <p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{r.body}</p>
       <div className={styles.small}>{r.created_at} · ID: {r.id}</div>
       <div className={styles.actions}>
         {reviewStatus==='pending'&&<><button className={styles.button} onClick={()=>void reviewAction(r.id,true)}>검토 후 승인</button>
         <button className={styles.button+' '+styles.danger} onClick={()=>void reviewAction(r.id,false)}>거절</button></>}
         {reviewStatus==='published'&&<button className={styles.button+' '+styles.danger}
           onClick={()=>void reviewAction(r.id,false,true)}>게시된 후기 숨김</button>}
       </div>
     </article>)}
   </section>}
   
 </div>;
}
