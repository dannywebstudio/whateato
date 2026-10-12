/* WhatEatO canonical Next.js UX mirrored for GitHub Pages; no Neon credentials. */
(() => {
  'use strict';
  const page = document.body.dataset.page || 'home';
  const root = page === 'home' ? './' : '../';
  const app = document.getElementById('app');
  const params = new URLSearchParams(location.search);
  const filters = [
    ['date_night','데이트','Date night'],['bar','술집','Bars'],
    ['lunch','점심','Lunch'],['dinner','저녁','Dinner'],
    ['solo_dining','혼밥','Solo dining'],['family_dining','가족 외식','Family'],
    ['cafe','카페','Cafes'],['dessert','디저트','Dessert'],
    ['budget_friendly','가성비','Value'],['good_atmosphere','분위기','Atmosphere'],
    ['local_pick','현지인 추천','Local picks'],['traveler_friendly','여행자 편의','Travel friendly']
  ];
  const languages = [
    ['auto','Auto'],['ko','한국어'],['en','English'],['ja','日本語'],
    ['zh-CN','简体中文'],['zh-TW','繁體中文'],['ru','Русский'],
    ['de','Deutsch'],['fr','Français'],['es','Español'],['pt','Português'],
    ['it','Italiano'],['th','ไทย'],['vi','Tiếng Việt'],['id','Bahasa Indonesia'],['ar','العربية']
  ];
  const countries = [
    ['KR','대한민국'],['US','United States'],['JP','日本'],['CN','中国'],
    ['TW','臺灣'],['GB','United Kingdom'],['CA','Canada'],['AU','Australia'],
    ['DE','Deutschland'],['FR','France'],['RU','Россия'],['TH','Thailand'],
    ['VN','Việt Nam'],['ID','Indonesia'],['BR','Brasil'],['OTHER','Other']
  ];
  const ui = {
    q: params.get('q') || '', selected: new Set((params.get('f') || '').split(',').filter(x => filters.some(f => f[0] === x))),
    restaurants: [], filtered: [], visible: 24, map: null, layer: null, loaded: false
  };
  const $ = (selector, within=document) => within.querySelector(selector);
  const el = (tag, cls, text) => {
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(text!==undefined)node.textContent=String(text);
    return node;
  };
  const text = s => String(s||'').normalize('NFKC').toLocaleLowerCase('ko-KR').trim();
  const safe = s => String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const getPref=(key,defaultValue)=>{try{return localStorage.getItem(key)||defaultValue}catch{return defaultValue}};
  const language=()=>{const l=getPref('we_language','auto');return (l==='auto' ? (navigator.language||'en').split('-')[0] : l)==='ko'?'ko':'en'};
  const t=(ko,en)=>language()==='ko'?ko:en;

  function renderHeader() {
    const header=el('header','topbar');
    header.innerHTML = '<nav class="navcontent" aria-label="Primary">'+
     '<div class="header-left"><a class="brand-logo" href="'+root+'" aria-label="WhatEatO home"><span class="brand-word">Whatto</span><span class="brand-accent">EatO</span></a>'+
     '<div class="navlinks"><a href="'+root+'" data-nav="home">Search</a><a href="'+root+'map/" data-nav="map">Map</a><a href="'+root+'blog/" data-nav="blog">Blog</a></div></div>'+
     '<div class="preferences"><span aria-hidden="true">🌐</span><label class="sr-only" for="country">Country</label>'+
     '<select id="country"></select><span class="sep">|</span><label class="sr-only" for="language">Language</label>'+
     '<select id="language"></select></div></nav>';
    $('[data-nav="'+(page==='search'?'home':page)+'"]',header)?.setAttribute('aria-current','page');
    const country=$('#country',header),lang=$('#language',header);
    for(const [value,label] of countries)country.add(new Option(label,value));
    for(const [value,label] of languages)lang.add(new Option(label,value));
    country.value=getPref('we_country','KR');lang.value=getPref('we_language','auto');
    country.addEventListener('change',()=>{try{localStorage.setItem('we_country',country.value)}catch{}});
    lang.addEventListener('change',()=>{try{localStorage.setItem('we_language',lang.value)}catch{};location.reload()});
    return header;
  }
  function renderFooter(){
    const f=el('footer','footer');f.textContent='© WhatEatO · Restaurant details require verification · No visitor accounts · Development Preview';return f;
  }
  function formHtml(target){
    const chips=filters.map(([id,ko,en])=>{
      const label=t(ko,en);
      return '<button type="button" class="chip'+(ui.selected.has(id)?' active':'')+'" data-filter="'+id+'" aria-pressed="'+ui.selected.has(id)+'">'+label+'</button>';
    }).join('');
    return '<form class="search-form" role="search" data-target="'+target+'"><div class="searchfield">'+
      '<span aria-hidden="true">⌕</span><input id="q" aria-label="Restaurant search" maxlength="200" placeholder="'+
      t('지역, 음식점, 메뉴를 검색하세요','Search restaurants, food, or places...')+'">'+
      '<button type="submit" aria-label="Search">→</button></div><div class="chips">'+chips+
      '<button type="button" class="chip more-chip" id="more-filters" aria-haspopup="dialog">'+t('더보기 +','More +')+'</button></div>'+
      '<div class="filter-sheet" id="filter-sheet" role="dialog" aria-modal="true" aria-label="'+t('검색 필터 전체보기','Search filters')+'" hidden>'+
      '<div class="sheet-content"><div class="sheet-top"><strong>'+t('빠른 필터','Quick filters')+'</strong>'+
      '<button type="button" id="close-sheet" aria-label="Close">✕</button></div><div class="sheet-chips"></div>'+
      '<button type="button" class="sheet-done" id="sheet-done">'+t('적용','Done')+'</button></div></div>'+
      '</form>';
  }
  function bindForm(scope=document){
    const form=$('.search-form',scope);if(!form)return;
    const input=$('#q',form); input.value=ui.q;
    const sync=()=>{
      form.querySelectorAll('[data-filter]').forEach(b=>{
        const pressed=ui.selected.has(b.dataset.filter);
        b.classList.toggle('active',pressed);
        b.setAttribute('aria-pressed',String(pressed));
      });
    };
    form.querySelectorAll('.chips [data-filter]').forEach(btn=>btn.addEventListener('click',()=>{
      if(ui.selected.has(btn.dataset.filter)) ui.selected.delete(btn.dataset.filter);
      else ui.selected.add(btn.dataset.filter);
      sync();
    }));
    const sheet=$('#filter-sheet',form);
    $('#more-filters',form).addEventListener('click',()=>{
      $('.sheet-chips',sheet).replaceChildren();
      for(const [id,ko,en] of filters){
        const b=el('button','chip',t(ko,en)); b.type='button';b.dataset.filter=id;
        b.classList.toggle('active',ui.selected.has(id));b.setAttribute('aria-pressed',String(ui.selected.has(id)));
        b.addEventListener('click',()=>{
          if(ui.selected.has(id))ui.selected.delete(id); else ui.selected.add(id);
          b.classList.toggle('active',ui.selected.has(id));
          b.setAttribute('aria-pressed',String(ui.selected.has(id)));sync();
        });
        $('.sheet-chips',sheet).append(b);
      }
      sheet.hidden=false;document.body.classList.add('sheet-open');
      $('#close-sheet',form).focus();
    });
    const close=()=>{sheet.hidden=true;document.body.classList.remove('sheet-open');$('#more-filters',form).focus()};
    $('#close-sheet',form).addEventListener('click',close);
    $('#sheet-done',form).addEventListener('click',close);
    sheet.addEventListener('click',e=>{if(e.target===sheet)close()});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!sheet.hidden)close()});
    form.addEventListener('submit',e=>{
      e.preventDefault();ui.q=input.value.trim();
      const q=new URLSearchParams();
      if(ui.q)q.set('q',ui.q);
      if(ui.selected.size)q.set('f',[...ui.selected].join(','));
      q.set('hl',getPref('we_language','auto'));
      const dest=form.dataset.target==='map'?'map/':'search/';
      location.href=root+dest+'?'+q.toString();
    });
  }
  function renderHome(){
    const main=el('main','home');
    main.id='main';
    main.innerHTML='<section class="hero"><h1>What<span>EatO</span></h1><p>Find your next favorite place to eat in Korea.</p>'+
      formHtml('search')+
      '<div class="home-note">'+t('실제 인허가 영업 음식점 10,000건으로 만든 미리보기 · 서울 일부 지역만 포함',
      'Preview with 10,000 real permit-active restaurants · limited Seoul areas')+'</div></section>';
    return main;
  }
  function renderSearch(){
    const main=el('main','content');main.id='main';
    main.innerHTML='<h1>'+t('음식점 검색','Search restaurants')+'</h1>'+formHtml('search')+
      '<p class="hint" id="search-hint">'+t('실제 LOCALDATA 기반 검색 · 인허가 상태는 실시간 영업 여부가 아닙니다',
      'Search based on actual LOCALDATA records · permit status is not real-time opening')+'</p>'+
      '<p id="filter-notice" class="filter-notice" hidden></p>'+
      '<div class="results-meta"><strong id="result-count">'+t('검색 준비 중','Loading results')+'</strong><span>'+t('서울 일부 지역 미리보기','Seoul area preview')+'</span></div>'+
      '<div class="results" id="results"></div><button type="button" class="load-more" id="load-more" hidden>'+
      t('더 보기','Load more')+' ↓</button>'+
      '<a class="simple-link" id="map-link" href="'+root+'map/">'+t('지도에서 보기 →','View on Map →')+'</a>';
    return main;
  }
  function renderMap(){
    const main=el('main','content map-content');main.id='main';
    main.innerHTML='<h1>'+t('지도에서 음식점 찾기','Explore on Map')+'</h1>'+formHtml('map')+
      '<p class="hint">'+t('좌표가 검증된 식당만 지도에 표시합니다. 최대 100개의 핀을 한 번에 표시해요.',
      'Only restaurants with validated coordinates appear on the map. Up to 100 pins at once.')+'</p>'+
      '<p id="filter-notice" class="filter-notice" hidden></p><div class="map-layout">'+
      '<div id="map" class="map-view" aria-label="Restaurant map">'+t('지도를 불러오는 중','Loading map')+'</div>'+
      '<aside class="map-sidebar"><strong id="map-count">'+t('식당 불러오는 중','Loading restaurants')+'</strong>'+
      '<div id="map-results" class="map-results"></div></aside></div><a href="'+root+'" class="simple-link">← Search</a>';
    return main;
  }
  function renderBlog(){
    const main=el('main','content');main.id='main';
    main.innerHTML='<h1>WhatEatO Blog</h1><p class="hint">Verified Korean dining guides and local food stories are coming soon.</p>'+
      '<div class="empty">No editorial articles have been published.</div>'+
      '<a href="'+root+'" class="simple-link">← Back to Search</a>';
    return main;
  }
  function makeRow(r,withMap=false){
    const node=el('article','result');
    node.append(el('strong','',r.name));
    node.append(el('span','',r.road||r.lot||t('주소 미확인','Address unavailable')));
    const meta=el('span','',[r.district,r.category].filter(Boolean).join(' · ')+' · '+t('인허가 영업','Permit active'));
    node.append(meta);
    if(withMap&&r.lat!=null&&r.lon!=null){
      const b=el('button','map-focus-btn',t('위치 보기 ↗','Locate ↗'));
      b.addEventListener('click',()=>focusMarker(r));
      node.append(b);
    }
    return node;
  }
  function apply(){
    const tokens=text(ui.q).split(/\s+/).filter(Boolean).slice(0,8);
    ui.filtered=ui.restaurants.filter(r=>{
      const hay=text([r.name,r.road,r.lot,r.region,r.district,r.category].join(' '));
      return tokens.every(token=>hay.includes(token));
    });
    const notice=$('#filter-notice');
    if(notice&&ui.selected.size){
      notice.hidden=false;
      notice.textContent=t('데이트·혼밥 등 12개 속성 필터는 근거 검증 전이므로 아직 결과에 적용하지 않습니다. 검색어 조건만 적용됩니다.',
        'The 12 lifestyle filters require verified evidence and are not applied yet. Only search keywords are applied.');
    } else if(notice) notice.hidden=true;
    if(page==='search')showSearch();
    if(page==='map')showMap();
  }
  function showSearch(){
    const list=$('#results');list.replaceChildren();
    $('#result-count').textContent=ui.filtered.length.toLocaleString('ko-KR')+t('개 결과',' results');
    const link=$('#map-link');const q=new URLSearchParams();
    if(ui.q)q.set('q',ui.q);
    if(ui.selected.size)q.set('f',[...ui.selected].join(','));
    link.href=root+'map/?'+q.toString();
    if(!ui.filtered.length){list.append(el('div','empty',t('검색 결과가 없습니다. 다른 검색어로 시도해 보세요.','No matching restaurants. Try another search.')))}
    else ui.filtered.slice(0,ui.visible).forEach(r=>list.append(makeRow(r)));
    $('#load-more').hidden=ui.filtered.length<=ui.visible;
  }
  function focusMarker(r){
    if(!window.L||!ui.map)return;
    ui.map.setView([r.lat,r.lon],16);
    L.popup().setLatLng([r.lat,r.lon]).setContent('<strong>'+safe(r.name)+'</strong><div>'+safe(r.road||r.lot)+'</div>').openOn(ui.map);
    $('#map').scrollIntoView({behavior:'smooth',block:'center'});
  }
  function showMap(){
    const markers=ui.filtered.filter(r=>typeof r.lat==='number'&&typeof r.lon==='number').slice(0,100);
    $('#map-count').textContent=markers.length.toLocaleString('ko-KR')+' / '+ui.filtered.length.toLocaleString('ko-KR')+t('곳 표시',' shown');
    const sidebar=$('#map-results');sidebar.replaceChildren();
    if(!ui.filtered.length)sidebar.append(el('div','empty',t('검색 결과가 없습니다.','No matches.')));
    else markers.slice(0,25).forEach(r=>sidebar.append(makeRow(r,true)));
    if(!window.L){$('#map').textContent=t('지도 라이브러리를 불러올 수 없습니다.','Map unavailable.');return}
    if(!ui.map){
      $('#map').replaceChildren();
      ui.map=L.map('map',{scrollWheelZoom:false}).setView([37.572,126.985],13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
        maxZoom:19,attribution:'© OpenStreetMap contributors'
      }).addTo(ui.map);
      ui.layer=L.layerGroup().addTo(ui.map);
    }
    ui.layer.clearLayers();
    for(const r of markers){
      L.circleMarker([r.lat,r.lon],{radius:6,weight:2,color:'#fff',fillColor:'#178760',fillOpacity:.85})
       .bindPopup('<strong>'+safe(r.name)+'</strong><div>'+safe(r.road||r.lot)+'</div>').addTo(ui.layer);
    }
    if(markers.length){
      const bounds=L.latLngBounds(markers.map(r=>[r.lat,r.lon]));
      ui.map.fitBounds(bounds,{padding:[30,30],maxZoom:14});
    } else ui.map.setView([37.572,126.985],13);
    setTimeout(()=>ui.map.invalidateSize(),50);
  }
  async function loadRestaurants(){
    try{
      const response=await fetch(root+'data/restaurants.json',{cache:'no-store'});
      if(!response.ok)throw Error('HTTP '+response.status);
      const data=await response.json();
      if(!Array.isArray(data.items))throw Error('Unexpected data');
      ui.restaurants=data.items;ui.loaded=true;apply();
    }catch(err){
      console.error('WhatEatO snapshot unavailable',err);
      if(page==='search') $('#results').replaceChildren(el('div','empty','식당 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'));
      if(page==='map') $('#map').textContent='지도 데이터를 불러오지 못했습니다.';
    }
  }
  function mount(){
    app.replaceChildren();
    app.append(renderHeader(),page==='home'?renderHome():page==='search'?renderSearch():page==='map'?renderMap():renderBlog(),renderFooter());
    bindForm(app);
    if(page==='search'){
      $('#load-more').addEventListener('click',()=>{ui.visible+=24;showSearch()});
      loadRestaurants();
    }
    if(page==='map')loadRestaurants();
  }
  mount();
})();
