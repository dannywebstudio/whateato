'use client';
import type {Dispatch,SetStateAction} from 'react';
import type {Place,Detail,Menu,Day} from './modules/types';
import {tags,locales,weekdays,blankMenu} from './modules/restaurants';
import MediaPanel from './MediaPanel';
import styles from './admin.module.css';
type Locale=typeof locales[number];
type Venue={name_ko:string;road_address_ko:string;lot_address_ko:string;region_sido:string;region_sigungu:string;region_dong:string;latitude:string;longitude:string;source_url:string};
type Address=Omit<Venue,'name_ko'|'source_url'>;
type Props={owner:boolean;
 busy:boolean;
 q:string;
 matches:Place[];
 selected:Detail|null;
 cursor:string|null;
 creating:boolean;
 newVenue:Venue;
 publicEvidence:string;
 locale:Locale;
 displayName:string;
 intro:string;
 full:string;
 source:string;
 menus:Menu[];
 chosenTags:string[];
 tagEvidence:string;
 days:Day[];
 hoursEvidence:string;
 address:Address;
 addressProof:string;
 publishNew:boolean;
 photoRole:'cover'|'gallery';
 image:File|null;
 rights:boolean;
 imageEvidence:string;
 rightsEvidence:string;
 imagePosition:number;
 imageResult:string;
 batchTitle:string;
 edit:boolean;
 setQ:Dispatch<SetStateAction<string>>;
 setCreating:Dispatch<SetStateAction<boolean>>;
 setNewVenue:Dispatch<SetStateAction<Venue>>;
 setPublicEvidence:Dispatch<SetStateAction<string>>;
 setLocale:Dispatch<SetStateAction<Locale>>;
 setDisplayName:Dispatch<SetStateAction<string>>;
 setIntro:Dispatch<SetStateAction<string>>;
 setFull:Dispatch<SetStateAction<string>>;
 setSource:Dispatch<SetStateAction<string>>;
 setMenus:Dispatch<SetStateAction<Menu[]>>;
 setChosenTags:Dispatch<SetStateAction<string[]>>;
 setTagEvidence:Dispatch<SetStateAction<string>>;
 setDays:Dispatch<SetStateAction<Day[]>>;
 setHoursEvidence:Dispatch<SetStateAction<string>>;
 setAddress:Dispatch<SetStateAction<Address>>;
 setAddressProof:Dispatch<SetStateAction<string>>;
 setPublishNew:Dispatch<SetStateAction<boolean>>;
 setPhotoRole:Dispatch<SetStateAction<'cover'|'gallery'>>;
 setImage:Dispatch<SetStateAction<File|null>>;
 setRights:Dispatch<SetStateAction<boolean>>;
 setImageEvidence:Dispatch<SetStateAction<string>>;
 setRightsEvidence:Dispatch<SetStateAction<string>>;
 setImagePosition:Dispatch<SetStateAction<number>>;
 setBusy:Dispatch<SetStateAction<boolean>>;
 setBatchTitle:Dispatch<SetStateAction<string>>;
 search:(after?:string)=>Promise<void>;
 select:(id:string)=>Promise<void>;
 createRestaurant:()=>Promise<void>;
 changePublicApproval:(action:'approve'|'revoke')=>Promise<void>;
 save:()=>Promise<void>;
 stageVisibility:(kind:'visibility_hide'|'visibility_restore')=>Promise<void>;
 inform:(error:unknown)=>void;
 uploadPhoto:()=>Promise<void>};
export default function RestaurantPanel({owner,busy,q,matches,selected,cursor,creating,newVenue,publicEvidence,locale,displayName,intro,full,source,menus,chosenTags,tagEvidence,days,hoursEvidence,address,addressProof,publishNew,photoRole,image,rights,imageEvidence,rightsEvidence,imagePosition,imageResult,batchTitle,edit,setQ,setCreating,setNewVenue,setPublicEvidence,setLocale,setDisplayName,setIntro,setFull,setSource,setMenus,setChosenTags,setTagEvidence,setDays,setHoursEvidence,setAddress,setAddressProof,setPublishNew,setPhotoRole,setImage,setRights,setImageEvidence,setRightsEvidence,setImagePosition,setBusy,setBatchTitle,search,select,createRestaurant,changePublicApproval,save,stageVisibility,inform,uploadPhoto}:Props){return (<div className={styles.split}>
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
         {owner&&<section className={styles.panel} aria-label="검색 및 Sitemap 공개 승인">
           <h3>검색·지도·Sitemap 공개 승인 (Owner 전용)</h3>
           <p className={styles.note}>공개는 별도의 Owner 최종 승인 이후에만 가능해. 식당 콘텐츠 저장·배치 게시만으로 자동 공개되지 않아.</p>
           <p><strong>현재 공개 상태: {selected.restaurant.public_approved?'공개 승인됨':'비공개'}</strong></p>
           <label className={styles.field}>직접 확인한 공개 승인 근거 (HTTPS URL)
             <input type="url" maxLength={700} value={publicEvidence}
               onChange={e=>setPublicEvidence(e.target.value)} placeholder="https://..."/>
           </label>
           <div className={styles.actions}>
             {!selected.restaurant.public_approved
               ?<button className={styles.button} disabled={busy||selected.restaurant.publication_status!=='published'}
                   onClick={()=>void changePublicApproval('approve')}>검증 완료 · 공개 승인</button>
               :<button className={styles.button+' '+styles.danger} disabled={busy}
                   onClick={()=>void changePublicApproval('revoke')}>공개 취소 · Sitemap 제외</button>}
           </div>
           <p className={styles.note}>공개 승인 전에 4개 언어 중 한국어·영어 소개, 메뉴·태그, 위치, 출처가 있는 영업시간, 품질 보류 여부를 서버가 재검증해. 기존 DB 식당은 자동 승인되지 않아.</p>
         </section>}
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
         <MediaPanel selected={selected} owner={owner} busy={busy} image={image} setImage={setImage} rights={rights} setRights={setRights} photoRole={photoRole} setPhotoRole={setPhotoRole} imagePosition={imagePosition} setImagePosition={setImagePosition} imageEvidence={imageEvidence} setImageEvidence={setImageEvidence} rightsEvidence={rightsEvidence} setRightsEvidence={setRightsEvidence} imageResult={imageResult} setBusy={setBusy} uploadPhoto={uploadPhoto} inform={inform} select={select}/>
       </>}
     </section>
   </div>);}
