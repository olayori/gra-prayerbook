class Component extends DCLogic {
  SB_URL = 'https://sjcosqxtgllfwldhnoax.supabase.co';
  SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqY29zcXh0Z2xsZndsZGhub2F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4NTQ5MjYsImV4cCI6MjEwNzQzMDkyNn0.HQsm-M6Ut1RHoXtDHEIjiCvPQq-P3irRh0uHgQ3lFx0';
  state = { view: 'home', savedTab: 'fav', cov: null, jc: null, weeks: null, tick: 0, menu: false, q: '', qBook: 'all', pw0: '', pw1: '', pw2: '', pwMsg: '', pwOk: false, pwBusy: false, del: false, delTxt: '', delMsg: '', delBusy: false };
  applyFeel() { const p = this.props || {}, de = document.documentElement; de.setAttribute('data-feel', String(p.feel || 'Soft').toLowerCase()); de.setAttribute('data-motion', String(p.motion || 'Calm').toLowerCase()); de.setAttribute('data-density', String(p.density || 'Comfortable').toLowerCase()); }
  async token() {
    const k = 'gra-covenant-auth'; let s = this.ls(k, null); if (s && s.currentSession) s = s.currentSession; if (!s || !s.access_token) throw new Error('Please sign in again.');
    if (s.expires_at && s.expires_at * 1000 < Date.now() + 60000 && s.refresh_token) {
      const r = await fetch(`${this.SB_URL}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: this.SB_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: s.refresh_token }) });
      if (!r.ok) throw new Error('Your session expired. Sign in again to continue.'); const n = await r.json(); if (!n.expires_at && n.expires_in) n.expires_at = Math.floor(Date.now() / 1000) + n.expires_in;
      try { localStorage.setItem(k, JSON.stringify(n)); } catch (e) {} s = n;
    }
    return s.access_token;
  }
  async changePw(e) {
    if (e) e.preventDefault(); const S = this.state; if (S.pwBusy) return;
    if (!S.pw0) return this.setState({ pwMsg: 'Enter your current password.', pwOk: false });
    if (S.pw1.length < 8) return this.setState({ pwMsg: 'Use at least 8 characters.', pwOk: false });
    if (S.pw1 === S.pw0) return this.setState({ pwMsg: 'Choose a password different from your current one.', pwOk: false });
    if (S.pw1 !== S.pw2) return this.setState({ pwMsg: 'The two passwords don’t match.', pwOk: false });
    this.setState({ pwBusy: true, pwMsg: '' });
    try {
      const u = this.acctUser(); if (!u || !u.email) throw new Error('Sign in again, then try changing your password.');
      const vr = await fetch(`${this.SB_URL}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: this.SB_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: u.email, password: S.pw0 }) });
      if (!vr.ok) throw new Error('Your current password isn’t right.');
      const t = (await vr.json()).access_token || await this.token();
      const r = await fetch(`${this.SB_URL}/auth/v1/user`, { method: 'PUT', headers: { apikey: this.SB_KEY, Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: JSON.stringify({ password: S.pw1 }) });
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.msg || j.error_description || j.message || 'Couldn’t update your password. Try again.'); }
      this.setState({ pwBusy: false, pw0: '', pw1: '', pw2: '', pwMsg: 'Password updated.', pwOk: true });
    } catch (err) { this.setState({ pwBusy: false, pwMsg: navigator.onLine === false ? 'You’re offline. Connect and try again.' : err.message, pwOk: false }); }
  }
  async deleteAcct() {
    if (this.state.delBusy || this.state.delTxt.trim().toUpperCase() !== 'DELETE') return;
    this.setState({ delBusy: true, delMsg: '' });
    try {
      const t = await this.token();
      const r = await fetch(`${this.SB_URL}/rest/v1/rpc/delete_my_account`, { method: 'POST', headers: { apikey: this.SB_KEY, Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: '{}' });
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.message || 'Couldn’t delete your account. Try again.'); }
      this.clearLocal(); this.setState({ del: false, delTxt: '', delBusy: false }); window.alert('Your account has been deleted.');
    } catch (err) { this.setState({ delBusy: false, delMsg: navigator.onLine === false ? 'You’re offline. Connect and try again.' : err.message }); }
  }
  qRef = React.createRef();
  pk() { return this.state.planKind || 'pray'; }
  gpLoad(k) { k = k || 'pray'; try { return JSON.parse(localStorage.getItem(k === 'read' ? 'gra-library-readplan' : 'gra-library-plan')) || null; } catch (e) { return null; } }
  gpSave(p, k) { k = k || (p && p.kind) || this.pk(); try { if (p) localStorage.setItem(k === 'read' ? 'gra-library-readplan' : 'gra-library-plan', JSON.stringify(p)); else localStorage.removeItem(k === 'read' ? 'gra-library-readplan' : 'gra-library-plan'); } catch (e) {} }
  gpDk(d) { d = d || new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  gpUnits(book, data, pn) {
    if (book.startsWith('nr-')) { const b = (this.state.nr || {})[book.slice(3)], c = b && b.chapters[pn - 1]; return c ? [{ u: `${book}:c${pn}`, book, p: pn, id: `c${pn}`, nr: book.slice(3), label: `${pn} · ${c.title}`, ids: [] }] : []; }
    const P = (data || [])[pn - 1]; if (!P) return [];
    if (book === 'jcfp') { const ids = []; P.sections.forEach((s, si) => { if (s.kind === 'list' || (s.prayers || []).some(x => x.link === 'weekly')) return; (s.prayers || []).forEach((_, i) => ids.push(`s-${pn}-${si + 1}-${i + 1}`)); });
      return ids.length ? [{ u: `jcfp:part-${pn}`, book, p: pn, id: `part-${pn}`, label: P.label || P.title, ids }] : []; }
    return P.sections.map((s, si) => ({ u: `${book}:s-${pn}-${si + 1}`, book, p: pn, id: `s-${pn}-${si + 1}`, label: `${pn}.${si + 1} · ${s.title}`, ids: (s.prayers || []).map((_, i) => `s-${pn}-${si + 1}-${i + 1}`) }));
  }
  gpSort(units) { const o = { covenant: 0, jcfp: 1 }; return units.slice().sort((a, b) => ((o[a.book] ?? 2) - (o[b.book] ?? 2)) || a.book.localeCompare(b.book) || (a.p - b.p) || a.u.localeCompare(b.u, undefined, { numeric: true })); }
  gpDone(u) {
    const t = this.gpDk(), rd = k => { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } };
    if (u.weekly) return ((rd('gra-weekly-hist')[t]) || []).length > 0 || ((rd('gra-covenant-hist')[t]) || []).some(x => String(x).startsWith('w-'));
    if (u.nr) return !!rd(`gra-nr-${u.nr}-done`)[u.p - 1];
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

  ls(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  acctUser() { const a = this.ls('gra-covenant-auth', null); return (a && (a.user || (a.currentSession && a.currentSession.user))) || null; }
  acctVals() {
    const u = this.acctUser() || {}, name = ((u.user_metadata || {}).name || '').trim();
    const books = [['covenant', 'Book of Covenant Prayers'], ['jcfp', 'Jesus Chosen Fast and Prayer'], ['weekly', 'Weekly Kingdom Prayers']];
    return { acctEmail: u.email || 'Signed in on this device', acctName: name, acctHasName: !!name,
      acctBooks: books.map(([k, title]) => ({ title, state: this.ls('gra-' + k + '-dirty', 0) ? 'Changes waiting to sync' : this.ls('gra-' + k + '-syncMeta', null) ? 'Up to date' : 'Not opened yet' })),
      signOut: () => this.signOut() };
  }
  remLoad() { const r = this.ls('gra-reminders', null) || {}; return { on: !!r.on, times: Array.isArray(r.times) && r.times.length ? r.times : ['06:00', '21:00'], days: Array.isArray(r.days) && r.days.length === 7 ? r.days : [true, true, true, true, true, true, true] }; }
  remSave(patch) { const r = { ...(this.state.rem || this.remLoad()), ...patch }; try { localStorage.setItem('gra-reminders', JSON.stringify(r)); } catch (e) {} this.setState({ rem: r }); }
  remMsg() { const c = p => p && p.today && p.today.d === this.gpDk() ? (p.today.ids || []).length : 0, n = c(this.state.gp) + c(this.state.rp); return n ? `${n} prayer${n === 1 ? '' : 's'} in today’s plan are waiting for you.` : 'Take a quiet moment with this week’s Kingdom Prayers.'; }
  async remNotify(title, body) {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;
    const opt = { body, icon: 'icon-192.png', badge: 'icon-192.png', tag: 'gra-reminder', data: { url: location.href.split('#')[0] } };
    try { const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration(); if (reg) { await reg.showNotification(title, opt); return true; } } catch (e) {}
    try { new Notification(title, opt); return true; } catch (e) { return false; }
  }
  remCheck() {
    const r = this.state.rem; if (!r || !r.on) return; const now = new Date(); if (!r.days[now.getDay()]) return;
    const day = this.gpDk(now), fired = this.ls('gra-reminders-fired', {}) || {}, keep = {}; let ch = false;
    Object.keys(fired).forEach(k => { if (k.startsWith(day)) keep[k] = 1; });
    r.times.forEach(t => { const [hh, mm] = t.split(':').map(Number), at = new Date(now); at.setHours(hh, mm, 0, 0); const d = now - at, k = day + ' ' + t;
      if (d >= 0 && d < 3600000 && !keep[k]) { keep[k] = 1; ch = true; this.remNotify('Time to pray', this.remMsg()); } });
    if (ch || Object.keys(keep).length !== Object.keys(fired).length) try { localStorage.setItem('gra-reminders-fired', JSON.stringify(keep)); } catch (e) {}
  }
  async remAsk() { if (typeof Notification === 'undefined') return; let p = Notification.permission; try { p = await Notification.requestPermission(); } catch (e) {} this.setState({ perm: p }); if (p === 'granted' && !(this.state.rem || {}).on) this.remSave({ on: true }); }
  async remTest() { const ok = await this.remNotify('Time to pray', this.remMsg()); if (!ok) window.alert(this.state.perm === 'denied' ? 'Notifications are blocked for this site. Turn them on in your browser settings, or use Add to calendar.' : 'Allow notifications first, or use Add to calendar.'); }
  remIcs() {
    const r = this.state.rem || this.remLoad(), BY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].filter((_, i) => r.days[i]).join(','), p2 = n => String(n).padStart(2, '0'), d = new Date();
    const stamp = d.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, ''), ds = `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}`, url = location.href.split('#')[0];
    const ev = r.times.map(t => { const [hh, mm] = t.split(':'); return ['BEGIN:VEVENT', `UID:gra-reminder-${hh}${mm}@gra-prayer-library`, 'DTSTAMP:' + stamp, `DTSTART:${ds}T${hh}${mm}00`, 'DURATION:PT15M', 'RRULE:FREQ=WEEKLY;BYDAY=' + (BY || 'SU,MO,TU,WE,TH,FR,SA'), 'SUMMARY:Prayer time · GRA', 'DESCRIPTION:' + this.remMsg().replace(/[,;]/g, '\\  signOut() {') + '\\n' + url, 'URL:' + url, 'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', 'DESCRIPTION:Time to pray', 'END:VALARM', 'END:VEVENT'].join('\r\n'); });
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GRA//Prayer Library//EN', 'CALSCALE:GREGORIAN', ...ev, 'END:VCALENDAR'].join('\r\n');
    const u = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })), a = document.createElement('a'); a.href = u; a.download = 'overcomers-library-reminders.ics'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 5000);
  }
  signOut() {
    const dirty = ['covenant', 'jcfp', 'weekly'].some(k => this.ls('gra-' + k + '-dirty', 0));
    if (!window.confirm(dirty ? 'Some recent changes haven’t synced yet and will be lost on this device. Sign out anyway?' : 'Sign out on this device? Your progress is saved to your account.')) return;
    this.clearLocal();
  }
  clearLocal() {
    try {
      ['prayed', 'fav', 'bookmarks', 'plan', 'ink', 'last', 'member', 'syncMeta', 'dirty', 'pendingCode', 'unlocked', 'hist', 'lastP', 'lastSess'].forEach(k => ['gra-covenant-', 'gra-jcfp-', 'gra-weekly-'].forEach(px => localStorage.removeItem(px + k)));
      Object.keys(localStorage).filter(k => k.startsWith('gra-covenant-auth')).forEach(k => localStorage.removeItem(k));
    } catch (e) {}
    this.setState({ view: 'home', menu: false }, () => { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} window.scrollTo(0, 0); });
  }
  componentDidMount() {
    if (/^#(s-\d|part-|contents|top)/.test(location.hash)) { location.replace('covenant/' + location.hash); return; }
    const v = (location.hash || '').slice(1); if (['reminders', 'library', 'search', 'plan', 'saved', 'stats', 'account'].includes(v)) this.setState({ view: v });
    this.applyFeel(); this.setState({ rem: this.remLoad(), perm: typeof Notification !== 'undefined' ? Notification.permission : 'unsupported' });
    this._remI = setInterval(() => this.remCheck(), 30000); setTimeout(() => this.remCheck(), 3000);
    this.applyTheme(); this.injectPWA();
    this.setState({ weeks: this.ls('gra-covenant-weekly', []) || [] });
    this.loadCov(); this.loadJc(); this.loadNr();
    this.loadWeeks(); this.gpMigrate(); this.gpRefresh();
    if (!this.ls('gra-onboarded', null)) this.setState({ ob: 0 });
    this.onShow = () => { document.querySelectorAll('[data-cover-fly]').forEach(n => n.remove()); if (document.visibilityState === 'visible') { this.applyTheme(); this.gpRefresh(); this.setState(s => ({ tick: s.tick + 1 })); this.loadWeeks(); } };
    this.onKey = e => { if (e.key === 'Escape' && this.state.menu) this.setState({ menu: false }); };
    document.addEventListener('visibilitychange', this.onShow); window.addEventListener('pageshow', this.onShow); window.addEventListener('keydown', this.onKey);
  }
  componentDidUpdate() {
    this.i18nSync();
    this.applyFeel();
    const S = this.state; if (!S.cov || (this._gpCov === S.cov && this._gpJc === S.jc && this._gpNr === S.nr)) return;
    this._gpCov = S.cov; this._gpJc = S.jc; this._gpNr = S.nr; this.gpRefresh(!!S.jc);
  }
  gpMigrate() {
    if (this.gpLoad()) return; const old = this.ls('gra-covenant-plan', null); if (!old || !old.wdays) return;
    this._mig = { items: old.scope === 'parts' && Array.isArray(old.parts) ? old.parts.map(n => ({ book: 'covenant', part: n })) : 'all', weekly: { on: false, wday: 1 }, perDay: old.perDay || 1, wdays: old.wdays, start: old.start || this.gpDk(), days: old.days || [], units: [], today: null };
  }
  gpData(b) { return b === 'jcfp' ? this.state.jc : this.state.cov; }
  gpBuild(items) { return this.gpSort(items.flatMap(x => this.gpUnits(x.book, this.gpData(x.book), x.part))); }
  gpRefresh(rebuild) {
    const out = {};
    ['pray', 'read'].forEach(k => {
    let p = this.gpLoad(k);
    if (k === 'pray' && !p && this._mig && this.state.cov) { const m = this._mig; this._mig = null; if (m.items === 'all') m.items = this.state.cov.map((_, i) => ({ book: 'covenant', part: i + 1 })); m.units = this.gpBuild(m.items); p = m; }
    if (p) p = { ...p, kind: k, weekly: { on: false, wday: 1 }, items: (p.items || []).filter(x => k === 'read' ? String(x.book).startsWith('nr-') : !String(x.book).startsWith('nr-')) };
    if (p && rebuild && this.state.cov && this.state.jc) p = { ...p, units: this.gpBuild(p.items || []) };
    if (p) { this.gpSave(p, k); p = this.gpEnsure(p); }
    out[k === 'read' ? 'rp' : 'gp'] = p || null;
    });
    this.setState(out);
  }
  peOpen() { const p = this.pk() === 'read' ? this.state.rp : this.state.gp; this.setState({ pe: p ? { items: (p.items || []).map(x => `${x.book}:${x.part}`), wk: p.weekly && p.weekly.on ? p.weekly.wday : -1, perDay: p.perDay || 1, wdays: [...p.wdays] } : { items: [], wk: -1, perDay: 1, wdays: [true, true, true, true, true, true, true] }, peErr: '' }); }
  peSet(patch) { this.setState({ pe: { ...this.state.pe, ...patch }, peErr: '' }); }
  peSave() {
    const kind = this.pk(), e = this.state.pe; if (!e.items.length) return this.setState({ peErr: kind === 'read' ? 'Choose at least one book.' : 'Choose at least one part or watch.' });
    if (!e.wdays.some(Boolean)) return this.setState({ peErr: kind === 'read' ? 'Choose at least one reading day.' : 'Choose at least one prayer day.' });
    const old = kind === 'read' ? this.state.rp : this.state.gp, items = e.items.map(s => { const [book, n] = s.split(':'); return { book, part: Number(n) }; });
    let p = { kind, items, weekly: { on: false, wday: 1 }, perDay: e.perDay, wdays: e.wdays, start: old ? old.start : this.gpDk(), days: old ? old.days || [] : [], units: this.gpBuild(items), today: null };
    this.gpSave(p, kind); p = this.gpEnsure(p); this.setState({ [kind === 'read' ? 'rp' : 'gp']: p, pe: null }, () => window.scrollTo(0, 0));
  }
  planEnd() { const k = this.pk(); if (!window.confirm(k === 'read' ? 'End your reading plan? Your finished chapters stay in each book.' : 'End your prayer plan? Your prayed marks stay in each book.')) return; this.gpSave(null, k); if (k === 'pray') { try { localStorage.removeItem('gra-covenant-plan'); } catch (e) {} } this.setState({ [k === 'read' ? 'rp' : 'gp']: null, pe: null }); }
  componentWillUnmount() { clearInterval(this._remI); document.removeEventListener('visibilitychange', this.onShow); window.removeEventListener('pageshow', this.onShow); window.removeEventListener('keydown', this.onKey); }
  i18nSync() {
    const L = window.GRAi18n;
    if (!L) { if (!this._i18nWait) { this._i18nWait = 1; setTimeout(() => { this._i18nWait = 0; this.forceUpdate(); }, 300); } return; }
    if (L.lang === 'en') return;
    this._txIn = this._txIn || {}; this._txOut = this._txOut || {};
    ['cov', 'jc', 'weeks'].forEach(k => {
      const v = this.state[k]; if (!v || !v.length || this._txOut[k] === v || this._txIn[k] === v) return;
      this._txIn[k] = v;
      L.translateData(v).then(r => { if (this.state[k] !== v) return; this._txOut[k] = r.data; this.setState({ [k]: r.data }); });
    });
  }
  openCover(e, href, solid, cv) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    const de = document.documentElement, still = de.getAttribute('data-motion') === 'still' || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    const el = e.currentTarget && e.currentTarget.firstElementChild;
    if (still || !el || !el.animate) return;
    e.preventDefault();
    const r = el.getBoundingClientRect(), W = window.innerWidth, H = window.innerHeight;
    const f = document.createElement('div'), veil = document.createElement('div');
    f.setAttribute('data-cover-fly', ''); veil.setAttribute('data-cover-fly', '');
    const from = `inset(${r.top}px ${W - r.right}px ${H - r.bottom}px ${r.left}px round 3px 8px 8px 3px)`;
    Object.assign(f.style, { position: 'fixed', inset: '0', zIndex: '100', backgroundColor: solid, backgroundImage: cv && /gradient/.test(cv) ? cv.replace(/,\s*#[0-9a-f]{3,8}\s*$/i, '') : 'none', pointerEvents: 'none', clipPath: from, willChange: 'clip-path', boxShadow: 'inset 10px 0 0 rgba(0,0,0,.18)' });
    Object.assign(veil.style, { position: 'fixed', inset: '0', zIndex: '101', background: solid, opacity: '0', pointerEvents: 'none' });
    document.body.appendChild(f); document.body.appendChild(veil);
    try { sessionStorage.setItem('gra-enter', solid); } catch (x) {}
    el.animate([{ transform: 'none' }, { transform: 'translateY(-4px) scale(1.02)' }], { duration: 140, easing: 'ease-out', fill: 'forwards' });
    const ez = 'cubic-bezier(.65,0,.25,1)';
    f.animate([{ clipPath: from }, { clipPath: 'inset(0px 0px 0px 0px round 0px)' }], { duration: 560, delay: 90, easing: ez, fill: 'forwards' });
    veil.animate([{ opacity: 0 }, { opacity: 0, offset: 0.55 }, { opacity: 1 }], { duration: 650, easing: 'ease-in', fill: 'forwards' }).onfinish = () => { location.href = href; };
    setTimeout(() => document.querySelectorAll('[data-cover-fly]').forEach(n => n.remove()), 4000);
  }
  async shareMonth(m) {
    const T = s => (window.GRAi18n ? window.GRAi18n.t(s) : s);
    const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    try { await document.fonts.ready; } catch (e) {}
    const cs = getComputedStyle(document.documentElement), serif = (cs.getPropertyValue('--font-heading') || '').trim() || 'Georgia, serif', sans = (cs.getPropertyValue('--font-body') || '').trim() || 'system-ui, sans-serif';
    const g = x.createRadialGradient(W * .3, H * .18, 40, W * .5, H * .5, H * .85); g.addColorStop(0, '#33407a'); g.addColorStop(1, '#171d40'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.strokeStyle = 'rgba(230,196,122,.55)'; x.lineWidth = 2; x.strokeRect(56, 56, W - 112, H - 112);
    x.save(); x.beginPath(); x.rect(56, 56, W - 112, H - 112); x.clip();
    const sun = x.createRadialGradient(W / 2, H + 120, 0, W / 2, H + 120, 560); sun.addColorStop(0, 'rgba(230,196,122,.5)'); sun.addColorStop(.45, 'rgba(230,196,122,.16)'); sun.addColorStop(1, 'rgba(230,196,122,0)'); x.fillStyle = sun; x.fillRect(0, H - 520, W, 520);
    x.restore();
    x.textAlign = 'center'; x.fillStyle = '#e6c47a'; x.font = `500 26px ${sans}`; try { x.letterSpacing = '6px'; } catch (e) {}
    x.fillText(T('God’s Remnant Assembly').toUpperCase(), W / 2, 168); try { x.letterSpacing = '0px'; } catch (e) {}
    x.fillStyle = '#f2ecde'; x.font = `italic 400 88px ${serif}`; x.fillText(m.title, W / 2, 320);
    x.fillStyle = 'rgba(242,236,222,.82)'; x.font = `400 34px ${sans}`; x.fillText(T('My month of prayer'), W / 2, 384);
    m.tiles.forEach((t, i) => { const y = 600 + i * 220; x.fillStyle = '#e6c47a'; x.font = `400 150px ${serif}`; x.fillText(t.v, W / 2, y); x.fillStyle = '#f2ecde'; x.font = `400 34px ${sans}`; x.fillText(t.k, W / 2, y + 58); });
    x.fillStyle = 'rgba(242,236,222,.75)'; x.font = `400 28px ${sans}`; x.fillText(T('Overcomer’s Library'), W / 2, H - 110);
    const blob = await new Promise(res => c.toBlob(res, 'image/png')); if (!blob) return;
    const file = new File([blob], 'gra-month-of-prayer.png', { type: 'image/png' });
    try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: m.title }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    const u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = file.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
  }
  obDone() {
    try { localStorage.setItem('gra-onboarded', JSON.stringify(Date.now())); } catch (e) {}
    const d = document.querySelector('[data-ob]'), still = document.documentElement.getAttribute('data-motion') === 'still' || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (!d || still || !d.animate) return this.setState({ ob: null });
    const ez = 'cubic-bezier(.2,.7,.2,1)';
    d.querySelectorAll('[data-ob-cover]').forEach((c, i) => c.animate([{ transform: getComputedStyle(c).transform, opacity: 1 }, { transform: `translate(${(i - 1) * 90}px, -70px) rotate(${(i - 1) * 9}deg) scale(1.25)`, opacity: 0 }], { duration: 640, delay: i * 70, easing: ez, fill: 'forwards' }));
    d.querySelectorAll(':scope > div:not(:first-child) h2, :scope > div:not(:first-child) p, :scope > div:last-child').forEach(n => n.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(12px)' }], { duration: 260, easing: 'ease-in', fill: 'forwards' }));
    d.animate([{ clipPath: 'circle(150% at 50% 40%)' }, { clipPath: 'circle(0% at 50% 40%)' }], { duration: 620, delay: 300, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' }).onfinish = () => this.setState({ ob: null }, () => {
      const kids = document.querySelectorAll('[data-lay="home"] > *, header, [data-lay="nav"]');
      kids.forEach((k, i) => k.animate && k.animate([{ opacity: 0, transform: 'translateY(18px) scale(.985)' }, { opacity: 1, transform: 'none' }], { duration: 560, delay: Math.min(i, 8) * 55, easing: ez, fill: 'backwards' }));
    });
  }
  async loadCov() {
    try { const c = await caches.open('gra-book'); const r = await c.match('book.json'); if (r) { const b = await r.json(); if (b && Array.isArray(b.data)) return this.setState({ cov: b.data }); } } catch (e) {}
    fetch('prayers.json').then(r => r.json()).then(cov => this.setState({ cov })).catch(() => {});
  }
  NR = ['rooted'];
  loadNr() { this.NR.forEach(slug => fetch('books/' + slug + '.json').then(r => r.json()).then(b => this.setState(s => ({ nr: { ...(s.nr || {}), [slug]: b } }))).catch(() => {})); }
  nlink(slug, hash) { if (/\.dc\.html$/.test(decodeURIComponent(location.pathname))) return `Book Reader.dc.html?b=${slug}${hash || ''}`; return `read/${location.protocol === 'file:' ? 'index.html' : ''}?b=${slug}${hash || ''}`; }
  blink(hash) { if (/\.dc\.html$/.test(decodeURIComponent(location.pathname))) return 'Bible Reader.dc.html' + (hash || ''); return `bible/${location.protocol === 'file:' ? 'index.html' : ''}${hash || ''}`; }
  nrPlain(t) { return String(t).replace(/^> /, '').replace(/^## /, '').replace(/\[\[([^\]]+)\]\]/g, '$1'); }
  async loadJc() {
    try { const c = await caches.open('gra-book'); const r = await c.match('jcfp.json'); if (r) { const b = await r.json(); if (b && Array.isArray(b.data)) return this.setState({ jc: b.data }); } } catch (e) {}
    fetch('jcfp.json').then(r => r.json()).then(jc => this.setState({ jc })).catch(() => {});
  }
  async loadWeeks() {
    if (navigator.onLine === false) return;
    try {
      const u = `${this.SB_URL}/rest/v1/weekly_prayers?select=week_of,title,intro,prayers,closing&publish_at=not.is.null&publish_at=lte.${encodeURIComponent(new Date().toISOString())}&order=week_of.desc`;
      const r = await fetch(u, { headers: { apikey: this.SB_KEY, Authorization: 'Bearer ' + this.SB_KEY } });
      if (!r.ok) { this.setState({ weeksLoaded: true, wkErr: !(this.state.weeks || []).length }); return; } const rows = await r.json();
      if (Array.isArray(rows) && !rows.length && (this.state.weeks || []).length) { this.setState({ weeksLoaded: true, wkErr: false }); return; }
      if (Array.isArray(rows)) { try { localStorage.setItem('gra-covenant-weekly', JSON.stringify(rows)); } catch (e) {} this.setState({ weeks: rows, weeksLoaded: true, wkErr: false }); }
    } catch (e) { this.setState({ weeksLoaded: true, wkErr: !(this.state.weeks || []).length }); }
  }
  theme() { return (this.ls('gra-covenant-settings', {}) || {}).theme || 'auto'; }
  setTheme(t) {
    ['covenant', 'jcfp', 'weekly'].forEach(b => { const k = `gra-${b}-settings`, s = this.ls(k, {}) || {}; try { localStorage.setItem(k, JSON.stringify({ ...s, theme: t })); } catch (e) {} });
    this.applyTheme(); this.setState(s => ({ tick: s.tick + 1 }));
  }
  applyTheme() {
    const t = this.theme();
    const dark = t === 'dark' || (t === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    const de = document.documentElement; if (dark) de.setAttribute('data-theme', 'dark'); else if (t === 'sepia') de.setAttribute('data-theme', 'sepia'); else de.removeAttribute('data-theme');
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', dark ? '#1a1714' : t === 'sepia' ? '#f3ead6' : '#f3f2f2');
  }
  injectPWA() {
    if (location.protocol !== 'https:' || /claudeusercontent|localhost|127\.0\.0\.1/.test(location.hostname)) return;
    const add = (tag, a) => { const e = document.createElement(tag); Object.keys(a).forEach(k => e.setAttribute(k, a[k])); document.head.appendChild(e); };
    add('link', { rel: 'manifest', href: 'manifest.webmanifest' }); add('link', { rel: 'apple-touch-icon', href: 'apple-touch-icon.png' });
    add('meta', { name: 'apple-mobile-web-app-title', content: 'GRA Prayer' });
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  dkey(d) { d = d || new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  fmtWeek(w) { const [y, m, d] = w.week_of.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }); }
  isWkLink(s) { return (s.prayers || []).some(x => x.link === 'weekly'); }
  bookIndex(data, jc) {
    const out = {};
    (data || []).forEach((p, pi) => { let run = 0; p.sections.forEach((s, si) => {
      const id = `s-${pi + 1}-${si + 1}`, start = run + 1; if (!(jc && (s.kind === 'list' || this.isWkLink(s)))) run += (s.prayers || []).length;
      out[id] = { num: jc ? (s.kind === 'list' ? '' : String(start)) : `${pi + 1}.${si + 1}`, title: s.title, prayers: s.prayers || [], part: p, pi, start, skip: jc && this.isWkLink(s), list: s.kind === 'list' };
    }); });
    return out;
  }
  stats(data, prayed, jc) { let n = 0, d = 0; (data || []).forEach((p, pi) => p.sections.forEach((s, si) => { if (jc && (s.kind === 'list' || this.isWkLink(s))) return; (s.prayers || []).forEach((_, i) => { n++; if (prayed[`s-${pi + 1}-${si + 1}-${i + 1}`]) d++; }); })); return { n, d }; }
  link(book, hash) {
    if (/\.dc\.html$/.test(decodeURIComponent(location.pathname))) return `Prayer Book Reader.dc.html?book=${book}${hash || ''}`;
    return `${book}/${location.protocol === 'file:' ? 'index.html' : ''}${hash || ''}`;
  }
  where(key, sec, n) {
    if (key === 'jcfp') { const lab = sec.part.label || sec.part.title; if (sec.list) return `${lab} · ${sec.title}`; return n ? `${lab} · Prayer ${sec.start + n - 1}` : lab; }
    return n ? `${sec.num}.${n} · ${sec.title}` : `${sec.num} · ${sec.title}`;
  }
  allHist() {
    const days = {};
    [...['covenant', 'jcfp', 'weekly'].map(b => `gra-${b}-hist`), ...this.NR.map(n => `gra-nr-${n}-hist`), 'gra-bible-hist'].forEach(k => Object.entries(this.ls(k, {}) || {}).forEach(([d, l]) => { const n = (l || []).length; if (n) days[d] = (days[d] || 0) + n; }));
    return days;
  }
  streaks(days) {
    const has = k => !!days[k]; let cur = 0; const d = new Date(); if (!has(this.dkey(d))) d.setDate(d.getDate() - 1);
    while (has(this.dkey(d))) { cur++; d.setDate(d.getDate() - 1); }
    const keys = Object.keys(days).sort(); let best = 0, run = 0, prev = null;
    keys.forEach(k => { const t = new Date(k + 'T12:00:00'); if (prev && Math.round((t - prev) / 864e5) === 1) run++; else run = 1; best = Math.max(best, run); prev = t; });
    return { cur, best: Math.max(best, cur), days: keys.length };
  }
  search(q, idxs, asc) {
    const nq = q.trim().toLowerCase(); if (nq.length < 2) return [];
    const snip = (t, i, L) => { const a = Math.max(0, i - 50); return { pre: (a ? '…' : '') + t.slice(a, i), hit: t.slice(i, i + L), post: t.slice(i + L, i + L + 140) }; };
    const groups = [], F = 'all';
    idxs.forEach(([key, label, idx]) => {
      if (F !== 'all' && F !== key) return;
      const items = []; let total = 0;
      Object.entries(idx).forEach(([sid, sec]) => {
        if (sec.skip) return;
        const ti = (sec.title || '').toLowerCase().indexOf(nq);
        if (ti >= 0) { total++; if (items.length < 40) items.push({ where: this.where(key, sec), ...snip(sec.title, ti, nq.length), href: this.link(key, '#' + sid) }); }
        (sec.list ? [] : sec.prayers).forEach((pr, i) => { const t = pr.text || '', j = t.toLowerCase().indexOf(nq); if (j < 0) return; total++; if (items.length < 40) items.push({ where: this.where(key, sec, i + 1), ...snip(t, j, nq.length), href: this.link(key, `#${sid}-${i + 1}`) }); });
      });
      if (total) groups.push({ key, label: `${label} · ${total}`, items });
    });
    if ((F === 'all' || F === 'weekly') && asc.length) {
      const items = []; let total = 0;
      asc.forEach((w, wi) => (w.prayers || []).forEach((p, i) => { const t = p.text || '', j = t.toLowerCase().indexOf(nq); if (j < 0) return; total++; if (items.length < 40) items.push({ where: `Week of ${this.fmtWeek(w)} · Prayer ${i + 1}`, ...snip(t, j, nq.length), href: this.link('weekly', `#s-1-${wi + 1}-${i + 1}`) }); }));
      if (total) groups.push({ key: 'weekly', label: `GRA Weekly Kingdom Prayers · ${total}`, items });
    }
    return groups;
  }
  renderVals() {
    const S = this.state, on = 'var(--color-accent-700)', off = 'var(--color-neutral-700)', onBg = 'var(--color-accent-100)';
    const member = !!this.ls('gra-covenant-member', null) || !!this.ls('gra-covenant-unlocked', null);
    const rows = S.weeks || [], cur = rows[0], asc = rows.slice().sort((a, b) => b.week_of.localeCompare(a.week_of));
    const weekHref = w => this.link('weekly', `#s-1-${asc.findIndex(x => x.week_of === w.week_of) + 1}`);
    const go = view => () => { const run = done => this.setState({ view, menu: false }, () => { window.scrollTo(0, 0); try { history.replaceState(null, '', view === 'home' ? location.pathname + location.search : '#' + view); } catch (e) {} if (view === 'search') setTimeout(() => this.qRef.current && this.qRef.current.focus(), 60); if (done) done(); });
      const still = document.documentElement.getAttribute('data-motion') === 'still' || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
      if (document.startViewTransition && !still && view !== S.view) { const O = ['home', 'library', 'search', 'saved', 'stats', 'reminders', 'account', 'plan'], a = O.indexOf(S.view), b = O.indexOf(view); document.documentElement.setAttribute('data-vt', a < 0 || b < 0 ? 'fade' : b > a ? 'fwd' : 'back'); document.documentElement.classList.add('vt-on'); const t = document.startViewTransition(() => new Promise(res => run(res))); t.ready.catch(() => {}); t.updateCallbackDone && t.updateCallbackDone.catch(() => {}); t.finished.catch(() => {}).finally(() => document.documentElement.removeAttribute('data-vt')); } else run(); };
    const cp = this.ls('gra-covenant-prayed', {}) || {}, jp = this.ls('gra-jcfp-prayed', {}) || {};
    const cs = this.stats(S.cov, cp), js = this.stats(S.jc, jp, true);
    const cIdx = this.bookIndex(S.cov), jIdx = this.bookIndex(S.jc, true), wIdx = this.bookIndex(cur ? [{ sections: asc.map(w => ({ title: 'Week of ' + this.fmtWeek(w), prayers: w.prayers || [] })) }] : []);
    const pct = st => st.n ? Math.round(st.d / st.n * 100) + '%' : '0%';
    const jWatches = (S.jc || []).filter(p => !/LISTS/.test(p.title)).length, jLists = (S.jc || []).filter(p => /LISTS/.test(p.title)).reduce((a, p) => a + p.sections.length, 0);
    const books = [
      { key: 'covenant', isCov: true, cv: 'linear-gradient(105deg, rgba(255,255,255,.12), transparent 36%), radial-gradient(130% 95% at 30% 18%, #25685d, #11372f 72%)', gold: '#d9c27e', goldSoft: '#d9c27e73', ink: '#eef1e4', foot: 'GRA', href: this.link('covenant'), kicker: 'God’s Remnant Assembly', title: 'Book of Covenant Prayers', st: cs, meta: S.cov ? `${S.cov.length} parts · ${cs.n} prayers` : '' },
      { key: 'jcfp', isJc: true, cv: 'linear-gradient(105deg, rgba(255,255,255,.12), transparent 36%), radial-gradient(130% 95% at 30% 18%, #8e2d3a, #561620 72%)', gold: '#dcb86c', goldSoft: '#dcb86c73', ink: '#f6ead2', foot: 'GRA', href: this.link('jcfp'), kicker: 'God’s Remnant Assembly', title: 'Jesus Chosen Fast and Prayer', st: js, meta: S.jc ? `${jWatches} prayer watches · ${jLists} lists` : '' }
    ].map(b => ({ ...b, bar: 'visible', pct: pct(b.st), note: b.st.d ? `${b.st.d} of ${b.st.n} prayed` : 'Not started' }));

    // continue
    const cands = [];
    [['covenant', 'Covenant Prayers', cIdx], ['jcfp', 'Jesus Chosen Fast and Prayer', jIdx]].forEach(([k, label, idx]) => {
      const ls = this.ls(`gra-${k}-lastSess`, null), lp = this.ls(`gra-${k}-lastP`, null);
      if (ls && ls.sid && idx[ls.sid]) cands.push({ t: ls.t || 0, book: label, sec: idx[ls.sid], href: this.link(k, `#${ls.sid}-${(ls.i || 0) + 1}`), sub: 'Focused Mode · ' + this.where(k, idx[ls.sid], (ls.i || 0) + 1).split(' · ')[0], k });
      if (lp && lp.pid) { const sid = lp.pid.split('-').slice(0, 3).join('-'), n = Number(lp.pid.split('-')[3]) || 0; if (idx[sid]) cands.push({ t: lp.t || 0, book: label, sec: idx[sid], href: this.link(k, '#' + lp.pid), sub: this.where(k, idx[sid], n).split(' · ')[0], k }); }
    });
    const nrList = this.NR.map(slug => { const b = (S.nr || {})[slug]; if (!b) return null; const N = b.chapters.length, pos = this.ls(`gra-nr-${slug}-pos`, null), dn = Object.keys(this.ls(`gra-nr-${slug}-done`, {}) || {}).length, pr = Math.min(1, Math.max(pos ? pos.prog || 0 : 0, dn / N)), pc = Math.round(pr * 100) + '%';
      return { slug, b, N, pos, dn, pct: pc, href: this.nlink(slug), key: 'nr-' + slug, isNr: true, cv: b.cover.bg, ink: b.cover.ink, gold: b.cover.accent, sub: b.cover.sub, solid: b.cover.solid, kicker: b.kicker, title: b.title, subtitle: b.subtitle, bar: 'visible', note: dn ? `${dn} of ${N} chapters` : pos ? 'Reading' : 'Not started', st: { d: dn, n: N } }; }).filter(Boolean);
    nrList.forEach(x => { if (x.pos && x.pos.t) cands.push({ t: x.pos.t, book: x.title, sec: { title: x.pos.title || x.b.chapters[x.pos.ch].title }, href: this.nlink(x.slug, '#c' + (x.pos.ch + 1)), sub: 'Reading · ' + x.pct }); });
    { const bp = this.ls('gra-bible-pos', null); if (bp && bp.t) cands.push({ t: bp.t, book: 'Holy Bible', sec: { title: bp.title || '' }, href: this.blink(`#${bp.b}-${bp.c}`), sub: 'Reading the Bible' }); }
    cands.sort((a, b) => b.t - a.t); const cont = cands[0];

    // plan (library-wide)
    const gp = (this.state.planKind || 'pray') === 'read' ? S.rp : S.gp, today = this.gpDk(), DAYN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], BOOKN = { covenant: 'Book of Covenant Prayers', jcfp: 'Jesus Chosen Fast and Prayer', weekly: 'GRA Weekly Kingdom Prayers' }; Object.entries(S.nr || {}).forEach(([k, b]) => { BOOKN['nr-' + k] = b.title; });
    const kind = this.pk(), tFor = p => p && p.today && p.today.d === this.gpDk() ? this.gpToday(p) : [];
    const tUnits = tFor(gp);
    const mkT = u => { const done = this.gpDone(u);
      return { title: u.weekly ? (cur ? 'Week of ' + this.fmtWeek(cur) : 'This week’s prayers') : u.label, book: BOOKN[u.book], href: u.weekly ? (cur ? weekHref(cur) : this.link('weekly')) : u.nr ? this.nlink(u.nr, '#c' + u.p) : this.link(u.book, '#' + u.id), done, ring: done ? 'var(--color-accent)' : 'var(--color-neutral-500)', fill: done ? 'var(--color-accent)' : 'transparent' }; };
    const homeToday = [...tFor(S.gp), ...tFor(S.rp)].map(mkT), hDone = homeToday.filter(x => x.done).length;
    const planToday = tUnits.map(mkT);
    const pDone = planToday.filter(x => x.done).length, schedToday = gp ? !!gp.wdays[new Date().getDay()] : false;
    const pUnits = gp ? gp.units || [] : [], pUnitsDone = pUnits.filter(u => this.gpDone(u)).length;
    let pStreak = 0; if (gp) { const ds = new Set(gp.days || []), d = new Date(); if (!ds.has(this.gpDk(d))) d.setDate(d.getDate() - 1); for (let i = 0; i < 1000; i++) { const k = this.gpDk(d); if (k < gp.start) break; const sch = gp.wdays[d.getDay()] || (gp.weekly && gp.weekly.on && gp.weekly.wday === d.getDay()); if (sch) { if (ds.has(k)) pStreak++; else break; } d.setDate(d.getDate() - 1); } }
    const pe = S.pe, cs2 = (on2) => ({ on: on2 ? 'true' : 'false', bg: on2 ? 'var(--color-text)' : 'transparent', color: on2 ? 'var(--color-bg)' : 'var(--color-text)', border: on2 ? 'var(--color-text)' : 'var(--color-divider)' });
    const peBooks = pe && kind === 'pray' ? [['covenant', 'Book of Covenant Prayers', (S.cov || []).map((p, i) => ({ n: i + 1, label: 'Part ' + (i + 1) }))], ['jcfp', 'Jesus Chosen Fast and Prayer', (S.jc || []).map((p, i) => ({ n: i + 1, label: p.label || p.title, skip: /LISTS/.test(p.title) })).filter(x => !x.skip)]].map(([k, title, parts]) => {
      const keys = parts.map(x => `${k}:${x.n}`), allOn = keys.length > 0 && keys.every(x => pe.items.includes(x));
      return { title, allLabel: allOn ? 'Clear' : 'Select all', all: () => this.peSet({ items: allOn ? pe.items.filter(x => !keys.includes(x)) : [...new Set([...pe.items, ...keys])] }),
        parts: parts.map(x => { const key = `${k}:${x.n}`, o = pe.items.includes(key); return { label: x.label, ...cs2(o), pick: () => this.peSet({ items: o ? pe.items.filter(y => y !== key) : [...pe.items, key] }) }; }) }; }) : [];
    const peReadBooks = pe && kind === 'read' ? Object.entries(S.nr || {}).map(([k, b]) => { const keys = b.chapters.map((_, i) => `nr-${k}:${i + 1}`), on = keys.every(x => pe.items.includes(x)); return { label: b.title, sub: `${b.chapters.length} chapters · ${b.subtitle || ''}`, ...cs2(on), pick: () => this.peSet({ items: on ? pe.items.filter(x => !keys.includes(x)) : [...new Set([...pe.items, ...keys])] }) }; }) : [];
    const peWkDays = pe ? [{ k: -1, label: 'Not in plan' }, ...[1, 2, 3, 4, 5, 6, 0].map(k => ({ k, label: DAYN[k] }))].map(x => ({ label: x.label, ...cs2(pe.wk === x.k), pick: () => this.peSet({ wk: x.k }) })) : [];
    const peDays = pe ? [1, 2, 3, 4, 5, 6, 0].map(k => ({ label: DAYN[k][0] + DAYN[k][1], full: DAYN[k], ...cs2(pe.wdays[k]), pick: () => { const w = [...pe.wdays]; w[k] = !w[k]; this.peSet({ wdays: w }); } })) : [];
    const sumParts = gp ? ['covenant', 'jcfp', ...Object.keys(S.nr || {}).map(k => 'nr-' + k)].map(b => { const ps = (gp.items || []).filter(x => x.book === b).map(x => x.part).sort((a, c) => a - c); if (!ps.length) return null;
      if (b.startsWith('nr-')) { const nb = (S.nr || {})[b.slice(3)]; return { k: BOOKN[b], v: nb && ps.length === nb.chapters.length ? 'Whole book' : (ps.length === 1 ? 'Chapter ' : 'Chapters ') + ps.join(', ') }; }
      const all = (b === 'covenant' ? (S.cov || []).length : (S.jc || []).filter(p => !/LISTS/.test(p.title)).length) === ps.length;
      return { k: BOOKN[b], v: all ? 'Whole book' : b === 'covenant' ? (ps.length === 1 ? 'Part ' : 'Parts ') + ps.join(', ') : ps.map(n => ((S.jc || [])[n - 1] || {}).label || 'Watch ' + n).join(', ') }; }).filter(Boolean) : [];
    if (gp) sumParts.push({ k: 'Each prayer day', v: `${gp.perDay} ${kind === 'read' ? (gp.perDay === 1 ? 'chapter' : 'chapters') : 'at a time'} · ${[1, 2, 3, 4, 5, 6, 0].filter(k => gp.wdays[k]).length === 7 ? 'every day' : [1, 2, 3, 4, 5, 6, 0].filter(k => gp.wdays[k]).map(k => DAYN[k].slice(0, 3)).join(', ')}` });

    // saved
    const src = S.savedTab === 'bm' ? 'bookmarks' : 'fav', items = [];
    nrList.forEach(x => { if (S.savedTab === 'hl') (this.ls(`gra-nr-${x.slug}-hl`, []) || []).forEach(h => { const c = x.b.chapters[h.ch]; if (c) items.push({ k: h.t || 0, where: `${x.title} · ${c.title}`, text: h.note ? `“${h.text}” · ${h.note}` : h.text, href: this.nlink(x.slug, `#c${h.ch + 1}-p${+h.pid.split('-')[1] + 1}`) }); });
      if (S.savedTab === 'bm') (this.ls(`gra-nr-${x.slug}-bm`, []) || []).forEach(m => { const c = x.b.chapters[m.ch]; if (c) items.push({ k: m.t || 0, where: `${x.title} · ${c.title}`, text: m.text, href: this.nlink(x.slug, `#c${m.ch + 1}-p${+m.pid.split('-')[1] + 1}`) }); }); });
    const add = (bookKey, label, idx, map) => { Object.entries(map || {}).forEach(([id, t]) => {
      const k = typeof t === 'string' ? Date.parse(t) || 0 : Number(t) || 0;
      const pm = /^part-(\d+)$/.exec(id);
      if (pm) { const p = (bookKey === 'jcfp' ? S.jc : S.cov || [])[Number(pm[1]) - 1]; if (p) items.push({ k, where: label, text: p.label || p.title, href: this.link(bookKey, '#' + id) }); return; }
      const m = /^(s-\d+-\d+)(?:-(\d+))?$/.exec(id); if (!m) return; const sec = idx[m[1]]; if (!sec) return;
      const pr = m[2] ? sec.prayers[Number(m[2]) - 1] : null; if (m[2] && !pr) return;
      items.push({ k, where: bookKey === 'weekly' ? `${label} · ${sec.title}` : `${label} · ${this.where(bookKey, sec, m[2] ? Number(m[2]) : 0).split(' · ')[0]}`, text: pr ? pr.text : sec.title, href: this.link(bookKey, '#' + id) }); }); };
    if (S.savedTab !== 'hl') {
    add('covenant', 'Covenant Prayers', cIdx, this.ls('gra-covenant-' + src, {}));
    add('jcfp', 'Jesus Chosen Fast and Prayer', jIdx, this.ls('gra-jcfp-' + src, {}));
    add('weekly', 'Weekly Kingdom Prayers', wIdx, this.ls('gra-weekly-' + src, {}));
    }
    const seg = a => ({ bg: a ? onBg : 'transparent', color: a ? 'var(--color-accent-800)' : 'var(--color-text)' });
    const sf = seg(S.savedTab === 'fav'), sb = seg(S.savedTab === 'bm'), sh2 = seg(S.savedTab === 'hl');

    // stats
    const days = this.allHist(), st = this.streaks(days), totalPrayed = Object.keys(cp).length + Object.keys(jp).length + Object.keys(this.ls('gra-weekly-prayed', {}) || {}).length;
    const heat = [], end = new Date(); end.setDate(end.getDate() + (6 - end.getDay())); const startD = new Date(end); startD.setDate(end.getDate() - 83);
    let heatN = 0;
    for (let i = 0; i < 84; i++) { const d = new Date(startD); d.setDate(startD.getDate() + i); const k = this.dkey(d), n = days[k] || 0, fut = d > new Date(); if (n) heatN++;
      heat.push({ title: `${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}${n ? ` · ${n} prayed` : ''}`, bg: fut ? 'transparent' : n >= 10 ? 'var(--color-accent)' : n ? 'var(--color-accent-300)' : 'var(--color-neutral-200)', ol: k === today ? '1.5px solid var(--color-text)' : 'none' }); }
    const tiles = [[st.cur, 'Day streak'], [st.best, 'Longest streak'], [st.days, 'Days prayed'], [totalPrayed.toLocaleString(), 'Prayers checked']].map(([v, k], i) => ({ v: String(v), k, pad: i % 2 ? '16px' : '0', line: i % 2 ? '1px solid var(--color-divider)' : 'none' }));

    // search
    const qOk = k => !(S.qSel || []).length || (S.qSel || []).includes(k);
    const qGroups = S.view === 'search' ? this.search(S.q, [['covenant', 'Book of Covenant Prayers', cIdx], ['jcfp', 'Jesus Chosen Fast and Prayer', jIdx]], asc).filter(g => qOk(g.key)) : [];
    if (S.view === 'search' && S.q.trim().length > 1 && true) { const nq = S.q.trim().toLowerCase(); nrList.filter(x => qOk('nr-' + x.slug)).forEach(x => { const items = []; let total = 0; x.b.chapters.forEach((c, ci) => c.paras.forEach((raw, pi) => { const t = this.nrPlain(raw), j = t.toLowerCase().indexOf(nq); if (j < 0) return; total++; if (items.length < 40) { const a = Math.max(0, j - 40); items.push({ where: `${x.title} · ${c.title}`, pre: (a ? '…' : '') + t.slice(a, j), hit: t.slice(j, j + nq.length), post: t.slice(j + nq.length, j + nq.length + 60) + '…', href: this.nlink(x.slug, `#c${ci + 1}-p${pi + 1}`) }); } })); if (total) qGroups.push({ key: 'nr-' + x.slug, label: `${x.title} · ${total}`, items }); }); }
    const qLen = S.q.trim().length;
    const qAllBooks = [['covenant', 'Book of Covenant Prayers'], ['jcfp', 'Jesus Chosen Fast and Prayer'], ['weekly', 'GRA Weekly Kingdom Prayers'], ...nrList.map(x => ['nr-' + x.slug, x.title])], qSel = S.qSel || [];
    const qFilters = qAllBooks.map(([k, label]) => { const a = qSel.includes(k); return { label, on: a ? 'true' : 'false', pick: () => this.setState({ qSel: a ? qSel.filter(x => x !== k) : [...qSel, k] }), bg: a ? 'var(--color-text)' : 'transparent', color: a ? 'var(--color-bg)' : 'var(--color-text)', border: a ? 'var(--color-text)' : 'var(--color-divider)' }; });

    const titles = { home: 'Overcomer’s Library', library: 'Library', reminders: 'Reminders', search: 'Search', plan: 'Plan', saved: 'Saved', stats: 'Stats', account: 'Account' };
    const hr = new Date().getHours(), sub = ['library', 'stats', 'account', 'reminders'].includes(S.view);
    const rem = S.rem || this.remLoad(), DN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], fmtT = t => { const [a, b] = t.split(':').map(Number), x = new Date(); x.setHours(a, b, 0, 0); return x.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); };
    const nDays = rem.days.filter(Boolean).length, perm = S.perm || 'default';
    const libBooks = [...books, { href: this.link('weekly', '#contents'), cv: 'linear-gradient(105deg, rgba(255,255,255,.12), transparent 36%), radial-gradient(130% 95% at 30% 18%, #33407a, #171d40 72%)', gold: '#e6c47a', goldSoft: '#e6c47a73', ink: '#f2ecde', foot: 'GRA', isWk: true, kicker: 'God’s Remnant Assembly', title: 'Weekly Kingdom Prayers', pct: '0%', bar: 'hidden', note: rows.length ? `${rows.length} week${rows.length === 1 ? '' : 's'}` : 'New every Monday', meta: cur ? 'Latest · ' + this.fmtWeek(cur) : '' }];
    const tab = v => S.view === v ? on : off, curv = v => S.view === v ? 'page' : 'false', th = this.theme();
    const SOLID = { covenant: '#11372f', jcfp: '#561620' };
    libBooks.forEach(b => { const solid = SOLID[b.key] || '#171d40'; b.open = e => this.openCover(e, b.href, solid, b.cv); });
    nrList.forEach(x => { x.open = e => this.openCover(e, x.href, x.solid, x.cv); });
    const bpos = this.ls('gra-bible-pos', null), bibleItem = { key: 'bible', isNr: true, href: this.blink(bpos ? `#${bpos.b}-${bpos.c}` : ''), cv: 'linear-gradient(105deg, rgba(255,255,255,.1), transparent 40%), radial-gradient(130% 95% at 30% 18%, #4a3a32, #241b17 72%)', ink: '#f1e6d2', gold: '#d8b46a', sub: '#cdbfa8', solid: '#241b17', kicker: 'The Word of God', title: 'Holy Bible', subtitle: 'KJV, Louis Segond, Reina-Valera', pct: '0%', bar: 'hidden', note: bpos && bpos.title ? 'Last read · ' + bpos.title : 'Many translations' };
    bibleItem.open = e => this.openCover(e, bibleItem.href, bibleItem.solid, bibleItem.cv);
    const shelves = [{ label: 'Prayer Books', count: String(libBooks.length), books: libBooks }, { label: 'Spiritual Nourishment', count: String(nrList.length + 1), books: [bibleItem, ...nrList] }];
    const L = window.GRAi18n, lp = L ? L.pref() : 'auto';
    const langs = [['auto', 'Auto', 'Follow phone'], ['en', 'EN', 'English'], ['fr', 'FR', 'Français'], ['es', 'ES', 'Español']].map(([k, label, full]) => { const a = lp === k; return { label, full, on: a ? 'true' : 'false', bg: a ? onBg : 'transparent', color: a ? 'var(--color-accent-800)' : 'var(--color-text)', pick: () => { if (!L || a) return; L.setPref(k); location.reload(); } }; });
    const dayKeys = Object.keys(days).filter(k => days[k]).sort(), fmtD = k => { const [y, mo, d] = k.split('-').map(Number); return new Date(y, mo - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); };
    const milestones = [7, 40, 100].map(n => { const got = dayKeys.length >= n, left = n - dayKeys.length;
      return { n: String(n), label: 'days of prayer', note: got ? fmtD(dayKeys[n - 1]) : `${left} more ${left === 1 ? 'day' : 'days'}`, bd: got ? 'color-mix(in srgb, var(--color-accent) 55%, transparent)' : 'var(--card-bd)', bg: got ? 'var(--color-accent-100)' : 'transparent', ring: got ? 'var(--color-accent)' : 'var(--color-neutral-300)', ink: got ? 'var(--color-accent-700)' : 'var(--color-neutral-600)' }; });
    const now = new Date(), mPre = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`, mKeys = dayKeys.filter(k => k.startsWith(mPre));
    let mBest = 0, run = 0; for (let d = 1; d <= now.getDate(); d++) { const k = `${mPre}-${String(d).padStart(2, '0')}`; if (days[k]) { run++; mBest = Math.max(mBest, run); } else run = 0; }
    const monthTitle = now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }).replace(/^./, c => c.toUpperCase());
    const T = s => (L ? L.t(s) : s);
    const monthTiles = [[mKeys.length, 'Days prayed'], [mKeys.reduce((a, k) => a + days[k], 0), 'Prayers checked'], [mBest, 'Longest streak']].map(([v, k]) => ({ v: String(v), k: T(k) }));
    const OB = [['Welcome', 'A library for your walk with God', 'Prayer books for every season, the Weekly Kingdom Prayers every Monday, and books for spiritual nourishment and growth.'], ['Your pace', 'Pray, read and keep track', 'Check off prayers, highlight and take notes as you read, write with a pen, build a daily plan, and see your days with God in Stats.'], ['Every day', 'Listen, read and remember', 'Have any book read aloud, tap a Bible reference to read it, and set daily reminders from the profile menu. The app follows your phone’s language: English, French or Spanish.']];
    const ob = S.ob, obi = ob == null ? 0 : ob;
    const obVals = { obOpen: ob != null, obKicker: OB[obi][0], obTitle: OB[obi][1], obText: OB[obi][2], obHasBack: obi > 0, obSkipVis: obi < 2 ? 'visible' : 'hidden',
      obNextLabel: obi < 2 ? 'Next' : 'Get started', obNext: () => (obi < 2 ? this.setState({ ob: obi + 1 }) : this.obDone()), obBack: () => this.setState({ ob: Math.max(0, obi - 1) }), obSkip: () => this.obDone(),
      obDots: [0, 1, 2].map(i => ({ w: i === obi ? '22px' : '8px', bg: i === obi ? 'var(--color-accent)' : 'var(--color-neutral-300)' })),
      obCovers: ['#25685d, #11372f', '#8e2d3a, #561620', '#33407a, #171d40'].map((c, i) => ({ bg: `radial-gradient(130% 95% at 30% 18%, ${c} 72%)`, y: i === obi ? '-14px' : '0px', op: i === obi ? '1' : '.55' })) };
    return {
      view: S.view, contLay: planToday.length ? 'half' : 'full', isHome: S.view === 'home', isSearch: S.view === 'search', isLibrary: S.view === 'library', isReminders: S.view === 'reminders',
      goReminders: go('reminders'), remOn: rem.on, remOnStr: rem.on ? 'true' : 'false', remToggle: () => { if (!rem.on && perm === 'default') this.remAsk(); this.remSave({ on: !rem.on }); },
      remTrack: rem.on ? 'var(--color-accent)' : 'var(--color-neutral-300)', remKnob: rem.on ? '20px' : '0px',
      remSummary: !rem.on ? 'Off' : `${rem.times.map(fmtT).join(' and ')} · ${nDays === 7 ? 'every day' : nDays + ' days a week'}`,
      remTimes: rem.times.map((v, i) => ({ v, set: e => { const t = [...rem.times]; t[i] = e.target.value || v; this.remSave({ times: t.sort() }); }, remove: () => rem.times.length > 1 && this.remSave({ times: rem.times.filter((_, j) => j !== i) }) })),
      remCanAdd: rem.times.length < 4, remAdd: () => this.remSave({ times: [...rem.times, '12:00'].sort() }),
      remDays: [1, 2, 3, 4, 5, 6, 0].map(k => { const o = rem.days[k]; return { label: DN[k].slice(0, 2), full: DN[k], on: o ? 'true' : 'false', bg: o ? 'var(--color-text)' : 'transparent', color: o ? 'var(--color-bg)' : 'var(--color-text)', border: o ? 'var(--color-text)' : 'var(--color-divider)', pick: () => { const d = [...rem.days]; d[k] = !d[k]; if (d.some(Boolean)) this.remSave({ days: d }); } }; }),
      remPermText: perm === 'granted' ? 'Notifications are on. Reminders appear while the app is open or running in the background.' : perm === 'denied' ? 'Notifications are blocked for this site. Turn them on in your browser settings, or add the reminders to your calendar below.' : perm === 'unsupported' ? 'This browser can’t show notifications. Add the reminders to your calendar below. On iPhone, add the app to your Home Screen first.' : 'Allow notifications so reminders can appear on this device.',
      remCanAsk: perm === 'default', remAsk: () => this.remAsk(), remTest: () => this.remTest(), remIcs: () => this.remIcs(), isPlan: S.view === 'plan', isSaved: S.view === 'saved', isStats: S.view === 'stats', isAccount: S.view === 'account' && member,
      goHome: go('home'), goLibrary: go('library'), goBible: e => { const bp = this.ls('gra-bible-pos', null); location.href = this.blink(bp ? `#${bp.b}-${bp.c}` : ''); }, goSearch: go('search'), goPlan: go('plan'), goSaved: go('saved'), goStats: go('stats'),
      tabHome: tab('home'), tabLibrary: tab('library'), tabSearch: tab('search'), tabPlan: tab('plan'), tabSaved: tab('saved'),
      curHome: curv('home'), curLibrary: curv('library'), curSearch: curv('search'), curPlan: curv('plan'), curSaved: curv('saved'),
      hdrTitle: titles[S.view], hdrLogo: !sub, hdrBack: sub,
      greeting: hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening',
      libBooks, libSummary: `${libBooks.length} prayer books · ${nrList.length} for spiritual nourishment`, shelves,
      libStack: [['0', '-6deg'], ['-14px', '0deg'], ['-14px', '6deg']].map(([ml, rot]) => ({ ml, rot })),
      openWeek: () => { if (cur) location.href = weekHref(cur); }, openWeekKey: e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && cur) { e.preventDefault(); location.href = weekHref(cur); } },
      stopProp: e => e.stopPropagation(), curWeekCount: cur ? `${(cur.prayers || []).length} prayers` : '',
      pw0: S.pw0, onPw0: e => this.setState({ pw0: e.target.value, pwMsg: '' }), pw1: S.pw1, pw2: S.pw2, onPw1: e => this.setState({ pw1: e.target.value, pwMsg: '' }), onPw2: e => this.setState({ pw2: e.target.value, pwMsg: '' }),
      pwSubmit: e => this.changePw(e), pwBusy: S.pwBusy, pwLabel: S.pwBusy ? 'Updating…' : 'Update password', pwHasMsg: !!S.pwMsg, pwMsg: S.pwMsg, pwMsgColor: S.pwOk ? 'var(--color-accent-700)' : 'var(--color-danger)',
      delClosed: !S.del, delIsOpen: S.del, delOpen: () => this.setState({ del: true, delTxt: '', delMsg: '' }), delCancel: () => this.setState({ del: false, delTxt: '', delMsg: '' }),
      delTxt: S.delTxt, onDelTxt: e => this.setState({ delTxt: e.target.value, delMsg: '' }), delConfirm: () => this.deleteAcct(),
      delDisabled: S.delBusy || S.delTxt.trim().toUpperCase() !== 'DELETE', delOpacity: S.delBusy || S.delTxt.trim().toUpperCase() !== 'DELETE' ? '.45' : '1',
      delLabel: S.delBusy ? 'Deleting…' : 'Delete permanently', delHasMsg: !!S.delMsg, delMsg: S.delMsg,
      menuOpen: S.menu, menuOpenStr: S.menu ? 'true' : 'false', toggleMenu: () => this.setState({ menu: !S.menu }), closeMenu: () => this.setState({ menu: false }),
      hasStreak: st.cur > 0, streakShort: `${st.cur} day${st.cur === 1 ? '' : 's'}`,
      themes: [['light', 'Light'], ['sepia', 'Sepia'], ['dark', 'Dark'], ['auto', 'Auto']].map(([k, label]) => ({ label, pick: () => this.setTheme(k), bg: th === k ? onBg : 'transparent', color: th === k ? 'var(--color-accent-800)' : 'var(--color-text)' })),
      langs, milestones, monthTitle, monthTiles, monthShareLabel: 'Share this month', shareMonth: () => this.shareMonth({ title: monthTitle, tiles: monthTiles }), statsEmpty: !dayKeys.length, ...obVals,
      accountHref: member ? '#account' : this.link('covenant'), accountLabel: member ? 'Account' : 'Sign in',
      accountClick: e => { if (!member) return; e.preventDefault(); go('account')(); },
      ...this.acctVals(),
      dateLabel: new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      needSignIn: !member,
      hasWeek: !!cur, noWeek: !cur,
      noWeekTitle: S.wkErr ? 'Couldn’t load this week’s prayers' : S.weeksLoaded ? 'No weekly prayers yet' : 'Loading this week’s prayers…',
      noWeekText: S.wkErr ? 'Check your connection and open the app again.' : 'New prayers are shared every Monday. They will appear here as soon as they are published.',
      curWeekLabel: cur ? 'Week of ' + this.fmtWeek(cur) : '', curWeekPreview: cur ? (cur.prayers || []).slice(0, 2).map((p, i) => ({ n: i + 1, text: p.text })) : [],
      curWeekHref: cur ? weekHref(cur) : this.link('weekly'), pastHref: this.link('weekly', '#contents'), signInHref: this.link('covenant'), curWeekCta: cur ? `Pray all ${(cur.prayers || []).length} prayers` : '',
      hasPlanToday: homeToday.length > 0, planToday: homeToday, planTodayCount: `${hDone} of ${homeToday.length} done`, pvToday: planToday, pvTodayCount: `${pDone} of ${planToday.length} done`,
      isRead: kind === 'read', isPray: kind !== 'read', peReadBooks,
      planKinds: [['pray', 'Prayer plan'], ['read', 'Reading plan']].map(([k, label]) => { const a = kind === k; return { label, on: a ? 'true' : 'false', bg: a ? onBg : 'transparent', color: a ? 'var(--color-accent-800)' : 'var(--color-text)', pick: () => this.setState({ planKind: k, pe: null }) }; }),
      piTitle: kind === 'read' ? 'Read through a book at your own pace' : 'Pray through your books at your own pace',
      piText: kind === 'read' ? 'Choose a Spiritual Nourishment book, how many chapters a day and which days. Today’s reading then appears on Home, and each chapter is ticked off when you finish it.' : 'Choose parts and watches from the prayer books, how many a day and which days. Today’s prayers then appear on Home and are marked inside each book.',
      piCta: kind === 'read' ? 'Create a reading plan' : 'Create a prayer plan',
      peDayHead: kind === 'read' ? 'Chapters each reading day' : 'Each prayer day', peDaysHead: kind === 'read' ? 'Reading days' : 'Prayer days',
      peUnitNote: kind === 'read' ? 'The plan goes through the whole book in order.' : 'A Covenant section or a whole prayer watch counts as one.',
      planIntro: !gp && !pe, planView: !!gp && !pe, planEditing: !!pe,
      planHead: planToday.length ? (pDone === planToday.length ? 'Today’s plan is done' : kind === 'read' ? 'Today’s reading' : 'Today’s prayers') : pUnits.length && pUnitsDone === pUnits.length ? (kind === 'read' ? 'You’ve read through your whole plan' : 'You’ve prayed through your whole plan') : schedToday ? 'Nothing left for today' : kind === 'read' ? 'No reading is scheduled today' : 'No prayers are scheduled today',
      planTiles: [[pStreak, 'Plan streak'], [(gp && gp.days || []).length, 'Plan days'], [pUnits.length ? Math.round(pUnitsDone / pUnits.length * 100) + '%' : '0%', 'Through plan']].map(([v, k], i) => ({ v: String(v), k, pad: i ? '14px' : '0', line: i ? '1px solid var(--color-divider)' : 'none' })),
      planSummary: sumParts, planEnd: () => this.planEnd(),
      peStart: () => this.peOpen(), peCancel: () => this.setState({ pe: null }), peSave: () => this.peSave(), peTitle: gp ? (kind === 'read' ? 'Edit your reading plan' : 'Edit your prayer plan') : (kind === 'read' ? 'Create a reading plan' : 'Create a prayer plan'), peSaveLabel: gp ? 'Save changes' : 'Start plan',
      peBooks, peWkDays, peDays, pePerDayLabel: pe ? (kind === 'read' ? `${pe.perDay} ${pe.perDay === 1 ? 'chapter' : 'chapters'} a day` : `${pe.perDay} a day`) : '', peLess: () => pe && this.peSet({ perDay: Math.max(1, pe.perDay - 1) }), peMore: () => pe && this.peSet({ perDay: Math.min(10, pe.perDay + 1) }),
      peHasErr: !!S.peErr, peErr: S.peErr || '',
      hasContinue: !!cont, contBook: cont ? cont.book : '', contTitle: cont ? cont.sec.title : '', contSub: cont ? cont.sub : '', contHref: cont ? cont.href : '',
      books,
      q: S.q, qRef: this.qRef, hasQ: qLen > 0, onQ: e => this.setState({ q: e.target.value }), clearQ: () => this.setState({ q: '' }, () => this.qRef.current && this.qRef.current.focus()),
      qFilters, qGroups, qFilterOpen: !!S.qFilterOpen, qFilterOpenStr: S.qFilterOpen ? 'true' : 'false', qFilterToggle: () => this.setState({ qFilterOpen: !S.qFilterOpen }), qHasSel: qSel.length > 0, qClearSel: () => this.setState({ qSel: [] }), qFilterLabel: qSel.length ? (qSel.length === 1 ? qAllBooks.find(x => x[0] === qSel[0])[1] : `${qSel.length} books`) : 'All books', qHint: !qGroups.length, qHintText: qLen < 2 ? 'Search every prayer, chapter and weekly prayer across the whole library.' : `Nothing found for “${S.q.trim()}”.`,
      savedList: items.sort((a, b) => b.k - a.k), savedEmpty: !items.length,
      savedEmptyText: S.savedTab === 'hl' ? 'Highlight words or add a note in any Spiritual Nourishment book and it appears here.' : S.savedTab === 'bm' ? 'Bookmark a section or watch in any book and it appears here.' : 'Tap the star on any prayer, in any book, and it appears here.',
      savedFavBg: sf.bg, savedFavColor: sf.color, savedBmBg: sb.bg, savedBmColor: sb.color, savedHlBg: sh2.bg, savedHlColor: sh2.color, savedHlTab: () => this.setState({ savedTab: 'hl' }),
      savedFavTab: () => this.setState({ savedTab: 'fav' }), savedBmTab: () => this.setState({ savedTab: 'bm' }),
      statTiles: tiles, heat, heatDays: `${heatN} ${heatN === 1 ? 'day' : 'days'}`, heatAria: `${heatN} days prayed in the last 12 weeks`,
      byBook: [...books.map(b => ({ title: b.title, href: b.href, pct: b.pct, label: `${b.st.d} of ${b.st.n} · ${b.pct}` })), ...nrList.map(x => ({ title: x.title, href: x.href, pct: x.pct, label: `${x.dn} of ${x.N} chapters · ${x.pct}` }))]
    };
  }
}
