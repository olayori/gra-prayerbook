class Component extends DCLogic {
  state = { book: null, err: false, ch: 0, view: 'title', sheet: null, tocTab: 'ch', q: '', sel: null, hl: [], bm: [], done: {}, set: {}, prog: 0, ratio: 0, verse: null, tts: null, noteTxt: '', toast: null, flash: null, tick: 0, ink: false, tool: 'pen', penColor: 'ink', hlColor: 'hy', finger: false, penSize: 'med', inkN: 0 };
  HL = { y: ['#f2cf5b', 'Yellow'], g: ['#8fd19a', 'Green'], b: ['#8dbcf0', 'Blue'], p: ['#f09cbe', 'Pink'] };
  qRef = React.createRef(); mainRef = React.createRef();
  get slug() { return (new URLSearchParams(location.search).get('b') || 'rooted').replace(/[^a-z0-9-]/gi, ''); }
  key(k) { return `gra-nr-${this.slug}-${k}`; }
  ld(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  sv(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  inSite() { return /\/read\/?(index\.html)?$/.test(location.pathname); }
  theme() { return (this.ld('gra-covenant-settings', {}) || {}).theme || 'auto'; }
  setTheme(t) { const s = this.ld('gra-covenant-settings', {}) || {}; this.sv('gra-covenant-settings', { ...s, theme: t }); this.applyTheme(); this.setState(s2 => ({ tick: s2.tick + 1 })); }
  applyTheme() {
    const t = this.theme(), dark = t === 'dark' || (t === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches), de = document.documentElement;
    if (dark) de.setAttribute('data-theme', 'dark'); else if (t === 'sepia') de.setAttribute('data-theme', 'sepia'); else de.removeAttribute('data-theme');
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', dark ? '#1a1714' : t === 'sepia' ? '#f3ead6' : '#f3f2f2');
  }
  lang() { return window.GRAi18n ? window.GRAi18n.lang : 'en'; }
  T(s) { return window.GRAi18n ? window.GRAi18n.t(s) : s; }
  componentDidMount() {
    this.npSwipeInit();
    this.applyTheme();
    this.mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null; this.onMq = () => this.applyTheme(); if (this.mq && this.mq.addEventListener) this.mq.addEventListener('change', this.onMq);
    this.enterStart();
    this.setState({ set: { size: 19, font: 'book', lh: 1.7, width: 'normal', rate: 1, ...this.ld('gra-nr-settings', {}) }, hl: this.ld(this.key('hl'), []), bm: this.ld(this.key('bm'), []), done: this.ld(this.key('done'), {}) });
    fetch((this.inSite() ? '../' : '') + 'books/' + this.slug + '.json').then(r => { if (!r.ok) throw 0; return r.json(); }).then(book => {
      document.title = book.title + ' · Overcomer’s Library';
      const m = /^#c(\d+)(?:-p(\d+))?$/.exec(location.hash), pos = this.ld(this.key('pos'), null);
      let ch = 0, pid = null, view = 'title';
      if (m) { view = 'text'; ch = Math.min(book.chapters.length - 1, Math.max(0, +m[1] - 1)); if (m[2]) pid = `${ch}-${+m[2] - 1}`; }
      else if (pos && pos.ch < book.chapters.length) { ch = pos.ch; pid = pos.pid; view = 'text'; }
      this.setState({ book, ch, view }, () => { this.enterDone(); if (pid) setTimeout(() => this.jumpTo(pid, !!m), 60); this.onScrollNow(); });
    }).catch(() => { this.enterDone(); this.setState({ err: true }); });
    this.onScroll = () => { if (this._raf) return; this._raf = requestAnimationFrame(() => { this._raf = null; this.onScrollNow(); }); };
    window.addEventListener('scroll', this.onScroll, { passive: true });
    this.onSel = () => { clearTimeout(this._selT); this._selT = setTimeout(() => this.readSel(), 220); };
    document.addEventListener('selectionchange', this.onSel);
    this.onKey = e => {
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.key === 'Escape') { if (this.state.sheet) this.setState({ sheet: null }); else if (this.state.sel) this.clearSel(); }
      if (e.key === 'ArrowRight' && !this.state.sheet && !this.state.ink) this.page(1); if (e.key === 'ArrowLeft' && !this.state.sheet && !this.state.ink) this.page(-1);
    };
    window.addEventListener('keydown', this.onKey);
    this.onSwS = e => { if (e.touches.length !== 1 || this.state.ink) return; this._sx = e.touches[0].clientX; this._sy = e.touches[0].clientY; this._stt = Date.now(); };
    this.onSwE = e => { if (this._sx == null || this.state.ink || this.state.sheet || this.state.sel) { this._sx = null; return; } const t = e.changedTouches[0], dx = t.clientX - this._sx, dy = t.clientY - this._sy; this._sx = null; if (Math.abs(dx) > 70 && Math.abs(dy) < 60 && Date.now() - this._stt < 700) this.page(dx < 0 ? 1 : -1); };
    setTimeout(() => { const mn = this.mainRef.current; if (mn) { mn.addEventListener('touchstart', this.onSwS, { passive: true }); mn.addEventListener('touchend', this.onSwE, { passive: true }); } }, 0);
    this.onHide = () => { if (document.hidden) this.savePos(); }; document.addEventListener('visibilitychange', this.onHide);
    this.inkData = this.ld(this.key('ink2'), {}) || {}; this.undo = []; this.redo = []; this.touches = new Map(); this.pan = null;
    this.setState({ finger: !!(window.matchMedia && matchMedia('(max-width: 700px)').matches), penSize: this.ld('gra-nr-penSize', 'med') });
    this.onPD = e => this.inkDown(e); this.onPM = e => this.inkMove(e); this.onPU = e => this.inkUp(e);
    this.onTS = e => { if (!this.state.ink || this.inUI(e.target)) return; const t = e.touches && e.touches[0]; if (t && (t.touchType === 'stylus' || this.state.finger)) e.preventDefault(); };
    this.onTM = e => { if (this.state.ink && (this.cur || this.pan != null) && !this.inUI(e.target)) e.preventDefault(); };
    document.addEventListener('pointerdown', this.onPD, { passive: false }); document.addEventListener('pointermove', this.onPM, { passive: false });
    document.addEventListener('pointerup', this.onPU); document.addEventListener('pointercancel', this.onPU);
    document.addEventListener('touchstart', this.onTS, { passive: false }); document.addEventListener('touchmove', this.onTM, { passive: false });
    this.onRz = () => { clearTimeout(this._rz); this._rz = setTimeout(() => this.inkRenderAll(), 150); }; window.addEventListener('resize', this.onRz);
  }
  componentDidUpdate() { const k = [this.state.ch, this.state.set.size, this.state.set.lh, this.state.set.width, this.state.set.font, !!this.state.book].join('|'); if (k !== this._inkK) { this._inkK = k; requestAnimationFrame(() => this.inkRenderAll()); } }
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
  }  inkD(s, W) {
    const p = s.p, n = p.length / 2, f = v => (v * W).toFixed(1);
    if (s.t === 'hl') return `M${f(p[0])} ${f(p[1])}L${f(p[2])} ${f(p[3])}`;
    if (n === 1) return `M${f(p[0])} ${f(p[1])}l0.1 0`;
    let d = `M${f(p[0])} ${f(p[1])}`;
    for (let i = 1; i < n - 1; i++) d += `Q${f(p[2 * i])} ${f(p[2 * i + 1])} ${f((p[2 * i] + p[2 * i + 2]) / 2)} ${f((p[2 * i + 1] + p[2 * i + 3]) / 2)}`;
    return d + `L${f(p[2 * n - 2])} ${f(p[2 * n - 1])}`;
  }  inkPath(s, W) {
    const el = document.createElementNS(this.NS, 'path'), hl = s.t === 'hl';
    el.setAttribute('fill', 'none'); el.setAttribute('stroke-linecap', hl ? 'butt' : 'round'); el.setAttribute('stroke-linejoin', 'round');
    el.style.stroke = this.INK[s.c] || this.INK.ink; el.setAttribute('stroke-width', (s.s * W).toFixed(2));
    if (hl) { el.setAttribute('stroke-opacity', '0.42'); el.style.mixBlendMode = 'multiply'; }
    el.setAttribute('d', this.inkD(s, W)); return el;
  }  inkRender(id) {
    const el = document.querySelector(`[data-ink="${id}"]`); if (!el) return;
    const list = this.inkData[id] || []; const svg = this.inkSvg(el, list.length > 0); if (!svg) return;
    const W = el.getBoundingClientRect().width;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    list.forEach(s => svg.appendChild(this.inkPath(s, W))); svg._w = W;
  }  inkAnchor(e) { const t = document.elementFromPoint(e.clientX, e.clientY); const a = t && t.closest ? t.closest('[data-ink]') : null; if (a) return a; if (this.inUI(t)) return null; let best = null, bd = Infinity; document.querySelectorAll('[data-ink]').forEach(el => { const r = el.getBoundingClientRect(); if (!r.width || r.bottom < -300 || r.top > window.innerHeight + 300) return; const d = e.clientY < r.top ? r.top - e.clientY : e.clientY > r.bottom ? e.clientY - r.bottom : 0; if (d < bd) { bd = d; best = el; } }); return best; }
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
  }  avgY() { let s = 0; this.touches.forEach(v => { s += v; }); return s / Math.max(1, this.touches.size); }  inkCancel() { const c = this.cur; if (c && !c.erase && c.path) c.path.remove(); this.cur = null; }  inkDown(e) {
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
  }  penW(e) { const b = ({ fine: 1.5, med: 2.4, bold: 4 })[this.state.penSize || 'med'] || 2.4; return e && e.pointerType === 'pen' && e.pressure > 0 ? Math.round(b * (0.65 + e.pressure * 0.7) * 100) / 100 : b; }  inkRedoFn() {
    const u = (this.redo || []).pop(); if (!u) return;
    const list = this.inkData[u.id] = this.inkData[u.id] || [];
    if (u.a === 'add') list.push(u.s); else { const i = list.indexOf(u.s); if (i >= 0) list.splice(i, 1); }
    this.undo.push(u); this.inkRender(u.id); this.inkSave(); this.setState({ inkN: this.undo.length });
  }  inkMove(e) {
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
  }  inkUp(e) {
    if (e && e.pointerType === 'touch') { this.touches.delete(e.pointerId); if (this.touches.size < 2) this.pan = null; }
    const c = this.cur; if (!c || (e && e.pointerId !== c.pid)) return; this.cur = null;
    if (c.erase) { this.inkSave(); this.setState({ inkN: this.undo.length }); return; }
    if (c.s.t === 'hl') {
      if (Math.abs(c.s.p[2] - c.s.p[0]) * c.W < 6) { c.path.remove(); return; }
      if (c.s.p[2] < c.s.p[0]) { const t = c.s.p[0]; c.s.p[0] = c.s.p[2]; c.s.p[2] = t; }
    }
    (this.inkData[c.id] = this.inkData[c.id] || []).push(c.s); this.undo.push({ a: 'add', id: c.id, s: c.s }); this.redo = [];
    this.inkSave(); this.setState({ inkN: this.undo.length });
  }  inkEraseAt(e) {
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
  }  inkUndoFn() {
    const u = this.undo.pop(); if (!u) return; (this.redo = this.redo || []).push(u);
    const list = this.inkData[u.id] = this.inkData[u.id] || [];
    if (u.a === 'add') { const i = list.indexOf(u.s); if (i >= 0) list.splice(i, 1); } else list.splice(Math.min(u.i, list.length), 0, u.s);
    this.inkRender(u.id); this.inkSave(); this.setState({ inkN: this.undo.length });
  }  inUI(t) { return !!(t && t.closest && t.closest('[data-ink-ui]')); }  applyTouch() { const v = this.state.ink && this.state.finger ? 'none' : ''; document.documentElement.style.touchAction = v; document.body.style.touchAction = v; }  componentWillUnmount() {
    window.removeEventListener('resize', this.onRz); document.removeEventListener('pointerdown', this.onPD); document.removeEventListener('pointermove', this.onPM); document.removeEventListener('pointerup', this.onPU); document.removeEventListener('pointercancel', this.onPU); document.removeEventListener('touchstart', this.onTS); document.removeEventListener('touchmove', this.onTM);
    document.documentElement.style.touchAction = ''; document.body.style.touchAction = '';
    window.removeEventListener('scroll', this.onScroll); document.removeEventListener('selectionchange', this.onSel); window.removeEventListener('keydown', this.onKey); document.removeEventListener('visibilitychange', this.onHide);
    if (this.mq && this.mq.removeEventListener) this.mq.removeEventListener('change', this.onMq); this.ttsStop();
  }
  enterStart() {
    let c = null; try { c = sessionStorage.getItem('gra-enter'); sessionStorage.removeItem('gra-enter'); } catch (e) {}
    if (!c || !/^#[0-9a-f]{3,8}$/i.test(c)) return;
    const d = document.createElement('div'); Object.assign(d.style, { position: 'fixed', inset: '0', zIndex: '300', background: c, pointerEvents: 'none', transition: 'opacity .55s cubic-bezier(.2,.7,.2,1)' });
    document.body.appendChild(d); this._enterEl = d; this._enterT = setTimeout(() => this.enterDone(), 1800);
  }
  enterDone() { const d = this._enterEl; if (!d) return; this._enterEl = null; clearTimeout(this._enterT); requestAnimationFrame(() => { d.style.opacity = '0'; setTimeout(() => d.remove(), 600); }); }
  kind(t) { return t.startsWith('> ') ? 'q' : t.startsWith('## ') ? 'h' : 'p'; }
  body(t) { return t.replace(/^> /, '').replace(/^## /, ''); }
  plain(t) { return this.body(t).replace(/\[\[([^\]]+)\]\]/g, '$1'); }
  words(ch) { return (this.state.book.chapters[ch].paras || []).reduce((a, p) => a + this.plain(p).split(/\s+/).length, 0); }
  hdrH() { return ((document.querySelector('[data-hdr]') || {}).offsetHeight || 58); }
  topPara() { const h = this.hdrH() + 8, ps = document.querySelectorAll('[data-p]'); for (const p of ps) { if (p.getBoundingClientRect().bottom > h) return p.getAttribute('data-p'); } return null; }
  jumpTo(pid, flash) {
    const el = document.querySelector(`[data-p="${pid}"]`); if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - this.hdrH() - 16, behavior: 'instant' });
    if (flash) { this.setState({ flash: pid }); clearTimeout(this._fl); this._fl = setTimeout(() => this.setState({ flash: null }), 1600); }
  }
  seq(view, ch) { return view === 'title' ? 0 : view === 'toc' ? 1 : 2 + ch * 2 + (view === 'text' ? 1 : 0); }
  fromSeq(i) { const N = this.state.book.chapters.length; i = Math.max(0, Math.min(1 + N * 2, i)); if (i === 0) return ['title', 0]; if (i === 1) return ['toc', 0]; return [(i - 2) % 2 ? 'text' : 'open', Math.floor((i - 2) / 2)]; }
  page(d) { if (!this.state.book) return; const [view, ch] = this.fromSeq(this.seq(this.state.view, this.state.ch) + d); if (view === this.state.view && ch === this.state.ch) return; this.show(view, ch, d); }
  show(view, ch, dir, pid) {
    const S = this.state; if (S.view === 'text' && ch > S.ch) this.markDone(S.ch);
    this.ttsStop(); this.clearSel();
    const el = this.mainRef.current, still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches, anim = el && el.animate && !still && dir;
    const apply = () => this.setState({ view, ch, sheet: null, ratio: 0 }, () => { try { history.replaceState(null, '', location.pathname + location.search + (view === 'text' ? '#c' + (ch + 1) : '')); } catch (e) {} if (pid) requestAnimationFrame(() => this.jumpTo(pid, true)); else window.scrollTo({ top: 0, behavior: 'instant' }); if (view === 'text') this.savePos(); if (anim) el.animate([{ opacity: 0, transform: `translateX(${dir * 56}px)` }, { opacity: 1, transform: 'none' }], { duration: 360, easing: 'cubic-bezier(.2,.7,.2,1)' }); });
    if (anim) el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-dir * 56}px)` }], { duration: 170, easing: 'ease-in', fill: 'forwards' }).onfinish = apply; else apply();
  }
  onScrollNow() {
    const B = this.state.book; if (!B || this.state.view !== 'text') return;
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight), ratio = Math.min(1, window.scrollY / max);
    const prog = (this.state.ch + ratio) / B.chapters.length;
    if (Math.abs(ratio - this.state.ratio) > 0.004) this.setState({ ratio, prog });
    clearTimeout(this._svT); this._svT = setTimeout(() => this.savePos(), 500);
    if (ratio > 0.92 && document.documentElement.scrollHeight > window.innerHeight * 1.05) this.markDone(this.state.ch);
  }
  savePos() { const B = this.state.book; if (!B) return; const prog = Math.max((this.state.ch + this.state.ratio) / B.chapters.length, Object.keys(this.state.done).length / B.chapters.length); this.sv(this.key('pos'), { ch: this.state.ch, pid: this.topPara(), t: Date.now(), prog, title: B.chapters[this.state.ch].title }); }
  markDone(ch) {
    if (this.state.done[ch]) return;
    const done = { ...this.state.done, [ch]: Date.now() }; this.sv(this.key('done'), done); this.setState({ done });
    const d = new Date(), k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, h = this.ld(this.key('hist'), {}) || {};
    const l = h[k] || []; if (!l.includes('c' + (ch + 1))) { h[k] = [...l, 'c' + (ch + 1)]; this.sv(this.key('hist'), h); }
  }
  goCh(ch, pid) {
    const B = this.state.book; if (!B || ch < 0 || ch >= B.chapters.length) return;
    if (!pid) return this.show('open', ch, ch >= this.state.ch ? 1 : -1);
    if (ch > this.state.ch) this.markDone(this.state.ch);
    this.ttsStop(); this.clearSel();
    this.setState({ ch, view: 'text', sheet: null, ratio: 0 }, () => { try { history.replaceState(null, '', location.pathname + location.search + '#c' + (ch + 1)); } catch (e) {} if (pid) requestAnimationFrame(() => this.jumpTo(pid, true)); else window.scrollTo({ top: 0, behavior: 'instant' }); this.savePos(); });
  }
  readSel() {
    if (this.state.ink) return;
    const s = window.getSelection(); if (!s || s.isCollapsed || !s.rangeCount) { if (this.state.sel && !this.state.sel.hid) this.setState({ sel: null }); return; }
    const r = s.getRangeAt(0), pa = n => { const el = n && (n.nodeType === 1 ? n : n.parentElement); return el && el.closest ? el.closest('[data-p]') : null; };
    const a = pa(r.startContainer), b = pa(r.endContainer); if (!a) return;
    const end = a === b ? [r.endContainer, r.endOffset] : [a, a.childNodes.length];
    const off = (node, o) => { const rr = document.createRange(); rr.selectNodeContents(a); rr.setEnd(node, o); return rr.toString().length; };
    const txt = a.textContent; let st = off(r.startContainer, r.startOffset), en = off(end[0], end[1]);
    while (st < en && /\s/.test(txt[st])) st++; while (en > st && /\s/.test(txt[en - 1])) en--;
    if (en - st < 2) return;
    this.setState({ sel: { pid: a.getAttribute('data-p'), s: st, e: en, text: txt.slice(st, en) } });
  }
  clearSel() { try { window.getSelection().removeAllRanges(); } catch (e) {} if (this.state.sel) this.setState({ sel: null }); }
  saveHl(hl) { this.sv(this.key('hl'), hl); this.setState({ hl }); }
  addHl(color, note) {
    const S = this.state, sel = S.sel; if (!sel) return null;
    if (sel.hid) { const hl = S.hl.map(h => h.id === sel.hid ? { ...h, color: color || h.color, note: note != null ? note : h.note } : h); this.saveHl(hl); this.clearSel(); return sel.hid; }
    const ch = +sel.pid.split('-')[0], id = 'h' + Date.now();
    const hl = S.hl.filter(h => !(h.pid === sel.pid && h.s < sel.e && h.e > sel.s)).concat([{ id, pid: sel.pid, ch, s: sel.s, e: sel.e, text: sel.text, color: color || 'y', note: note || '', t: Date.now() }]);
    this.saveHl(hl); this.clearSel(); return id;
  }
  segsFor(raw, pid, speaking) {
    const body = this.body(raw), pieces = []; let pos = 0, m; const re = /\[\[([^\]]+)\]\]/g, plainParts = [];
    let last = 0; while ((m = re.exec(body))) { if (m.index > last) plainParts.push({ t: body.slice(last, m.index) }); plainParts.push({ t: m[1], ref: m[1] }); last = m.index + m[0].length; }
    if (last < body.length) plainParts.push({ t: body.slice(last) });
    plainParts.forEach(p => { pieces.push({ ...p, s: pos, e: pos + p.t.length }); pos += p.t.length; });
    const hls = this.state.hl.filter(h => h.pid === pid), cuts = new Set([0, pos]);
    pieces.forEach(p => { cuts.add(p.s); cuts.add(p.e); }); hls.forEach(h => { cuts.add(Math.max(0, h.s)); cuts.add(Math.min(pos, h.e)); });
    const pts = [...cuts].sort((x, y) => x - y), full = pieces.map(p => p.t).join(''), out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1]; if (b <= a) continue;
      const pc = pieces.find(p => p.s <= a && p.e >= b), h = hls.find(x => x.s <= a && x.e >= b);
      const ref = pc && pc.ref;
      out.push({ t: full.slice(a, b), bg: h ? `color-mix(in srgb, ${this.HL[h.color][0]} 55%, transparent)` : 'transparent', color: ref ? 'var(--color-accent-700)' : 'inherit', ul: ref ? 'underline dotted' : 'none', cur: ref || h ? 'pointer' : 'auto',
        tap: ref ? (e => { e.stopPropagation(); this.openVerse(ref); }) : h ? (e => { const s = window.getSelection(); if (s && !s.isCollapsed) return; e.stopPropagation(); this.setState({ sel: { hid: h.id, pid, s: h.s, e: h.e, text: h.text, color: h.color } }); }) : undefined });
    }
    return out;
  }
  async openVerse(ref) {
    this.setState({ sheet: 'verse', verse: { ref, verses: [], loading: true } });
    const done = v => { if (this.state.verse && this.state.verse.ref === ref) this.setState({ verse: { ref, ...v } }); };
    try {
      let out;
      if (this.lang() !== 'en' && window.GRAi18n) out = await window.GRAi18n.bible(ref, this.lang());
      else {
        const r = await fetch('https://bible-api.com/' + encodeURIComponent(ref.replace(/\./g, '').trim()) + '?translation=kjv'); if (!r.ok) throw 0;
        const j = await r.json(); out = (j.verses || []).map(v => ({ n: v.verse, text: String(v.text).replace(/\s+/g, ' ').trim() }));
      }
      if (!out || !out.length) throw 0; done({ verses: out });
    } catch (e) { done({ verses: [], err: navigator.onLine === false ? 'You’re offline. Connect to the internet to read this passage.' : 'Couldn’t load this passage. Try again later.' }); }
  }
  toggleBm() {
    const S = this.state, B = S.book; if (!B) return;
    const has = S.bm.some(b => b.ch === S.ch);
    let bm;
    if (has) { bm = S.bm.filter(b => b.ch !== S.ch); this.toast('Bookmark removed'); }
    else { const pid = this.topPara() || `${S.ch}-0`, i = +pid.split('-')[1], raw = B.chapters[S.ch].paras[i] || ''; bm = S.bm.concat([{ id: 'b' + Date.now(), ch: S.ch, pid, text: this.plain(raw).slice(0, 140), t: Date.now() }]); this.toast('Page bookmarked'); }
    this.sv(this.key('bm'), bm); this.setState({ bm });
  }
  toast(m) { this.setState({ toast: this.T(m) }); clearTimeout(this._tt); this._tt = setTimeout(() => this.setState({ toast: null }), 1800); }
  setSet(k, v) { const set = { ...this.state.set, [k]: v }; this.sv('gra-nr-settings', set); this.setState({ set }); }
  voice() { const sy = window.speechSynthesis; if (!sy) return null; const re = new RegExp('^' + this.lang(), 'i'); const vs = sy.getVoices().filter(v => re.test(v.lang)); return vs.find(v => /natural|enhanced|premium|google/i.test(v.name)) || vs[0] || null; }
  listen(fromPid) {
    if (this.state.view !== 'text') return this.setState({ view: 'text' }, () => { window.scrollTo({ top: 0, behavior: 'instant' }); setTimeout(() => this.listen(), 80); });
    const sy = window.speechSynthesis, B = this.state.book; if (!sy || !B) return;
    const ps = B.chapters[this.state.ch].paras, start = fromPid ? +fromPid.split('-')[1] : +((this.topPara() || '0-0').split('-')[1]);
    this.ttsStop(); this.setState({ sheet: null, tts: { i: start, playing: true } });
    const tok = this._tok = (this._tok || 0) + 1;
    const head = start === 0 ? `${this.T('Chapter')} ${this.state.ch + 1}. ${B.chapters[this.state.ch].title}.` : null;
    const speak = i => {
      if (tok !== this._tok) return;
      if (i === -1) { const u = new SpeechSynthesisUtterance(head), v = this.voice(); u.rate = this.state.set.rate || 1; u.lang = v ? v.lang : (window.GRAi18n ? window.GRAi18n.tts : 'en-US'); if (v) u.voice = v; u.onend = () => setTimeout(() => speak(0), 350); u.onerror = e => { if (e.error !== 'interrupted' && e.error !== 'canceled') speak(0); }; window.scrollTo({ top: 0, behavior: 'instant' }); sy.speak(u); return; }
      if (i >= ps.length) { this.markDone(this.state.ch); this.setState({ tts: null }); return; }
      this.setState({ tts: { i, playing: true } }); this.jumpTo(`${this.state.ch}-${i}`);
      const u = new SpeechSynthesisUtterance(this.plain(ps[i])), v = this.voice(); u.rate = this.state.set.rate || 1; u.lang = v ? v.lang : (window.GRAi18n ? window.GRAi18n.tts : 'en-US'); if (v) u.voice = v;
      u.onend = () => speak(i + 1); u.onerror = e => { if (e.error !== 'interrupted' && e.error !== 'canceled') speak(i + 1); };
      sy.speak(u);
    };
    sy.cancel(); speak(head ? -1 : start);
  }
  ttsStop() { this._tok = (this._tok || 0) + 1; try { window.speechSynthesis.cancel(); } catch (e) {} clearTimeout(this._npSl); if (this.state && (this.state.tts || this.state.npOpen || this.state.npSleep)) this.setState({ tts: null, npOpen: false, npSleep: null }); }
  ttsPause() { this._tok = (this._tok || 0) + 1; try { window.speechSynthesis.cancel(); } catch (e) {} if (this.state.tts) this.setState({ tts: { ...this.state.tts, playing: false } }); }
  npVals() {
    const S = this.state, B = S.book, st = S.set, t = S.tts, ch = B ? B.chapters[S.ch] : null, ps = ch ? ch.paras.map(p => this.plain(p)) : [], i = t ? Math.min(ps.length - 1, t.i) : 0, cv = (B && B.cover) || {};
    return this.npBuild({ on: !!t && !!ps.length, items: ps, i, playing: !!t && t.playing !== false, unit: 'paragraph',
      toggle: () => (t && t.playing !== false ? this.ttsPause() : this.listen(`${S.ch}-${i}`)), prev: () => this.listen(`${S.ch}-${Math.max(0, i - 1)}`), next: () => this.listen(`${S.ch}-${Math.min(ps.length - 1, i + 1)}`), stop: () => this.ttsStop(),
      rate: st.rate, rateNext: () => { const r = [0.8, 1, 1.2, 1.4], n = r[(r.indexOf(st.rate || 1) + 1) % r.length]; this.setSet('rate', n); if (t && t.playing !== false) setTimeout(() => this.listen(`${S.ch}-${i}`), 30); },
      sleepLabel: S.npSleep ? (S.npSleep.m === 'end' ? 'End of chapter' : S.npSleep.m + ' min') : '', sleepNext: () => this.npSleep('chapter', () => this.ttsStop()), toast: m => this.toast(m),
      ref: ch ? `${this.T('Chapter')} ${S.ch + 1} · ${ch.title}` : '', title: B ? B.title : '', sub: B ? B.author || '' : '', voice: (this.voice() || {}).name || '', text: ps[i] || '',
      coverBg: cv.bg || 'var(--color-accent)', coverInk: cv.ink || '#fff', coverTitle: B ? B.title : '', mark: '' });
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
  renderVals() {
    const S = this.state, B = S.book, st = S.set, N = B ? B.chapters.length : 0, ch = B ? B.chapters[S.ch] : null;
    const onBg = 'var(--color-accent-100)', seg = a => ({ on: a ? 'true' : 'false', bg: a ? onBg : 'transparent', color: a ? 'var(--color-accent-800)' : 'var(--color-text)' });
    const backHref = this.inSite() ? (location.protocol === 'file:' ? '../index.html#library' : '../#library') : 'GRA Prayer Library.dc.html#library';
    const sel = S.sel, selHl = sel && sel.hid ? S.hl.find(h => h.id === sel.hid) : null;
    const paras = ch ? ch.paras.map((raw, i) => {
      const id = `${S.ch}-${i}`, k = this.kind(raw), speaking = S.tts && S.tts.i === i, fl = S.flash === id;
      const base = k === 'q' ? 'margin:0 0 1.4em;padding:2px 0 2px 18px;border-left:2px solid var(--color-accent);font-style:italic;color:var(--color-neutral-800)' : k === 'h' ? 'margin:1.8em 0 .6em;font-family:var(--font-heading);font-size:1.2em;line-height:1.3;font-weight:600' : 'margin:0 0 1.1em;text-wrap:pretty';
      return { id, dom: `c${S.ch + 1}-p${i + 1}`, css: `${base};position:relative;border-radius:4px;transition:background .4s;background:${speaking || fl ? 'color-mix(in srgb, var(--color-accent) 14%, transparent)' : 'transparent'}`, segs: this.segsFor(raw, id, speaking) };
    }) : [];
    const minsLeft = B ? Math.max(1, Math.round(this.words(S.ch) * (1 - S.ratio) / 220)) : 0;
    const hasBm = B ? S.bm.some(b => b.ch === S.ch) : false;
    const toc = B ? B.chapters.map((c, i) => ({ n: String(i + 1), title: c.title, cur: i === S.ch ? 'true' : 'false', w: i === S.ch ? '600' : '400', done: !!S.done[i], meta: `${Math.max(1, Math.round(this.words(i) / 220))} min${i === S.ch ? ' · ' + this.T('Reading now') : ''}`, go: () => this.goCh(i), open: () => this.show('open', i, 1) })) : [];
    const notes = B ? [...S.hl.map(h => ({ k: h.t, sw: this.HL[h.color][0], where: `${this.T('Chapter')} ${h.ch + 1} · ${B.chapters[h.ch].title}`, text: h.text, note: h.note, hasNote: !!h.note, go: () => this.goCh(h.ch, h.pid) })),
      ...[...new Set(Object.keys(this.inkData || {}).filter(k => (this.inkData[k] || []).length).map(k => k.split('-')[0]))].filter(c => B.chapters[c]).map(c => ({ k: 0, sw: 'var(--color-accent)', where: `${this.T('Pen notes')} · ${this.T('Chapter')} ${+c + 1}`, text: B.chapters[c].title, note: '', hasNote: false, go: () => this.goCh(+c) })),
      ...S.bm.map(b => ({ k: b.t, sw: 'var(--color-text)', where: `${this.T('Bookmark')} · ${this.T('Chapter')} ${b.ch + 1}`, text: b.text, note: '', hasNote: false, go: () => this.goCh(b.ch, b.pid) }))].sort((a, b) => a.k - b.k) : [];
    const q = S.q.trim().toLowerCase(), results = [];
    if (B && S.sheet === 'search' && q.length > 1) B.chapters.forEach((c, ci) => c.paras.forEach((raw, pi) => { const t = this.plain(raw), j = t.toLowerCase().indexOf(q); if (j < 0 || results.length >= 50) return; const a = Math.max(0, j - 50); results.push({ where: `${this.T('Chapter')} ${ci + 1} · ${c.title}`, pre: (a ? '…' : '') + t.slice(a, j), hit: t.slice(j, j + q.length), post: t.slice(j + q.length, j + q.length + 80) + '…', go: () => this.goCh(ci, `${ci}-${pi}`) }); }));
    const th = this.theme();
    const aaGroups = [
      { label: 'Text size', opts: [[16, 14], [18, 16], [20, 18], [23, 21], [26, 24]].map(([v, fs]) => ({ label: 'A', fs: fs + 'px', ff: 'inherit', aria: v + 'px', ...seg(st.size === v), pick: () => this.setSet('size', v) })) },
      { label: 'Reading font', opts: [['book', 'Book', 'var(--font-body)'], ['clean', 'Clean', 'system-ui, sans-serif'], ['easy', 'Easy read', '"Atkinson Hyperlegible", system-ui, sans-serif']].map(([v, label, ff]) => ({ label, fs: '14px', ff, aria: label, ...seg(st.font === v), pick: () => this.setSet('font', v) })) },
      { label: 'Line spacing', opts: [[1.5, 'Compact'], [1.7, 'Normal'], [1.95, 'Relaxed']].map(([v, label]) => ({ label, fs: '14px', ff: 'inherit', aria: label, ...seg(st.lh === v), pick: () => this.setSet('lh', v) })) },
      { label: 'Margins', opts: [['narrow', 'Narrow'], ['normal', 'Normal'], ['wide', 'Wide']].map(([v, label]) => ({ label, fs: '14px', ff: 'inherit', aria: label, ...seg(st.width === v), pick: () => this.setSet('width', v) })) },
      { label: 'Page', opts: [['light', 'Light'], ['sepia', 'Sepia'], ['dark', 'Dark'], ['auto', 'Auto']].map(([v, label]) => ({ label, fs: '14px', ff: 'inherit', aria: label, ...seg(th === v), pick: () => this.setTheme(v) })) }
    ];
    const titles = { contents: B ? B.title : '', search: 'Search', aa: 'Reading settings', note: 'Note', verse: S.verse ? S.verse.ref : '' };
    const rates = [0.8, 1, 1.2, 1.4];
    return {
      backHref, bookTitle: B ? B.title : '', bookKicker: B ? B.kicker : '', bookSub: B ? B.subtitle : '', bookAuthor: B ? B.author : '',
      loading: !B && !S.err, hasErr: S.err, ready: !!B, isTitlePage: !!B && S.view === 'title', isTocPage: !!B && S.view === 'toc', isOpenPage: !!B && S.view === 'open', isTextPage: !!B && S.view === 'text', mainRef: this.mainRef, pageNext: () => this.page(1),
      chNum: B ? String(S.ch + 1) : '', chMins: B ? `${Math.max(1, Math.round(this.words(S.ch) / 220))} min read` : '', hasKeyVerse: !!(ch && ch.paras[0] && ch.paras[0].startsWith('> ')), keyVerse: ch && ch.paras[0] && ch.paras[0].startsWith('> ') ? this.plain(ch.paras[0]) : '',
      readFont: ({ clean: 'system-ui, -apple-system, "Segoe UI", sans-serif', easy: '"Atkinson Hyperlegible", system-ui, sans-serif' })[st.font] || 'var(--font-body)', readSize: (st.size || 19) + 'px', readLh: String(st.lh || 1.7), colW: ({ narrow: '560px', wide: '820px' })[st.width] || '680px',
      chKicker: B ? `${this.T('Chapter')} ${S.ch + 1}` : '', chTitle: ch ? ch.title : '', paras,
      hasPrev: !!B && S.ch > 0, hasNext: !!B && S.ch < N - 1, isLast: !!B && S.ch === N - 1, nextLabel: B && S.ch < N - 1 ? `${this.T('Next')}: ${B.chapters[S.ch + 1].title}` : '',
      goPrev: () => this.show('open', S.ch - 1, -1), goNext: () => this.show('open', S.ch + 1, 1), finish: () => { this.markDone(S.ch); this.savePos(); },
      progW: Math.round(S.prog * 1000) / 10 + '%',
      footA: B ? `${this.T('Chapter')} ${S.ch + 1} / ${N}` : '', footB: B ? (S.ratio > 0.97 ? this.T('End of chapter') : `${minsLeft} min ${this.T('left in chapter')}`) : '', footC: Math.round(S.prog * 100) + '%',
      bmOn: hasBm ? 'true' : 'false', bmFill: hasBm ? 'currentColor' : 'none', bmColor: hasBm ? 'var(--color-accent-700)' : 'var(--color-text)', bmLabel: hasBm ? 'Remove bookmark' : 'Bookmark this page', toggleBm: () => this.toggleBm(),
      openContents: () => this.setState({ sheet: 'contents' }), openSearch: () => this.setState({ sheet: 'search' }, () => setTimeout(() => this.qRef.current && this.qRef.current.focus(), 60)), openAa: () => this.setState({ sheet: 'aa' }),
      sheetOpen: !!S.sheet, sheet: S.sheet || '', sheetTitle: titles[S.sheet] || '', closeSheet: () => this.setState({ sheet: null }),
      isContents: S.sheet === 'contents', isSearch: S.sheet === 'search', isAa: S.sheet === 'aa', isNote: S.sheet === 'note', isVerse: S.sheet === 'verse',
      tocTabs: [['ch', 'Chapters'], ['notes', 'Notes & bookmarks']].map(([k, label]) => ({ label, ...seg(S.tocTab === k), pick: () => this.setState({ tocTab: k }) })),
      tocIsCh: S.tocTab === 'ch', tocIsNotes: S.tocTab === 'notes', toc, notes, notesEmpty: !notes.length,
      q: S.q, qRef: this.qRef, onQ: e => this.setState({ q: e.target.value }), results, qLabel: q.length < 2 ? this.T('Search words or a phrase in this book.') : `${results.length} ${this.T(results.length === 1 ? 'result' : 'results')}`,
      aaGroups, ttsOk: typeof window !== 'undefined' && 'speechSynthesis' in window, listen: () => this.listen(),
      hasSel: !!sel && !S.sheet, selIsHl: !!selHl,
      hlColors: Object.entries(this.HL).map(([k, [sw, label]]) => ({ sw, label, on: selHl && selHl.color === k ? 'true' : 'false', ring: selHl && selHl.color === k ? '0 0 0 2px var(--color-surface), 0 0 0 4px var(--color-text)' : 'none', pick: () => this.addHl(k) })),
      selNote: () => { const t = sel ? sel.text : '', n = selHl ? selHl.note : ''; this._noteSel = sel; this.setState({ sheet: 'note', noteTxt: n || '', noteQuote: t }); },
      selCopy: () => { const t = sel ? sel.text : ''; if (navigator.clipboard) navigator.clipboard.writeText(`“${t}” — ${B ? B.title : ''}`).then(() => this.toast('Copied'), () => {}); this.clearSel(); },
      selRemove: () => { if (!selHl) return; this.saveHl(S.hl.filter(h => h.id !== selHl.id)); this.clearSel(); }, selClose: () => this.clearSel(),
      noteTxt: S.noteTxt, noteQuote: S.noteQuote || '', onNote: e => this.setState({ noteTxt: e.target.value }),
      saveNote: () => { if (this._noteSel) this.setState({ sel: this._noteSel }, () => { this.addHl(selHl ? null : 'y', S.noteTxt.trim()); this.setState({ sheet: null }); this.toast('Note saved'); }); },
      verseVersion: this.lang() === 'en' ? 'King James Version' : (window.GRAi18n ? window.GRAi18n.bibleLabel : ''), verseLoading: !!(S.verse && S.verse.loading), verseHasErr: !!(S.verse && S.verse.err), verseErr: S.verse && S.verse.err || '', verses: S.verse ? S.verse.verses || [] : [],
      hasTts: !!S.tts, ttsLabel: S.tts ? `${this.T('Reading aloud')} · ${S.tts.i + 1}/${ch ? ch.paras.length : 0}` : '', ttsPlayLabel: 'Stop', ttsIcon: 'M7 5h3v14H7zM14 5h3v14h-3z',
      ttsToggle: () => this.ttsStop(), ttsStop: () => this.ttsStop(), rateLabel: (st.rate || 1) + '×', ttsRate: () => { const n = rates[(rates.indexOf(st.rate || 1) + 1) % rates.length]; this.setSet('rate', n); if (S.tts) setTimeout(() => this.listen(`${S.ch}-${S.tts.i}`), 30); },
      ...this.npVals(), hasToast: !!S.toast, toast: S.toast || '',
      listenTop: () => { if (!S.tts) this.listen(); this.setState({ npOpen: true }); }, listenLabel: S.tts ? 'Playing' : 'Listen', tabListen: S.tts ? 'var(--color-accent-700)' : 'var(--color-neutral-700)',
      tabContents: S.sheet === 'contents' && S.tocTab === 'ch' ? 'var(--color-accent-700)' : 'var(--color-neutral-700)', tabSearch: S.sheet === 'search' ? 'var(--color-accent-700)' : 'var(--color-neutral-700)', tabSaved: S.sheet === 'contents' && S.tocTab === 'notes' ? 'var(--color-accent-700)' : 'var(--color-neutral-700)',
      openSaved: () => this.setState({ sheet: 'contents', tocTab: 'notes' }),
      inkOn: S.ink, notInk: !S.ink,
      startInk: () => { this.clearSel(); this.ttsStop(); this.setState({ ink: true, sheet: null }, () => this.applyTouch()); this.toast(S.finger ? 'Finger draws · two fingers scroll' : 'Pencil draws · fingers scroll'); },
      stopInk: () => this.setState({ ink: false }, () => this.applyTouch()),
      pickPen: () => this.setState({ tool: 'pen' }), pickHl: () => this.setState({ tool: 'hl' }), pickEraser: () => this.setState({ tool: 'eraser' }),
      penBg: seg(S.tool === 'pen').bg, penColor: seg(S.tool === 'pen').color, hlBg: seg(S.tool === 'hl').bg, hlColor: seg(S.tool === 'hl').color, erBg: seg(S.tool === 'eraser').bg, erColor: seg(S.tool === 'eraser').color,
      inkColors: (S.tool === 'hl' ? this.IHL : this.PEN).map(([k, label, css]) => ({ label, css, ring: (S.tool === 'hl' ? S.hlColor : S.penColor) === k ? 4 : 0, pick: () => this.setState(S.tool === 'hl' ? { hlColor: k } : { penColor: k, tool: 'pen' }) })),
      toggleFinger: () => { const f = !S.finger; this.setState({ finger: f }, () => this.applyTouch()); this.toast(f ? 'Finger draws · two fingers scroll' : 'Fingers scroll · Pencil draws'); },
      fingerBg: seg(S.finger).bg, fingerColor: seg(S.finger).color,
      inkUndo: () => this.inkUndoFn(), undoOp: S.inkN > 0 || (this.undo || []).length ? 1 : 0.35, inkRedo: () => this.inkRedoFn(), redoOp: (this.redo || []).length ? 1 : 0.35,
      penSizes: [['fine', 'Fine', '5px'], ['med', 'Medium', '8px'], ['bold', 'Bold', '12px']].map(([k, label, d]) => { const on = (S.penSize || 'med') === k; return { label, d, on: on ? 'true' : 'false', bg: on ? onBg : 'transparent', pick: () => { this.setState({ penSize: k, tool: 'pen' }); this.sv('gra-nr-penSize', k); } }; })
    };
  }
}
