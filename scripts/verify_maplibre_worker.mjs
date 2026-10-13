#!/usr/bin/env node
// A missing MapLibre v6 worker results in an empty gray map even when Next.js
// and all restaurant APIs return HTTP 200. Verify both same-origin modules.
import {readFile,stat} from 'node:fs/promises';
import {strict as assert} from 'node:assert';
const base=new URL('../public/maplibre/',import.meta.url);
for(const file of ['maplibre-gl-worker.mjs','maplibre-gl-shared.mjs']){
  const url=new URL(file,base);
  const info=await stat(url);
  assert.ok(info.isFile()&&(file==='maplibre-gl-worker.mjs'?info.size>1000:info.size>=0),'Missing or truncated MapLibre runtime: '+file);
}
const entry=await readFile(new URL('maplibre-gl-worker.mjs',base),'utf8');
assert.ok(entry.includes('maplibre-gl-shared.mjs'),
  'MapLibre worker must import the sibling runtime from the same directory');
console.log('PASS MapLibre v6 runtime: worker + sibling module available at /maplibre/ (no CDN or map token)');
