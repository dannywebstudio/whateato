#!/usr/bin/env node
// Deployment-preparation invariant check. Never reads or prints environment secrets.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const yaml=readFileSync(new URL('../render.yaml',import.meta.url),'utf8');
for (const line of [
  'type: web','name: whateato-staging','runtime: node','plan: free',
  'repo: https://github.com/dannywebstudio/whateato',
  'branch: feature/i18n-analytics-backend-v1',
  'autoDeployTrigger: off','healthCheckPath: /api/ready',
  'buildCommand: npm install --no-audit --no-fund && npm run build',
  'startCommand: npm run start -- --hostname 0.0.0.0 --port $PORT',
  'key: NEXT_PUBLIC_LAUNCH_READY','key: DATABASE_URL'
])assert.ok(yaml.includes(line),'Missing safe Render staging config: '+line);
for (const key of [
  'NEXT_PUBLIC_LAUNCH_READY','WHATEATO_ANALYTICS_ENABLED',
  'WHATEATO_REVIEW_MODERATION_ENABLED'
])assert.match(yaml,new RegExp('key: '+key+'\\s+value: "false"'),'Unsafe public/feature flag: '+key);
assert.match(yaml,/key: DATABASE_URL\s+sync: false/,'Neon connection must be secret entered in Render only');
assert.ok(!/postgres(?:ql)?:\/\//i.test(yaml),'Database URL leaked in Render config');
assert.ok(!/(?:[A-Za-z0-9_-]{12,}\.)?onrender\.com\s*$/m.test(yaml),
  'Do not hardcode or claim an unverified deployed URL');
assert.ok(!/\b(?:type: pserv|plan: starter|NEXT_PUBLIC_LAUNCH_READY\s+value: "true")\b/.test(yaml),
  'Production settings must not appear in preview blueprint');
console.log('PASS: free Render staged Next.js build, explicit safe flags, secret-only Neon URL, no auto deploy');
