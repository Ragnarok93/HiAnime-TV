#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('app/src/main/assets/tv-home.html', 'utf8');
const navigation = fs.readFileSync('app/src/main/assets/tv-navigation.js', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
assert.ok(scripts.length > 0, 'TV home must contain an inline application script');

for (const [index, match] of scripts.entries()) {
  new vm.Script(match[1], { filename: `tv-home-inline-${index + 1}.js` });
}
new vm.Script(navigation, { filename: 'tv-navigation.js' });

const checks = [
  ['remote-friendly navigation controls', /id="navHome"/],
  ['catalogue request fallback handling', /fetch\(HOME,\{credentials:'include'\}\)\.catch/],
  ['strict HiAnime host validation', /host==='hianime\.ms'\|\|host\.endsWith\('\.hianime\.ms'\)/],
  ['favorites persistence', /hianime-tv-favorites/],
  ['watch-history persistence', /hianime-tv-history/],
  ['continue-watching shelf', /Continue Watching/],
  ['episode selection remembers history', /rememberWatch\(item,ep\);location\.href=ep\.url/],
  ['browser back-state handling', /addEventListener\('popstate'/],
  ['search form', /id="searchForm"/],
  ['retry control for catalogue failures', /id="retry"/],
  ['TV focus stylesheet uses real line separators', /\]\.join\('\\\\n'\)/],
];

for (const [name, pattern] of checks) {
  assert.match(html, pattern, `Missing expected feature: ${name}`);
  console.log(`PASS ${name}`);
}
console.log(`PASS parsed ${scripts.length} inline script(s) and tv-navigation.js without syntax errors`);
