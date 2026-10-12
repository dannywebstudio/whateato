'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import type {Map as MapLibreMap,GeoJSONSource} from 'maplibre-gl';

// Map data is ALWAYS fetched from WhatEatO. The base map style uses MapTiler
// ONLY after an origin-restricted, properly licensed public browser key exists.
// Without a configured key the component displays an honest offline state.
type Place={
  id:string;name:string;address_ko:string|null;latitude:number;longitude:number;
  editorial_score:number|null;region_sigungu:string|null;tags:{code:string;label:string}[];
};
type Response={items:Place[];has_more:boolean;location_note:string};
type Feature={
  type:'Feature';geometry:{type:'Point';coordinates:[number,number]};
  properties:{id:string;name:string};
};
type FeatureCollection={type:'FeatureCollection';features:Feature[]};
const STYLE_BASE='https://api.maptiler.com/maps/streets-v4/style.json';
const key=(process.env.NEXT_PUBLIC_MAPTILER_API_KEY||'').trim();
const available=/^[a-zA-Z0-9_-]{12,160}$/.test(key);
const markerSource='whateato-approved-restaurants';
const markerLayer='whateato-location-markers';
const emptyData:FeatureCollection={type:'FeatureCollection',features:[]};
const bboxQuery=(map:MapLibreMap)=>{
  const b=map.getBounds();
  const bounds=[b.getSouth(),b.getWest(),b.getNorth(),b.getEast()];
  if(bounds.some(v=>!Number.isFinite(v)))return null;
  // Server caps bbox at 1.5 degrees, and disallows out-of-Korea input.
  if(bounds[2]-bounds[0]>1.5||bounds[3]-bounds[1]>1.5)return null;
  if(bounds[0]<33||bounds[2]>39.5||bounds[1]<124||bounds[3]>132)return null;
  return bounds.map(v=>v.toFixed(6)).join(',');
};
function localizedCopy(locale:string){
  switch(locale){
    case 'en':return {disabled:'Interactive maps require an approved map-provider key. Restaurant search remains available.',loading:'Loading restaurant markers…',error:'Map markers could not be loaded.',zoom:'Zoom into central Seoul to load restaurant locations.',count:'Locations in map area',limit:'Only the first 200 matching locations are shown. Zoom in for more.',open:'Restaurant details',license:'Map locations come from permit records and do not confirm current operation.',empty:'No matching public restaurant locations in this map area.'};
    case 'ja':return {disabled:'地図プロバイダーのキーがまだ設定されていません。店舗検索は利用できます。',loading:'店舗の位置を読み込み中…',error:'地図上の店舗を取得できませんでした。',zoom:'ソウル中心部へ拡大してください。',count:'表示中の店舗',limit:'最大200件を表示しています。さらに拡大してください。',open:'店舗情報',license:'場所は営業許可記録に基づき、現在の営業状況を保証しません。',empty:'該当する店舗が見つかりません。'};
    case 'zh-CN':return {disabled:'尚未配置授权的地图服务密钥。餐厅搜索仍可使用。',loading:'正在加载餐厅位置…',error:'无法加载地图上的餐厅。',zoom:'请放大至首尔市中心。',count:'地图区域内的餐厅',limit:'最多显示200家餐厅，请放大地图查看更多。',open:'餐厅详情',license:'位置来自许可证资料，不代表当前营业。',empty:'地图区域内没有符合条件的餐厅。'};
    default:return {disabled:'지도 제공자 사용 권한과 API 키를 설정한 뒤 지도가 표시됩니다. 식당 검색은 계속 이용할 수 있어요.',loading:'식당 위치 불러오는 중…',error:'지도 식당 정보를 가져오지 못했어요.',zoom:'서울 중심 지역을 확대하면 식당 위치를 불러옵니다.',count:'현재 지도 내 식당',limit:'최대 200곳을 표시하고 있어요. 더 자세히 보려면 지도를 확대해 주세요.',open:'식당 상세 보기',license:'위치는 인허가 자료 기준이며 현재 영업 여부나 정확한 입구를 보장하지 않습니다.',empty:'현재 지도 영역에서 조건에 맞는 식당이 없어요.'};
  }
}
export default function RestaurantMap({q='',filter='',locale='ko'}:{
  q?:string;filter?:string;locale?:string;
}){
  const ui=localizedCopy(locale);
  const host=useRef<HTMLDivElement>(null);
  const map=useRef<MapLibreMap|null>(null);
  const lastRequest=useRef<AbortController|null>(null);
  const requestId=useRef(0);
  const queryRef=useRef({q,filter,locale});
  const [items,setItems]=useState<Place[]>([]);
  const [state,setState]=useState<'disabled'|'loading'|'zoom'|'ready'|'error'>(available?'loading':'disabled');
  const [limited,setLimited]=useState(false);
  const [selected,setSelected]=useState<string|null>(null);
  queryRef.current={q,filter,locale};
  const load=useCallback(async (currentMap:MapLibreMap)=>{
    if(!currentMap.isStyleLoaded())return;
    const bbox=bboxQuery(currentMap);
    lastRequest.current?.abort();
    const next=++requestId.current;
    if(!bbox){
      setItems([]);setLimited(false);setState('zoom');
      const source=currentMap.getSource(markerSource) as GeoJSONSource|undefined;
      source?.setData(emptyData);
      return;
    }
    const controller=new AbortController();
    lastRequest.current=controller;
    setState('loading');
    const p=new URLSearchParams({bbox,limit:'200',hl:queryRef.current.locale});
    if(queryRef.current.q)p.set('q',queryRef.current.q);
    if(queryRef.current.filter)p.set('f',queryRef.current.filter);
    try{
      const response=await fetch('/api/v1/map/markers?'+p.toString(),{
        signal:controller.signal,cache:'no-store',credentials:'same-origin'
      });
      if(!response.ok)throw Error('Marker service unavailable');
      const payload=await response.json() as Response;
      if(!Array.isArray(payload.items))throw Error('Unexpected marker response');
      if(next!==requestId.current||controller.signal.aborted)return;
      const valid=payload.items.filter(x=>(
        typeof x.id==='string'&&typeof x.name==='string'
        &&Number.isFinite(x.longitude)&&Number.isFinite(x.latitude)
        &&x.latitude>=33&&x.latitude<=39.5&&x.longitude>=124&&x.longitude<=132
      )).slice(0,200);
      setItems(valid);
      setLimited(Boolean(payload.has_more));
      setState('ready');
      const source=currentMap.getSource(markerSource) as GeoJSONSource|undefined;
      source?.setData({
        type:'FeatureCollection',features:valid.map(x=>({
          type:'Feature',geometry:{type:'Point',coordinates:[x.longitude,x.latitude]},
          properties:{id:x.id,name:x.name}
        }))
      });
    }catch(e){
      if(controller.signal.aborted||next!==requestId.current)return;
      setState('error');setItems([]);setLimited(false);
    }
  },[]);
  useEffect(()=>{
    if(!available||!host.current)return;
    let cancelled=false;
    let instance:MapLibreMap|null=null;
    let removeMapEvents:()=>void=()=>{};
    void import('maplibre-gl').then(({Map,NavigationControl})=>{
      if(cancelled||!host.current)return;
      instance=new Map({
        container:host.current,
        style:STYLE_BASE+'?key='+encodeURIComponent(key),
        center:[126.978,37.567],zoom:12.5,
        minZoom:8,maxZoom:18,
        attributionControl:{compact:true},
        cooperativeGestures:true
      });
      const m=instance;
      map.current=m;
      m.addControl(new NavigationControl({showCompass:false}),'top-right');
      const onLoad=()=>{
        if(!m.getSource(markerSource)){
          m.addSource(markerSource,{type:'geojson',data:emptyData});
          m.addLayer({id:markerLayer,type:'circle',source:markerSource,
            paint:{'circle-radius':7,'circle-color':'#188a64','circle-stroke-color':'#ffffff','circle-stroke-width':2}
          });
        }
        void load(m);
      };
      const onMove=()=>void load(m);
      const onClick=(ev:{features?:Array<{properties?:{id?:string}}>})=>{
        const id=ev.features?.[0]?.properties?.id;
        if(typeof id==='string'&&/^[a-f0-9-]{36}$/i.test(id))setSelected(id);
      };
      const onError=()=>setState(current=>current==='loading'?'error':current);
      m.on('load',onLoad);
      m.on('moveend',onMove);
      m.on('click',markerLayer,onClick);
      m.on('error',onError);
      removeMapEvents=()=>{
        m.off('load',onLoad);m.off('moveend',onMove);
        m.off('click',markerLayer,onClick);m.off('error',onError);
      };
    }).catch(()=>{if(!cancelled)setState('error')});
    return ()=>{
      cancelled=true;lastRequest.current?.abort();requestId.current++;
      removeMapEvents();instance?.remove();map.current=null;
    };
  },[load]);
  useEffect(()=>{if(available&&map.current?.isStyleLoaded())void load(map.current);},[q,filter,locale,load]);
  const pick=items.find(x=>x.id===selected)||null;
  const params=new URLSearchParams({hl:locale});
  if(q)params.set('q',q);
  if(filter)params.set('f',filter);
  return <div>
    {!available
      ?<section className="empty-map" aria-label="Map provider not configured">{ui.disabled}</section>
      :<div ref={host} role="application" aria-label="Interactive restaurant map"
        style={{width:'100%',height:'min(62vh,540px)',minHeight:350,borderRadius:18,overflow:'hidden',
          border:'1px solid #e5ece8',marginTop:24}}/>}
    {available&&<p className="hint" role="status" aria-live="polite">
      {state==='loading'?ui.loading:state==='error'?ui.error:state==='zoom'?ui.zoom:
        state==='ready'?ui.count+': '+items.length:''}
      {limited?' · '+ui.limit:''}
    </p>}
    {pick&&<section className="result" aria-live="polite">
      <strong>{pick.name}</strong>
      <span>{pick.address_ko||pick.region_sigungu}</span>
      <Link className="simple-link" href={'/restaurant/'+pick.id+'?'+params.toString()}>{ui.open} →</Link>
    </section>}
    {state==='ready'&&items.length===0&&<p className="hint">{ui.empty}</p>}
    {state==='ready'&&items.length>0&&<section aria-label={ui.count}>
      <p className="hint">{ui.count}: {items.length}{limited?' · '+ui.limit:''}</p>
      <div className="results">
        {items.slice(0,20).map(x=><div key={x.id} className="result">
          <strong>{x.name}</strong>
          {x.editorial_score!==null&&<span>★ {x.editorial_score.toFixed(1)} / 5 · WhatEatO</span>}
          <span>{x.address_ko||x.region_sigungu}</span>
          <Link className="simple-link" href={'/restaurant/'+x.id+'?'+params.toString()}>{ui.open} →</Link>
        </div>)}
      </div>
    </section>}
    <p className="hint">{ui.license}</p>
  </div>;
}
