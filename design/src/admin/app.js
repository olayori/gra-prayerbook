class Component extends DCLogic {
  SB_URL = 'https://sjcosqxtgllfwldhnoax.supabase.co';
  SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqY29zcXh0Z2xsZndsZGhub2F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4NTQ5MjYsImV4cCI6MjEwNzQzMDkyNn0.HQsm-M6Ut1RHoXtDHEIjiCvPQq-P3irRh0uHgQ3lFx0';
  WORDS = ['One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen'];
  state = { book: (() => { try { const k = localStorage.getItem('gra-admin-book'); return k === 'jcfp' ? k : 'covenant'; } catch (e) { return 'covenant'; } })(), phase: 'loading', email: '', pw: '', aErr: '', aBusy: false, role: null, me: '', tab: 'content', draft: null, sel: null, open: {}, q: '', save: 'saved', conflict: false, dlg: null, toast: null, rev: 0, pubV: 0, drop: null };
  log = []; undoS = []; redoS = []; seq = 0;
  BOOKS = {
    covenant: { label: 'Book of Covenant Prayers', res: 'prayersData', file: 'prayers.json', draft: 'book_draft', ver: 'book_versions', rpc: 'publish_book', lib: false },
    jcfp: { label: 'Jesus Chosen Fast and Prayer', res: 'jcfpData', file: 'jcfp.json', draft: 'lib_draft', ver: 'lib_versions', rpc: 'publish_lib', lib: true }
  };
  bk() { const k = this.state.book || 'covenant'; return { key: k, ...this.BOOKS[k] }; }
  vq(sel) { const K = this.bk(), q = this.sb.from(K.ver).select(sel); return K.lib ? q.eq('book', K.key) : q; }
  dq(sel) { const K = this.bk(), q = this.sb.from(K.draft).select(sel); return K.lib ? q.eq('book', K.key) : q.eq('id', 1); }
  async pickBook(k) {
    if (!this.BOOKS[k] || k === this.state.book) return;
    clearTimeout(this._sv); if (this.state.save !== 'saved') await this.save();
    try { localStorage.setItem('gra-admin-book', k); } catch (e) {}
    this.setState({ book: k, sel: null, q: '' }, () => this.reloadDraft().catch(e => this.toast('Couldn’t load that book. Has the latest supabase-setup.sql been run? ' + ((e && e.message) || ''))));
  }

  loadSb() {
    if (this._sbp) return this._sbp;
    this._sbp = new Promise((res, rej) => {
      const go = () => { try { this.sb = window.supabase.createClient(this.SB_URL, this.SB_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'gra-covenant-auth' } }); res(this.sb); } catch (e) { rej(e); } };
      if (window.supabase && window.supabase.createClient) return go();
      const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
      s.onload = go; s.onerror = () => { this._sbp = null; rej(new Error('offline')); }; document.head.appendChild(s);
    });
    return this._sbp;
  }
  async componentDidMount() {
    this.onKey = e => this.key(e); window.addEventListener('keydown', this.onKey);
    this.onBU = e => { if (this.state.save !== 'saved') { e.preventDefault(); e.returnValue = ''; } }; window.addEventListener('beforeunload', this.onBU);
    try {
      const sb = await this.loadSb();
      sb.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT') this.setState({ phase: 'signin', role: null }); });
      const { data } = await sb.auth.getSession();
      if (data.session) this.enter(data.session.user); else this.setState({ phase: 'signin' });
    } catch (e) { this.setState({ phase: 'signin', aErr: 'Couldn’t reach the server. Check your connection and reload.' }); }
  }
  componentWillUnmount() { window.removeEventListener('keydown', this.onKey); window.removeEventListener('beforeunload', this.onBU); clearTimeout(this._sv); clearTimeout(this._tt); }
  key(e) {
    const t = e.target && e.target.tagName, typing = t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT';
    if (e.key === 'Escape' && this.state.dlg) return this.setState({ dlg: null });
    if (e.key === 'Escape' && this.state.uSel) return this.setState({ uSel: null });
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !typing && this.state.phase === 'ready') { e.preventDefault(); e.shiftKey ? this.redo() : this.undo(); }
  }
  toast(m) { clearTimeout(this._tt); this.setState({ toast: m }); this._tt = setTimeout(() => this.setState({ toast: null }), 3200); }
  async signIn(e) {
    if (e && e.preventDefault) e.preventDefault();
    const S = this.state; if (!S.email || !S.pw) return this.setState({ aErr: 'Enter your email and password.' });
    this.setState({ aBusy: true, aErr: '' });
    try {
      const sb = await this.loadSb();
      const { data, error } = await sb.auth.signInWithPassword({ email: S.email.trim(), password: S.pw });
      if (error) return this.setState({ aBusy: false, aErr: /invalid login/i.test(error.message) ? 'That email or password isn’t right.' : error.message });
      this.setState({ aBusy: false, pw: '' }); this.enter(data.user);
    } catch (x) { this.setState({ aBusy: false, aErr: 'You appear to be offline.' }); }
  }
  async signOut() {
    if (this.state.save !== 'saved' && !window.confirm('Some changes aren’t saved yet. Sign out anyway?')) return;
    try { await this.sb.auth.signOut(); } catch (e) {}
    this.setState({ phase: 'signin', role: null, draft: null });
  }
  async enter(u) {
    this.user = u;
    const { data } = await this.sb.from('admins').select('role').eq('user_id', u.id).maybeSingle();
    if (!data) return this.setState({ phase: 'denied', me: u.email });
    this.setState({ role: data.role, me: u.email, phase: 'loadingBook' });
    try { await this.loadBook(); this.setState({ phase: 'ready' }); }
    catch (e) { this.setState({ phase: 'signin', aErr: 'Couldn’t load the book. Has the latest supabase-setup.sql been run? ' + ((e && e.message) || '') }); }
  }
  ensureU(data) {
    data.forEach((p, pi) => { p.u = p.u || `part-${pi + 1}`; p.subtitle = p.subtitle || ''; p.sections.forEach((s, si) => { s.u = s.u || `s-${pi + 1}-${si + 1}`; s.foundation = s.foundation || []; s.prayers = s.prayers || []; s.prayers.forEach((pr, i) => { pr.u = pr.u || `s-${pi + 1}-${si + 1}-${i + 1}`; pr.scripture = pr.scripture || []; }); }); });
    return data;
  }
  layoutOf(data) { return data.map(p => ({ u: p.u, s: p.sections.map(s => ({ u: s.u, p: s.prayers.map(pr => pr.u) })) })); }
  nid(k) { return k + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  clone(x) { return JSON.parse(JSON.stringify(x)); }
  async loadBook() {
    const K = this.bk(); this.bundled = this.ensureU(await fetch((window.__resources && window.__resources[K.res]) || K.file).then(r => r.json()));
    const vs = await this.vq('version, note, stats, published_by_email, published_at').order('version', { ascending: false });
    if (vs.error) throw vs.error;
    this.versions = vs.data || [];
    let pub = this.clone(this.bundled), pubV = 0;
    if (this.versions.length) { const { data: row, error } = await this.vq('data').eq('version', this.versions[0].version).single(); if (error) throw error; pub = this.ensureU(row.data); pubV = this.versions[0].version; }
    this.pub = pub; this.indexPub();
    const { data: d, error } = await this.dq('data, log, base_version, updated_at').maybeSingle();
    if (error) throw error;
    const draft = d ? this.ensureU(d.data) : this.clone(pub);
    this.draftAt = d ? d.updated_at : null; this.log = d ? d.log || [] : []; this.baseV = d ? d.base_version : pubV;
    this.undoS = []; this.redoS = [];
    const s0 = draft[0] && draft[0].sections[0];
    this.setState({ draft, pubV, conflict: false, save: 'saved', sel: s0 ? { kind: 'section', u: s0.u } : null, open: draft[0] ? { [draft[0].u]: true } : {}, rev: this.state.rev + 1 });
  }
  async reloadDraft() { this.setState({ phase: 'loadingBook' }); await this.loadBook(); this.setState({ phase: 'ready' }); }
  indexPub() {
    this.pubP = {}; this.pubS = {}; this.pubPart = {};
    this.pub.forEach((p, pi) => {
      this.pubPart[p.u] = { title: p.title, subtitle: p.subtitle || '', pos: pi };
      p.sections.forEach((s, si) => {
        this.pubS[s.u] = { title: s.title, f: JSON.stringify(s.foundation), pos: `${pi + 1}.${si + 1}`, pu: p.u };
        s.prayers.forEach((pr, i) => { this.pubP[pr.u] = { text: pr.text, scr: JSON.stringify(pr.scripture), pos: `${pi + 1}.${si + 1}.${i + 1}`, su: s.u }; });
      });
    });
  }
  mut(what, key, fn) {
    const now = Date.now();
    if (!(key && this.lastKey === key && now - this.lastT < 4000)) { this.undoS.push(JSON.stringify(this.state.draft)); if (this.undoS.length > 80) this.undoS.shift(); this.redoS = []; }
    this.lastKey = key; this.lastT = now;
    fn(this.state.draft);
    const last = this.log[this.log.length - 1];
    if (key && last && last.key === key && now - last.t < 300000) last.t = now; else this.log.push({ t: now, by: this.state.me, what, key: key || null });
    this.dirty();
  }
  dirty() { this.seq++; this.setState({ rev: this.state.rev + 1, save: 'unsaved' }); clearTimeout(this._sv); this._sv = setTimeout(() => this.save(), 1200); }
  undo() { if (!this.undoS.length) return; this.redoS.push(JSON.stringify(this.state.draft)); this.swapDraft(JSON.parse(this.undoS.pop()), 'Undid a change'); }
  redo() { if (!this.redoS.length) return; this.undoS.push(JSON.stringify(this.state.draft)); this.swapDraft(JSON.parse(this.redoS.pop()), 'Redid a change'); }
  swapDraft(d, what) { this.lastKey = null; this.log.push({ t: Date.now(), by: this.state.me, what, key: null }); this.setState({ draft: d }, () => { this.fixSel(); this.dirty(); }); }
  fixSel() { const s = this.state.sel; if (s && !(s.kind === 'part' ? this.locPart(s.u) : this.locS(s.u))) this.setState({ sel: null }); }
  async save() {
    if (this.state.conflict || !this.state.draft) return;
    if (this._saving) { this._sv = setTimeout(() => this.save(), 800); return; }
    this._saving = true; const seq = this.seq; this.setState({ save: 'saving' });
    try {
      const K = this.bk(); const { data: cur, error: e1 } = await this.dq('updated_at, updated_by').maybeSingle();
      if (e1) throw e1;
      if (cur && cur.updated_at !== this.draftAt && cur.updated_by !== this.user.id) { this._saving = false; return this.setState({ conflict: true, save: 'unsaved' }); }
      const { data, error } = await this.sb.from(K.draft).upsert({ ...(K.lib ? { book: K.key } : { id: 1 }), data: this.state.draft, log: this.log.slice(-500), base_version: this.baseV, updated_by: this.user.id }).select('updated_at').single();
      if (error) throw error;
      this.draftAt = data.updated_at; this.savedAt = Date.now();
      this.setState({ save: seq === this.seq ? 'saved' : 'unsaved' });
    } catch (e) { this.setState({ save: 'error' }); this._sv = setTimeout(() => this.save(), 8000); }
    this._saving = false;
  }
  locPart(u) { const d = this.state.draft || []; const pi = d.findIndex(p => p.u === u); return pi < 0 ? null : { pi, p: d[pi] }; }
  locS(u) { const d = this.state.draft || []; for (let pi = 0; pi < d.length; pi++) { const si = d[pi].sections.findIndex(s => s.u === u); if (si >= 0) return { pi, si, p: d[pi], s: d[pi].sections[si] }; } return null; }
  tc(s) { return (s || '').toLowerCase().replace(/(^|[\s\-‘“(])([a-z])/g, (m, a, b) => a + b.toUpperCase()).replace(/\b(Of|The|And|In|On|For|To|A|An|By|Over|With|At|From)\b/g, (m, w, i) => i === 0 ? m : m.toLowerCase()).replace(/^./, c => c.toUpperCase()); }
  partLabel(pi) { return `Part ${this.WORDS[pi] || pi + 1}`; }
  diff() {
    if (this._diffRev === this.state.rev && this._diff) return this._diff;
    const d = this.state.draft || [], st = { pAdd: 0, pDel: 0, pEdit: 0, pMove: 0, sAdd: 0, sDel: 0, sEdit: 0, partAdd: 0, partDel: 0, partEdit: 0 }, seenP = {}, seenS = {}, seenPart = {}, flag = {}, secFlag = {};
    const inDraft = {}; d.forEach(p => p.sections.forEach(s => s.prayers.forEach(pr => { inDraft[pr.u] = s.u; })));
    const lostFrom = {}; Object.entries(this.pubP).forEach(([u, x]) => { if (inDraft[u] !== x.su) lostFrom[x.su] = true; });
    d.forEach((p, pi) => {
      seenPart[p.u] = 1; const pp = this.pubPart[p.u];
      if (!pp) st.partAdd++; else if (pp.title !== p.title || pp.subtitle !== (p.subtitle || '') || pp.pos !== pi) st.partEdit++;
      p.sections.forEach((s, si) => {
        seenS[s.u] = 1; const ps = this.pubS[s.u]; let ch = false;
        if (!ps) { st.sAdd++; ch = true; } else if (ps.title !== s.title || ps.f !== JSON.stringify(s.foundation) || ps.pu !== p.u) { st.sEdit++; ch = true; }
        s.prayers.forEach((pr, i) => {
          seenP[pr.u] = 1; const pp2 = this.pubP[pr.u];
          if (!pp2) { st.pAdd++; flag[pr.u] = 'New'; ch = true; }
          else if (pp2.text !== pr.text || pp2.scr !== JSON.stringify(pr.scripture)) { st.pEdit++; flag[pr.u] = 'Edited'; ch = true; }
          else if (pp2.su !== s.u) { st.pMove++; flag[pr.u] = 'Moved'; ch = true; }
        });
        if (ps && lostFrom[s.u]) ch = true;
        secFlag[s.u] = ch;
      });
    });
    Object.keys(this.pubP).forEach(u => { if (!seenP[u]) st.pDel++; });
    Object.keys(this.pubS).forEach(u => { if (!seenS[u]) st.sDel++; });
    Object.keys(this.pubPart).forEach(u => { if (!seenPart[u]) st.partDel++; });
    const total = Object.values(st).reduce((a, b) => a + b, 0);
    this._diffRev = this.state.rev; this._diff = { st, total, flag, secFlag };
    return this._diff;
  }
  renderVals() {
    const S = this.state, ph = S.phase, admin = S.role === 'admin';
    const tabs = [['content', 'Content'], ['weekly', 'Weekly'], ...(admin ? [['users', 'Users']] : []), ['translations', 'Translations'], ['insights', 'Insights'], ['history', 'History']];
    const df = S.draft ? this.diff() : { total: 0 };
    const saveLabel = S.save === 'saving' ? 'Saving…' : S.save === 'unsaved' ? 'Unsaved changes' : S.save === 'error' ? 'Couldn’t save · retrying' : this.savedAt ? 'Draft saved' : 'Draft up to date';
    return { bookKey: this.state.book || 'covenant', bookOpts: Object.entries(this.BOOKS).map(([k, b]) => ({ k, label: b.label })), pickBook: e => this.pickBook(e.target.value),
      
      isLoading: ph === 'loading' || ph === 'loadingBook', loadingText: ph === 'loadingBook' ? 'Opening the book…' : 'Loading…',
      isSignin: ph === 'signin', isDenied: ph === 'denied', isReady: ph === 'ready',
      email: S.email, pw: S.pw, onEmail: e => this.setState({ email: e.target.value, aErr: '' }), onPw: e => this.setState({ pw: e.target.value, aErr: '' }),
      hasAErr: !!S.aErr, aErr: S.aErr, aBusy: S.aBusy, signInLabel: S.aBusy ? 'Signing in…' : 'Sign in', signIn: e => this.signIn(e), signOut: () => this.signOut(), me: S.me,
      roleLabel: admin ? 'Admin' : 'Editor',
      tabs: tabs.map(([k, label]) => { const a = S.tab === k; return { label, cur: a ? 'page' : 'false', color: a ? 'var(--color-accent-700)' : 'var(--color-text)', line: a ? 'inset 0 -2px 0 var(--color-accent)' : 'none', pick: () => { this.setState({ tab: k }); if (k === 'users' && !this.state.users) this.loadUsers(); if (k === 'insights' && !this.state.ins) this.loadInsights(this.state.insDays || 30); if (k === 'weekly' && !this.state.wkList) this.loadWeeks(); if (k === 'translations' && !this.state.trRows) this.trLoad(); } }; }),
      saveLabel, saveColor: S.save === 'error' ? 'var(--color-accent-700)' : 'var(--color-neutral-700)',
      undo: () => this.undo(), redo: () => this.redo(), noUndo: !this.undoS.length, noRedo: !this.redoS.length, undoOp: this.undoS.length ? 1 : 0.35, redoOp: this.redoS.length ? 1 : 0.35,
      openPublish: () => this.setState({ dlg: { type: 'publish' }, pubNote: '', pubErr: '' }), hasChanges: df.total > 0, changeCount: df.total,
      conflict: S.conflict, reloadDraft: () => this.reloadDraft(),
      hasToast: !!S.toast, toast: S.toast || '',
      ...(ph === 'ready' ? { ...this.contentVals(), ...this.dialogVals(), ...this.usersVals(), ...this.insightsVals(), ...this.historyVals(), ...this.weeklyVals(), ...this.trVals() } : {})
    };
  }
  snip(t) { t = (t || '').trim(); return t.length > 48 ? '“' + t.slice(0, 46).trim() + '…”' : t ? `“${t}”` : 'an empty prayer'; }
  locPr(u, d) { d = d || this.state.draft; for (let pi = 0; pi < d.length; pi++) for (let si = 0; si < d[pi].sections.length; si++) { const s = d[pi].sections[si], i = s.prayers.findIndex(x => x.u === u); if (i >= 0) return { pi, si, i, s, pr: s.prayers[i] }; } return null; }
  dStart(kind, u) { return e => { this.drag = { kind, u }; try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', u); } catch (x) {} }; }
  dOver(kind, u) {
    return e => {
      const g = this.drag; if (!g || g.u === u) return;
      const into = (g.kind === 'prayer' && kind === 'section') || (g.kind === 'section' && kind === 'part');
      if (!into && g.kind !== kind) return;
      e.preventDefault(); e.stopPropagation();
      const r = e.currentTarget.getBoundingClientRect(), pos = into ? 'into' : e.clientY < r.top + r.height / 2 ? 'before' : 'after';
      const D = this.state.drop; if (!D || D.u !== u || D.pos !== pos) this.setState({ drop: { u, pos } });
    };
  }
  dDrop(kind, u) { return e => { e.preventDefault(); e.stopPropagation(); const g = this.drag, D = this.state.drop; this.drag = null; this.setState({ drop: null }); if (g && D && D.u === u && g.u !== u) this.moveNode(g.kind, g.u, u, D.pos); }; }
  dEnd() { this.drag = null; if (this.state.drop) this.setState({ drop: null }); }
  dropLook(u) { const D = this.state.drop; if (!D || D.u !== u) return { line: 'none', hot: false }; return { line: D.pos === 'before' ? 'inset 0 2px 0 var(--color-accent)' : D.pos === 'after' ? 'inset 0 -2px 0 var(--color-accent)' : 'inset 0 0 0 2px var(--color-accent)', hot: D.pos === 'into' }; }
  moveNode(kind, u, tu, pos) {
    if (kind === 'part') return this.mut('Reordered parts', null, d => { const i = d.findIndex(p => p.u === u), [x] = d.splice(i, 1); let j = d.findIndex(p => p.u === tu); if (pos === 'after') j++; d.splice(j, 0, x); });
    if (kind === 'section') {
      const a = this.locS(u); if (!a) return;
      return this.mut(`Moved section “${a.s.title}”`, null, () => {
        const A = this.locS(u), [x] = A.p.sections.splice(A.si, 1);
        if (pos === 'into') { this.locPart(tu).p.sections.push(x); this.setState({ open: { ...this.state.open, [tu]: true } }); }
        else { const B = this.locS(tu); B.p.sections.splice(B.si + (pos === 'after' ? 1 : 0), 0, x); }
      });
    }
    const a = this.locPr(u); if (!a) return;
    this.mut(`Moved prayer ${this.snip(a.pr.text)}`, null, () => {
      const A = this.locPr(u), [x] = A.s.prayers.splice(A.i, 1);
      if (pos === 'into') this.locS(tu).s.prayers.push(x);
      else { const B = this.locPr(tu); B.s.prayers.splice(B.i + (pos === 'after' ? 1 : 0), 0, x); }
    });
  }
  addPrayerAt(su, at) {
    const u = this.nid('p'), L = this.locS(su); if (!L) return;
    this.mut(`Added a prayer to section ${L.pi + 1}.${L.si + 1}`, null, () => { const s = this.locS(su).s; s.prayers.splice(at == null ? s.prayers.length : at, 0, { u, text: '', scripture: [] }); });
    this.focusU = u;
  }
  addSection(pu) {
    const u = this.nid('s'), L = this.locPart(pu); if (!L) return;
    this.mut(`Added a section to ${this.partLabel(L.pi)}`, null, () => { this.locPart(pu).p.sections.push({ u, title: 'New section', foundation: [], prayers: [{ u: this.nid('p'), text: '', scripture: [] }] }); });
    this.setState({ sel: { kind: 'section', u }, open: { ...this.state.open, [pu]: true } });
  }
  addPart() {
    const u = this.nid('pt'), n = this.state.draft.length;
    this.mut(`Added ${this.partLabel(n)}`, null, d => d.push({ u, title: 'NEW PART', subtitle: '', sections: [] }));
    this.setState({ sel: { kind: 'part', u }, open: { ...this.state.open, [u]: true } });
  }
  componentDidUpdate() {
    const hd = document.querySelector('[data-hdr]');
    if (hd && hd !== this._hdEl && window.ResizeObserver) {
      if (this._ro) this._ro.disconnect(); this._hdEl = hd;
      this._ro = new ResizeObserver(() => document.documentElement.style.setProperty('--hdr', hd.getBoundingClientRect().height + 'px')); this._ro.observe(hd);
    }
    if (this.focusU) { const el = document.querySelector(`textarea[data-u="${this.focusU}"]`); if (el) { this.focusU = null; el.focus(); } }
  }
  contentVals() {
    const S = this.state, d = S.draft, df = this.diff(), q = S.q.trim().toLowerCase(), qOn = q.length > 1, sel = S.sel;
    let hits = 0;
    const tree = d.map((p, pi) => {
      const look = this.dropLook(p.u), selP = sel && sel.kind === 'part' && sel.u === p.u;
      const secs = p.sections.map((s, si) => {
        const m = qOn ? s.prayers.filter(x => x.text.toLowerCase().includes(q)).length + (s.title.toLowerCase().includes(q) ? 1 : 0) : 0;
        hits += m; const lk = this.dropLook(s.u), a = sel && sel.kind === 'section' && sel.u === s.u;
        return { show: !qOn || m > 0, num: `${pi + 1}.${si + 1}`, title: s.title || 'Untitled section', count: qOn ? `${m} found` : s.prayers.length, changed: !!df.secFlag[s.u],
          bg: lk.hot ? 'var(--color-accent-100)' : a ? 'var(--color-accent-200)' : 'transparent', line: lk.line,
          pick: () => this.setState({ sel: { kind: 'section', u: s.u } }), ds: this.dStart('section', s.u), dov: this.dOver('section', s.u), drop: this.dDrop('section', s.u) };
      }).filter(x => x.show);
      const open = qOn ? secs.length > 0 : !!S.open[p.u];
      return { show: !qOn || secs.length > 0, label: this.partLabel(pi), title: this.tc(p.title) || 'Untitled part', count: p.sections.length, open, secs, rot: open ? '90deg' : '0deg', toggleLabel: open ? 'Collapse' : 'Expand',
        bg: look.hot ? 'var(--color-accent-100)' : selP ? 'var(--color-accent-200)' : 'transparent', line: look.line,
        toggle: () => this.setState({ open: { ...S.open, [p.u]: !S.open[p.u] } }), pick: () => this.setState({ sel: { kind: 'part', u: p.u }, open: { ...S.open, [p.u]: true } }),
        addSec: () => this.addSection(p.u), ds: this.dStart('part', p.u), dov: this.dOver('part', p.u), drop: this.dDrop('part', p.u) };
    }).filter(x => x.show);
    const out = { isContent: S.tab === 'content', tree, q: S.q, onQ: e => this.setState({ q: e.target.value }), hasQ: qOn, qLabel: hits ? `${hits} ${hits === 1 ? 'match' : 'matches'}` : 'No matches',
      addPart: () => this.addPart(), dEnd: () => this.dEnd(), isSecSel: false, isPartSel: false, noSel: !sel };
    const L = sel && sel.kind === 'section' ? this.locS(sel.u) : null;
    if (L) {
      const { pi, si, s } = L, su = s.u, n = s.prayers.length;
      Object.assign(out, { isSecSel: true, secKicker: `${this.partLabel(pi)} · Section ${pi + 1}.${si + 1}`, secTitle: s.title,
        onSecTitle: e => { const v = e.target.value; this.mut(`Renamed section ${pi + 1}.${si + 1}`, 's:' + su, () => { this.locS(su).s.title = v; }); },
        delSec: () => { if (!window.confirm(`Delete section ${pi + 1}.${si + 1} “${s.title}” and its ${n} ${n === 1 ? 'prayer' : 'prayers'}? You can undo this until you publish.`)) return; this.mut(`Deleted section “${s.title}”`, null, () => { const A = this.locS(su); A.p.sections.splice(A.si, 1); }); this.setState({ sel: { kind: 'part', u: L.p.u } }); },
        moveSec: () => this.setState({ dlg: { type: 'move', kind: 'section', u: su, target: L.p.u } }),
        found: s.foundation.map((f, k) => ({ ref: f.ref || 'No reference', preview: (f.verses || []).map(v => v.text).join(' '), edit: () => this.openScr('f', su, k) })), noFound: !s.foundation.length,
        addFound: () => this.openScr('f', su, -1),
        prLabel: `Prayers · ${n}`, addPrayer: () => this.addPrayerAt(su),
        prayers: s.prayers.map((pr, i) => {
          const u = pr.u, lk = this.dropLook(u), num = `${pi + 1}.${si + 1}.${i + 1}`, f = df.flag[u], hit = qOn && pr.text.toLowerCase().includes(q);
          const swap = dir => this.mut(`Reordered prayers in ${pi + 1}.${si + 1}`, null, () => { const A = this.locPr(u), j = A.i + dir; [A.s.prayers[A.i], A.s.prayers[j]] = [A.s.prayers[j], A.s.prayers[A.i]]; });
          return { u, num, text: pr.text, rows: Math.max(2, Math.ceil(pr.text.length / 80) + (pr.text.match(/\n/g) || []).length),
            onText: e => { const v = e.target.value; this.mut(`Edited prayer ${num}`, 'p:' + u, () => { this.locPr(u).pr.text = v; }); },
            scr: pr.scripture.map((sc, k) => ({ ref: sc.ref || 'Scripture', edit: () => this.openScr('p', u, k) })), addScr: () => this.openScr('p', u, -1),
            hasFlag: !!f, flag: f || '', bg: lk.hot ? 'var(--color-accent-100)' : hit ? 'var(--color-accent-100)' : 'transparent', line: lk.line,
            first: i === 0, last: i === n - 1, upOp: i === 0 ? 0.3 : 1, downOp: i === n - 1 ? 0.3 : 1,
            up: () => i > 0 && swap(-1), down: () => i < n - 1 && swap(1), insert: () => this.addPrayerAt(su, i + 1),
            move: () => this.setState({ dlg: { type: 'move', kind: 'prayer', u, target: su } }),
            del: () => { if (pr.text.trim() && !window.confirm(`Delete prayer ${num}? You can undo this until you publish.`)) return; this.mut(`Deleted prayer ${num} ${this.snip(pr.text)}`, null, () => { const A = this.locPr(u); A.s.prayers.splice(A.i, 1); }); },
            ds: this.dStart('prayer', u), dov: this.dOver('prayer', u), drop: this.dDrop('prayer', u) };
        }) });
    }
    const P = sel && sel.kind === 'part' ? this.locPart(sel.u) : null;
    if (P) {
      const { pi, p } = P, pu = p.u, nS = p.sections.length, nP = p.sections.reduce((a, s) => a + s.prayers.length, 0);
      Object.assign(out, { isPartSel: true, partKicker: this.partLabel(pi), partTitle: p.title, partSub: p.subtitle || '',
        onPartTitle: e => { const v = e.target.value; this.mut(`Renamed ${this.partLabel(pi)}`, 'pt:' + pu, () => { this.locPart(pu).p.title = v; }); },
        onPartSub: e => { const v = e.target.value; this.mut(`Edited subtitle of ${this.partLabel(pi)}`, 'ps:' + pu, () => { this.locPart(pu).p.subtitle = v; }); },
        delPart: () => { if (!window.confirm(`Delete ${this.partLabel(pi)} “${this.tc(p.title)}”${nS ? ` with ${nS} sections and ${nP} prayers` : ''}? You can undo this until you publish.`)) return; this.mut(`Deleted ${this.partLabel(pi)} “${this.tc(p.title)}”`, null, d => { d.splice(this.locPart(pu).pi, 1); }); this.setState({ sel: null }); },
        partSecLabel: `Sections · ${nS}`, addSecHere: () => this.addSection(pu),
        partSecs: p.sections.map((s, si) => ({ num: `${pi + 1}.${si + 1}`, title: s.title, count: `${s.prayers.length} prayers`, pick: () => this.setState({ sel: { kind: 'section', u: s.u } }) })) });
    }
    return out;
  }
  openScr(owner, ou, idx) {
    const list = owner === 'f' ? this.locS(ou).s.foundation : this.locPr(ou).pr.scripture, sc = idx >= 0 ? list[idx] : null;
    this.setState({ dlg: { type: 'scr', owner, ou, idx, ref: sc ? sc.ref : '', verses: sc ? this.clone(sc.verses || []) : [{ n: '', text: '' }] } });
  }
  saveScr(remove) {
    const g = this.state.dlg, ref = g.ref.trim(), verses = g.verses.map(v => ({ n: String(v.n).trim(), text: v.text.trim() })).filter(v => v.text);
    if (!remove && !ref) return this.toast('Add a reference first');
    const where = g.owner === 'f' ? `section ${(() => { const L = this.locS(g.ou); return `${L.pi + 1}.${L.si + 1}`; })()} foundation` : `prayer ${(() => { const L = this.locPr(g.ou); return `${L.pi + 1}.${L.si + 1}.${L.i + 1}`; })()}`;
    const what = remove ? `Removed ${g.ref || 'scripture'} from ${where}` : g.idx < 0 ? `Added ${ref} to ${where}` : `Edited ${ref} in ${where}`;
    this.mut(what, null, () => {
      const list = g.owner === 'f' ? this.locS(g.ou).s.foundation : this.locPr(g.ou).pr.scripture;
      if (remove) list.splice(g.idx, 1); else if (g.idx < 0) list.push({ ref, verses }); else list[g.idx] = { ref, verses };
    });
    this.setState({ dlg: null });
  }
  problems() {
    const out = [];
    this.state.draft.forEach((p, pi) => {
      if (!p.title.trim()) out.push({ label: `${this.partLabel(pi)} has no title`, sel: { kind: 'part', u: p.u } });
      p.sections.forEach((s, si) => {
        if (!s.title.trim()) out.push({ label: `Section ${pi + 1}.${si + 1} has no title`, sel: { kind: 'section', u: s.u } });
        if (s.kind !== 'list' && !s.prayers.length) out.push({ label: `Section ${pi + 1}.${si + 1} has no prayers`, sel: { kind: 'section', u: s.u } });
        s.prayers.forEach((pr, i) => { if (!pr.text.trim()) out.push({ label: `Prayer ${pi + 1}.${si + 1}.${i + 1} is empty`, sel: { kind: 'section', u: s.u }, fu: pr.u }); });
      });
    });
    return out;
  }
  clean(d) {
    if (this.bk().lib) return d.map(p => ({ ...p, title: p.title.trim(), subtitle: (p.subtitle || '').trim(), sections: p.sections.map(s => ({ ...s, title: s.title.trim(), prayers: (s.prayers || []).map(pr => ({ ...pr, text: pr.text.replace(/[ \t]+/g, ' ').trim() })) })) }));
    return d.map(p => ({ u: p.u, label: '', title: p.title.trim(), subtitle: (p.subtitle || '').trim(), sections: p.sections.map(s => ({ u: s.u, title: s.title.trim(), foundation: s.foundation, prayers: s.prayers.map(pr => ({ u: pr.u, text: pr.text.replace(/[ \t]+/g, ' ').trim(), scripture: pr.scripture })) })) }))
      .map((p, pi) => ({ ...p, label: this.partLabel(pi) }));
  }
  async publish() {
    if (this.problems().length) return;
    this.setState({ pubBusy: true, pubErr: '' });
    clearTimeout(this._sv); await this.save();
    if (this.state.conflict) return this.setState({ pubBusy: false, dlg: null });
    const data = this.clean(this.state.draft), layout = this.layoutOf(data), stats = { parts: data.length, sections: data.reduce((a, p) => a + p.sections.length, 0), prayers: data.reduce((a, p) => a + p.sections.reduce((b, s) => b + s.prayers.length, 0), 0), changes: this.diff().st };
    const K = this.bk(); const { data: v, error } = await this.sb.rpc(K.rpc, { ...(K.lib ? { p_book: K.key } : {}), p_note: this.state.pubNote || '', p_data: data, p_layout: layout, p_stats: stats });
    if (error) return this.setState({ pubBusy: false, pubErr: 'Couldn’t publish: ' + error.message });
    const { data: dr } = await this.dq('updated_at').maybeSingle();
    this.draftAt = dr && dr.updated_at; this.log = []; this.baseV = v; this.undoS = []; this.redoS = [];
    this.pub = this.clone(data); this.indexPub();
    const { data: vs } = await this.vq('version, note, stats, published_by_email, published_at').order('version', { ascending: false });
    this.versions = vs || this.versions;
    this.setState({ pubBusy: false, dlg: null, pubV: v, draft: this.ensureU(this.clone(data)), save: 'saved', rev: this.state.rev + 1 });
    this.toast(`Version ${v} published`);
  }
  discardDraft() {
    if (!window.confirm(`Discard every unpublished change and go back to version ${this.state.pubV}?`)) return;
    this.undoS.push(JSON.stringify(this.state.draft)); this.redoS = [];
    this.log = [{ t: Date.now(), by: this.state.me, what: `Discarded changes, back to version ${this.state.pubV}`, key: null }];
    this.setState({ draft: this.clone(this.pub), dlg: null }, () => { this.fixSel(); this.dirty(); });
  }
  dialogVals() {
    const S = this.state, g = S.dlg || {}, upd = p => this.setState({ dlg: { ...this.state.dlg, ...p } });
    const out = { hasDlg: !!S.dlg, closeDlg: () => this.setState({ dlg: null }), stop: e => e.stopPropagation(), dlgW: g.type === 'scr' ? '620px' : '520px',
      dlgTitle: g.type === 'scr' ? (g.idx < 0 ? 'Add scripture' : 'Edit scripture') : g.type === 'move' ? (g.kind === 'section' ? 'Move section' : 'Move prayer') : g.type === 'publish' ? 'Publish changes' : '',
      isScrDlg: g.type === 'scr', isMoveDlg: g.type === 'move', isPubDlg: g.type === 'publish' };
    if (g.type === 'scr') Object.assign(out, { scrRef: g.ref, onScrRef: e => upd({ ref: e.target.value }), scrExisting: g.idx >= 0,
      scrVerses: g.verses.map((v, k) => ({ n: v.n, text: v.text, onN: e => { const vs = [...this.state.dlg.verses]; vs[k] = { ...vs[k], n: e.target.value }; upd({ verses: vs }); }, onText: e => { const vs = [...this.state.dlg.verses]; vs[k] = { ...vs[k], text: e.target.value }; upd({ verses: vs }); }, del: () => upd({ verses: this.state.dlg.verses.filter((_, j) => j !== k) }) })),
      addVerse: () => upd({ verses: [...g.verses, { n: '', text: '' }] }), saveScr: () => this.saveScr(false), delScr: () => this.saveScr(true) });
    if (g.type === 'move') {
      const d = S.draft, isSec = g.kind === 'section';
      const opts = isSec ? d.map((p, pi) => ({ u: p.u, label: `${this.partLabel(pi)} · ${this.tc(p.title)}` })) : d.flatMap((p, pi) => p.sections.map((s, si) => ({ u: s.u, label: `${pi + 1}.${si + 1} · ${s.title}` })));
      const L = isSec ? this.locS(g.u) : this.locPr(g.u);
      Object.assign(out, { moveOpts: opts, moveTarget: g.target, onMoveTarget: e => upd({ target: e.target.value }), moveLabel: isSec ? 'Move to the end of' : 'Move to the end of section',
        moveWhat: L ? (isSec ? `Section ${L.pi + 1}.${L.si + 1} · ${L.s.title}` : `Prayer ${L.pi + 1}.${L.si + 1}.${L.i + 1} · ${this.snip(L.pr.text)}`) : '',
        doMove: () => { this.setState({ dlg: null }); const cur = isSec ? L.p.u : L.s.u; if (g.target !== cur) { this.moveNode(g.kind, g.u, g.target, 'into'); if (isSec) this.setState({ sel: { kind: 'section', u: g.u } }); } } });
    }
    if (g.type === 'publish') {
      const df = this.diff(), st = df.st, pr = this.problems();
      const lines = [[st.pAdd, 'Prayers added'], [st.pEdit, 'Prayers edited'], [st.pMove, 'Prayers moved to another section'], [st.pDel, 'Prayers removed'], [st.sAdd, 'Sections added'], [st.sEdit, 'Sections renamed or changed'], [st.sDel, 'Sections removed'], [st.partAdd, 'Parts added'], [st.partEdit, 'Parts renamed or reordered'], [st.partDel, 'Parts removed']].filter(x => x[0]).map(([n, label]) => ({ n, label }));
      Object.assign(out, { pubNone: !df.total, pubSome: df.total > 0, pubLines: lines, pubV: S.pubV, nextV: S.pubV + 1,
        pubHasProblems: pr.length > 0, pubProblems: pr.slice(0, 8).map(x => ({ label: x.label, go: () => { this.focusU = x.fu || null; this.setState({ dlg: null, tab: 'content', sel: x.sel }); } })),
        pubNote: S.pubNote || '', onPubNote: e => this.setState({ pubNote: e.target.value }), hasPubErr: !!S.pubErr, pubErr: S.pubErr || '',
        pubBlocked: !df.total || pr.length > 0 || !!S.pubBusy, pubBtn: S.pubBusy ? 'Publishing…' : `Publish version ${S.pubV + 1}`,
        publish: () => this.publish(), discardDraft: () => this.discardDraft() });
    }
    return out;
  }
  dkey(d) { d = d || new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  fmt(k, o) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString(undefined, o || { day: 'numeric', month: 'short', year: 'numeric' }); }
  when(ts) { if (!ts) return '—'; const d = new Date(ts), days = Math.floor((Date.now() - d) / 864e5); return days < 1 ? 'Today' : days < 2 ? 'Yesterday' : days < 30 ? `${days} days ago` : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); }
  histStats(h) {
    const days = Object.keys(h || {}).filter(k => h[k] && h[k].length).sort(), set = new Set(days);
    let cur = 0; const d = new Date(); if (!set.has(this.dkey(d))) d.setDate(d.getDate() - 1);
    while (set.has(this.dkey(d))) { cur++; d.setDate(d.getDate() - 1); }
    let best = 0, run = 0, prev = null;
    days.forEach(k => { const [y, m, dd] = k.split('-').map(Number), t = Math.round(Date.UTC(y, m - 1, dd) / 864e5); run = prev != null && t - prev === 1 ? run + 1 : 1; prev = t; if (run > best) best = run; });
    return { cur, best, days: days.length };
  }
  posMap(lay) { const pu = {}; lay.forEach((p, pi) => p.s.forEach((s, si) => s.p.forEach((u, i) => { pu[`s-${pi + 1}-${si + 1}-${i + 1}`] = u; }))); return pu; }
  async loadUsers() {
    this.setState({ uLoading: true, uErr: '' });
    try {
      const [r, l] = await Promise.all([this.sb.rpc('admin_users'), this.sb.from('book_versions').select('version, layout')]);
      if (r.error) throw r.error;
      this.lays = { 0: this.posMap(this.layoutOf(this.bundled)) }; (l.data || []).forEach(x => { this.lays[x.version] = this.posMap(x.layout); });
      this.setState({ uLoading: false, users: (r.data || []).map(u => this.userRow(u)) });
    } catch (e) { this.setState({ uLoading: false, uErr: 'Couldn’t load users. ' + ((e && e.message) || '') }); }
  }
  userRow(u) {
    const d = u.data || {}, h = d.hist || {}, st = this.histStats(h), m = this.lays[d.bv || 0] || this.lays[0];
    const toU = id => m[id] || null;
    return { id: u.user_id, email: u.email || '', name: u.name || '', created: u.created_at, active: [u.last_sign_in_at, u.state_at].filter(Boolean).sort().pop() || null,
      member: u.is_member, role: u.role || null, prayedU: Object.keys(d.prayed || {}).map(toU).filter(Boolean), hist: Object.fromEntries(Object.entries(h).map(([k, l]) => [k, (l || []).map(toU).filter(Boolean)])),
      prayed: Object.keys(d.prayed || {}).length, days: st.days, streak: st.cur, best: st.best, fav: Object.keys(d.fav || {}).length, bm: Object.keys(d.bm || {}).length, ink: u.ink_pages || 0, plan: !!d.plan };
  }
  async userAct(kind, u) {
    const nm = u.name || u.email;
    if (kind === 'reset' && !window.confirm(`Reset all progress for ${nm}? Their check marks, favorites, bookmarks, history, plan and pen notes will be cleared on every device. This can’t be undone.`)) return;
    if (kind === 'del' && window.prompt(`This permanently deletes ${nm}’s account and progress. Type DELETE to confirm.`) !== 'DELETE') return;
    this.setState({ uBusy: true });
    const r = kind === 'reset' ? await this.sb.rpc('admin_reset_user', { p_user: u.id }) : kind === 'del' ? await this.sb.rpc('admin_delete_user', { p_user: u.id }) : await this.sb.rpc('admin_set_role', { p_user: u.id, p_role: kind.role });
    this.setState({ uBusy: false });
    if (r.error) return this.toast(r.error.message);
    this.toast(kind === 'reset' ? 'Progress reset' : kind === 'del' ? 'Account deleted' : 'Access updated');
    if (kind === 'del') this.setState({ uSel: null });
    await this.loadUsers();
  }
  exportCsv() {
    const rows = this.filteredUsers(), esc = v => { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; };
    const head = ['Name', 'Email', 'Role', 'Activated', 'Joined', 'Last active', 'Prayers checked', 'Days prayed', 'Current streak', 'Longest streak', 'Favorites', 'Bookmarks', 'Pages with pen notes'];
    const lines = [head, ...rows.map(u => [u.name, u.email, u.role || 'reader', u.member ? 'yes' : 'no', u.created ? u.created.slice(0, 10) : '', u.active ? u.active.slice(0, 10) : '', u.prayed, u.days, u.streak, u.best, u.fav, u.bm, u.ink])].map(r => r.map(esc).join(','));
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv' })); a.download = `prayer-book-users-${this.dkey()}.csv`; document.body.appendChild(a); a.click(); a.remove();
  }
  filteredUsers() {
    const S = this.state, q = (S.uQ || '').trim().toLowerCase(), f = S.uF || 'all', [k, dir] = S.uSort || ['active', -1];
    const list = (S.users || []).filter(u => (!q || (u.name + ' ' + u.email).toLowerCase().includes(q)) && (f === 'all' || (f === 'members' && u.member) || (f === 'staff' && u.role) || (f === 'pending' && !u.member)));
    const val = u => k === 'name' ? (u.name || u.email).toLowerCase() : k === 'role' ? (u.role || '') : u[k] == null ? '' : u[k];
    return list.sort((a, b) => { const x = val(a), y = val(b); return (x > y ? 1 : x < y ? -1 : 0) * dir; });
  }
  usersVals() {
    const S = this.state; if (S.tab !== 'users') return { isUsers: false, hasUSel: false };
    const seg = a => ({ bg: a ? 'var(--color-accent-100)' : 'transparent', color: a ? 'var(--color-accent-800)' : 'var(--color-text)' });
    const all = S.users || [], rows = this.filteredUsers(), [sk, sd] = S.uSort || ['active', -1];
    const cols = [['name', 'Name', 'left'], ['role', 'Role', 'left'], ['created', 'Joined', 'left'], ['active', 'Last active', 'left'], ['prayed', 'Prayers', 'right'], ['days', 'Days', 'right'], ['streak', 'Streak', 'right']];
    const roleName = r => r === 'admin' ? 'Admin' : r === 'editor' ? 'Editor' : null;
    const out = { isUsers: true, uQ: S.uQ || '', onUQ: e => this.setState({ uQ: e.target.value }), uLoading: !!S.uLoading && !S.users, uHasErr: !!S.uErr, uErr: S.uErr || '', uReady: !!S.users,
      uSummary: S.users ? `${all.length} accounts · ${all.filter(u => u.member).length} activated · ${all.filter(u => u.active && Date.now() - new Date(u.active) < 7 * 864e5).length} active this week` : '',
      uFilters: [['all', 'All'], ['members', 'Activated'], ['pending', 'Not activated'], ['staff', 'Staff']].map(([v, label]) => ({ label, on: (S.uF || 'all') === v, ...seg((S.uF || 'all') === v), pick: () => this.setState({ uF: v }) })),
      uCols: cols.map(([k, label, align]) => ({ label, align, arrow: sk === k ? (sd > 0 ? ' ↑' : ' ↓') : '', sort: () => this.setState({ uSort: [k, sk === k ? -sd : (k === 'name' || k === 'role' ? 1 : -1)] }) })),
      uRows: rows.map(u => ({ name: u.name || u.email.split('@')[0], email: u.email, role: roleName(u.role) || (u.member ? 'Reader' : 'Not activated'), roleClass: u.role ? 'tag tag-accent' : u.member ? 'tag tag-outline' : 'tag tag-neutral',
        joined: u.created ? new Date(u.created).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—', active: this.when(u.active), prayed: u.prayed, days: u.days, streak: u.streak,
        bg: S.uSel === u.id ? 'var(--color-accent-100)' : 'transparent', open: () => this.setState({ uSel: u.id }) })),
      uEmpty: !!S.users && !rows.length, exportCsv: () => this.exportCsv(), reloadUsers: () => this.loadUsers(), closeUser: () => this.setState({ uSel: null }) };
    const u = S.uSel && all.find(x => x.id === S.uSel);
    out.hasUSel = !!u;
    if (u) {
      const pos = {}, partTot = {}; this.pub.forEach((p, pi) => p.sections.forEach((s, si) => s.prayers.forEach((pr, i) => { pos[pr.u] = { num: `${pi + 1}.${si + 1}.${i + 1}`, pn: pi }; partTot[pi] = (partTot[pi] || 0) + 1; })));
      const partN = {}; u.prayedU.forEach(x => { if (pos[x]) partN[pos[x].pn] = (partN[pos[x].pn] || 0) + 1; });
      const total = Object.values(partTot).reduce((a, b) => a + b, 0), done = u.prayedU.filter(x => pos[x]).length;
      const heat = [], end = new Date(), start = new Date(); start.setDate(end.getDate() - end.getDay() - 25 * 7);
      for (let x = new Date(start); x <= end; x.setDate(x.getDate() + 1)) { const k = this.dkey(x), c = (u.hist[k] || []).length, l = !c ? 0 : c < 5 ? 1 : c < 15 ? 2 : 3; heat.push({ label: `${this.fmt(k)}: ${c}`, bg: ['transparent', 'var(--color-accent-200)', 'var(--color-accent-400)', 'var(--color-accent-600)'][l], border: l ? 'transparent' : 'var(--color-divider)' }); }
      const days = Object.keys(u.hist).filter(k => u.hist[k].length).sort().reverse();
      const self = u.id === (this.user && this.user.id);
      out.ud = { name: u.name || u.email.split('@')[0], email: u.email, busy: !!S.uBusy, noDel: !!S.uBusy || self,
        meta: `Joined ${u.created ? new Date(u.created).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : '—'} · last active ${this.when(u.active).toLowerCase()}${u.member ? '' : ' · has not entered the access code'}`,
        stats: [[`${done}`, `Prayers checked · ${total ? Math.round(done / total * 100) : 0}%`], [u.streak, 'Current streak'], [u.best, 'Longest streak'], [u.days, 'Days prayed'], [u.fav, 'Favorites'], [u.bm, 'Bookmarks']].map(([v, label]) => ({ v, label })),
        heat, parts: this.pub.map((p, pi) => ({ label: this.partLabel(pi), n: `${partN[pi] || 0} / ${partTot[pi] || 0}`, w: `${partTot[pi] ? (partN[pi] || 0) / partTot[pi] * 100 : 0}%` })),
        noDays: !days.length, days: days.slice(0, 60).map(k => ({ date: this.fmt(k, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }), n: `${u.hist[k].length} prayed`, nums: u.hist[k].map(x => pos[x] ? pos[x].num : null).filter(Boolean).join(', ') || 'Prayers since removed' })),
        roles: [[null, 'Reader'], ['editor', 'Editor'], ['admin', 'Admin']].map(([r, label]) => ({ label, on: u.role === r, ...seg(u.role === r), pick: () => { if (u.role !== r && !(self && r !== 'admin')) this.userAct({ role: r }, u); else if (self && r !== 'admin') this.toast('You can’t remove your own admin access'); } })),
        reset: () => this.userAct('reset', u), del: () => this.userAct('del', u) };
    } else out.ud = { name: '', email: '', meta: '', stats: [], heat: [], parts: [], days: [], roles: [], noDays: false };
    return out;
  }
  async loadInsights(days) {
    this.setState({ insDays: days, insLoading: true, insErr: '' });
    const since = new Date(); since.setDate(since.getDate() - days + 1);
    try {
      const { data, error } = await this.sb.from('usage_daily').select('day, kind, ref, n').gte('day', this.dkey(since)).limit(100000);
      if (error) throw error;
      this.setState({ insLoading: false, ins: data || [] });
    } catch (e) { this.setState({ insLoading: false, insErr: 'Couldn’t load usage. ' + ((e && e.message) || '') }); }
  }
  goPrayer(u) { const L = this.locPr(u); if (!L) return this.toast('That prayer is no longer in the draft'); this.focusU = u; this.setState({ tab: 'content', sel: { kind: 'section', u: L.s.u }, open: { ...this.state.open, [this.state.draft[L.pi].u]: true } }); }
  dk(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  nextMonday() { const d = new Date(); const add = (8 - d.getDay()) % 7; d.setDate(d.getDate() + add); return this.dk(d); }
  wkFmt(k) { if (!k) return ''; const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }); }
  wkStatusOf(r) {
    if (!r.publish_at) return ['Draft', 'var(--color-neutral-700)'];
    const t = new Date(r.publish_at);
    if (t > new Date()) return ['Scheduled · ' + t.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) + ', ' + t.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }), 'var(--color-accent-700)'];
    return ['Live', 'var(--color-accent-800)'];
  }
  async loadWeeks() {
    this.setState({ wkLoading: true });
    try { const { data, error } = await this.sb.from('weekly_prayers').select('*').order('week_of', { ascending: false }); if (error) throw error; this.setState({ wkList: data || [], wkLoading: false }); }
    catch (e) { this.setState({ wkLoading: false, wkList: [] }); this.toast('Couldn’t load weeks. Run the weekly section of supabase-setup.sql first.'); }
  }
  wkOpen(row) {
    if (this.state.wkDirty && !window.confirm('Discard unsaved changes to this week?')) return;
    if (!row) { const m = this.nextMonday(); this.setState({ wk: { id: null, week_of: m, title: 'Weekly Kingdom Prayers', intro: '', closing: 'In Jesus Christ name we pray, AMEN!', prayers: [], mode: 'sched', sd: m, st: '06:00' }, wkPaste: '', wkNote: '', wkErr: '', wkDirty: false }); return; }
    const t = row.publish_at ? new Date(row.publish_at) : null, future = t && t > new Date();
    this.setState({ wk: { id: row.id, week_of: row.week_of, title: row.title, intro: row.intro || '', closing: row.closing || '', prayers: (row.prayers || []).map(p => ({ text: p.text || '', ref: p.ref || '' })),
      mode: !t ? 'draft' : future ? 'sched' : 'live', sd: t ? this.dk(t) : row.week_of, st: t ? String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0') : '06:00', was: row.publish_at }, wkPaste: '', wkNote: '', wkErr: '', wkDirty: false });
  }
  wkPatch(p) { this.setState(s => ({ wk: { ...s.wk, ...p }, wkDirty: true, wkErr: '' })); }
  wkPr(fn) { this.setState(s => { const pr = s.wk.prayers.map(x => ({ ...x })); fn(pr); return { wk: { ...s.wk, prayers: pr }, wkDirty: true }; }); }
  parseWeekly(raw) {
    const t = (raw || '').replace(/\r/g, '').replace(/\u00a0/g, ' ').replace(/^\s*--\s*\d+\s+of\s+\d+\s*--\s*$/gm, '');
    const head = [], items = []; let closing = '', cur = null;
    t.split('\n').map(l => l.trim()).forEach(l => {
      if (!l) return;
      const m = /^(\d{1,2})\s*[.)]\s+(.*)$/.exec(l);
      if (m) { cur = { text: m[2] }; items.push(cur); return; }
      if (/we pray,?\s*amen|^amen[.!]*$/i.test(l)) { closing = (closing ? closing + ' ' : '') + l; cur = null; return; }
      if (cur) cur.text += ' ' + l; else if (!items.length) head.push(l); else closing = (closing ? closing + ' ' : '') + l;
    });
    let week_of = null, title = '', intro = '';
    if (head.length) {
      const h = head[0], dm = /([A-Za-z]{3,})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/.exec(h);
      if (dm) { const d = new Date(dm[1] + ' ' + dm[2] + ', ' + dm[3]); if (!isNaN(d)) week_of = this.dk(d); }
      const rest = dm ? h.replace(dm[0], '').replace(/^[\s,–—-]+|[\s,–—-]+$/g, '') : h;
      title = rest; intro = head.slice(1).join(' ');
    }
    const prayers = items.map(it => {
      const text = it.text.replace(/\s+/g, ' ').trim();
      const rm = /according to\s+(.+?)[,\s]+(?:which|that)\s+say/i.exec(text);
      return { text, ref: rm ? rm[1].replace(/[\s,–—-]+$/, '').trim() : '' };
    });
    return { week_of, title, intro, prayers, closing };
  }
  wkSplit() {
    const r = this.parseWeekly(this.state.wkPaste);
    if (!r.prayers.length) { this.setState({ wkNote: 'No numbered prayers found. Each prayer should start with 1. 2. 3. …' }); return; }
    const W = this.state.wk, p = { prayers: r.prayers };
    if (r.week_of) { p.week_of = r.week_of; if (W.mode === 'sched' && !W.id) p.sd = r.week_of; }
    if (r.title) p.title = r.title; if (r.intro) p.intro = r.intro; if (r.closing) p.closing = r.closing;
    this.wkPatch(p);
    this.setState({ wkNote: r.prayers.length + ' prayers found' + (r.week_of ? ' · week of ' + this.wkFmt(r.week_of) : '') + '. Check them below.' });
  }
  async wkSave() {
    const W = this.state.wk; if (!W) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(W.week_of || '')) return this.setState({ wkErr: 'Choose the week date.' });
    const prayers = W.prayers.map(p => ({ text: p.text.trim(), ref: p.ref.trim() })).filter(p => p.text);
    if (!prayers.length) return this.setState({ wkErr: 'Add at least one prayer.' });
    let publish_at = null;
    if (W.mode === 'now') publish_at = new Date().toISOString();
    else if (W.mode === 'live') publish_at = W.was || new Date().toISOString();
    else if (W.mode === 'sched') { const d = new Date(W.sd + 'T' + (W.st || '06:00')); if (isNaN(d)) return this.setState({ wkErr: 'Choose a valid date and time.' }); publish_at = d.toISOString(); }
    const row = { week_of: W.week_of, title: (W.title || '').trim() || 'Weekly Kingdom Prayers', intro: (W.intro || '').trim(), closing: (W.closing || '').trim(), prayers, publish_at, updated_by_email: this.state.me || null };
    this.setState({ wkBusy: true, wkErr: '' });
    try {
      const q = W.id ? this.sb.from('weekly_prayers').update(row).eq('id', W.id).select().single() : this.sb.from('weekly_prayers').insert(row).select().single();
      const { data, error } = await q; if (error) throw error;
      await this.loadWeeks(); this.setState({ wkBusy: false, wkDirty: false }); this.wkOpen(data);
      if (window.GRAi18n) window.GRAi18n.prewarm([{ title: row.title, intro: row.intro, closing: row.closing, prayers: row.prayers }]).catch(() => {});
      this.toast(W.mode === 'now' ? 'Live for all readers' : W.mode === 'sched' ? 'Scheduled' : W.mode === 'live' ? 'Saved. Readers see the change next time they open the book.' : 'Saved as draft');
    } catch (e) {
      const m = (e && e.message) || ''; this.setState({ wkBusy: false, wkErr: /duplicate|unique/i.test(m) ? 'There is already a week with that date. Open it from the list instead.' : 'Couldn’t save. ' + m });
    }
  }
  async wkDelete() {
    const W = this.state.wk; if (!W || !W.id) return;
    if (!window.confirm('Delete the week of ' + this.wkFmt(W.week_of) + '? Readers will no longer see it.')) return;
    try { const { error } = await this.sb.from('weekly_prayers').delete().eq('id', W.id); if (error) throw error; this.setState({ wk: null, wkDirty: false }); await this.loadWeeks(); this.toast('Week deleted'); }
    catch (e) { this.toast('Couldn’t delete. ' + ((e && e.message) || '')); }
  }
  async trLoad() {
    const S = this.state, lang = S.trLang || 'fr', q = (S.trQ || '').trim();
    this.setState({ trLoading: true });
    try {
      let r = this.sb.from('translations').select('src_hash,lang,src,out,edited,updated_at').eq('lang', lang).order('updated_at', { ascending: false }).limit(60);
      if (q) { const p = '%' + q.replace(/[%_,()]/g, ' ') + '%'; r = r.or(`src.ilike.${p},out.ilike.${p}`); }
      const { data, error } = await r; if (error) throw error;
      this.setState({ trRows: data || [], trEdit: {}, trLoading: false });
    } catch (e) { this.setState({ trRows: [], trLoading: false }); this.toast('Couldn’t load translations. Run the Languages section of supabase-setup.sql first.'); }
  }
  async trSave(row, out) {
    try {
      const { error } = await this.sb.from('translations').update({ out, edited: true, edited_by_email: this.state.me || null }).eq('src_hash', row.src_hash).eq('lang', row.lang); if (error) throw error;
      this.setState(s => { const e = { ...s.trEdit }; delete e[row.src_hash]; return { trEdit: e, trRows: s.trRows.map(x => x.src_hash === row.src_hash ? { ...x, out, edited: true } : x) }; });
      this.toast('Translation saved');
    } catch (e) { this.toast('Couldn’t save. ' + ((e && e.message) || '')); }
  }
  async trWarm() {
    const L = window.GRAi18n, d = this.state.draft; if (!L || !d) return;
    this.setState({ trWarmBusy: true });
    try { await L.prewarm(d); this.toast('French and Spanish are ready for this book'); this.trLoad(); }
    catch (e) { this.toast('Couldn’t translate. Check the translate function and DeepL key.'); }
    this.setState({ trWarmBusy: false });
  }
  trVals() {
    const S = this.state; if (S.tab !== 'translations') return { isTr: false };
    const seg = a => ({ bg: a ? 'var(--color-accent-100)' : 'transparent', color: a ? 'var(--color-accent-800)' : 'var(--color-text)' });
    const lang = S.trLang || 'fr', rows = S.trRows || [], ed = S.trEdit || {}, bk = this.BOOKS[S.book || 'covenant'];
    return { isTr: true, trLoading: !!S.trLoading && !S.trRows, trEmpty: !!S.trRows && !rows.length && !S.trLoading,
      trEmptyText: (S.trQ || '').trim() ? 'No translations match that search.' : 'Nothing translated yet. Open the app in French or Spanish, or prepare this book below.',
      trLangOpts: [['fr', 'Français'], ['es', 'Español']].map(([k, label]) => ({ label, on: lang === k ? 'true' : 'false', ...seg(lang === k), pick: () => this.setState({ trLang: k, trRows: null }, () => this.trLoad()) })),
      trQ: S.trQ || '', onTrQ: e => this.setState({ trQ: e.target.value }), trKey: e => { if (e.key === 'Enter') this.trLoad(); }, trSearch: () => this.trLoad(),
      trWarm: () => this.trWarm(), trWarmBusy: !!S.trWarmBusy, trWarmLabel: S.trWarmBusy ? 'Translating…' : 'Prepare ' + ((bk && bk.label) || 'this book') + ' in French and Spanish',
      trRows: rows.map(r => { const v = ed[r.src_hash] != null ? ed[r.src_hash] : r.out; return { src: r.src, out: v, rows: String(Math.min(8, Math.max(2, Math.ceil(v.length / 60)))), tag: (lang === 'fr' ? 'Français' : 'Español') + (r.edited ? ' · edited' : ' · DeepL'), tagColor: r.edited ? 'var(--color-accent-700)' : 'var(--color-neutral-700)',
        dirty: ed[r.src_hash] != null && ed[r.src_hash] !== r.out, edit: e => { const val = e.target.value; this.setState(s => ({ trEdit: { ...(s.trEdit || {}), [r.src_hash]: val } })); },
        save: () => this.trSave(r, ed[r.src_hash]), revert: () => this.setState(s => { const x = { ...s.trEdit }; delete x[r.src_hash]; return { trEdit: x }; }) }; }) };
  }
  weeklyVals() {
    const S = this.state; if (S.tab !== 'weekly') return { isWeekly: false };
    const seg = a => ({ bg: a ? 'var(--color-accent-100)' : 'transparent', color: a ? 'var(--color-accent-800)' : 'var(--color-text)' });
    const list = S.wkList || [], W = S.wk;
    const out = { isWeekly: true, wkLoading: !!S.wkLoading && !S.wkList, wkListEmpty: !!S.wkList && !list.length, wkNew: () => this.wkOpen(null),
      wkRows: list.map(r => { const [status, stColor] = this.wkStatusOf(r); return { label: this.wkFmt(r.week_of), status, stColor, n: (r.prayers || []).length + ' prayers', bg: W && W.id === r.id ? 'var(--color-accent-100)' : 'transparent', pick: () => this.wkOpen(r) }; }),
      wkNoSel: !W, wkHasSel: !!W, wkPrayers: [], wkModes: [] };
    if (!W) return out;
    const live = W.mode === 'live' || (W.was && new Date(W.was) <= new Date());
    const modes = (live ? [['live', 'Live'], ['draft', 'Unpublish']] : [['sched', 'Schedule'], ['now', 'Publish now'], ['draft', 'Keep as draft']]);
    const n = W.prayers.length, [status, stColor] = W.id ? this.wkStatusOf({ publish_at: W.was }) : ['New week', 'var(--color-neutral-700)'];
    const sd = W.sd ? new Date(W.sd + 'T' + (W.st || '06:00')) : null;
    return { ...out, wkStatus: status, wkStColor: stColor, wkHeading: 'Week of ' + this.wkFmt(W.week_of), wkCanDelete: !!W.id,
      wkPaste: S.wkPaste || '', onWkPaste: e => this.setState({ wkPaste: e.target.value, wkNote: '' }), wkNoPaste: !(S.wkPaste || '').trim(), wkSplit: () => this.wkSplit(),
      wkSplitNote: S.wkNote || (n ? 'Splitting replaces the prayers below.' : 'Numbered prayers, scripture references and the closing line are picked up automatically.'),
      wkWeekOf: W.week_of, onWkWeekOf: e => this.wkPatch({ week_of: e.target.value }), wkTitle: W.title, onWkTitle: e => this.wkPatch({ title: e.target.value }),
      wkIntro: W.intro, onWkIntro: e => this.wkPatch({ intro: e.target.value }), wkClosing: W.closing, onWkClosing: e => this.wkPatch({ closing: e.target.value }),
      wkCountLabel: n + (n === 1 ? ' prayer' : ' prayers'),
      wkPrayers: W.prayers.map((p, i) => ({ n: i + 1, text: p.text, ref: p.ref, rows: Math.max(3, Math.ceil(p.text.length / 90)),
        onText: e => { const v = e.target.value; this.wkPr(a => { a[i].text = v; }); }, onRef: e => { const v = e.target.value; this.wkPr(a => { a[i].ref = v; }); },
        first: i === 0, last: i === n - 1, upOp: i === 0 ? 0.3 : 1, downOp: i === n - 1 ? 0.3 : 1,
        up: () => this.wkPr(a => { if (i > 0) [a[i - 1], a[i]] = [a[i], a[i - 1]]; }), down: () => this.wkPr(a => { if (i < a.length - 1) [a[i + 1], a[i]] = [a[i], a[i + 1]]; }),
        del: () => this.wkPr(a => { a.splice(i, 1); }) })),
      wkAddPrayer: () => this.wkPr(a => { a.push({ text: '', ref: '' }); }),
      wkModes: modes.map(([k, label]) => ({ label, on: W.mode === k, ...seg(W.mode === k), pick: () => this.wkPatch({ mode: k }) })),
      wkIsSched: W.mode === 'sched', wkSchedDate: W.sd || '', onWkSchedDate: e => this.wkPatch({ sd: e.target.value }), wkSchedTime: W.st || '06:00', onWkSchedTime: e => this.wkPatch({ st: e.target.value }),
      wkModeNote: W.mode === 'sched' ? (sd && !isNaN(sd) ? 'Goes live for readers on ' + sd.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }) + ' at ' + sd.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) + ' (your time).' : '') : W.mode === 'now' ? 'Readers see it the next time they open the book.' : W.mode === 'live' ? 'Readers can see this week. Changes show the next time they open the book.' : 'Only editors can see it.',
      wkHasErr: !!S.wkErr, wkErr: S.wkErr || '', wkBusy: !!S.wkBusy, wkDirty: !!S.wkDirty,
      wkSaveLabel: S.wkBusy ? 'Saving…' : W.mode === 'now' ? 'Publish now' : W.mode === 'sched' ? 'Schedule' : W.mode === 'live' ? 'Save changes' : 'Save draft',
      wkDelete: () => this.wkDelete() };
  }
  insightsVals() {
    const S = this.state, rows = S.ins, days = S.insDays || 30;
    const seg = a => ({ bg: a ? 'var(--color-accent-100)' : 'transparent', color: a ? 'var(--color-accent-800)' : 'var(--color-text)' });
    const base = { isInsights: S.tab === 'insights', insLoading: !!S.insLoading, insHasErr: !!S.insErr, insErr: S.insErr || '', insReady: !!rows && !S.insLoading,
      insRangeOpts: [[7, '7 days'], [30, '30 days'], [90, '90 days'], [365, 'Year']].map(([v, label]) => ({ label, on: days === v, ...seg(days === v), pick: () => this.loadInsights(v) })) };
    if (!rows || S.tab !== 'insights') return { ...base, insStats: [], insDayBars: [], insParts: [], insTop: [], insSecs: [], insThemes: [] };
    const byDay = {}, pr = {}, sec = {}, th = {}; let tp = 0, to = 0;
    rows.forEach(r => {
      if (r.kind === 'pray') { tp += r.n; byDay[r.day] = (byDay[r.day] || 0) + r.n; pr[r.ref] = (pr[r.ref] || 0) + r.n; }
      else if (r.kind === 'open') { to += r.n; sec[r.ref] = (sec[r.ref] || 0) + r.n; }
      else if (r.kind === 'search') th[r.ref] = (th[r.ref] || 0) + r.n;
    });
    const pos = {}, spos = {};
    this.pub.forEach((p, pi) => p.sections.forEach((s, si) => { spos[s.u] = { num: `${pi + 1}.${si + 1}`, title: s.title, pi }; s.prayers.forEach((x, i) => { pos[x.u] = { num: `${pi + 1}.${si + 1}.${i + 1}`, text: x.text, pi }; }); }));
    const part = {}; Object.entries(pr).forEach(([u, n]) => { if (pos[u]) part[pos[u].pi] = (part[pos[u].pi] || 0) + n; });
    const dl = []; for (let i = days - 1; i >= 0; i--) { const x = new Date(); x.setDate(x.getDate() - i); const k = this.dkey(x); dl.push({ k, n: byDay[k] || 0 }); }
    const max = Math.max(1, ...dl.map(x => x.n)), pmax = Math.max(1, ...Object.values(part));
    const top = o => Object.entries(o).sort((a, b) => b[1] - a[1]);
    const tops = top(pr).filter(([u]) => pos[u]).slice(0, 12).map(([u, n]) => ({ num: pos[u].num, text: pos[u].text, n, go: () => this.goPrayer(u) }));
    const secs = top(sec).filter(([u]) => spos[u]).slice(0, 12).map(([u, n]) => ({ num: spos[u].num, text: spos[u].title, n, go: () => this.setState({ tab: 'content', sel: { kind: 'section', u } }) }));
    const active = Object.keys(byDay).length;
    return { ...base,
      insStats: [[tp, 'Prayers checked'], [to, 'Sessions started'], [active, 'Active days'], [active ? Math.round(tp / active) : 0, 'Prayers per active day']].map(([v, label]) => ({ v: v.toLocaleString(), label })),
      insDayBars: dl.map(x => ({ h: `${Math.round(x.n / max * 100)}%`, label: `${this.fmt(x.k)}: ${x.n}` })), insFirst: this.fmt(dl[0].k),
      insParts: this.pub.map((p, pi) => ({ label: this.partLabel(pi), n: (part[pi] || 0).toLocaleString(), w: `${((part[pi] || 0) / pmax) * 100}%` })),
      insTop: tops, insNoTop: !tops.length, insSecs: secs, insNoSecs: !secs.length,
      insThemes: top(th).slice(0, 16).map(([label, n]) => ({ label, n })), insNoThemes: !Object.keys(th).length };
  }
  async versionData(v) {
    if (v === 0) return this.clone(this.bundled);
    const { data, error } = await this.vq('data').eq('version', v).single();
    if (error) throw error; return this.ensureU(data.data);
  }
  async restoreVersion(v) {
    if (!window.confirm(`Replace the current draft with ${v ? `version ${v}` : 'the original book'}? Unpublished changes will be replaced. You can undo this until you publish.`)) return;
    try {
      const data = await this.versionData(v);
      this.mut(v ? `Restored version ${v}` : 'Restored the original book', null, d => { d.splice(0, d.length, ...data); });
      this.setState({ tab: 'content', sel: null }); this.toast('Restored to the draft. Review it, then publish.');
    } catch (e) { this.toast('Couldn’t load that version'); }
  }
  async downloadVersion(v) {
    try {
      const data = await this.versionData(v), a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' })); a.download = `covenant-prayers-v${v}.json`; document.body.appendChild(a); a.click(); a.remove();
    } catch (e) { this.toast('Couldn’t download that version'); }
  }
  historyVals() {
    const S = this.state; if (S.tab !== 'history') return { isHistory: false };
    const df = this.diff(), log = this.log.slice().reverse();
    const fmtT = t => { const d = new Date(t); return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); };
    const vers = [...(this.versions || []).map(v => ({ v: v.version, at: v.published_at, by: v.published_by_email, note: v.note, stats: v.stats || {} })), { v: 0, at: null, by: null, note: 'The book as first loaded into the app', stats: { parts: this.bundled.length, sections: this.bundled.reduce((a, p) => a + p.sections.length, 0), prayers: this.bundled.reduce((a, p) => a + p.sections.reduce((b, s) => b + s.prayers.length, 0), 0) } }];
    return { isHistory: true, logEmpty: !df.total && !log.length, logSummary: df.total ? `${df.total} ${df.total === 1 ? 'change' : 'changes'} since version ${S.pubV}` : `No changes since version ${S.pubV}`,
      logList: log.slice(0, 200).map(l => ({ what: l.what, when: fmtT(l.t), by: l.by || '' })), discardDraft: () => this.discardDraft(),
      verList: vers.map(v => ({ title: v.v ? `Version ${v.v}` : 'Original book', live: v.v === S.pubV, when: v.at ? fmtT(v.at) : 'Version 0', hasNote: !!v.note, note: v.note || '',
        meta: [v.by && `by ${v.by}`, v.stats.parts != null && `${v.stats.parts} parts · ${v.stats.sections} sections · ${v.stats.prayers} prayers`].filter(Boolean).join(' · '),
        restore: () => this.restoreVersion(v.v), download: () => this.downloadVersion(v.v) })) };
  }
}
