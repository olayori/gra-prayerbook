class Component extends DCLogic {
  BK = ['Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth','1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra','Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes','Song of Solomon','Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi','Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians','Galatians','Ephesians','Philippians','Colossians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon','Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation'];
  CH = [50,40,27,36,34,24,21,4,31,24,22,25,29,36,10,13,10,42,150,31,12,8,66,52,5,48,12,14,3,9,1,4,7,3,3,3,2,14,4,28,16,24,21,28,16,16,13,6,6,4,4,5,3,6,4,3,1,13,5,5,3,5,1,1,1,22];
  TR = [['English', [['kjv', 'KJV', 'King James Version', 'en']]], ['Français', [['ls1910', 'LSG', 'Louis Segond 1910', 'fr'], ['martin', 'MAR', 'Martin 1744', 'fr']]], ['Español', [['valera', 'RVR', 'Reina-Valera 1909', 'es']]]];
  FONTS = [['book', 'Book', 'var(--font-body)'], ['literata', 'Literata', '"Literata", Georgia, serif'], ['merri', 'Merriweather', '"Merriweather", Georgia, serif'], ['garamond', 'Garamond', '"EB Garamond", Garamond, serif'], ['clean', 'Clean', '"Source Sans 3", system-ui, sans-serif'], ['easy', 'Easy read', '"Atkinson Hyperlegible", system-ui, sans-serif']];
  // Words of Jesus (verse level). Mixed verses are split after the speech introduction.
  RL = '40|3:15;4:4,7,10,17,19;5:3-48;6;7:1-27;8:3,4,7,10-13,20,22,26,32;9:2,4-6,9,12,13,15-17,22,24,28-30,37,38;10:5-42;11:4-30;12:3-8,11-13,25-37,39-45,48-50;13:3-9,11-33,37-52,57;14:16,18,27,29,31;15:3-11,13,14,16-20,24,26,28,32,34;16:2-4,6,8-11,13,15,17-19,23-28;17:7,9,11,12,17,20-23,25-27;18:3-35;19:4-6,8,9,11,12,14,17-19,21,23,24,26,28-30;20:1-16,18,19,21-23,25-28,32;21:2,3,13,16,19,21,22,24,25,27-44;22:2-14,18-21,29-32,37-40,42-45;23;24:2,4-51;25;26:2,10-13,18,21,23-29,31,32,34,36,38-42,45,46,50,52-56,64;27:11,46;28:9,10,18-20' +
    '#41|1:15,17,25,38,41,44;2:5,8-11,14,17,19-22,25-28;3:3-5,23-29,33-35;4:3-9,11-32,35,39,40;5:8,9,19,30,34,36,39,41;6:4,10,11,31,37,38,50;7:6-16,18-23,27,29,34;8:2,3,5,12,15,17-21,26,27,29,33-38;9:1,12,13,16,19,21,23,25,29,31,33,35,37,39-50;10:3,5-9,11,12,14,15,18,19,21,23-25,27,29-31,33,34,36,38-40,42-45,49,51,52;11:2,3,14,17,22-26,29,30,33;12:1-11,15-17,24-27,29-31,34-40,43,44;13:2,5-37;14:6-9,13-15,18,20-25,27,28,30,32,34,36-38,41,42,48,49,62;15:2,34;16:15-18' +
    '#42|2:49;4:4,8,12,18,19,21,23-27,35,43;5:4,10,13,14,20,22-24,27,31,32,34-39;6:3-5,8-10,20-49;7:9,13,14,22-28,31-35,40-50;8:5-8,10-18,21,22,25,30,39,45,46,48,50,52,54;9:3-5,13,14,18,20,22-27,41,44,48,50,55,56,58-60,62;10:2-16,18-24,26,28,30-37,41,42;11:2-13,17-26,28-36,39-52;12;13:2-9,12,15,16,18-21,24-30,32-35;14:3,5,8-14,16-24,26-35;15:4-32;16:1-13,15-31;17:1-4,6-10,14,17-37;18:2-8,10-14,16,17,19,20,22,24,25,27,29-33,41,42;19:5,9,10,12-27,30,31,40,42-44,46;20:3,4,8-18,23-25,34-38,41-47;21:3,4,6,8-36;22:8,10-12,15-22,25-38,40,42,46,48,51-53,61,67-70;23:3,28-31,34,43,46;24:17,19,25,26,36,38,39,41,44,46-49' +
    '#43|1:38,39,42,43,47,48,50,51;2:4,7,8,16,19;3:3,5-8,10-21;4:7,10,13,14,16-18,21-24,26,32,34-38,48,50;5:6,8,14,17,19-47;6:5,10,12,20,26,27,29,32,33,35-40,43-51,53-58,61-65,67,70;7:6-8,16-19,21-24,28,29,33,34,37,38;8:7,10-12,14-19,21,23-26,28,29,31,32,34-47,49-51,54-56,58;9:3-5,7,35,37,39,41;10:1-18,25-30,32,34-38;11:4,7,9-11,14,15,23,25,26,34,39-44;12:7,8,23-28,30-32,35,36,44-50;13:7,8,10,12-21,26,27,31-38;14;15;16;17;18:4,5,7,8,11,20,21,23,34,36,37;19:11,26-28,30;20:15-17,19,21-23,26,27,29;21:5,6,10,12,15-19,22' +
    '#44|1:4,5,7,8;9:4-6,10-12,15,16;18:9,10;22:7,8,10,18,21;23:11;26:14-18#46|11:24,25#66|1:8,11,17-20;2;3;16:15;22:7,12,13,16,20';
  HLC = { y: ['#f2cf5b', 'Yellow'], g: ['#8fd19a', 'Green'], b: ['#8dbcf0', 'Blue'], p: ['#f09cbe', 'Pink'] };
  IC = { books: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5', saved: 'm19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z', listen: 'M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14', pen: 'M12 20h9M16.4 3.6a1 1 0 0 1 3 3L7.4 18.6a2 2 0 0 1-.9.5l-2.9.8a.5.5 0 0 1-.6-.6l.8-2.9a2 2 0 0 1 .5-.9z', gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1',
    font: 'M4 20 10 4h1l6 16M6.5 14h8', palette: 'M12 22a10 10 0 1 1 10-10c0 2.8-2.2 4-4 4h-2a2 2 0 0 0-1.5 3.3A2 2 0 0 1 12 22zM7.5 10.5h.01M10.5 7h.01M15 7.5h.01', lines: 'M3 6h18M3 12h18M3 18h18', margin: 'M4 4v16M20 4v16M8 9h8M8 15h8', speed: 'M12 14l4-4M20 14a8 8 0 1 0-16 0', reset: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5', back: 'M15 18 9 12l6-6', close: 'M6 6l12 12M18 6 6 18',
    verse: 'M4 6h16M4 10h10M4 14h16M4 18h10', red: 'M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10z', par: 'M3 4h7v16H3zM14 4h7v16h-7z', scroll: 'M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4', order: 'M4 6h9M4 12h7M4 18h5M17 4v16M14 17l3 3 3-3', pick: 'M9 11l3 3 8-8M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9' };
  DEF = { size: 19, font: 'book', lh: 1.75, width: 'normal', vn: true, rate: 1, lines: true, red: true, tr2: '', scroll: 'v', order: 'trad', pickVerse: true };
  state = { tr: 'kjv', b: 43, c: 1, verses: null, verses2: null, err: null, sheet: null, sub: null, qs: false, pickB: null, pickC: null, bq: '', bpMenu: false, sel: [], hl: {}, bm: [], set: { ...this.DEF }, tts: null, toast: null, flash: null, tick: 0, pw: 0, pgI: 0, pgN: 1, ink: false, tool: 'pen', penColor: 'ink', hlColor: 'hy', finger: false, penSize: 'med', inkN: 0 };
  mainRef = React.createRef(); artRef = React.createRef(); pagerRef = React.createRef(); bqRef = React.createRef();
  ld(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  sv(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  key(k) { return 'gra-bible-' + k; }
  inSite() { return /\/bible\/?(index\.html)?$/.test(location.pathname); }
  T(s) { return window.GRAi18n ? window.GRAi18n.t(s) : s; }
  trInfo(id) { for (const [, l] of this.TR) for (const t of l) if (t[0] === id) return t; return this.TR[0][1][0]; }
  theme() { return (this.ld('gra-covenant-settings', {}) || {}).theme || 'auto'; }
  setTheme(t) { const s = this.ld('gra-covenant-settings', {}) || {}; this.sv('gra-covenant-settings', { ...s, theme: t }); this.applyTheme(); this.setState(x => ({ tick: x.tick + 1 })); }
  applyTheme() { const t = this.theme(), dark = t === 'dark' || (t === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches), de = document.documentElement; if (dark) de.setAttribute('data-theme', 'dark'); else if (t === 'sepia') de.setAttribute('data-theme', 'sepia'); else de.removeAttribute('data-theme'); }
  o(a) { return { on: a ? 'true' : 'false', bg: a ? 'var(--color-accent-100)' : 'transparent', bd: a ? 'var(--color-accent)' : 'var(--color-divider)' }; }
  rlSet() {
    if (this._rl) return this._rl; const set = new Set();
    this.RL.split('#').forEach(seg => { const [b, rest] = seg.split('|'); rest.split(';').forEach(cs => { const [c, vs] = cs.split(':'); if (!vs) { for (let v = 1; v <= 200; v++) set.add(`${b}.${c}.${v}`); return; } vs.split(',').forEach(r => { const [x, y] = r.split('-').map(Number); for (let v = x; v <= (y || x); v++) set.add(`${b}.${c}.${v}`); }); }); });
    return (this._rl = set);
  }
  split(text, isJ, lang) {
    if (!isJ || !this.state.set.red) return { pre: text, red: '' };
    if (lang === 'en') { const m = /^((?:And |Then |But |So |Now |When |And when |Again )?[^,.;:?]{0,70}?\b(?:Jesus|he|the Lord)\b[^.;?]{0,60}?\b(?:saith|said|answered|spake|cried|saying)\b[^.;?]{0,70}?[,:]\s)(.+)$/i.exec(text); if (m && m[2].length > 8) return { pre: m[1], red: m[2] }; }
    return { pre: '', red: text };
  }
  componentDidMount() {
    this.npSwipeInit();
    this.applyTheme();
    const lang = window.GRAi18n ? window.GRAi18n.lang : 'en', defTr = lang === 'fr' ? 'ls1910' : lang === 'es' ? 'valera' : 'kjv';
    const pos0 = this.ld('gra-bible-pos', null) || {}, pos = ['kjv', 'ls1910', 'martin', 'valera'].includes(pos0.tr) ? pos0 : { ...pos0, tr: null }, m = /^#(\d+)-(\d+)(?:-(\d+))?$/.exec(location.hash);
    const b = m ? Math.min(66, Math.max(1, +m[1])) : pos.b || 43, c = m ? Math.max(1, +m[2]) : pos.c || 1;
    const rawSet = this.ld('gra-bible-settings', {}) || {}, set = { ...this.DEF, ...rawSet }; if (set.tr2 && !['kjv', 'ls1910', 'martin', 'valera'].includes(set.tr2)) set.tr2 = '';
    let tr0 = pos.tr || 'kjv'; if (lang !== 'en' && rawSet.tr2 === undefined) { tr0 = 'kjv'; set.tr2 = defTr; }
    this.setState({ tr: tr0, b, c, hl: this.ld('gra-bible-hl', {}) || {}, bm: this.ld('gra-bible-bm', []) || [], set, finger: !!(window.matchMedia && matchMedia('(max-width: 700px)').matches), penSize: this.ld('gra-nr-penSize', 'med') }, () => this.load(m && m[3] ? +m[3] : null));
    this.enter();
    this.onTs = e => { if (e.touches.length !== 1 || this.state.ink) { this._sx = null; return; } this._sx = e.touches[0].clientX; this._sy = e.touches[0].clientY; this._st = Date.now(); };
    this.onTe = e => { if (this._sx == null || this.state.sheet || this.state.ink) return; const t = e.changedTouches[0], dx = t.clientX - this._sx, dy = t.clientY - this._sy; this._sx = null; if (Math.abs(dx) > 60 && Math.abs(dy) < 60 && Date.now() - this._st < 700) this.turn(dx < 0 ? 1 : -1); };
    const mn = this.mainRef.current; if (mn) { mn.addEventListener('touchstart', this.onTs, { passive: true }); mn.addEventListener('touchend', this.onTe, { passive: true }); }
    this.onKey = e => { if (/INPUT|TEXTAREA/.test((e.target || {}).tagName || '')) return; if (e.key === 'ArrowRight' && !this.state.sheet && !this.state.ink) this.turn(1); if (e.key === 'ArrowLeft' && !this.state.sheet && !this.state.ink) this.turn(-1); if (e.key === 'Escape') this.setState({ sheet: null, qs: false, bpMenu: false }); };
    window.addEventListener('keydown', this.onKey);
    this.inkData = this.ld(this.key('ink2'), {}) || {}; this.undo = []; this.redo = []; this.touches = new Map(); this.pan = null;
    this.onPD = e => this.inkDown(e); this.onPM = e => this.inkMove(e); this.onPU = e => this.inkUp(e);
    this.onTS = e => { if (!this.state.ink || this.inUI(e.target)) return; const t = e.touches && e.touches[0]; if (t && (t.touchType === 'stylus' || this.state.finger)) e.preventDefault(); };
    this.onTM = e => { if (this.state.ink && (this.cur || this.pan != null) && !this.inUI(e.target)) e.preventDefault(); };
    document.addEventListener('pointerdown', this.onPD, { passive: false }); document.addEventListener('pointermove', this.onPM, { passive: false });
    document.addEventListener('pointerup', this.onPU); document.addEventListener('pointercancel', this.onPU);
    document.addEventListener('touchstart', this.onTS, { passive: false }); document.addEventListener('touchmove', this.onTM, { passive: false });
    this.onRz = () => { clearTimeout(this._rz); this._rz = setTimeout(() => { this.measure(); this.inkRenderAll(); }, 150); }; window.addEventListener('resize', this.onRz);
    if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = () => this.forceUpdate();
  }
  componentDidUpdate() {
    const S = this.state, k = [S.b, S.c, S.tr, S.set.size, S.set.lh, S.set.width, S.set.font, S.set.lines, S.set.tr2, S.set.scroll, !!S.verses, !!S.verses2].join('|');
    if (k !== this._lk) { this._lk = k; requestAnimationFrame(() => { this.measure(); this.inkRenderAll(); }); }
  }
  componentWillUnmount() { window.removeEventListener('keydown', this.onKey); window.removeEventListener('resize', this.onRz); this.ttsStop(); ['pointerdown', 'pointermove'].forEach((n, i) => document.removeEventListener(n, i ? this.onPM : this.onPD)); document.removeEventListener('pointerup', this.onPU); document.removeEventListener('pointercancel', this.onPU); document.removeEventListener('touchstart', this.onTS); document.removeEventListener('touchmove', this.onTM); }
  measure() {
    const el = this.pagerRef.current; if (!el) return;
    if (this.state.set.scroll !== 'p') { if (this.state.pw || this.state.pgN !== 1) this.setState({ pw: 0, pgN: 1, pgI: 0 }); return; }
    const pw = el.clientWidth; if (pw !== this.state.pw) return this.setState({ pw }, () => requestAnimationFrame(() => this.measure()));
    const n = Math.max(1, Math.round((el.scrollWidth + 48) / (pw + 48))); if (n !== this.state.pgN) this.setState({ pgN: n, pgI: Math.min(this.state.pgI, n - 1) });
  }
  goPage(i, smooth) { const el = this.pagerRef.current, S = this.state; if (!el) return; i = Math.max(0, Math.min(S.pgN - 1, i)); el.scrollTo({ left: i * (S.pw + 48), behavior: smooth === false || this.reduce() ? 'instant' : 'smooth' }); if (i !== S.pgI) this.setState({ pgI: i }); }
  reduce() { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }
  turn(d) { const S = this.state; if (S.set.scroll === 'p') { const n = S.pgI + d; if (n >= 0 && n < S.pgN) return this.goPage(n); } this.step(d, true, S.set.scroll === 'p' && d < 0); }
  enter() { let c = null; try { c = sessionStorage.getItem('gra-enter'); sessionStorage.removeItem('gra-enter'); } catch (e) {} if (!c || !/^#[0-9a-f]{3,8}$/i.test(c)) return; const d = document.createElement('div'); Object.assign(d.style, { position: 'fixed', inset: '0', zIndex: '300', background: c, pointerEvents: 'none', transition: 'opacity .6s cubic-bezier(.2,.7,.2,1)' }); document.body.appendChild(d); setTimeout(() => { d.style.opacity = '0'; setTimeout(() => d.remove(), 700); }, 120); }
  parse(j) { return (j.verses || []).map(v => ({ n: v.verse, text: String(v.text).replace(/\s+/g, ' ').trim() })); }
  async fetchCh(tr, b, c) {
    const cache = this._cache = this._cache || {}, k = `${tr}/${b}/${c}`; if (cache[k]) return cache[k];
    const r = await fetch(`https://api.getbible.net/v2/${k}.json`); if (!r.ok) throw new Error('load'); return (cache[k] = this.parse(await r.json()));
  }
  async load(flashV, toEnd) {
    const { tr, b, c } = this.state, tr2 = this.state.set.tr2 || '';
    this.sv('gra-bible-pos', { tr, b, c, t: Date.now(), title: `${this.BK[b - 1]} ${c}` });
    try { history.replaceState(null, '', location.pathname + location.search + `#${b}-${c}`); } catch (e) {}
    const hit = this._cache && this._cache[`${tr}/${b}/${c}`] && (!tr2 || this._cache[`${tr2}/${b}/${c}`]);
    if (!hit) this.setState({ verses: null, verses2: null, err: null });
    let v1, v2 = null;
    try { [v1, v2] = await Promise.all([this.fetchCh(tr, b, c), tr2 ? this.fetchCh(tr2, b, c).catch(() => null) : Promise.resolve(null)]); }
    catch (e) { if (this.state.tr === tr && this.state.b === b && this.state.c === c) this.setState({ err: navigator.onLine === false ? 'You’re offline. Chapters you have opened before still work.' : 'Couldn’t load this chapter. Try again.' }); return; }
    if (this.state.tr !== tr || this.state.b !== b || this.state.c !== c) return;
    this.setState({ verses: v1, verses2: v2, err: null, pgI: 0 }, () => requestAnimationFrame(() => { this.measure(); const el = this.pagerRef.current; if (el) el.scrollLeft = 0; requestAnimationFrame(() => { if (toEnd && this.state.set.scroll === 'p') this.goPage(this.state.pgN - 1, false); if (flashV) this.toVerse(flashV, true); }); }));
    const d = new Date(), dk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, h = this.ld('gra-bible-hist', {}) || {}, id = `${b}.${c}`;
    if (!(h[dk] || []).includes(id)) { h[dk] = [...(h[dk] || []), id]; this.sv('gra-bible-hist', h); }
    const nb = c < this.CH[b - 1] ? [b, c + 1] : b < 66 ? [b + 1, 1] : null; if (nb) this.fetchCh(tr, nb[0], nb[1]).catch(() => {});
  }
  toVerse(n, flash) {
    const el = document.getElementById(`v${n}`); if (!el) return;
    if (this.state.set.scroll === 'p') { const pg = this.pagerRef.current; if (pg && this.state.pw) { const i = Math.floor((el.getBoundingClientRect().left - pg.getBoundingClientRect().left + pg.scrollLeft + 4) / (this.state.pw + 48)); if (i !== this.state.pgI) this.goPage(i); } }
    else { const r = el.getBoundingClientRect(); if (r.top < 120 || r.bottom > window.innerHeight - 170) window.scrollTo({ top: r.top + window.scrollY - 140, behavior: this.reduce() ? 'auto' : 'smooth' }); }
    if (flash) { this.setState({ flash: n }); clearTimeout(this._fl); this._fl = setTimeout(() => this.setState({ flash: null }), 1600); }
  }
  go(b, c, v, dir, toEnd) {
    const art = this.artRef.current, anim = art && dir && !this.reduce() && art.animate;
    const apply = () => this.setState({ b, c, sel: [], sheet: null, pickB: null, pickC: null, bq: '', bpMenu: false }, () => { window.scrollTo({ top: 0, behavior: 'instant' }); this.load(v, toEnd); if (anim) art.animate([{ opacity: 0, transform: `translateX(${dir * 48}px)` }, { opacity: 1, transform: 'none' }], { duration: 340, easing: 'cubic-bezier(.2,.7,.2,1)' }); });
    if (anim) art.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-dir * 48}px)` }], { duration: 170, easing: 'ease-in', fill: 'forwards' }).onfinish = apply; else apply();
  }
  step(d, anim, toEnd) { const { b, c } = this.state; let nb = b, nc = c + d; if (nc < 1) { if (b === 1) return; nb = b - 1; nc = this.CH[nb - 1]; } else if (nc > this.CH[b - 1]) { if (b === 66) return; nb = b + 1; nc = 1; } this.go(nb, nc, null, anim ? d : 0, toEnd); }
  setSet(k, v) { const set = { ...this.state.set, [k]: v }; this.sv('gra-bible-settings', set); this.setState({ set }, () => { if (k === 'tr2') this.load(); if (k === 'scroll') { window.scrollTo({ top: 0, behavior: 'instant' }); if (v === 'p' && this.state.ink) this.setState({ ink: false }, () => this.applyTouch()); } }); }
  toast(m) { this.setState({ toast: this.T(m) }); clearTimeout(this._tt); this._tt = setTimeout(() => this.setState({ toast: null }), 1900); }
  ref(b, c, vs) { const n = this.BK[b - 1]; if (!vs || !vs.length) return `${n} ${c}`; const s = [...vs].sort((x, y) => x - y); return `${n} ${c}:${s.length > 1 && s[s.length - 1] - s[0] === s.length - 1 ? s[0] + '–' + s[s.length - 1] : s.join(',')}`; }
  parseRef(q) {
    const m = /^\s*((?:[1-3]\s*)?[a-z][a-z .]*?)\s*(\d+)(?:\s*[:.]\s*(\d+))?\s*$/i.exec(q || ''); if (!m) return null;
    const nm = m[1].toLowerCase().replace(/[\s.]/g, ''), i = this.BK.findIndex(n => n.toLowerCase().replace(/\s/g, '').startsWith(nm)); if (i < 0) return null;
    const c = +m[2]; if (c < 1 || c > this.CH[i]) return null; return { b: i + 1, c, v: m[3] ? +m[3] : null };
  }
  voice() { const sy = window.speechSynthesis; if (!sy) return null; const lang = this.trInfo(this.state.tr)[3], re = new RegExp('^' + lang, 'i'), vs = sy.getVoices().filter(v => re.test(v.lang)); return vs.find(v => /natural|enhanced|premium|siri|google/i.test(v.name)) || vs[0] || null; }
  listen(fromIdx) {
    const sy = window.speechSynthesis; if (!sy || !this.state.verses) return this.toast('Read aloud isn’t available on this device');
    if (this.state.ink) this.setState({ ink: false }, () => this.applyTouch());
    const tok = this._tok = (this._tok || 0) + 1; sy.cancel();
    const say = (text, done) => { const u = new SpeechSynthesisUtterance(text), v = this.voice(), lg = this.trInfo(this.state.tr)[3]; u.rate = this.state.set.rate || 1; u.lang = v ? v.lang : ({ fr: 'fr-FR', es: 'es-ES' })[lg] || 'en-US'; if (v) u.voice = v; u.onend = done; u.onerror = e => { if (e.error !== 'interrupted' && e.error !== 'canceled') done(); }; sy.speak(u); };
    const run = i => {
      if (tok !== this._tok) return;
      const list = this.state.verses || [];
      if (i >= list.length) { if ((this.state.b === 66 && this.state.c === 22) || (this.state.npSleep && this.state.npSleep.m === 'end')) return this.ttsStop(); this.step(1, true); const wait = () => { if (tok !== this._tok) return; if (this.state.verses && this.state.verses !== list) run(-1); else setTimeout(wait, 200); }; return setTimeout(wait, 400); }
      if (i === -1) { this.setState({ tts: { i: 0 } }); return say(`${this.BK[this.state.b - 1]}, ${this.T('chapter')} ${this.state.c}.`, () => setTimeout(() => run(0), 300)); }
      this.setState({ tts: { i } }); this.toVerse(list[i].n); this.media(i);
      say(list[i].text, () => run(i + 1));
    };
    run(fromIdx == null ? -1 : fromIdx);
  }
  ttsStop() { this._tok = (this._tok || 0) + 1; try { window.speechSynthesis.cancel(); } catch (e) {} clearTimeout(this._npSl); if (this.state && (this.state.tts || this.state.npOpen || this.state.npSleep)) this.setState({ tts: null, npOpen: false, npSleep: null }); }
  ttsPause() { this._tok = (this._tok || 0) + 1; try { window.speechSynthesis.cancel(); } catch (e) {} if (this.state.tts) this.setState({ tts: { ...this.state.tts, paused: true } }); }
  npVals() {
    const S = this.state, st = S.set, vs = S.verses || [], t = S.tts, info = this.trInfo(S.tr), i = t ? Math.min(vs.length - 1, t.i) : 0, v = vs[i];
    return this.npBuild({ on: !!t && !!vs.length, items: vs.map(x => x.text), i, playing: !!t && !t.paused, unit: 'verse',
      toggle: () => (t && !t.paused ? this.ttsPause() : this.listen(t ? t.i : null)), prev: () => this.listen(Math.max(0, i - 1)), next: () => this.listen(Math.min(vs.length - 1, i + 1)), stop: () => this.ttsStop(),
      rate: st.rate, rateNext: () => { const r = [0.8, 1, 1.2, 1.4], n = r[(r.indexOf(st.rate || 1) + 1) % r.length]; this.setSet('rate', n); if (t && !t.paused) setTimeout(() => this.listen(i), 30); },
      sleepLabel: S.npSleep ? (S.npSleep.m === 'end' ? 'End of chapter' : S.npSleep.m + ' min') : '', sleepNext: () => this.npSleep('chapter', () => this.ttsStop()), toast: m => this.toast(m),
      ref: this.ref(S.b, S.c, v ? [v.n] : null), title: info[2], sub: `${this.BK[S.b - 1]} ${S.c}`, voice: (this.voice() || {}).name || '', text: v ? `${v.n}  ${v.text}` : '',
      coverBg: 'linear-gradient(105deg, rgba(255,255,255,.1), transparent 40%), #3a2c26', coverInk: '#d8b46a', coverTitle: 'HOLY BIBLE', mark: '✝' });
  }
  npSwipeInit() {
    let y0 = 0, el = null, dy = 0;
    const s = e => { const t = e.target.closest && e.target.closest('[data-sheet="np"]'); if (!t || t.scrollTop > 2) return; const p = e.target.closest('p'); if (p && p.scrollTop > 0) return; el = t; y0 = e.touches[0].clientY; dy = 0; el.style.transition = 'none'; };
    const m = e => { if (!el) return; dy = Math.max(0, e.touches[0].clientY - y0); el.style.transform = 'translateY(' + dy + 'px)'; if (dy > 6 && e.cancelable) e.preventDefault(); };
    const u = () => { if (!el) return; const t = el; el = null; t.style.transition = 'transform .24s cubic-bezier(.2,.7,.2,1)'; if (dy > 80) { t.style.transform = 'translateY(100%)'; setTimeout(() => this.setState({ npOpen: false }), 200); } else t.style.transform = ''; };
    document.addEventListener('touchstart', s, { passive: true }); document.addEventListener('touchmove', m, { passive: false }); document.addEventListener('touchend', u); document.addEventListener('touchcancel', u);
  }
  npBuild(q) {
    const S = this.state, n = q.items.length, i = Math.max(0, Math.min(n - 1, q.i)), wc = t => String(t || '').split(/\s+/).filter(Boolean).length;
    const words = q.items.reduce((a, t) => a + wc(t), 0) || 1, done = q.items.slice(0, i).reduce((a, t) => a + wc(t), 0), sec = w => Math.round(w / (2.5 * (q.rate || 1))), fmt = x => `${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')}`, frac = Math.min(1, done / words), drive = !!S.npDrive;
    const IC = { speed: 'M12 14l4-4M20 14a8 8 0 1 0-16 0', sleep: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z', car: 'M5 17h14M6 17v2M18 17v2M3 13l2-6h14l2 6v4H3zM7 13h.01M17 13h.01', cast: 'M2 16a6 6 0 0 1 6 6M2 12a10 10 0 0 1 10 10M2 20h.01M6 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6' };
    return { npMini: q.on && !S.npOpen && !S.ink, npOpen: q.on && !!S.npOpen, npShow: () => this.setState({ npOpen: true }), npClose: () => this.setState({ npOpen: false }), npStop: () => { this.setState({ npOpen: false }); q.stop(); },
      npToggle: q.toggle, npPrev: q.prev, npNext: q.next, npPrevLabel: q.unit ? 'Previous ' + q.unit : 'Previous', npNextLabel: q.unit ? 'Next ' + q.unit : 'Next',
      npIcon: q.playing ? 'M7 5h3v14H7zM14 5h3v14h-3z' : 'M8 5v14l11-7z', npPlayLabel: q.playing ? 'Pause' : 'Play',
      npPct: Math.round(frac * 1000) / 10 + '%', npRing: String(Math.round(289 * (1 - frac))), npPos: fmt(sec(done)), npPosInk: frac > 0.12 ? 'var(--color-bg)' : 'var(--color-text)', npLeft: '-' + fmt(sec(words - done)),
      npRef: q.ref, npTitle: q.title, npSub: q.sub, npVoice: q.voice, npText: q.text, npCoverBg: q.coverBg, npCoverInk: q.coverInk, npCoverTitle: q.coverTitle, npMark: q.mark,
      npTextSize: drive ? '26px' : '19px', npCtlSm: drive ? '84px' : '56px', npCtlLg: drive ? '124px' : '86px',
      npBar: [
        { label: (q.rate || 1) + '× Speed', icon: IC.speed, on: 'false', color: 'var(--color-text)', go: q.rateNext },
        { label: q.sleepLabel || 'Sleep', icon: IC.sleep, on: q.sleepLabel ? 'true' : 'false', color: q.sleepLabel ? 'var(--color-accent-700)' : 'var(--color-text)', go: q.sleepNext },
        { label: 'Driving', icon: IC.car, on: drive ? 'true' : 'false', color: drive ? 'var(--color-accent-700)' : 'var(--color-text)', go: () => this.setState({ npDrive: !drive }) },
        { label: 'Connect', icon: IC.cast, on: 'false', color: 'var(--color-text)', go: () => q.toast('Choose AirPlay or Bluetooth from your phone’s Control Centre') }
      ] };
  }
  npSleep(unitLabel, stopFn) {
    const o = [null, 15, 30, 60, 'end'], cur = this.state.npSleep ? this.state.npSleep.m : null, n = o[(o.indexOf(cur) + 1) % o.length];
    clearTimeout(this._npSl); if (!n) return this.setState({ npSleep: null });
    if (n !== 'end') this._npSl = setTimeout(() => stopFn(), n * 60000);
    this.setState({ npSleep: { m: n } });
  }
  media(i) {
    if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return; const S = this.state, v = S.verses && S.verses[i];
    try { navigator.mediaSession.metadata = new MediaMetadata({ title: this.ref(S.b, S.c, v ? [v.n] : null), artist: this.trInfo(S.tr)[2], album: 'Holy Bible · Overcomer’s Library' }); if (!this._ms) { this._ms = 1; navigator.mediaSession.setActionHandler('pause', () => this.ttsStop()); navigator.mediaSession.setActionHandler('play', () => this.listen(this.state.tts ? this.state.tts.i : null)); } } catch (e) {}
  }
  NS = 'http://www.w3.org/2000/svg';
  PEN = [['ink','Ink','var(--color-text)'],['gold','Gold','oklch(0.64 0.12 75)'],['red','Red','oklch(0.55 0.17 28)'],['blue','Blue','oklch(0.5 0.13 255)'],['green','Green','oklch(0.52 0.11 150)'],['purple','Purple','oklch(0.48 0.14 305)']];
  IHL = [['hy','Yellow','oklch(0.9 0.16 98)'],['hg','Green','oklch(0.86 0.13 150)'],['hb','Blue','oklch(0.84 0.09 230)'],['hp','Pink','oklch(0.82 0.11 350)'],['ho','Orange','oklch(0.83 0.13 65)']];
  INK = Object.fromEntries([...this.PEN, ...this.IHL].map(x => [x[0], x[2]]));
  inkSave() { this.sv(this.key('ink2'), this.inkData); }
  inkRenderAll() { document.querySelectorAll('[data-ink]').forEach(el => this.inkRender(el.getAttribute('data-ink'))); }
  inkSvg(el, create) {
    let svg = el.querySelector(':scope > svg[data-ink-layer]');
    if (!svg && create) { svg = document.createElementNS(this.NS, 'svg'); svg.setAttribute('data-ink-layer', ''); svg.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:2'; el.appendChild(svg); }
    return svg;
  }
  inkD(s, W) {
    const p = s.p, n = p.length / 2, f = v => (v * W).toFixed(1);
    if (s.t === 'hl') return `M${f(p[0])} ${f(p[1])}L${f(p[2])} ${f(p[3])}`;
    if (n === 1) return `M${f(p[0])} ${f(p[1])}l0.1 0`;
    let d = `M${f(p[0])} ${f(p[1])}`;
    for (let i = 1; i < n - 1; i++) d += `Q${f(p[2 * i])} ${f(p[2 * i + 1])} ${f((p[2 * i] + p[2 * i + 2]) / 2)} ${f((p[2 * i + 1] + p[2 * i + 3]) / 2)}`;
    return d + `L${f(p[2 * n - 2])} ${f(p[2 * n - 1])}`;
  }
  inkPath(s, W) {
    const el = document.createElementNS(this.NS, 'path'), hl = s.t === 'hl';
    el.setAttribute('fill', 'none'); el.setAttribute('stroke-linecap', hl ? 'butt' : 'round'); el.setAttribute('stroke-linejoin', 'round');
    el.style.stroke = this.INK[s.c] || this.INK.ink; el.setAttribute('stroke-width', (s.s * W).toFixed(2));
    if (hl) { el.setAttribute('stroke-opacity', '0.42'); el.style.mixBlendMode = 'multiply'; }
    el.setAttribute('d', this.inkD(s, W)); return el;
  }
  inkRender(id) {
    const el = document.querySelector(`[data-ink="${id}"]`); if (!el) return;
    const list = this.inkData[id] || []; const svg = this.inkSvg(el, list.length > 0); if (!svg) return;
    const W = el.getBoundingClientRect().width;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    list.forEach(s => svg.appendChild(this.inkPath(s, W))); svg._w = W;
  }
  inkAnchor(e) { const t = document.elementFromPoint(e.clientX, e.clientY); const a = t && t.closest ? t.closest('[data-ink]') : null; if (a) return a; if (this.inUI(t)) return null; let best = null, bd = Infinity; document.querySelectorAll('[data-ink]').forEach(el => { const r = el.getBoundingClientRect(); if (!r.width || r.bottom < -300 || r.top > window.innerHeight + 300) return; const d = e.clientY < r.top ? r.top - e.clientY : e.clientY > r.bottom ? e.clientY - r.bottom : 0; if (d < bd) { bd = d; best = el; } }); return best; }
  lineAt(x, y) {
    const b = document.body.style, a = b.userSelect, w = b.webkitUserSelect; b.userSelect = b.webkitUserSelect = 'text';
    let rect = null;
    try {
      let node = null, off = 0;
      if (document.caretRangeFromPoint) { const r = document.caretRangeFromPoint(x, y); if (r) { node = r.startContainer; off = r.startOffset; } }
      else if (document.caretPositionFromPoint) { const p = document.caretPositionFromPoint(x, y); if (p) { node = p.offsetNode; off = p.offset; } }
      if (node && node.nodeType === 3 && node.length) {
        const rr = document.createRange(), i = Math.min(off, node.length - 1); rr.setStart(node, i); rr.setEnd(node, i + 1);
        const rc = rr.getBoundingClientRect(); if (rc.height && y >= rc.top - 6 && y <= rc.bottom + 6) rect = rc;
      }
    } catch (e) {}
    b.userSelect = a; b.webkitUserSelect = w; return rect;
  }
  avgY() { let s = 0; this.touches.forEach(v => { s += v; }); return s / Math.max(1, this.touches.size); }
  inkCancel() { const c = this.cur; if (c && !c.erase && c.path) c.path.remove(); this.cur = null; }
  inkDown(e) {
    if (!this.state.ink || this.inUI(e.target)) return;
    const touch = e.pointerType === 'touch';
    if (touch) {
      this.touches.set(e.pointerId, e.clientY);
      if (!this.state.finger) return;
      if (this.touches.size >= 2) { this.inkCancel(); this.pan = this.avgY(); e.preventDefault(); return; }
    } else if (!(e.pointerType === 'pen' || e.pointerType === 'mouse')) return;
    if (this.cur) return;
    const el = this.inkAnchor(e); if (!el) return;
    e.preventDefault();
    if (this.state.tool === 'eraser') { this.cur = { erase: true, pid: e.pointerId }; this.inkEraseAt(e); return; }
    const r = el.getBoundingClientRect(), W = r.width, rd = v => Math.round(v * 1e4) / 1e4;
    const x = rd((e.clientX - r.left) / W), y = rd((e.clientY - r.top) / W);
    let s;
    if (this.state.tool === 'hl') {
      const line = this.lineAt(e.clientX, e.clientY), fs = parseFloat(getComputedStyle(el).fontSize) || 17;
      const h = line ? Math.min(Math.max(line.height, fs * 1.05), fs * 2.4) : fs * 1.4;
      const cy = line ? rd(((line.top + line.bottom) / 2 - r.top) / W) : y;
      s = { t: 'hl', c: this.state.hlColor, s: h / W, p: [x, cy, x, cy] };
    } else s = { t: 'pen', c: this.state.penColor, s: this.penW(e) / W, p: [x, y] };
    const svg = this.inkSvg(el, true), path = this.inkPath(s, W); svg.appendChild(path); svg._w = W;
    this.cur = { id: el.getAttribute('data-ink'), el, s, path, W, pid: e.pointerId };
  }
  penW(e) { const b = ({ fine: 1.5, med: 2.4, bold: 4 })[this.state.penSize || 'med'] || 2.4; return e && e.pointerType === 'pen' && e.pressure > 0 ? Math.round(b * (0.65 + e.pressure * 0.7) * 100) / 100 : b; }
  inkRedoFn() {
    const u = (this.redo || []).pop(); if (!u) return;
    const list = this.inkData[u.id] = this.inkData[u.id] || [];
    if (u.a === 'add') list.push(u.s); else { const i = list.indexOf(u.s); if (i >= 0) list.splice(i, 1); }
    this.undo.push(u); this.inkRender(u.id); this.inkSave(); this.setState({ inkN: this.undo.length });
  }
  inkMove(e) {
    if (e.pointerType === 'touch' && this.touches.has(e.pointerId)) {
      this.touches.set(e.pointerId, e.clientY);
      if (this.pan != null && this.touches.size >= 2) { e.preventDefault(); const a = this.avgY(); window.scrollBy(0, this.pan - a); this.pan = a; return; }
    }
    const c = this.cur; if (!c || e.pointerId !== c.pid) return; e.preventDefault();
    if (c.erase) { this.inkEraseAt(e); return; }
    const r = c.el.getBoundingClientRect(), rd = v => Math.round(v * 1e4) / 1e4;
    if (c.s.t === 'hl') c.s.p[2] = rd((e.clientX - r.left) / c.W);
    else {
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
      for (const ev of (evs.length ? evs : [e])) {
        const x = (ev.clientX - r.left) / c.W, y = (ev.clientY - r.top) / c.W, p = c.s.p;
        if (Math.hypot(x - p[p.length - 2], y - p[p.length - 1]) * c.W < 1.2) continue;
        p.push(rd(x), rd(y));
      }
    }
    c.path.setAttribute('d', this.inkD(c.s, c.W));
  }
  inkUp(e) {
    if (e && e.pointerType === 'touch') { this.touches.delete(e.pointerId); if (this.touches.size < 2) this.pan = null; }
    const c = this.cur; if (!c || (e && e.pointerId !== c.pid)) return; this.cur = null;
    if (c.erase) { this.inkSave(); this.setState({ inkN: this.undo.length }); return; }
    if (c.s.t === 'hl') {
      if (Math.abs(c.s.p[2] - c.s.p[0]) * c.W < 6) { c.path.remove(); return; }
      if (c.s.p[2] < c.s.p[0]) { const t = c.s.p[0]; c.s.p[0] = c.s.p[2]; c.s.p[2] = t; }
    }
    (this.inkData[c.id] = this.inkData[c.id] || []).push(c.s); this.undo.push({ a: 'add', id: c.id, s: c.s }); this.redo = [];
    this.inkSave(); this.setState({ inkN: this.undo.length });
  }
  inkEraseAt(e) {
    const el = this.inkAnchor(e); if (!el) return;
    const id = el.getAttribute('data-ink'), list = this.inkData[id]; if (!list || !list.length) return;
    const r = el.getBoundingClientRect(), W = r.width, x = (e.clientX - r.left) / W, y = (e.clientY - r.top) / W;
    let hit = false;
    for (let i = list.length - 1; i >= 0; i--) {
      const s = list[i], tol = (14 + s.s * W / 2) / W;
      let pts = s.p;
      if (s.t === 'hl') { pts = []; const n = Math.max(2, Math.ceil(Math.abs(s.p[2] - s.p[0]) * W / 8)); for (let k = 0; k <= n; k++) pts.push(s.p[0] + (s.p[2] - s.p[0]) * k / n, s.p[1]); }
      for (let j = 0; j < pts.length; j += 2) if (Math.hypot(pts[j] - x, pts[j + 1] - y) < tol) { list.splice(i, 1); this.undo.push({ a: 'erase', id, s, i }); this.redo = []; hit = true; break; }
    }
    if (hit) this.inkRender(id);
  }
  inkUndoFn() {
    const u = this.undo.pop(); if (!u) return; (this.redo = this.redo || []).push(u);
    const list = this.inkData[u.id] = this.inkData[u.id] || [];
    if (u.a === 'add') { const i = list.indexOf(u.s); if (i >= 0) list.splice(i, 1); } else list.splice(Math.min(u.i, list.length), 0, u.s);
    this.inkRender(u.id); this.inkSave(); this.setState({ inkN: this.undo.length });
  }
  inUI(t) { return !!(t && t.closest && t.closest('[data-ink-ui]')); }
  applyTouch() { const v = this.state.ink && this.state.finger ? 'none' : ''; document.documentElement.style.touchAction = v; document.body.style.touchAction = v; }
  componentWillUnmount() {
    window.removeEventListener('resize', this.onRz); document.removeEventListener('pointerdown', this.onPD); document.removeEventListener('pointermove', this.onPM); document.removeEventListener('pointerup', this.onPU); document.removeEventListener('pointercancel', this.onPU); document.removeEventListener('touchstart', this.onTS); document.removeEventListener('touchmove', this.onTM);
    document.documentElement.style.touchAction = ''; document.body.style.touchAction = '';
    window.removeEventListener('scroll', this.onScroll); document.removeEventListener('selectionchange', this.onSel); window.removeEventListener('keydown', this.onKey); document.removeEventListener('visibilitychange', this.onHide);
    if (this.mq && this.mq.removeEventListener) this.mq.removeEventListener('change', this.onMq); this.ttsStop();
  }
  renderVals() {
    const S = this.state, st = S.set, vs = S.verses || [], v2 = S.verses2, info = this.trInfo(S.tr), info2 = st.tr2 ? this.trInfo(st.tr2) : null, onBg = 'var(--color-accent-100)';
    const seg = a => ({ on: a ? 'true' : 'false', bg: a ? onBg : 'transparent', color: a ? 'var(--color-accent-800)' : 'var(--color-text)' });
    const hk = n => `${S.b}.${S.c}.${n}`, rl = this.rlSet(), par = !!(info2 && v2), lines = st.lines !== false || par, vn = st.vn !== false;
    const hkB = n => hk(n) + '|B', selHas = k => S.sel.includes(k), tog = k => { if (S.ink) return; this.setState(s2 => ({ sel: s2.sel.includes(k) ? s2.sel.filter(x => x !== k) : [...s2.sel, k], qs: false })); };
    const hlBg = k => S.hl[k] ? `color-mix(in srgb, ${this.HLC[S.hl[k]][0]} 55%, transparent)` : 'transparent';
    const verses = vs.map((v, i) => { const sp = S.tts && S.tts.i === i, fl = S.flash === v.n, isJ = rl.has(hk(v.n)), a = this.split(v.text, isJ, info[3]), bv = par ? (v2.find(x => x.n === v.n) || { text: '' }) : null, bb = bv ? this.split(bv.text, isJ, info2[3]) : { pre: '', red: '' };
      return { n: String(v.n), pre: a.pre, red: a.red, preB: bb.pre, redB: bb.red, dom: `v${v.n}`, rowBg: sp || fl ? 'color-mix(in srgb, var(--color-accent) 24%, transparent)' : 'transparent',
        bgA: hlBg(hk(v.n)), bgB: hlBg(hkB(v.n)), ulA: selHas('a:' + v.n) ? 'underline dotted 2px' : 'none', ulB: selHas('b:' + v.n) ? 'underline dotted 2px' : 'none',
        tapA: () => tog('a:' + v.n), tapB: () => tog('b:' + v.n) }; });
    const prevB = S.c > 1 ? [S.b, S.c - 1] : S.b > 1 ? [S.b - 1, this.CH[S.b - 2]] : null, nextB = S.c < this.CH[S.b - 1] ? [S.b, S.c + 1] : S.b < 66 ? [S.b + 1, 1] : null;
    const selItems = S.sel.map(x => ({ side: x[0], n: +x.slice(2) })).sort((p, q) => p.n - q.n || p.side.localeCompare(q.side)), sel = [...new Set(selItems.map(x => x.n))], selText = () => selItems.map(x => ((x.side === 'b' ? v2 || [] : vs).find(v => v.n === x.n) || {}).text || '').join(' '), selKey = x => x.side === 'b' ? hkB(x.n) : hk(x.n), paged = st.scroll === 'p';
    const opt = (k, v, label, extra) => ({ label, ff: 'inherit', note: '', ...this.o(st[k] === v), pick: () => this.setSet(k, v), ...(extra || {}) });
    const allTr = this.TR.flatMap(g => g[1]);
    const subMap = {
      Fonts: { opts: this.FONTS.map(([v, label, ff]) => opt('font', v, label, { ff })) },
      Colours: { opts: [['light', 'Light'], ['sepia', 'Sepia'], ['dark', 'Dark'], ['auto', 'Follow phone']].map(([v, label]) => ({ label, ff: 'inherit', note: '', ...this.o(this.theme() === v), pick: () => this.setTheme(v) })) },
      'Line spacing': { opts: [[1.5, 'Compact'], [1.75, 'Normal'], [2, 'Relaxed']].map(([v, l]) => opt('lh', v, l)) },
      Margins: { opts: [['narrow', 'Narrow'], ['normal', 'Normal'], ['wide', 'Wide']].map(([v, l]) => opt('width', v, l)) },
      'Verse layout': { opts: [opt('lines', true, 'Each verse on its own line'), opt('lines', false, 'Paragraphs')] },
      'Red letter': { note: 'Shows the words of Jesus in red in the Gospels, Acts and Revelation.', opts: [opt('red', true, 'On'), opt('red', false, 'Off')] },
      'Side by side': { note: 'Read two translations next to each other, verse by verse.', opts: [opt('tr2', '', 'Off'), ...allTr.map(t => opt('tr2', t[0], t[2], { note: t[1] }))] },
      Scrolling: { opts: [opt('scroll', 'v', 'Vertical scrolling', { note: 'Scroll down through the chapter' }), opt('scroll', 'p', 'Pages', { note: 'Swipe left and right' })] },
      'Book order': { opts: [opt('order', 'trad', 'Traditional', { note: 'Old Testament, then New' }), opt('order', 'alpha', 'Alphabetical')] },
      'Book picker': { opts: [opt('pickVerse', true, 'Book, chapter and verse'), opt('pickVerse', false, 'Book and chapter')] },
      'Listening speed': { opts: [[0.8, '0.8×'], [1, '1×'], [1.2, '1.2×'], [1.4, '1.4×']].map(([v, l]) => opt('rate', v, l)) }
    };
    const fontName = (this.FONTS.find(f => f[0] === st.font) || this.FONTS[0])[1];
    const row = (label, val, icon) => ({ label, val, icon, go: () => this.setState({ sheet: 'sub', sub: label }) });
    const advGroups = [
      { label: 'Reading', rows: [row('Fonts', fontName, this.IC.font), row('Colours', ({ light: 'Light', sepia: 'Sepia', dark: 'Dark', auto: 'Follow phone' })[this.theme()], this.IC.palette), row('Line spacing', ({ 1.5: 'Compact', 1.75: 'Normal', 2: 'Relaxed' })[st.lh] || 'Normal', this.IC.lines), row('Margins', ({ narrow: 'Narrow', normal: 'Normal', wide: 'Wide' })[st.width], this.IC.margin), row('Scrolling', paged ? 'Pages' : 'Vertical', this.IC.scroll)] },
      { label: 'Bible', rows: [row('Verse layout', st.lines !== false ? 'Own line' : 'Paragraphs', this.IC.verse), row('Red letter', st.red ? 'On' : 'Off', this.IC.red), row('Side by side', info2 ? info2[1] : 'Off', this.IC.par), row('Book order', st.order === 'alpha' ? 'Alphabetical' : 'Traditional', this.IC.order), row('Book picker', st.pickVerse ? 'With verse' : 'Chapter', this.IC.pick)] },
      { label: 'Listening', rows: [row('Listening speed', (st.rate || 1) + '×', this.IC.speed), { label: 'Reset fonts and colours', val: '', icon: this.IC.reset, go: () => { this.sv('gra-bible-settings', {}); this.setState({ set: { ...this.DEF } }, () => this.load()); this.setTheme('auto'); this.toast('Reading settings reset'); } }] }
    ];
    const savedList = [...S.bm.map(m => ({ k: m.t, ref: this.ref(m.b, m.c, m.v), kind: this.T('Bookmark'), sw: 'var(--color-text)', go: () => this.go(m.b, m.c, m.v[0], 0) })),
      ...Object.entries(S.hl).map(([k, col]) => { const [b, c, v] = k.split('|')[0].split('.').map(Number); return { k: b * 1e6 + c * 1e3 + v, ref: this.ref(b, c, [v]), kind: this.T(this.HLC[col][1]) + (k.endsWith('|B') ? ' · ' + this.T('second column') : ''), sw: this.HLC[col][0], go: () => this.go(b, c, v, 0) }; })].sort((a, b) => b.k - a.k);
    const titles = { books: 'Books', tr: 'Translation', saved: 'Saved verses', adv: 'Bible Settings', sub: S.sub || '' };
    const backHref = this.inSite() ? (location.protocol === 'file:' ? '../index.html#library' : '../#library') : 'GRA Prayer Library.dc.html#library';
    const pb = S.pickB, pc = S.pickC, q = S.bq.trim().toLowerCase().replace(/\s+/g, ''), alpha = st.order === 'alpha';
    const bItem = i => ({ name: this.BK[i], tag: alpha ? (i < 39 ? 'OT' : 'NT') : '', w: i + 1 === S.b ? '600' : '400', color: i + 1 === S.b ? 'var(--color-accent-700)' : 'var(--color-text)', pick: () => (this.CH[i] === 1 && !st.pickVerse ? this.go(i + 1, 1, null, 0) : this.CH[i] === 1 ? this.pickCh(i + 1, 1) : this.setState({ pickB: i + 1, bpMenu: false })) });
    const match = i => !q || this.BK[i].toLowerCase().replace(/\s/g, '').includes(q);
    const idx = [...Array(66).keys()].filter(match), jump = this.parseRef(S.bq);
    let bookGroups = alpha ? [{ label: '', hasLabel: false, items: idx.slice().sort((a, b) => this.BK[a].replace(/^\d /, '').localeCompare(this.BK[b].replace(/^\d /, '')) || a - b).map(bItem) }]
      : [{ label: 'Old Testament', hasLabel: true, items: idx.filter(i => i < 39).map(bItem) }, { label: 'New Testament', hasLabel: true, items: idx.filter(i => i >= 39).map(bItem) }].filter(g => g.items.length);
    if (jump) bookGroups = [{ label: 'Go to', hasLabel: true, items: [{ name: this.ref(jump.b, jump.c, jump.v ? [jump.v] : null), tag: '', w: '600', color: 'var(--color-accent-700)', pick: () => this.go(jump.b, jump.c, jump.v, 0) }] }, ...bookGroups];
    const rates = [0.8, 1, 1.2, 1.4];
    const tgl = (label, on, flip) => ({ label, on: on ? 'true' : 'false', flip, track: on ? 'var(--color-accent)' : 'var(--color-neutral-300)', knob: on ? '20px' : '0px' });
    return {
      backHref, refLabel: `${this.BK[S.b - 1]} ${S.c}`, trCode: info2 ? `${info[1]} | ${info2[1]}` : info[1], trCodeA: info[1], tr2Code: info2 ? info2[1] : '', trName: par ? `${info[2]} · ${info2[2]}` : info[2], chTitle: `${this.BK[S.b - 1]} ${S.c}`,
      openBooks: () => this.setState({ sheet: 'books', pickB: null, pickC: null, bq: '', qs: false, bpMenu: false }), openTr: () => this.setState({ sheet: 'tr', qs: false, trPar: !!st.tr2, trSlot: 1 }), openSettings: () => this.setState({ qs: false, sheet: 'adv' }),
      toggleQs: () => this.setState({ qs: !S.qs }), qsOpen: S.qs, qsOpenStr: S.qs ? 'true' : 'false', qsBg: S.qs ? onBg : 'transparent',
      fsDown: () => this.setSet('size', Math.max(14, (st.size || 19) - 2)), fsUp: () => this.setSet('size', Math.min(32, (st.size || 19) + 2)),
      themeOpts: [['light', 'Light'], ['sepia', 'Sepia'], ['dark', 'Dark'], ['auto', 'Auto']].map(([v, label]) => ({ label, ...seg(this.theme() === v), pick: () => this.setTheme(v) })),
      fontOpts: this.FONTS.map(([v, label, ff]) => ({ label, ff, ...seg(st.font === v), bd: st.font === v ? 'var(--color-accent)' : 'var(--color-divider)', pick: () => this.setSet('font', v) })),
      qsToggles: [tgl('Verse numbers', vn, () => this.setSet('vn', !vn)), tgl('Each verse on its own line', st.lines !== false, () => this.setSet('lines', st.lines === false)), tgl('Words of Jesus in red', !!st.red, () => this.setSet('red', !st.red)), tgl('Vertical scrolling', !paged, () => this.setSet('scroll', paged ? 'v' : 'p'))],
      vnDisp: vn ? 'inline' : 'none', vRow: par ? 'grid' : lines ? 'block' : 'inline', vGap: lines ? '.45em' : '0', isPar: par,
      mainRef: this.mainRef, artRef: this.artRef, pagerRef: this.pagerRef, colW: par ? '980px' : ({ narrow: '560px', wide: '820px' })[st.width] || '680px',
      readFont: (this.FONTS.find(f => f[0] === st.font) || this.FONTS[0])[2], readSize: (par ? Math.max(14, (st.size || 19) - 2) : st.size || 19) + 'px', readLh: String(st.lh || 1.75),
      pgH: paged ? 'calc(100svh - 330px)' : 'auto', pgCW: paged && S.pw ? S.pw + 'px' : 'auto', pgOv: paged ? 'hidden' : 'visible', isPaged: paged && S.pgN > 1,
      pgPos: `${S.pgI + 1} / ${S.pgN}`, pgPrev: () => this.turn(-1), pgNext: () => this.turn(1),
      loading: !S.verses && !S.err, hasErr: !!S.err, errText: S.err || '', verses, inkKey: `${S.b}.${S.c}`,
      goPrev: () => this.step(-1, true), noPrev: !prevB, prevLabel: prevB ? `‹ ${this.BK[prevB[0] - 1]} ${prevB[1]}` : '—',
      goNext: () => this.step(1, true), noNext: !nextB, nextLabel: nextB ? `${this.BK[nextB[0] - 1]} ${nextB[1]} ›` : '—',
      hasSel: sel.length > 0 && !S.sheet && !S.ink,
      hlColors: Object.entries(this.HLC).map(([k, [sw, label]]) => ({ sw, label, pick: () => { const hl = { ...S.hl }; const allK = selItems.every(x => hl[selKey(x)] === k); selItems.forEach(x => { if (allK) delete hl[selKey(x)]; else hl[selKey(x)] = k; }); this.sv('gra-bible-hl', hl); this.setState({ hl, sel: [] }); } })),
      selBm: () => { const bm = [...S.bm, { b: S.b, c: S.c, v: sel, t: Date.now() }]; this.sv('gra-bible-bm', bm); this.setState({ bm, sel: [] }); this.toast('Bookmarked'); },
      selCopy: () => { const codes = [...new Set(selItems.map(x => x.side === 'b' && info2 ? info2[1] : info[1]))].join(', '), t = `“${selText()}” — ${this.ref(S.b, S.c, sel)} (${codes})`; if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => this.toast('Copied'), () => {}); this.setState({ sel: [] }); },
      selListen: () => { const i = vs.findIndex(v => v.n === sel[0]); this.setState({ sel: [] }); this.listen(Math.max(0, i)); },
      selClear: () => { const hl = { ...S.hl }; let ch = false; selItems.forEach(x => { if (hl[selKey(x)]) { delete hl[selKey(x)]; ch = true; } }); if (ch) this.sv('gra-bible-hl', hl); this.setState({ sel: [], hl }); },
      hasTts: !!S.tts, ttsLabel: S.tts ? `${this.T('Reading aloud')} · ${this.ref(S.b, S.c, vs[S.tts.i] ? [vs[S.tts.i].n] : null)}` : '', ttsPlayLabel: 'Stop', ttsIcon: 'M7 5h3v14H7zM14 5h3v14h-3z',
      ttsToggle: () => this.ttsStop(), ttsStop: () => this.ttsStop(), rateLabel: (st.rate || 1) + '×', ttsRate: () => { const n = rates[(rates.indexOf(st.rate || 1) + 1) % rates.length]; this.setSet('rate', n); if (S.tts) setTimeout(() => this.listen(S.tts.i), 30); },
      navItems: [['Saved', this.IC.saved, () => this.setState({ sheet: 'saved' }), S.sheet === 'saved'], [S.tts ? 'Playing' : 'Listen', this.IC.listen, () => { if (!S.tts) this.listen(null); this.setState({ npOpen: true }); }, !!S.tts], ['Pen', this.IC.pen, () => this.startInk(), false], ['Settings', this.IC.gear, () => this.setState({ sheet: 'adv', qs: false }), S.sheet === 'adv' || S.sheet === 'sub']]
        .map(([label, icon, go, on]) => ({ label, icon, go, color: on ? 'var(--color-accent-700)' : 'var(--color-neutral-700)' })),
      sheetOpen: !!S.sheet, sheet: S.sheet || '', sheetTitle: this.T(titles[S.sheet] || ''), closeSheet: () => this.setState({ sheet: null, sub: null, bpMenu: false }),
      sheetBack: () => (S.sheet === 'sub' ? this.setState({ sheet: 'adv', sub: null }) : S.sheet === 'books' && pc ? this.setState({ pickC: null }) : S.sheet === 'books' && pb ? this.setState({ pickB: null }) : this.setState({ sheet: null, bpMenu: false })),
      sheetBackIcon: S.sheet === 'sub' || (S.sheet === 'books' && (pb || pc)) ? this.IC.back : this.IC.close,
      isBooks: S.sheet === 'books', notBooks: S.sheet !== 'books', bpMenu: S.sheet === 'books' && S.bpMenu, bpMenuStr: S.bpMenu ? 'true' : 'false', bpMenuBg: S.bpMenu ? onBg : 'var(--color-bg)', toggleBpMenu: () => this.setState({ bpMenu: !S.bpMenu }),
      orderOpts: [['trad', 'Traditional'], ['alpha', 'Alphabetical']].map(([k, label]) => ({ label, on: st.order === k ? 'true' : 'false', mark: st.order === k ? '✓' : '', bg: st.order === k ? onBg : 'transparent', pick: () => this.setSet('order', k) })),
      toggleVerseStep: () => this.setSet('pickVerse', !st.pickVerse), verseStepStr: st.pickVerse ? 'true' : 'false', verseStepMark: st.pickVerse ? '✓' : '',
      pickingBook: !pb && !pc, pickingCh: !!pb && !pc, pickingV: !!pc, pickBookName: pb ? this.BK[pb - 1] : '', pickChName: pc ? `${this.BK[pc.b - 1]} ${pc.c}` : '',
      bq: S.bq, bqRef: this.bqRef, onBq: e => this.setState({ bq: e.target.value }), bookGroups, noBooks: !bookGroups.length,
      chList: pb ? Array.from({ length: this.CH[pb - 1] }, (_, i) => ({ n: String(i + 1), bd: pb === S.b && i + 1 === S.c ? 'var(--color-accent)' : 'var(--color-divider)', bg: pb === S.b && i + 1 === S.c ? onBg : 'transparent', pick: () => (st.pickVerse ? this.pickCh(pb, i + 1) : this.go(pb, i + 1, null, 0)) })) : [],
      vLoading: !!pc && !pc.n, vList: pc && pc.n ? Array.from({ length: pc.n }, (_, i) => ({ n: String(i + 1), pick: () => this.go(pc.b, pc.c, i + 1, 0) })) : [], pickWhole: () => pc && this.go(pc.b, pc.c, null, 0),
      isTr: S.sheet === 'tr',
      trGroups: this.TR.map(([label, items]) => ({ label, items: items.map(([id, code, name]) => { const cur = S.trPar && (S.trSlot || 1) === 2 ? st.tr2 : S.tr; return { code, name, isOn: id === cur, on: id === cur ? 'true' : 'false', pick: () => this.pickTr(id) }; }) })),
      trModes: [['one', 'Single', 'M6 4h12v16H6z'], ['two', 'Side by side', 'M3 4h7v16H3zM14 4h7v16h-7z']].map(([k, label, icon]) => { const a = (k === 'two') === !!S.trPar; return { label, icon, ...seg(a), pick: () => this.trMode(k === 'two') }; }),
      trIsPar: !!S.trPar, trSlots: [['First', S.tr, 1], ['Second', st.tr2, 2]].map(([label, id, n]) => { const a = (S.trSlot || 1) === n; return { label, code: id ? this.trInfo(id)[1] : 'Choose', on: a ? 'true' : 'false', bd: a ? 'var(--color-accent)' : 'var(--color-divider)', bg: a ? onBg : 'transparent', pick: () => this.setState({ trSlot: n }) }; }),
      trSlotHint: (S.trSlot || 1) === 2 ? 'Pick the translation for the second column.' : 'Pick the translation for the first column.',
      isSaved: S.sheet === 'saved', savedList, savedEmpty: !savedList.length,
      isAdv: S.sheet === 'adv', advGroups, isAdvSub: S.sheet === 'sub', subOpts: S.sub && subMap[S.sub] ? subMap[S.sub].opts : [], hasSubNote: !!(S.sub && subMap[S.sub] && subMap[S.sub].note), subNote: S.sub && subMap[S.sub] ? subMap[S.sub].note || '' : '',
      ...this.npVals(), hasToast: !!S.toast, toast: S.toast || '',
      inkOn: S.ink, notInk: !S.ink,
      startInk: () => this.startInk(),
      stopInk: () => this.setState({ ink: false }, () => this.applyTouch()),
      pickPen: () => this.setState({ tool: 'pen' }), pickHl: () => this.setState({ tool: 'hl' }), pickEraser: () => this.setState({ tool: 'eraser' }),
      penBg: seg(S.tool === 'pen').bg, penColor: seg(S.tool === 'pen').color, hlBg: seg(S.tool === 'hl').bg, hlColor: seg(S.tool === 'hl').color, erBg: seg(S.tool === 'eraser').bg, erColor: seg(S.tool === 'eraser').color,
      inkColors: (S.tool === 'hl' ? this.IHL : this.PEN).map(([k, label, css]) => ({ label, css, ring: (S.tool === 'hl' ? S.hlColor : S.penColor) === k ? 4 : 0, pick: () => this.setState(S.tool === 'hl' ? { hlColor: k } : { penColor: k, tool: 'pen' }) })),
      toggleFinger: () => { const f = !S.finger; this.setState({ finger: f }, () => this.applyTouch()); this.toast(f ? 'Finger draws · two fingers scroll' : 'Fingers scroll · Pencil draws'); },
      fingerBg: seg(S.finger).bg, fingerColor: seg(S.finger).color,
      inkUndo: () => this.inkUndoFn(), undoOp: (this.undo || []).length ? 1 : 0.35, inkRedo: () => this.inkRedoFn(), redoOp: (this.redo || []).length ? 1 : 0.35,
      penSizes: [['fine', 'Fine', '5px'], ['med', 'Medium', '8px'], ['bold', 'Bold', '12px']].map(([k, label, d]) => { const on = (S.penSize || 'med') === k; return { label, d, on: on ? 'true' : 'false', bg: on ? onBg : 'transparent', pick: () => { this.setState({ penSize: k, tool: 'pen' }); this.sv('gra-nr-penSize', k); } }; })
    };
  }
  startInk() {
    this.ttsStop(); this.setState({ sel: [], sheet: null, qs: false });
    const go = () => { this.setState({ ink: true }, () => this.applyTouch()); this.toast(this.state.finger ? 'Finger draws · two fingers scroll' : 'Pencil draws · fingers scroll'); };
    if (this.state.set.scroll === 'p') { this.setSet('scroll', 'v'); this.toast('Switched to vertical scrolling for the pen'); setTimeout(go, 250); } else go();
  }
  trMode(two) {
    const S = this.state, st = S.set;
    if (!two) { this.setState({ trPar: false, trSlot: 1 }); if (st.tr2) this.setSet('tr2', ''); return; }
    const all = this.TR.flatMap(g => g[1]).map(t => t[0]), lang = this.trInfo(S.tr)[3];
    const ui = { fr: 'ls1910', es: 'valera' }[window.GRAi18n ? window.GRAi18n.lang : 'en'];
    const pick = st.tr2 ? st.tr2 : ui && ui !== S.tr ? ui : (all.find(id => id !== S.tr && this.trInfo(id)[3] !== lang) || all.find(id => id !== S.tr));
    this.setState({ trPar: true, trSlot: 2 }); this.setSet('tr2', pick);
  }
  pickTr(id) {
    const S = this.state, st = S.set; this.ttsStop();
    if (S.trPar && (S.trSlot || 1) === 2) { return this.setSet('tr2', id); }
    this.setState({ tr: id, sheet: S.trPar ? 'tr' : null }, () => this.load());
  }
  async pickCh(b, c) {
    this.setState({ pickC: { b, c, n: 0 }, pickB: null });
    try { const v = await this.fetchCh(this.state.tr, b, c); if (this.state.pickC && this.state.pickC.b === b && this.state.pickC.c === c) this.setState({ pickC: { b, c, n: v.length } }); }
    catch (e) { this.go(b, c, null, 0); }
  }
}
