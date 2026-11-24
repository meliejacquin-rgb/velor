/* VélOr — logique de l'application (vanilla JS, données stockées sur l'appareil). */
(function () {
  'use strict';

  // ---------- Constantes ----------
  const CARNET = 17, CARNET_N = 10;
  const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const MONTHS = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];
  const MONTHS_FULL = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const LEVELS = ['Roue libre', 'Pédaleur du dimanche', 'Cycliste urbain', 'Habitué de la piste', 'Chasseur de tickets', 'Roi du guidon', 'Légende du bitume', 'Maître du dérailleur'];
  const G = { car: 218, bus: 113, tram: 4.3 }; // g CO₂ par km et par passager (ordres de grandeur ADEME)
  const MOODS = [
    { l: 'En forme', f: '<path d="M8 14c1 1.6 2.4 2.4 4 2.4s3-.8 4-2.4"/><circle cx="9" cy="10" r=".9" fill="currentColor"/><circle cx="15" cy="10" r=".9" fill="currentColor"/>' },
    { l: 'Zen', f: '<path d="M9 15h6"/><path d="M8 10.5c.6-.6 1.4-.6 2 0M14 10.5c.6-.6 1.4-.6 2 0"/>' },
    { l: 'Bof', f: '<path d="M9 15.5h6"/><circle cx="9" cy="10" r=".9" fill="currentColor"/><circle cx="15" cy="10" r=".9" fill="currentColor"/>' },
    { l: 'À plat', f: '<path d="M9 16c1-1 2-1.4 3-1.4s2 .4 3 1.4"/><path d="M8 10h2M14 10h2"/>' }
  ];
  // Thèmes fournis par la maquette de marque (brand/themes-reference.png)
  const PALETTES = {
    outremer: { n: 'Outremer', bg: '#213BCA', acc: '#FDAC0A', ink: '#091D4F', bike: '#FFFFFF', lift: .12 },
    nuit:     { n: 'Nuit',     bg: '#04164D', acc: '#46F997', ink: '#051441', bike: '#FFFFFF', lift: .3 },
    foret:    { n: 'Forêt',    bg: '#024830', acc: '#FC8B31', ink: '#01311F', bike: '#FDF3E2', lift: .3 },
    prune:    { n: 'Prune',    bg: '#461359', acc: '#FD5B66', ink: '#2F0D3D', bike: '#FFFFFF', lift: .3 },
    lagon:    { n: 'Lagon',    bg: '#024A52', acc: '#FDCD02', ink: '#01363B', bike: '#FFFFFF', lift: .3 },
    graphite: { n: 'Graphite', bg: '#2D3137', acc: '#84F502', ink: '#27292E', bike: '#FFFFFF', lift: .32 }
  };
  function logoSVG(t, size) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" rx="24" fill="${t.bg}"/>`
      + `<g fill="${t.acc}">${[[16,60,1.3],[17,66,1.5],[20,71.5,1.7],[25,76,1.9],[31,79,2],[38,80.5,2.1],[45,80.5,2.2],[52,79.5,2.3],[59,77,2.4],[65,73.5,2.6]].map(([x,y,r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>`
      + `<g fill="none" stroke="${t.bike}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="31" cy="56" r="14"/><path d="M31 56 43 36h24L54 57zM43 36l-3-8M34 27h12M54 57 39 56M67 36l3 20M64 29l2-6h7a3 3 0 0 1 0 6h-3"/><circle cx="54" cy="57" r="2.5"/></g>`
      + `<path d="M55 47.5c-3.5-2.4-6-4.4-6-7 0-1.8 1.4-3 3-3 1.3 0 2.3.7 3 1.8.7-1.1 1.7-1.8 3-1.8 1.6 0 3 1.2 3 3 0 2.6-2.5 4.6-6 7z" fill="${t.acc}"/>`
      + `<circle cx="72" cy="56" r="15.5" fill="${t.acc}" stroke="${t.bike}" stroke-width="4.5"/><text x="72" y="62.5" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="19" fill="${t.bike}">€</text></svg>`;
  }


  // ---------- Dates ----------
  const key = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const dow = d => (d.getDay() + 6) % 7; // 0 = lundi
  let today, monday;
  function refreshToday() { today = new Date(); today.setHours(12, 0, 0, 0); monday = addDays(today, -dow(today)); }
  refreshToday();

  // ---------- Formatage ----------
  const fmtE = (v, d) => v.toLocaleString('fr-FR', { minimumFractionDigits: d ?? 2, maximumFractionDigits: d ?? 2 }) + ' €';
  const plural = (n, w) => n + ' ' + w + (n > 1 ? 's' : '');
  const fmtKg = g => g >= 1000 ? (g / 1000).toLocaleString('fr-FR', { maximumFractionDigits: g >= 100000 ? 0 : 1 }) + ' kg' : Math.round(g) + ' g';
  const fmtDur = m => { const h = Math.floor(m / 60), r = Math.round(m % 60); return h ? h + ' h ' + String(r).padStart(2, '0') : r + ' min'; };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- État ----------
  const STORE_KEY = 'velor-v1';
  const defaults = () => ({
    v: 1, onboarded: false,
    profile: { name: '', palette: 'outremer', custom: '#213BCA', mode: 'auto' },
    hist: {}, mood: {}, price: 1.9, goalM: 40, goalW: 8, min: 20, km: 5, kg: 65, log: []
  });
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_KEY));
      if (raw && typeof raw === 'object') { const d = defaults(); return { ...d, ...raw, profile: { ...d.profile, ...(raw.profile || {}) } }; }
    } catch (e) { /* stockage indisponible */ }
    return defaults();
  }
  let st = load();
  const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(st)); } catch (e) { /* ignoré */ } };

  function sample() {
    let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const h = {}, m = {};
    for (let i = 210; i >= 1; i--) {
      const d = addDays(today, -i), wd = dow(d) < 5, p = rnd();
      let n = wd ? (p < .68 ? 2 : p < .82 ? 1 : 0) : (p < .25 ? 2 : p < .35 ? 1 : 0);
      if (d.getMonth() === 7 && rnd() < .6) n = 0;
      if (n) { h[key(d)] = n; const q = rnd(); m[key(d)] = q < .45 ? 0 : q < .75 ? 1 : q < .9 ? 2 : 3; }
    }
    h[key(today)] = 1;
    return { h, m };
  }

  // ---------- Calculs ----------
  const trips = d => st.hist[key(d)] || 0;
  function sumRange(a, b) { let n = 0; for (let d = new Date(a); d <= b; d = addDays(d, 1)) n += trips(d); return n; }
  const allTrips = () => Object.values(st.hist).reduce((a, b) => a + b, 0);
  function firstDay() {
    const ks = Object.keys(st.hist).filter(k => st.hist[k] > 0).sort();
    if (!ks.length) return today;
    const [y, m, dd] = ks[0].split('-').map(Number); return new Date(y, m - 1, dd, 12);
  }
  const money = n => n * st.price;
  const kcalPerTrip = () => 6.8 * st.kg * st.min / 60; // MET vélo modéré
  const monthStart = () => new Date(today.getFullYear(), today.getMonth(), 1, 12);

  function streak() {
    let d = new Date(today), n = 0;
    if (!trips(d)) d = addDays(d, -1);
    for (let i = 0; i < 800; i++) { if (trips(d)) n++; else if (dow(d) < 5) break; d = addDays(d, -1); }
    return n;
  }
  function bestStreak() {
    let best = 0, cur = 0;
    for (let d = firstDay(); d <= today; d = addDays(d, 1)) { if (trips(d)) { cur++; best = Math.max(best, cur); } else if (dow(d) < 5) cur = 0; }
    return best;
  }
  function level() {
    const xp = allTrips() * 10 + streak() * 5;
    let lv = 1; while (xp >= 50 * lv * (lv + 1)) lv++;
    return { lv, xp, lo: 50 * (lv - 1) * lv, hi: 50 * lv * (lv + 1), name: LEVELS[Math.min(lv - 1, LEVELS.length - 1)] };
  }
  function badges() {
    const tot = allTrips(), saved = money(tot), bs = bestStreak();
    const monthTrips = sumRange(monthStart(), today);
    const weekMin = sumRange(monday, today) * st.min, co2kg = tot * st.km * G.car / 1000;
    const GOLD = '#F2A20C', BLUE = '#213BCA', RED = '#FF5A5F', MINT = '#14A37F';
    return [
      { n: 'Premier coup de pédale', d: '1 trajet', p: Math.min(1, tot / 1), c: GOLD },
      { n: 'Carnet remboursé', d: '10 trajets, 17 € gardés', p: Math.min(1, tot / 10), c: BLUE },
      { n: 'Semaine parfaite', d: '5 jours de suite', p: Math.min(1, bs / 5), c: BLUE },
      { n: 'Tirelire de 50 €', d: '50 € économisés', p: Math.min(1, saved / 50), c: GOLD },
      { n: 'Cœur vaillant', d: '150 min en une semaine', p: Math.min(1, weekMin / 150), c: RED },
      { n: 'Pousse verte', d: '10 kg de CO₂ évités', p: Math.min(1, co2kg / 10), c: MINT },
      { n: 'Centurion', d: '100 trajets', p: Math.min(1, tot / 100), c: BLUE },
      { n: 'Mois en or', d: '30 trajets dans le mois', p: Math.min(1, monthTrips / 30), c: GOLD },
      { n: 'Brûleur de croissants', d: '10 000 kcal', p: Math.min(1, tot * kcalPerTrip() / 10000), c: RED },
      { n: 'Tirelire de 200 €', d: '200 € économisés', p: Math.min(1, saved / 200), c: GOLD },
      { n: 'Infatigable', d: '20 jours de suite', p: Math.min(1, bs / 20), c: BLUE },
      { n: 'Forêt urbaine', d: '250 kg de CO₂ évités', p: Math.min(1, co2kg / 250), c: MINT }
    ];
  }
  const medal = (c, size = 44) => `<svg class="medal" width="${size}" height="${size}" viewBox="0 0 44 44" aria-hidden="true"><path d="M14 2h6l3 12h-6zM30 2h-6l-3 12h6z" fill="${c}" opacity=".55"/><circle cx="22" cy="27" r="14" fill="${c}"/><circle cx="22" cy="27" r="10" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2"/><path d="M17 27.5l3.2 3.2L27 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  const $ = id => document.getElementById(id);

  // ---------- Couleurs ----------
  const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : { matches: false, addEventListener() {} };
  function mix(hex, target, t) {
    const a = parseInt(hex.slice(1), 16), b = parseInt(target.slice(1), 16);
    const ch = (x, s) => (x >> s) & 255;
    const m = s => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * t);
    return '#' + [16, 8, 0].map(s => m(s).toString(16).padStart(2, '0')).join('');
  }
  function theme(id) {
    if (id === 'custom') {
      const c = /^#[0-9a-f]{6}$/i.test(st.profile.custom) ? st.profile.custom : '#213BCA';
      return { n: 'Perso', bg: c, acc: '#FDAC0A', ink: mix(c, '#000000', .6), bike: '#FFFFFF', lift: .2 };
    }
    return PALETTES[id] || PALETTES.outremer;
  }
  function paletteColors(id, dark) {
    const t = theme(id);
    // Clair : la couleur du thème sert aussi aux liens. Sombre : on garde le fond du thème pour les cartes
    // et on prend l'accent pour les liens, sinon ils seraient illisibles.
    return dark ? [t.acc, mix(t.acc, '#ffffff', .2), t.acc] : [t.bg, mix(t.bg, '#ffffff', .18), t.acc];
  }
  function applyTheme() {
    const root = document.documentElement, mode = st.profile.mode;
    if (mode === 'auto') delete root.dataset.theme; else root.dataset.theme = mode;
    const dark = mode === 'dark' || (mode === 'auto' && mq.matches);
    const t = theme(st.profile.palette), [r1, r2, acc] = paletteColors(st.profile.palette, dark);
    const set = (k, v) => root.style.setProperty(k, v);
    set('--rail', r1); set('--rail-2', r2); set('--gold', acc);
    set('--hero-1', dark ? mix(t.bg, '#ffffff', .06) : t.bg); set('--hero-2', mix(t.bg, '#ffffff', dark ? .2 : .18));
    set('--gold-soft', dark ? mix(acc, '#0E1024', .78) : mix(acc, '#ffffff', .8));
    set('--gold-ink', dark ? mix(acc, '#ffffff', .55) : mix(acc, '#000000', .6));
    if (dark) root.style.removeProperty('--ink'); else set('--ink', t.ink);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#0E1024' : t.bg);
    document.querySelectorAll('[data-logo]').forEach(el => el.innerHTML = logoSVG(t, el.dataset.logo));
    const fav = document.querySelector('link[rel="icon"]');
    if (fav) { fav.type = 'image/svg+xml'; fav.href = 'data:image/svg+xml,' + encodeURIComponent(logoSVG(t, 64).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')); }
  }
  mq.addEventListener && mq.addEventListener('change', applyTheme);

  // ---------- Rendu : accueil ----------
  let selDay = null;
  function greeting() {
    const h = new Date().getHours();
    const hello = h < 5 ? 'Bonne nuit' : h < 18 ? 'Bonjour' : 'Bonsoir';
    const name = st.profile.name.trim();
    return name ? `${hello}, ${name} !` : `${hello} !`;
  }
  function renderHome() {
    $('today-label').textContent = today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    $('greeting').textContent = greeting();
    const mTrips = sumRange(monthStart(), today), mSaved = money(mTrips);
    $('hero-label').textContent = 'Économisé en ' + MONTHS_FULL[today.getMonth()];
    const [ent, dec] = mSaved.toFixed(2).split('.');
    $('hero-amount').innerHTML = Number(ent).toLocaleString('fr-FR') + '<small>,' + dec + ' €</small>';
    $('hero-bar').style.width = Math.min(100, mSaved / st.goalM * 100) + '%';
    $('hero-goal-l').textContent = mSaved >= st.goalM ? 'Objectif du mois atteint !' : 'Encore ' + fmtE(st.goalM - mSaved) + " pour l'objectif";
    $('hero-goal-r').textContent = fmtE(st.goalM, 0);

    const dT = trips(today), wT = sumRange(monday, today), aT = allTrips();
    $('t-day').textContent = fmtE(money(dT)); $('t-day-s').textContent = plural(dT, 'trajet');
    $('t-week').textContent = fmtE(money(wT)); $('t-week-s').textContent = plural(wT, 'trajet');
    $('t-all').textContent = fmtE(money(aT), 0); $('t-all-s').textContent = plural(aT, 'trajet');
    $('m-min').textContent = (wT * st.min) + ' min';
    $('m-co2').textContent = fmtKg(aT * st.km * G.car);

    $('add1-p').textContent = '+' + fmtE(st.price);
    $('add2-p').textContent = '+' + fmtE(st.price * 2);
    $('today-trips').textContent = plural(dT, 'trajet') + " aujourd'hui";
    $('undo').disabled = !st.log.length;
    $('log-hint').textContent = 'Un trajet à vélo = un ticket à ' + fmtE(st.price) + ' en moins.';

    $('week').innerHTML = DAYS.map((l, i) => {
      const d = addDays(monday, i), n = trips(d), fut = d > today, k = key(d);
      return `<button class="day" data-day="${k}" ${fut ? 'disabled' : ''} aria-label="${l} : ${n} trajet(s)"><span class="dot ${n ? 'on' : ''} ${i === dow(today) ? 'today' : ''} ${selDay === k ? 'sel' : ''}">${fut ? '' : (n || '–')}</span>${l}</button>`;
    }).join('');
    $('week').querySelectorAll('[data-day]').forEach(b => b.onclick = () => { selDay = selDay === b.dataset.day ? null : b.dataset.day; renderHome(); });
    const de = $('dayedit');
    if (selDay) {
      const [y, m, dd] = selDay.split('-').map(Number), d = new Date(y, m - 1, dd, 12);
      de.hidden = false;
      $('de-title').textContent = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
      $('de-val').textContent = st.hist[selDay] || 0;
    } else de.hidden = true;

    const next = badges().filter(b => b.p < 1).sort((a, b) => b.p - a.p)[0];
    $('teaser').innerHTML = next
      ? `${medal(next.c, 40)}<div style="flex:1;min-width:0"><b>${next.n}</b><span>${next.d} · ${Math.round(next.p * 100)} %</span><div class="track"><i style="width:${next.p * 100}%"></i></div></div>`
      : `${medal('#F2A20C', 40)}<div><b>Tous les badges sont gagnés</b><span>Bravo, vous êtes une légende.</span></div>`;

    $('chip-streak').textContent = streak();
    $('chip-lvl').textContent = level().lv;
  }

  // ---------- Rendu : stats ----------
  let period = 'week';
  function buckets() {
    const out = [];
    if (period === 'week') {
      for (let i = 0; i < 7; i++) { const d = addDays(monday, i); out.push({ l: DAYS[i], t: d > today ? 0 : trips(d), hl: i === dow(today) }); }
      return { out, label: 'Cette semaine', from: monday, prevFrom: addDays(monday, -7), prevTo: addDays(today, -7), prevName: 'la semaine dernière' };
    }
    if (period === 'month') {
      const y = today.getFullYear(), m = today.getMonth(), m1 = new Date(y, m, 1, 12);
      let ws = addDays(m1, -dow(m1)), i = 1;
      while (ws <= today) {
        const we = addDays(ws, 6); let t = 0;
        for (let d = new Date(ws); d <= we && d <= today; d = addDays(d, 1)) if (d.getMonth() === m) t += trips(d);
        out.push({ l: 'S' + i, t, hl: today >= ws && today <= we }); ws = addDays(ws, 7); i++;
      }
      const pf = new Date(y, m - 1, 1, 12), pt = new Date(y, m - 1, Math.min(today.getDate(), new Date(y, m, 0).getDate()), 12);
      return { out, label: 'En ' + MONTHS_FULL[m], from: m1, prevFrom: pf, prevTo: pt, prevName: 'le début de ' + MONTHS_FULL[pf.getMonth()] };
    }
    if (period === 'year') {
      const y = today.getFullYear();
      for (let m = 0; m < 12; m++) { const a = new Date(y, m, 1, 12), b = new Date(y, m + 1, 0, 12); out.push({ l: MONTHS[m].slice(0, 3), t: a > today ? 0 : sumRange(a, b < today ? b : today), hl: m === today.getMonth() }); }
      return { out, label: 'En ' + y, from: new Date(y, 0, 1, 12) };
    }
    const f = firstDay(); let a = new Date(f.getFullYear(), f.getMonth(), 1, 12);
    while (a <= today) {
      const b = new Date(a.getFullYear(), a.getMonth() + 1, 0, 12);
      out.push({ l: MONTHS[a.getMonth()].slice(0, 3), t: sumRange(a, b < today ? b : today), hl: a.getMonth() === today.getMonth() && a.getFullYear() === today.getFullYear() });
      a = new Date(a.getFullYear(), a.getMonth() + 1, 1, 12);
    }
    return { out: out.slice(-12), label: 'Depuis le ' + f.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }), from: f };
  }
  function renderChart(data) {
    const W = 320, H = 170, L = 34, R = 6, T = 18, B = 22, ih = H - T - B, iw = W - L - R;
    const vals = data.map(d => money(d.t)), mx = Math.max(...vals, 1);
    const stepV = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500].find(s => s * 4 >= mx) || 1000;
    const top = stepV * Math.ceil(mx / stepV);
    let s = '';
    for (let v = 0; v <= top + 1e-9; v += stepV) { const y = T + ih - v / top * ih; s += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y}" y2="${y}"/><text x="${L - 6}" y="${y + 3}" text-anchor="end">${v}€</text>`; }
    const bw = iw / data.length, gap = Math.min(10, bw * .28);
    data.forEach((d, i) => {
      const v = vals[i], h = v / top * ih, x = L + i * bw + gap / 2, y = T + ih - h;
      s += `<rect class="bar ${d.hl ? 'hl' : ''}" x="${x}" y="${y}" width="${bw - gap}" height="${Math.max(h, v ? 2 : 0)}" rx="${Math.min(6, (bw - gap) / 2)}"/>`;
      s += `<text x="${x + (bw - gap) / 2}" y="${H - 6}" text-anchor="middle">${d.l}</text>`;
      if (d.hl && v) s += `<text class="vlab" x="${x + (bw - gap) / 2}" y="${y - 5}" text-anchor="middle">${Math.round(v)}€</text>`;
    });
    $('chart').innerHTML = s;
  }
  function renderStats() {
    document.querySelectorAll('#pseg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.p === period));
    const b = buckets(), t = sumRange(b.from, today), v = money(t);
    $('p-label').textContent = b.label;
    $('p-amount').textContent = fmtE(v);
    const dEl = $('p-delta');
    if (b.prevFrom) {
      const pv = money(sumRange(b.prevFrom, b.prevTo)), diff = v - pv;
      dEl.hidden = false; dEl.className = 'delta ' + (diff >= 0 ? 'up' : 'down');
      dEl.textContent = (diff >= 0 ? '+' : '−') + fmtE(Math.abs(diff)) + ' vs ' + b.prevName;
    } else dEl.hidden = true;
    renderChart(b.out);
    const days = Math.max(1, Math.round((today - b.from) / 864e5) + 1);
    let best = null, bn = 0;
    for (let d = new Date(b.from); d <= today; d = addDays(d, 1)) if (trips(d) > bn) { bn = trips(d); best = d; }
    $('f-trips').textContent = t; $('f-trips-s').textContent = 'soit ' + plural(t, 'ticket') + ' évités';
    $('f-carnets').textContent = (t / CARNET_N).toLocaleString('fr-FR', { maximumFractionDigits: 1 });
    $('f-avg').textContent = fmtE(v / days);
    $('f-best').textContent = best ? fmtE(money(bn)) : '–';
    $('f-best-s').textContent = best ? best.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) : 'aucun trajet';
    const nC = Math.ceil(t / CARNET_N);
    $('compare').innerHTML = t
      ? `En tram, ces <b>${plural(t, 'trajet')}</b> auraient coûté <b>${fmtE(t * 1.9)}</b> au ticket ou <b>${fmtE(nC * CARNET, 0)}</b> en carnets (${nC} × 17 €). Vous les avez gardés.`
      : 'Ajoutez votre premier trajet à vélo pour voir combien vous économisez.';
  }

  // ---------- Rendu : impact ----------
  let iperiod = 'month';
  function renderImpact() {
    document.querySelectorAll('#iseg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.ip === iperiod));
    const from = iperiod === 'week' ? monday : iperiod === 'month' ? monthStart() : firstDay();
    const t = sumRange(from, today), mins = t * st.min, kcal = t * kcalPerTrip(), km = t * st.km;
    const wMin = sumRange(monday, today) * st.min;
    let wDays = 0; for (let d = new Date(monday); d <= today; d = addDays(d, 1)) if (trips(d)) wDays++;

    $('ring-fg').style.strokeDashoffset = 314.16 * (1 - Math.min(1, wMin / 150));
    $('ring-n').textContent = wMin;
    $('ring-t').textContent = wMin >= 150 ? 'Objectif OMS atteint cette semaine' : 'Encore ' + (150 - wMin) + ' min cette semaine';
    $('h-time').textContent = fmtDur(mins);
    $('h-kcal').textContent = Math.round(kcal).toLocaleString('fr-FR');
    $('h-km').textContent = km.toLocaleString('fr-FR') + ' km';

    const fx = [
      { on: wMin >= 150, t: wMin >= 150 ? "Vous atteignez les 150 minutes hebdomadaires conseillées par l'OMS." : 'À ' + (150 - wMin) + " minutes des 150 min hebdomadaires conseillées par l'OMS." },
      { on: wDays >= 3, t: wDays >= 3 ? wDays + ' jours actifs cette semaine : votre cœur et votre souffle travaillent régulièrement.' : 'Pédalez au moins 3 jours par semaine pour un effet régulier sur le cœur (' + wDays + " pour l'instant)." },
      { on: kcal >= 230, t: Math.round(kcal).toLocaleString('fr-FR') + " kcal dépensées, l'équivalent de " + (kcal / 230).toLocaleString('fr-FR', { maximumFractionDigits: kcal < 2300 ? 1 : 0 }) + ' croissant' + (kcal >= 460 ? 's' : '') + '.' },
      { on: t > 0, t: 'Une activité physique régulière aide à mieux dormir et à réduire le stress.' }
    ];
    $('effects').innerHTML = fx.map(f => `<li class="${f.on ? '' : 'off'}"><i></i><span>${f.t}</span></li>`).join('');

    const tk = key(today), cur = st.mood[tk];
    $('mood').innerHTML = MOODS.map((m, i) => `<button data-m="${i}" aria-pressed="${cur === i}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/>${m.f}</svg>${m.l}</button>`).join('');
    $('mood').querySelectorAll('button').forEach(b => b.onclick = () => {
      st.mood[tk] = Number(b.dataset.m); save(); renderImpact();
      toast('<span>Ressenti enregistré : <b>' + MOODS[b.dataset.m].l + '</b></span>');
    });
    let pos = 0, all = 0;
    for (let d = new Date(from); d <= today; d = addDays(d, 1)) { const v = st.mood[key(d)]; if (v !== undefined && trips(d)) { all++; if (v <= 1) pos++; } }
    $('mood-s').textContent = all ? `Sur la période, votre ressenti était positif après ${pos} trajet${pos > 1 ? 's' : ''} sur ${all} (${Math.round(pos / all * 100)} %).` : "Notez votre ressenti pour voir l'effet du vélo sur votre humeur.";

    const car = km * G.car, tram = km * G.tram, bus = km * G.bus, mx = Math.max(car, 1);
    $('e-car').innerHTML = fmtKg(car).replace(/ (k?g)$/, '<small> $1</small>');
    $('e-vs').innerHTML = [['Voiture', car, 'var(--warn)'], ['Bus', bus, 'var(--gold)'], ['Tram', tram, 'var(--rail)'], ['Vélo', 0, 'var(--eco)']]
      .map(([l, v, c]) => `<div class="r"><span>${l}</span><div class="bar2"><i style="width:${Math.max(v / mx * 100, v ? 2 : 0)}%;background:${c}"></i></div><b class="num">${fmtKg(v)}</b></div>`).join('');
    $('e-tram').textContent = fmtKg(tram);
    $('e-km').textContent = km.toLocaleString('fr-FR');
    $('e-fuel').textContent = (km * 0.065).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' L';
  }

  // ---------- Rendu : défis ----------
  function renderDefis() {
    const L = level();
    $('lv-n').textContent = L.lv; $('lv-name').textContent = L.name;
    $('lv-bar').style.width = ((L.xp - L.lo) / (L.hi - L.lo) * 100) + '%';
    $('lv-xp').textContent = L.xp + ' XP'; $('lv-next').textContent = 'Niv. ' + (L.lv + 1) + ' à ' + L.hi + ' XP';
    $('st-n').textContent = streak();
    $('st-s').textContent = 'Record : ' + plural(bestStreak(), 'jour') + '. Les week-ends ne cassent pas la série.';
    const mS = money(sumRange(monthStart(), today)), wT = sumRange(monday, today);
    const g = (el, title, cur, goal, curTxt, goalTxt) => {
      el.className = 'goal-card' + (cur >= goal ? ' done' : '');
      el.innerHTML = `<div class="row"><b>${title}</b><span class="num">${curTxt} / ${goalTxt}</span></div><div class="track"><i style="width:${Math.min(100, cur / goal * 100)}%"></i></div>`;
    };
    g($('g-month'), 'Économiser ' + fmtE(st.goalM, 0) + ' en ' + MONTHS_FULL[today.getMonth()], mS, st.goalM, fmtE(mS), fmtE(st.goalM, 0));
    g($('g-week'), plural(st.goalW, 'trajet') + ' cette semaine', wT, st.goalW, wT, st.goalW);
    const bs = badges(), won = bs.filter(b => b.p >= 1).length;
    $('bdg-count').textContent = won + ' / ' + bs.length + ' gagnés';
    $('badges').innerHTML = bs.map(b => `<div class="bdg ${b.p < 1 ? 'locked' : ''}">${medal(b.c)}<b>${b.n}</b><span>${b.p < 1 ? Math.round(b.p * 100) + ' %' : b.d}</span></div>`).join('');
  }

  // ---------- Rendu : réglages ----------
  function renderSwatches() {
    const items = Object.entries(PALETTES).map(([id, p]) =>
      `<button class="sw" role="radio" data-pal="${id}" aria-checked="${st.profile.palette === id}">${logoSVG(p, 44)}${p.n}</button>`);
    const cust = st.profile.palette === 'custom' ? logoSVG(theme('custom'), 44) : '<span class="pair" style="background:conic-gradient(#FD5B66,#FDAC0A,#84F502,#46F997,#213BCA,#461359,#FD5B66)"></span>';
    items.push(`<label class="sw" role="radio" data-pal="custom" aria-checked="${st.profile.palette === 'custom'}" style="position:relative;cursor:pointer">${cust}Perso<input type="color" id="custom-color" value="${esc(st.profile.custom)}" aria-label="Choisir une couleur personnalisée"></label>`);
    $('swatches').innerHTML = items.join('');
    $('swatches').querySelectorAll('button[data-pal]').forEach(b => b.onclick = () => { st.profile.palette = b.dataset.pal; save(); applyTheme(); renderSwatches(); });
    const cc = $('custom-color');
    cc.oninput = () => { st.profile.custom = cc.value; st.profile.palette = 'custom'; applyTheme(); };
    cc.onchange = () => { st.profile.custom = cc.value; st.profile.palette = 'custom'; save(); applyTheme(); renderSwatches(); };
    document.querySelectorAll('#modes button').forEach(b => b.setAttribute('aria-checked', b.dataset.mode === st.profile.mode));
  }
  function renderSettings() {
    const nameEl = $('p-name');
    if (document.activeElement !== nameEl) nameEl.value = st.profile.name;
    $('avatar').textContent = (st.profile.name.trim()[0] || '?').toUpperCase();
    document.querySelectorAll('#s-price .opt').forEach(o => o.setAttribute('aria-checked', Number(o.dataset.price) === st.price));
    $('v-goalM').textContent = st.goalM + ' €';
    $('v-goalW').textContent = st.goalW;
    $('v-min').textContent = st.min + ' min';
    $('v-km').textContent = st.km + ' km';
    $('v-kg').textContent = st.kg + ' kg';
    renderSwatches();
  }

  function renderAll() { refreshToday(); renderHome(); renderStats(); renderImpact(); renderDefis(); renderSettings(); }

  // ---------- Navigation ----------
  function go(name) {
    document.querySelectorAll('.screen').forEach(s => s.hidden = s.id !== 's-' + name);
    document.querySelectorAll('#tabs button').forEach(b => b.dataset.go === name ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'));
    $('screens').scrollTop = 0;
  }
  document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => go(b.dataset.go)));

  // ---------- Toast et pièces ----------
  let toastT;
  function toast(html) { const t = $('toast'); t.innerHTML = html; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }
  function coins(btn, n) {
    const app = $('app'), ph = app.getBoundingClientRect(), r = btn.getBoundingClientRect();
    for (let i = 0; i < n * 3; i++) {
      const c = document.createElement('div'); c.className = 'coin'; c.textContent = '€';
      c.style.left = (r.left - ph.left + r.width / 2 - 13 + (Math.random() * 40 - 20)) + 'px';
      c.style.top = (r.top - ph.top) + 'px';
      c.style.setProperty('--dx', (Math.random() * 80 - 40) + 'px');
      c.style.animation = `rise ${0.9 + Math.random() * .5}s ease-out ${i * 0.06}s forwards`;
      app.appendChild(c); setTimeout(() => c.remove(), 2200);
    }
  }

  // ---------- Saisie de trajets ----------
  function add(n, btn) {
    refreshToday();
    const before = level().lv, bBefore = badges().filter(b => b.p >= 1).length;
    const k = key(today); st.hist[k] = (st.hist[k] || 0) + n; st.log.push({ k, n }); if (st.log.length > 50) st.log.shift(); save();
    coins(btn, n);
    const L = level(), won = badges().filter(b => b.p >= 1);
    let msg = `<span>+<b>${fmtE(money(n))}</b> gardés dans votre tirelire. +${n * 10} XP</span>`;
    if (L.lv > before) msg = `<span>Niveau ${L.lv} atteint : <b>${L.name}</b> !</span>`;
    else if (won.length > bBefore) msg = `<span>Nouveau badge : <b>${won[won.length - 1].n}</b></span>`;
    toast(msg); renderAll();
    if (navigator.vibrate) try { navigator.vibrate(30); } catch (e) { /* ignoré */ }
  }
  $('add1').addEventListener('click', e => add(1, e.currentTarget));
  $('add2').addEventListener('click', e => add(2, e.currentTarget));
  $('undo').addEventListener('click', () => {
    const last = st.log.pop(); if (!last) return;
    st.hist[last.k] = Math.max(0, (st.hist[last.k] || 0) - last.n); if (!st.hist[last.k]) delete st.hist[last.k];
    save(); toast('<span>Dernier trajet annulé</span>'); renderAll();
  });
  function editDay(delta) {
    if (!selDay) return;
    const v = Math.max(0, Math.min(10, (st.hist[selDay] || 0) + delta));
    if (v) st.hist[selDay] = v; else delete st.hist[selDay];
    save(); renderAll();
  }
  $('de-minus').onclick = () => editDay(-1);
  $('de-plus').onclick = () => editDay(1);

  // ---------- Stats / impact ----------
  document.querySelectorAll('#pseg button').forEach(b => b.addEventListener('click', () => { period = b.dataset.p; renderStats(); }));
  document.querySelectorAll('#iseg button').forEach(b => b.addEventListener('click', () => { iperiod = b.dataset.ip; renderImpact(); }));

  // ---------- Réglages ----------
  $('p-name').addEventListener('input', e => { st.profile.name = e.target.value.slice(0, 30); save(); renderHome(); $('avatar').textContent = (st.profile.name.trim()[0] || '?').toUpperCase(); });
  document.querySelectorAll('#s-price .opt').forEach(o => o.addEventListener('click', () => {
    st.price = Number(o.dataset.price); save(); renderAll();
    toast(`<span>Prix de référence : <b>${fmtE(st.price)}</b> par trajet</span>`);
  }));
  const LIMITS = { goalM: [10, 300], goalW: [1, 30], min: [5, 120], km: [1, 40], kg: [30, 180] };
  document.querySelectorAll('[data-step]').forEach(b => b.addEventListener('click', () => {
    const [f, d] = b.dataset.step.split(':'), [lo, hi] = LIMITS[f];
    st[f] = Math.min(hi, Math.max(lo, st[f] + Number(d))); save(); renderAll();
  }));
  document.querySelectorAll('#modes button').forEach(b => b.addEventListener('click', () => { st.profile.mode = b.dataset.mode; save(); applyTheme(); renderSwatches(); }));

  $('export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(st, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'velor-' + key(new Date()) + '.json';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $('import-file').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result);
        if (!d || typeof d.hist !== 'object') throw new Error('format');
        const base = defaults(); st = { ...base, ...d, profile: { ...base.profile, ...(d.profile || {}) }, onboarded: true };
        save(); applyTheme(); renderAll(); toast('<span>Données importées</span>');
      } catch (err) { toast("<span>Ce fichier n'est pas une sauvegarde VélOr.</span>"); }
      e.target.value = '';
    };
    r.readAsText(f);
  });
  function resetZone() {
    $('reset-zone').innerHTML = '<button class="plain danger" id="reset">Effacer mes trajets</button>';
    $('reset').onclick = () => {
      $('reset-zone').innerHTML = '<div class="confirm"><span>Effacer tous les trajets ?</span><button class="yes" id="r-yes">Effacer</button><button class="no" id="r-no">Garder</button><button class="no" id="r-demo">Charger l\'exemple</button></div>';
      $('r-yes').onclick = () => { st.hist = {}; st.mood = {}; st.log = []; save(); renderAll(); resetZone(); toast('<span>Compteurs remis à zéro</span>'); };
      $('r-demo').onclick = () => { const s = sample(); st.hist = s.h; st.mood = s.m; st.log = []; save(); renderAll(); resetZone(); toast("<span>Données d'exemple chargées</span>"); };
      $('r-no').onclick = resetZone;
    };
  }
  resetZone();

  // ---------- Premier lancement ----------
  let wPrice = st.price;
  function renderWelcomePrice() { document.querySelectorAll('#w-price .opt').forEach(o => o.setAttribute('aria-checked', Number(o.dataset.price) === wPrice)); }
  function renderWelcomeThemes() {
    $('w-swatches').innerHTML = Object.entries(PALETTES).map(([id, p]) => `<button type="button" class="sw" role="radio" data-pal="${id}" aria-checked="${st.profile.palette === id}">${logoSVG(p, 44)}${p.n}</button>`).join('');
    $('w-swatches').querySelectorAll('[data-pal]').forEach(b => b.onclick = () => { st.profile.palette = b.dataset.pal; applyTheme(); renderWelcomeThemes(); });
  }
  document.querySelectorAll('#w-price .opt').forEach(o => o.addEventListener('click', () => { wPrice = Number(o.dataset.price); renderWelcomePrice(); }));
  function finishWelcome(demo) {
    st.profile.name = $('w-name').value.trim().slice(0, 30);
    st.price = wPrice; st.onboarded = true;
    if (demo) { const s = sample(); st.hist = s.h; st.mood = s.m; }
    save(); $('welcome').hidden = true; renderAll();
    toast(st.profile.name ? `<span>Bienvenue, <b>${esc(st.profile.name)}</b> !</span>` : '<span>Bienvenue sur <b>VélOr</b> !</span>');
  }
  $('welcome-form').addEventListener('submit', e => { e.preventDefault(); finishWelcome(false); });
  $('w-demo').addEventListener('click', () => finishWelcome(true));

  // ---------- Démarrage ----------
  applyTheme();
  if (!st.onboarded) { $('welcome').hidden = false; renderWelcomePrice(); renderWelcomeThemes(); }
  renderAll();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) renderAll(); });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
