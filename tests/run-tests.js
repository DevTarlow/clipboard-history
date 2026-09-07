// Minimal test harness — run with: gjs -m tests/run-tests.js
import { HistoryStore } from '../historyStore.js';

let passed = 0, failed = 0;
function check(name, cond) {
    if (cond) { passed++; console.log(`  ok  ${name}`); }
    else { failed++; console.error(`FAIL  ${name}`); }
}
function tmpPath() {
    return `/tmp/clipboard-history-test-${Date.now()}-${Math.floor(Math.random() * 1e6)}.json`;
}

const store = new HistoryStore(tmpPath());
const e = store.add('hello world');
check('add returns entry', !!e && e.text === 'hello world');
check('entry has id + ts', typeof e.id === 'string' && typeof e.ts === 'number');
check('persisted to disk', store.entries.length === 1);

check('dedupe move-to-top', (() => {
    const s = new HistoryStore(tmpPath());
    s.add('a'); s.add('b'); s.add('a');
    const list = s.entries;
    return list.length === 2 && list[0].text === 'a';
})());

check('cap at 250, oldest dropped', (() => {
    const s = new HistoryStore(tmpPath());
    for (let i = 0; i < 260; i++) s.add(`item-${i}`);
    return s.entries.length === 250 && s.entries[0].text === 'item-259' &&
           !s.entries.some(x => x.text === 'item-0');
})());

check('OTP 6-digit skipped', (() => {
    const s = new HistoryStore(tmpPath());
    const added = s.add('482913');
    return added === null && s.entries.length === 0;
})());

check('whitespace-only skipped', (() => {
    const s = new HistoryStore(tmpPath());
    return s.add('   \n  ') === null;
})());

check('long text truncated', (() => {
    const s = new HistoryStore(tmpPath());
    const e = s.add('x'.repeat(20000));
    return e.text.length === 10000;
})());

check('urls extracted', (() => {
    const s = new HistoryStore(tmpPath());
    const e = s.add('check https://mossaistudio.com and http://example.com/a?b=1 now');
    return e.urls.length === 2 && e.urls[0] === 'https://mossaistudio.com';
})());

check('remove by id', (() => {
    const s = new HistoryStore(tmpPath());
    const e = s.add('x');
    s.remove(e.id);
    return s.entries.length === 0;
})());

check('clear all', (() => {
    const s = new HistoryStore(tmpPath());
    s.add('a'); s.add('b'); s.clear();
    return s.entries.length === 0;
})());

check('search case-insensitive substring', (() => {
    const s = new HistoryStore(tmpPath());
    s.add('CopySprout login page'); s.add('Firebase docs');
    const r = s.search('copy');
    return r.length === 1 && r[0].text === 'CopySprout login page';
})());

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) imports.system.exit(1);
