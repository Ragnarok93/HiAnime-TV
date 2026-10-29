#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('app/src/main/assets/tv-home.html', 'utf8');
const navigation = fs.readFileSync('app/src/main/assets/tv-navigation.js', 'utf8');
const androidShell = fs.readFileSync('app/src/main/java/com/ragnarok93/hianimetv/MainActivity.java', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
assert.ok(scripts.length > 0, 'TV home must contain an inline application script');

for (const [index, match] of scripts.entries()) {
  new vm.Script(match[1], { filename: `tv-home-inline-${index + 1}.js` });
}
new vm.Script(navigation, { filename: 'tv-navigation.js' });

const checks = [
  ['remote-friendly navigation controls', /id="navHome"/],
  ['catalogue request fallback handling', /fetch\(HOME,\{credentials:'include'\}\)\.catch/],
  ['catalogue cache persistence', /hianime-tv-catalogue/],
  ['cached catalogue fallback', /Previously loaded catalogue/],
  ['live catalogue retry from cache', /Retry live catalogue/],
  ['empty refresh preserves previous catalogue cache', /if\(items\.length\)\{try\{localStorage\.setItem\('hianime-tv-catalogue'/],
  ['continue watching remains available from cache', /cachedRows\.unshift\(\{name:'Continue Watching',items:watchHistory\}\)/],
  ['strict HiAnime host validation', /host==='hianime\.ms'\|\|host\.endsWith\('\.hianime\.ms'\)/],
  ['favorites persistence', /hianime-tv-favorites/],
  ['watch-history persistence', /hianime-tv-history/],
  ['continue-watching shelf', /Continue Watching/],
  ['episode selection routes through embedded player', /b\.onclick=function\(\)\{playEpisode\(item,ep\)\}/],
  ['browser back-state handling', /addEventListener\('popstate'/],
  ['search form', /id="searchForm"/],
  ['retry control for catalogue failures', /id="retry"/],
  ['episode playback remains in the TV shell', /function playEpisode\(item,episode\)/],
  ['embedded episode player', /frame\.src=episode\.url/],
  ['Continue Watching opens embedded playback', /if\(item\.resumeUrl\)playEpisode/],
  ['playback overlay closes through app navigation', /window\.hianimeTvClosePlayer=function/],
  ['embedded player receives remote focus', /setPlayerFocus\(true\)/],
  ['embedded player loading status', /Loading episode player/],
  ['embedded player reload control', /Reload player/],
  ['slow-player recovery message', /taking longer than expected/],
  ['player load and error feedback', /frame\.addEventListener\('load'/],
];

for (const [name, pattern] of checks) {
  assert.match(html, pattern, `Missing expected feature: ${name}`);
  console.log(`PASS ${name}`);
}
const watchFunction = html.match(/function isWatch\(url\)\{[^}]+\}/);
assert.ok(watchFunction, 'Watch URL matcher must exist');
const isWatch = new Function(watchFunction[0] + '; return isWatch;')();
assert.equal(isWatch('https://hianime.ms/watch-one-piece-episode-1-1a877'), true, 'Must accept current /watch-title URLs');
assert.equal(isWatch('https://hianime.ms/watch/one-piece'), true, 'Must accept legacy /watch/title URLs');
assert.equal(isWatch('https://hianime.ms/details/one-piece-1a877'), false, 'Must reject title details URLs as episodes');
console.log('PASS current and legacy watch URL formats');
assert.ok(html.includes("/\\/watch(?:\\/|-)/i.test(new URL(href).pathname)"), 'Must exclude episode pages from catalogue cards');
console.log('PASS episode pages excluded from catalogue cards');
const navigationChecks = [
  ['directional focus navigation', /window\.hianimeTvNavigate\s*=\s*function/],
  ['remote activation handler', /window\.hianimeTvActivate\s*=\s*activate/],
  ['editable-field focus synchronization', /HiAnimeTvBridge\.setEditable/],
  ['visible and enabled focus filtering', /function rendered\(el\)/],
  ['player D-pad fallback', /window\.hianimeTvPlayerKey\s*=\s*function/],
  ['MENU action handler', /window\.hianimeTvMenu\s*=\s*menuAction/],
  ['focus recovery after page updates', /new MutationObserver/],
  ['iframe is a TV focus target', /textarea,iframe,\[role="button"\]/],
];
for (const [name, pattern] of navigationChecks) {
  assert.match(navigation, pattern, `Missing TV navigation behavior: ${name}`);
  console.log(`PASS ${name}`);
}
assert.match(navigation, /\]\.join\('\\n'\)/, 'TV focus stylesheet must join rules with actual newline separators');
console.log('PASS TV focus stylesheet uses real line separators');
const shellChecks = [
  ['Back closes playback before navigating away', /hianimeTvClosePlayer[\s\S]*if \("true"\.equals\(value\) \|\| web == null\) return;/],
  ['Back exits the app when no history remains', /if \(web\.canGoBack\(\)\) web\.goBack\(\);\s*else finish\(\);/],
  ['fullscreen playback custom view is supported', /onShowCustomView/],
  ['network failures show a recovery screen', /private void showError\(\)/],
];
for (const [name, pattern] of shellChecks) {
  assert.match(androidShell, pattern, `Missing Android shell behavior: ${name}`);
  console.log(`PASS ${name}`);
}
console.log(`PASS parsed ${scripts.length} inline script(s) and tv-navigation.js without syntax errors`);
