(function(){
'use strict';
/* Piano Piano: private Italienisch Lern App. Alles läuft lokal auf dem Gerät. */
const APP_VERSION = '1.2.0';
const STORE_KEY = 'pianopiano.v1';

/* ---------- kleine Helfer ---------- */
/* append ignoriert null und false, damit nie 'null' als Text erscheint */
(() => {
  const fix = proto => { const orig = proto.append; proto.append = function (...n) { return orig.apply(this, n.filter(x => x != null && x !== false)); }; };
  fix(Element.prototype); fix(DocumentFragment.prototype);
})();
const $ = (sel, el = document) => el.querySelector(sel);
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'style') el.style.cssText = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}
const shuffle = a => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
const sample = (a, n) => shuffle(a).slice(0, n);
const pick = a => a[Math.floor(Math.random() * a.length)];
const range = (a, b) => { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dayNum = (d = new Date()) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
const today = () => dayNum();
const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const fmtToday = () => { const d = new Date(); return `${WEEKDAYS[d.getDay()]}, ${d.getDate()}. ${MONTHS[d.getMonth()]}`; };
/* Wochenende: nur kurz wiederholen, kein neuer Stoff. dayNum 0 (1.1.1970) war ein Donnerstag. */
const weekdayOf = t => (t + 4) % 7;
const isWeekendDay = t => weekdayOf(t) === 0 || weekdayOf(t) === 6;
const isWeekend = () => isWeekendDay(today());
const WEEKEND_CAP = 12;
const WEEKEND_GOAL = 5;

/* ---------- Icons (inline SVG) ---------- */
const P = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
const ICONS = {
  home: `<svg viewBox="0 0 24 24" ${P}><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h5v-6h4v6h5V9.5"/></svg>`,
  path: `<svg viewBox="0 0 24 24" ${P}><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h7.5a3.5 3.5 0 0 0 0-7h-7a3.5 3.5 0 0 1 0-7H16"/></svg>`,
  dumbbell: `<svg viewBox="0 0 24 24" ${P}><path d="M14.4 14.4 9.6 9.6"/><path d="M18.66 21.51a2 2 0 1 1-2.83-2.82l-1.77 1.77a2 2 0 1 1-2.83-2.83l6.37-6.37a2 2 0 1 1 2.83 2.83l-1.77 1.77a2 2 0 1 1 2.83 2.83z"/><path d="m21.5 21.5-1.4-1.4"/><path d="M3.9 3.9 2.5 2.5"/><path d="M6.4 12.77a2 2 0 1 1-2.83-2.83l1.77-1.77a2 2 0 1 1-2.83-2.83l2.83-2.83a2 2 0 1 1 2.83 2.83l1.77-1.77a2 2 0 1 1 2.83 2.83z"/></svg>`,
  book: `<svg viewBox="0 0 24 24" ${P}><path d="M4 19.5V5a2 2 0 0 1 2-2h14v15H6a2 2 0 0 0-2 2z"/><path d="M6 21h14v-3"/></svg>`,
  gear: `<svg viewBox="0 0 24 24" ${P}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  speaker: `<svg viewBox="0 0 24 24" ${P}><path d="M11 5 6 9H2v6h4l5 4V5z" fill="currentColor" stroke-width="1.5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`,
  x: `<svg viewBox="0 0 24 24" ${P}><path d="M18 6 6 18M6 6l12 12"/></svg>`,
  check: `<svg viewBox="0 0 24 24" ${P} stroke-width="3"><path d="M20 6 9 17l-5-5"/></svg>`,
  checkCircle: `<svg viewBox="0 0 24 24" ${P}><circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/></svg>`,
  xCircle: `<svg viewBox="0 0 24 24" ${P}><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>`,
  flame: `<svg viewBox="0 0 24 24" ${P}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
  star: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>`,
  chevR: `<svg viewBox="0 0 24 24" ${P}><path d="m9 18 6-6-6-6"/></svg>`,
  chevL: `<svg viewBox="0 0 24 24" ${P}><path d="m15 18-6-6 6-6"/></svg>`,
  cards: `<svg viewBox="0 0 24 24" ${P}><rect x="3" y="6" width="13" height="15" rx="2"/><path d="M8 3h11a2 2 0 0 1 2 2v13"/></svg>`,
  repeat: `<svg viewBox="0 0 24 24" ${P}><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>`,
  ear: `<svg viewBox="0 0 24 24" ${P}><path d="M6 8.5a6.5 6.5 0 1 1 13 0c0 6-6 6-6 10a3.5 3.5 0 1 1-7 0"/><path d="M15 8.5a2.5 2.5 0 0 0-5 0v1a2 2 0 1 1 0 4"/></svg>`,
  keyboard: `<svg viewBox="0 0 24 24" ${P}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M8 13h.01M12 13h.01M16 13h.01M7 16h10"/></svg>`,
  puzzle: `<svg viewBox="0 0 24 24" ${P}><path d="M4 7h3a2 2 0 1 1 4 0h3v3a2 2 0 1 1 0 4v3h-3a2 2 0 1 0-4 0H4v-3a2 2 0 1 0 0-4z"/></svg>`,
  scale: `<svg viewBox="0 0 24 24" ${P}><path d="M12 3v18M7 21h10M5 7h14"/><path d="m5 7-3 7a3 3 0 0 0 6 0z"/><path d="m19 7-3 7a3 3 0 0 0 6 0z"/></svg>`,
  chat: `<svg viewBox="0 0 24 24" ${P}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  bolt: `<svg viewBox="0 0 24 24" ${P}><path d="M13 2 3 14h9l-1 8 10-12h-9z"/></svg>`,
  target: `<svg viewBox="0 0 24 24" ${P}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
  trophy: `<svg viewBox="0 0 24 24" ${P}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0z"/></svg>`,
  sun: `<svg viewBox="0 0 24 24" ${P}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" ${P}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`,
  play: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8z"/></svg>`,
  stop: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>`,
  text: `<svg viewBox="0 0 24 24" ${P}><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>`,
  quote: `<svg viewBox="0 0 24 24" ${P}><path d="M7 7h4v4c0 3-1.5 5-4 6M15 7h4v4c0 3-1.5 5-4 6"/></svg>`,
  share: `<svg viewBox="0 0 24 24" ${P}><path d="M12 3v13M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>`,
};
const icon = (name, cls = 'ic') => h('span', { class: cls, html: ICONS[name] || '' });

/* ---------- Speicher ---------- */
const defaultSettings = () => ({ goal: 15, sound: 'on', rate: 'normal', voice: '', recall: 'type', fx: true, theme: 'auto' });
const defaultState = () => ({ v: 1, created: Date.now(), startDay: null, name: '', settings: defaultSettings(), srs: {}, done: {}, stats: { days: {} }, lastBackup: null, hideInstall: false });
function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s.settings) delete s.settings.voiceMode; // natural voices were removed in 1.2.0
      const d = defaultState();
      return Object.assign(d, s, { settings: Object.assign(defaultSettings(), s.settings || {}), stats: Object.assign({ days: {} }, s.stats || {}) });
    }
  } catch (e) { /* leer starten */ }
  return defaultState();
}
let S = loadState();
let saveTimer = null;
function save() { clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 250); }
function saveNow() {
  clearTimeout(saveTimer);
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); }
  catch (e) { toast('Speichern hat nicht geklappt. Ist der iPhone Speicher voll?'); }
}
window.addEventListener('pagehide', saveNow);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* egal */ }

/* ---------- Kursmodell ---------- */
const UNITS = (window.COURSE && window.COURSE.units) || [];
const unitById = id => UNITS.find(u => u.id === id);
const ITEMS = {};
const ITEM_LIST = [];
UNITS.forEach(u => {
  u.vocab.forEach((v, i) => {
    const it = Object.assign({ id: `v${u.id}_${i}`, unit: u.id, idx: i, kind: 'word' }, v);
    ITEMS[it.id] = it; ITEM_LIST.push(it);
  });
  (u.spoken || []).forEach((v, i) => {
    const it = Object.assign({ id: `p${u.id}_${i}`, unit: u.id, idx: 100 + i, kind: 'spoken' }, v);
    ITEMS[it.id] = it; ITEM_LIST.push(it);
  });
});
const spokenItems = uid => ITEM_LIST.filter(i => i.unit === uid && i.kind === 'spoken');
const wordItems = uid => ITEM_LIST.filter(i => i.unit === uid && i.kind === 'word');
const unitItems = uid => ITEM_LIST.filter(i => i.unit === uid);

const PHASES = [
  { n: 1, title: 'Grundlagen', de: 'Grüßen, Zahlen, Café, Familie, Markt' },
  { n: 2, title: 'Unterwegs', de: 'Alltag, Uhrzeit, Stadt, Restaurant, Freizeit, Reisen' },
  { n: 3, title: 'Erleben und erzählen', de: 'Hotel, Wetter, Vergangenheit, Ausflüge, Shopping' },
  { n: 4, title: 'Gespräche', de: 'Gesundheit, zu Gast sein, Freunde, Kultur, von früher erzählen' },
];
const WEEKS = [];
(() => {
  const plan = [[1, 6], [7, 12], [13, 17], [18, 22]];
  let w = 1;
  plan.forEach(([a, b], pi) => {
    for (let id = a; id <= b; id++) { const u = unitById(id); if (u) WEEKS.push({ week: w++, kind: 'unit', unit: u, phase: pi + 1 }); }
    const final = pi === plan.length - 1;
    WEEKS.push({ week: w++, kind: 'review', phase: pi + 1, final, scope: final ? range(1, b) : range(a, b) });
  });
})();
const weekByNum = n => WEEKS.find(w => w.week === n);
const TOTAL_WEEKS = WEEKS.length;

const UNIT_STEPS = [
  { k: 'w1', title: 'Wörter 1', sub: () => '12 neue Wörter', ic: 'cards' },
  { k: 'w2', title: 'Wörter 2', sub: () => '12 neue Wörter', ic: 'cards' },
  { k: 'gr', title: 'Grammatik', sub: w => w.unit.grammar.title, ic: 'scale' },
  { k: 'w3', title: 'Wörter 3', sub: () => '12 neue Wörter', ic: 'cards' },
  { k: 'pa', title: 'Alltagssprache', sub: () => 'So sagt man das wirklich', ic: 'quote' },
  { k: 'dl', title: 'Dialog', sub: w => w.unit.dialog.title, ic: 'chat' },
  { k: 'sp', title: 'Im Kopf antworten', sub: () => 'Sätze und Situationen durchdenken', ic: 'chat' },
  { k: 'ts', title: 'Wochentest', sub: () => '15 Fragen zur ganzen Woche', ic: 'target' },
];
const REVIEW_STEPS = [
  { k: 'rv', title: 'Wörter mischen', sub: () => '20 Wörter, die schwierigen zuerst', ic: 'repeat' },
  { k: 'hr', title: 'Hörtraining', sub: () => 'Verstehen ohne mitzulesen', ic: 'ear' },
  { k: 'rg', title: 'Grammatik mischen', sub: () => 'Alles aus den letzten Wochen', ic: 'scale' },
  { k: 'rs', title: 'Sätze bauen', sub: () => 'Ganze Sätze zusammensetzen', ic: 'puzzle' },
  { k: 'rd', title: 'Dialoge', sub: () => 'Zwei Gespräche noch einmal', ic: 'chat' },
  { k: 'rt', title: w => w.final ? 'Abschlusstest' : 'Großer Test', sub: w => w.final ? '30 Fragen zum ganzen Kurs' : '25 Fragen zur ganzen Phase', ic: 'trophy' },
];
const stepsOf = w => w.kind === 'unit' ? UNIT_STEPS : REVIEW_STEPS;
const stepTitle = (st, w) => typeof st.title === 'function' ? st.title(w) : st.title;
const stepKey = (week, k) => `${week}.${k}`;
const isDone = (week, k) => !!S.done[stepKey(week, k)];
const weekDoneCount = w => stepsOf(w).filter(st => isDone(w.week, st.k)).length;
function nextStep() {
  for (const w of WEEKS) for (const st of stepsOf(w)) if (!isDone(w.week, st.k)) return { w, st };
  return null;
}
function weekTitle(w) { return w.kind === 'unit' ? w.unit.title : (w.final ? 'Gran finale' : 'Ripasso'); }
function weekTitleDe(w) {
  if (w.kind === 'unit') return w.unit.titleDe;
  return w.final ? 'Abschluss: alles wiederholen' : `Wiederholung der Wochen ${WEEKS.find(x => x.kind === 'unit' && x.unit.id === w.scope[0]).week} bis ${w.week - 1}`;
}
function weekGoal(w) {
  if (w.kind === 'unit') return w.unit.goal;
  return w.final ? 'Du wiederholst den ganzen Kurs und zeigst im Abschlusstest, was du kannst.' : 'Keine neuen Wörter diese Woche. Du festigst alles, damit es wirklich hängen bleibt.';
}
function starsFor(pct) { return pct >= 90 ? 3 : pct >= 75 ? 2 : pct >= 50 ? 1 : 0; }

/* ---------- Wiederholsystem (Leitner Boxen) ---------- */
const IV = [0, 1, 2, 4, 7, 14, 30, 60, 120];
function addToSrs(id) {
  if (S.srs[id]) return false;
  S.srs[id] = { b: 1, due: today() + 1, seen: 0, wrong: 0, added: today() };
  return true;
}
function srsAnswer(id, correct) {
  const it = S.srs[id];
  if (!it) return;
  const t = today();
  it.seen = (it.seen || 0) + 1;
  it.last = t;
  if (correct) {
    if (it.due <= t) { it.b = Math.min(it.b + 1, 8); it.due = t + IV[it.b]; }
  } else {
    it.wrong = (it.wrong || 0) + 1;
    it.b = Math.max(1, it.b - 2);
    it.due = t;
  }
}
const learnedIds = () => Object.keys(S.srs).filter(id => ITEMS[id]);
const dueIds = () => learnedIds().filter(id => S.srs[id].due <= today()).sort((a, b) => (S.srs[a].due - S.srs[b].due) || (S.srs[a].b - S.srs[b].b));
const strongCount = () => learnedIds().filter(id => S.srs[id].b >= 4).length;
const reviewCap = () => isWeekend() ? WEEKEND_CAP : ({ 10: 15, 15: 20, 20: 25, 30: 40 }[S.settings.goal] || 20);

/* ---------- Statistik ---------- */
function dayStat(t = today()) { return S.stats.days[t] || (S.stats.days[t] = { s: 0, a: 0, c: 0 }); }
function addSeconds(sec) { if (sec > 0) { dayStat().s += Math.round(sec); save(); } }
function streak() {
  const days = S.stats.days;
  const ok = d => days[d] && days[d].s >= 60;
  let t = today();
  if (!ok(t)) t -= 1;
  let n = 0;
  // A skipped weekend day does not break the streak, it just does not count
  while (ok(t) || isWeekendDay(t)) { if (ok(t)) n++; t--; }
  return n;
}
const minutesToday = () => Math.round((S.stats.days[today()] || { s: 0 }).s / 60);

/* ---------- Antworten prüfen ---------- */
const normalize = s => String(s || '').toLowerCase()
  .replace(/[’‘`´]/g, "'")
  .replace(/\([^)]*\)/g, ' ')
  .replace(/[.,!?¿¡;:…"«»„“”]/g, ' ')
  .replace(/\s*'\s*/g, "'")
  .replace(/\s+/g, ' ').trim();
const noAccents = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const ARTICLE_RE = /^(?:(?:il|lo|la|i|gli|le|un|uno|una)\s+|l'|un')/;
function lev(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
/* Ergebnis: { ok, hint } */
function checkAnswer(input, candidates, { articles = false } = {}) {
  const u = normalize(input);
  if (!u) return { ok: false };
  const cands = candidates.filter(Boolean);
  for (const c of cands) if (normalize(c) === u) return { ok: true };
  for (const c of cands) if (noAccents(normalize(c)) === noAccents(u)) return { ok: true, hint: `Achte auf den Akzent: ${c}` };
  if (articles) for (const c of cands) {
    const nc = normalize(c);
    if (ARTICLE_RE.test(nc)) {
      const bare = nc.replace(ARTICLE_RE, '');
      if (noAccents(bare) === noAccents(u)) return { ok: true, hint: `Lerne das Wort mit Artikel: ${c}` };
    }
  }
  for (const c of cands) {
    const a = noAccents(normalize(c)), b = noAccents(u);
    if (a.length >= 5 && lev(a, b) === 1) return { ok: true, hint: `Fast perfekt, kleiner Tippfehler. Richtig: ${c}` };
  }
  return { ok: false };
}

/* ---------- Audio (eingebaute iPhone Stimme) ---------- */
const TTS = 'speechSynthesis' in window ? window.speechSynthesis : null;
let VOICES = [];
const NOVELTY = /eddy|flo|grandma|grandpa|nonna|nonno|reed|rocko|sandy|shelley/i;
const MALE = /luca|diego|giorgio|cosimo|paolo|marco|roberto|eddy|reed|rocko|grandpa|nonno/i;
function loadVoices() {
  if (!TTS) return;
  VOICES = TTS.getVoices().filter(v => /^it([-_]|$)/i.test(v.lang));
}
if (TTS) { loadVoices(); try { if (TTS.addEventListener) TTS.addEventListener('voiceschanged', loadVoices); else TTS.onvoiceschanged = loadVoices; } catch (e) { /* egal */ } }
function voiceScore(v) {
  let s = 0;
  if (/enhanced|premium|erweitert|verbessert|siri/i.test(v.name + ' ' + v.voiceURI)) s += 3;
  if (/it[-_]it/i.test(v.lang)) s += 1;
  if (NOVELTY.test(v.name)) s -= 10;
  if (v.localService) s += 0.5;
  return s;
}
function mainVoice() {
  if (!VOICES.length) loadVoices();
  const chosen = VOICES.find(v => v.voiceURI === S.settings.voice);
  if (chosen) return chosen;
  return VOICES.slice().sort((a, b) => voiceScore(b) - voiceScore(a))[0] || null;
}
function genderVoice(g) {
  const main = mainVoice();
  const good = VOICES.filter(v => !NOVELTY.test(v.name));
  const isMale = v => MALE.test(v.name);
  const want = good.filter(v => g === 'm' ? isMale(v) : !isMale(v)).sort((a, b) => voiceScore(b) - voiceScore(a));
  if (main && (g === 'm') === isMale(main)) return { voice: main, pitch: 1 };
  if (want.length) return { voice: want[0], pitch: 1 };
  return { voice: main, pitch: g === 'm' ? 0.8 : 1.15 };
}
const ttsClean = t => String(t).replace(/\([^)]*\)/g, ' ').replace(/\.\.\.|…/g, ', ').replace(/\//g, ', ').replace(/\s+/g, ' ').trim();
let speakToken = 0;
function speak(text, { slow = false, gender = null, onend = null } = {}) {
  if (!TTS) { if (onend) onend(); return; }
  try {
    TTS.cancel();
    const my = ++speakToken;
    const u = new SpeechSynthesisUtterance(ttsClean(text));
    u.lang = 'it-IT';
    let pitch = 1;
    let voice = mainVoice();
    if (gender) { const g = genderVoice(gender); voice = g.voice; pitch = g.pitch; }
    if (voice) u.voice = voice;
    u.pitch = pitch;
    const base = S.settings.rate === 'slow' ? 0.78 : 0.94;
    u.rate = slow ? 0.62 : base;
    let finished = false;
    const fin = () => { if (finished) return; finished = true; if (onend && my === speakToken) onend(); };
    u.onend = fin; u.onerror = fin;
    TTS.speak(u);
    if (!VOICES.length && !speak.warned) { speak.warned = true; setTimeout(() => { loadVoices(); if (!VOICES.length) toast('Keine italienische Stimme gefunden. Siehe Einstellungen.'); }, 1500); }
  } catch (e) { if (onend) onend(); }
}
function stopSpeaking() { speakToken++; try { TTS && TTS.cancel(); } catch (e) { /* egal */ } }
const soundOn = () => S.settings.sound === 'on';
function spkBtn(text, { small = false, slow = false, gender = null } = {}) {
  const b = h('button', { class: 'spk-btn' + (small ? ' small' : ''), 'aria-label': 'Anhören', html: ICONS.speaker });
  b.addEventListener('click', e => {
    e.stopPropagation();
    b.classList.add('playing');
    speak(text, { slow, gender, onend: () => b.classList.remove('playing') });
  });
  return b;
}

/* Effekt Töne */
let actx = null;
function beep(ok) {
  if (!S.settings.fx) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const notes = ok ? [[660, 0], [880, 0.09]] : [[220, 0], [185, 0.12]];
    notes.forEach(([f, t]) => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      const s = actx.currentTime + t;
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(0.07, s + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.16);
      o.connect(g).connect(actx.destination);
      o.start(s); o.stop(s + 0.18);
    });
  } catch (e) { /* egal */ }
}

/* ---------- Toast und Dialogfenster ---------- */
let toastTimer = null;
function toast(msg) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = h('div', { class: 'toast', role: 'status' }, msg);
  document.body.append(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.remove(), 2800);
}
function modal(title, text, buttons, extra) {
  const bg = h('div', { class: 'modal-bg' });
  const close = () => bg.remove();
  const box = h('div', { class: 'modal', role: 'dialog' },
    h('h3', null, title),
    text ? h('p', null, text) : null,
    extra || null,
    h('div', { class: 'btn-col' }, buttons.map(b => h('button', { class: 'btn ' + (b.cls || 'secondary'), onclick: () => { if (b.keep !== true) close(); b.do && b.do(); } }, b.label))));
  bg.addEventListener('click', e => { if (e.target === bg) close(); });
  bg.append(box);
  document.body.append(bg);
  return { close, box };
}

/* ---------- Übungs Sitzung ---------- */
let SESSION = null;
const PRAISE = ['Richtig!', 'Perfetto!', 'Bravo!', 'Esatto!', 'Giusto!', 'Benissimo!'];

function startSession(cfg) {
  stopSpeaking();
  if (SESSION) closeSession(true);
  const cards = cfg.cards.filter(Boolean);
  if (!cards.length) { toast('Hier gibt es gerade nichts zu üben.'); return; }
  const fill = h('div', { style: 'width:0%' });
  const count = h('div', { class: 's-count' });
  const root = h('div', { id: 'session' },
    h('div', { class: 's-top' },
      h('button', { class: 'icon-btn', 'aria-label': 'Beenden', html: ICONS.x, onclick: () => confirmExit() }),
      h('div', { class: 's-progress' }, fill), count),
  );
  const body = h('div', { class: 's-body' });
  const inner = h('div', { class: 's-inner' });
  const foot = h('div', { class: 's-foot' });
  body.append(inner);
  root.append(body, foot);
  document.body.append(root);
  document.body.style.overflow = 'hidden';
  SESSION = { cfg, root, body, inner, foot, fill, count, queue: cards.slice(), base: cards.length, pos: 0, results: [], retried: new Set(), t0: Date.now(), tick: Date.now(), finished: false, answered: false };
  renderCard();
}

function sessionTick() {
  const s = SESSION; if (!s) return;
  const now = Date.now();
  addSeconds(Math.min((now - s.tick) / 1000, 90));
  s.tick = now;
}

function closeSession(silent) {
  const s = SESSION; if (!s) return;
  if (!s.finished) sessionTick();
  stopSpeaking();
  s.root.remove();
  document.body.style.overflow = '';
  SESSION = null;
  saveNow();
  if (!silent) render();
}

function confirmExit() {
  const s = SESSION;
  if (!s || s.finished || s.pos === 0) { closeSession(); return; }
  const lesson = s.cfg.kind === 'lesson' || s.cfg.kind === 'test';
  modal('Jetzt aufhören?', lesson ? 'Die Lektion gilt dann noch nicht als erledigt. Was du bei den Wiederholungen schon gemacht hast, bleibt gespeichert.' : 'Alles, was du bisher geübt hast, ist gespeichert.', [
    { label: 'Weiterlernen', cls: 'primary' },
    { label: 'Beenden', cls: 'secondary', do: () => closeSession() },
  ]);
}

function setFoot(...els) {
  const s = SESSION; if (!s) return;
  s.foot.innerHTML = '';
  const els2 = els.filter(Boolean);
  s.foot.classList.toggle('hidden', !els2.length);
  if (els2.length) s.foot.append(h('div', { class: 's-foot-inner' }, els2));
}

function updateProgress() {
  const s = SESSION;
  const total = s.queue.length;
  s.fill.style.width = `${Math.round(100 * s.pos / Math.max(1, total))}%`;
  s.count.textContent = `${Math.min(s.pos + 1, total)}/${total}`;
}

function renderCard() {
  const s = SESSION; if (!s) return;
  if (s.pos >= s.queue.length) { finishSession(); return; }
  stopSpeaking();
  s.answered = false;
  s.inner.innerHTML = '';
  s.body.scrollTop = 0;
  document.querySelectorAll('.fb').forEach(e => e.remove());
  updateProgress();
  const card = s.queue[s.pos];
  const ctx = {
    inner: s.inner,
    foot: setFoot,
    next: () => { sessionTick(); s.pos++; renderCard(); },
    answer: (ok, fb) => answerCard(card, ok, fb || {}),
  };
  setFoot();
  const fn = CARD_TYPES[card.type];
  try { fn(card, ctx); }
  catch (e) { console.error(e); ctx.next(); }
}

function answerCard(card, ok, fb) {
  const s = SESSION; if (!s || s.answered) return;
  s.answered = true;
  sessionTick();
  const first = !card._retry;
  s.results.push({ card, ok, first, rating: fb.rating || null });
  const ds = dayStat(); ds.a++; if (ok) ds.c++;
  if (card.item && card.srs && first) srsAnswer(card.item.id, ok);
  if (card.items && card.srs && first) card.items.forEach(i => srsAnswer(i.id, ok));
  save();
  if (!ok && card.requeue && first) {
    const copy = Object.assign({}, card, { _retry: true });
    s.queue.splice(Math.min(s.queue.length, s.pos + 4 + Math.floor(Math.random() * 3)), 0, copy);
  }
  beep(ok);
  if (fb.say && soundOn()) speak(fb.say, { gender: fb.gender || null });
  if (fb.silent) { setTimeout(() => { if (SESSION === s) { s.pos++; renderCard(); } }, fb.delay || 0); return; }
  showFeedback(ok, fb);
}

function showFeedback(ok, fb) {
  const s = SESSION;
  setFoot();
  const go = () => { document.removeEventListener('keydown', onKey); panel.remove(); s.pos++; renderCard(); };
  const onKey = e => { if (e.key === 'Enter') { e.preventDefault(); go(); } };
  const ansRow = fb.answer ? h('div', { class: 'fb-ans' }, h('span', null, ok ? fb.answer : fb.answer), fb.say ? spkBtn(fb.say, { small: true, gender: fb.gender || null }) : null) : null;
  const panel = h('div', { class: 'fb ' + (ok ? 'ok' : 'bad'), role: 'status' },
    h('div', { class: 'fb-inner' },
      h('div', { class: 'fb-title', html: ok ? ICONS.checkCircle : ICONS.xCircle }, ok ? pick(PRAISE) : 'Nicht ganz. Richtig ist:'),
      ok && !fb.showOnOk ? null : ansRow,
      fb.hint ? h('div', { class: 'fb-sub' }, fb.hint) : null,
      fb.sub ? h('div', { class: 'fb-sub' }, fb.sub) : null,
      h('button', { class: 'btn ' + (ok ? 'good' : 'bad'), onclick: go }, 'Weiter')));
  s.root.append(panel);
  setTimeout(() => document.addEventListener('keydown', onKey), 60);
}

function finishSession() {
  const s = SESSION;
  s.finished = true;
  sessionTick();
  stopSpeaking();
  setFoot();
  const firsts = s.results.filter(r => r.first);
  const correct = firsts.filter(r => r.ok).length;
  const pct = firsts.length ? Math.round(100 * correct / firsts.length) : 100;
  const seconds = Math.round((Date.now() - s.t0) / 1000);
  const res = { pct, correct, total: firsts.length, seconds };
  const out = (s.cfg.onComplete && s.cfg.onComplete(res)) || {};
  saveNow();
  s.fill.style.width = '100%';
  s.count.textContent = '';
  const mins = Math.max(1, Math.round(seconds / 60));
  const title = out.title || (pct >= 90 ? 'Fantastico!' : pct >= 70 ? 'Ben fatto!' : 'Bravo, weiter so!');
  const statBox = [
    h('div', null, h('b', null, firsts.length ? `${pct}%` : 'ok'), h('span', null, 'richtig')),
    h('div', null, h('b', null, mins), h('span', null, mins === 1 ? 'Minute' : 'Minuten')),
    h('div', null, h('b', null, out.thirdNum != null ? out.thirdNum : streak()), h('span', null, out.thirdLbl || 'Tage in Folge')),
  ];
  s.inner.innerHTML = '';
  s.inner.append(h('div', { class: 'summary' },
    out.stars != null ? starsEl(out.stars, 3) : h('div', { class: 'big-ic', html: ICONS.check }),
    h('h2', null, title),
    h('p', null, out.text || 'Gespeichert. Piano piano si va lontano.'),
    h('div', { class: 'sum-stats' }, statBox)));
  const buttons = [];
  if (out.then) buttons.push(h('button', { class: 'btn primary', onclick: () => { const fn = out.then; closeSession(true); const cfg = fn(); if (cfg) startSession(cfg); else if (!SESSION) render(); } }, out.thenLabel || 'Weiter'));
  buttons.push(h('button', { class: 'btn ' + (out.then ? 'secondary' : 'primary'), onclick: () => closeSession() }, out.then ? 'Für heute fertig' : 'Fertig'));
  setFoot(h('div', { class: 'btn-col' }, buttons));
  if (pct >= 70) beep(true);
}

function starsEl(n, max = 3) {
  const el = h('div', { class: 'stars' });
  for (let i = 0; i < max; i++) el.append(h('span', { class: i < n ? '' : 'off', html: ICONS.star }));
  return el;
}

/* ---------- Ablenker für Multiple Choice ---------- */
function category(it) {
  if (it.kind === 'spoken') return 'spoken';
  const n = normalize(it.it);
  if (ARTICLE_RE.test(n)) return 'noun';
  if (/[?!]/.test(it.it) || n.split(' ').length > 2) return 'phrase';
  return 'word';
}
const coreDe = d => normalize(d).replace(/^(der|die|das|ein|eine)\s+/, '').split(/[ ;]/)[0];
function distractors(item, n, field) {
  const pools = [unitItems(item.unit), unitItems(item.unit - 1), unitItems(item.unit + 1), ITEM_LIST];
  const out = [];
  const seen = new Set([normalize(item[field])]);
  const seenCore = new Set([coreDe(item.de)]);
  const cat = category(item);
  for (const strict of [true, false]) for (const pool of pools) for (const c of shuffle(pool)) {
    if (out.length >= n) return out;
    if (c.id === item.id) continue;
    if (strict && category(c) !== cat) continue;
    const k = normalize(c[field]);
    if (seen.has(k) || seenCore.has(coreDe(c.de))) continue;
    seen.add(k); seenCore.add(coreDe(c.de)); out.push(c);
  }
  return out;
}

const tokenize = s => s.split(/\s+/).map(t => t.replace(/^[¿¡"«„“(]+|[.,!?;:…"»“”)]+$/g, '')).filter(t => t && !/^\.+$/.test(t));
function fillGap(q, ans) {
  if (/'$/.test(ans)) return q.replace(/___\s?/, ans);
  return q.replace('___', ans);
}
function gapHtml(q, fillText, cls) {
  const parts = String(q).split('___');
  if (parts.length < 2) return esc(q);
  const inner = fillText != null ? esc(fillText) : '&nbsp;';
  return esc(parts[0]) + `<span class="gap ${cls || ''}">${inner}</span>` + esc(parts.slice(1).join('___'));
}
function typeInput(placeholder) {
  return h('input', { class: 'type-input', type: 'text', autocapitalize: 'off', autocomplete: 'off', autocorrect: 'off', spellcheck: 'false', enterkeyhint: 'done', placeholder: placeholder || 'Antwort eintippen', 'aria-label': 'Antwort' });
}
function accentBar(input) {
  return h('div', { class: 'accents' }, ['à', 'è', 'é', 'ì', 'ò', 'ù', "'"].map(ch => h('button', {
    type: 'button',
    onpointerdown: e => e.preventDefault(),
    onclick: () => {
      const a = input.selectionStart ?? input.value.length, b = input.selectionEnd ?? input.value.length;
      input.value = input.value.slice(0, a) + ch + input.value.slice(b);
      input.focus();
      try { input.setSelectionRange(a + 1, a + 1); } catch (e) { /* egal */ }
    },
  }, ch)));
}

/* ---------- Kartentypen ---------- */
const CARD_TYPES = {
  intro(card, ctx) {
    const it = card.item;
    ctx.inner.append(h('div', { class: 'intro-card' },
      h('span', { class: 'tag' }, card.label || 'Neues Wort'),
      h('div', { class: 'q-row', style: 'justify-content:space-between' }, h('div', { class: 'q-big' }, it.it), spkBtn(it.it)),
      h('div', { class: 'meaning' }, it.de),
      it.note ? h('div', { class: 'note' }, it.note) : null,
      it.ex ? h('div', { class: 'example' }, spkBtn(it.ex, { small: true }), h('div', null, h('div', { class: 'it' }, it.ex), h('div', { class: 'de' }, it.exDe))) : null));
    ctx.foot(h('button', { class: 'btn primary', onclick: ctx.next }, 'Weiter'));
    if (soundOn()) speak(it.it);
  },

  mc_it_de(card, ctx) { mcCard(card, ctx, true); },
  mc_de_it(card, ctx) { mcCard(card, ctx, false); },

  listen(card, ctx) {
    const it = card.item;
    const opts = shuffle([it, ...distractors(it, 3, 'de')]);
    const big = spkBtn(it.it);
    ctx.inner.append(
      h('div', { class: 'q-kicker' }, 'Hör zu. Was bedeutet das?'),
      h('div', { class: 'listen-big' }, big, h('button', { class: 'slow', onclick: () => speak(it.it, { slow: true }) }, 'Langsam')));
    const box = h('div', { class: 'opts' });
    opts.forEach((o, i) => box.append(h('button', { class: 'opt', onclick: e => {
      box.classList.add('locked');
      const ok = o === it;
      e.currentTarget.classList.add(ok ? 'ok' : 'bad');
      if (!ok) box.children[opts.indexOf(it)].classList.add('ok');
      ctx.answer(ok, { answer: it.it, sub: it.de, showOnOk: true });
    } }, o.de)));
    ctx.inner.append(box);
    big.classList.add('playing');
    speak(it.it, { onend: () => big.classList.remove('playing') });
  },

  type_de_it(card, ctx) {
    const it = card.item;
    const noun = ARTICLE_RE.test(normalize(it.it));
    const input = typeInput();
    let done = false;
    const submit = () => {
      if (done) return;
      if (!input.value.trim()) { input.focus(); return; }
      done = true;
      const r = checkAnswer(input.value, [it.it, ...(it.alt || [])], { articles: true });
      input.classList.add(r.ok ? 'ok' : 'bad');
      input.blur(); input.readOnly = true;
      ctx.answer(r.ok, { answer: it.it, say: it.it, hint: r.hint, sub: r.ok ? '' : `Du hast geschrieben: ${input.value.trim()}`, showOnOk: !!r.hint });
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
    ctx.inner.append(
      h('div', { class: 'q-kicker' }, 'Schreib es auf Italienisch'),
      h('div', { class: 'q-de' }, it.de),
      noun ? h('div', { class: 'q-help' }, 'Mit Artikel (il, la, l\' ...)') : null,
      h('div', { class: 'type-wrap' }, input, accentBar(input),
        h('button', { class: 'btn primary', onclick: submit }, 'Prüfen'),
        h('button', { class: 'skip', onclick: () => { if (done) return; done = true; input.blur(); ctx.answer(false, { answer: it.it, say: it.it }); } }, 'Weiß ich nicht')));
    input.focus();
  },

  flash(card, ctx) {
    const it = card.item;
    ctx.inner.append(h('div', { class: 'q-kicker' }, 'Weißt du es auf Italienisch?'), h('div', { class: 'q-de' }, it.de));
    const reveal = () => {
      ctx.inner.append(h('div', { class: 'flash-reveal' },
        h('div', { class: 'q-big' }, it.it), spkBtn(it.it),
        it.note ? h('div', { class: 'q-help', style: 'margin-top:10px' }, it.note) : null));
      if (soundOn()) speak(it.it);
      ctx.foot(h('div', { class: 'btn-row' },
        h('button', { class: 'btn bad', onclick: () => ctx.answer(false, { silent: true }) }, 'Nicht gewusst'),
        h('button', { class: 'btn good', onclick: () => ctx.answer(true, { silent: true }) }, 'Gewusst')));
    };
    ctx.foot(h('button', { class: 'btn primary', onclick: reveal }, 'Aufdecken'));
  },

  match(card, ctx) {
    const items = card.items;
    const left = shuffle(items), right = shuffle(items);
    let sel = null, left_ = items.length, errors = 0;
    ctx.inner.append(h('div', { class: 'q-kicker' }, 'Finde die Paare'));
    const L = h('div', { class: 'col' }), R = h('div', { class: 'col' });
    const tap = (el, it, side) => {
      if (el.classList.contains('ok')) return;
      if (!sel || sel.side === side) {
        if (sel) sel.el.classList.remove('sel');
        sel = { el, it, side };
        el.classList.add('sel');
        if (side === 'L' && soundOn()) speak(it.it);
        return;
      }
      const a = sel; sel = null;
      a.el.classList.remove('sel');
      if (a.it === it) {
        a.el.classList.add('ok'); el.classList.add('ok');
        if (side === 'L' && soundOn()) speak(it.it);
        if (--left_ === 0) setTimeout(() => ctx.answer(errors <= 1, { silent: true }), 450);
      } else {
        errors++;
        beep(false);
        [a.el, el].forEach(x => { x.classList.add('bad'); setTimeout(() => x.classList.remove('bad'), 450); });
      }
    };
    left.forEach(it => { const b = h('button', { class: 'mt it' }, it.it); b.onclick = () => tap(b, it, 'L'); L.append(b); });
    right.forEach(it => { const b = h('button', { class: 'mt' }, shortDe(it.de)); b.onclick = () => tap(b, it, 'R'); R.append(b); });
    ctx.inner.append(h('div', { class: 'match' }, L, R));
  },

  build(card, ctx) {
    const sen = card.sentence;
    const target = tokenize(sen.it);
    const tiles = shuffle(target.concat(card.extra || [])).map((t, i) => ({ t, i }));
    const chosen = [];
    const answerBox = h('div', { class: 'build-answer' });
    const bank = h('div', { class: 'bank' });
    const checkBtn = h('button', { class: 'btn primary', disabled: true }, 'Prüfen');
    let done = false;
    const draw = () => {
      answerBox.innerHTML = ''; bank.innerHTML = '';
      chosen.forEach((tile, k) => answerBox.append(h('button', { class: 'tile', onclick: () => { if (done) return; chosen.splice(k, 1); draw(); } }, tile.t)));
      tiles.forEach(tile => {
        const used = chosen.includes(tile);
        bank.append(h('button', { class: 'tile' + (used ? ' used' : ''), onclick: () => { if (done || used) return; chosen.push(tile); draw(); } }, tile.t));
      });
      checkBtn.disabled = !chosen.length;
    };
    checkBtn.onclick = () => {
      if (done) return; done = true;
      const got = noAccents(normalize(chosen.map(c => c.t).join(' ')));
      const want = noAccents(normalize(target.join(' ')));
      const ok = got === want;
      answerBox.classList.add(ok ? 'ok' : 'bad');
      ctx.answer(ok, { answer: sen.it, say: sen.it, sub: sen.de, showOnOk: card.dictation });
    };
    if (card.dictation) {
      const big = spkBtn(sen.it);
      ctx.inner.append(h('div', { class: 'q-kicker' }, 'Hör zu und bau den Satz'),
        h('div', { class: 'listen-big', style: 'margin:14px 0 6px' }, big, h('button', { class: 'slow', onclick: () => speak(sen.it, { slow: true }) }, 'Langsam')));
      big.classList.add('playing');
      speak(sen.it, { onend: () => big.classList.remove('playing') });
    } else {
      ctx.inner.append(h('div', { class: 'q-kicker' }, 'Bau den Satz auf Italienisch'), h('div', { class: 'q-de' }, sen.de));
    }
    ctx.inner.append(answerBox, bank);
    ctx.foot(checkBtn);
    draw();
  },

  g_choice(card, ctx) {
    const d = card.drill;
    const hasGap = d.q.includes('___');
    const order = shuffle(d.options.map((o, i) => i));
    const qEl = h('div', { class: hasGap ? 'gap-q' : 'q-de', html: hasGap ? gapHtml(d.q) : esc(d.q) });
    ctx.inner.append(h('div', { class: 'q-kicker' }, card.kicker || (hasGap ? 'Ergänze' : 'Frage')), qEl, d.de ? h('div', { class: 'q-help' }, d.de) : null);
    const box = h('div', { class: 'opts' });
    const correctText = d.options[d.answer];
    order.forEach(i => box.append(h('button', { class: 'opt' + (hasGap ? ' it' : ''), onclick: e => {
      box.classList.add('locked');
      const ok = i === d.answer;
      e.currentTarget.classList.add(ok ? 'ok' : 'bad');
      if (!ok) box.children[order.indexOf(d.answer)].classList.add('ok');
      if (hasGap) qEl.innerHTML = gapHtml(d.q, correctText, ok ? 'ok' : 'bad');
      const full = hasGap ? fillGap(d.q, correctText) : correctText;
      ctx.answer(ok, { answer: full, say: hasGap ? full : null, sub: d.why, showOnOk: false });
    } }, d.options[i])));
    ctx.inner.append(box);
  },

  g_type(card, ctx) {
    const d = card.drill;
    const input = typeInput('Fehlendes Wort');
    const qEl = h('div', { class: 'gap-q', html: gapHtml(d.q) });
    let done = false;
    const submit = () => {
      if (done) return;
      if (!input.value.trim()) { input.focus(); return; }
      done = true;
      const r = checkAnswer(input.value, [d.answer, ...(d.alt || [])]);
      input.classList.add(r.ok ? 'ok' : 'bad');
      input.blur(); input.readOnly = true;
      qEl.innerHTML = gapHtml(d.q, d.answer, r.ok ? 'ok' : 'bad');
      const full = fillGap(d.q, d.answer);
      ctx.answer(r.ok, { answer: full, say: full, hint: r.hint, sub: d.why });
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
    ctx.inner.append(h('div', { class: 'q-kicker' }, card.kicker || 'Schreib das fehlende Wort'), qEl, d.de ? h('div', { class: 'q-help' }, d.de) : null,
      h('div', { class: 'type-wrap' }, input, accentBar(input),
        h('button', { class: 'btn primary', onclick: submit }, 'Prüfen'),
        h('button', { class: 'skip', onclick: () => { if (done) return; done = true; input.blur(); const full = fillGap(d.q, d.answer); ctx.answer(false, { answer: full, say: full, sub: d.why }); } }, 'Weiß ich nicht')));
    input.focus();
  },

  explain(card, ctx) {
    ctx.inner.append(grammarView(card.unit));
    ctx.foot(h('button', { class: 'btn primary', onclick: ctx.next }, card.cta || 'Zu den Übungen'));
  },

  dialog(card, ctx) {
    ctx.inner.append(dialogView(card.unit, { kicker: card.kicker }));
    ctx.foot(h('button', { class: 'btn primary', onclick: () => { stopSpeaking(); ctx.next(); } }, 'Weiter'));
  },

  dq(card, ctx) {
    const q = card.q;
    const order = shuffle([0, 1, 2]);
    ctx.inner.append(h('div', { class: 'q-kicker' }, `Zum Dialog: ${card.title}`), h('div', { class: 'q-de' }, q.q));
    const box = h('div', { class: 'opts' });
    order.forEach(i => box.append(h('button', { class: 'opt', onclick: e => {
      box.classList.add('locked');
      const ok = i === q.answer;
      e.currentTarget.classList.add(ok ? 'ok' : 'bad');
      if (!ok) box.children[order.indexOf(q.answer)].classList.add('ok');
      ctx.answer(ok, { answer: q.options[q.answer] });
    } }, q.options[i])));
    ctx.inner.append(box);
  },

  roleplay(card, ctx) {
    const dl = card.unit.dialog;
    const me = dl.speakers[card.line.s];
    ctx.inner.append(h('div', { class: 'q-kicker' }, `Du bist ${me.name}. Was sagst du?`));
    if (card.prev) {
      const sp = dl.speakers[card.prev.s];
      const b = h('button', { class: 'bubble other', onclick: () => speak(card.prev.it, { gender: sp.gender }) },
        h('div', { class: 'who' }, sp.name), h('div', { class: 'it' }, card.prev.it), h('div', { class: 'de' }, card.prev.de));
      ctx.inner.append(h('div', { class: 'bubbles' }, b));
      if (soundOn()) speak(card.prev.it, { gender: sp.gender });
    } else ctx.inner.append(h('div', { class: 'q-help' }, 'Du beginnst das Gespräch.'));
    ctx.inner.append(h('div', { class: 'q-help', style: 'margin-top:14px' }, `Auf Deutsch: ${card.line.de}`));
    const opts = shuffle([card.line, ...card.others]);
    const box = h('div', { class: 'opts' });
    opts.forEach(o => box.append(h('button', { class: 'opt it', onclick: e => {
      box.classList.add('locked');
      const ok = o === card.line;
      e.currentTarget.classList.add(ok ? 'ok' : 'bad');
      if (!ok) box.children[opts.indexOf(card.line)].classList.add('ok');
      ctx.answer(ok, { answer: card.line.it, say: card.line.it, gender: me.gender });
    } }, o.it)));
    ctx.inner.append(box);
  },
};

/* ---------- Alltagssprache und Sprechen ---------- */
Object.assign(CARD_TYPES, {
  spoken_intro(card, ctx) {
    const it = card.item;
    ctx.inner.append(h('div', { class: 'intro-card' },
      h('span', { class: 'tag' }, 'So sagt man das wirklich'),
      it.book ? h('div', { class: 'book-line' }, h('span', { class: 'book-lbl' }, 'Lehrbuch'), h('span', { class: 'book-it' }, it.book)) : null,
      h('div', { class: 'q-row', style: 'justify-content:space-between' }, h('div', { class: 'q-big' }, it.it), spkBtn(it.it)),
      h('div', { class: 'meaning' }, it.de),
      it.note ? h('div', { class: 'note' }, it.note) : null,
      it.ex ? h('div', { class: 'example' }, spkBtn(it.ex, { small: true }), h('div', null, h('div', { class: 'it' }, it.ex), h('div', { class: 'de' }, it.exDe))) : null));
    ctx.foot(h('button', { class: 'btn primary', onclick: ctx.next }, 'Weiter'));
    if (soundOn()) speak(it.it);
  },

  book2spoken(card, ctx) {
    const it = card.item;
    const opts = shuffle([it, ...distractors(it, 2, 'it')]);
    ctx.inner.append(h('div', { class: 'q-kicker' }, 'Wie sagt man das locker?'),
      h('div', { class: 'book-line big' }, h('span', { class: 'book-lbl' }, 'Lehrbuch'), h('span', { class: 'book-it' }, it.book)),
      h('div', { class: 'q-help' }, it.de));
    const box = h('div', { class: 'opts' });
    opts.forEach(o => box.append(h('button', { class: 'opt it', onclick: e => {
      box.classList.add('locked');
      const ok = o === it;
      e.currentTarget.classList.add(ok ? 'ok' : 'bad');
      if (!ok) box.children[opts.indexOf(it)].classList.add('ok');
      ctx.answer(ok, { answer: it.it, say: it.it, sub: it.note });
    } }, o.it)));
    ctx.inner.append(box);
  },

  think(card, ctx) {
    const { it, de, gender, who } = card;
    ctx.inner.append(h('div', { class: 'q-kicker' }, 'Wie sagst du das? Antworte im Kopf'),
      h('div', { class: 'shadow-card' }, who ? h('div', { class: 'who' }, who) : null, h('div', { class: 'q-de' }, de)),
      h('div', { class: 'q-help' }, 'Formuliere den ganzen Satz im Kopf, dann deck auf.'));
    const reveal = () => {
      ctx.inner.append(h('div', { class: 'flash-reveal' }, h('div', { class: 'q-mid' }, it), spkBtn(it, { gender })));
      if (soundOn()) speak(it, { gender });
      ctx.foot(selfRate(ctx));
    };
    ctx.foot(h('button', { class: 'btn primary', onclick: reveal }, 'Aufdecken'));
  },

  situation(card, ctx) {
    const c = card.sit;
    ctx.inner.append(h('div', { class: 'q-kicker' }, 'Was sagst du? Antworte im Kopf'),
      h('div', { class: 'q-de' }, c.sit),
      h('div', { class: 'q-help' }, 'Überleg dir eine Antwort auf Italienisch. Danach siehst du, wie Italiener es sagen würden.'));
    const reveal = () => {
      const list = h('div', { class: 'ex-list', style: 'margin-top:18px' }, c.answers.map((a, i) => h('button', { class: 'ex-item', onclick: () => speak(a) },
        h('span', { class: 'spk-btn small', html: ICONS.speaker }),
        h('div', null, h('div', { class: 'it' }, a), i === 0 ? h('div', { class: 'de' }, 'am häufigsten') : null))));
      ctx.inner.append(h('div', { class: 'section-title', style: 'margin-left:0' }, 'So sagen es Italiener'), list, c.tip ? h('p', { class: 'q-help', style: 'margin-top:12px' }, c.tip) : null);
      if (soundOn()) speak(c.answers[0]);
      ctx.foot(selfRate(ctx));
      try { list.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (e) { /* egal */ }
    };
    ctx.foot(h('button', { class: 'btn primary', onclick: reveal }, 'Lösung zeigen'));
  },
});

/* Selbst bewerten nach dem Aufdecken: richtig, fast oder falsch. Fast und falsch kommen später noch einmal. */
function selfRate(ctx) {
  return h('div', { class: 'btn-row three' },
    h('button', { class: 'btn bad', onclick: () => ctx.answer(false, { silent: true, rating: 'wrong' }) }, 'Falsch'),
    h('button', { class: 'btn secondary', onclick: () => ctx.answer(false, { silent: true, rating: 'almost' }) }, 'Fast'),
    h('button', { class: 'btn good', onclick: () => ctx.answer(true, { silent: true, rating: 'right' }) }, 'Richtig'));
}

function shortDe(de) { return de.split(';')[0].trim(); }

function mcCard(card, ctx, showIt) {
  const it = card.item;
  const opts = shuffle([it, ...distractors(it, 3, showIt ? 'de' : 'it')]);
  ctx.inner.append(h('div', { class: 'q-kicker' }, showIt ? 'Was bedeutet das?' : 'Wie sagt man das auf Italienisch?'));
  if (showIt) ctx.inner.append(h('div', { class: 'q-row', style: 'justify-content:space-between' }, h('div', { class: 'q-big' }, it.it), spkBtn(it.it)));
  else ctx.inner.append(h('div', { class: 'q-de' }, it.de));
  const box = h('div', { class: 'opts' });
  opts.forEach(o => box.append(h('button', { class: 'opt' + (showIt ? '' : ' it'), onclick: e => {
    box.classList.add('locked');
    const ok = o === it;
    e.currentTarget.classList.add(ok ? 'ok' : 'bad');
    if (!ok) box.children[opts.indexOf(it)].classList.add('ok');
    ctx.answer(ok, { answer: `${it.it} = ${shortDe(it.de)}`, say: showIt ? null : it.it });
  } }, showIt ? o.de : o.it)));
  ctx.inner.append(box);
  if (showIt && soundOn()) speak(it.it);
}

/* ---------- Grammatik und Dialog Ansichten (auch außerhalb der Sitzung) ---------- */
function grammarView(u) {
  const g = u.grammar;
  const wrap = h('div', { class: 'explain' }, h('div', { class: 'q-kicker' }, `Grammatik · Lektion ${u.id}`), h('h3', null, g.title));
  g.points.forEach(p => wrap.append(h('p', { html: p })));
  if (g.table && g.table.rows && g.table.rows.length) {
    const t = h('table', { class: 'gtable' },
      h('thead', null, h('tr', null, g.table.head.map(c => h('th', null, c)))),
      h('tbody', null, g.table.rows.map(r => h('tr', null, r.map(c => h('td', null, c))))));
    wrap.append(h('div', { class: 'table-wrap' }, t));
  }
  if (g.examples && g.examples.length) {
    wrap.append(h('div', { class: 'section-title', style: 'margin-left:0' }, 'Beispiele zum Anhören'));
    wrap.append(h('div', { class: 'ex-list' }, g.examples.map(e => h('button', { class: 'ex-item', onclick: () => speak(e.it) },
      h('span', { class: 'spk-btn small', html: ICONS.speaker }),
      h('div', null, h('div', { class: 'it' }, e.it), h('div', { class: 'de' }, e.de))))));
  }
  return wrap;
}

function dialogView(u, { kicker } = {}) {
  const dl = u.dialog;
  const keys = Object.keys(dl.speakers);
  const meKey = keys.find(k => /lukas/i.test(dl.speakers[k].name)) || 'A';
  const bubbles = h('div', { class: 'bubbles' });
  const els = dl.lines.map(line => {
    const sp = dl.speakers[line.s] || { name: line.s, gender: 'f' };
    const cls = line.s === meKey ? 'me' : (line.s === 'C' ? 'other c' : 'other');
    const b = h('button', { class: 'bubble ' + cls, onclick: () => { stopAll(); mark(b); speak(line.it, { gender: sp.gender, onend: () => b.classList.remove('speaking') }); } },
      h('div', { class: 'who' }, sp.name), h('div', { class: 'it' }, line.it), h('div', { class: 'de' }, line.de));
    bubbles.append(b);
    return b;
  });
  let playing = false;
  const mark = b => { els.forEach(e => e.classList.remove('speaking')); if (b) b.classList.add('speaking'); };
  const playBtn = h('button', { class: 'btn primary' });
  const setPlay = on => { playing = on; playBtn.innerHTML = ''; playBtn.append(icon(on ? 'stop' : 'play'), on ? 'Stopp' : 'Anhören'); };
  const stopAll = () => { if (playing) { setPlay(false); } stopSpeaking(); mark(null); };
  const playFrom = i => {
    if (!playing || i >= dl.lines.length) { setPlay(false); mark(null); return; }
    const line = dl.lines[i];
    const sp = dl.speakers[line.s] || { gender: 'f' };
    mark(els[i]);
    try { els[i].scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { /* egal */ }
    speak(line.it, { gender: sp.gender, onend: () => setTimeout(() => playFrom(i + 1), 350) });
  };
  setPlay(false);
  playBtn.onclick = () => { if (playing) stopAll(); else { setPlay(true); playFrom(0); } };
  const deBtn = h('button', { class: 'btn secondary' }, 'Ohne Deutsch');
  deBtn.onclick = () => { const hid = bubbles.classList.toggle('hide-de'); deBtn.textContent = hid ? 'Mit Deutsch' : 'Ohne Deutsch'; };
  return h('div', { class: 'dialog-head' },
    h('div', { class: 'q-kicker' }, kicker || `Dialog · Lektion ${u.id}`),
    h('h3', null, dl.title), h('p', null, dl.setting),
    h('div', { class: 'dlg-tools' }, playBtn, deBtn),
    bubbles,
    h('p', { class: 'small faint', style: 'margin-top:14px' }, 'Tipp: Tippe auf eine Sprechblase, um nur diesen Satz zu hören.'));
}

/* ---------- Lektionen und Übungen zusammenstellen ---------- */
function recallCard(item, extra) {
  const long = normalize(item.it).split(' ').length > 4;
  return Object.assign({ type: S.settings.recall === 'flash' || long ? 'flash' : 'type_de_it', item }, extra);
}
function listenOr(item, extra) {
  return Object.assign({ type: soundOn() ? 'listen' : 'mc_it_de', item }, extra);
}
function otherWords(tokens, pool, n) {
  const have = new Set(tokens.map(t => normalize(t)));
  const cand = [];
  pool.forEach(s => tokenize(s.it).forEach(t => { const k = normalize(t); if (!have.has(k) && k.length > 1) { have.add(k); cand.push(t); } }));
  return sample(cand, n);
}
function buildCard(sentence, pool, dictation) {
  return { type: 'build', sentence, extra: otherWords(tokenize(sentence.it), pool, 2), dictation: !!dictation && soundOn() };
}
function drillCard(d, extra) { return Object.assign({ type: d.type === 'choice' ? 'g_choice' : 'g_type', drill: d }, extra); }
function vocabMix(items, opts = {}) {
  const { srs = true, requeue = true } = opts;
  return items.map((it, i) => {
    const st = S.srs[it.id];
    const b = st ? st.b : 1;
    const base = { srs, requeue };
    if (b <= 2) return Object.assign(pick([{ type: 'mc_it_de' }, { type: 'mc_de_it' }, listenOr(it)]), { item: it }, base);
    return Math.random() < 0.7 ? recallCard(it, base) : listenOr(it, base);
  });
}

/* Lektionsschritte einer normalen Woche */
function lessonWords(u, part) {
  const items = wordItems(u.id).slice(part * 12, part * 12 + 12);
  const cards = [];
  for (let c = 0; c < 3; c++) {
    const chunk = items.slice(c * 4, c * 4 + 4);
    chunk.forEach(it => cards.push({ type: 'intro', item: it }));
    shuffle(chunk).forEach((it, j) => cards.push(j % 2 ? listenOr(it, { requeue: true }) : { type: 'mc_it_de', item: it, requeue: true }));
  }
  cards.push({ type: 'match', items: sample(items, 6) });
  const sh = shuffle(items);
  sh.slice(0, 6).forEach(it => cards.push({ type: 'mc_de_it', item: it, requeue: true }));
  sh.slice(6).forEach(it => cards.push({ type: 'type_de_it', item: it, requeue: true }));
  return { cards, items };
}
function lessonGrammar(u) {
  const cards = [{ type: 'explain', unit: u }];
  u.grammar.drills.forEach(d => cards.push(drillCard(d, { requeue: true })));
  cards.push(buildCard(u.sentences[0], u.sentences), buildCard(u.sentences[1], u.sentences));
  return { cards };
}
function lessonDialog(u) {
  const dl = u.dialog;
  const cards = [{ type: 'dialog', unit: u }];
  dl.questions.forEach(q => cards.push({ type: 'dq', q, title: dl.title }));
  cards.push(...roleplayCards(u, 3));
  [2, 3, 4].forEach(i => cards.push(buildCard(u.sentences[i], u.sentences)));
  [5, 6, 7].forEach(i => cards.push(buildCard(u.sentences[i], u.sentences, true)));
  return { cards };
}
function roleplayCards(u, n) {
  const dl = u.dialog;
  const keys = Object.keys(dl.speakers);
  const meKey = keys.find(k => /lukas/i.test(dl.speakers[k].name)) || 'A';
  const mine = dl.lines.map((l, i) => ({ l, i })).filter(x => x.l.s === meKey);
  if (mine.length < 3) return [];
  return sample(mine, Math.min(n, mine.length)).sort((a, b) => a.i - b.i).map(x => ({
    type: 'roleplay', unit: u, line: x.l, prev: x.i > 0 ? dl.lines[x.i - 1] : null,
    others: sample(mine.filter(y => y.l !== x.l && normalize(y.l.it) !== normalize(x.l.it)), 2).map(y => y.l),
  }));
}
function lessonParlato(u) {
  const items = spokenItems(u.id);
  const cards = [];
  for (let c = 0; c < 2; c++) {
    const chunk = items.slice(c * 4, c * 4 + 4);
    chunk.forEach(it => cards.push({ type: 'spoken_intro', item: it }));
    shuffle(chunk).forEach((it, j) => cards.push(j % 2 ? listenOr(it, { requeue: true }) : { type: 'mc_it_de', item: it, requeue: true }));
  }
  shuffle(items.filter(i => i.book)).slice(0, 5).forEach(it => cards.push({ type: 'book2spoken', item: it, requeue: true }));
  if (items.length >= 5) cards.push({ type: 'match', items: sample(items, Math.min(6, items.length)) });
  shuffle(items).slice(0, 4).forEach(it => cards.push({ type: 'mc_de_it', item: it, requeue: true }));
  return { cards, items };
}
function thinkLines(u, n) {
  const dl = u.dialog;
  const keys = Object.keys(dl.speakers);
  const meKey = keys.find(k => /lukas/i.test(dl.speakers[k].name)) || 'A';
  const lines = dl.lines.filter(l => { const w = tokenize(l.it).length; return w >= 3 && w <= 12; });
  const mine = lines.filter(l => l.s === meKey);
  const pickL = (mine.length >= n ? sample(mine, n) : mine.concat(sample(lines.filter(l => l.s !== meKey), n - mine.length)));
  return pickL.map(l => ({ type: 'think', requeue: true, it: l.it, de: l.de, gender: (dl.speakers[l.s] || {}).gender || 'f', who: (dl.speakers[l.s] || {}).name }));
}
function lessonSpeak(u) {
  const cards = thinkLines(u, 4);
  sample(u.sentences, 2).forEach(s => cards.push({ type: 'think', requeue: true, it: s.it, de: s.de, gender: 'f' }));
  (u.speak || []).forEach(c => cards.push({ type: 'situation', requeue: true, sit: c }));
  return { cards };
}
function lessonTest(u) {
  const items = wordItems(u.id);
  const learned = items.filter(i => S.srs[i.id]);
  const srs = true;
  const sh = shuffle(items);
  const cards = [
    ...sh.slice(0, 2).map(it => ({ type: 'mc_de_it', item: it, srs })),
    ...sh.slice(2, 4).map(it => ({ type: 'type_de_it', item: it, srs })),
    ...sh.slice(4, 6).map(it => listenOr(it, { srs })),
    { type: 'match', items: sh.slice(6, 11) },
    ...sample(u.grammar.drills, 4).map(d => drillCard(d)),
    ...sample(u.sentences, 2).map(s => buildCard(s, u.sentences)),
    ...sample(u.dialog.questions, 2).map(q => ({ type: 'dq', q, title: u.dialog.title })),
    ...sample(spokenItems(u.id).filter(i => i.book), 2).map(it => ({ type: 'book2spoken', item: it, srs })),
  ];
  void learned;
  return { cards: shuffle(cards.slice(0, 7)).concat(shuffle(cards.slice(7))) };
}

/* Wiederholungswochen */
function scopeUnits(w) { return w.scope.map(unitById).filter(Boolean); }
function weakFirst(items) {
  return items.slice().sort((a, b) => {
    const A = S.srs[a.id], B = S.srs[b.id];
    const sa = A ? A.b - (A.wrong || 0) * 0.5 : 0, sb = B ? B.b - (B.wrong || 0) * 0.5 : 0;
    return sa - sb + (Math.random() - 0.5) * 1.5;
  });
}
function reviewStep(w, k) {
  const us = scopeUnits(w);
  const items = us.flatMap(u => unitItems(u.id));
  const sentences = us.flatMap(u => u.sentences);
  const drills = us.flatMap(u => u.grammar.drills);
  if (k === 'rv') return { cards: vocabMix(weakFirst(items).slice(0, 20)) };
  if (k === 'hr') {
    const its = sample(items, 12).map(it => listenOr(it, { srs: true, requeue: true }));
    const ss = sample(sentences, 3).map(s => buildCard(s, sentences, true));
    return { cards: its.concat(ss) };
  }
  if (k === 'rg') return { cards: sample(drills, 12).map(d => drillCard(d, { requeue: true })) };
  if (k === 'rs') return { cards: sample(sentences, 8).map(s => buildCard(s, sentences)) };
  if (k === 'rd') {
    const two = sample(us, 2);
    return { cards: two.flatMap(u => [{ type: 'dialog', unit: u, kicker: `Dialog aus Lektion ${u.id}` }, ...roleplayCards(u, 2), ...sample(u.dialog.questions, 1).map(q => ({ type: 'dq', q, title: u.dialog.title })), ...sample(u.speak || [], 2).map(c => ({ type: 'situation', sit: c }))]) };
  }
  if (k === 'rt') {
    const n = w.final ? 30 : 25;
    const nv = w.final ? 12 : 10, nd = w.final ? 9 : 8, ns = w.final ? 5 : 4;
    const cards = [
      ...vocabMix(sample(items, nv), { requeue: false }),
      ...sample(drills, nd).map(d => drillCard(d)),
      ...sample(sentences, ns).map(s => buildCard(s, sentences, Math.random() < 0.4)),
      ...sample(us, n - nv - nd - ns).map(u => ({ type: 'dq', q: pick(u.dialog.questions), title: u.dialog.title })),
    ];
    return { cards: shuffle(cards) };
  }
  return { cards: [] };
}

/* Einen Wochenschritt starten */
function startStep(w, st, chain) {
  const key = stepKey(w.week, st.k);
  let built, kind = 'lesson', after = null;
  if (w.kind === 'unit') {
    const u = w.unit;
    if (st.k === 'w1' || st.k === 'w2' || st.k === 'w3') {
      const part = { w1: 0, w2: 1, w3: 2 }[st.k];
      built = lessonWords(u, part);
      after = () => { let n = 0; built.items.forEach(it => { if (addToSrs(it.id)) n++; }); return n; };
    } else if (st.k === 'pa') {
      built = lessonParlato(u);
      after = () => { let n = 0; built.items.forEach(it => { if (addToSrs(it.id)) n++; }); return n; };
    } else if (st.k === 'sp') built = lessonSpeak(u);
    else if (st.k === 'gr') built = lessonGrammar(u);
    else if (st.k === 'dl') built = lessonDialog(u);
    else { built = lessonTest(u); kind = 'test'; }
  } else {
    built = reviewStep(w, st.k);
    if (st.k === 'rt') kind = 'test';
  }
  const title = stepTitle(st, w);
  startSession({
    kind, title, cards: built.cards,
    onComplete: res => {
      const newWords = after ? after() : 0;
      const prev = S.done[key];
      const isTest = kind === 'test';
      const stars = isTest ? starsFor(res.pct) : null;
      const rec = { d: today(), pct: res.pct };
      if (isTest) rec.stars = Math.max(stars, prev && prev.stars || 0);
      if (prev && prev.pct > rec.pct) rec.pct = prev.pct;
      S.done[key] = rec;
      save();
      const nx = nextStep();
      const out = {};
      if (after) { out.thirdNum = learnedIds().length; out.thirdLbl = 'Wörter gelernt'; out.text = `${newWords || built.items.length} ${st.k === 'pa' ? 'Alltagsausdrücke' : 'neue Wörter'} sind jetzt in deiner Wiederholung. Morgen fragt die App sie wieder ab.`; }
      if (st.k === 'sp') out.text = 'Diese Situationen landen auch auf deinem Gesprächszettel. Am Telefon sagst du sie dann laut.';
      if (isTest) {
        out.stars = stars;
        out.title = stars === 3 ? 'Eccellente!' : stars === 2 ? 'Molto bene!' : stars === 1 ? 'Bene!' : 'Noch nicht ganz';
        out.text = stars >= 1 ? `${res.pct} Prozent richtig. Die Woche ist geschafft!` : `${res.pct} Prozent richtig. Die Woche zählt trotzdem als erledigt. Wiederhole sie gern noch einmal, wenn du magst.`;
      }
      if (st.k === 'gr') out.text = 'Die Grammatik kannst du jederzeit im Kurs nachlesen.';
      if (nx && chain && nx.w.week === w.week) { out.then = () => { startStep(nx.w, nx.st, true); return null; }; out.thenLabel = `Weiter: ${stepTitle(nx.st, nx.w)}`; }
      return out;
    },
  });
}

/* Tägliche Wiederholung */
function reviewSession({ then } = {}) {
  const ids = dueIds().slice(0, reviewCap());
  const items = ids.map(id => ITEMS[id]);
  return {
    kind: 'review', title: 'Wiederholen', cards: vocabMix(items),
    onComplete: res => {
      const left = dueIds().length;
      const out = { thirdNum: left, thirdLbl: left === 1 ? 'Wort noch fällig' : 'Wörter noch fällig', text: left ? 'Gut gemacht. Den Rest holst du später oder morgen nach.' : 'Alle fälligen Wörter sind wiederholt.' };
      if (then) { out.then = then; out.thenLabel = 'Weiter zur Lektion'; }
      return out;
    },
  };
}
function startToday() {
  if (isWeekend()) {
    if (dueIds().length) startSession(reviewSession());
    else toast('Heute ist nichts fällig. Schönes Wochenende!');
    return;
  }
  const nx = nextStep();
  const lesson = () => { if (nx) startStep(nx.w, nx.st, true); return null; };
  if (dueIds().length) startSession(reviewSession({ then: nx ? lesson : null }));
  else if (nx) startStep(nx.w, nx.st, true);
  else toast('Du hast den ganzen Kurs geschafft! Übe frei weiter.');
}

/* Freies Üben */
function doneUnits() {
  return UNITS.filter(u => { const w = WEEKS.find(x => x.kind === 'unit' && x.unit.id === u.id); return UNIT_STEPS.some(st => isDone(w.week, st.k)); });
}
function practice(mode, uid) {
  const learned = learnedIds().map(id => ITEMS[id]);
  const units = doneUnits();
  const base = { kind: 'practice', onComplete: () => ({}) };
  if (mode === 'due') return startSession(reviewSession());
  if (mode === 'hard') {
    const hard = learned.filter(i => (S.srs[i.id].wrong || 0) > 0 || S.srs[i.id].b <= 2)
      .sort((a, b) => ((S.srs[b.id].wrong || 0) - (S.srs[a.id].wrong || 0)) || (S.srs[a.id].b - S.srs[b.id].b)).slice(0, 15);
    return startSession(Object.assign({}, base, { title: 'Schwierige Wörter', cards: hard.map(it => recallCard(it, { srs: true, requeue: true })) }));
  }
  if (mode === 'listen') {
    const cards = sample(learned, 12).map(it => ({ type: 'listen', item: it, srs: true, requeue: true }));
    const sents = units.flatMap(u => u.sentences);
    sample(sents, 3).forEach(s => cards.push(buildCard(s, sents, true)));
    return startSession(Object.assign({}, base, { title: 'Hörtraining', cards }));
  }
  if (mode === 'type') return startSession(Object.assign({}, base, { title: 'Tippen', cards: sample(learned, 15).map(it => ({ type: 'type_de_it', item: it, srs: true, requeue: true })) }));
  if (mode === 'mix') return startSession(Object.assign({}, base, { title: 'Zufallsmix', cards: vocabMix(sample(learned, 20)) }));
  if (mode === 'build') {
    const sents = units.flatMap(u => u.sentences);
    return startSession(Object.assign({}, base, { title: 'Sätze bauen', cards: sample(sents, 8).map(s => buildCard(s, sents, soundOn() && Math.random() < 0.3)) }));
  }
  if (mode === 'grammar') {
    const gu = UNITS.filter(u => { const w = WEEKS.find(x => x.kind === 'unit' && x.unit.id === u.id); return isDone(w.week, 'gr'); });
    return startSession(Object.assign({}, base, { title: 'Grammatik', cards: sample(gu.flatMap(u => u.grammar.drills), 12).map(d => drillCard(d, { requeue: true })) }));
  }
  if (mode === 'speak') {
    const us = units.length ? units : [UNITS[0]];
    const cards = sample(us.flatMap(u => thinkLines(u, 2)), 4).concat(sample(us.flatMap(u => (u.speak || []).map(c => ({ type: 'situation', sit: c }))), 8));
    return startSession(Object.assign({}, base, { title: 'Im Kopf antworten', cards }));
  }
  if (mode === 'spoken') {
    const sp = learned.filter(i => i.kind === 'spoken');
    return startSession(Object.assign({}, base, { title: 'Alltagssprache', cards: sample(sp, 15).map(it => it.book && Math.random() < 0.5 ? { type: 'book2spoken', item: it, srs: true, requeue: true } : Object.assign(pick([{ type: 'mc_it_de' }, { type: 'mc_de_it' }, listenOr(it)]), { item: it, srs: true, requeue: true })) }));
  }
  if (mode === 'unit') {
    const u = unitById(uid);
    const its = unitItems(uid);
    const known = its.filter(i => S.srs[i.id]);
    const pool = known.length >= 6 ? known : its;
    return startSession(Object.assign({}, base, { title: `Wörter aus Lektion ${u.id}`, cards: vocabMix(sample(pool, 15), { srs: true }) }));
  }
  if (mode === 'dialog') {
    const u = unitById(uid);
    return startSession(Object.assign({}, base, { title: 'Dialog', cards: [{ type: 'dialog', unit: u }, ...roleplayCards(u, 3)] }));
  }
}

/* ---------- Ansichten ---------- */
let VIEW = { name: 'today' };
function go(v) { VIEW = typeof v === 'string' ? { name: v } : v; render(); window.scrollTo(0, 0); }
const isStandalone = () => window.navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function applyTheme() {
  const t = S.settings.theme;
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  else document.documentElement.removeAttribute('data-theme');
  const dark = t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#161412' : '#F7F2EA');
}

function render() {
  applyTheme();
  const app = $('#app');
  app.innerHTML = '';
  const bar = $('#tabbar');
  if (!S.startDay) { bar.classList.add('hidden'); app.append(viewWelcome()); return; }
  bar.classList.remove('hidden');
  const tab = { today: 'today', settings: 'today', course: 'course', week: 'course', grammar: 'course', practice: 'practice', words: 'words' }[VIEW.name] || 'today';
  bar.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  const fn = { today: viewToday, course: viewCourse, week: viewWeek, grammar: viewGrammar, practice: viewPractice, words: viewWords, settings: viewSettings }[VIEW.name] || viewToday;
  app.append(fn(VIEW));
}

function buildTabbar() {
  const tabs = [['today', 'Heute', 'home'], ['course', 'Kurs', 'path'], ['practice', 'Üben', 'dumbbell'], ['words', 'Wörter', 'book']];
  const bar = h('nav', { id: 'tabbar', class: 'tabbar' }, h('div', { class: 'tabbar-inner' },
    tabs.map(([k, label, ic]) => h('button', { class: 'tab', 'data-tab': k, onclick: () => go(k) }, h('span', { html: ICONS[ic] }), label))));
  document.body.append(bar);
}

function ring(value, max) {
  const r = 18, c = 2 * Math.PI * r, f = clamp(value / Math.max(1, max), 0, 1);
  return h('span', { class: 'ring', html: `<svg viewBox="0 0 44 44" width="44" height="44"><circle class="bg" cx="22" cy="22" r="${r}"/><circle class="fg" cx="22" cy="22" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - f)}" transform="rotate(-90 22 22)"/></svg>` });
}
function plannedWeek() { return clamp(Math.floor((today() - S.startDay) / 7) + 1, 1, TOTAL_WEEKS); }

function installBanner() {
  if (isStandalone() || S.hideInstall || !isIOS()) return null;
  return h('div', { class: 'banner' },
    h('button', { class: 'icon-btn x', 'aria-label': 'Ausblenden', html: ICONS.x, onclick: () => { S.hideInstall = true; save(); render(); } }),
    h('b', null, 'Tipp: Hol dir die App auf den Home Bildschirm. '),
    'Tippe in Safari auf Teilen (oder auf die drei Punkte und dann Teilen) und wähle "Zum Home Bildschirm". Danach läuft sie offline. Öffne sie dann immer über das Icon, denn Safari und die App speichern deinen Fortschritt getrennt.');
}

function viewToday() {
  const nx = nextStep();
  const due = dueIds().length;
  const hr = new Date().getHours();
  const greet = hr < 12 ? 'Buongiorno' : hr < 18 ? 'Buon pomeriggio' : 'Buonasera';
  const wrap = h('div');
  wrap.append(h('div', { class: 'page-head' },
    h('div', null, h('h1', { class: 'hello' }, `${greet}${S.name ? ', ' + S.name : ''}!`), h('div', { class: 'sub' }, fmtToday())),
    h('button', { class: 'icon-btn', 'aria-label': 'Einstellungen', html: ICONS.gear, onclick: () => go('settings') })));
  const ib = installBanner(); if (ib) wrap.append(ib);
  const learned = learnedIds().length;
  if (learned >= 40 && (!S.lastBackup || today() - S.lastBackup > 21)) {
    wrap.append(h('button', { class: 'banner', style: 'display:block;width:100%;text-align:left', onclick: () => go('settings') },
      h('b', null, 'Sicherung empfohlen. '), 'Dein Fortschritt liegt nur auf diesem iPhone. Speichere ab und zu eine Sicherung in Notizen oder Dateien. Tippe hier.'));
  }
  const st = streak(), mins = minutesToday(), weekend = isWeekend(), goal = weekend ? WEEKEND_GOAL : S.settings.goal;
  wrap.append(h('div', { class: 'stat-row' },
    h('div', { class: 'stat' }, h('span', { class: 'ic flame', html: ICONS.flame }), h('div', null, h('div', { class: 'num' }, st), h('div', { class: 'lbl' }, st === 1 ? 'Tag in Folge' : 'Tage in Folge'))),
    h('div', { class: 'stat' }, ring(mins, goal), h('div', null, h('div', { class: 'num' }, `${mins}`), h('div', { class: 'lbl' }, `von ${goal} Min heute`)))));

  const hero = h('div', { class: 'card hero' });
  if (weekend) {
    hero.append(h('div', { class: 'kicker' }, 'Wochenende'), h('h3', null, 'Nur kurz wiederholen'),
      h('div', { class: 'goal' }, 'Heute gibt es keinen neuen Stoff. 5 Minuten Wiederholung reichen, und wenn du gar nicht dazu kommst, bleibt deine Serie trotzdem erhalten.'));
    hero.append(due
      ? h('button', { class: 'btn primary', onclick: startToday }, h('span', null, `${Math.min(due, reviewCap())} Wörter wiederholen`))
      : h('div', { class: 'plan-note' }, 'Nichts fällig. Genieß das Wochenende!'));
    if (nx) hero.append(h('div', { class: 'plan-note' }, `Am Montag geht es weiter mit Woche ${nx.w.week}: ${stepTitle(nx.st, nx.w)}.`));
  } else if (nx) {
    const w = nx.w;
    hero.append(h('div', { class: 'kicker' }, `Woche ${w.week} von ${TOTAL_WEEKS}`), h('h3', null, weekTitle(w)), h('div', { class: 'muted' }, weekTitleDe(w)));
    hero.append(h('div', { class: 'goal' }, weekGoal(w)));
    hero.append(h('div', { class: 'steps-dots' }, stepsOf(w).map(s2 => h('span', { class: isDone(w.week, s2.k) ? 'done' : (s2 === nx.st ? 'next' : '') }))));
    const todo = h('div', { class: 'todo' });
    todo.append(h('div', { class: 'todo-item' + (due ? '' : ' done') },
      h('span', { class: 'check' + (due ? '' : ' on'), html: due ? '' : ICONS.check }),
      h('div', null, h('div', { class: 't' }, due ? `${Math.min(due, reviewCap())} Wörter wiederholen` : 'Keine Wörter fällig'), h('div', { class: 's' }, due ? 'Damit nichts vergessen wird' : 'Die Wiederholung ist erledigt'))));
    todo.append(h('div', { class: 'todo-item' },
      h('span', { class: 'check' }),
      h('div', null, h('div', { class: 't' }, stepTitle(nx.st, w)), h('div', { class: 's' }, nx.st.sub(w)))));
    hero.append(todo);
    hero.append(h('button', { class: 'btn primary', onclick: startToday }, h('span', null, mins >= goal ? 'Weiterlernen' : 'Heute lernen')));
    const pw = plannedWeek();
    const note = w.week < pw ? `Laut Plan wärst du in Woche ${pw}. Kein Stress: piano piano.` : w.week > pw ? `Du bist ${w.week - pw} ${w.week - pw === 1 ? 'Woche' : 'Wochen'} vor deinem Plan. Super!` : 'Du liegst genau im Plan.';
    hero.append(h('div', { class: 'plan-note' }, note));
  } else {
    hero.append(h('div', { class: 'kicker' }, 'Kurs geschafft'), h('h3', null, 'Complimenti!'),
      h('div', { class: 'goal' }, 'Du hast alle 26 Wochen abgeschlossen. Wiederhole weiter täglich, damit alles sitzt.'),
      h('button', { class: 'btn primary', onclick: () => practice('due') }, `Wiederholen (${due})`));
  }
  wrap.append(hero);

  const cw = nx ? nx.w : null;
  const cu = cw && cw.kind === 'unit' ? cw.unit : null;
  if (cu && cu.culture) wrap.append(h('div', { class: 'card culture' }, h('h2', null, 'Kultur Tipp'), h('p', null, cu.culture)));
  wrap.append(h('div', { class: 'stat-row' },
    h('div', { class: 'stat' }, h('span', { class: 'ic', style: 'color:var(--good)', html: ICONS.book }), h('div', null, h('div', { class: 'num' }, learned), h('div', { class: 'lbl' }, 'Wörter gelernt'))),
    h('div', { class: 'stat' }, h('span', { class: 'ic', style: 'color:var(--gold)', html: ICONS.trophy }), h('div', null, h('div', { class: 'num' }, strongCount()), h('div', { class: 'lbl' }, 'Wörter sitzen fest')))));
  return wrap;
}

function viewCourse() {
  const wrap = h('div');
  const nx = nextStep();
  const allSteps = WEEKS.reduce((a, w) => a + stepsOf(w).length, 0);
  const doneSteps = WEEKS.reduce((a, w) => a + weekDoneCount(w), 0);
  wrap.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Kurs'), h('div', { class: 'sub' }, `26 Wochen von null bis A2 · ${Math.round(100 * doneSteps / allSteps)} Prozent geschafft`))));
  PHASES.forEach(ph => {
    const sec = h('div', { class: 'phase' }, h('div', { class: 'phase-title' }, h('span', { class: 'n' }, `Phase ${ph.n}`), h('span', { class: 't' }, ph.title)));
    WEEKS.filter(w => w.phase === ph.n).forEach(w => {
      const cnt = weekDoneCount(w), steps = stepsOf(w);
      const testKey = w.kind === 'unit' ? 'ts' : 'rt';
      const test = S.done[stepKey(w.week, testKey)];
      const cls = ['week', w.kind === 'review' ? 'review' : '', nx && nx.w === w ? 'current' : '', cnt === steps.length ? 'complete' : ''].join(' ');
      sec.append(h('button', { class: cls, onclick: () => go({ name: 'week', week: w.week }) },
        h('div', { class: 'badge' }, h('small', null, 'Woche'), cnt === steps.length ? h('span', { html: ICONS.check, style: 'width:20px;height:20px;display:block' }) : w.week),
        h('div', { class: 'body' },
          h('div', { class: 'title' }, weekTitle(w)),
          h('div', { class: 'de' }, weekTitleDe(w)),
          h('div', { class: 'mini' }, steps.map(s2 => h('span', { class: isDone(w.week, s2.k) ? 'done' : '' })))),
        test && test.stars != null ? starsEl(test.stars) : h('span', { class: 'chev', html: ICONS.chevR })));
    });
    wrap.append(sec);
  });
  return wrap;
}

function viewWeek(v) {
  const w = weekByNum(v.week);
  const nx = nextStep();
  const wrap = h('div');
  wrap.append(h('button', { class: 'back', onclick: () => go('course') }, h('span', { html: ICONS.chevL }), 'Kurs'));
  wrap.append(h('div', { class: 'page-head' }, h('div', null,
    h('div', { class: 'q-kicker', style: 'margin:0 0 4px;color:var(--accent)' }, `Woche ${w.week} · Phase ${w.phase}`),
    h('h1', null, weekTitle(w)), h('div', { class: 'sub' }, weekTitleDe(w)))));
  wrap.append(h('p', { class: 'intro-text' }, w.kind === 'unit' ? w.unit.intro : weekGoal(w)));
  stepsOf(w).forEach((st, i) => {
    const done = S.done[stepKey(w.week, st.k)];
    const isNext = nx && nx.w === w && nx.st === st;
    wrap.append(h('button', { class: 'step' + (done ? ' done' : '') + (isNext ? ' next' : ''), onclick: () => startStep(w, st, false) },
      h('span', { class: 'num', html: done ? ICONS.check : '' }, done ? null : String(i + 1)),
      h('div', { class: 'body' }, h('div', { class: 't' }, stepTitle(st, w)), h('div', { class: 's' }, st.sub(w))),
      done && done.stars != null ? starsEl(done.stars) : h('span', { class: 'chev', html: ICONS.chevR })));
  });
  if (w.kind === 'unit') {
    const u = w.unit;
    wrap.append(h('div', { class: 'section-title' }, 'Zum Nachschlagen'));
    wrap.append(h('div', { class: 'practice-grid' },
      h('button', { class: 'pcard', onclick: () => go({ name: 'grammar', unit: u.id, week: w.week }) }, icon('scale'), h('div', { class: 't' }, 'Grammatik nachlesen'), h('div', { class: 's' }, u.grammar.title)),
      h('button', { class: 'pcard', onclick: () => practice('dialog', u.id) }, icon('chat'), h('div', { class: 't' }, 'Dialog anhören'), h('div', { class: 's' }, u.dialog.title)),
      h('button', { class: 'pcard wide', onclick: () => practice('unit', u.id) }, icon('repeat'), h('div', null, h('div', { class: 't' }, 'Wörter dieser Woche üben'), h('div', { class: 's' }, '15 zufällige Wörter aus dieser Lektion')))));
    if (u.culture) wrap.append(h('div', { class: 'card culture', style: 'margin-top:14px' }, h('h2', null, 'Kultur Tipp'), h('p', null, u.culture)));
    wrap.append(h('div', { class: 'section-title' }, 'Alle 36 Wörter'));
    wrap.append(wordList(wordItems(u.id), true));
    if (spokenItems(u.id).length) {
      wrap.append(h('div', { class: 'section-title' }, 'Alltagssprache'));
      wrap.append(wordList(spokenItems(u.id), true));
    }
  }
  return wrap;
}

function viewGrammar(v) {
  const u = unitById(v.unit);
  const wrap = h('div');
  wrap.append(h('button', { class: 'back', onclick: () => go({ name: 'week', week: v.week }) }, h('span', { html: ICONS.chevL }), `Woche ${v.week}`));
  wrap.append(grammarView(u));
  wrap.append(h('div', { style: 'margin-top:20px' }, h('button', { class: 'btn primary', onclick: () => startSession({ kind: 'practice', title: 'Grammatik', cards: shuffle(u.grammar.drills).map(d => drillCard(d, { requeue: true })), onComplete: () => ({}) }) }, 'Diese Grammatik üben')));
  return wrap;
}

function strengthEl(id) {
  const st = S.srs[id];
  const lvl = !st ? 0 : st.b >= 6 ? 4 : st.b >= 4 ? 3 : st.b >= 2 ? 2 : 1;
  return h('span', { class: 'strength', 'aria-label': `Stärke ${lvl} von 4` }, [1, 2, 3, 4].map(i => h('span', { class: i <= lvl ? 'on' : '' })));
}
function wordList(items, showAll) {
  const list = h('div', { class: 'wordlist' });
  if (!items.length) { list.append(h('div', { class: 'wrow' }, h('div', { class: 'body muted' }, 'Keine Wörter gefunden.'))); return list; }
  items.forEach(it => {
    const learned = !!S.srs[it.id];
    list.append(h('button', { class: 'wrow' + (!learned && showAll ? ' locked' : ''), onclick: () => speak(it.it) },
      h('span', { class: 'spk', html: ICONS.speaker }),
      h('div', { class: 'body' }, h('div', { class: 'w-it' }, it.it), h('div', { class: 'w-de' }, it.de), it.book ? h('div', { class: 'w-book' }, `statt: ${it.book}`) : null),
      strengthEl(it.id)));
  });
  return list;
}

function viewPractice() {
  const wrap = h('div');
  const learned = learnedIds().map(id => ITEMS[id]);
  const due = dueIds().length;
  const units = doneUnits();
  const hard = learned.filter(i => (S.srs[i.id].wrong || 0) > 0 || S.srs[i.id].b <= 2).length;
  const spokenLearned = learned.filter(i => i.kind === 'spoken').length;
  const grDone = UNITS.filter(u => { const w = WEEKS.find(x => x.kind === 'unit' && x.unit.id === u.id); return isDone(w.week, 'gr'); }).length;
  wrap.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Üben'), h('div', { class: 'sub' }, 'Frei trainieren, so viel du willst'))));
  if (learned.length < 4) wrap.append(h('div', { class: 'banner' }, h('b', null, 'Noch nichts zum Üben. '), 'Starte mit der ersten Lektion unter Heute. Danach findest du hier alle Trainings.'));
  wrap.append(h('button', { class: 'pcard wide', disabled: !due, onclick: () => practice('due'), style: 'margin-bottom:12px;width:100%' },
    icon('repeat'), h('div', null, h('div', { class: 't' }, due ? `Wiederholen (${due} fällig)` : 'Wiederholen'), h('div', { class: 's' }, due ? 'Die Wörter, die heute dran sind' : 'Gerade ist nichts fällig. Super!'))));
  const card = (ic, t, s2, mode, ok) => h('button', { class: 'pcard', disabled: !ok, onclick: () => practice(mode) }, icon(ic), h('div', { class: 't' }, t), h('div', { class: 's' }, s2));
  wrap.append(h('div', { class: 'practice-grid' },
    card('target', 'Schwierige Wörter', hard ? `${Math.min(hard, 15)} Wörter, die noch wackeln` : 'Keine wackligen Wörter', 'hard', hard > 0),
    card('ear', 'Hörtraining', soundOn() ? 'Verstehen nur mit den Ohren' : 'Braucht Ton oder Kopfhörer', 'listen', learned.length >= 4),
    card('keyboard', 'Tippen', 'Italienisch schreiben', 'type', learned.length >= 4),
    card('bolt', 'Zufallsmix', '20 gemischte Fragen', 'mix', learned.length >= 4),
    card('puzzle', 'Sätze bauen', 'Ganze Sätze legen', 'build', units.length > 0),
    card('scale', 'Grammatik', grDone ? `Aus ${grDone} ${grDone === 1 ? 'Lektion' : 'Lektionen'}` : 'Nach der ersten Grammatik', 'grammar', grDone > 0),
    card('chat', 'Im Kopf antworten', 'Sätze und Situationen durchdenken', 'speak', true),
    card('quote', 'Alltagssprache', spokenLearned ? `${spokenLearned} Ausdrücke wie Italiener sie sagen` : 'Nach der ersten Alltagslektion', 'spoken', spokenLearned >= 4)));
  if (units.length) {
    wrap.append(h('div', { class: 'section-title' }, 'Dialoge anhören'));
    const list = h('div', { class: 'wordlist' });
    units.forEach(u => list.append(h('button', { class: 'wrow', onclick: () => practice('dialog', u.id) },
      h('span', { class: 'spk', html: ICONS.chat }),
      h('div', { class: 'body' }, h('div', { class: 'w-it' }, u.dialog.title), h('div', { class: 'w-de' }, `Lektion ${u.id}: ${u.dialog.setting}`)),
      h('span', { class: 'chev', html: ICONS.chevR }))));
    wrap.append(list);
  }
  return wrap;
}

function viewWords(v) {
  const wrap = h('div');
  const learned = learnedIds().length;
  v.filter = v.filter || (learned ? 'learned' : 'all');
  v.q = v.q || '';
  wrap.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Wörter'), h('div', { class: 'sub' }, `${learned} von ${ITEM_LIST.length} Wörtern und Ausdrücken gelernt`))));
  const input = h('input', { type: 'search', placeholder: 'Suchen (Deutsch oder Italienisch)', value: v.q, autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false' });
  wrap.append(h('div', { class: 'search' }, input));
  const chips = h('div', { class: 'chips' });
  const listBox = h('div');
  const filters = [['learned', 'Gelernt'], ['spoken', 'Alltag'], ['hard', 'Schwierig'], ['all', 'Alle Wörter']];
  const draw = () => {
    chips.innerHTML = '';
    filters.forEach(([k, l]) => chips.append(h('button', { class: 'chip' + (v.filter === k ? ' on' : ''), onclick: () => { v.filter = k; draw(); } }, l)));
    const q = noAccents(normalize(v.q));
    let items = ITEM_LIST;
    if (v.filter === 'learned') items = items.filter(i => S.srs[i.id]);
    if (v.filter === 'spoken') items = items.filter(i => i.kind === 'spoken');
    if (v.filter === 'hard') items = items.filter(i => S.srs[i.id] && ((S.srs[i.id].wrong || 0) > 0 || S.srs[i.id].b <= 2));
    if (q) items = items.filter(i => noAccents(normalize(i.it)).includes(q) || noAccents(normalize(i.de)).includes(q) || (i.book && noAccents(normalize(i.book)).includes(q)));
    const shown = items.slice(0, 250);
    listBox.innerHTML = '';
    listBox.append(wordList(shown, v.filter === 'all'));
    if (items.length > shown.length) listBox.append(h('p', { class: 'small faint', style: 'text-align:center' }, `Und ${items.length - shown.length} weitere. Nutze die Suche.`));
  };
  input.addEventListener('input', () => { v.q = input.value; draw(); });
  wrap.append(chips, listBox);
  draw();
  return wrap;
}

/* ---------- Einstellungen ---------- */
function seg(options, value, onChange) {
  const el = h('div', { class: 'seg' });
  options.forEach(([val, label]) => el.append(h('button', { class: value === val ? 'on' : '', onclick: () => { onChange(val); render(); } }, label)));
  return el;
}
function switchEl(on, onChange) { return h('button', { class: 'switch' + (on ? ' on' : ''), role: 'switch', 'aria-checked': on ? 'true' : 'false', onclick: () => { onChange(!on); render(); } }); }
const setRow = (label, small, control) => h('div', { class: 'set-row' }, h('div', { class: 'l' }, label, small ? h('small', null, small) : null), control);

function viewSettings() {
  const st = S.settings;
  const wrap = h('div');
  wrap.append(h('button', { class: 'back', onclick: () => go('today') }, h('span', { html: ICONS.chevL }), 'Heute'));
  wrap.append(h('div', { class: 'page-head' }, h('h1', null, 'Einstellungen')));

  wrap.append(h('div', { class: 'section-title' }, 'Lernen'));
  wrap.append(h('div', { class: 'set-group' },
    setRow('Tagesziel', 'Minuten pro Wochentag. Am Wochenende reichen 5 Minuten.', seg([[10, '10'], [15, '15'], [20, '20'], [30, '30']], st.goal, v => { st.goal = v; save(); })),
    setRow('Wiederholen per', 'Tippen ist gründlicher, Karteikarte ist schneller', seg([['type', 'Tippen'], ['flash', 'Karte']], st.recall, v => { st.recall = v; save(); }))));
  wrap.append(h('p', { class: 'set-note' }, 'Das Tagesziel bestimmt auch, wie viele Wörter pro Tag wiederholt werden. Samstag und Sonntag gibt es keinen neuen Stoff, und ein ausgelassener Wochenendtag unterbricht deine Serie nicht.'));

  wrap.append(h('div', { class: 'section-title' }, 'Ton und Stimme'));
  const voices = VOICES.filter(v => !NOVELTY.test(v.name));
  const current = mainVoice();
  const sel = h('select', { class: 'sel', onchange: e => { st.voice = e.target.value; save(); speak('Ciao! Come stai?'); } },
    h('option', { value: '' }, 'Automatisch'),
    voices.map(v => h('option', { value: v.voiceURI, selected: st.voice === v.voiceURI }, v.name)));
  wrap.append(h('div', { class: 'set-group' },
    setRow('Ton', 'Ohne Ton: keine automatische Aussprache und keine Hörübungen, z. B. in der Bahn ohne Kopfhörer', seg([['on', 'An'], ['off', 'Aus']], st.sound, v => { st.sound = v; save(); })),
    setRow('Sprechtempo', null, seg([['normal', 'Normal'], ['slow', 'Langsam']], st.rate, v => { st.rate = v; save(); speak('Piano piano si va lontano.'); })),
    setRow('iPhone Stimme', current ? `Gerade aktiv: ${current.name}` : 'Keine italienische Stimme gefunden', sel),
    setRow('Probe hören', null, h('button', { class: 'spk-btn small', html: ICONS.speaker, onclick: () => speak('Buongiorno! Mi chiamo Giulia. Piacere!') })),
    setRow('Effekt Töne', 'Kurzer Ton bei richtig und falsch', switchEl(st.fx, v => { st.fx = v; save(); }))));
  wrap.append(h('p', { class: 'set-note' }, 'Die App nutzt die italienische Stimme, die auf dem iPhone vorinstalliert ist. Stimmen, die du selbst nachlädst (z. B. Federica), kann eine Web-App leider nicht sehen. Kein Ton? Prüfe Lautstärke und Stummschalter.'));

  wrap.append(h('div', { class: 'section-title' }, 'Darstellung und Profil'));
  const nameIn = h('input', { type: 'text', value: S.name || '', placeholder: 'Optional', style: 'border:0;background:transparent;text-align:right;font-size:17px;outline:none;width:150px', onchange: e => { S.name = e.target.value.trim().slice(0, 30); save(); } });
  wrap.append(h('div', { class: 'set-group' },
    setRow('Design', null, seg([['auto', 'Auto'], ['light', 'Hell'], ['dark', 'Dunkel']], st.theme, v => { st.theme = v; save(); })),
    setRow('Dein Name', 'Für die Begrüßung', nameIn),
    setRow('Planstart', `Woche 1 begann am ${new Date(S.startDay * 864e5).toLocaleDateString('de-DE')}`, h('button', { class: 'chip', onclick: () => modal('Plan neu ausrichten?', 'Der Wochenplan startet dann ab heute neu. Dein Lernfortschritt bleibt komplett erhalten.', [
      { label: 'Ab heute planen', cls: 'primary', do: () => { const nx = nextStep(); const wk = nx ? nx.w.week : 1; S.startDay = today() - (wk - 1) * 7; save(); render(); toast('Plan angepasst'); } },
      { label: 'Abbrechen' }]) }, 'Anpassen'))));
  wrap.append(h('p', { class: 'set-note' }, 'Anpassen richtet den Plan so aus, dass du genau in deiner aktuellen Woche bist.'));

  wrap.append(h('div', { class: 'section-title' }, 'Sicherung'));
  wrap.append(h('div', { class: 'set-group' },
    h('button', { class: 'set-row', style: 'width:100%;text-align:left', onclick: shareBackup }, h('div', { class: 'l' }, 'Sicherung speichern', h('small', null, S.lastBackup ? `Letzte Sicherung am ${new Date(S.lastBackup * 864e5).toLocaleDateString('de-DE')}` : 'Noch keine Sicherung')), h('span', { class: 'chev', html: ICONS.share })),
    h('button', { class: 'set-row', style: 'width:100%;text-align:left', onclick: importBackup }, h('div', { class: 'l' }, 'Sicherung einspielen', h('small', null, 'Fortschritt aus einer Sicherung wiederherstellen')), h('span', { class: 'chev', html: ICONS.chevR }))));
  wrap.append(h('p', { class: 'set-note' }, 'Dein Fortschritt liegt nur auf diesem iPhone, nirgendwo sonst. Speichere ab und zu eine Sicherung, z. B. in der Dateien App oder in einer Notiz.'));

  wrap.append(h('div', { class: 'set-group' },
    h('button', { class: 'set-row', style: 'width:100%;text-align:left;color:var(--bad)', onclick: resetAll }, h('div', { class: 'l' }, 'Alles zurücksetzen'))));
  wrap.append(h('p', { class: 'set-note', style: 'text-align:center;margin-top:18px' }, `Piano Piano ${APP_VERSION} · ${ITEM_LIST.length} Wörter in 22 Lektionen · ${navigator.onLine ? 'online' : 'offline'}`));
  return wrap;
}

function backupString() { return JSON.stringify({ app: 'pianopiano', v: 1, exported: new Date().toISOString(), state: S }); }
function markBackup() { S.lastBackup = today(); save(); render(); }
async function shareBackup() {
  const data = backupString();
  const d = new Date();
  const name = `piano_piano_sicherung_${d.getFullYear()}_${String(d.getMonth() + 1).padStart(2, '0')}_${String(d.getDate()).padStart(2, '0')}.json`;
  try {
    const file = new File([data], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Piano Piano Sicherung' });
      markBackup(); toast('Sicherung gespeichert'); return;
    }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(data); markBackup(); toast('Sicherungscode kopiert. Füge ihn z. B. in eine Notiz ein.'); return; } catch (e) { /* weiter */ }
  const ta = h('textarea', { class: 'code', readonly: true }, data);
  modal('Sicherungscode', 'Markiere den Code, kopiere ihn und speichere ihn in einer Notiz.', [{ label: 'Fertig', cls: 'primary', do: markBackup }], ta);
}
function importBackup() {
  const ta = h('textarea', { class: 'code', placeholder: 'Sicherungscode hier einfügen' });
  const file = h('input', { type: 'file', accept: '.json,application/json,text/plain', style: 'margin:10px 0 16px;font-size:15px' });
  file.addEventListener('change', async () => { const f = file.files && file.files[0]; if (f) ta.value = await f.text(); });
  const extra = h('div', null, ta, h('div', { class: 'small muted', style: 'margin-top:10px' }, 'Oder Sicherungsdatei wählen:'), file);
  modal('Sicherung einspielen', 'Achtung: Der aktuelle Fortschritt auf diesem Gerät wird ersetzt.', [
    { label: 'Einspielen', cls: 'primary', keep: true, do: () => {
      try {
        const o = JSON.parse(ta.value.trim());
        if (!o || o.app !== 'pianopiano' || !o.state) throw new Error('x');
        const d = defaultState();
        S = Object.assign(d, o.state, { settings: Object.assign(defaultSettings(), o.state.settings || {}), stats: Object.assign({ days: {} }, o.state.stats || {}) });
        saveNow();
        document.querySelectorAll('.modal-bg').forEach(m => m.remove());
        go('today'); toast('Sicherung eingespielt');
      } catch (e) { toast('Das ist keine gültige Sicherung.'); }
    } },
    { label: 'Abbrechen' }], extra);
}
function resetAll() {
  modal('Wirklich alles löschen?', 'Alle gelernten Wörter, erledigten Lektionen und Statistiken werden gelöscht. Das lässt sich nicht rückgängig machen.', [
    { label: 'Ja, alles löschen', cls: 'bad', do: () => { S = defaultState(); saveNow(); go('today'); toast('Alles zurückgesetzt'); } },
    { label: 'Abbrechen', cls: 'primary' }]);
}

/* ---------- Willkommen ---------- */
function viewWelcome() {
  const v = { goal: 15, sound: 'on', name: '' };
  const wrap = h('div', { class: 'welcome' });
  const choices = (opts, key) => {
    const row = h('div', { class: 'choice-row' + (opts.length === 2 ? ' two' : opts.length === 4 ? ' four' : '') });
    const draw = () => { row.innerHTML = ''; opts.forEach(([val, t, s2]) => row.append(h('button', { class: 'choice' + (v[key] === val ? ' on' : ''), onclick: () => { v[key] = val; draw(); } }, t, s2 ? h('small', null, s2) : null))); };
    draw();
    return row;
  };
  const nameIn = h('input', { type: 'text', placeholder: 'Dein Vorname (optional)', autocapitalize: 'words', oninput: e => { v.name = e.target.value; } });
  wrap.append(
    h('img', { class: 'logo', src: 'icon-192.png', alt: '' }),
    h('h1', null, 'Piano Piano'),
    h('p', { class: 'motto' }, 'Piano piano si va lontano.'),
    h('p', { class: 'motto-de' }, 'Schritt für Schritt kommt man weit.'),
    h('div', { class: 'card' }, h('p', { style: 'margin:0' }, 'Dein Italienischkurs in 26 Wochen: von null bis zu einfachen Gesprächen im Urlaub und mit Freunden. Jeden Tag ein kleiner Schritt mit Vokabeln, Hören, Dialogen und kurzer Grammatik. Alles bleibt privat auf deinem iPhone und funktioniert auch offline.')),
    h('div', { class: 'field' }, h('label', null, 'Wie heißt du?'), nameIn),
    h('div', { class: 'field' }, h('label', null, 'Wie viel Zeit hast du pro Tag?'), choices([[10, '10 Min', 'locker'], [15, '15 Min', 'empfohlen'], [20, '20 Min', 'mehr'], [30, '30 Min', 'intensiv']], 'goal')),
    h('div', { class: 'field' }, h('label', null, 'Hast du beim Lernen meistens Ton?'), h('div', { class: 'hint' }, 'Kannst du jederzeit in den Einstellungen ändern.'), choices([['on', 'Ja, mit Ton', 'Kopfhörer oder Lautsprecher'], ['off', 'Meist ohne', 'z. B. in der Bahn']], 'sound')),
    h('button', { class: 'btn primary', onclick: () => {
      S.name = v.name.trim().slice(0, 30); S.settings.goal = v.goal; S.settings.sound = v.sound; S.startDay = today(); saveNow();
      speak('Benvenuto!');
      go('today');
    } }, 'Los geht\'s'),
    installBanner() || h('div'));
  return wrap;
}

/* ---------- Start ---------- */
function showUpdate(worker) {
  if ($('#upd')) return;
  const el = h('div', { id: 'upd', class: 'toast', style: 'display:flex;gap:12px;align-items:center' }, 'Neue Version verfügbar',
    h('button', { class: 'chip', style: 'background:var(--accent);color:var(--accent-ink);box-shadow:none', onclick: () => { el.remove(); worker.postMessage('skipWaiting'); } }, 'Aktualisieren'));
  document.body.append(el);
}
function initSW() {
  if (!('serviceWorker' in navigator)) return;
  if (!(location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) return;
  let reloading = false;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloading || !hadController) return; reloading = true; if (!SESSION) location.reload(); });
  navigator.serviceWorker.register('sw.js').then(reg => {
    const watch = nw => nw && nw.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) showUpdate(nw); });
    if (reg.waiting && navigator.serviceWorker.controller) showUpdate(reg.waiting);
    reg.addEventListener('updatefound', () => watch(reg.installing));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
  }).catch(() => {});
}
function init() {
  buildTabbar();
  const app = $('#app');
  if (!UNITS.length) { app.append(h('div', { class: 'card' }, 'Die Kursdaten konnten nicht geladen werden. Prüfe, ob die Datei course.js mit hochgeladen wurde.')); return; }
  render();
  initSW();
  const unlock = () => { try { if (TTS) { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; TTS.speak(u); } loadVoices(); } catch (e) { /* egal */ } };
  document.addEventListener('touchend', unlock, { once: true });
  document.addEventListener('click', unlock, { once: true });
  matchMedia('(prefers-color-scheme: dark)').addEventListener && matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  window.addEventListener('online', () => { if (VIEW.name === 'settings') render(); });
  window.addEventListener('offline', () => VIEW.name === 'settings' && render());
  setTimeout(() => { loadVoices(); if (VIEW.name === 'settings' && !SESSION) render(); }, 1200);
  let lastDay = today();
  document.addEventListener('visibilitychange', () => { if (!document.hidden && today() !== lastDay && !SESSION) { lastDay = today(); render(); } });
}
window.__ppCheckAll = () => {
  // Rendert jede Karte jedes Wochenschritts einmal und prüft die Lösungen
  const problems = [];
  let cards = 0;
  const savedS = JSON.stringify(S);
  for (const W of WEEKS) for (const st of stepsOf(W)) {
    let built;
    try {
      if (W.kind === 'unit') {
        const u = W.unit;
        built = st.k[0] === 'w' ? lessonWords(u, { w1: 0, w2: 1, w3: 2 }[st.k]) : st.k === 'gr' ? lessonGrammar(u) : st.k === 'dl' ? lessonDialog(u) : st.k === 'pa' ? lessonParlato(u) : st.k === 'sp' ? lessonSpeak(u) : lessonTest(u);
      } else built = reviewStep(W, st.k);
    } catch (e) { problems.push(`build ${W.week}.${st.k}: ${e.message}`); continue; }
    if (!built.cards.length) problems.push(`leer ${W.week}.${st.k}`);
    startSession({ kind: 'practice', title: 't', cards: built.cards, onComplete: () => ({}) });
    const s = SESSION;
    while (s && s.pos < s.queue.length) {
      const c = s.queue[s.pos];
      cards++;
      if (!s.inner.children.length) problems.push(`leer gerendert ${W.week}.${st.k} ${c.type}`);
      if (c.type === 'type_de_it' && !checkAnswer(c.item.it, [c.item.it, ...(c.item.alt || [])], { articles: true }).ok) problems.push(`type ${c.item.it}`);
      if (c.type === 'g_type' && !checkAnswer(c.drill.answer, [c.drill.answer, ...(c.drill.alt || [])]).ok) problems.push(`gtype ${c.drill.q}`);
      if (c.type === 'build') { const t = tokenize(c.sentence.it); if (t.length < 2 || t.length > 13) problems.push(`build Länge ${t.length}: ${c.sentence.it}`); }
      if (c.type === 'roleplay' && c.others.length < 2) problems.push(`roleplay zu wenige Optionen ${W.week}`);
      if ((c.type === 'mc_it_de' || c.type === 'mc_de_it' || c.type === 'listen') && s.inner.querySelectorAll('.opt').length !== 4) problems.push(`mc Optionen ${s.inner.querySelectorAll('.opt').length} bei ${c.item.it}`);
      if (c.type === 'g_choice' && s.inner.querySelectorAll('.opt').length !== 3) problems.push(`g_choice Optionen ${c.drill.q}`);
      if (c.type === 'book2spoken' && s.inner.querySelectorAll('.opt').length !== 3) problems.push(`book2spoken Optionen ${c.item.it}`);
      if (c.type === 'situation' && !s.inner.querySelector('.q-de')) problems.push(`situation leer ${W.week}`);
      if (c.type === 'think' && !c.it) problems.push(`think leer ${W.week}`);
      if (c.type === 'type_de_it' && c.item.kind === 'spoken' && !checkAnswer(c.item.it, [c.item.it, ...(c.item.alt || [])], { articles: true }).ok) problems.push(`type spoken ${c.item.it}`);
      s.pos++;
      try { renderCard(); } catch (e) { problems.push(`render ${W.week}.${st.k}: ${e.message}`); break; }
    }
    if (SESSION) closeSession(true);
  }
  S = JSON.parse(savedS);
  stopSpeaking();
  return { cards, problems };
};
window.__ppStart = (W, k) => { const st = stepsOf(W).find(x => x.k === k); startStep(W, st, false); };
window.__pp = { get session() { return SESSION; }, get S() { return S; }, set S(v) { S = v; }, render, go, startStep, startToday, practice, WEEKS, nextStep, ITEMS, UNITS, today, saveNow, dueIds };
init();

})();
