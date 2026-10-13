#!/usr/bin/env node
// MapLibre GL JS v6 ships a standalone ESM worker whose sibling module is
// imported relatively. Next.js/Webpack cannot reliably auto-discover either
// file from the bundled map component. Copy BOTH files together to same-origin
// /public before every build and local dev start. No third-party CDN scripts.
import {mkdir,copyFile,stat} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const moduleUrl=import.meta.resolve('maplibre-gl');
const sourceDir=dirname(fileURLToPath(moduleUrl));
const targetDir=fileURLToPath(new URL('../public/maplibre/',import.meta.url));
await mkdir(targetDir,{recursive:true});
for(const name of ['maplibre-gl-worker.mjs','maplibre-gl-shared.mjs']){
  const src=join(sourceDir,name);
  const dst=join(targetDir,name);
  await copyFile(src,dst);
  const size=(await stat(dst)).size;
  if(size<16)throw Error('MapLibre worker runtime unexpectedly empty: '+name);
  console.log('Prepared same-origin MapLibre v6 runtime: '+name+' ('+size+' bytes)');
}
