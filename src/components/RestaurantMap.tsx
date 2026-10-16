'use client';
import RestaurantExperienceCard from '@/components/RestaurantExperienceCard';
import {cuisineColor} from '@/lib/cuisine-palette';
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import mapStyles from './RestaurantMap.module.css';
import type {Map as MapLibreMap,GeoJSONSource,MapLayerMouseEvent} from 'maplibre-gl';

// Restaurant marker data is ALWAYS sourced from the verified WhatEatO catalog.
// OpenFreeMap's public MapLibre basemap is free for commercial use without a
// browser API key (see https://openfreemap.org/ and its ToS); MapTiler is optional
// if an owner-supplied origin-restricted key is deliberately configured.
// Attribution is mandatory. Outages fall back to a genuine DB-powered directory.
type Place={
  id:string;name:string;address_ko:string|null;address:string|null;short_description:string|null;main_menu:string|null;latitude:number;longitude:number;
  card_accent_color:string|null;editorial_score:number|null;visitor_score:number|null;featured_image_url:string|null;category_code:string|null;opening_hours:{state:'open'|'closed'|'preparing'|'unknown';today_hours:string|null}|null;region_sigungu:string|null;tags:{code:string;label:string}[];
};
type Response={items:Place[];has_more:boolean;location_note:string};
type Feature={
  type:'Feature';geometry:{type:'Point';coordinates:[number,number]};
  properties:{id:string;name:string;pinColor:string;openingState:string};
};
type FeatureCollection={type:'FeatureCollection';features:Feature[]};
const MAPTILER_STYLE='https://api.maptiler.com/maps/streets-v4/style.json';
const OPENFREE_STYLE='https://tiles.openfreemap.org/styles/liberty';
const key=(process.env.NEXT_PUBLIC_MAPTILER_API_KEY||'').trim();
const useMapTiler=/^[a-zA-Z0-9_-]{12,160}$/.test(key);
const styleUrl=useMapTiler?MAPTILER_STYLE+'?key='+encodeURIComponent(key):OPENFREE_STYLE;
const attribution='© OpenFreeMap · © OpenMapTiles · © OpenStreetMap contributors';
const fallbackIframe='https://www.openstreetmap.org/export/embed.html?bbox=126.96%2C37.55%2C127.03%2C37.605&layer=mapnik';
const markerSource='whateato-approved-restaurants';
const markerLayer='whateato-location-markers';
const markerNameLayer='whateato-location-labels';
const NAME_MIN_ZOOM=14;
const FOCUS_ZOOM=17; // maximum zoom 18 minus four zoom-out steps
const selectedLayer='whateato-selected-location';
const clusterLayer='whateato-location-clusters';
const clusterLabel='whateato-cluster-count';
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
    case 'en':return {disabled:'The basemap is temporarily unavailable. The restaurant directory below uses real permit-record coordinates.',loading:'Loading restaurant markers…',error:'Map markers could not be loaded.',zoom:'Zoom into central Seoul to load restaurant locations.',count:'Locations in map area',limit:'Only the first 200 matching locations are shown. Zoom in for more.',open:'Restaurant details',license:'Map locations come from permit records and do not confirm current operation.',empty:'No matching public restaurant locations in this map area.'};
    case 'ja':return {disabled:'地図の背景データを取得できません。確認済みの座標に基づく店舗一覧をご利用ください。',loading:'店舗の位置を読み込み中…',error:'地図上の店舗を取得できませんでした。',zoom:'ソウル中心部へ拡大してください。',count:'表示中の店舗',limit:'最大200件を表示しています。さらに拡大してください。',open:'店舗情報',license:'場所は営業許可記録に基づき、現在の営業状況を保証しません。',empty:'該当する店舗が見つかりません。'};
    case 'zh-CN':return {disabled:'底图暂时不可用。下方仍可浏览来源于登记资料的餐厅位置列表。',loading:'正在加载餐厅位置…',error:'无法加载地图上的餐厅。',zoom:'请放大至首尔市中心。',count:'地图区域内的餐厅',limit:'最多显示200家餐厅，请放大地图查看更多。',open:'餐厅详情',license:'位置来自许可证资料，不代表当前营业。',empty:'地图区域内没有符合条件的餐厅。'};
    default:return {disabled:'지도 배경을 불러오지 못했어요. 대신 아래 실제 인허가 좌표 기반 식당 목록을 이용할 수 있어요.',loading:'식당 위치 불러오는 중…',error:'지도 식당 정보를 가져오지 못했어요.',zoom:'서울 중심 지역을 확대하면 식당 위치를 불러옵니다.',count:'현재 지도 내 식당',limit:'최대 200곳을 표시하고 있어요. 더 자세히 보려면 지도를 확대해 주세요.',open:'식당 상세 보기',license:'위치는 인허가 자료 기준이며 현재 영업 여부나 정확한 입구를 보장하지 않습니다.',empty:'현재 지도 영역에서 조건에 맞는 식당이 없어요.'};
  }
}
export default function RestaurantMap({q='',filter='',locale='ko',focusId=null}:{
  q?:string;filter?:string;locale?:string;focusId?:string|null;
}){
  const ui=localizedCopy(locale);
  const host=useRef<HTMLDivElement>(null);
  const map=useRef<MapLibreMap|null>(null);
  const lastRequest=useRef<AbortController|null>(null);
  const requestId=useRef(0);
  const queryRef=useRef({q,filter,locale});
  const focusCenterRef=useRef<[number,number]|null>(null);
  const focusItemsRef=useRef<Place[]>([]);
  const directorySeedRef=useRef<Place[]>([]);
  const [items,setItems]=useState<Place[]>([]);
  const [state,setState]=useState<'loading'|'zoom'|'ready'|'error'>('loading');
  const [basemapFailed,setBasemapFailed]=useState(false);
  const [mapRetry,setMapRetry]=useState(0);
  const [directory,setDirectory]=useState<Place[]>([]);
  const [directoryReady,setDirectoryReady]=useState(false);
  const [directoryError,setDirectoryError]=useState(false);
  const [limited,setLimited]=useState(false);
  const [selected,setSelected]=useState<string|null>(null);
  const [page,setPage]=useState(0);
  const [focusItems,setFocusItems]=useState<Place[]>([]);
  const [focusStatus,setFocusStatus]=useState<'loading'|'ready'|'error'>('loading');
  queryRef.current={q,filter,locale};
  const paintSeed=useCallback((m:MapLibreMap,seed:Place[])=>{
    const source=m.getSource(markerSource) as GeoJSONSource|undefined;
    if(!source||!seed.length)return;
    source.setData({type:'FeatureCollection',features:seed.map(x=>({
      type:'Feature',geometry:{type:'Point',coordinates:[x.longitude,x.latitude]},
      properties:{id:x.id,name:x.name,pinColor:x.card_accent_color||cuisineColor(x.category_code),openingState:x.opening_hours?.state||'unknown'}
    }))});
  },[]);
  useEffect(()=>{setPage(0);setSelected(null)},[q,filter,locale,focusId]);
  const load=useCallback(async (currentMap:MapLibreMap)=>{
    // Adding a fresh GeoJSON source briefly makes isStyleLoaded() false.
    // Waiting for that flag here silently skips the *initial* marker fetch.
    // Source existence is the appropriate guard once the map load event fired.
    if(!currentMap.getSource(markerSource))return;
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
      // The selected focus pin stays visible even if spatial sampling omitted it.
      const focused=focusItemsRef.current.filter(x=>!valid.some(v=>v.id===x.id))
        .filter(x=>currentMap.getBounds().contains([x.longitude,x.latitude]));
      const plotted=[...valid,...focused];
      setItems(plotted);
      setLimited(Boolean(payload.has_more));
      setState('ready');
      const source=currentMap.getSource(markerSource) as GeoJSONSource|undefined;
      source?.setData({
        type:'FeatureCollection',features:plotted.map(x=>({
          type:'Feature',geometry:{type:'Point',coordinates:[x.longitude,x.latitude]},
          properties:{id:x.id,name:x.name,pinColor:cuisineColor(x.category_code),openingState:x.opening_hours?.state||'unknown'}
        }))
      });
    }catch(e){
      if(controller.signal.aborted||next!==requestId.current)return;
      setState('error');setItems([]);setLimited(false);
    }
  },[]);
  useEffect(()=>{
    if(!host.current)return;
    let cancelled=false;
    let styleReady=false;
    const timeout=window.setTimeout(()=>{
      if(!cancelled&&!styleReady){setBasemapFailed(true);setState('error')}
    },18000);
    setBasemapFailed(false);
    setState('loading');
    let instance:MapLibreMap|null=null;
    let removeMapEvents:()=>void=()=>{};
    void import('maplibre-gl').then(({Map,Popup,NavigationControl,AttributionControl,setWorkerUrl,getVersion})=>{
      // MapLibre 6 ESM worker must be served with its sibling shared module.
      // The prebuild/predev steps copy both files into the same-origin public
      // directory. The version query prevents incompatible stale worker caches.
      setWorkerUrl('/maplibre/maplibre-gl-worker.mjs?v='+encodeURIComponent(getVersion()));
      if(cancelled||!host.current)return;
      instance=new Map({
        container:host.current,
        style:styleUrl,
        center:focusCenterRef.current||[126.982,37.571],zoom:focusCenterRef.current?FOCUS_ZOOM:14.6,
        minZoom:8,maxZoom:18,
        attributionControl:false,
        cooperativeGestures:true
      });
      const m=instance;
      map.current=m;
      let currentPopup:InstanceType<typeof Popup>|null=null;
      m.addControl(new NavigationControl({showCompass:false}),'top-right');
      // Never omit attribution even if a provider style's source metadata
      // does not include credits.
      m.addControl(new AttributionControl({
        compact:true,
        customAttribution:useMapTiler?'© OpenStreetMap contributors':attribution
      }),'bottom-right');
      const onLoad=()=>{
        if(!m.getSource(markerSource)){
          m.addSource(markerSource,{type:'geojson',data:emptyData,cluster:true,
            clusterMaxZoom:13,clusterRadius:38});
          m.addLayer({id:clusterLayer,type:'circle',source:markerSource,
            filter:['has','point_count'],
            paint:{'circle-color':'#188a64','circle-radius':['step',['get','point_count'],17,15,23,50,30],
              'circle-stroke-color':'#ffffff','circle-stroke-width':2}
          });
          m.addLayer({id:clusterLabel,type:'symbol',source:markerSource,
            filter:['has','point_count'],layout:{'text-field':['get','point_count_abbreviated'],
              'text-size':12,'text-font':['Noto Sans Regular']},paint:{'text-color':'#ffffff'}
          });
          m.addLayer({id:markerLayer,type:'circle',source:markerSource,
            filter:['!',['has','point_count']],
            paint:{'circle-radius':10,'circle-color':['coalesce',['get','pinColor'],'#697887'],'circle-stroke-color':'#ffffff','circle-stroke-width':2}
          });
          // Show venue names from zoom 14 (max zoom 18, four steps out).
          // Hide cluster labels and allow name labels to be clicked like pins.
          m.addLayer({id:markerNameLayer,type:'symbol',source:markerSource,
            filter:['!',['has','point_count']],minzoom:NAME_MIN_ZOOM,
            layout:{'text-field':['get','name'],'text-size':12,
              'text-font':['Noto Sans Regular'],'text-anchor':'left',
              'text-offset':[1.1,0],'text-max-width':11,
              'text-variable-anchor':['left','right','top','bottom'],
              'text-radial-offset':1.1,
              'text-allow-overlap':false,'text-optional':false},
            paint:{'text-color':'#192920','text-halo-color':'#ffffff','text-halo-width':2}
          });
          // Only mark a real selected permit location; never add synthetic pins.
          m.addLayer({id:selectedLayer,type:'circle',source:markerSource,
            filter:['==',['get','id'],''],
            paint:{'circle-radius':13,'circle-color':['coalesce',['get','pinColor'],'#697887'],
              'circle-stroke-color':'#ffffff','circle-stroke-width':4}
          });
        }
        styleReady=true;
        // Reuse the parallel directory/focus response for immediate first pins.
        paintSeed(m,focusItemsRef.current.length?focusItemsRef.current:directorySeedRef.current);
        syncNameVisibility();
        window.clearTimeout(timeout);
        setBasemapFailed(false);
        if(focusCenterRef.current)m.jumpTo({center:focusCenterRef.current,zoom:FOCUS_ZOOM});
        // Deep-linked restaurants have a dedicated nearest-neighbor request.
        // Avoid an unrelated initial Seoul viewport marker query before it resolves.
        if(!focusId||focusCenterRef.current)void load(m);
      };
      // At street-level zoom, prefer showing the actual venue name even in
      // dense restaurant areas. At zoom 14–15, keep collision avoidance.
      const syncNameVisibility=()=>{
        if(!m.getLayer(markerNameLayer))return;
        const streetLevel=m.getZoom()>=16;
        m.setLayoutProperty(markerNameLayer,'text-allow-overlap',streetLevel);
        m.setLayoutProperty(markerNameLayer,'text-ignore-placement',streetLevel);
      };
      const onMove=()=>{syncNameVisibility();void load(m);};
      const onClick=(ev:MapLayerMouseEvent)=>{
        const feature=ev.features?.[0];
        const id=feature?.properties?.id;
        if(typeof id!=='string'||!/^[a-f0-9-]{36}$/i.test(id))return;
        setSelected(id);
        const coords=feature?.geometry?.type==='Point'?feature.geometry.coordinates:null;
        if(!Array.isArray(coords)||coords.length<2||!Number.isFinite(coords[0])||!Number.isFinite(coords[1]))return;
        m.easeTo({center:[coords[0],coords[1]],zoom:Math.max(m.getZoom(),FOCUS_ZOOM),duration:350});
        currentPopup?.remove();
        const activeLocale=queryRef.current.locale;
        const details=activeLocale==='ko'?'상세 보기':activeLocale==='ja'?'詳しく見る':activeLocale==='zh-CN'?'查看详情':'View details';
        const states={
          ko:{open:'영업중',closed:'영업종료',preparing:'영업준비중',unknown:'영업시간 미확인'},
          en:{open:'Open now',closed:'Closed',preparing:'Preparing to open',unknown:'Hours unverified'},
          ja:{open:'営業中',closed:'営業時間外',preparing:'準備中',unknown:'営業時間未確認'},
          'zh-CN':{open:'营业中',closed:'已打烊',preparing:'准备中',unknown:'营业时间未核实'}
        } as const;
        const lang=activeLocale in states?activeLocale as keyof typeof states:'ko';
        const status=feature?.properties?.openingState;
        const stateKey:'open'|'closed'|'preparing'|'unknown'=status==='open'?'open':status==='closed'?'closed':status==='preparing'?'preparing':'unknown';
        const root=document.createElement('div');root.className='we-map-popup';
        const heading=document.createElement('strong');heading.textContent=feature?.properties?.name||'';
        const state=document.createElement('span');state.textContent=states[lang][stateKey];
        state.className='we-map-popup-state '+(stateKey==='open'?'is-open':stateKey==='closed'?'is-closed':stateKey==='preparing'?'is-preparing':'');
        const detail=document.createElement('a');
        detail.textContent=details+' ↗';
        detail.href='/restaurant/'+encodeURIComponent(id)+'?hl='+encodeURIComponent(activeLocale);
        root.append(heading,state,detail);
        currentPopup=new Popup({offset:16,closeButton:true,maxWidth:'230px'})
          .setLngLat([coords[0],coords[1]]).setDOMContent(root).addTo(m);
      };
      const onClusterClick=(ev:{lngLat:{lng:number;lat:number}})=>{
        m.easeTo({center:[ev.lngLat.lng,ev.lngLat.lat],zoom:Math.min(17,m.getZoom()+1.8),duration:400});
      };
      const onError=(event:{error?:{message?:string}})=>{
        // Sanitize optional public map-key query strings before diagnostics.
        const why=String(event.error?.message||'map_resource_error')
          .replace(/key=[^\s&]+/gi,'key=[REDACTED]').slice(0,180);
        console.warn('WHATEATO_MAP_RENDER_ERROR '+why);
        // A transient glyph/tile error must not replace a usable interactive map.
        // Only the actual style-load timeout or WebGL loss activates the fallback.
      };
      const onContextLost=()=>{setBasemapFailed(true);setState('error')};
      m.on('load',onLoad);
      m.on('moveend',onMove);
      m.on('click',markerLayer,onClick);
      m.on('click',markerNameLayer,onClick);
      m.on('click',clusterLayer,onClusterClick);
      m.on('webglcontextlost',onContextLost);
      m.on('error',onError);
      removeMapEvents=()=>{
        m.off('load',onLoad);m.off('moveend',onMove);
        m.off('click',markerLayer,onClick);
        m.off('click',markerNameLayer,onClick);
        currentPopup?.remove();
        m.off('click',clusterLayer,onClusterClick);
        m.off('webglcontextlost',onContextLost);m.off('error',onError);
      };
    }).catch(()=>{if(!cancelled){window.clearTimeout(timeout);setBasemapFailed(true);setState('error')}});
    return ()=>{
      cancelled=true;window.clearTimeout(timeout);
      lastRequest.current?.abort();requestId.current++;
      removeMapEvents();instance?.remove();map.current=null;
    };
  },[load,mapRetry,paintSeed]);
  useEffect(()=>{if(map.current?.getSource(markerSource))void load(map.current);},[q,filter,locale,load]);
  // Deep-link focus has its own DB-backed nearest-neighbor directory,
  // independent of the current viewport's map tile/marker availability.
  useEffect(()=>{
    if(!focusId){
      focusCenterRef.current=null;focusItemsRef.current=[];
      setFocusItems([]);setFocusStatus('loading');return;
    }
    const controller=new AbortController();
    focusCenterRef.current=null;focusItemsRef.current=[];
    setFocusItems([]);setFocusStatus('loading');setPage(0);
    const p=new URLSearchParams({id:focusId,hl:locale});
    void fetch('/api/v1/map/focus?'+p.toString(),{
      signal:controller.signal,cache:'no-store',credentials:'same-origin'
    }).then(async response=>{
      if(!response.ok)throw Error('focused venue unavailable');
      return response.json() as Promise<{items:Place[];center:[number,number];focus_id:string}>;
    }).then(payload=>{
      if(controller.signal.aborted)return;
      if(payload.focus_id!==focusId||!Array.isArray(payload.items)||
         payload.items[0]?.id!==focusId||payload.items.length>4||
         !Array.isArray(payload.center)||payload.center.length!==2)throw Error('Invalid focus payload');
      const valid=payload.items.every(x=>Number.isFinite(x.latitude)&&Number.isFinite(x.longitude)&&
        x.latitude>=33&&x.latitude<=39.5&&x.longitude>=124&&x.longitude<=132);
      if(!valid)throw Error('Invalid focus coordinates');
      focusCenterRef.current=payload.center;
      focusItemsRef.current=payload.items;
      setFocusItems(payload.items);
      if(map.current)paintSeed(map.current,payload.items);setSelected(focusId);setFocusStatus('ready');
      const m=map.current;
      if(m?.getSource(markerSource)){
        m.jumpTo({center:payload.center,zoom:15});
        void load(m);
      }
    }).catch(()=>{
      if(controller.signal.aborted)return;
      setFocusStatus('error');setFocusItems([]);focusItemsRef.current=[];
    });
    return ()=>controller.abort();
  },[focusId,locale,load,paintSeed]);
  // Keep the map pin visually in sync with both list selections and pin clicks.
  useEffect(()=>{
    const m=map.current;
    if(m?.getLayer(selectedLayer))m.setFilter(selectedLayer,['==',['get','id'],selected||'']);
  },[selected,items,mapRetry]);
  // Independently load a useful DB-backed directory even if WebGL, a font,
  // a tile endpoint, or the entire map provider is unavailable on this device.
  // The list never depends on the map's 'load' event or WebGL support.
  useEffect(()=>{
    const controller=new AbortController();
    if(focusId){setDirectory([]);setDirectoryReady(false);return()=>controller.abort();}
    const params=new URLSearchParams({
      bbox:'37.47,126.78,37.68,127.14',limit:'40',hl:locale
    });
    if(q)params.set('q',q);
    if(filter)params.set('f',filter);
    directorySeedRef.current=[];
    setDirectoryReady(false);setDirectoryError(false);
    void fetch('/api/v1/map/markers?'+params.toString(),{
      signal:controller.signal,cache:'no-store',credentials:'same-origin'
    }).then(async response=>{
      if(!response.ok)throw Error('Map directory unavailable');
      return response.json() as Promise<Response>;
    }).then(payload=>{
      if(controller.signal.aborted)return;
      const safe=(Array.isArray(payload.items)?payload.items:[]).filter(x=>
        typeof x.id==='string'&&typeof x.name==='string'&&
        Number.isFinite(x.latitude)&&Number.isFinite(x.longitude)&&
        x.latitude>=33&&x.latitude<=39.5&&x.longitude>=124&&x.longitude<=132
      ).slice(0,40);
      directorySeedRef.current=safe;
      setDirectory(safe);setDirectoryReady(true);
      if(map.current&&state!=='ready')paintSeed(map.current,safe);
    }).catch(()=>{
      if(!controller.signal.aborted){
        setDirectory([]);setDirectoryError(true);setDirectoryReady(true);
      }
    });
    return ()=>controller.abort();
  },[q,filter,locale,focusId,paintSeed]);
  const visibleItems=focusId?focusItems:state==='ready'&&!basemapFailed?items:directory;
  const pageSize=4;
  const totalPages=Math.max(1,Math.ceil(visibleItems.length/pageSize));
  const safePage=Math.min(page,totalPages-1);
  const resultsReady=focusId?focusStatus!=='loading':state==='ready'||directoryReady;
  useEffect(()=>setPage(0),[q,filter,locale]);
  const selectOnMap=(place:Place)=>{
    setSelected(place.id);
    if(!basemapFailed&&map.current){
      map.current.flyTo({
        center:[place.longitude,place.latitude],
        zoom:Math.max(map.current.getZoom(),FOCUS_ZOOM),
        duration:window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:380
      });
    }
    host.current?.scrollIntoView({
      behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',
      block:'center'
    });
  };
  const pick=visibleItems.find(x=>x.id===selected)||null;
  const fallbackSource=pick?new URLSearchParams({
    bbox:[pick.longitude-0.0035,pick.latitude-0.0025,pick.longitude+0.0035,
      pick.latitude+0.0025].map(x=>x.toFixed(6)).join(','),
    layer:'mapnik',
    marker:pick.latitude.toFixed(6)+','+pick.longitude.toFixed(6)
  }).toString():null;
  const fallbackUrl=fallbackSource?'https://www.openstreetmap.org/export/embed.html?'+fallbackSource
    :fallbackIframe;
  const params=new URLSearchParams({hl:locale});
  if(q)params.set('q',q);
  if(filter)params.set('f',filter);
  return <div className="map-explore-root">
  <div className="map-explore-layout">
    <section className="map-explore-list" aria-label={ui.count}>
      <div className="map-explore-list-head">
        <div><span className="eyebrow">LOCAL RESTAURANTS</span><h2>{ui.count} <span>{visibleItems.length}</span></h2></div>
        <div className="map-explore-pagination" aria-label="Restaurant result pages">
          <button type="button" aria-label="Previous restaurant page" disabled={safePage===0} onClick={()=>setPage(p=>Math.max(0,p-1))}>‹</button>
          <span>{safePage+1} / {totalPages}</span>
          <button type="button" aria-label="Next restaurant page" disabled={safePage>=totalPages-1} onClick={()=>setPage(p=>Math.min(totalPages-1,p+1))}>›</button>
        </div>
      </div>
      {focusId&&focusStatus==='loading'&&<p className="hint" role="status">{ui.loading}</p>}
      {resultsReady&&visibleItems.length===0&&<p className="hint">{focusId&&focusStatus==='error'?ui.error:directoryError?ui.error:ui.empty}</p>}
      <div className="map-explore-cards">
        {visibleItems.slice(safePage*pageSize,(safePage+1)*pageSize).map(x=><RestaurantExperienceCard key={x.id} variant="map" name={x.name} category={x.category_code} accentColor={x.card_accent_color} status={x.opening_hours?.state||"unknown"} hours={x.opening_hours?.today_hours} address={x.address||x.address_ko||x.region_sigungu} description={x.short_description} menu={x.main_menu} href={'/restaurant/'+x.id+'?'+params.toString()} locale={locale} rating={null} editorialRating={x.editorial_score} visitorRating={x.visitor_score} restaurantId={x.id} imageUrl={x.featured_image_url} tags={x.tags.map(t=>t.label)} mapButtonLabel={locale==='ko'?x.name+' 지도에서 위치 보기':undefined} onMapClick={()=>selectOnMap(x)}/> )}
      </div>
      <p className="map-explore-notice">{ui.license}</p>
    </section>
    <section className="map-explore-map" aria-label="Restaurant locations">
          <div style={{position:'relative',marginTop:0}}>
      <div ref={host} role="application" aria-label="Interactive restaurant map"
        data-map-status={basemapFailed?'fallback':state}
        data-selected-map-restaurant={selected||''}
        style={{width:'100%',height:'100%',minHeight:620,
          background:'#f1f6f3',borderRadius:18,overflow:'hidden',
          border:'1px solid #e5ece8'}}/>
      {basemapFailed&&<section aria-label="Basemap unavailable"
        style={{position:'absolute',inset:0,background:'#f3f7f4',
          borderRadius:18,overflow:'hidden',border:'1px solid #e5ece8'}}>
        <iframe src={fallbackUrl} title="OpenStreetMap fallback map of central Seoul"
          loading="lazy" referrerPolicy="strict-origin-when-cross-origin"
          style={{width:'100%',height:'100%',display:'block',border:0}}/>
        <div style={{position:'absolute',left:12,top:12,right:12,background:'#fffffff0',
          borderRadius:10,padding:'10px 12px',boxShadow:'0 2px 12px #00000022',
          display:'flex',alignItems:'center',gap:10,justifyContent:'space-between'}}>
          <span style={{fontSize:12,color:'#34443d'}}>
            {locale==='ko'?'보조 지도 · 식당 위치는 아래 목록에서 확인':
              locale==='ja'?'補助地図 · 店舗は下の一覧から確認':
              locale==='zh-CN'?'备用地图 · 请查看下方餐厅列表':
              'Fallback map · See restaurant locations in the list below'}
          </span>
          <button type="button" onClick={()=>setMapRetry(n=>n+1)}
            style={{border:'1px solid #188a64',borderRadius:25,background:'#fff',
              color:'#137b57',fontWeight:600,padding:'8px 12px',cursor:'pointer',flexShrink:0}}>
            {locale==='ko'?'다시 시도':locale==='ja'?'再試行':
              locale==='zh-CN'?'重试':'Retry'}
          </button>
        </div>
      </section>}
    </div>

      <p className="map-explore-map-status" role="status" aria-live="polite">
        {basemapFailed?ui.error:state==='loading'?ui.loading:state==='error'?ui.error:state==='zoom'?ui.zoom:state==='ready'?ui.count+': '+items.length:''}
        {limited?' · '+ui.limit:''}
      </p>
    </section>
  </div>
  </div>;
}
