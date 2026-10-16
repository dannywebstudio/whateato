'use client';
import {useState} from 'react';
const labels={ko:'한국어',en:'English',ja:'日本語','zh-CN':'中文'} as const;
type Lang=keyof typeof labels;
export default function RestaurantNameSwitcher({names,koreanName,initialLocale}:{names:Partial<Record<Lang,string>>;koreanName:string;initialLocale:string}){
 const [active,setActive]=useState<Lang>((initialLocale in labels?initialLocale:'ko') as Lang);
 const visible=names[active]?.trim()||koreanName;
 return <div style={{minWidth:0}}>
  <div style={{display:'flex',alignItems:'baseline',flexWrap:'wrap',gap:'6px 12px'}}>
   <h1 style={{margin:0,overflowWrap:'anywhere'}}>{visible}</h1>
   <nav aria-label="Restaurant name language" style={{display:'inline-flex',gap:4,flexWrap:'wrap'}}>
    {(Object.keys(labels) as Lang[]).map(lang=><button key={lang} type="button"
     aria-pressed={active===lang} onClick={()=>setActive(lang)}
     style={{fontSize:11,padding:'4px 7px',borderRadius:7,cursor:'pointer',
      border:'1px solid '+(active===lang?'#178054':'#d4e3d9'),
      background:active===lang?'#e8f6ed':'white',color:'#235841'}}>
     {labels[lang]}</button>)}
   </nav>
  </div>
  {visible!==koreanName&&<p style={{fontSize:13,fontWeight:700,color:'#536a5b',margin:'5px 0 0'}}>
   <span aria-label="Original Korean sign name">한국 현지 간판명</span> · {koreanName}
  </p>}
 </div>;
}
