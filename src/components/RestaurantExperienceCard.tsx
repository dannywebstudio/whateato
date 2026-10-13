import {cuisineColor,cuisineKey,cuisinePalette} from '@/lib/cuisine-palette';
import Link from 'next/link';
type Props={name:string;address?:string|null;description?:string|null;menu?:string|null;
 href:string;locale:string;category?:string|null;variant?:'search'|'map';status?:'open'|'closed'|'unknown';
 hours?:string|null;rating?:number|null;tags?:string[];imageUrl?:string|null;
 onMapClick?:()=>void;mapButtonLabel?:string};
const copy={
 ko:{menu:'대표 메뉴',details:'상세 보기',map:'지도에서 보기',open:'영업중',closed:'영업종료',unknown:'영업시간 확인 전',rating:'평점 준비 중',photo:'사진 준비 중'},
 en:{menu:'Signature dish',details:'View details',map:'See on map',open:'Open now',closed:'Closed',unknown:'Hours unverified',rating:'Rating pending',photo:'Photo coming soon'},
 ja:{menu:'代表メニュー',details:'詳しく見る',map:'地図で見る',open:'営業中',closed:'営業時間外',unknown:'営業時間未確認',rating:'評価未確認',photo:'写真準備中'},
 'zh-CN':{menu:'招牌菜',details:'查看详情',map:'地图定位',open:'营业中',closed:'已打烊',unknown:'营业时间未核实',rating:'暂无评分',photo:'照片准备中'}
} as const;
export default function RestaurantExperienceCard({name,address,description,menu,href,locale,category,variant='search',status='unknown',hours,rating,tags=[],imageUrl,onMapClick,mapButtonLabel}:Props){
 const t=copy[locale as keyof typeof copy]||copy.ko;
 const accent=cuisineColor(category);
 const cuisine=cuisinePalette[cuisineKey(category)].label;
 return <article style={{'--cuisine-accent':accent} as React.CSSProperties} className={'we-card we-card-'+variant+(variant==='map'?' result map-restaurant-card':' restaurant-card')}>
   <div className="we-card-visual">{imageUrl?<img src={imageUrl} alt={name} loading="lazy"/>:<div className="we-card-fallback" role="img" aria-label={t.photo}><span>{t.photo}</span></div>}<span className="we-card-category">{cuisine}</span></div>
   <div className="we-card-body"><div className="we-card-head"><h3><Link href={href}>{name}</Link></h3><span className={'status-pill '+(status==='open'?'is-open':status==='closed'?'is-closed':'')}>{t[status]}</span></div>
   {description&&<p className="we-card-desc">{description}</p>}
   <div className="we-card-information">{menu&&<div className="we-card-menu-row"><p><span>◈</span><b>{t.menu}</b> {menu}</p>{variant==='map'&&<div className="we-card-tags"><span className="we-cuisine-tag">{cuisine}</span>{tags.filter(tag=>tag!==cuisine).slice(0,2).map(tag=><span key={tag}>{tag}</span>)}</div>}</div>}{hours&&<p><span>◷</span>{hours}</p>}{address&&<p><span>⌖</span>{address}</p>}</div>
   <div className="we-card-bottom"><span className="we-card-rating">{rating!==null&&rating!==undefined?'★ '+rating.toFixed(1):t.rating}</span><div className="we-card-actions">{onMapClick&&<button type="button" onClick={onMapClick} className="we-map-button map-card-locate" aria-label={mapButtonLabel||t.map}>{t.map}</button>}<Link href={href} className="we-card-visit">{t.details} <span aria-hidden="true">↗</span></Link></div></div>
   {variant!=='map'&&<div className="we-card-tags"><span className="we-cuisine-tag">{cuisine}</span>{tags.filter(tag=>tag!==cuisine).slice(0,3).map(tag=><span key={tag}>{tag}</span>)}</div>}
   </div>
 </article>;
}
