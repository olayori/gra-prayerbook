class Component extends DCLogic {
  NS = 'http://www.w3.org/2000/svg';
  HASH = 'e6a0edc6786aea7bad85cc9fec671bfa84763bd161c450a579df4b1087b5d270';
  WORDS = ['One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve'];
  PEN = [['ink','Ink','var(--color-text)'],['gold','Gold','oklch(0.64 0.12 75)'],['red','Red','oklch(0.55 0.17 28)'],['blue','Blue','oklch(0.5 0.13 255)'],['green','Green','oklch(0.52 0.11 150)'],['purple','Purple','oklch(0.48 0.14 305)']];
  HL = [['hy','Yellow','oklch(0.9 0.16 98)'],['hg','Green','oklch(0.86 0.13 150)'],['hb','Blue','oklch(0.84 0.09 230)'],['hp','Pink','oklch(0.82 0.11 350)'],['ho','Orange','oklch(0.83 0.13 65)']];
  INK = Object.fromEntries([...this.PEN, ...this.HL].map(x => [x[0], x[2]]));
  DAYN = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  C = 43.98;
  state = { data: null, q: '', prayed: {}, fav: {}, bm: {}, plan: null, settings: { size: 17, theme: 'auto', verses: true },
    locked: true, pw: '', pwError: false, sheet: null, savedTab: 'bm', searchOpen: false, resume: null, toast: null,
    ink: false, tool: 'pen', penColor: 'ink', hlColor: 'hy', finger: false, inkN: 0, share: null, draft: null, planEdit: false, hist: {}, sTheme: null, isAdmin: false, sessRead: false, exporting: false, installAsk: false, canInstall: false };
  THEMES = [['Healing', ['heal', 'sick', 'disease', 'infirmit', 'health', 'cure']], ['Family', ['family', 'household', 'children', 'husband', 'wife', 'marriage', 'home']],
    ['Provision', ['provi', 'financ', 'money', 'prosper', 'supply', 'wealth', 'debt', 'abundan']], ['Protection', ['protect', 'shield', 'safe', 'covering', 'preserv', 'hedge']],
    ['Deliverance', ['deliver', 'bondage', 'captiv', 'set free', 'chains', 'yoke']], ['Guidance', ['guid', 'direct', 'wisdom', 'counsel', 'understanding']],
    ['Victory', ['victor', 'overcom', 'triumph', 'conquer']], ['Forgiveness', ['forgiv', 'mercy', 'pardon', 'cleans', 'repent']],
    ['Strength', ['strength', 'strong', 'power', 'might']], ['Peace', ['peace', 'rest', 'anxi', 'fear', 'worry']],
    ['Favour', ['favour', 'favor', 'grace']], ['Breakthrough', ['breakthrough', 'open door', 'doors']]];

  BOOKS = {
    covenant: { key: 'covenant', kp: 'gra-covenant-', title: 'Book of Covenant Prayers', secWord: 'Section', itemsLabel: 'Prayers', plan: false, gplan: true, versions: true, usage: true, table: 'book_state', res: 'prayersData', file: 'prayers.json' },
    jcfp: { key: 'jcfp', kp: 'gra-jcfp-', title: 'Jesus Chosen Fast and Prayer Prayer Manual', secWord: 'Section', itemsLabel: 'Prayer', plan: false, gplan: true, versions: true, verTable: 'lib_versions', usage: false, table: 'library_state', res: 'jcfpData', file: 'jcfp.json' },
    weekly: { key: 'weekly', kp: 'gra-weekly-', title: 'GRA Weekly Kingdom Prayers', secWord: 'Week', itemsLabel: 'Prayers', plan: false, versions: false, usage: false, table: 'library_state' }
  };
  get B() {
    if (!this._bk) { const p = location.pathname, m = /\/(covenant|jcfp|weekly)\/?(index\.html)?$/.exec(p); const qb = new URLSearchParams(location.search).get('book'); const k = m ? m[1] : (qb || (this.props && this.props.book) || 'covenant'); this._bk = this.BOOKS[k] || this.BOOKS.covenant; }
    return this._bk;
  }
  libHref(h) { return this.inLib() ? (location.protocol === 'file:' ? '../index.html' : '../') + (h || '') : 'GRA Prayer Library.dc.html' + (h || ''); }
  gpTogglePart(pn) {
    const t = this.gpDk(); let plan = this.gpLoad() || { items: [], weekly: { on: false, wday: 1 }, perDay: 1, wdays: [true, true, true, true, true, true, true], start: t, days: [], units: [], today: null };
    const k = this.B.key, has = plan.items.some(x => x.book === k && x.part === pn);
    plan.items = has ? plan.items.filter(x => !(x.book === k && x.part === pn)) : [...plan.items, { book: k, part: pn }];
    const units = (plan.units || []).filter(u => !(u.book === k && u.p === pn));
    plan.units = this.gpSort(has ? units : [...units, ...this.gpUnits(k, this.state.data, pn)]);
    plan.today = null; this.gpSave(plan); plan = this.gpEnsure(plan);
    this.setState({ gp: plan }); this.showToast(has ? 'Removed from your plan' : 'Added to your plan');
  }
  gpAfterPray() { const was = this.gpLoad(); if (!was) return; const p = this.gpEnsure(was); if (p && p._justDone) this.showToast('Today’s plan is done'); this.setState({ gp: p }); }

  gpLoad() { try { return JSON.parse(localStorage.getItem('gra-library-plan')) || null; } catch (e) { return null; } }
  gpSave(p) { try { if (p) localStorage.setItem('gra-library-plan', JSON.stringify(p)); else localStorage.removeItem('gra-library-plan'); } catch (e) {} }
  gpDk(d) { d = d || new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  gpUnits(book, data, pn) {
    const P = (data || [])[pn - 1]; if (!P) return [];
    if (book === 'jcfp') { const ids = []; P.sections.forEach((s, si) => { if (s.kind === 'list' || (s.prayers || []).some(x => x.link === 'weekly')) return; (s.prayers || []).forEach((_, i) => ids.push(`s-${pn}-${si + 1}-${i + 1}`)); });
      return ids.length ? [{ u: `jcfp:part-${pn}`, book, p: pn, id: `part-${pn}`, label: P.label || P.title, ids }] : []; }
    return P.sections.map((s, si) => ({ u: `${book}:s-${pn}-${si + 1}`, book, p: pn, id: `s-${pn}-${si + 1}`, label: `${pn}.${si + 1} · ${s.title}`, ids: (s.prayers || []).map((_, i) => `s-${pn}-${si + 1}-${i + 1}`) }));
  }
  gpSort(units) { const o = { covenant: 0, jcfp: 1 }; return units.slice().sort((a, b) => (o[a.book] - o[b.book]) || (a.p - b.p) || a.u.localeCompare(b.u, undefined, { numeric: true })); }
  gpDone(u) {
    const t = this.gpDk(), rd = k => { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } };
    if (u.weekly) return ((rd('gra-weekly-hist')[t]) || []).length > 0 || ((rd('gra-covenant-hist')[t]) || []).some(x => String(x).startsWith('w-'));
    const pr = rd(`gra-${u.book}-prayed`); return u.ids.length > 0 && u.ids.every(x => pr[x]);
  }
  gpEnsure(plan) {
    if (!plan) return plan; const t = this.gpDk(), wd = new Date().getDay(); let ch = false;
    if (!plan.today || plan.today.d !== t) {
      const ids = plan.wdays[wd] ? (plan.units || []).filter(u => !this.gpDone(u)).slice(0, plan.perDay || 1).map(u => u.u) : [];
      if (plan.weekly && plan.weekly.on && plan.weekly.wday === wd) ids.push('weekly');
      plan = { ...plan, today: { d: t, ids } }; ch = true;
    }
    const tu = this.gpToday(plan);
    if (tu.length && tu.every(u => this.gpDone(u)) && !(plan.days || []).includes(t)) { plan = { ...plan, days: [...(plan.days || []), t] }; ch = true; plan._justDone = true; }
    if (ch) { const { _justDone, ...save } = plan; this.gpSave(save); }
    return plan;
  }
  gpToday(plan) { if (!plan || !plan.today) return []; const by = {}; (plan.units || []).forEach(u => { by[u.u] = u; }); return plan.today.ids.map(id => id === 'weekly' ? { u: 'weekly', book: 'weekly', weekly: true, label: 'Weekly Kingdom Prayers', ids: [] } : by[id]).filter(Boolean); }

  inLib() { return /\/(covenant|jcfp|weekly)\/?(index\.html)?$/.test(location.pathname); }
  SHARED_KEYS = ['member', 'pendingCode', 'settings', 'installSeen', 'uq', 'weekly', 'unlocked'];
  kp(k) { return (this.SHARED_KEYS.includes(k) ? 'gra-covenant-' : this.B.kp) + k; }
  ld(k, d) { try { const v = localStorage.getItem(this.kp(k)); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  sv(k, v) { try { localStorage.setItem(this.kp(k), JSON.stringify(v)); if (!this._applying && this.SYNC_KEYS.includes(k)) this.markDirty(); return true; } catch (e) { return false; } }
  SB_URL = 'https://sjcosqxtgllfwldhnoax.supabase.co';
  SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqY29zcXh0Z2xsZndsZGhub2F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4NTQ5MjYsImV4cCI6MjEwNzQzMDkyNn0.HQsm-M6Ut1RHoXtDHEIjiCvPQq-P3irRh0uHgQ3lFx0';
  SB_PROVIDERS = [];
  SYNC_KEYS = ['prayed', 'fav', 'bookmarks', 'plan', 'ink', 'hist'];
  sbOn() { return !!(this.SB_URL && this.SB_KEY); }
  here() { return location.origin + location.pathname; }
  loadSb() {
    if (this._sbp) return this._sbp;
    this._sbp = new Promise((res, rej) => {
      const go = () => { try { this.sb = window.supabase.createClient(this.SB_URL, this.SB_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce', storageKey: 'gra-covenant-auth' } }); res(this.sb); } catch (e) { rej(e); } };
      if (window.supabase && window.supabase.createClient) return go();
      const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
      s.onload = go; s.onerror = () => { this._sbp = null; s.remove(); rej(new Error('offline')); }; document.head.appendChild(s);
    });
    return this._sbp;
  }
  async initAuth() {
    let sb; try { sb = await this.loadSb(); } catch (e) { this.setState({ sync: 'offline' }); return; }
    sb.auth.onAuthStateChange((ev, session) => {
      if (ev === 'PASSWORD_RECOVERY') { this.setState({ locked: true, aMode: 'newpw', aErr: '', aMsg: '', aPw: '' }); return; }
      setTimeout(() => this.onSession(session, ev), 0);
    });
    const { data } = await sb.auth.getSession(); this.onSession(data.session, 'INIT');
    if (/[?&]code=/.test(location.search)) { try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) {} }
  }
  async onSession(session, ev) {
    if (this.state.aMode === 'newpw' && ev !== 'USER_UPDATED') return;
    const u = session && session.user;
    if (!u) { this.user = null; if (ev === 'INIT' || ev === 'SIGNED_OUT') this.setState({ locked: !this.isGuest(), aBusy: false, sync: null }); return; }
    if (this.user && this.user.id === u.id && !this.state.locked) return;
    this.user = u;
    let member = this.ld('member', null) === u.id;
    if (!member) {
      const { data } = await this.sb.from('members').select('user_id').eq('user_id', u.id).maybeSingle();
      member = !!data;
      const pend = this.ld('pendingCode', null);
      if (!member && pend) { const r = await this.sb.rpc('redeem_code', { code: pend }); member = r.data === true; }
      try { localStorage.removeItem('gra-covenant-pendingCode'); } catch (e) {}
    }
    if (!member) { this.setState({ locked: true, aMode: 'code', aErr: '', aMsg: '', aBusy: false }); return; }
    const prev = this.ld('member', null);
    this.sv('member', u.id);
    this.setState({ locked: false, aBusy: false, aPw: '', aCode: '', aMsg: '', aErr: '', acctEmail: u.email || '' });
    this.sb.from('admins').select('role').eq('user_id', u.id).maybeSingle().then(r => this.setState({ isAdmin: !!(r && r.data && ['admin', 'editor'].includes(r.data.role)) }), () => {});
    if (prev !== u.id) this.sv('syncMeta', null);
    this.pull();
  }
  isGuest() { try { return localStorage.getItem('gra-covenant-unlocked') === this.HASH; } catch (e) { return false; } }
  aErrText(e) {
    const m = (e && e.message) || '';
    if (/invalid login/i.test(m)) return 'That email or password isn’t right.';
    if (/not confirmed/i.test(m)) return 'Please confirm your email first. Check your inbox for the link.';
    if (/already registered|already been registered/i.test(m)) return 'An account with that email already exists. Sign in instead.';
    if (/fetch|network/i.test(m)) return 'You appear to be offline. Connect and try again.';
    return m || 'Something went wrong. Please try again.';
  }
  async codeOk(c) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode((c || '').trim())); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('') === this.HASH; }
  async authSubmit(e) {
    e.preventDefault(); const S = this.state, m = S.aMode || 'in', email = (S.aEmail || '').trim(), pw = S.aPw || '';
    this.setState({ aBusy: true, aErr: '', aMsg: '' });
    const fail = t => this.setState({ aBusy: false, aErr: t });
    let sb; try { sb = await this.loadSb(); } catch (x) { return fail('You appear to be offline. Connect and try again.'); }
    try {
      if (m === 'in') { if (!email || !pw) return fail('Enter your email and password.'); const { error } = await sb.auth.signInWithPassword({ email, password: pw }); if (error) return fail(this.aErrText(error)); return; }
      if (m === 'up') {
        if (!email) return fail('Enter your email.'); if (pw.length < 8) return fail('Use a password of at least 8 characters.');
        if (!(await this.codeOk(S.aCode))) return fail('That registration code isn’t right.');
        this.sv('pendingCode', S.aCode.trim());
        const { data, error } = await sb.auth.signUp({ email, password: pw, options: { data: { name: (S.aName || '').trim() }, emailRedirectTo: this.here() } });
        if (error) return fail(this.aErrText(error));
        if (!data.session) this.setState({ aBusy: false, aMode: 'in', aPw: '', aMsg: `We sent a confirmation link to ${email}. Open it on this device to finish creating your account.` });
        return;
      }
      if (m === 'guest') {
        if (!(await this.codeOk(S.aCode))) return fail('That access code isn’t right.');
        try { localStorage.setItem('gra-covenant-unlocked', this.HASH); } catch (x) {}
        return this.setState({ locked: false, aBusy: false, aCode: '', aMode: 'in' });
      }
      if (m === 'code') { const { data, error } = await sb.rpc('redeem_code', { code: (S.aCode || '').trim() }); if (error) return fail(this.aErrText(error)); if (data !== true) return fail('That registration code isn’t right.'); this.user = null; const s = await sb.auth.getSession(); return this.onSession(s.data.session, 'CODE'); }
      if (m === 'reset') { if (!email) return fail('Enter your email.'); const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: this.here() }); if (error) return fail(this.aErrText(error)); return this.setState({ aBusy: false, aMsg: 'If that email has an account, a reset link is on its way.' }); }
      if (m === 'newpw') { if (pw.length < 8) return fail('Use a password of at least 8 characters.'); const { error } = await sb.auth.updateUser({ password: pw }); if (error) return fail(this.aErrText(error)); this.setState({ aMode: 'in' }); this.user = null; const s = await sb.auth.getSession(); return this.onSession(s.data.session, 'USER_UPDATED'); }
    } catch (x) { fail(this.aErrText(x)); }
  }
  async oauth(provider) {
    const S = this.state;
    if (S.aMode === 'up') { if (!(await this.codeOk(S.aCode))) return this.setState({ aErr: 'Enter the registration code first.' }); this.sv('pendingCode', S.aCode.trim()); }
    this.setState({ aBusy: true, aErr: '' });
    try { const sb = await this.loadSb(); const { error } = await sb.auth.signInWithOAuth({ provider, options: { redirectTo: this.here() } }); if (error) this.setState({ aBusy: false, aErr: this.aErrText(error) }); }
    catch (x) { this.setState({ aBusy: false, aErr: this.aErrText(x) }); }
  }
  markDirty() { if (!this.sbOn()) return; try { localStorage.setItem(this.kp('dirty'), '1'); } catch (e) {} if (this._pushing) { this._again = true; return; } clearTimeout(this._pt); this._pt = setTimeout(() => this.push(), 2500); }
  BUNDLE_V = 0;
  bookReady = new Promise(r => { this._bookRes = r; });
  layoutOf(data) { return data.map((p, pi) => ({ u: p.u || `part-${pi + 1}`, s: p.sections.map((s, si) => ({ u: s.u || `s-${pi + 1}-${si + 1}`, p: s.prayers.map((pr, i) => pr.u || `s-${pi + 1}-${si + 1}-${i + 1}`) })) })); }
  layMaps(lay) {
    const pu = {}, up = {}, su = {}, us = {}, partU = {}, upart = {};
    lay.forEach((p, pi) => { partU[pi + 1] = p.u; upart[p.u] = pi + 1; p.s.forEach((s, si) => { const sid = `s-${pi + 1}-${si + 1}`; su[sid] = s.u; us[s.u] = sid; s.p.forEach((u, i) => { const id = `${sid}-${i + 1}`; pu[id] = u; up[u] = id; }); }); });
    return { pu, up, su, us, partU, upart };
  }
  remapBlob(b, from, to) {
    if (!b) return b; const A = this.layMaps(from), B = this.layMaps(to);
    const P = k => k.startsWith('w-') ? k : B.up[A.pu[k]], S = k => k.startsWith('w-') ? k : B.us[A.su[k]], PT = n => B.upart[A.partU[n]];
    const keys = (o, f) => { const r = {}; Object.keys(o || {}).forEach(k => { const n = f(k); if (n) r[n] = o[k]; }); return r; };
    const hist = {}; Object.entries(b.hist || {}).forEach(([d, l]) => { const m = (l || []).map(P).filter(Boolean); if (m.length) hist[d] = m; });
    const ink = keys(b.ink, k => k === 'title' || k === 'contents' ? k : /^part-\d+$/.test(k) ? (PT(+k.slice(5)) ? `part-${PT(+k.slice(5))}` : null) : S(k));
    const plan = b.plan ? { ...b.plan, today: null } : null;
    if (plan && Array.isArray(plan.parts)) { plan.parts = [...new Set(plan.parts.map(PT).filter(Boolean))].sort((x, y) => x - y); if (plan.scope === 'parts' && !plan.parts.length) plan.scope = 'all'; }
    return { ...b, prayed: keys(b.prayed, P), fav: keys(b.fav, P), bm: keys(b.bm, S), ink, hist, plan, last: b.last ? S(b.last) || null : null };
  }
  migrateLocal(from, to) {
    const b = this.remapBlob(this.localBlob(), from, to), A = this.layMaps(from), B = this.layMaps(to);
    this.sv('prayed', b.prayed); this.sv('fav', b.fav); this.sv('bookmarks', b.bm); this.sv('plan', b.plan); this.sv('ink', b.ink); this.sv('hist', b.hist); this.sv('last', b.last);
    const lp = this.ld('lastP', null); if (lp) this.sv('lastP', B.up[A.pu[lp.pid]] ? { ...lp, pid: B.up[A.pu[lp.pid]] } : null);
    const ls = this.ld('lastSess', null);
    if (ls) { const sid = B.us[A.su[ls.sid]]; if (sid) { const [, p, s] = sid.split('-').map(Number); this.sv('lastSess', { ...ls, sid, i: Math.min(ls.i, to[p - 1].s[s - 1].p.length - 1) }); } else this.sv('lastSess', null); }
    this.inkData = b.ink; this.lastId = b.last;
  }
  adoptLayout(data, ver) {
    const lay = this.layoutOf(data), cur = this.ld('bookV', 0);
    if (cur !== ver) this.migrateLocal(this.ld('bookLay', null) || this.bundledLay, lay);
    this.bookV = ver; this.bookLay = lay; this.maps = this.layMaps(lay);
    this.sv('bookV', ver); this.sv('bookLay', lay);
  }
  indexBook(data) {
    this.flat = []; this.flatById = {};
    data.forEach((p, pi) => p.sections.forEach((s, si) => {
      if (this.B.key === 'jcfp' && s.prayers.some(x => x.link === 'weekly')) return;
      const id = `s-${pi + 1}-${si + 1}`;
      const f = { id, pn: pi + 1, num: `${pi + 1}.${si + 1}`, title: s.title, ids: s.prayers.map((x, i) => `${id}-${i + 1}`) };
      this.flat.push(f); this.flatById[id] = f;
    }));
  }
  vq(sel) { const t = this.B.verTable || 'book_versions', q = this.sb.from(t).select(sel); return this.B.verTable ? q.eq('book', this.B.key) : q; }
  cacheKey() { return this.B.key === 'covenant' ? 'book.json' : this.B.key + '.json'; }
  async cachedBook() { try { const c = await caches.open('gra-book'); const r = await c.match(this.cacheKey()); return r ? await r.json() : null; } catch (e) { return null; } }
  async saveCachedBook(b) { try { const c = await caches.open('gra-book'); await c.put(this.cacheKey(), new Response(JSON.stringify(b), { headers: { 'Content-Type': 'application/json' } })); } catch (e) {} }
  async checkBook() {
    if (!this.B.versions) return;
    if (!this.sbOn() || navigator.onLine === false || !this.state.data || this._checking) return;
    this._checking = true;
    try {
      await this.loadSb();
      const { data: top } = await this.vq('version').order('version', { ascending: false }).limit(1).maybeSingle();
      if (top && top.version > this.bookV) {
        const { data: row } = await this.vq('version, data').eq('version', top.version).single();
        if (row && Array.isArray(row.data)) {
          await this.saveCachedBook({ v: row.version, data: row.data });
          this.adoptLayout(row.data, row.version); this.indexBook(row.data);
          document.querySelectorAll('svg[data-ink-layer]').forEach(n => n.remove());
          this.setState({ data: row.data, prayed: this.ld('prayed', {}), fav: this.ld('fav', {}), bm: this.ld('bookmarks', {}), plan: this.ld('plan', null), hist: this.ld('hist', {}), resume: null }, () => { this.checkPlan(this.state.prayed); this.afterRender(); });
          this.showToast('The book has been updated');
        }
      }
    } catch (e) {}
    this._checking = false;
  }
  async normRemote(d) {
    if (!d || !this.B.versions) return d;
    const bv = d.bv || 0;
    if (bv > this.bookV) await this.checkBook();
    if (bv === this.bookV) return d;
    let from = bv === 0 ? this.bundledLay : null;
    if (!from) { const { data } = await this.vq('layout').eq('version', bv).maybeSingle(); from = data && data.layout; }
    if (!from) throw new Error('layout');
    return { ...this.remapBlob(d, from, this.bookLay), bv: this.bookV };
  }
  localBlob() { return { v: 3, bv: this.bookV || 0, reset: this.ld('resetAt', null), prayed: this.ld('prayed', {}), fav: this.ld('fav', {}), bm: this.ld('bookmarks', {}), plan: this.ld('plan', null), ink: this.inkData || this.ld('ink', {}), last: this.ld('last', null), hist: this.ld('hist', {}) }; }
  mergeData(a, b) {
    b = b || {}; const ink = { ...(b.ink || {}) };
    Object.entries(a.ink || {}).forEach(([k, list]) => { const have = new Set((ink[k] || []).map(s => JSON.stringify(s))); ink[k] = [...(ink[k] || []), ...list.filter(s => !have.has(JSON.stringify(s)))]; });
    const hist = { ...(b.hist || {}) }; Object.entries(a.hist || {}).forEach(([d, l]) => { hist[d] = [...new Set([...(hist[d] || []), ...l])]; });
    const pa = a.plan, pb = b.plan, plan = pa && pb ? ((pb.days || []).length > (pa.days || []).length ? pb : pa) : (pa || pb || null);
    return { v: 3, bv: a.bv || 0, reset: a.reset || b.reset || null, prayed: { ...(b.prayed || {}), ...(a.prayed || {}) }, fav: { ...(b.fav || {}), ...(a.fav || {}) }, bm: { ...(b.bm || {}), ...(a.bm || {}) }, plan, ink, last: a.last || b.last || null, hist };
  }
  applyRemote(d) {
    if (!d) return;
    this._applying = true;
    const prayed = d.prayed || {}, fav = d.fav || {}, bm = d.bm || {}, plan = d.plan || null;
    this.sv('prayed', prayed); this.sv('fav', fav); this.sv('bookmarks', bm); this.sv('plan', plan); this.sv('ink', d.ink || {}); if (d.last) this.sv('last', d.last);
    const hist = d.hist || this.ld('hist', {}); this.sv('hist', hist);
    this._applying = false;
    this.inkData = d.ink || {}; this.undo = [];
    document.querySelectorAll('svg[data-ink-layer]').forEach(n => n.remove());
    this.setState({ prayed, fav, bm, plan, hist }, () => { this.checkPlan(prayed); this.afterRender(); });
  }
  syncFail(error) { this.setState({ sync: navigator.onLine === false || /fetch|network/i.test((error && error.message) || '') ? 'offline' : 'error' }); }
  async pull() {
    if (!this.sb || !this.user || this._pushing) return;
    await this.bookReady;
    this.setState({ sync: 'syncing' });
    const { data, error } = await this.stSel();
    if (error) return this.syncFail(error);
    if (data) { try { data.data = await this.normRemote(data.data); } catch (e) { return this.syncFail(e); } }
    if (data && data.data && data.data.reset && data.data.reset !== this.ld('resetAt', null)) {
      this.sv('resetAt', data.data.reset); this.sv('lastP', null); this.sv('lastSess', null);
      this.applyRemote({ ...data.data, hist: {}, ink: {} }); this.sv('syncMeta', { uid: this.user.id, at: data.updated_at });
      this.setState({ resume: null }); this.showToast('Your progress was reset by an admin'); return this.push();
    }
    const meta = this.ld('syncMeta', null), dirty = !!this.ld('dirty', 0), known = meta && meta.uid === this.user.id;
    if (!data) return this.push();
    if (!known || (dirty && data.updated_at !== meta.at)) { this.applyRemote(this.mergeData(this.localBlob(), data.data)); return this.push(); }
    if (data.updated_at !== meta.at) { this.applyRemote(data.data); this.sv('syncMeta', { uid: this.user.id, at: data.updated_at }); }
    if (dirty) return this.push();
    this.setState({ sync: 'ok', syncAt: Date.now() });
  }
  async push() {
    clearTimeout(this._pt);
    if (!this.sb || !this.user) return false;
    if (this._pushing) { this._again = true; return false; }
    await this.bookReady;
    this._pushing = true; this._again = false; this.setState({ sync: 'syncing' });
    try {
      const meta = this.ld('syncMeta', null);
      const cur = await this.stSel();
      if (cur.error) throw cur.error;
      if (cur.data) cur.data.data = await this.normRemote(cur.data.data);
      if (cur.data && cur.data.data && cur.data.data.reset && cur.data.data.reset !== this.ld('resetAt', null)) { this._pushing = false; this.sv('syncMeta', null); return this.pull(); }
      if (cur.data && (!meta || meta.uid !== this.user.id || cur.data.updated_at !== meta.at)) this.applyRemote(this.mergeData(this.localBlob(), cur.data.data));
      const { data, error } = await this.stUp(this.localBlob());
      if (error) throw error;
      this.sv('syncMeta', { uid: this.user.id, at: data.updated_at });
      this._pushing = false;
      if (this._again) { this._again = false; return this.push(); }
      try { localStorage.removeItem(this.kp('dirty')); } catch (e) {}
      this.setState({ sync: 'ok', syncAt: Date.now() }); return true;
    } catch (e) { this._pushing = false; this.syncFail(e); return false; }
  }
  stSel() { const q = this.sb.from(this.B.table).select('data, updated_at').eq('user_id', this.user.id); return (this.B.table === 'library_state' ? q.eq('book', this.B.key) : q).maybeSingle(); }
  stUp(blob) { const lib = this.B.table === 'library_state', row = { user_id: this.user.id, data: blob }; if (lib) row.book = this.B.key; return this.sb.from(this.B.table).upsert(row, lib ? { onConflict: 'user_id,book' } : undefined).select('updated_at').single(); }
  clearLocalBook() {
    this._applying = true;
    ['prayed', 'fav', 'bookmarks', 'plan', 'ink', 'last', 'member', 'syncMeta', 'dirty', 'pendingCode', 'unlocked', 'hist', 'lastP', 'lastSess'].forEach(k => { try { ['gra-covenant-', 'gra-jcfp-', 'gra-weekly-'].forEach(px => localStorage.removeItem(px + k)); } catch (e) {} });
    this._applying = false;
    this.inkData = {}; this.undo = []; this.lastId = null;
    document.querySelectorAll('svg[data-ink-layer]').forEach(n => n.remove());
  }
  async signOut() {
    if (!window.confirm('Sign out on this device? Your progress is saved to your account.')) return;
    if (this.ld('dirty', 0) && !(await this.push()) && !window.confirm('Some recent changes haven’t synced yet and will be lost on this device. Sign out anyway?')) return;
    this.signOutQuiet();
  }
  async signOutQuiet() {
    try { await this.sb.auth.signOut(); } catch (e) {}
    this.clearLocalBook(); this.user = null;
    this.setState({ prayed: {}, fav: {}, bm: {}, plan: null, hist: {}, isAdmin: false, locked: true, sheet: null, aMode: 'in', aErr: '', aMsg: '', aBusy: false, sync: null, resume: null });
  }

  secOf(sid) { if (sid === 'wk') return this.wkSec(); const [, p, s] = sid.split('-').map(Number); return this.state.data[p - 1].sections[s - 1]; }
  wkSec() { const w = (this.state.wkRows || this.ld('weekly', []) || [])[0]; return { title: 'GRA Weekly Kingdom Prayers', prayers: w ? (w.prayers || []).map(p => ({ text: p.text, scripture: p.ref ? [{ ref: p.ref, verses: [] }] : [] })) : [] }; }
  jcfpPos(p, s, i) { const P = this.state.data[p - 1]; let k = 0, N = 0; P.sections.forEach((x, xi) => { if (x.kind === 'list' || x.prayers.some(y => y.link === 'weekly')) return; if (xi < s - 1) k += x.prayers.length; N += x.prayers.length; }); return `${P.label || 'Watch ' + p} · Prayer ${k + i + 1} of ${N}`; }
  sessOpen(sid, at) {
    if (this.state.ink) return;
    const sel = window.getSelection && window.getSelection(); if (at != null && sel && String(sel).length > 0) return;
    if (this.state.tts) this.ttsStop();
    const sec = this.secOf(sid); if (!sec.prayers.length) return; let i = at != null ? at : sec.prayers.findIndex((_, k) => !this.state.prayed[`${sid}-${k + 1}`]); if (i < 0) i = 0;
    if (sid !== 'wk') { this.sv('lastSess', { sid, i, t: Date.now() }); this.logUse('open', sid); }
    document.body.style.overflow = 'hidden';
    try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(l => { this._wl = l; }).catch(() => {}); } catch (e) {}
    this.setState({ sess: { sid, i, count: 0, done: false }, sessRun: 'stopped', sessDur: 0, sessLeft: 0, sessTimerOpen: false, sheet: null }, () => this.sessResetTimer('stopped'));
  }
  sessClose() {
    if (this.state.sessRead) { this.ttsTok = (this.ttsTok || 0) + 1; try { window.speechSynthesis.cancel(); } catch (e) {} }
    clearInterval(this._st); document.body.style.overflow = '';
    try { this._wl && this._wl.release(); } catch (e) {} this._wl = null;
    const ss = this.state.sess; this.setState({ sess: null, sessRead: false }, () => { if (ss && !ss.done) this.goto(`${ss.sid}-${ss.i + 1}`); });
  }
  sessMove(d) {
    const ss = this.state.sess; if (!ss || ss.done) return;
    let { sid, i, count } = ss; const sec = this.secOf(sid), idx = this.flat.findIndex(s => s.id === sid);
    if (sid === 'wk') {
      if (d > 0) { count++; i++; if (i >= sec.prayers.length) { clearInterval(this._st); this.setState({ sess: { ...ss, count, done: true }, sessRead: false }); return; } } else i = Math.max(0, i - 1);
      const kp = this.state.sessRun === 'done' ? 'running' : (this.state.sessRun || 'stopped');
      this.setState({ sess: { sid, i, count, done: false } }, () => { if (this.sessEl) this.sessEl.scrollTop = 0; this.sessResetTimer(kp); if (this.state.sessRead) this.sessSpeak(); }); return;
    }
    if (d > 0) {
      const pid = `${sid}-${i + 1}`; if (!this.state.prayed[pid]) this.setMany([pid], true); count++; i++;
      if (i >= sec.prayers.length) { const nx = this.flat[idx + 1]; if (!nx) { clearInterval(this._st); this.sv('lastSess', null); this.setState({ sess: { ...ss, count, done: true }, sessRead: false }); return; } sid = nx.id; i = 0; if (this.B.key !== 'jcfp') this.showToast(`Section ${this.flatById[ss.sid].num} complete`); }
    } else { i--; if (i < 0) { const pv = this.flat[idx - 1]; if (pv) { sid = pv.id; i = this.secOf(pv.id).prayers.length - 1; } else i = 0; } }
    const keep = this.state.sessRun === 'done' ? 'running' : (this.state.sessRun || 'stopped');
    this.setState({ sess: { sid, i, count, done: false } }, () => { if (this.sessEl) this.sessEl.scrollTop = 0; this.sessResetTimer(keep); this.sv('lastSess', { sid, i, t: Date.now() }); if (this.state.sessRead) this.sessSpeak(); });
  }
  sessResetTimer(run) {
    clearInterval(this._st); const t = this.state.sessDur || 0;
    if (!t || !this.state.sess || this.state.sess.done) { this.setState({ sessLeft: 0, sessRun: 'stopped' }); return; }
    this.setState({ sessLeft: t, sessRun: run || 'running' });
    this._st = setInterval(() => {
      if (this.state.sessRun !== 'running' || !this.state.sess) return;
      const l = this.state.sessLeft - 1, ch = this.state.settings.sessChime !== false;
      if (l > 0) { if (ch && l <= 3) this.beep(false); return this.setState({ sessLeft: l }); }
      if (ch) this.beep(true);
      if (this.state.settings.sessAuto !== false) this.sessMove(1);
      else { clearInterval(this._st); this.setState({ sessLeft: 0, sessRun: 'done' }); }
    }, 1000);
  }
  sessSetDur(sec) {
    sec = Math.max(0, Math.min(3600, Math.round(sec)));
    this.setState({ sessDur: sec }, () => this.sessResetTimer('stopped'));
  }
  unlockAudio() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    try {
      const A = window.AudioContext || window.webkitAudioContext; if (!A) return;
      const ac = this._ac || (this._ac = new A());
      if (ac.state !== 'running') ac.resume();
      const b = ac.createBuffer(1, 1, 22050), s = ac.createBufferSource(); s.buffer = b; s.connect(ac.destination); s.start(0);
    } catch (e) {}
  }
  beep(final) {
    try {
      const ac = this._ac; if (!ac) return; if (ac.state !== 'running') ac.resume();
      const t0 = ac.currentTime + 0.01, tones = final ? [[660, 0], [880, 0.16], [1175, 0.32]] : [[880, 0]];
      tones.forEach(([f, d]) => {
        const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = f;
        const len = final ? 0.9 : 0.18;
        g.gain.setValueAtTime(0.0001, t0 + d); g.gain.exponentialRampToValueAtTime(final ? 0.5 : 0.4, t0 + d + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + len);
        o.connect(g).connect(ac.destination); o.start(t0 + d); o.stop(t0 + d + len + 0.05);
      });
    } catch (e) {}
    try { if (navigator.vibrate) navigator.vibrate(final ? [120, 60, 120] : 40); } catch (e) {}
  }
  chime() {
    try {
      const A = window.AudioContext || window.webkitAudioContext; if (!A) return; const ac = this._ac || (this._ac = new A());
      [0, 0.18].forEach((t0, k) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = k ? 880 : 660; g.gain.setValueAtTime(0, ac.currentTime + t0); g.gain.linearRampToValueAtTime(0.15, ac.currentTime + t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + t0 + 0.9); o.connect(g).connect(ac.destination); o.start(ac.currentTime + t0); o.stop(ac.currentTime + t0 + 1); });
    } catch (e) {}
  }
  dkey(d) { d = d || new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  fmt(k, opts) { if (!k) return ''; const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString(undefined, opts || { day: 'numeric', month: 'short', year: 'numeric' }); }

  voiceList() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return [];
    const vs = window.speechSynthesis.getVoices().filter(v => this.vRe().test(v.lang));
    if (!vs.length && !this._vh) { this._vh = 1; window.speechSynthesis.onvoiceschanged = () => this.forceUpdate(); }
    return vs.filter(v => this.voiceScore(v) > -100).sort((a, b) => this.voiceScore(b) - this.voiceScore(a)).map(v => { const t = this.voiceTier(v); return { id: v.voiceURI, label: `${v.name} (${v.lang})${t ? ' · ' + t : ''}` }; });
  }
  voiceScore(v) {
    const n = v.name || '';
    if (/\b(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Deranged|Good News|Hysterical|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Ralph|Fred|Junior|Kathy|Grandma|Grandpa|Rocko|Shelley|Eddy|Flo|Reed|Sandy)\b/i.test(n)) return -100;
    let s = 0;
    if (/natural|neural/i.test(n)) s += 60; if (/premium/i.test(n)) s += 55; if (/enhanced/i.test(n)) s += 45; if (/siri/i.test(n)) s += 40;
    if (/google/i.test(n)) s += 30; if (/online/i.test(n)) s += 15; if (/compact|espeak/i.test(n)) s -= 30;
    if (/en[-_](US|GB)/i.test(v.lang)) s += 5; if (v.localService === false) s += 3;
    return s;
  }
  voiceTier(v) { const s = this.voiceScore(v); return s >= 45 ? 'Natural' : s >= 25 ? 'Enhanced' : ''; }
  bestVoice() {
    const sy = window.speechSynthesis; if (!sy) return null; const vs = sy.getVoices(), id = this.state.settings.voice;
    if (id) { const v = vs.find(x => x.voiceURI === id); if (v) return v; }
    return vs.filter(v => this.vRe().test(v.lang) && this.voiceScore(v) > -100).sort((a, b) => this.voiceScore(b) - this.voiceScore(a))[0] || null;
  }
  componentDidMount() {
    this.npSwipeInit();
    this.onHideTts = () => { if (document.hidden && this.state.tts && this.state.tts.playing && /iPhone|iPad|Macintosh/.test(navigator.userAgent) && 'ontouchend' in document) this.ttsPause(); };
    document.addEventListener('visibilitychange', this.onHideTts);
    let unlocked = false;
    try { unlocked = localStorage.getItem('gra-covenant-unlocked') === this.HASH; } catch (e) {}
    const small = window.matchMedia && matchMedia('(max-width: 700px)').matches;
    this.inkData = this.ld('ink', {}); this.undo = []; this.redo = []; this._ps = this.ld('penSize', 'med'); setTimeout(() => this.setState({ penSize: this._ps }), 0); this.lastId = this.ld('last', null); this.touches = new Map(); this.pan = null;
    let plan = this.ld('plan', null);
    if (plan && !plan.wdays) plan = { scope: 'all', parts: [], perDay: 1, wdays: [true, true, true, true, true, true, true], start: plan.start || this.dkey(), days: (plan.days || []).map(x => x.d || x), today: null };
    if (this.sbOn()) {
      this.initAuth();
      this.onVis = () => { if (!document.hidden && this.user) this.pull(); };
      document.addEventListener('visibilitychange', this.onVis); window.addEventListener('online', this.onVis);
      this._pollT = setInterval(() => { if (!document.hidden && this.user && !this.state.locked) this.pull(); }, 120000);
    }
    this.onSessKey = e => {
      if (!this.state.sess) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || (e.key === ' ' && e.target === document.body)) { e.preventDefault(); this.sessMove(1); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); this.sessMove(-1); }
      else if (e.key === 'Escape') this.sessClose();
    };
    const esc = this.onSessKey;
    this.onSessKey = e => {
      if (!this.state.sess && e.key === 'Escape') {
        if (this.state.sheet) this.setState({ sheet: null, planEdit: false, draft: null });
        else if (this.state.searchOpen) this.setState({ searchOpen: false, q: '', sTheme: null });
        else if (this.state.exporting) this.endExport();
        return;
      }
      esc(e);
    };
    window.addEventListener('keydown', this.onSessKey);
    this.setState({ locked: this.sbOn() ? !(this.ld('member', null) || unlocked) : !unlocked, prayed: this.ld('prayed', {}), fav: this.ld('fav', {}), bm: this.ld('bookmarks', {}), plan, hist: this.ld('hist', {}),
      settings: { size: 17, theme: 'auto', verses: true, ...this.ld('settings', {}) }, finger: small }, () => this.applyTheme());
    document.title = this.B.title; this.enterStart();
    Promise.all([this.loadBookData(), this.B.versions ? this.cachedBook() : null]).then(([bundled, cached]) => {
      this.bundledLay = this.layoutOf(bundled);
      let data = bundled, ver = this.BUNDLE_V;
      if (cached && cached.v > ver && Array.isArray(cached.data)) { data = cached.data; ver = cached.v; }
      if (this.B.key === 'covenant' && this.migrate(bundled)) {
        this.inkData = this.ld('ink', {}); this.lastId = this.ld('last', null);
      }
      this.adoptLayout(data, ver); this.indexBook(data);
      this.inkData = this.ld('ink', {}); this.lastId = this.ld('last', null);
      this.setState({ prayed: this.ld('prayed', {}), fav: this.ld('fav', {}), bm: this.ld('bookmarks', {}), plan: this.ld('plan', null), hist: this.ld('hist', {}) });
      const last = this.flatById[this.lastId], lp = this.ld('lastP', null), ls = this.ld('lastSess', null);
      const hash = location.hash.length > 1 ? location.hash.slice(1) : null;
      let resume = null;
      if (ls && this.flatById[ls.sid] && (!lp || ls.t >= lp.t)) { const f = this.flatById[ls.sid]; resume = { mode: 'focus', id: ls.sid, i: ls.i, label: `${f.num}.${ls.i + 1} · ${f.title}` }; }
      else if (last) {
        const pid = lp && lp.pid && lp.pid.indexOf(last.id + '-') === 0 ? lp.pid : null;
        if (last.id !== 's-1-1' || (pid && pid !== 's-1-1-1')) resume = { mode: 'read', id: pid || last.id, label: pid ? `${last.num}.${pid.split('-')[3]} · ${last.title}` : `${last.num} · ${last.title}` };
      }
      if (this.B.key === 'weekly') resume = null;
      this.setState({ data, resume: hash ? null : resume }, () => {
        this.checkPlan(this.state.prayed); this.afterRender(); this._bookRes(); this.checkBook();
        if (hash === 'contents' && this.B.key === 'weekly') { setTimeout(() => this.setState({ sheet: 'contents' }), 300); if (this.flat.length) setTimeout(() => this.goto(this.flat[0].id, true), 200); }
        else if (hash === 'plan' && this.B.plan) setTimeout(() => { if (!this.state.plan) this.openBuilder(true); else { this.checkPlan(this.state.prayed); this.setState({ sheet: 'plan' }); } }, 400);
        else if (hash) setTimeout(() => this.goto(hash, true), 400);
        else if (this.B.key === 'weekly' && this.flat.length) setTimeout(() => this.goto(this.flat[0].id, true), 400);
        if (this.B.key === 'weekly') this.refreshWeekly(); else if (this.B.key === 'jcfp') this.fetchWeekRows();
        setTimeout(() => { if (this.wide() && this.ld('tocPin', true) !== false && !this.state.sheet && !this.state.locked) this.setState({ sheet: 'contents' }); }, 650);
        this.enterDone();
      });
    });
    this.mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
    this.onMq = () => this.applyTheme();
    if (this.mq && this.mq.addEventListener) this.mq.addEventListener('change', this.onMq);
    this.onFast = () => { if (this._raf) return; this._raf = requestAnimationFrame(() => { this._raf = null; this.updateStick(); }); };
    window.addEventListener('scroll', this.onFast, { passive: true });
    this.onScroll = () => { if (this._sp) return; this._sp = setTimeout(() => { this._sp = null; this.track(); }, 350); };
    this.onResize = () => { clearTimeout(this._rz); this._rz = setTimeout(() => this.inkSyncAll(), 200); };
    this.onVis = () => { if (document.visibilityState === 'visible') { this.checkPlan(this.state.prayed); if (this.B.key === 'weekly') this.refreshWeekly(); } };
    window.addEventListener('scroll', this.onScroll, { passive: true });
    this.navInit();
    window.addEventListener('resize', this.onResize);
    document.addEventListener('visibilitychange', this.onVis);
    this.onPD = e => this.inkDown(e); this.onPM = e => this.inkMove(e); this.onPU = e => this.inkUp(e);
    this.onTS = e => {
      if (!this.state.ink || this.inUI(e.target)) return;
      const t = e.touches && e.touches[0];
      if (t && (t.touchType === 'stylus' || this.state.finger)) e.preventDefault();
    };
    this.onTM = e => { if (this.state.ink && (this.cur || this.pan != null) && !this.inUI(e.target)) e.preventDefault(); };
    document.addEventListener('pointerdown', this.onPD, { passive: false });
    document.addEventListener('pointermove', this.onPM, { passive: false });
    document.addEventListener('pointerup', this.onPU); document.addEventListener('pointercancel', this.onPU);
    document.addEventListener('touchstart', this.onTS, { passive: false });
    document.addEventListener('touchmove', this.onTM, { passive: false });
    this.injectPWA();
    this.onBIP = e => { e.preventDefault(); this._bip = e; this.setState({ canInstall: true }); };
    window.addEventListener('beforeinstallprompt', this.onBIP);
    const standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone;
    if (!standalone && 'ontouchend' in document && !this.ld('installSeen', null)) this._it = setTimeout(() => this.setState({ installAsk: true }), 15000);
    this.onNet = () => { this.showToast(navigator.onLine ? 'Back online' : 'Offline · the book still works'); if (navigator.onLine) { this.flushUse(); this.checkBook(); } };
    window.addEventListener('online', this.onNet); window.addEventListener('offline', this.onNet);
    this.onHideUse = () => { if (document.hidden) this.flushUse(); };
    document.addEventListener('visibilitychange', this.onHideUse);
    this._uT = setInterval(() => this.flushUse(), 300000); setTimeout(() => this.flushUse(), 8000);
    this.onAfterPrint = () => { if (!this.state.exporting) this.applyTheme(); };
    window.addEventListener('afterprint', this.onAfterPrint);
  }
  loadBookData() {
    const B = this.B, R = window.__resources || {};
    if (B.key === 'weekly') return Promise.resolve(this.weeklyBook(this.ld('weekly', []) || []));
    return fetch(R[B.res] || B.file).then(r => r.json());
  }
  weeklyBook(rows) {
    const mk = (ws, tag) => [{ u: tag ? 'wk' : undefined, label: 'Shared every Monday', title: 'GRA WEEKLY KINGDOM PRAYERS', subtitle: '', sections: ws.map(w => ({ u: tag ? 'wk-' + w.week_of : undefined, title: 'Week of ' + this.wkLabel(w), foundation: [],
      prayers: (w.prayers || []).map((p, i) => ({ u: tag ? `wk-${w.week_of}-${i + 1}` : undefined, text: p.text, scripture: p.ref ? [{ ref: p.ref, verses: [] }] : [] })) })) }];
    const ws = (rows || []).slice().sort((a, b) => b.week_of.localeCompare(a.week_of)), book = mk(ws, true);
    const lay = this.layoutOf(book), old = this.ld('wkLay', null) || this.layoutOf(mk(ws.slice().reverse(), true));
    if (JSON.stringify(old) !== JSON.stringify(lay)) { try { this.migrateLocal(old, lay); } catch (e) {} this.sv('wkLay', lay); }
    return book;
  }
  async fetchWeekRows() {
    if (!this.sbOn() || navigator.onLine === false) return;
    try {
      const sb = await this.loadSb();
      const { data, error } = await sb.from('weekly_prayers').select('week_of, title, intro, prayers, closing').not('publish_at', 'is', null).lte('publish_at', new Date().toISOString()).order('week_of', { ascending: false });
      if (!error && Array.isArray(data) && data.length) { this.sv('weekly', data); this.setState({ wkRows: data }); }
    } catch (e) {}
  }
  async refreshWeekly() {
    if (!this.sbOn() || navigator.onLine === false || this._wkR) return;
    this._wkR = true;
    try {
      const sb = await this.loadSb();
      const { data, error } = await sb.from('weekly_prayers').select('week_of, title, intro, prayers, closing').not('publish_at', 'is', null).lte('publish_at', new Date().toISOString()).order('week_of', { ascending: false });
      if (!error && Array.isArray(data) && data.length) {
        const same = JSON.stringify(data) === JSON.stringify(this.ld('weekly', []));
        this.sv('weekly', data);
        if (!same) {
          const book = this.weeklyBook(data); this.indexBook(book);
          this.setState({ data: book }, () => { this.afterRender(); const h = location.hash.length > 1 ? location.hash.slice(1) : null; if (this.flat.length) setTimeout(() => this.goto(h && document.getElementById(h) ? h : this.flat[0].id, true), 200); });
        }
      }
    } catch (e) {}
    this._wkR = false;
  }
  migrate(data) {
    const ver = this.ld('layout', 1); if (ver >= 3) return false;
    const key = ver === 1 ? 'o' : 'o2';
    const map = {}, secMap = {}, oldCount = {}, oneToOne = {}, partTo = {}, newPartFrom = {};
    data.forEach((p, pi) => p.sections.forEach((s, si) => {
      const nsid = `s-${pi + 1}-${si + 1}`, srcs = new Set();
      s.prayers.forEach((pr, i) => {
        const oid = pr[key]; if (!oid) return; map[oid] = `${nsid}-${i + 1}`;
        const os = oid.replace(/-\d+$/, ''), op = +oid.split('-')[1];
        srcs.add(os); oldCount[os] = (oldCount[os] || 0) + 1; if (!(os in secMap)) secMap[os] = nsid;
        (partTo[op] = partTo[op] || new Set()).add(pi + 1); (newPartFrom[pi + 1] = newPartFrom[pi + 1] || new Set()).add(op);
      });
      if (srcs.size === 1) oneToOne[nsid] = [...srcs][0];
    }));
    const partMap = {}; Object.keys(partTo).forEach(op => { const t = [...partTo[op]]; if (t.length === 1 && newPartFrom[t[0]].size === 1) partMap[op] = t[0]; });
    const inv = {}; Object.keys(oneToOne).forEach(n => { const o = oneToOne[n]; const nCount = data[+n.split('-')[1] - 1].sections[+n.split('-')[2] - 1].prayers.length; if (nCount === oldCount[o]) inv[o] = n; });
    const remap = o => { const r = {}; Object.keys(o || {}).forEach(k => { if (map[k]) r[map[k]] = o[k]; }); return r; };
    this.sv('prayed', remap(this.ld('prayed', {}))); this.sv('fav', remap(this.ld('fav', {})));
    const bm = {}; Object.entries(this.ld('bookmarks', {})).forEach(([k, v]) => { if (secMap[k]) bm[secMap[k]] = v; }); this.sv('bookmarks', bm);
    const ink = {}; Object.entries(this.ld('ink', {})).forEach(([k, v]) => {
      if (k === 'title' || k === 'contents') ink[k] = v;
      else if (/^part-\d+$/.test(k)) { const n = +k.slice(5); if (partMap[n]) ink[`part-${partMap[n]}`] = v; }
      else if (inv[k]) ink[inv[k]] = v;
    }); this.sv('ink', ink);
    const last = this.ld('last', null); this.sv('last', last && secMap[last] ? secMap[last] : null);
    const plan = this.ld('plan', null);
    if (plan) { plan.today = null; if (Array.isArray(plan.parts)) plan.parts = [...new Set(plan.parts.flatMap(n => partTo[n] ? [...partTo[n]] : []))].sort((a, b) => a - b); if (plan.scope === 'parts' && !plan.parts.length) plan.scope = 'all'; this.sv('plan', plan); }
    this.sv('layout', 3); return true;
  }
  updateStick() {
    const bar = this.stickEl; if (!bar) return;
    const hdr = document.querySelector('[data-hdr]'); if (!hdr) return;
    const H = hdr.getBoundingClientRect().bottom - (bar.style.display === 'none' ? 0 : bar.offsetHeight);
    let cur = null;
    for (const el of document.querySelectorAll('[data-sec]')) {
      const r = el.getBoundingClientRect();
      if (r.top > H) break;
      if (r.bottom > H + 60) { const h = el.querySelector('header'); if (h && h.getBoundingClientRect().bottom < H) cur = el.getAttribute('data-sec'); break; }
    }
    const f = cur && this.flatById && this.flatById[cur];
    if (!f) { if (bar.style.display !== 'none') bar.style.display = 'none'; this.stickId = null; return; }
    if (this.stickId !== cur) {
      this.stickId = cur;
      bar.querySelector('[data-stick-num]').textContent = f.num;
      bar.querySelector('[data-stick-title]').textContent = f.title;
    }
    if (bar.style.display === 'none') bar.style.display = 'block';
  }
  componentWillUnmount() {
    try { window.speechSynthesis.cancel(); } catch (e) {}
    clearInterval(this._st); clearInterval(this._pollT); clearInterval(this._uT); clearTimeout(this._it); window.removeEventListener('keydown', this.onSessKey);
    window.removeEventListener('beforeinstallprompt', this.onBIP); window.removeEventListener('online', this.onNet); window.removeEventListener('offline', this.onNet);
    document.removeEventListener('visibilitychange', this.onHideUse); window.removeEventListener('afterprint', this.onAfterPrint);
    if (this.onVis) { document.removeEventListener('visibilitychange', this.onVis); window.removeEventListener('online', this.onVis); }
    document.removeEventListener('visibilitychange', this.onHideTts);
    window.removeEventListener('scroll', this.onFast);
    window.removeEventListener('scroll', this.onScroll); window.removeEventListener('resize', this.onResize); window.removeEventListener('popstate', this.onPop); document.removeEventListener('click', this.onTocClick);
    document.removeEventListener('visibilitychange', this.onVis);
    document.removeEventListener('pointerdown', this.onPD); document.removeEventListener('pointermove', this.onPM);
    document.removeEventListener('pointerup', this.onPU); document.removeEventListener('pointercancel', this.onPU);
    document.removeEventListener('touchstart', this.onTS); document.removeEventListener('touchmove', this.onTM);
    if (this.mq && this.mq.removeEventListener) this.mq.removeEventListener('change', this.onMq);
  }
  injectPWA() {
    if (location.protocol !== 'https:' || /claudeusercontent|localhost|127\.0\.0\.1/.test(location.hostname)) return;
    const add = (tag, a) => { const e = document.createElement(tag); Object.keys(a).forEach(k => e.setAttribute(k, a[k])); document.head.appendChild(e); };
    const base = this.inLib() ? '../' : '';
    add('link', { rel: 'manifest', href: base + 'manifest.webmanifest' });
    add('link', { rel: 'apple-touch-icon', href: base + 'apple-touch-icon.png' });
    add('meta', { name: 'apple-mobile-web-app-title', content: 'Prayers' });
    add('meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'default' });
    if ('serviceWorker' in navigator) navigator.serviceWorker.register(base + 'sw.js', { scope: base || './' }).catch(() => {});
  }
  isDarkNow() { const t = this.ld('settings', {}).theme || this.state.settings.theme; return t === 'dark' || (t === 'auto' && !!window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches); }
  applyTheme() {
    if (this.state.exporting) return;
    const dark = this.isDarkNow(), t = this.ld('settings', {}).theme || this.state.settings.theme, sep = !dark && t === 'sepia';
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : sep ? 'sepia' : 'light');
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', dark ? '#1a1714' : sep ? '#f3ead6' : '#f3f2f2');
  }
  afterRender() { requestAnimationFrame(() => { this.pgBuild(); this.inkSyncAll(); }); }
  pgBuild() {
    const els = [...document.querySelectorAll('[data-pgk]')], sig = els.map(e => e.getAttribute('data-pgk')).join('|');
    if (sig === this._pgSig) return; this._pgSig = sig;
    const byPart = this.B.key === 'jcfp', pages = [];
    let cur = null; const push = k => { cur = { keys: [k], label: '' }; pages.push(cur); };
    els.forEach(e => {
      const k = e.getAttribute('data-pgk'), title = (e.getAttribute('data-screen-label') || (e.querySelector('h2,h3') || {}).textContent || '').trim();
      if (pages.some(p => p.keys.includes(k))) return;
      if (k === 'title') { push(k); cur.label = 'Title page'; }
      else if (k === 'contents') { push(k); cur.label = 'Contents'; }
      else if (k === 'end') { if (cur) cur.keys.push(k); else push(k); }
      else if (e.hasAttribute('data-pgpart')) { push(k); cur.label = (e.querySelector('h2') || {}).textContent || title; }
      else if (byPart && cur && cur.part) cur.keys.push(k);
      else { push(k); cur.label = (e.querySelector('h3,h2') || {}).textContent || title; }
      if (e.hasAttribute('data-pgpart')) cur.part = true;
    });
    pages.forEach(p => { p.label = String(p.label || '').replace(/\s+/g, ' ').trim(); if (p.label === p.label.toUpperCase()) p.label = p.label.toLowerCase().replace(/(^|\s)\S/g, m => m.toUpperCase()); });
    this.pages = pages;
    const saved = this.ld('pg', 0), i = Math.min(pages.length - 1, Math.max(0, this._pg != null ? this._pg : saved));
    this.pgSet(i, 0, true);
  }
  pgCss(i) {
    let st = document.getElementById('pg-css'); if (!st) { st = document.createElement('style'); st.id = 'pg-css'; document.head.appendChild(st); }
    const p = this.pages && this.pages[i]; if (!p) { st.textContent = ''; return; }
    const esc = k => (window.CSS && CSS.escape ? CSS.escape(k) : k);
    st.textContent = '[data-pgk]' + p.keys.map(k => ':not([data-pgk="' + esc(k) + '"])').join('') + '{display:none !important}';
  }
  pgOf(el) { const k = el && el.closest && el.closest('[data-pgk]'); if (!k || !this.pages) return -1; const key = k.getAttribute('data-pgk'); return this.pages.findIndex(p => p.keys.includes(key)); }
  pgEl(id) { const el = document.getElementById(id); if (el && this.pages) { const i = this.pgOf(el); if (i >= 0 && i !== this._pg) this.pgSet(i, 0, true); } return el; }
  pgSet(i, dir, keepScroll) {
    if (!this.pages || !this.pages.length) return; i = Math.max(0, Math.min(this.pages.length - 1, i));
    const go = () => { this._pg = i; this.pgCss(i); this.sv('pg', i); if (!keepScroll) window.scrollTo({ top: 0, behavior: 'instant' }); if (this.state.pg !== i) this.setState({ pg: i }); requestAnimationFrame(() => this.inkSyncAll()); };
    const vis = () => [...document.querySelectorAll('[data-pgk]')].filter(e => e.offsetParent !== null || e.getClientRects().length);
    if (!dir || this.reduce() || !document.body.animate) return go();
    vis().forEach(e => e.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-dir * 56}px)` }], { duration: 160, easing: 'ease-in', fill: 'forwards' }));
    setTimeout(() => { go(); vis().forEach(e => { e.getAnimations().forEach(a => a.cancel()); e.animate([{ opacity: 0, transform: `translateX(${dir * 56}px)` }, { opacity: 1, transform: 'none' }], { duration: 340, easing: 'cubic-bezier(.2,.7,.2,1)' }); }); }, 165);
  }
  pgStep(d) { if (this.pages) this.pgSet((this._pg || 0) + d, d); }
  track() {
    if (this.state.searchOpen || this.state.sheet) return;
    const y = 140; let id = null;
    for (const el of document.querySelectorAll('[data-sec]')) { const r = el.getBoundingClientRect(); if (r.top <= y && r.bottom > y) { id = el.getAttribute('data-sec'); break; } if (r.top > y) break; }
    if (id && id !== this.lastId) { this.lastId = id; this.sv('last', id); if (this.state.tocSel) this.setState({ tocSel: id }); }
    if (this.state.data && !this.state.exporting) this.setHash(id && this.flatById && this.flatById[id] ? id : (window.scrollY < 200 ? null : this._hash));
    if (id) {
      const sec = this.pgEl(id); let pid = null;
      if (sec) for (const li of sec.querySelectorAll('[data-prayer]')) { if (li.getBoundingClientRect().bottom > y) { pid = li.id; break; } }
      if (pid && pid !== this.lastPid) { this.lastPid = pid; this.sv('lastP', { pid, t: Date.now() }); }
    }
    if (this.state.resume && window.scrollY > 900) this.setState({ resume: null });
  }
  showToast(t) { clearTimeout(this._tt); this.setState({ toast: t }); this._tt = setTimeout(() => this.setState({ toast: null }), 2400); }
  markJump() {
    const here = this.navHere(), b = (this.state.navB || []).slice(), last = b[b.length - 1];
    if (!last || last.sheet !== here.sheet || Math.abs(last.y - here.y) > 120) b.push(here);
    this.setState({ navB: b.slice(-50), navF: [] });
    if (this._navHist) { try { this.navPos++; history.pushState({ bcpNav: this.navPos }, '', location.href); } catch (e) { this._navHist = false; } }
  }
  navInit() {
    try { this.navPos = (history.state && history.state.bcpNav) || 0; history.replaceState({ bcpNav: this.navPos }, '', location.href); this._navHist = true; } catch (e) { this._navHist = false; this.navPos = 0; }
    this.onPop = ev => {
      const n = (ev.state && ev.state.bcpNav) || 0, dir = n < this.navPos ? -1 : 1; this.navPos = n;
      const S = this.state, stack = (dir < 0 ? S.navB : S.navF) || [];
      if (stack.length) { this.navStep(dir, true); return; }
      const id = location.hash.slice(1);
      this.setState({ sheet: this.pinned() ? 'contents' : null, searchOpen: false, q: '', resume: null }, () => requestAnimationFrame(() => {
        const el = id && this.pgEl(id), h = (document.querySelector('[data-hdr]') || {}).offsetHeight || 56;
        window.scrollTo({ top: el ? el.getBoundingClientRect().top + window.scrollY - h - 8 : 0, behavior: 'instant' });
      }));
    };
    window.addEventListener('popstate', this.onPop);
    this.onTocClick = ev => {
      const a = ev.target.closest && ev.target.closest('#contents a[href^="#"]');
      if (!a || ev.metaKey || ev.ctrlKey || ev.shiftKey) return;
      const id = a.getAttribute('href').slice(1); if (!id || !document.getElementById(id)) return;
      ev.preventDefault(); this.goto(id);
    };
    document.addEventListener('click', this.onTocClick);
  }
  navGo(dir) {
    const S = this.state; if (!((dir < 0 ? S.navB : S.navF) || []).length) return;
    if (this._navHist) { try { dir < 0 ? history.back() : history.forward(); return; } catch (e) {} }
    this.navStep(dir);
  }
  setHash(id) {
    if (!this._navHist || id === this._hash) return; this._hash = id;
    try { history.replaceState(history.state, '', location.pathname + location.search + (id ? '#' + id : '')); } catch (e) {}
  }
  navHere() {
    const sh = this.state.sheet, t = document.getElementById('contents'), r = t && t.getBoundingClientRect();
    return { y: window.scrollY, sheet: sh === 'contents' || sh === 'saved' || sh === 'history' || sh === 'weekly' ? sh : null, toc: !sh && !!r && r.top < window.innerHeight * 0.6 && r.bottom > 120 };
  }
  navStep(dir) {
    const S = this.state, from = (dir < 0 ? S.navB : S.navF) || [], to = (dir < 0 ? S.navF : S.navB) || [];
    if (!from.length) return;
    const e = from[from.length - 1], here = this.navHere();
    clearTimeout(this._pillT);
    const upd = { sheet: e.sheet, searchOpen: false, q: '', resume: null, backPill: null };
    if (e.sheet === 'history') Object.assign(upd, { histMonth: null, histSel: null });
    upd[dir < 0 ? 'navB' : 'navF'] = from.slice(0, -1); upd[dir < 0 ? 'navF' : 'navB'] = to.concat(here).slice(-50);
    this.setState(upd, () => requestAnimationFrame(() => { this.inkSyncAll(); window.scrollTo({ top: e.y, behavior: 'instant' }); }));
  }
  pillFor(e) {
    if (!e) return null;
    if (e.sheet === 'contents' || e.toc) return 'Back to Contents';
    if (e.sheet === 'saved') return 'Back to Saved';
    if (e.sheet === 'weekly') return 'Back to Weekly';
    if (e.sheet === 'history') return 'Back to Prayer history';
    const f = this.lastId && this.flatById && this.flatById[this.lastId];
    return e.y < 200 || !f ? 'Back to where you were' : `Back to ${f.num} · ${f.title}`;
  }
  showPill(label) {
    clearTimeout(this._pillT); this.setState({ backPill: label });
    this._pillT = setTimeout(() => this.setState({ backPill: null }), 7000);
  }
  openToc() {
    if (this.B.key === 'weekly') { this.setState({ sheet: 'contents', resume: null }); return; }
    if (this.navHere().toc && !this.state.sheet) return;
    this.goto('contents');
  }
  lang() { return window.GRAi18n ? window.GRAi18n.lang : 'en'; }
  vRe() { return new RegExp('^' + this.lang(), 'i'); }
  ttsLang() { return window.GRAi18n ? window.GRAi18n.tts : 'en-US'; }
  wide() { return !!window.matchMedia && matchMedia('(min-width:1024px)').matches; }
  pinTrack() { const s = this.state.sheet, p = this._pinPrev; this._pinPrev = s; if (!this.wide() || p === s) return; if (s === 'contents') this.sv('tocPin', true); else if (p === 'contents' && s == null) this.sv('tocPin', false); }
  i18nSync() {
    const L = window.GRAi18n;
    if (!L) { if (!this._i18nWait) { this._i18nWait = 1; setTimeout(() => { this._i18nWait = 0; this.forceUpdate(); }, 300); } return; }
    if (L.lang === 'en') return;
    const v = this.state.data; if (!v || v === this._txOut || v === this._txIn) return;
    this._txIn = v;
    const slow = setTimeout(() => this.showToast(L.t('Translating…')), 900);
    L.translateData(v).then(r => { clearTimeout(slow); if (this.state.data !== v) return; this._txOut = r.data; this.indexBook(r.data); this.setState({ data: r.data }, () => this.afterRender()); });
  }
  enterStart() {
    let c = null; try { c = sessionStorage.getItem('gra-enter'); sessionStorage.removeItem('gra-enter'); } catch (e) {}
    if (!c || !/^#[0-9a-f]{3,8}$/i.test(c)) return;
    const d = document.createElement('div'); d.setAttribute('data-enter', ''); Object.assign(d.style, { position: 'fixed', inset: '0', zIndex: '300', background: c, pointerEvents: 'none', transition: 'opacity .55s cubic-bezier(.2,.7,.2,1)' });
    document.body.appendChild(d); this._enterEl = d; this._enterT = setTimeout(() => this.enterDone(), 1800);
  }
  enterDone() { const d = this._enterEl; if (!d) return; this._enterEl = null; clearTimeout(this._enterT); requestAnimationFrame(() => { d.style.opacity = '0'; setTimeout(() => d.remove(), 600); }); }
  langVals(seg) {
    const L = window.GRAi18n; if (!L) return { langOpts: [], langNote: '' };
    const bp = L.bookPref(this.B.key), cur = L.lang;
    const opts = [['app', 'Same as app', 'Same as app', undefined], ['en', 'EN', 'English', 'true'], ['fr', 'FR', 'Français', 'true'], ['es', 'ES', 'Español', 'true']];
    return { langOpts: opts.map(([k, label, full, skip]) => { const a = bp === k; return { label, full, skip, on: a ? 'true' : 'false', ...seg(a), pick: () => { if (a) return; L.setBookPref(this.B.key, k); location.reload(); } }; }),
      langNote: cur === 'en' ? '' : L.t('Scripture') + ': ' + L.bibleLabel };
  }
  pinned() { return this.state.sheet === 'contents' && window.matchMedia && window.matchMedia('(min-width:1024px)').matches; }
  pgBind() {
    if (this._pgB) return; this._pgB = 1;
    const busy = () => { const S = this.state; return S.ink || S.sheet || S.searchOpen || S.sess || S.locked || (window.getSelection && String(window.getSelection()).length > 0); };
    document.addEventListener('touchstart', e => { if (e.touches.length !== 1 || busy() || (e.target.closest && e.target.closest('[data-ink-ui],[role="dialog"],input,textarea'))) { this._px = null; return; } this._px = e.touches[0].clientX; this._py = e.touches[0].clientY; this._pt = Date.now(); }, { passive: true });
    document.addEventListener('touchend', e => { if (this._px == null || busy()) return; const t = e.changedTouches[0], dx = t.clientX - this._px, dy = t.clientY - this._py; this._px = null; if (Math.abs(dx) > 70 && Math.abs(dy) < 60 && Date.now() - this._pt < 700) this.pgStep(dx < 0 ? 1 : -1); }, { passive: true });
    window.addEventListener('keydown', e => { if (busy() || /INPUT|TEXTAREA/.test((e.target || {}).tagName || '')) return; if (e.key === 'ArrowRight') this.pgStep(1); else if (e.key === 'ArrowLeft') this.pgStep(-1); });
  }
  componentDidUpdate() { this.pgBind(); if (this.state.data && !this.state.locked) { const n = document.querySelectorAll('[data-pgk]').length; if (n !== this._pgN) { this._pgN = n; requestAnimationFrame(() => this.pgBuild()); } } this.i18nSync(); this.pinTrack(); const S = this.state; if (S.sheet === 'share' && S.share && this._shFor !== S.share) { const sh = S.share; this._shFor = sh; this._shCanvas = null; if (S.shareImg) this.setState({ shareImg: null }); this.makeShareImg(sh).then(c => { if (this._shFor !== sh) return; this._shCanvas = c; c.toBlob(b => { if (!b || this._shFor !== sh) return; if (this._shUrl) URL.revokeObjectURL(this._shUrl); this._shUrl = URL.createObjectURL(b); this.setState({ shareImg: this._shUrl }); }, 'image/jpeg', .85); }).catch(() => {}); } const p = this.pinned(); if (p !== !!this._pin) { this._pin = p; document.documentElement.toggleAttribute('data-pin', p); } }
  goto(id, noMark) {
    if (!noMark) { const label = this.pillFor(this.navHere()); this.markJump(); if (label) this.showPill(label); }
    this.setState({ sheet: this.pinned() ? 'contents' : null, searchOpen: false, q: '', resume: null }, () => requestAnimationFrame(() => requestAnimationFrame(() => {
      this.inkSyncAll();
      const el = id === 'top' ? document.getElementById(id) : this.pgEl(id); if (!el) return;
      const h = (document.querySelector('[data-hdr]') || {}).offsetHeight || 56;
      window.scrollTo({ top: id === 'top' ? 0 : el.getBoundingClientRect().top + window.scrollY - h - 8, behavior: this.reduce() ? 'auto' : 'smooth' });
    })));
  }

  reduce() { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }
  savePrayed(prayed) {
    const old = this.state.prayed, add = Object.keys(prayed).filter(k => !old[k]);
    if (add.length) { const t = this.dkey(), h = { ...this.state.hist }; h[t] = [...new Set([...(h[t] || []), ...add])]; this.sv('hist', h); this.setState({ hist: h }); this.logUse('pray', add); }
    this.sv('prayed', prayed); this.setState({ prayed }); this.checkPlan(prayed); this.gpAfterPray(); }
  toggle(id) { const p = { ...this.state.prayed }; if (p[id]) delete p[id]; else p[id] = 1; this.savePrayed(p); }
  setMany(ids, on) { const p = { ...this.state.prayed }; ids.forEach(id => { if (on) p[id] = 1; else delete p[id]; }); this.savePrayed(p); }
  resetPrefix(prefix, label) {
    if (!window.confirm(`Clear all checked prayers in ${label}?`)) return;
    const p = {}; Object.keys(this.state.prayed).forEach(k => { if (prefix && !k.startsWith(prefix)) p[k] = 1; }); this.savePrayed(p);
  }
  toggleFav(id) { const f = { ...this.state.fav }; const on = !f[id]; if (on) f[id] = 1; else delete f[id]; this.sv('fav', f); this.setState({ fav: f }); this.showToast(on ? 'Added to favorites' : 'Removed from favorites'); }
  toggleBm(id) { const b = { ...this.state.bm }; const on = !b[id]; if (on) b[id] = this.dkey(); else delete b[id]; this.sv('bookmarks', b); this.setState({ bm: b }); this.showToast(on ? 'Bookmarked' : 'Bookmark removed'); }

  secStat(id, prayed) { const s = this.flatById && this.flatById[id]; if (!s || !s.ids.length) return 0; let n = 0; s.ids.forEach(x => { if (prayed[x]) n++; }); return n / s.ids.length; }
  secDone(id, prayed) { return this.secStat(id, prayed) === 1; }
  planSecs(plan) { return plan.scope === 'parts' ? this.flat.filter(s => plan.parts.includes(s.pn)) : this.flat; }
  ensureToday(plan, prayed) {
    const t = this.dkey(); if (plan.today && plan.today.d === t) return plan;
    if (!plan.wdays[new Date().getDay()]) return { ...plan, today: { d: t, ids: [] } };
    const ids = this.planSecs(plan).filter(s => !this.secDone(s.id, prayed)).slice(0, plan.perDay).map(s => s.id);
    return { ...plan, today: { d: t, ids } };
  }
  checkPlan(prayed, planIn) {
    if (!this.B.plan) return;
    let plan = planIn || this.state.plan; if (!plan || !this.flat) return;
    const t = this.dkey(); plan = this.ensureToday(plan, prayed); let toast = null;
    if (plan.today.ids.length && !plan.days.includes(t) && plan.today.ids.every(id => this.secDone(id, prayed))) { plan = { ...plan, days: [...plan.days, t] }; toast = 'Today’s Prayers complete'; }
    if (plan !== this.state.plan) { this.sv('plan', plan); this.setState({ plan }); }
    if (toast) this.showToast(toast);
  }
  planView(plan, prayed) {
    const secs = this.planSecs(plan), total = secs.length, done = secs.filter(s => this.secDone(s.id, prayed)).length;
    const t = this.dkey(), days = new Set(plan.days), now = new Date(), schedToday = plan.wdays[now.getDay()], doneToday = days.has(t);
    let streak = 0; const d = new Date(); if (!doneToday) d.setDate(d.getDate() - 1);
    for (let i = 0; i < 1000; i++) { const k = this.dkey(d); if (k < plan.start) break; if (plan.wdays[d.getDay()]) { if (days.has(k)) streak++; else break; } d.setDate(d.getDate() - 1); }
    let eta = null; const remaining = total - done;
    if (remaining > 0) { const e = new Date(); if (doneToday || !schedToday) e.setDate(e.getDate() + (doneToday ? 1 : 0)); let need = Math.ceil(remaining / plan.perDay); for (let i = 0; i < 3000; i++) { if (plan.wdays[e.getDay()]) { need--; if (need <= 0) break; } e.setDate(e.getDate() + 1); } eta = e; }
    const strip = [];
    for (let i = 6; i >= 0; i--) {
      const x = new Date(); x.setDate(x.getDate() - i); const k = this.dkey(x), sch = plan.wdays[x.getDay()];
      const st = days.has(k) ? 'done' : k < plan.start ? 'pre' : !sch ? 'rest' : i === 0 ? 'today' : 'missed';
      strip.push({ wd: x.toLocaleDateString(undefined, { weekday: 'narrow' }), num: x.getDate(), st });
    }
    let next = null; if (!schedToday) { const n = new Date(); for (let i = 1; i < 8; i++) { n.setDate(n.getDate() + 1); if (plan.wdays[n.getDay()]) { next = this.DAYN[n.getDay()]; break; } } }
    const ahead = secs.find(s => !this.secDone(s.id, prayed) && !(plan.today && plan.today.ids.includes(s.id)));
    return { total, done, streak, eta, strip, doneToday, schedToday, complete: total > 0 && done >= total, daysDone: plan.days.length, next, ahead };
  }
  daysLabel(w) {
    const on = w.map((v, i) => v ? i : -1).filter(i => i >= 0);
    if (on.length === 7) return 'every day';
    if (on.join() === '1,2,3,4,5') return 'weekdays';
    if (on.join() === '0,6') return 'weekends';
    return on.map(i => this.DAYN[i].slice(0, 3)).join(', ');
  }
  openBuilder(fresh) {
    const p = !fresh && this.state.plan;
    const draft = p ? { scope: p.scope, parts: Object.fromEntries(p.parts.map(n => [n, true])), perDay: p.perDay, wdays: [...p.wdays] }
      : { scope: 'all', parts: {}, perDay: 1, wdays: [true, true, true, true, true, true, true] };
    this.setState({ draft, planEdit: true, sheet: 'plan' });
  }
  setDraft(patch) { this.setState({ draft: { ...this.state.draft, ...patch } }); }
  savePlan() {
    const d = this.state.draft; const parts = Object.keys(d.parts).filter(k => d.parts[k]).map(Number).sort((a, b) => a - b);
    if (d.scope === 'parts' && !parts.length) { this.showToast('Choose at least one part'); return; }
    if (!d.wdays.some(Boolean)) { this.showToast('Choose at least one prayer day'); return; }
    const old = this.state.planEdit && this.state.plan && !this.state.planFresh ? this.state.plan : null;
    const plan = { scope: d.scope, parts, perDay: d.perDay, wdays: d.wdays, start: old ? old.start : this.dkey(), days: old ? old.days : [], today: null };
    this.setState({ planEdit: false, draft: null, planFresh: false });
    const p2 = this.ensureToday(plan, this.state.prayed); this.sv('plan', p2); this.setState({ plan: p2 }, () => this.checkPlan(this.state.prayed));
    this.showToast(old ? 'Plan updated' : 'Plan started');
  }
  endPlan() { if (!window.confirm('End this plan? Your checked prayers stay as they are.')) return; this.sv('plan', null); this.setState({ plan: null, planEdit: false }); }

  shareData(num, title, pr) {
    let body = pr.text;
    pr.scripture.forEach(s => { body += `\n\n${s.ref} (KJV)\n` + s.verses.map(v => `${v.n} ${v.text}`).join(' '); });
    const head = `Prayer ${num} · ${title}`;
    let url = '';
    if (location.protocol === 'https:' && !/claudeusercontent/.test(location.hostname)) url = location.origin + location.pathname + '#s-' + num.split('.').join('-');
    const text = `${head}\n\n${body}\n\n— ${this.B.title}, God’s Remnant Assembly` + (url ? `\n${url}` : '');
    return { head, body: pr.text, text, ref: (pr.scripture[0] || {}).ref || '' };
  }
  async openVerse(ref, verses) {
    if (!ref) return;
    if (verses && verses.length) return this.setState({ sheet: 'verse', verse: { ref, verses } });
    const vl = this.lang();
    if (vl !== 'en' && window.GRAi18n) {
      this.setState({ sheet: 'verse', verse: { ref, verses: [], loading: true } });
      try { const out = await window.GRAi18n.bible(ref, vl); if (this.state.verse && this.state.verse.ref === ref) this.setState({ verse: { ref, verses: out } }); }
      catch (e) { if (this.state.verse && this.state.verse.ref === ref) this.setState({ verse: { ref, verses: [], err: navigator.onLine === false ? 'You’re offline. Connect to the internet to read this passage.' : 'Couldn’t load this passage. Try again later.' } }); }
      return;
    }
    let cache = {}; try { cache = JSON.parse(localStorage.getItem('gra-verse-cache')) || {}; } catch (e) {}
    if (cache[ref]) return this.setState({ sheet: 'verse', verse: { ref, verses: cache[ref] } });
    this.setState({ sheet: 'verse', verse: { ref, verses: [], loading: true } });
    try {
      const parts = ref.split(/\s*;\s*/).filter(Boolean), out = [];
      for (const p of parts) {
        const res = await fetch('https://bible-api.com/' + encodeURIComponent(p.replace(/\./g, '').trim()) + '?translation=kjv'); if (!res.ok) throw 0;
        const j = await res.json(); (j.verses || []).forEach(v => out.push({ n: (parts.length > 1 ? v.book_name.slice(0, 3) + ' ' + v.chapter + ':' : '') + v.verse, text: String(v.text).replace(/\s+/g, ' ').trim() }));
      }
      if (!out.length) throw 0;
      cache[ref] = out; const ks = Object.keys(cache); if (ks.length > 300) delete cache[ks[0]];
      try { localStorage.setItem('gra-verse-cache', JSON.stringify(cache)); } catch (e) {}
      if (this.state.verse && this.state.verse.ref === ref) this.setState({ verse: { ref, verses: out } });
    } catch (e) { if (this.state.verse && this.state.verse.ref === ref) this.setState({ verse: { ref, verses: [], err: navigator.onLine === false ? 'You’re offline. Connect to the internet to read this passage.' : 'Couldn’t load this passage. Try again later.' } }); }
  }
  async makeShareImg(sh) {
    const P = { covenant: ['#25685d', '#11372f', '#d9c27e', '#eef1e4'], jcfp: ['#8e2d3a', '#561620', '#dcb86c', '#f6ead2'], weekly: ['#33407a', '#171d40', '#e6c47a', '#f2ecde'] }, pal = P[this.B.key] || P.covenant;
    const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    try { await document.fonts.ready; } catch (e) {}
    const cs = getComputedStyle(document.documentElement), serif = (cs.getPropertyValue('--font-heading') || '').trim() || 'Georgia, serif', sans = (cs.getPropertyValue('--font-body') || '').trim() || 'system-ui, sans-serif';
    const g = x.createRadialGradient(W * .3, H * .18, 40, W * .5, H * .5, H * .85); g.addColorStop(0, pal[0]); g.addColorStop(1, pal[1]); x.fillStyle = g; x.fillRect(0, 0, W, H);
    const sheen = x.createLinearGradient(0, 0, W, H * .6); sheen.addColorStop(0, 'rgba(255,255,255,.08)'); sheen.addColorStop(.4, 'rgba(255,255,255,0)'); x.fillStyle = sheen; x.fillRect(0, 0, W, H);
    x.strokeStyle = pal[2]; x.lineWidth = 2; x.strokeRect(56, 56, W - 112, H - 112); x.globalAlpha = .45; x.strokeRect(72, 72, W - 144, H - 144); x.globalAlpha = 1;
    const sp = v => { try { x.letterSpacing = v; } catch (e) {} };
    x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.fillStyle = pal[2]; x.font = '500 24px ' + sans; sp('7px'); x.fillText('GOD’S REMNANT ASSEMBLY', W / 2, 168); sp('0px');
    x.fillRect(W / 2 - 96, 213, 64, 2); x.fillRect(W / 2 + 32, 213, 64, 2); x.save(); x.translate(W / 2, 214); x.rotate(Math.PI / 4); x.fillRect(-7, -7, 14, 14); x.restore();
    const wrap = (t, max) => { const out = []; String(t).split(/\n+/).forEach(par => { let line = ''; par.split(/\s+/).forEach(w => { const tr = line ? line + ' ' + w : w; if (x.measureText(tr).width > max && line) { out.push(line); line = w; } else line = tr; }); if (line) out.push(line); }); return out; };
    x.font = '500 30px ' + sans; const hl = wrap(sh.head || '', 820).slice(0, 2); hl.forEach((l, i) => x.fillText(l, W / 2, 290 + i * 40));
    const top = 290 + hl.length * 40 + 50, bot = H - (sh.ref ? 330 : 250); let fs = 60, lines = [];
    for (; fs >= 26; fs -= 2) { x.font = fs + 'px ' + serif; lines = wrap(sh.body || '', 820); if (lines.length * fs * 1.34 <= bot - top) break; }
    const lh = fs * 1.34, y0 = top + (bot - top - lines.length * lh) / 2 + fs; x.fillStyle = pal[3]; lines.forEach((l, i) => x.fillText(l, W / 2, y0 + i * lh));
    if (sh.ref) { x.fillStyle = pal[2]; x.font = 'italic 600 36px ' + serif; x.fillText(sh.ref, W / 2, H - 262); }
    x.fillStyle = pal[3]; x.globalAlpha = .8; x.font = '500 26px ' + sans; x.fillText(this.B.title, W / 2, H - 140); x.globalAlpha = 1;
    return c;
  }
  async shareImage() {
    const sh = this.state.share; if (!sh) return; this.setState({ shBusy: true });
    try {
      const c = this._shCanvas && this._shFor === sh ? this._shCanvas : await this.makeShareImg(sh);
      const blob = await new Promise(res => c.toBlob(res, 'image/png')); const f = new File([blob], 'gra-prayer.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f] }).catch(err => { if (err && err.name !== 'AbortError') throw err; }); }
      else { const u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = 'gra-prayer.png'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); this.showToast('Image saved'); }
    } catch (e) { this.showToast('Couldn’t create the image'); }
    this.setState({ shBusy: false });
  }
  sleepCycle() {
    const order = [null, 15, 30, 60, 'sec'], cur = this.state.sleep ? this.state.sleep.mode : null, nx = order[(order.indexOf(cur) + 1) % order.length];
    clearTimeout(this._slT); clearInterval(this._slI);
    if (!nx) { this.setState({ sleep: null }); return this.showToast('Sleep timer off'); }
    if (nx === 'sec') { this.setState({ sleep: { mode: 'sec' } }); return this.showToast('Stops at the end of this section'); }
    const end = Date.now() + nx * 60000; this.setState({ sleep: { mode: nx, end } }); this.showToast('Sleep timer: ' + nx + ' minutes');
    this._slT = setTimeout(() => { clearInterval(this._slI); this.setState({ sleep: null }); if (this.state.tts && this.state.tts.playing) this.ttsPause(); this.showToast('Sleep timer ended'); }, nx * 60000);
    this._slI = setInterval(() => this.forceUpdate(), 30000);
  }
  mediaSet(state) {
    const ms = typeof navigator !== 'undefined' && navigator.mediaSession; if (!ms) return;
    try {
      if (state) { ms.playbackState = state; return; }
      if (!this.ttsQ) return; const it = this.ttsQ.items[this.ttsI] || {};
      ms.metadata = new MediaMetadata({ title: this.ttsQ.title, artist: (it.kicker ? it.kicker + ' · ' : '') + this.B.title, album: 'Overcomer’s Library', artwork: [{ src: (this.inLib() ? '../' : '') + 'icon-512.png', sizes: '512x512', type: 'image/png' }] });
      ms.playbackState = 'playing';
      if (!this._msInit) { this._msInit = 1; const h = (a, f) => { try { ms.setActionHandler(a, f); } catch (e) {} };
        h('play', () => this.ttsPlay(this.ttsI || 0)); h('pause', () => this.ttsPause()); h('previoustrack', () => this.ttsStep(-1)); h('nexttrack', () => this.ttsStep(1)); h('stop', () => this.ttsStop()); }
    } catch (e) {}
  }
  copyText(t) {
    const fb = () => {
      const ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;-webkit-user-select:text;user-select:text';
      document.body.appendChild(ta); ta.focus(); ta.select(); try { ta.setSelectionRange(0, t.length); } catch (e) {}
      let ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
      ta.remove(); this.showToast(ok ? 'Prayer copied' : 'Could not copy');
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(() => this.showToast('Prayer copied'), fb); else fb();
  }
  setSetting(k, v) { const s = { ...this.state.settings, ...(typeof k === 'object' ? k : { [k]: v }) }; this.sv('settings', s); this.setState({ settings: s }, () => { this.applyTheme(); this.afterRender(); }); }
  applyTouch() { const v = this.state.ink && this.state.finger ? 'none' : ''; document.documentElement.style.touchAction = v; document.body.style.touchAction = v; }
  setInk(on) {
    const b = document.body.style; b.webkitUserSelect = b.userSelect = on ? 'none' : ''; b.webkitTouchCallout = on ? 'none' : '';
    this.setState({ ink: on, sheet: null, resume: null }, () => { this.applyTouch(); this.afterRender(); });
  }
  async unlock(e) {
    e.preventDefault();
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(this.state.pw.trim()));
    const h = [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
    if (h === this.HASH) { try { localStorage.setItem('gra-covenant-unlocked', h); } catch (err) {} this.setState({ locked: false, pwError: false, pw: '' }); }
    else this.setState({ pwError: true });
  }

  inUI(t) { return !!(t && t.closest && t.closest('[data-ink-ui]')); }
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
  inkSyncAll() {
    if (!this.inkData) return;
    Object.keys(this.inkData).forEach(id => {
      if (!this.inkData[id].length) return;
      const el = document.querySelector(`[data-ink="${id}"]`); if (!el) return;
      const svg = el.querySelector(':scope > svg[data-ink-layer]');
      if (!svg || svg._w !== el.getBoundingClientRect().width) this.inkRender(id);
    });
  }
  inkSave() { if (!this.sv('ink', this.inkData)) this.showToast('Storage is full — notes not saved'); }
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
  clearInk() {
    if (!window.confirm('Erase all pen notes in the book? This can’t be undone.')) return;
    this.inkData = {}; this.undo = []; this.inkSave();
    document.querySelectorAll('svg[data-ink-layer]').forEach(n => n.remove()); this.setState({ inkN: 0 }); this.showToast('Pen notes cleared');
  }

  ttsItems(sid) {
    if (sid.startsWith('part-')) { const pn = Number(sid.split('-')[1]), P = this.state.data[pn - 1], st = this.state.settings, verses = sc => `${sc.ref}. ${sc.verses.map(v => v.text).join(' ')}`, all = [];
      P.sections.forEach((s, si) => { if (s.kind === 'list' || s.prayers.some(x => x.link === 'weekly')) return; s.prayers.forEach((pr, i) => all.push({ pid: `s-${pn}-${si + 1}-${i + 1}`, pr })); });
      return { sid, title: P.label || P.title, items: all.map((x, k) => ({ pid: x.pid, kicker: `${P.label || 'Part ' + pn} · Prayer ${k + 1} of ${all.length}`, text: `Prayer ${k + 1}. ${x.pr.text}${st.ttsVerses && x.pr.scripture.length ? ' ' + x.pr.scripture.map(verses).join(' ') : ''}` })) }; }
    if (sid.startsWith('w-')) { const f = this.wkFind(sid), w = f.w, n = w.prayers.length; return { sid, title: 'Weekly · ' + this.wkLabel(w), items: w.prayers.map((p, i) => ({ pid: `${sid}-${i + 1}`, kicker: `Weekly · Prayer ${i + 1} of ${n}`, text: `Prayer ${i + 1}. ${p.text}` })) }; }
    const [, pn, sn] = sid.split('-').map(Number), s = this.state.data[pn - 1].sections[sn - 1], st = this.state.settings;
    const verses = sc => `${sc.ref}. ${sc.verses.map(v => v.text).join(' ')}`;
    const items = [];
    if (s.foundation.length) items.push({ pid: null, kicker: `${pn}.${sn} · Scripture foundation`, text: `${s.title}. Scripture foundation. ${s.foundation.map(verses).join(' ')}` });
    s.prayers.forEach((pr, i) => items.push({ pid: `${sid}-${i + 1}`, kicker: `${pn}.${sn} · Prayer ${i + 1} of ${s.prayers.length}`,
      text: `Prayer ${i + 1}. ${pr.text}${st.ttsVerses && pr.scripture.length ? ' ' + pr.scripture.map(verses).join(' ') : ''}` }));
    return { sid, title: s.title, items };
  }
  ttsStart(sid, pid) {
    const q = this.ttsItems(sid); let i = 0;
    if (pid) i = Math.max(0, q.items.findIndex(x => x.pid === pid));
    this.ttsQ = q; this.ttsPlay(i); this.logUse('open', sid);
  }
  ttsChunks(t) {
    const out = []; let cur = '';
    (t.match(/[^.!?;:]+[.!?;:]+["’”)]*\s*|[^.!?;:]+$/g) || [t]).forEach(s => { if ((cur + s).length > 220 && cur) { out.push(cur); cur = s; } else cur += s; });
    if (cur.trim()) out.push(cur); return out;
  }
  ttsPlay(i) {
    const ss = window.speechSynthesis; if (!ss || !this.ttsQ) return;
    const tok = ++this.ttsTok || (this.ttsTok = 1); ss.cancel();
    const it = this.ttsQ.items[i]; if (!it) return this.ttsAdvance();
    this.ttsI = i; this.setState({ tts: { sid: this.ttsQ.sid, pid: it.pid, i, playing: true } }); this.mediaSet();
    const el = it.pid ? this.pgEl(it.pid) : this.pgEl(this.ttsQ.sid);
    const hdr = document.querySelector('[data-hdr]');
    if (el) window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - (hdr ? hdr.offsetHeight : 60) - 12, behavior: 'smooth' });
    const st = this.state.settings, voices = ss.getVoices(), v = this.bestVoice();
    const chunks = this.ttsChunks(it.text); let k = 0;
    const next = () => {
      if (tok !== this.ttsTok) return;
      if (k >= chunks.length) { if (st.ttsMark !== false && it.pid && !this.state.prayed[it.pid]) this.setMany([it.pid], true); const g = (st.ttsGap || 0) * 1000; if (g) { setTimeout(() => { if (tok === this.ttsTok) this.ttsPlay(i + 1); }, g); return; } return this.ttsPlay(i + 1); }
      const u = new SpeechSynthesisUtterance(chunks[k++]); u.rate = st.rate || 1; u.lang = v ? v.lang : this.ttsLang(); if (v) u.voice = v;
      u.onend = next; u.onerror = e => { if (tok === this.ttsTok && e.error !== 'interrupted' && e.error !== 'canceled') next(); };
      ss.speak(u);
    };
    next();
  }
  ttsAdvance() {
    if (this.state.sleep && this.state.sleep.mode === 'sec') { this.setState({ sleep: null }); this.ttsStop(); this.showToast('Sleep timer: finished this section'); return; }
    if (this.ttsQ && this.ttsQ.sid.startsWith('w-')) { this.ttsStop(); this.showToast('Finished this week’s prayers'); return; }
    const sid = this.ttsQ && this.ttsQ.sid, idx = this.flat ? this.flat.findIndex(s => s.id === sid) : -1, nx = idx >= 0 && this.flat[idx + 1];
    if (nx) { this.ttsQ = this.ttsItems(nx.id); this.ttsPlay(0); } else { this.ttsStop(); this.showToast('Finished reading the book'); }
  }
  ttsStop() { this.ttsTok = (this.ttsTok || 0) + 1; try { window.speechSynthesis.cancel(); } catch (e) {} this.ttsQ = null; clearTimeout(this._slT); clearInterval(this._slI); this.mediaSet('none'); this.setState({ tts: null, sleep: null, npOpen: false }); }
  npVals() {
    const S = this.state, st = S.settings || {}, t = S.tts, q = this.ttsQ, items = q ? q.items : [], i = Math.max(0, Math.min(items.length - 1, this.ttsI || 0)), it = items[i] || {};
    const P = { covenant: ['#25685d', '#11372f', '#d9c27e'], jcfp: ['#8e2d3a', '#561620', '#dcb86c'], weekly: ['#33407a', '#171d40', '#e6c47a'] }[this.B.key] || ['#33407a', '#171d40', '#e6c47a'];
    const v = window.speechSynthesis && (window.speechSynthesis.getVoices() || []).find(x => x.voiceURI === st.voice);
    return this.npBuild({ on: !!t && !!items.length, items: items.map(x => x.text), i, playing: !!(t && t.playing), unit: 'prayer',
      toggle: () => (t && t.playing ? this.ttsPause() : this.ttsPlay(i)), prev: () => this.ttsStep(-1), next: () => this.ttsStep(1), stop: () => this.ttsStop(),
      rate: st.rate, rateNext: () => { const o = [0.8, 1, 1.2, 1.4], n = o[(o.indexOf(st.rate || 1) + 1) % o.length]; this.setSetting('rate', n); if (t && t.playing) setTimeout(() => this.ttsPlay(this.ttsI || 0), 30); },
      sleepLabel: !S.sleep ? '' : S.sleep.mode === 'sec' ? 'End of section' : S.sleep.mode + ' min', sleepNext: () => this.sleepCycle(), toast: m => this.showToast(m),
      ref: it.kicker || '', title: q ? q.title : '', sub: this.B.title, voice: v ? v.name : '', text: it.text || '',
      coverBg: `linear-gradient(105deg, rgba(255,255,255,.12), transparent 36%), radial-gradient(130% 95% at 30% 18%, ${P[0]}, ${P[1]} 72%)`, coverInk: P[2], coverTitle: this.B.title, mark: '' });
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
  ttsPause() { this.ttsTok = (this.ttsTok || 0) + 1; try { window.speechSynthesis.cancel(); } catch (e) {} this.mediaSet('paused'); this.setState(s => ({ tts: s.tts && { ...s.tts, playing: false } })); }
  ttsStep(d) {
    if (!this.ttsQ) return; const i = this.ttsI + d;
    if (i < 0) { const idx = this.flat.findIndex(s => s.id === this.ttsQ.sid), pv = this.flat[idx - 1]; if (pv) { this.ttsQ = this.ttsItems(pv.id); this.ttsPlay(this.ttsQ.items.length - 1); } else this.ttsPlay(0); return; }
    if (i >= this.ttsQ.items.length) return this.ttsAdvance();
    this.ttsPlay(i);
  }
  speakChunk(text, done, tok) {
    const ss = window.speechSynthesis, st = this.state.settings, v = this.bestVoice();
    const u = new SpeechSynthesisUtterance(text); u.rate = st.rate || 1; u.lang = v ? v.lang : this.ttsLang(); if (v) u.voice = v;
    u.onend = done; u.onerror = e => { if (tok === this.ttsTok && e.error !== 'interrupted' && e.error !== 'canceled') done(); };
    ss.speak(u);
  }
  sessSpeak() {
    const ss = this.state.sess, sy = window.speechSynthesis; if (!ss || ss.done || !sy) return;
    const tok = this.ttsTok = (this.ttsTok || 0) + 1; sy.cancel();
    const pr = this.secOf(ss.sid).prayers[ss.i], st = this.state.settings, key = ss.sid + ':' + ss.i;
    const verses = sc => `${sc.ref}. ${sc.verses.map(v => v.text).join(' ')}`;
    const chunks = this.ttsChunks(pr.text + (st.ttsVerses && pr.scripture.length ? ' ' + pr.scripture.map(verses).join(' ') : ''));
    let k = 0;
    const next = () => {
      if (tok !== this.ttsTok || !this.state.sessRead) return;
      if (k >= chunks.length) {
        setTimeout(() => { const s2 = this.state.sess; if (tok === this.ttsTok && this.state.sessRead && s2 && s2.sid + ':' + s2.i === key) this.sessMove(1); }, (st.ttsGap || 0) * 1000 + 700);
        return;
      }
      this.speakChunk(chunks[k++], next, tok);
    };
    next();
  }
  histStats(h) {
    const days = Object.keys(h || {}).filter(k => h[k] && h[k].length).sort(), set = new Set(days);
    let cur = 0; const d = new Date(); if (!set.has(this.dkey(d))) d.setDate(d.getDate() - 1);
    while (set.has(this.dkey(d))) { cur++; d.setDate(d.getDate() - 1); }
    let best = 0, run = 0, prev = null;
    days.forEach(k => { const [y, m, dd] = k.split('-').map(Number), t = Math.round(Date.UTC(y, m - 1, dd) / 864e5); run = prev != null && t - prev === 1 ? run + 1 : 1; prev = t; if (run > best) best = run; });
    return { cur, best, days: days.length };
  }
  logUse(kind, refs) {
    if (!this.B.usage) return;
    if (!this.sbOn() || this.state.settings.usage === false) return;
    const m = this.maps || {}, f = kind === 'pray' ? m.pu : kind === 'open' ? m.su : null;
    const q = this.ld('uq', {}), t = this.dkey(); [].concat(refs).map(r => (f && f[r]) || r).forEach(r => { const k = `${t}|${kind}|${r}`; q[k] = (q[k] || 0) + 1; });
    this.sv('uq', q); clearTimeout(this._ut); this._ut = setTimeout(() => this.flushUse(), 60000);
  }
  async flushUse() {
    if (this._flushing || !this.sbOn() || navigator.onLine === false) return;
    const q = this.ld('uq', {}), keys = Object.keys(q).slice(0, 400); if (!keys.length) return;
    if (this.state.settings.usage === false) { try { localStorage.removeItem('gra-covenant-uq'); } catch (e) {} return; }
    this._flushing = true;
    try {
      const sb = await this.loadSb();
      const events = keys.map(k => { const [d, kk, r] = k.split('|'); return { d, k: kk, r, n: Math.min(100, q[k]) }; });
      const { error } = await sb.rpc('log_usage', { events });
      if (!error) { const q2 = this.ld('uq', {}); keys.forEach(k => { q2[k] = (q2[k] || 0) - q[k]; if (q2[k] <= 0) delete q2[k]; }); this.sv('uq', q2); }
    } catch (e) {}
    this._flushing = false;
  }
  wkId(w) { return 'w-' + w.week_of.replace(/-/g, ''); }
  wkLabel(w) { return this.fmt(w.week_of, { day: 'numeric', month: 'long', year: 'numeric' }); }
  wkFind(pid) {
    const m = /^w-(\d{8})(?:-(\d+))?$/.exec(pid || ''); if (!m) return null;
    const w = (this.state.weeks || []).find(x => x.week_of.replace(/-/g, '') === m[1]); if (!w) return null;
    const n = m[2] ? Number(m[2]) : 0; return { w, n, pr: n ? w.prayers[n - 1] : null };
  }
  wkGo(pid) {
    const f = this.wkFind(pid); if (!f) return this.showToast('That week is no longer available');
    const cur = (this.state.weeks || [])[0];
    this.setState({ wkSel: f.w === cur ? null : f.w.week_of, wkOpen: true }, () => this.goto(f.n ? pid : 'weekly'));
  }
  async loadWeekly() {
    if (!this.state.weeks) { const c = this.ld('weekly', null); if (c) this.setState({ weeks: c }); }
    if (!this.sbOn() || navigator.onLine === false || this._wkLoading) return;
    this._wkLoading = true;
    try {
      const sb = await this.loadSb();
      const { data, error } = await sb.from('weekly_prayers').select('week_of, title, intro, prayers, closing').not('publish_at', 'is', null).lte('publish_at', new Date().toISOString()).order('week_of', { ascending: false });
      if (!error && Array.isArray(data)) { this.sv('weekly', data); this.setState({ weeks: data }, () => this.afterRender()); }
    } catch (e) {}
    this._wkLoading = false;
  }
  wkPrayToday(w) {
    const wid = this.wkId(w), ids = w.prayers.map((_, i) => wid + '-' + (i + 1)), t = this.dkey(), h = { ...this.state.hist }, have = new Set(h[t] || []);
    const done = ids.length > 0 && ids.every(x => have.has(x));
    if (done) { h[t] = (h[t] || []).filter(x => !ids.includes(x)); if (!h[t].length) delete h[t]; } else h[t] = [...new Set([...(h[t] || []), ...ids])];
    this.sv('hist', h); this.setState({ hist: h }); this.showToast(done ? 'Removed from today' : 'Counted toward today');
  }
  weeklyVals() {
    const S = this.state, weeks = (this.B.weeklyCard && S.weeks) || [], onBg = 'var(--color-accent-100)', on = 'var(--color-accent-700)';
    if (!weeks.length) return { wkHas: false, wkShown: [], wkWeeks: [], wkNone: true, isWeekly: S.sheet === 'weekly' };
    const cur = weeks[0], w = weeks.find(x => x.week_of === S.wkSel) || cur, wid = this.wkId(w), open = !!S.wkOpen || !!S.ink || !!S.exporting;
    const ids = w.prayers.map((_, i) => wid + '-' + (i + 1)), today = new Set((S.hist || {})[this.dkey()] || []), prayedToday = ids.length > 0 && ids.every(x => today.has(x));
    const head = 'GRA Weekly Kingdom Prayers · ' + this.wkLabel(w);
    const list = w.prayers.map((p, i) => {
      const pid = ids[i], fav = !!S.fav[pid], reading = !!S.tts && S.tts.pid === pid;
      return { id: pid, n: i + 1, text: p.text, ref: p.ref || '', hasRef: !!p.ref,
        starFill: fav ? 'currentColor' : 'none', starColor: fav ? 'var(--color-accent)' : 'var(--color-neutral-600)', starLabel: fav ? 'Remove from favorites' : 'Add to favorites',
        readBg: reading ? onBg : 'transparent', readColor: reading ? on : 'var(--color-neutral-600)',
        toggleFav: () => this.toggleFav(pid), listen: () => this.setState({ wkOpen: true }, () => this.ttsStart(wid, pid)),
        share: () => this.setState({ sheet: 'share', share: this.shareData('Prayer ' + (i + 1), head, { text: p.text, scripture: p.ref ? [{ ref: p.ref, verses: [] }] : [] }) }), openRef: () => this.openVerse(p.ref) };
    });
    const isBm = !!S.bm[wid];
    return { wkHas: true, wkInk: wid, wkBadge: w === cur ? 'This week' : 'Past week', wkDate: 'Week of ' + this.wkLabel(w),
      wkHasTitle: !!w.title && !/^\s*(gra\s+)?weekly kingdom prayers\s*$/i.test(w.title), wkTitle: w.title || '', wkHasIntro: !!w.intro, wkIntro: w.intro || '',
      wkShown: open ? list : list.slice(0, 2), wkCollapsed: !open && list.length > 2, wkMoreLabel: 'Show all ' + list.length + ' prayers',
      wkHasClosing: open && !!w.closing, wkClosing: w.closing || '', wkLessShow: open && list.length > 2 && !S.ink, wkToggle: () => this.setState({ wkOpen: !S.wkOpen }),
      wkIsPast: w !== cur, wkBackCur: () => this.setState({ wkSel: null }, () => this.goto('weekly', true)),
      wkListen: () => this.setState({ wkOpen: true }, () => this.ttsStart(wid)),
      wkBmFill: isBm ? 'currentColor' : 'none', wkBmLabel: isBm ? 'Bookmarked' : 'Bookmark', wkToggleBm: () => this.toggleBm(wid),
      wkPrayedToday: prayedToday, wkPrayLabel: prayedToday ? 'Prayed today' : 'I prayed these today', wkPrayColor: prayedToday ? on : 'inherit', wkPrayOp: prayedToday ? 1 : 0,
      wkPray: () => this.wkPrayToday(w), wkPast: () => this.setState({ sheet: 'weekly', resume: null }),
      isWeekly: S.sheet === 'weekly', wkNone: false,
      wkWeeks: weeks.map((x, i) => ({ label: this.wkLabel(x), n: x.prayers.length + (x.prayers.length === 1 ? ' prayer' : ' prayers'), isCur: i === 0, bg: x === w ? onBg : 'transparent',
        go: () => this.setState({ wkSel: i === 0 ? null : x.week_of, wkOpen: true }, () => this.goto('weekly')) })) };
  }
  prAt(pid) {
    if (pid.startsWith('w-')) { const f = this.wkFind(pid); if (!f || !f.pr) throw new Error('gone'); return { sec: { title: 'Weekly · ' + this.wkLabel(f.w) }, pr: { text: f.pr.text, scripture: [] }, num: 'W' + f.n }; }
    const [, p, s, n] = pid.split('-').map(Number), sec = this.state.data[p - 1].sections[s - 1]; return { sec, pr: sec.prayers[n - 1], num: `${p}.${s}.${n}` }; }
  exportJournal() {
    const de = document.documentElement; de.setAttribute('data-theme', 'light'); de.setAttribute('data-exporting', '');
    this.setState({ exporting: true, sheet: null, resume: null }, () => window.scrollTo(0, 0));
  }
  endExport() { document.documentElement.removeAttribute('data-exporting'); this.setState({ exporting: false }, () => { this.applyTheme(); this.afterRender(); }); }
  exportBook() {
    this.setState({ sheet: null, resume: null }, () => { document.documentElement.setAttribute('data-theme', 'light'); this.afterRender(); setTimeout(() => window.print(), 250); });
  }
  searchVals(parts) {
    const S = this.state, raw = S.q.trim(), th = S.sTheme && this.THEMES.find(t => t[0] === S.sTheme);
    const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let re = null, test = null;
    if (th) { re = new RegExp(`\\b(?:${th[1].map(esc).join('|')})[\\w’']*`, 'gi'); test = h => { re.lastIndex = 0; return re.test(h); }; }
    else if (raw.length > 1) {
      const toks = []; raw.replace(/["“”]([^"“”]+)["“”]|(\S+)/g, (m, a, b) => { const t = (a || b || '').toLowerCase().trim(); if (t) toks.push(t); return m; });
      if (toks.length) { re = new RegExp(`(?:${toks.map(esc).join('|')})`, 'gi'); test = h => toks.every(t => h.includes(t)); }
    }
    const results = [];
    if (test) for (const p of parts) for (const s of p.sections) {
      if (!th && test(s.title.toLowerCase())) results.push({ num: s.num, where: p.label, text: s.title, go: s.go });
      for (const pr of s.prayers) {
        const inText = th ? test(pr.text) : test(pr.text.toLowerCase());
        const inScr = !inText && !th && test((pr.text + ' ' + pr.scripture.map(x => x.ref + ' ' + x.verses.map(v => v.text).join(' ')).join(' ')).toLowerCase());
        if (inText || inScr) results.push({ num: `${s.num}.${pr.n}`, where: s.title, text: pr.text, scr: inScr ? pr.scripture.map(x => x.ref).join(' · ') : '', go: () => this.goto(pr.id) });
      }
    }
    const plain = 'transparent', mark = 'var(--color-accent-200)';
    const segs = text => {
      if (!re) return [{ t: text, bg: plain }];
      re.lastIndex = 0; let m; const rg = [];
      while ((m = re.exec(text)) && rg.length < 40) { if (!m[0].length) { re.lastIndex++; continue; } rg.push([m.index, m.index + m[0].length]); }
      const start = rg.length && rg[0][0] > 110 ? text.lastIndexOf(' ', rg[0][0] - 50) + 1 : 0;
      const out = []; let pos = start; if (start > 0) out.push({ t: '… ', bg: plain });
      rg.forEach(([a, b]) => { if (a < pos) return; if (a > pos) out.push({ t: text.slice(pos, a), bg: plain }); out.push({ t: text.slice(a, b), bg: mark }); pos = b; });
      if (pos < text.length) out.push({ t: text.slice(pos), bg: plain });
      return out;
    };
    const n = results.length;
    return {
      results: results.slice(0, 200).map(r => ({ ...r, segs: segs(r.text), hasSub: !!r.scr, sub: r.scr ? `Found in ${r.scr}` : '' })),
      resultLabel: th ? `${n} ${n === 1 ? 'prayer' : 'prayers'} on ${th[0].toLowerCase()}${n > 200 ? ' · first 200 shown' : ''}` : raw.length < 2 ? 'Use quotes for an exact phrase' : n ? `${n} ${n === 1 ? 'match' : 'matches'}${n > 200 ? ' · first 200 shown' : ''}` : 'No matches',
      themeChips: this.THEMES.map(([name]) => { const a = S.sTheme === name; return { label: name, on: a, bg: a ? 'var(--color-accent-100)' : 'transparent', border: a ? 'var(--color-accent)' : 'var(--color-divider)', color: a ? 'var(--color-accent-700)' : 'var(--color-text)',
        pick: () => { this.setState({ sTheme: a ? null : name, q: '' }); if (!a) this.logUse('search', name); } }; })
    };
  }
  historyVals() {
    const S = this.state, h = S.hist || {}, now = new Date(), st = this.histStats(h), today = this.dkey();
    const [y, m] = S.histMonth || [now.getFullYear(), now.getMonth()];
    const first = new Date(y, m, 1), nd = new Date(y, m + 1, 0).getDate(), sel = S.histSel || today;
    const cells = []; for (let i = 0; i < first.getDay(); i++) cells.push({ blank: true, vis: 'hidden', num: '', bg: 'transparent', border: 'transparent', ring: 'none', color: 'inherit', aria: '', sel: false, pick: () => {} });
    let monthN = 0;
    for (let d = 1; d <= nd; d++) {
      const k = this.dkey(new Date(y, m, d)), c = (h[k] || []).length, isSel = k === sel, fut = k > today; monthN += c;
      const lvl = c === 0 ? 0 : c < 5 ? 1 : c < 15 ? 2 : 3;
      cells.push({ blank: fut, vis: 'visible', num: d, sel: isSel, aria: `${this.fmt(k, { weekday: 'long', day: 'numeric', month: 'long' })}: ${c} ${c === 1 ? 'prayer' : 'prayers'}`,
        bg: ['transparent', 'var(--color-accent-100)', 'var(--color-accent-200)', 'var(--color-accent-300)'][lvl],
        border: k === today ? 'var(--color-accent)' : lvl ? 'var(--color-accent-300)' : 'var(--color-divider)', ring: isSel ? '0 0 0 2px var(--color-accent-700)' : 'none',
        color: fut ? 'var(--color-neutral-400)' : lvl ? 'var(--color-accent-900)' : 'var(--color-text)', pick: () => this.setState({ histSel: k }) });
    }
    const ids = h[sel] || [], list = S.data ? ids.slice(0, 80).map(pid => { try { const { sec, pr, num } = this.prAt(pid); return { num, where: sec.title, text: pr.text, go: () => pid.startsWith('w-') ? this.wkGo(pid) : this.goto(pid) }; } catch (e) { return null; } }).filter(Boolean) : [];
    const isCur = y === now.getFullYear() && m === now.getMonth();
    return { isHistory: S.sheet === 'history', hStreak: st.cur, hBest: st.best, hDays: st.days, hMonth: monthN, hasStreak: st.cur > 0, dayStreak: st.cur,
      histMonthLabel: first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
      histPrev: () => this.setState({ histMonth: m === 0 ? [y - 1, 11] : [y, m - 1] }), histNext: () => { if (!isCur) this.setState({ histMonth: m === 11 ? [y + 1, 0] : [y, m + 1] }); },
      histNoNext: isCur, histNextOp: isCur ? 0.3 : 1, histWd: ['S', 'M', 'T', 'W', 'T', 'F', 'S'], histCells: cells,
      histSelLabel: sel === today ? 'Today' : this.fmt(sel, { weekday: 'long', day: 'numeric', month: 'long' }),
      histSelCount: `${ids.length} ${ids.length === 1 ? 'prayer' : 'prayers'}`, histSelEmpty: !ids.length, histSelList: list, histMore: ids.length > 80, histMoreText: `and ${ids.length - 80} more`,
      openHistory: () => this.setState({ sheet: S.sheet === 'history' ? null : 'history', histMonth: null, histSel: null, resume: null, planEdit: false }) };
  }
  exportVals(favList, bmList) {
    const S = this.state; if (!S.exporting) return { exporting: false };
    const h = S.hist || {}, st = this.histStats(h), days = Object.keys(h).filter(k => h[k].length).sort().reverse();
    const ink = Object.entries(this.inkData || {}).filter(([, l]) => l && l.length).map(([id, l]) => {
      const f = this.flatById && this.flatById[id];
      return { label: f ? `${f.num} · ${f.title}` : id === 'title' ? 'Title page' : id === 'contents' ? 'Table of Contents' : id.startsWith('w-') ? 'Weekly · ' + id.slice(2, 6) + '-' + id.slice(6, 8) + '-' + id.slice(8, 10) : id.replace('part-', 'Part '), n: `${l.length} ${l.length === 1 ? 'mark' : 'marks'}` };
    });
    return { exporting: true, expDate: new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }),
      expWho: (this.user && this.user.email) || '', expHasWho: !!this.user, expPrayed: Object.keys(S.prayed).length, expDays: st.days, expStreak: st.cur, expBest: st.best,
      expFavs: favList, expHasFavs: favList.length > 0, expBms: bmList, expHasBms: bmList.length > 0,
      expHist: days.map(k => ({ date: this.fmt(k, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }), n: h[k].length, nums: h[k].map(id => id.startsWith('w-') ? 'W' + id.split('-')[2] : id.slice(2).replace(/-/g, '.')).join(', ') })), expHasHist: days.length > 0,
      expInk: ink, expHasInk: ink.length > 0, printNow: () => window.print(), closeExport: () => this.endExport() };
  }
  authVals(seg) {
    const S = this.state, am = S.aMode || 'in', cfg = this.sbOn(), up = am === 'up', inn = am === 'in';
    const ti = seg(inn), tu = seg(up);
    const ago = S.syncAt ? Math.round((Date.now() - S.syncAt) / 60000) : null;
    const syncLabel = { syncing: 'Syncing…', offline: 'Offline. Changes will sync when you’re back online.', error: 'Couldn’t sync. Tap Sync now to retry.' }[S.sync]
      || (S.sync === 'ok' ? `Synced ${ago < 1 ? 'just now' : ago === 1 ? '1 minute ago' : ago < 60 ? `${ago} minutes ago` : 'over an hour ago'}` : 'Progress syncs across your devices');
    return {
      legacyGate: !cfg, authGate: cfg, aTabs: inn || up, goIn: () => this.setState({ aMode: 'in', aErr: '', aMsg: '' }), goUp: () => this.setState({ aMode: 'up', aErr: '', aMsg: '' }),
      goReset: () => this.setState({ aMode: 'reset', aErr: '', aMsg: '' }),
      tabInBg: ti.bg, tabInColor: ti.color, tabUpBg: tu.bg, tabUpColor: tu.color,
      aHasHeading: !inn && !up, aHeading: { code: 'One more step', reset: 'Reset your password', newpw: 'Choose a new password', guest: 'Use an access code' }[am] || '',
      aSub: { code: 'Enter the registration code from GRA to open the book on this account.', reset: 'We’ll email you a link to set a new password.', newpw: 'Use at least 8 characters.', guest: 'Your progress, bookmarks and notes will be saved on this device only and won’t sync to your other devices.' }[am] || '',
      aShowName: up, aShowEmail: inn || up || am === 'reset', aShowPw: inn || up || am === 'newpw', aShowCode: up || am === 'code' || am === 'guest',
      aCodeLabel: am === 'guest' ? 'Access code' : 'Registration code',
      aShowGuestLink: inn || up, goGuest: () => this.setState({ aMode: 'guest', aErr: '', aMsg: '' }),
      guestOn: cfg && !this.user && this.isGuest(),
      guestToAccount: () => this.setState({ locked: true, sheet: null, aMode: 'up', aErr: '', aMsg: '' }),
      aPwLabel: am === 'newpw' ? 'New password' : 'Password', aPwAuto: inn ? 'current-password' : 'new-password',
      aSubmitLabel: S.aBusy ? 'Please wait…' : ({ in: 'Sign in', up: 'Create account', code: 'Continue', reset: 'Send reset link', newpw: 'Save password', guest: 'Open the book' }[am]),
      aBusy: !!S.aBusy, aShowForgot: inn, aShowOAuth: (inn || up) && this.SB_PROVIDERS.length > 0, aUpNote: up, aShowSignOut: am === 'code', aShowBack: am === 'reset' || am === 'guest',
      providers: this.SB_PROVIDERS.map(([id, name]) => ({ label: `${up ? 'Sign up' : 'Continue'} with ${name}`, go: () => this.oauth(id) })),
      aHasErr: !!S.aErr, aErr: S.aErr || '', aHasMsg: !!S.aMsg, aMsg: S.aMsg || '',
      aEmail: S.aEmail || '', aPw: S.aPw || '', aName: S.aName || '', aCode: S.aCode || '',
      aInput: e => this.setState({ [e.target.name]: e.target.value, aErr: '' }), authSubmit: e => this.authSubmit(e),
      signOutQuiet: () => this.signOutQuiet(), signOut: () => this.signOut(),
      acctOn: cfg && !!this.user, acctEmail: S.acctEmail || (this.user && this.user.email) || '', syncLabel, syncNow: () => this.pull()
    };
  }
  sessTimerVals(T, mm, ss) {
    const S = this.state, run = S.sessRun || 'stopped', on = 'var(--color-accent-700)';
    const fmtP = s => s < 60 ? `${s}s` : s % 60 ? mm(s) : `${s / 60}m`;
    const presets = [0, 30, 60, 120, 180, 300, 600, 900];
    const auto = S.settings.sessAuto !== false, chime = S.settings.sessChime !== false;
    const playing = run === 'running';
    return {
      sessTimerOn: T > 0 && !ss.done, sessShowPlay: !playing, sessShowPause: playing,
      sessPPLabel: playing ? 'Pause timer' : 'Start timer', sessPPText: playing ? 'Pause' : run === 'paused' ? 'Resume' : 'Start',
      sessPlayPause: () => {
        if (!T) return;
        if (!playing) this.unlockAudio();
        if (playing) return this.setState({ sessRun: 'paused' });
        if (run === 'paused') return this.setState({ sessRun: 'running' });
        this.sessResetTimer('running');
      },
      sessReset: () => this.sessResetTimer(run === 'done' ? 'stopped' : run),
      sessStop: () => { clearInterval(this._st); this.setState({ sessRun: 'stopped', sessLeft: T }); this._st = null; this.sessResetTimer('stopped'); },
      sessNoTimer: !T, sessCantStop: !T || run === 'stopped',
      sessStateLabel: !T ? 'Off' : { running: 'Running', paused: 'Paused', stopped: 'Ready. Tap Start', done: 'Time’s up' }[run],
      sessTimerOpen: !!S.sessTimerOpen, sessTimerToggle: () => this.setState({ sessTimerOpen: !S.sessTimerOpen }), sessTimerClose: () => this.setState({ sessTimerOpen: false }),
      stopProp: e => e.stopPropagation(),
      sessTimerLabel: T ? mm(run === 'stopped' ? T : (S.sessLeft != null ? S.sessLeft : T)) : 'Timer',
      sessTimerColor: T ? on : 'var(--color-neutral-700)', sessTimerBorder: T ? 'var(--color-accent-300)' : 'transparent',
      sessPresets: presets.map(v => ({ label: v ? fmtP(v) : 'Off', pick: () => this.sessSetDur(v), bg: T === v ? 'var(--color-accent-100)' : 'transparent', border: T === v ? 'var(--color-accent)' : 'var(--color-divider)', color: T === v ? on : 'var(--color-text)' })),
      sessDurLabel: T ? mm(T) : '0:00',
      sessMinus60: () => this.sessSetDur(T - 60 < 15 && T > 15 ? 15 : T - 60), sessMinus15: () => this.sessSetDur(T - 15),
      sessPlus15: () => this.sessSetDur(T + 15), sessPlus60: () => this.sessSetDur(T + 60),
      sessToggleAuto: () => this.setSetting('sessAuto', !auto),
      sessToggleChime: () => { if (!chime) this.unlockAudio(); this.setSetting('sessChime', !chime); },
      sessChimeBg: chime ? 'var(--color-accent-100)' : 'transparent', sessChimeBorder: chime ? 'var(--color-accent)' : 'var(--color-neutral-400)', sessChimeOp: chime ? 1 : 0,
      sessAutoBg: auto ? 'var(--color-accent-100)' : 'transparent', sessAutoBorder: auto ? 'var(--color-accent)' : 'var(--color-neutral-400)', sessAutoOp: auto ? 1 : 0
    };
  }
  sessVals() {
    const S = this.state, ss = S.sess, st = S.settings, T = S.sessDur || 0;
    if (!ss || !S.data) return { sessOn: false };
    const mm = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    const base = { sessOn: true, sessDone: !!ss.done, sessNotDone: !ss.done, sessCount: ss.count, sessClose: () => this.sessClose(),
      sessNext: () => this.sessMove(1), sessPrev: () => this.sessMove(-1), sessRef: el => { this.sessEl = el; },
      sessTS: e => { const t = e.touches[0]; this._sx = t.clientX; this._sy = t.clientY; },
      sessTE: e => { if (this._sx == null) return; const t = e.changedTouches[0], dx = t.clientX - this._sx, dy = t.clientY - this._sy; this._sx = null; if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) this.sessMove(dx < 0 ? 1 : -1); },
      ...this.sessTimerVals(T, mm, ss) };
    if (ss.done) return { ...base, sessKicker: 'Focused Mode complete', sessPct: '100%', sessTitle: '', sessText: '', sessScr: [], sessShowScr: false };
    if (ss.sid === 'wk') { const sec = this.secOf('wk'), N = sec.prayers.length, pr = sec.prayers[ss.i] || { text: '', scripture: [] }; return { ...base, sessKicker: `Weekly Kingdom Prayers · ${ss.i + 1} of ${N}`, sessTitle: sec.title, sessText: pr.text, sessScr: pr.scripture, sessShowScr: pr.scripture.length > 0, sessPct: `${N ? (ss.i + 1) / N * 100 : 100}%` }; }
    const [, p, s] = ss.sid.split('-').map(Number), sec = this.secOf(ss.sid), pr = sec.prayers[ss.i];
    const pos = this.flat.findIndex(x => x.id === ss.sid), totalSec = this.flat.length;
    return { ...base, sessKicker: this.B.key === 'jcfp' ? this.jcfpPos(p, s, ss.i) : `${p}.${s} · Prayer ${ss.i + 1} of ${sec.prayers.length}`, sessTitle: sec.title, sessText: pr.text,
      sessScr: pr.scripture, sessShowScr: st.verses && pr.scripture.length > 0, sessPct: `${((pos + (ss.i + 1) / sec.prayers.length) / totalSec) * 100}%` };
  }
  renderVals() {
    const S = this.state, st = S.settings, showChecks = this.props.showChecks ?? true, admin = !!S.isAdmin && !!this.user;
    const on = 'var(--color-accent-700)', off = 'var(--color-neutral-700)', onBg = 'var(--color-accent-100)';
    const seg = a => ({ bg: a ? onBg : 'transparent', color: a ? on : 'var(--color-text)' });
    const ring = f => `${(f * this.C).toFixed(2)} ${this.C}`;
    const tc = s => s.toLowerCase().replace(/(^|[\s(—-])([a-z])/g, (m, a, b) => a + b.toUpperCase())
      .replace(/ (And|Of|The|In|For|To) /g, (m, w) => ' ' + w.toLowerCase() + ' ').replace(/Gra\b/g, 'GRA').replace(/God'S/g, "God's");
    const plan = S.plan && this.flat ? S.plan : null;
    const gp = this.B.gplan ? (S.gp || this.gpEnsure(this.gpLoad())) : null, gpT = gp && gp.today && gp.today.d === this.gpDk() ? gp.today.ids : [];
    const todayIds = gpT.filter(x => x.startsWith(this.B.key + ':s-')).map(x => x.split(':')[1]);
    let total = 0, count = 0; const favList = [], bmList = [];
    const J = this.B.key === 'jcfp', wkPi = J ? (S.data || []).reduce((a, p, i) => p.sections.some(x => x.kind !== 'list') ? i : a, -1) : -1;
    const parts = (S.data || []).map((p, pi) => {
      const n = pi + 1; let pCount = 0, pDone = 0;
      let run = 0; const pIds = []; const sections = p.sections.map((s, si) => {
        if (J && s.prayers.some(x => x.link === 'weekly')) return null;
        const id = `s-${n}-${si + 1}`, num = `${n}.${si + 1}`, runStart = run + 1; let done = 0;
        const prayers = s.prayers.map((pr, i) => {
          const pid = `${id}-${i + 1}`, pnum = `${num}.${i + 1}`, checked = !!S.prayed[pid], fav = !!S.fav[pid];
          if (checked) done++;
          if (fav) favList.push({ num: pnum, where: s.title, text: pr.text, go: () => this.goto(pid), hasSub: false, sub: '', refs: pr.scripture.map(x => x.ref).join(' · '), hasRefs: pr.scripture.length > 0 });
          return { id: pid, n: J ? ++run : i + 1, text: pr.text, scripture: pr.scripture.map(sc => ({ ...sc, open: () => this.openVerse(sc.ref, sc.verses) })), showScripture: pr.scripture.length > 0 && (st.verses || !pr.scripture.some(sc => sc.verses && sc.verses.length)), checked, isLink: pr.link === 'weekly',
            showRefs: !st.verses && pr.scripture.some(sc => sc.verses && sc.verses.length), refs: st.verses ? [] : pr.scripture.map(sc => ({ ref: sc.ref, open: () => this.setState({ sheet: 'verse', verse: sc }) })),
            ckBg: checked ? onBg : 'transparent', ckBorder: checked ? 'var(--color-accent)' : 'var(--color-neutral-400)', ckOp: checked ? 1 : 0,
            ckLabel: checked ? 'Prayed — tap to undo' : 'Mark as prayed', toggle: () => this.toggle(pid),
            starFill: fav ? 'currentColor' : 'none', starColor: fav ? 'var(--color-accent)' : 'var(--color-neutral-600)', starLabel: fav ? 'Remove from favorites' : 'Add to favorites',
            readBg: S.tts && S.tts.pid === pid ? onBg : 'transparent', readColor: S.tts && S.tts.pid === pid ? on : 'var(--color-neutral-600)',
            listen: () => this.ttsStart(id, pid), focus: () => this.sessOpen(id, Number(pid.split('-')[3]) - 1),
            toggleFav: () => this.toggleFav(pid), share: () => this.setState({ sheet: 'share', share: this.shareData(pnum, s.title, pr) }) };
        });
        total += prayers.length; count += done; pCount += prayers.length; pDone += done; if (s.kind !== 'list') pIds.push(...prayers.map(x => x.id));
        const nP = prayers.length, f = nP ? done / nP : 0, allDone = nP > 0 && done === nP, ids = prayers.map(x => x.id), isBm = !!S.bm[id];
        if (isBm) bmList.push({ num, where: p.label || `Part ${this.WORDS[pi]}`, text: s.title, go: () => this.goto(id), hasSub: true, sub: `Bookmarked ${this.fmt(S.bm[id])}`, k: S.bm[id] });
        const kicker = this.B.key === 'weekly' ? 'GRA Weekly Kingdom Prayers' : J && s.kind === 'list' ? 'Prayer List' : `${this.B.secWord} ${num}`;
        const isList = s.kind === 'list', lst = isList ? (s.list || []).map((it, k, a) => ({ name: it.name, sub: it.sub || '', group: it.group || '', groupStart: !!it.group && (k === 0 || a[k - 1].group !== it.group) })) : [];
        return { id, num, tocNum: J ? (isList ? '' : String(runStart)) : num, showHdr: !J || isList, showItemsLabel: !J, showOrn: !J || isList, pad: J && !isList ? '0 20px' : 'clamp(40px, 9vw, 72px) 20px 24px', kicker, isList, list: lst, hasPrayers: !isList, showTitle: !isList && !s.hideTitle, itemsLabel: s.itemsLabel || this.B.itemsLabel, title: s.title, foundation: s.foundation, hasFoundation: s.foundation.length > 0, prayers, tocCount: isList ? lst.length : nP,
          allLabel: allDone ? 'Clear section' : 'Mark all prayed', toggleAll: () => this.setMany(ids, !allDone),
          progress: isList ? `${lst.length} names` : done ? `${done} of ${nP} prayed` : `${nP} ${nP === 1 ? 'prayer' : 'prayers'}`,
          isDone: allDone, inProg: done > 0 && !allDone, ringDash: ring(f),
          isBm, bmFill: isBm ? 'currentColor' : 'none', bmLabel: isBm ? 'Bookmarked' : 'Bookmark', toggleBm: () => this.toggleBm(id),
          listen: () => this.ttsStart(id), pray: () => this.sessOpen(id), isPlanToday: todayIds.includes(id), go: () => { this.lastId = id; this.setState({ tocSel: id }); this.goto(id); }, curBg: id === (S.tocSel || this.lastId) ? onBg : 'transparent' };
      }).filter(Boolean);
      const pf = pCount ? pDone / pCount : 0;
      const allLists = sections.length > 0 && sections.every(x => x.isList), names = sections.reduce((a, x) => a + x.list.length, 0);
      return { id: `part-${n}`, n, numLabel: allLists ? '' : n, showNum: !allLists, wkAfter: pi === wkPi, label: this.B.key !== 'covenant' && p.label ? p.label : `Part ${this.WORDS[pi]}`, title: p.title, titleCase: tc(p.title), subtitle: p.subtitle, sections,
        count: allLists ? `${sections.length} ${sections.length === 1 ? 'list' : 'lists'} · ${names} names` : J ? `${pCount} prayers` : `${sections.length} ${sections.length === 1 ? 'section' : 'sections'} · ${pCount} prayers`,
        isDone: pCount > 0 && pDone === pCount, inProg: pDone > 0 && pDone < pCount, ringDash: ring(pf),
        hasChecks: showChecks && pDone > 0, doneLabel: `${pDone} of ${pCount} prayed`, go: () => this.goto(`part-${n}`),
        reset: () => this.resetPrefix(`s-${n}-`, `Part ${this.WORDS[pi]}`),
        canPlan: !!this.B.gplan && !allLists, inPlan: !!gp && gp.items.some(x => x.book === this.B.key && x.part === n), planLabel: gp && gp.items.some(x => x.book === this.B.key && x.part === n) ? 'In your plan' : 'Add to plan', togglePlan: () => this.gpTogglePart(n), planIcon: gp && gp.items.some(x => x.book === this.B.key && x.part === n) ? 'm9 15 2 2 4-4' : 'M12 13v5M9.5 15.5h5', isPlanToday: gpT.includes(`${this.B.key}:part-${n}`) || todayIds.some(x => x.startsWith(`s-${n}-`)),
        ...(() => { const pid = `part-${n}`, isBm = !!S.bm[pid], all = pCount > 0 && pDone === pCount, first = sections.find(x => !x.isList);
          if (J && isBm) bmList.push({ num: String(n), where: p.label || 'Part ' + n, text: tc(p.title), go: () => this.goto(pid), hasSub: true, sub: `Bookmarked ${this.fmt(S.bm[pid])}`, k: S.bm[pid] });
          return { hasActions: J && !allLists && !!first, allLabel: all ? 'Clear watch' : 'Mark all prayed', toggleAll: () => this.setMany(pIds, !all), pray: () => first && this.sessOpen(first.id),
            bmFill: isBm ? 'currentColor' : 'none', bmLabel: isBm ? 'Bookmarked' : 'Bookmark', toggleBm: () => this.toggleBm(pid), listen: () => this.ttsStart(pid) }; })() };
    });

    (S.weeks || []).forEach(w => {
      const wid = this.wkId(w), lab = 'Weekly · ' + this.wkLabel(w);
      (w.prayers || []).forEach((p, i) => { const pid = wid + '-' + (i + 1); if (S.fav[pid]) favList.push({ num: 'W' + (i + 1), where: lab, text: p.text, go: () => this.wkGo(pid), hasSub: false, sub: '', refs: p.ref || '', hasRefs: !!p.ref }); });
      if (S.bm[wid]) bmList.push({ num: 'W', where: 'Weekly Kingdom Prayers', text: this.wkLabel(w), go: () => this.wkGo(wid), hasSub: true, sub: 'Bookmarked ' + this.fmt(S.bm[wid]), k: S.bm[wid] });
    });
    bmList.sort((a, b) => (b.k || '').localeCompare(a.k || ''));
    const savedList = S.savedTab === 'bm' ? bmList : favList;

    // plan
    const pv = plan ? this.planView(plan, S.prayed) : null;
    const showBuilder = S.sheet === 'plan' && (!plan || S.planEdit) && !!S.draft;
    const d = S.draft;
    let draftSummary = '', draftParts = [], draftDays = [];
    if (d && this.flat) {
      const secs = d.scope === 'parts' ? this.flat.filter(s => d.parts[s.pn]) : this.flat;
      const left = secs.filter(s => !this.secDone(s.id, S.prayed)).length;
      const nDays = Math.ceil(left / d.perDay);
      let eta = ''; if (left && d.wdays.some(Boolean)) { const e = new Date(); let need = nDays; for (let i = 0; i < 3000; i++) { if (d.wdays[e.getDay()]) { need--; if (need <= 0) break; } e.setDate(e.getDate() + 1); } eta = this.fmt(this.dkey(e)); }
      draftSummary = !secs.length ? 'Choose at least one part.' : !d.wdays.some(Boolean) ? 'Choose at least one prayer day.'
        : `${secs.length} sections${left < secs.length ? ` (${left} still to pray)` : ''} · ${nDays} prayer ${nDays === 1 ? 'day' : 'days'}${eta ? ` · finishes around ${eta}` : ''}`;
      draftParts = parts.map(p => { const a = !!d.parts[p.n]; return { n: p.n, title: tc(p.title), count: `${p.sections.length} sections`, bg: a ? onBg : 'transparent', border: a ? 'var(--color-accent)' : 'var(--color-neutral-400)', op: a ? 1 : 0, toggle: () => this.setDraft({ parts: { ...d.parts, [p.n]: !a } }) }; });
      draftDays = this.DAYN.map((nm, i) => { const a = d.wdays[i]; return { label: nm[0], full: nm, bg: a ? onBg : 'transparent', border: a ? 'var(--color-accent)' : 'var(--color-divider)', color: a ? on : 'var(--color-neutral-700)', toggle: () => { const w = [...d.wdays]; w[i] = !w[i]; this.setDraft({ wdays: w }); } }; });
    }
    const planSummary = plan ? `${plan.scope === 'all' ? 'Whole book' : (plan.parts.length === 1 ? 'Part ' : 'Parts ') + plan.parts.join(', ')} · ${plan.perDay} ${plan.perDay === 1 ? 'section' : 'sections'} a day · ${this.daysLabel(plan.wdays)}` : '';
    const todaySecs = plan ? todayIds.map(id => { const f = this.secStat(id, S.prayed), s = this.flatById[id]; return { num: s.num, title: s.title, isDone: f === 1, inProg: f > 0 && f < 1, notStarted: f === 0, ringDash: ring(f), go: () => this.goto(id) }; }) : [];
    const stripView = pv ? pv.strip.map(x => ({ wd: x.wd, num: x.num, isDone: x.st === 'done', showNum: x.st !== 'done',
      bg: x.st === 'done' ? onBg : 'transparent', color: x.st === 'done' ? on : x.st === 'pre' ? 'var(--color-neutral-400)' : 'var(--color-text)',
      border: x.st === 'done' || x.st === 'today' ? 'var(--color-accent)' : x.st === 'missed' ? 'var(--color-neutral-500)' : 'var(--color-divider)',
      borderStyle: x.st === 'rest' ? 'dashed' : 'solid', note: x.st === 'rest' ? 'Rest' : x.st === 'missed' ? 'Missed' : x.st === 'today' ? 'Today' : '' })) : [];

    const titles = { contents: 'Contents', plan: 'Plan', saved: 'Saved', aa: 'Settings', share: 'Share prayer', history: 'Prayer history', verse: 'Scripture', weekly: 'Weekly Kingdom Prayers' };
    const ios = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
    const usageOn = st.usage !== false;
    const tool = S.tool, isDark = this.isDarkNow(), sh = S.share || { head: '', body: '', text: '' }, enc = encodeURIComponent(sh.text);
    const colorList = tool === 'hl' ? this.HL : this.PEN, curColor = tool === 'hl' ? S.hlColor : S.penColor;

    return {
      parts, showChecks, fontSize: st.size, lineH: st.lh || 1.6, locked: S.locked, pw: S.pw, pwError: S.pwError,
      onPw: e => this.setState({ pw: e.target.value, pwError: false }), onUnlock: e => this.unlock(e),
      prayedCount: count, totalPrayers: total || 869, progressPct: total ? `${(count / total) * 100}%` : '0%',
      stickRef: el => { this.stickEl = el; },
      stickTap: () => { if (this.stickId) this.goto(this.stickId); },
      topContents: () => { this.markJump(); this.setState({ sheet: null }); window.scrollTo({ top: 0, behavior: this.reduce() ? 'auto' : 'smooth' }); },
      showBackPill: !!S.backPill && !!(S.navB || []).length && !S.sheet && !S.searchOpen && !S.ink && !S.tts && !S.exporting, backPillLabel: S.backPill || '',
      backPillGo: () => { clearTimeout(this._pillT); this.setState({ backPill: null }); this.navGo(-1); },
      backPillClose: () => { clearTimeout(this._pillT); this.setState({ backPill: null }); },
      goHome: () => { if (this.inLib()) { location.href = (location.protocol === 'file:' ? '../index.html' : '../') + '#library'; return; } if (/\.dc\.html$/.test(decodeURIComponent(location.pathname))) { location.href = 'GRA Prayer Library.dc.html#library'; return; } this.markJump(); this.setState({ sheet: null, searchOpen: false }); window.scrollTo({ top: 0, behavior: 'smooth' }); },
      isDark, isLight: !isDark, themeLabel: isDark ? 'Switch to light page' : 'Switch to dark page',
      toggleTheme: () => this.setSetting('theme', isDark ? (st.lastLight || 'light') : 'dark'),
      searchOpen: S.searchOpen, q: S.q, ...(S.searchOpen ? this.searchVals(parts) : { results: [], resultLabel: '', themeChips: [] }),
      onSearch: e => this.setState({ q: e.target.value, sTheme: null }), closeSearch: () => this.setState({ searchOpen: false, q: '', sTheme: null }),
      openSearch: () => this.setState({ searchOpen: true, sheet: null, resume: null }),
      searchRef: el => { if (el && !el._f) { el._f = 1; try { el.focus({ preventScroll: true }); } catch (e) {} } },
      sheetKey: S.sheet || '', sheetModal: this.pinned() ? 'false' : 'true', sheetOpen: !!S.sheet, sheetTitle: titles[S.sheet] || '', closeSheet: () => this.setState({ sheet: null, planEdit: false, draft: null }),
      isContents: S.sheet === 'contents', isPlan: S.sheet === 'plan', isSaved: S.sheet === 'saved', isAa: S.sheet === 'aa', isShare: S.sheet === 'share',
      openContents: () => this.setState({ sheet: S.sheet === 'contents' ? null : 'contents', resume: null }),
      openSaved: () => this.setState({ sheet: S.sheet === 'saved' ? null : 'saved', resume: null }),
      openAa: () => this.setState({ sheet: S.sheet === 'aa' ? null : 'aa', resume: null }),
      openPlan: () => { location.href = this.libHref('#plan'); },
      goTitle: () => { this.markJump(); this.setState({ sheet: null }); this.pgSet(0, -1); }, goToc: () => this.goto('contents'),
      tabContents: S.sheet === 'contents' ? on : off, tabWeekly: S.sheet === 'weekly' ? on : off,
      openWeekly: () => this.setState({ sheet: S.sheet === 'weekly' ? null : 'weekly', resume: null, searchOpen: false }), tabPlan: S.sheet === 'plan' ? on : off, tabSaved: S.sheet === 'saved' ? on : off,

      showBuilder, hasPlan: !!S.plan, builderTitle: S.plan && !S.planFresh ? 'Edit your plan' : 'Create your plan', saveLabel: S.plan && !S.planFresh ? 'Save changes' : 'Start plan',
      scopeOpts: d ? [['all', 'Whole book'], ['parts', 'Choose parts']].map(([v, label]) => ({ label, ...seg(d.scope === v), pick: () => this.setDraft({ scope: v }) })) : [],
      draftIsParts: !!d && d.scope === 'parts', draftParts, draftDays, draftPerDay: d ? d.perDay : 1,
      perDayLabel: d ? (d.perDay === 1 ? 'section a day' : 'sections a day') : '',
      perDayMinus: () => d && this.setDraft({ perDay: Math.max(1, d.perDay - 1) }), perDayPlus: () => d && this.setDraft({ perDay: Math.min(12, d.perDay + 1) }),
      draftSummary, savePlan: () => this.savePlan(), cancelEdit: () => this.setState({ planEdit: false, draft: null, planFresh: false }),
      showDash: S.sheet === 'plan' && !!pv && !S.planEdit && !pv.complete, showComplete: S.sheet === 'plan' && !!pv && !S.planEdit && pv.complete,
      planSummary, planDone: pv ? pv.done : 0, planTotal: pv ? pv.total : 0, planPct: pv && pv.total ? `${(pv.done / pv.total) * 100}%` : '0%',
      planEta: pv ? (pv.eta ? `At this pace you’ll finish around ${this.fmt(this.dkey(pv.eta))}.` : '') : '',
      todayStatus: !pv ? '' : !pv.schedToday ? 'Rest day' : pv.doneToday ? 'Complete' : todaySecs.length ? `${todaySecs.filter(x => x.isDone).length} of ${todaySecs.length} done` : '',
      todaySecs, isRestDay: !!pv && !pv.schedToday, restText: pv && pv.next ? `No prayers are scheduled today. Your plan continues on ${pv.next}.` : 'No prayers are scheduled today.',
      hasAhead: !!pv && (!pv.schedToday || pv.doneToday) && !!pv.ahead, aheadLabel: pv && pv.ahead ? `${pv.ahead.num} · ${pv.ahead.title}` : '', openAhead: () => pv && pv.ahead && this.goto(pv.ahead.id),
      streak: pv ? pv.streak : 0, daysDone: pv ? pv.daysDone : 0, strip: stripView,
      editPlan: () => this.openBuilder(false), endPlan: () => this.endPlan(),
      completeText: pv ? `${pv.total} sections over ${pv.daysDone} prayer ${pv.daysDone === 1 ? 'day' : 'days'}.` : '',
      newPlan: () => { this.setState({ planFresh: true }); this.openBuilder(true); },

      bmCount: bmList.length, favCount: favList.length, savedList,
      showBmTab: () => this.setState({ savedTab: 'bm' }), showFavTab: () => this.setState({ savedTab: 'fav' }),
      bmTabBg: seg(S.savedTab === 'bm').bg, bmTabColor: seg(S.savedTab === 'bm').color, favTabBg: seg(S.savedTab === 'fav').bg, favTabColor: seg(S.savedTab === 'fav').color,
      savedEmpty: savedList.length === 0,
      savedEmptyText: S.savedTab === 'bm' ? 'Tap Bookmark at the top of any section to keep your place.' : 'Tap the star under any prayer to keep it here.',

      shareHead: sh.head, shareBody: sh.body, canNativeShare: typeof navigator !== 'undefined' && !!navigator.share,
      nativeShare: () => navigator.share({ text: sh.text }).then(() => this.setState({ sheet: null }), err => { if (!err || err.name !== 'AbortError') this.copyText(sh.text); }),
      waHref: `https://wa.me/?text=${enc}`, smsHref: `sms:?&body=${enc}`, mailHref: `mailto:?subject=${encodeURIComponent(sh.head)}&body=${enc}`,
      copyShare: () => this.copyText(sh.text),

      sizeOpts: [[15, 14, 'Small'], [17, 17, 'Medium'], [19, 20, 'Large'], [22, 23, 'Extra large'], [25, 26, 'Larger'], [29, 30, 'Largest']].map(([v, fs, aria]) => ({ fs, aria, on: st.size === v, ...seg(st.size === v), pick: () => this.setSetting('size', v) })),
      spaceOpts: [[1.45, 'Compact'], [1.6, 'Normal'], [1.85, 'Relaxed']].map(([v, label]) => { const a = (st.lh || 1.6) === v; return { label, on: a, ...seg(a), pick: () => this.setSetting('lh', v) }; }),
      themeOpts: [['light', 'Light', '#f3f2f2'], ['sepia', 'Sepia', '#f3ead6'], ['dark', 'Dark', '#1a1714'], ['auto', 'Auto', 'linear-gradient(90deg, #f3f2f2 50%, #1a1714 50%)']].map(([v, label, sw]) => { const a = (st.theme || 'light') === v; return { label, sw, on: a, ...seg(a), pick: () => this.setSetting(v === 'light' || v === 'sepia' ? { theme: v, lastLight: v } : { theme: v }) }; }),
      gapOpts: [[0, 'None'], [2, '2 sec'], [5, '5 sec'], [10, '10 sec']].map(([v, label]) => { const a = (st.ttsGap || 0) === v; return { label, on: a, ...seg(a), pick: () => this.setSetting('ttsGap', v) }; }),
      previewVoice: () => { try { this.ttsStop(); this.speakChunk(({ fr: 'L’Éternel est mon berger: je ne manquerai de rien.', es: 'Jehová es mi pastor; nada me faltará.' })[this.lang()] || 'The Lord is my shepherd; I shall not want.', () => {}, this.ttsTok); } catch (e) {} },
      sbOn: this.sbOn(), usageOn, usageBg: usageOn ? onBg : 'transparent', usageBorder: usageOn ? 'var(--color-accent)' : 'var(--color-neutral-400)', usageOp: usageOn ? 1 : 0,
      toggleUsage: () => this.setSetting('usage', !usageOn),
      exportJournal: () => this.exportJournal(), exportBook: () => this.exportBook(),
      isAdmin: admin, adminHref: this.inLib() ? '../admin/' : 'admin/', weeklyHref: this.inLib() ? (location.protocol === 'file:' ? '../weekly/index.html' : '../weekly/') : 'Prayer Book Reader.dc.html?book=weekly',
      bkTitle: this.B.title, showFront: this.B.key !== 'weekly',
      ...(() => { const w = (S.wkRows || this.ld('weekly', []) || [])[0];
        return { wkInlineTitle: w ? 'This week · Week of ' + this.wkLabel(w) : 'This week', wkInlineEmpty: !w,
          wkInline: w ? (w.prayers || []).map((p, i) => ({ n: i + 1, text: p.text, ref: p.ref || '', hasRef: !!p.ref, focus: () => this.sessOpen('wk', i) })) : [],
          wkHas: !!w && !!(w.prayers || []).length, wkFocus: () => this.sessOpen('wk', 0), wkGoto: () => this.goto('weekly-kp'), wkCount: w ? (w.prayers || []).length + ' prayers' : '',
          weeklyAllHref: this.inLib() ? (location.protocol === 'file:' ? '../weekly/index.html#contents' : '../weekly/#contents') : 'Prayer Book Reader.dc.html?book=weekly#contents' }; })(), navCols: 5, planOn: false,
      pgOn: !!(this.pages && this.pages.length > 1), pgPrev: () => this.pgStep(-1), pgNext: () => this.pgStep(1),
      pgNoPrev: !this.pages || !(S.pg > 0), pgNoNext: !this.pages || (S.pg || 0) >= this.pages.length - 1,
      pgPrevLabel: this.pages && this.pages[(S.pg || 0) - 1] ? this.pages[(S.pg || 0) - 1].label : '', pgNextLabel: this.pages && this.pages[(S.pg || 0) + 1] ? this.pages[(S.pg || 0) + 1].label : '',
      pgPos: this.pages ? `Page ${(S.pg || 0) + 1} of ${this.pages.length}` : '',
      tabListenLabel: S.tts ? 'Playing' : 'Listen', tabListenColor: S.tts ? 'var(--color-accent-700)' : 'var(--color-neutral-700)',
      tabListenGo: () => { if (S.tts) return this.setState({ npOpen: true }); this.setState({ npOpen: true }); const sec = [...document.querySelectorAll('[data-sec]')].find(e => e.getClientRects().length); if (sec) this.ttsStart(sec.getAttribute('data-sec')); else { const nx = this.pages && this.pages.findIndex((p, i) => i >= (S.pg || 0) && p.keys.some(k => document.querySelector('[data-sec="' + k + '"]'))); if (nx >= 0) { this.pgSet(nx, 1); setTimeout(() => { const s2 = [...document.querySelectorAll('[data-sec]')].find(e => e.getClientRects().length); if (s2) this.ttsStart(s2.getAttribute('data-sec')); }, 560); } } },
      bkStats: (() => { const D = S.data || [], nS = D.reduce((a, p) => a + p.sections.length, 0), nP = D.reduce((a, p) => a + p.sections.reduce((b, x) => b + x.prayers.length, 0), 0);
        if (this.B.key === 'weekly') return nS + (nS === 1 ? ' week · ' : ' weeks · ') + nP + ' prayers';
        if (this.B.key === 'jcfp') { const lists = D.filter(p => /LISTS/.test(p.title)).reduce((a, p) => a + p.sections.length, 0); const W = D.filter(p => !/LISTS/.test(p.title)), np = W.reduce((a, p) => a + p.sections.filter(x => !x.prayers.some(y => y.link === 'weekly')).reduce((b, x) => b + x.prayers.length, 0), 0); return W.length + ' prayer watches · ' + np + ' prayers · ' + lists + ' lists'; }
        return D.length + ' parts · ' + nS + ' sections · ' + nP + ' prayers'; })(),
      isVerse: S.sheet === 'verse' && !!S.verse, verseLoading: !!(S.verse && S.verse.loading), verseHasErr: !!(S.verse && S.verse.err), verseErr: S.verse && S.verse.err || '',
      hasShareImg: !!S.shareImg && S.sheet === 'share', shareImg: S.shareImg || '', shareImgCss: S.shareImg ? `url("${S.shareImg}")` : 'none', shareImage: () => this.shareImage(), shareImgLabel: S.shBusy ? 'Preparing…' : 'Share as image',
      readFont: ({ clean: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif', easy: '"Atkinson Hyperlegible", system-ui, sans-serif' })[st.font] || 'var(--font-body)', readLs: st.ls === 'wide' ? '.04em' : 'normal',
      fontOpts: [['book', 'Book', 'var(--font-body)'], ['clean', 'Clean', '-apple-system, BlinkMacSystemFont, system-ui, sans-serif'], ['easy', 'Easy read', '"Atkinson Hyperlegible", system-ui, sans-serif']].map(([v, label, fam]) => { const a = (st.font || 'book') === v; return { label, fam, on: a, ...seg(a), pick: () => this.setSetting('font', v) }; }),
      lsOpts: [['normal', 'Normal', 'normal'], ['wide', 'Wide', '.06em']].map(([v, label, ls]) => { const a = (st.ls || 'normal') === v; return { label, ls, on: a, ...seg(a), pick: () => this.setSetting('ls', v) }; }),
      ttsSpeedLabel: (st.rate || 1) + '×', ttsSpeed: () => { const o = [0.8, 1, 1.2, 1.4], n = o[(o.indexOf(st.rate || 1) + 1) % o.length]; this.setSetting('rate', n); if (S.tts && S.tts.playing) setTimeout(() => this.ttsPlay(this.ttsI || 0), 50); },
      sleepCycle: () => this.sleepCycle(), sleepColor: S.sleep ? 'var(--color-accent-700)' : 'var(--color-neutral-700)', sleepLabel: !S.sleep ? '' : S.sleep.mode === 'sec' ? 'End' : Math.max(1, Math.ceil((S.sleep.end - Date.now()) / 60000)) + 'm', sleepAria: !S.sleep ? 'Sleep timer off' : S.sleep.mode === 'sec' ? 'Sleep timer: end of section' : 'Sleep timer on', verseRef: S.verse ? S.verse.ref : '', verseList: S.verse ? S.verse.verses : [],
      ...this.historyVals(), ...this.exportVals(favList, bmList), ...this.weeklyVals(),
      showInstall: !!S.installAsk && !S.locked && !S.resume && !S.sheet && !S.searchOpen && !S.ink && !S.tts && !S.sess && !S.exporting, canInstall: !!S.canInstall,
      installText: S.canInstall ? 'Open the book in one tap. It works offline too.' : ios ? 'Tap Share, then Add to Home Screen. It opens in one tap and works offline.' : 'Open your browser menu and choose Add to Home screen.',
      doInstall: () => { const p = this._bip; if (!p) return; p.prompt(); Promise.resolve(p.userChoice).finally(() => { this._bip = null; this.sv('installSeen', Date.now()); this.setState({ canInstall: false, installAsk: false }); }); },
      dismissInstall: () => { this.sv('installSeen', Date.now()); this.setState({ installAsk: false }); },
      sessReading: !!S.sessRead, sessReadLabel: S.sessRead ? 'Stop reading aloud' : 'Read each prayer aloud',
      sessReadColor: S.sessRead ? on : 'var(--color-text)', sessReadBorder: S.sessRead ? 'var(--color-accent)' : 'transparent',
      sessReadToggle: () => { if (S.sessRead) { this.ttsTok = (this.ttsTok || 0) + 1; try { window.speechSynthesis.cancel(); } catch (e) {} this.setState({ sessRead: false }); } else this.setState({ sessRead: true }, () => this.sessSpeak()); },
      verseOpts: [[true, 'Show'], [false, 'Hide']].map(([v, label]) => ({ label, ...seg(st.verses === v), pick: () => this.setSetting('verses', v) })),
      resetAll: () => this.resetPrefix('', 'the entire book'), clearInk: () => this.clearInk(),
      ...this.npVals(), ttsOk: typeof window !== 'undefined' && 'speechSynthesis' in window,
      rateOpts: [[0.8, 'Slow'], [1, 'Normal'], [1.2, 'Fast'], [1.4, 'Faster']].map(([v, label]) => ({ label, ...seg((st.rate || 1) === v), pick: () => this.setSetting('rate', v) })),
      voiceOpts: this.voiceList(), voiceVal: st.voice || '', voiceHint: ios ? 'Voices marked Natural sound the most lifelike. For more, download an Enhanced or Premium English voice in Settings › Accessibility › Spoken Content › Voices, then reopen the book.' : 'Voices marked Natural sound the most lifelike. Microsoft Edge offers the widest choice of natural voices.', pickVoice: e => this.setSetting('voice', e.target.value),
      ttsToggles: [['ttsVerses', 'Read the scripture under each prayer', !!st.ttsVerses], ['ttsMark', 'Check off each prayer as it’s read', st.ttsMark !== false]].map(([k, label, a]) => ({ label, bg: a ? onBg : 'transparent', border: a ? 'var(--color-accent)' : 'var(--color-neutral-400)', op: a ? 1 : 0, toggle: () => this.setSetting(k, !a) })),
      ...this.authVals(seg), ...this.sessVals(), ...this.langVals(seg),
      ttsBar: !!S.tts && !S.ink, ttsPlaying: !!(S.tts && S.tts.playing), ttsPaused: !!(S.tts && !S.tts.playing), ttsPlayLabel: S.tts && S.tts.playing ? 'Pause' : 'Play',
      ttsKicker: S.tts && this.ttsQ ? (this.ttsQ.items[S.tts.i] || {}).kicker || '' : '', ttsTitle: this.ttsQ ? this.ttsQ.title : '',
      ttsToggle: () => S.tts && S.tts.playing ? this.ttsPause() : this.ttsPlay(this.ttsI || 0),
      ttsPrev: () => this.ttsStep(-1), ttsNext: () => this.ttsStep(1), ttsStop: () => this.ttsStop(),
      ttsJump: () => { const t = S.tts; if (t) this.goto(t.pid || t.sid); },
      showResume: !!S.resume && !S.sheet && !S.searchOpen && !S.ink && !S.tts && !S.exporting, resumeLabel: S.resume ? S.resume.label : '',
      resumeKicker: S.resume && S.resume.mode === 'focus' ? 'Continue Focused Mode' : 'Continue where you left off',
      doResume: () => { const r = S.resume; if (!r) return; if (r.mode === 'focus') { this.setState({ resume: null }); this.sessOpen(r.id, r.i); } else this.goto(r.id); }, dismissResume: () => this.setState({ resume: null }),
      hasToast: !!S.toast, toast: S.toast || '',

      notInk: !S.ink, inkOn: S.ink,
      startInk: () => { this.setInk(true); this.showToast(S.finger ? 'Finger draws · two fingers scroll' : 'Write with Apple Pencil · fingers scroll'); },
      stopInk: () => this.setInk(false),
      pickPen: () => this.setState({ tool: 'pen' }), pickHl: () => this.setState({ tool: 'hl' }), pickEraser: () => this.setState({ tool: 'eraser' }),
      penBg: seg(tool === 'pen').bg, penColor: seg(tool === 'pen').color, hlBg: seg(tool === 'hl').bg, hlColor: seg(tool === 'hl').color, erBg: seg(tool === 'eraser').bg, erColor: seg(tool === 'eraser').color,
      inkColors: colorList.map(([k, label, css]) => ({ label, css, ring: curColor === k ? 4 : 0, pick: () => this.setState(tool === 'hl' ? { hlColor: k } : { penColor: k, tool: 'pen' }) })),
      toggleFinger: () => { const f = !S.finger; this.setState({ finger: f }, () => this.applyTouch()); this.showToast(f ? 'Finger draws · two fingers scroll' : 'Fingers scroll · Pencil draws'); },
      fingerBg: seg(S.finger).bg, fingerColor: seg(S.finger).color,
      inkUndo: () => this.inkUndoFn(), undoOp: S.inkN > 0 ? 1 : 0.35, inkRedo: () => this.inkRedoFn(), redoOp: (this.redo || []).length ? 1 : 0.35,
      penSizes: [['fine', 'Fine', '5px'], ['med', 'Medium', '8px'], ['bold', 'Bold', '12px']].map(([k, label, d]) => { const a = (S.penSize || 'med') === k; return { label, d, on: a ? 'true' : 'false', bg: a ? seg(true).bg : 'transparent', pick: () => { this.setState({ penSize: k, tool: 'pen' }); this.sv('penSize', k); } }; }),
    };
  }
}
