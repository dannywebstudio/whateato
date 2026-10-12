/* WhatEatO GitHub Pages preview — entirely read-only, static JSON snapshot. */
(() => {
  'use strict';

  const el = id => document.getElementById(id);
  const state = {
    data: [], filtered: [], category: 'all', q: '', district: '',
    visible: 10, mapFocus: false, map: null, layer: null, markerById: new Map(),
    ready: false
  };
  const fmt = new Intl.NumberFormat('ko-KR');

  const catName = raw => {
    const name = String(raw || '').trim();
    if (name.includes('한식')) return '한식';
    if (name.includes('일식') || name.includes('일본식')) return '일식';
    if (name.includes('중국') || name.includes('중식')) return '중식';
    if (name.includes('경양식') || name.includes('양식') || name.includes('외국음식')) return '양식';
    if (name.includes('분식')) return '분식';
    if (name.includes('까페') || name.includes('카페') || name.includes('커피')) return '카페';
    if (name.includes('통닭') || name.includes('치킨') || name.includes('호프')) return '치킨';
    return '기타';
  };

  const norm = s => String(s || '').normalize('NFKC').trim().toLocaleLowerCase('ko-KR');
  const hasCoords = r => typeof r.lat === 'number' && typeof r.lon === 'number'
    && r.lat >= 33 && r.lat <= 39.5 && r.lon >= 124 && r.lon <= 132;

  const make = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  };

  function createCard(r) {
    const card = make('article', 'card');
    const body = make('div', 'card-body');
    const top = make('div', 'card-top');
    top.append(make('h3', '', r.name || '이름 없음'));
    top.append(make('span', 'cuisine', r.category || '기타'));
    body.append(top);
    body.append(make('p', 'card-address', r.road || r.lot || '주소 정보 없음'));
    const meta = make('div', 'card-meta');
    meta.append(make('span', 'status-badge', '인허가 상태 · 영업'));
    meta.append(make('span', '', [r.region, r.district].filter(Boolean).join(' ')));
    body.append(meta);
    card.append(body);
    const go = make('button', 'card-go', '↗');
    go.type = 'button';
    go.title = hasCoords(r) ? '지도에서 보기' : '좌표 미확인';
    go.setAttribute('aria-label', (r.name || '식당') + ' 지도에서 보기');
    go.disabled = !hasCoords(r);
    go.addEventListener('click', () => focusPlace(r));
    card.append(go);
    return card;
  }

  function drawCards() {
    const cards = el('cards');
    cards.replaceChildren();
    if (!state.ready) {
      cards.append(make('div', 'loading', '데이터를 불러오는 중입니다…'));
      return;
    }
    if (!state.filtered.length) {
      cards.append(make('div', 'empty-results', '검색 결과가 없습니다.\n다른 식당 이름이나 지역, 카테고리로 다시 찾아보세요.'));
    } else {
      for (const r of state.filtered.slice(0, state.visible)) cards.append(createCard(r));
    }
    el('result-count').textContent = fmt.format(state.filtered.length) + '곳';
    el('load-more').hidden = state.filtered.length <= state.visible || state.mapFocus;
  }

  function initMap() {
    if (state.map) return true;
    if (!window.L) {
      el('map').replaceChildren(make('div', 'map-fallback', '지도를 표시하지 못했습니다. 연결 상태를 확인하거나 목록을 이용해 주세요.'));
      return false;
    }
    state.map = L.map('map', { zoomControl: true, scrollWheelZoom: false }).setView([37.571, 126.987], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(state.map);
    state.layer = L.layerGroup().addTo(state.map);
    return true;
  }

  function escapeText(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }

  function popupContent(r) {
    return '<div class="restaurant-popup"><strong>' + escapeText(r.name) +
      '</strong><p>' + escapeText(r.road || r.lot) +
      '</p><small>' + escapeText(r.category) + ' · 인허가 영업 상태</small></div>';
  }

  function drawMap() {
    if (!initMap()) return;
    state.layer.clearLayers();
    state.markerById.clear();
    const pins = state.filtered.filter(hasCoords).slice(0, 90);
    const bounds = [];
    for (const r of pins) {
      const marker = L.circleMarker([r.lat, r.lon], {
        radius: 7, color: '#fff', weight: 2, fillColor: '#16835c', fillOpacity: 0.88
      }).bindPopup(popupContent(r), { maxWidth: 265 });
      marker.addTo(state.layer);
      state.markerById.set(r.id, marker);
      bounds.push([r.lat, r.lon]);
    }
    const coordsCount = state.filtered.reduce((count, r) => count + (hasCoords(r) ? 1 : 0), 0);
    el('map-count').textContent = fmt.format(pins.length) + ' / ' + fmt.format(coordsCount) + '개 위치 표시';
    if (bounds.length) {
      state.map.fitBounds(bounds, { padding: [28, 28], maxZoom: 14 });
    } else {
      state.map.setView([37.571, 126.987], 12);
    }
    setTimeout(() => state.map.invalidateSize(), 30);
  }

  function focusPlace(r) {
    if (!hasCoords(r)) return;
    if (!state.mapFocus && window.matchMedia('(max-width: 900px)').matches) {
      setView('map');
    }
    if (!initMap()) return;
    let marker = state.markerById.get(r.id);
    if (!marker) {
      marker = L.circleMarker([r.lat, r.lon], {
        radius: 9, color: '#fff', weight: 2, fillColor: '#188964', fillOpacity: 1
      }).bindPopup(popupContent(r)).addTo(state.layer);
      state.markerById.set(r.id, marker);
    }
    state.map.setView([r.lat, r.lon], 16);
    marker.openPopup();
    el('map-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => state.map.invalidateSize(), 100);
  }

  function setView(view) {
    state.mapFocus = view === 'map';
    el('results-layout').classList.toggle('map-focus', state.mapFocus);
    el('view-list').classList.toggle('selected', !state.mapFocus);
    el('view-map').classList.toggle('selected', state.mapFocus);
    el('view-list').setAttribute('aria-pressed', String(!state.mapFocus));
    el('view-map').setAttribute('aria-pressed', String(state.mapFocus));
    drawCards();
    if (state.mapFocus || window.innerWidth > 900) drawMap();
  }

  function applyFilters() {
    if (!state.ready) return;
    const tokens = norm(state.q).split(/\s+/).filter(Boolean).slice(0, 8);
    state.filtered = state.data.filter(r => {
      if (state.category !== 'all' && catName(r.category) !== state.category) return false;
      if (state.district && [r.region, r.district].filter(Boolean).join(' ') !== state.district) return false;
      if (!tokens.length) return true;
      const hay = norm([r.name, r.road, r.lot, r.region, r.district, r.category].join(' '));
      return tokens.every(word => hay.includes(word));
    });
    state.visible = 10;
    drawCards();
    if (state.mapFocus || window.innerWidth > 900) drawMap();
  }

  function setCategory(category) {
    state.category = category;
    for (const button of document.querySelectorAll('[data-category]')) {
      button.classList.toggle('active', button.dataset.category === category);
    }
    applyFilters();
  }

  let wait;
  el('q').addEventListener('input', evt => {
    clearTimeout(wait);
    wait = setTimeout(() => { state.q = evt.target.value; applyFilters(); }, 120);
  });
  el('search-form').addEventListener('submit', evt => {
    evt.preventDefault();
    clearTimeout(wait);
    state.q = el('q').value;
    applyFilters();
    el('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  for (const button of document.querySelectorAll('[data-query]')) {
    button.addEventListener('click', () => {
      state.q = button.dataset.query;
      el('q').value = state.q;
      state.category = 'all';
      for (const category of document.querySelectorAll('[data-category]')) {
        category.classList.toggle('active', category.dataset.category === 'all');
      }
      applyFilters();
      el('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  for (const button of document.querySelectorAll('[data-category]')) {
    button.addEventListener('click', () => setCategory(button.dataset.category));
  }
  el('district').addEventListener('change', evt => {
    state.district = evt.target.value;
    applyFilters();
  });
  el('load-more').addEventListener('click', () => {
    state.visible += 10;
    drawCards();
  });
  el('view-list').addEventListener('click', () => setView('list'));
  el('view-map').addEventListener('click', () => setView('map'));
  document.querySelector('.nav a[href="#map-panel"]').addEventListener('click', e => {
    if (window.matchMedia('(max-width: 900px)').matches) {
      e.preventDefault();
      setView('map');
      el('map-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  fetch('./data/restaurants.json', { cache: 'no-cache' })
    .then(response => {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    })
    .then(payload => {
      if (!Array.isArray(payload.items) || payload.items.length < 1) throw new Error('No restaurants in snapshot');
      state.data = payload.items.filter(r => r && r.id && r.name);
      state.ready = true;
      el('stat-total').textContent = fmt.format(state.data.length);
      el('stat-mapped').textContent = fmt.format(state.data.filter(hasCoords).length);
      const districts = [...new Set(state.data.map(r => [r.region, r.district].filter(Boolean).join(' ')).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko'));
      el('stat-areas').textContent = String(districts.length);
      const select = el('district');
      for (const district of districts) {
        const option = document.createElement('option');
        option.value = district;
        option.textContent = district;
        select.append(option);
      }
      const date = payload.generated_at ? new Date(payload.generated_at).toLocaleDateString('ko-KR', {timeZone: 'Asia/Seoul'}) : '';
      el('freshness').textContent = 'DB 스냅샷 · ' + date + ' 기준';
      applyFilters();
    })
    .catch(err => {
      state.ready = false;
      const message = make('div', 'empty-results', '음식점 데이터 스냅샷을 불러오지 못했어요. 배포 상태를 확인해 주세요.');
      el('cards').replaceChildren(message);
      el('result-count').textContent = '데이터 오류';
      el('freshness').textContent = '데이터 연결 확인 필요';
      console.error('WhatEatO preview load failed:', err.message);
    });
})();
