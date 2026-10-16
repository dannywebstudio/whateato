type Locale='ko'|'en'|'ja'|'zh-CN';
const labels={
 ko:{editorial:'WhatEatO 평점',visitor:'방문후기 평점',pending:'평점 준비 중'},
 en:{editorial:'WhatEatO rating',visitor:'Visitor rating',pending:'Ratings pending'},
 ja:{editorial:'WhatEatO評価',visitor:'来店レビュー評価',pending:'評価準備中'},
 'zh-CN':{editorial:'WhatEatO评分',visitor:'到店评价评分',pending:'评分待更新'}
} as const;
export default function RatingPair({editorial,visitor,locale='ko',compact=false}:{
 editorial:number|null|undefined;visitor:number|null|undefined;locale?:string;compact?:boolean
}){
 const t=labels[(locale in labels?locale:'en') as Locale];
 const valid=(v:number|null|undefined)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=5;
 const scores=[valid(editorial)?{title:t.editorial,value:editorial!}:null,
  valid(visitor)?{title:t.visitor,value:visitor!}:null].filter((x):x is {title:string;value:number}=>x!==null);
 if(!scores.length)return <span>{t.pending}</span>;
 return <span style={{display:'inline-flex',flexWrap:'wrap',gap:compact?'4px 9px':'8px 15px',alignItems:'center'}}>
  {scores.map(score=><span key={score.title} style={{whiteSpace:'nowrap',fontSize:compact?11:13}}>
   <span style={{fontWeight:650}}>{score.title}</span> <span aria-hidden="true" style={{color:'#cb961d'}}>★</span> <b>{score.value.toFixed(1)}</b>
  </span>)}
 </span>;
}
