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
  // Nom du carnet santé du téléphone (appli native) : Apple Santé sur iPhone, Health Connect sur Android.
  const HEALTH_NAME = () => (window.VelOrNative && window.VelOrNative.healthName) || 'Santé';
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
  // Chaque trajet est enregistré avec sa distance, sa durée et la façon dont elles ont été obtenues,
  // pour que les chiffres santé et CO₂ reposent sur des mesures et pas sur une moyenne.
  const STORE_KEY = 'velor-v1';
  const KG_RANGE = [55, 85]; // fourchette utilisée tant que le poids n'est pas renseigné
  const DETOUR = 1.3;        // distance à vol d'oiseau × 1,3 ≈ distance réelle à vélo en ville
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const defaultFavs = () => [{ id: 'boulot', name: 'Boulot', km: 5, min: 20, tram: true }];
  const defaults = () => ({
    v: 2, onboarded: false,
    profile: { name: '', palette: 'outremer', custom: '#213BCA', mode: 'auto', kg: null },
    trips: [], favs: defaultFavs(), mood: {}, price: 1.9, goalM: 40, goalW: 8, chrono: null, undo: []
  });
  function migrate(raw) {
    const d = defaults();
    const st2 = { ...d, ...raw, profile: { ...d.profile, ...(raw.profile || {}) } };
    if (raw.v !== 2) { // version 1 : un simple compteur de trajets par jour
      const km = raw.km || 5, min = raw.min || 20;
      st2.favs = [{ id: 'boulot', name: 'Boulot', km, min, tram: true }];
      st2.trips = [];
      Object.entries(raw.hist || {}).forEach(([k, n]) => { for (let i = 0; i < n; i++) st2.trips.push({ id: uid(), k, km, min, fav: 'boulot', name: 'Boulot', tram: true, dur: 'favori', dist: 'favori' }); });
      if (raw.kg && raw.kg !== 65) st2.profile.kg = raw.kg; // 65 kg était la valeur par défaut, pas une saisie
      st2.v = 2; delete st2.hist; delete st2.log; delete st2.km; delete st2.min; delete st2.kg;
    }
    if (!Array.isArray(st2.trips)) st2.trips = [];
    if (!Array.isArray(st2.favs) || !st2.favs.length) st2.favs = defaultFavs();
    if (!Array.isArray(st2.undo)) st2.undo = [];
    return st2;
  }
  function load() {
    try { const raw = JSON.parse(localStorage.getItem(STORE_KEY)); if (raw && typeof raw === 'object') return migrate(raw); } catch (e) { /* stockage indisponible */ }
    return defaults();
  }
  let st = load();
  let byDay = {};
  function reindex() { byDay = {}; st.trips.forEach(t => (byDay[t.k] = byDay[t.k] || []).push(t)); }
  reindex();
  const save = () => { reindex(); try { localStorage.setItem(STORE_KEY, JSON.stringify(st)); } catch (e) { /* ignoré */ } };
  if (st.onboarded) save(); // enregistre tout de suite une éventuelle migration

  function sample() {
    let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const favs = [
      { id: 'boulot', name: 'Boulot', km: 5.2, min: 21, tram: true },
      { id: 'courses', name: 'Courses', km: 1.8, min: 8, tram: true },
      { id: 'sport', name: 'Balade', km: 14, min: 50, tram: false }
    ];
    const trips = [], mood = {};
    const add = (k, f) => trips.push({ id: uid(), k, km: f.km, min: Math.max(5, Math.round(f.min + (rnd() - .5) * 6)), fav: f.id, name: f.name, tram: f.tram, dur: rnd() < .6 ? 'chrono' : 'favori', dist: 'favori' });
    for (let i = 210; i >= 0; i--) {
      const d = addDays(today, -i), k = key(d), wd = dow(d) < 5, p = rnd();
      if (d.getMonth() === 7 && rnd() < .6) continue;
      if (i === 0) { add(k, favs[0]); break; }
      if (wd) { if (p < .68) { add(k, favs[0]); add(k, favs[0]); } else if (p < .82) add(k, favs[0]); if (rnd() < .15) add(k, favs[1]); }
      else { if (p < .25) add(k, favs[2]); if (rnd() < .3) { add(k, favs[1]); add(k, favs[1]); } }
      if (byDayOf(trips, k)) { const q = rnd(); mood[k] = q < .45 ? 0 : q < .75 ? 1 : q < .9 ? 2 : 3; }
    }
    return { trips, mood, favs };
  }
  const byDayOf = (list, k) => list.some(t => t.k === k);

  // ---------- Calculs ----------
  const dayList = d => byDay[typeof d === 'string' ? d : key(d)] || [];
  const trips = d => dayList(d).filter(t => t.tram).length;  // trajets qui remplacent un ticket (économies)
  const rides = d => dayList(d).length;                       // tous les trajets à vélo (série, activité)
  function sumRange(a, b, f = trips) { let n = 0; for (let d = new Date(a); d <= b; d = addDays(d, 1)) n += f(d); return n; }
  function tripsIn(a, b) { const ka = key(a), kb = key(b); return st.trips.filter(t => t.k >= ka && t.k <= kb); }
  const allTrips = () => st.trips.filter(t => t.tram).length;
  function firstDay() {
    if (!st.trips.length) return today;
    const k0 = st.trips.reduce((m, t) => t.k < m ? t.k : m, st.trips[0].k);
    const [y, m, dd] = k0.split('-').map(Number); return new Date(y, m - 1, dd, 12);
  }
  const money = n => n * st.price;
  const kcalOf = (min, kg) => 6.8 * kg * min / 60; // MET 6,8 : vélo à allure modérée
  const kcalRange = list => { const m = list.reduce((a, t) => a + t.min, 0); return st.profile.kg ? [kcalOf(m, st.profile.kg), kcalOf(m, st.profile.kg)] : [kcalOf(m, KG_RANGE[0]), kcalOf(m, KG_RANGE[1])]; };
  const fmtKcal = ([a, b]) => a === b ? Math.round(a).toLocaleString('fr-FR') : '≈ ' + Math.round(a).toLocaleString('fr-FR') + '–' + Math.round(b).toLocaleString('fr-FR');
  const monthStart = () => new Date(today.getFullYear(), today.getMonth(), 1, 12);
  const fmtKm = km => km.toLocaleString('fr-FR', { maximumFractionDigits: km < 100 ? 1 : 0 }) + ' km';

  function streak() {
    let d = new Date(today), n = 0;
    if (!rides(d)) d = addDays(d, -1);
    for (let i = 0; i < 800; i++) { if (rides(d)) n++; else if (dow(d) < 5) break; d = addDays(d, -1); }
    return n;
  }
  function bestStreak() {
    let best = 0, cur = 0;
    for (let d = firstDay(); d <= today; d = addDays(d, 1)) { if (rides(d)) { cur++; best = Math.max(best, cur); } else if (dow(d) < 5) cur = 0; }
    return best;
  }
  function level() {
    const xp = st.trips.length * 10 + streak() * 5;
    let lv = 1; while (xp >= 50 * lv * (lv + 1)) lv++;
    return { lv, xp, lo: 50 * (lv - 1) * lv, hi: 50 * lv * (lv + 1), name: LEVELS[Math.min(lv - 1, LEVELS.length - 1)] };
  }
  function badges() {
    const tot = allTrips(), saved = money(tot), bs = bestStreak(), all = st.trips.length;
    const monthRides = sumRange(monthStart(), today, rides);
    const weekMin = tripsIn(monday, today).reduce((a, t) => a + t.min, 0);
    const kmAll = st.trips.reduce((a, t) => a + t.km, 0), co2kg = kmAll * G.car / 1000;
    const kcalLow = kcalRange(st.trips)[0];
    const GOLD = '#F2A20C', BLUE = '#213BCA', RED = '#FF5A5F', MINT = '#14A37F';
    return [
      { n: 'Premier coup de pédale', d: '1 trajet', p: Math.min(1, all / 1), c: GOLD },
      { n: 'Carnet remboursé', d: '10 tickets évités, 17 € gardés', p: Math.min(1, tot / 10), c: BLUE },
      { n: 'Semaine parfaite', d: '5 jours de suite', p: Math.min(1, bs / 5), c: BLUE },
      { n: 'Tirelire de 50 €', d: '50 € économisés', p: Math.min(1, saved / 50), c: GOLD },
      { n: 'Cœur vaillant', d: '150 min en une semaine', p: Math.min(1, weekMin / 150), c: RED },
      { n: 'Pousse verte', d: '10 kg de CO₂ évités', p: Math.min(1, co2kg / 10), c: MINT },
      { n: 'Centurion', d: '100 trajets', p: Math.min(1, all / 100), c: BLUE },
      { n: 'Mois en or', d: '30 trajets dans le mois', p: Math.min(1, monthRides / 30), c: GOLD },
      { n: 'Brûleur de croissants', d: '10 000 kcal', p: Math.min(1, kcalLow / 10000), c: RED },
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
  const tripLine = t => `${fmtKm(t.km)} · ${t.min} min${t.dur === 'chrono' ? ' (chrono)' : t.dur === 'sante' ? ' (' + HEALTH_NAME() + ')' : ''}${t.tram ? '' : ' · hors tram'}`;
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
    $('t-day').textContent = fmtE(money(dT)); $('t-day-s').textContent = plural(dT, 'ticket') + ' évité' + (dT > 1 ? 's' : '');
    $('t-week').textContent = fmtE(money(wT)); $('t-week-s').textContent = plural(wT, 'ticket') + ' évité' + (wT > 1 ? 's' : '');
    $('t-all').textContent = fmtE(money(aT), 0); $('t-all-s').textContent = plural(aT, 'ticket') + ' évité' + (aT > 1 ? 's' : '');
    $('m-min').textContent = tripsIn(monday, today).reduce((a, t) => a + t.min, 0) + ' min';
    $('m-co2').textContent = fmtKg(st.trips.reduce((a, t) => a + t.km, 0) * G.car);

    // Chrono
    const run = !!st.chrono;
    $('chrono-run').hidden = !run; $('chrono-start').hidden = run; $('fav-chips').hidden = run; $('log-hint').hidden = run;
    tickChrono();

    // Trajets favoris : un geste pour ajouter
    $('fav-chips').innerHTML = st.favs.map(f => `<button class="fav" data-fav="${esc(f.id)}"><b>${esc(f.name)}</b><span class="num">${fmtKm(f.km)} · ${f.min} min${f.tram ? ' · +' + fmtE(st.price) : ''}</span></button>`).join('')
      + '<button class="fav other" id="fav-other"><b>+ Autre</b><span>trajet ponctuel</span></button>';
    $('fav-chips').querySelectorAll('[data-fav]').forEach(b => b.onclick = () => quickAdd(b.dataset.fav, b));
    $('fav-other').onclick = () => openTripSheet({});
    const nToday = rides(today);
    $('today-trips').textContent = plural(nToday, 'trajet') + " aujourd'hui";
    $('undo').disabled = !st.undo.length;

    $('week').innerHTML = DAYS.map((l, i) => {
      const d = addDays(monday, i), n = rides(d), fut = d > today, k = key(d);
      return `<button class="day" data-day="${k}" ${fut ? 'disabled' : ''} aria-label="${l} : ${n} trajet(s)"><span class="dot ${n ? 'on' : ''} ${i === dow(today) ? 'today' : ''} ${selDay === k ? 'sel' : ''}">${fut ? '' : (n || '–')}</span>${l}</button>`;
    }).join('');
    $('week').querySelectorAll('[data-day]').forEach(b => b.onclick = () => { selDay = selDay === b.dataset.day ? null : b.dataset.day; renderHome(); });
    const dp = $('daypanel');
    if (selDay) {
      const [y, m, dd] = selDay.split('-').map(Number), d = new Date(y, m - 1, dd, 12), list = dayList(selDay);
      dp.hidden = false;
      dp.innerHTML = `<div class="dp-h"><b>${d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</b><button class="link" id="dp-add">+ Ajouter</button></div>`
        + (list.length ? list.map(t => `<div class="trow"><div><b>${esc(t.name)}</b><span class="num">${tripLine(t)}</span></div><button class="x" data-del="${t.id}" aria-label="Supprimer ce trajet">✕</button></div>`).join('') : '<p class="note" style="text-align:left;margin:0">Aucun trajet ce jour-là.</p>');
      $('dp-add').onclick = () => openTripSheet({ k: selDay });
      dp.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { st.trips = st.trips.filter(t => t.id !== b.dataset.del); save(); renderAll(); toast('<span>Trajet supprimé</span>'); });
    } else dp.hidden = true;

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
    const list = tripsIn(from, today), weekList = tripsIn(monday, today);
    const mins = list.reduce((a, t) => a + t.min, 0), km = list.reduce((a, t) => a + t.km, 0), kcal = kcalRange(list);
    const wMin = weekList.reduce((a, t) => a + t.min, 0);
    let wDays = 0; for (let d = new Date(monday); d <= today; d = addDays(d, 1)) if (rides(d)) wDays++;

    $('ring-fg').style.strokeDashoffset = 314.16 * (1 - Math.min(1, wMin / 150));
    $('ring-n').textContent = wMin;
    $('ring-t').textContent = wMin >= 150 ? 'Objectif OMS atteint cette semaine' : 'Encore ' + (150 - wMin) + ' min cette semaine';
    $('h-time').textContent = fmtDur(mins);
    $('h-kcal').textContent = fmtKcal(kcal);
    $('h-km').textContent = fmtKm(km);

    const kMid = (kcal[0] + kcal[1]) / 2, cr = kMid / 230;
    const fx = [
      { on: wMin >= 150, t: wMin >= 150 ? "Vous atteignez les 150 minutes hebdomadaires conseillées par l'OMS." : 'À ' + (150 - wMin) + " minutes des 150 min hebdomadaires conseillées par l'OMS." },
      { on: wDays >= 3, t: wDays >= 3 ? wDays + ' jours actifs cette semaine : votre cœur et votre souffle travaillent régulièrement.' : 'Pédalez au moins 3 jours par semaine pour un effet régulier sur le cœur (' + wDays + " pour l'instant)." },
      { on: kMid >= 230, t: fmtKcal(kcal) + " kcal dépensées, l'équivalent " + (st.profile.kg ? 'de ' : "d'environ ") + cr.toLocaleString('fr-FR', { maximumFractionDigits: cr < 10 ? 1 : 0 }) + ' croissant' + (cr >= 2 ? 's' : '') + '.' },
      { on: list.length > 0, t: 'Une activité physique régulière aide à mieux dormir et à réduire le stress.' }
    ];
    $('effects').innerHTML = fx.map(f => `<li class="${f.on ? '' : 'off'}"><i></i><span>${f.t}</span></li>`).join('');

    // Fiabilité des chiffres
    const n = list.length, timed = list.filter(t => t.dur === 'chrono' || t.dur === 'manuel' || t.dur === 'sante').length;
    const kgOk = !!st.profile.kg;
    const rel = [
      { ok: kgOk, t: kgOk ? `Poids renseigné (${st.profile.kg} kg) : calories calculées pour vous.` : 'Poids non renseigné : les calories sont une fourchette (55 à 85 kg).', act: kgOk ? '' : '<button class="link" data-go="reglages">Ajouter</button>' },
      { ok: n && timed / n >= .5, t: n ? `${Math.round(timed / n * 100)} % des durées mesurées (chrono, montre ou saisie), les autres viennent de vos favoris.` : 'Lancez le chrono pour mesurer vos durées réelles.' },
      { ok: true, t: 'Distances issues de vos favoris, de la carte, de votre saisie' + (list.some(t => t.dist === 'sante') ? ' ou de ' + HEALTH_NAME() : '') + '.' }
    ];
    $('reliab').innerHTML = '<b>Fiabilité des chiffres</b>' + rel.map(r => `<div class="rel ${r.ok ? 'ok' : ''}"><i></i><span>${r.t}</span>${r.act || ''}</div>`).join('');
    $('reliab').querySelectorAll('[data-go]').forEach(b => b.onclick = () => { go('reglages'); setTimeout(() => $('p-kg').focus(), 50); });

    const tk = key(today), cur = st.mood[tk];
    $('mood').innerHTML = MOODS.map((m, i) => `<button data-m="${i}" aria-pressed="${cur === i}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/>${m.f}</svg>${m.l}</button>`).join('');
    $('mood').querySelectorAll('button').forEach(b => b.onclick = () => {
      st.mood[tk] = Number(b.dataset.m); save(); renderImpact();
      toast('<span>Ressenti enregistré : <b>' + MOODS[b.dataset.m].l + '</b></span>');
    });
    let pos = 0, all = 0;
    for (let d = new Date(from); d <= today; d = addDays(d, 1)) { const v = st.mood[key(d)]; if (v !== undefined && rides(d)) { all++; if (v <= 1) pos++; } }
    $('mood-s').textContent = all ? `Sur la période, votre ressenti était positif après ${pos} jour${pos > 1 ? 's' : ''} de vélo sur ${all} (${Math.round(pos / all * 100)} %).` : "Notez votre ressenti pour voir l'effet du vélo sur votre humeur.";

    const car = km * G.car, tram = km * G.tram, bus = km * G.bus, mx = Math.max(car, 1);
    $('e-car').innerHTML = fmtKg(car).replace(/ (k?g)$/, '<small> $1</small>');
    $('e-vs').innerHTML = [['Voiture', car, 'var(--warn)'], ['Bus', bus, 'var(--gold)'], ['Tram', tram, 'var(--rail)'], ['Vélo', 0, 'var(--eco)']]
      .map(([l, v, c]) => `<div class="r"><span>${l}</span><div class="bar2"><i style="width:${Math.max(v / mx * 100, v ? 2 : 0)}%;background:${c}"></i></div><b class="num">${fmtKg(v)}</b></div>`).join('');
    $('e-tram').textContent = fmtKg(tram);
    $('e-km').textContent = km.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
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
    const nameEl = $('p-name'), kgEl = $('p-kg');
    if (document.activeElement !== nameEl) nameEl.value = st.profile.name;
    if (document.activeElement !== kgEl) kgEl.value = st.profile.kg || '';
    $('avatar').textContent = (st.profile.name.trim()[0] || '?').toUpperCase();
    document.querySelectorAll('#s-price .opt').forEach(o => o.setAttribute('aria-checked', Number(o.dataset.price) === st.price));
    $('v-goalM').textContent = st.goalM + ' €';
    $('v-goalW').textContent = st.goalW;
    $('favlist').innerHTML = st.favs.map(f => `<div class="trow"><div><b>${esc(f.name)}</b><span class="num">${fmtKm(f.km)} · ${f.min} min · ${f.tram ? 'remplace un ticket de tram' : 'ne remplace pas le tram'}</span></div><button class="link" data-edit="${esc(f.id)}">Modifier</button></div>`).join('');
    $('favlist').querySelectorAll('[data-edit]').forEach(b => b.onclick = () => openFavSheet(b.dataset.edit));
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
  function toast(html, ms = 2600) { const t = $('toast'); t.innerHTML = html; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms); }
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
  function celebrate(added, btn) {
    const before = { lv: level().lv, b: badges().filter(b => b.p >= 1).length };
    return () => {
      const tramN = added.filter(t => t.tram).length;
      if (btn && tramN) coins(btn, tramN);
      const L = level(), won = badges().filter(b => b.p >= 1);
      if (L.lv > before.lv) return `<span>Niveau ${L.lv} atteint : <b>${L.name}</b> !</span>`;
      if (won.length > before.b) return `<span>Nouveau badge : <b>${won[won.length - 1].n}</b></span>`;
      return tramN ? `<span>+<b>${fmtE(money(tramN))}</b> gardés · +${added.length * 10} XP</span>` : `<span>Trajet ajouté · +${added.length * 10} XP</span>`;
    };
  }
  function addTrips(list, btn) {
    const fin = celebrate(list, btn);
    st.trips.push(...list); st.undo.push(list.map(t => t.id)); if (st.undo.length > 30) st.undo.shift();
    save(); const msg = fin(); renderAll();
    if (window.VelOrNative) window.VelOrNative.onTripsAdded(list);
    if (navigator.vibrate) try { navigator.vibrate(30); } catch (e) { /* ignoré */ }
    return msg;
  }
  const mkTrip = (o) => ({ id: uid(), k: o.k || key(today), km: o.km, min: o.min, fav: o.fav || null, name: o.name, tram: o.tram, dur: o.dur, dist: o.dist });
  function quickAdd(favId, btn) {
    refreshToday();
    const f = st.favs.find(x => x.id === favId); if (!f) return;
    const t = mkTrip({ km: f.km, min: f.min, fav: f.id, name: f.name, tram: f.tram, dur: 'favori', dist: 'favori' });
    const msg = addTrips([t], btn);
    toast(msg + '<button class="tbtn" id="t-back">+ le retour</button>', 4000);
    const back = $('t-back');
    if (back) back.onclick = () => { $('toast').classList.remove('show'); toast(addTrips([{ ...t, id: uid() }], btn)); };
  }
  $('undo').addEventListener('click', () => {
    const ids = st.undo.pop(); if (!ids) return;
    st.trips = st.trips.filter(t => !ids.includes(t.id));
    save(); toast('<span>Dernier ajout annulé</span>'); renderAll();
  });

  // ---------- Chrono ----------
  let chronoT = null;
  const fmtClock = ms => { const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s % 60).padStart(2, '0'); };
  function tickChrono() {
    clearInterval(chronoT);
    if (!st.chrono) return;
    const up = () => { $('chrono-time').textContent = fmtClock(Date.now() - st.chrono); };
    up(); chronoT = setInterval(up, 1000);
  }
  $('chrono-start').onclick = () => { st.chrono = Date.now(); save(); renderHome(); toast('<span>Chrono lancé. Bonne route !</span>'); };
  $('chrono-cancel').onclick = () => { st.chrono = null; save(); renderHome(); };
  $('chrono-stop').onclick = () => {
    const min = Math.max(1, Math.round((Date.now() - st.chrono) / 60000));
    st.chrono = null; save(); renderHome();
    openTripSheet({ min, dur: 'chrono' });
  };

  // ---------- Feuilles (ajout de trajet, favori, carte) ----------
  let sheetBack = null;
  function openSheet(html) {
    $('sheet').innerHTML = html; $('sheet').hidden = false; $('sheet-bg').hidden = false;
    const f = $('sheet').querySelector('input:not([type=checkbox])'); if (f && !('ontouchstart' in window)) setTimeout(() => f.focus(), 50);
  }
  function closeSheet() { $('sheet').hidden = true; $('sheet-bg').hidden = true; $('sheet').innerHTML = ''; if (map) { map.remove(); map = null; } }
  $('sheet-bg').onclick = closeSheet;
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('sheet').hidden) closeSheet(); });
  const num = v => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : NaN; };
  const toggle = (id, label, on, sub) => `<label class="tog"><span><b>${label}</b>${sub ? `<span>${sub}</span>` : ''}</span><input type="checkbox" id="${id}" ${on ? 'checked' : ''}><i></i></label>`;

  // Ajout d'un trajet : favori ou « Autre »
  function openTripSheet(o) {
    const k = o.k || key(today);
    const [y, m, dd] = k.split('-').map(Number), d = new Date(y, m - 1, dd, 12);
    const dayTxt = k === key(today) ? "Aujourd'hui" : d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    const s = { fav: o.fav === undefined ? (o.dur === 'chrono' ? st.favs[0]?.id : null) : o.fav, km: o.km, min: o.min, dur: o.dur || null, dist: o.dist || null, rt: false };
    const draw = () => {
      const f = st.favs.find(x => x.id === s.fav);
      const km = s.km ?? (f ? f.km : ''), min = s.min ?? (f ? f.min : '');
      const tram = s.tram ?? (f ? f.tram : true);
      openSheet(`<div class="sh-h"><div><b>Ajouter un trajet</b><span>${dayTxt}</span></div><button class="x" id="sh-close" aria-label="Fermer">✕</button></div>
        <div class="pick">${st.favs.map(x => `<button class="pk" data-f="${esc(x.id)}" aria-pressed="${s.fav === x.id}">${esc(x.name)}</button>`).join('')}<button class="pk" data-f="" aria-pressed="${!s.fav}">Autre</button></div>
        ${!f ? `<div class="field"><label for="sh-name">Nom du trajet</label><input id="sh-name" maxlength="30" placeholder="Ex. : chez Léa, piscine…" value="${esc(s.name || '')}"></div>` : ''}
        <div class="two">
          <div class="field"><label for="sh-km">Distance (km)</label><input id="sh-km" inputmode="decimal" value="${km === '' ? '' : String(km).replace('.', ',')}" placeholder="ex. 4,5">${!f ? '<button type="button" class="link" id="sh-map">Tracer sur la carte</button>' : (s.dist === 'carte' ? '<span class="hint">Mesurée sur la carte</span>' : '')}</div>
          <div class="field"><label for="sh-min">Durée (min)</label><input id="sh-min" inputmode="numeric" value="${min}" placeholder="ex. 18"><span class="hint">${s.dur === 'chrono' ? 'Mesurée au chrono' : 'Modifiable si besoin'}</span></div>
        </div>
        ${toggle('sh-tram', 'Remplace un ticket de tram', tram, "Sinon le trajet compte pour la santé et le CO₂, pas pour l'argent")}
        ${toggle('sh-rt', 'Aller-retour', s.rt, 'Ajoute deux trajets identiques')}
        ${!f ? toggle('sh-save', 'Garder dans mes favoris', false, '') : ''}
        <p class="err" id="sh-err" hidden></p>
        <button class="btn primary wide" id="sh-ok">Ajouter</button>`);
      const keep = () => { s.km = $('sh-km').value === '' ? undefined : num($('sh-km').value); s.min = $('sh-min').value === '' ? undefined : num($('sh-min').value); s.tram = $('sh-tram').checked; s.rt = $('sh-rt').checked; if ($('sh-name')) s.name = $('sh-name').value; };
      $('sh-close').onclick = closeSheet;
      $('sheet').querySelectorAll('[data-f]').forEach(b => b.onclick = () => {
        keep(); s.fav = b.dataset.f || null; s.km = undefined; s.tram = undefined; s.dist = null; if (s.dur !== 'chrono') s.min = undefined; draw();
      });
      $('sh-km').oninput = () => { s.dist = 'saisie'; };
      $('sh-min').oninput = () => { if (s.dur !== 'chrono') s.dur = 'manuel'; };
      if ($('sh-map')) $('sh-map').onclick = () => { keep(); openMap(km2 => { s.km = km2; s.dist = 'carte'; draw(); }, draw); };
      $('sh-ok').onclick = () => {
        keep();
        const kmV = s.km, minV = s.min, err = $('sh-err');
        if (!(kmV > 0 && kmV <= 300)) { err.textContent = kmV > 300 ? 'Distance trop grande : 300 km maximum par trajet.' : 'Indiquez une distance en kilomètres (par exemple 4,5).'; err.hidden = false; return; }
        if (!(minV > 0 && minV <= 600)) { err.textContent = 'Indiquez une durée en minutes (par exemple 18).'; err.hidden = false; return; }
        let fav = f, name = f ? f.name : (s.name || '').trim() || 'Trajet';
        if (!f && $('sh-save') && $('sh-save').checked) { fav = { id: uid(), name, km: Math.round(kmV * 10) / 10, min: Math.round(minV), tram: s.tram }; st.favs.push(fav); }
        const dur = s.dur || (f && minV === f.min ? 'favori' : 'manuel');
        const dist = s.dist || (f && kmV === f.km ? 'favori' : 'saisie');
        const base = { k, km: Math.round(kmV * 10) / 10, min: Math.round(minV), fav: fav ? fav.id : null, name, tram: s.tram, dur, dist };
        const list = [mkTrip(base)]; if (s.rt) list.push(mkTrip(base));
        closeSheet();
        toast(addTrips(list, $('fav-chips')));
      };
    };
    draw();
  }

  // Favori : création et modification
  function openFavSheet(id) {
    const f = st.favs.find(x => x.id === id);
    const s = f ? { ...f } : { id: uid(), name: '', km: undefined, min: undefined, tram: true };
    const draw = () => {
      openSheet(`<div class="sh-h"><div><b>${f ? 'Modifier le trajet' : 'Nouveau trajet favori'}</b><span>Ces valeurs servent à chaque ajout en un geste</span></div><button class="x" id="sh-close" aria-label="Fermer">✕</button></div>
        <div class="field"><label for="fv-name">Nom</label><input id="fv-name" maxlength="30" placeholder="Ex. : Boulot, Sport, Courses" value="${esc(s.name)}"></div>
        <div class="two">
          <div class="field"><label for="fv-km">Distance (km)</label><input id="fv-km" inputmode="decimal" value="${s.km === undefined ? '' : String(s.km).replace('.', ',')}"><button type="button" class="link" id="fv-map">Tracer sur la carte</button></div>
          <div class="field"><label for="fv-min">Durée (min)</label><input id="fv-min" inputmode="numeric" value="${s.min ?? ''}"><span class="hint">Astuce : chronométrez-le une fois</span></div>
        </div>
        ${toggle('fv-tram', 'Remplace un ticket de tram', s.tram, 'Décochez pour le sport ou une balade')}
        <p class="err" id="sh-err" hidden></p>
        <button class="btn primary wide" id="fv-ok">Enregistrer</button>
        ${f && st.favs.length > 1 ? '<button class="link danger" id="fv-del" style="margin:auto">Supprimer ce favori</button>' : ''}`);
      const keep = () => { s.name = $('fv-name').value; s.km = num($('fv-km').value); s.min = num($('fv-min').value); s.tram = $('fv-tram').checked; };
      $('sh-close').onclick = closeSheet;
      $('fv-map').onclick = () => { keep(); openMap(km => { s.km = km; draw(); }, draw); };
      $('fv-ok').onclick = () => {
        keep(); const err = $('sh-err');
        if (!s.name.trim()) { err.textContent = 'Donnez un nom à ce trajet.'; err.hidden = false; return; }
        if (!(s.km > 0 && s.km <= 300)) { err.textContent = 'Indiquez une distance en kilomètres.'; err.hidden = false; return; }
        if (!(s.min > 0 && s.min <= 600)) { err.textContent = 'Indiquez une durée en minutes.'; err.hidden = false; return; }
        const v = { id: s.id, name: s.name.trim().slice(0, 30), km: Math.round(s.km * 10) / 10, min: Math.round(s.min), tram: s.tram };
        if (f) Object.assign(f, v); else st.favs.push(v);
        save(); closeSheet(); renderAll(); toast(`<span>Trajet <b>${esc(v.name)}</b> enregistré</span>`);
      };
      if ($('fv-del')) $('fv-del').onclick = () => { st.favs = st.favs.filter(x => x.id !== f.id); save(); closeSheet(); renderAll(); toast('<span>Favori supprimé. Les trajets déjà faits sont gardés.</span>'); };
    };
    draw();
  }
  $('fav-add').onclick = () => openFavSheet(null);

  // Carte : départ et arrivée, distance ≈ vol d'oiseau × 1,3
  let map = null;
  function haversine(a, b) {
    const R = 6371, r = x => x * Math.PI / 180, dLa = r(b.lat - a.lat), dLo = r(b.lng - a.lng);
    const h = Math.sin(dLa / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLo / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function openMap(onUse, onBack) {
    if (!window.L) {
      openSheet(`<div class="sh-h"><div><b>Carte indisponible</b><span>Vérifiez votre connexion internet</span></div></div><p>Vous pouvez saisir la distance à la main.</p><button class="btn ghost wide" id="mp-back">Retour</button>`);
      $('mp-back').onclick = onBack; return;
    }
    openSheet(`<div class="sh-h"><div><b>Tracer le trajet</b><span id="mp-step">Touchez le point de départ</span></div><button class="x" id="mp-x" aria-label="Retour">✕</button></div>
      <div class="map" id="map"></div>
      <div class="mp-bar"><button class="link" id="mp-me">Ma position</button><button class="link" id="mp-reset">Recommencer</button></div>
      <p class="mp-res num" id="mp-res">Distance : —</p>
      <p class="hint">Distance à vol d'oiseau × 1,3 pour tenir compte des rues : une bonne estimation en ville.</p>
      <button class="btn primary wide" id="mp-ok" disabled>Utiliser cette distance</button>`);
    map = L.map('map', { zoomControl: true, attributionControl: true }).setView(st.mapCenter || [46.6, 2.4], st.mapCenter ? 13 : 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
    const pts = [], marks = []; let line = null, km = 0;
    const update = () => {
      $('mp-step').textContent = pts.length === 0 ? 'Touchez le point de départ' : pts.length === 1 ? "Touchez le point d'arrivée" : 'Départ et arrivée placés';
      if (pts.length === 2) {
        km = Math.round(haversine(pts[0], pts[1]) * DETOUR * 10) / 10;
        $('mp-res').textContent = 'Distance : ≈ ' + fmtKm(km); $('mp-ok').disabled = !(km > 0);
      } else { $('mp-res').textContent = 'Distance : —'; $('mp-ok').disabled = true; }
    };
    map.on('click', e => {
      if (pts.length >= 2) return;
      pts.push(e.latlng);
      marks.push(L.circleMarker(e.latlng, { radius: 9, color: '#fff', weight: 3, fillColor: pts.length === 1 ? '#14A37F' : '#FF5A5F', fillOpacity: 1 }).addTo(map));
      if (pts.length === 2) line = L.polyline(pts, { color: getComputedStyle(document.documentElement).getPropertyValue('--rail').trim() || '#213BCA', weight: 4, dashArray: '6 8' }).addTo(map);
      update();
    });
    $('mp-reset').onclick = () => { pts.length = 0; marks.forEach(m => m.remove()); marks.length = 0; if (line) line.remove(); line = null; update(); };
    $('mp-me').onclick = () => {
      if (!navigator.geolocation) { toast("<span>Position indisponible sur cet appareil</span>"); return; }
      navigator.geolocation.getCurrentPosition(p => map.setView([p.coords.latitude, p.coords.longitude], 15), () => toast('<span>Position refusée ou indisponible</span>'), { timeout: 8000 });
    };
    $('mp-x').onclick = () => { map.remove(); map = null; onBack(); };
    $('mp-ok').onclick = () => { const c = map.getCenter(); st.mapCenter = [c.lat, c.lng]; save(); map.remove(); map = null; onUse(km); };
    setTimeout(() => map && map.invalidateSize(), 60);
    if (!st.mapCenter && navigator.geolocation) navigator.geolocation.getCurrentPosition(p => map && map.setView([p.coords.latitude, p.coords.longitude], 14), () => {}, { timeout: 8000 });
  }

  // ---------- Stats / impact ----------
  document.querySelectorAll('#pseg button').forEach(b => b.addEventListener('click', () => { period = b.dataset.p; renderStats(); }));
  document.querySelectorAll('#iseg button').forEach(b => b.addEventListener('click', () => { iperiod = b.dataset.ip; renderImpact(); }));

  // ---------- Réglages ----------
  $('p-name').addEventListener('input', e => { st.profile.name = e.target.value.slice(0, 30); save(); renderHome(); $('avatar').textContent = (st.profile.name.trim()[0] || '?').toUpperCase(); });
  $('p-kg').addEventListener('change', e => {
    const v = num(e.target.value);
    st.profile.kg = v >= 30 && v <= 200 ? Math.round(v) : null; save(); renderAll();
    toast(st.profile.kg ? `<span>Poids enregistré : <b>${st.profile.kg} kg</b></span>` : '<span>Poids retiré : les calories seront une fourchette</span>');
  });
  document.querySelectorAll('#s-price .opt').forEach(o => o.addEventListener('click', () => {
    st.price = Number(o.dataset.price); save(); renderAll();
    toast(`<span>Prix de référence : <b>${fmtE(st.price)}</b> par trajet</span>`);
  }));
  const LIMITS = { goalM: [10, 300], goalW: [1, 30] };
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
        if (!d || (typeof d.hist !== 'object' && !Array.isArray(d.trips))) throw new Error('format');
        st = migrate(d); st.onboarded = true;
        save(); applyTheme(); renderAll(); toast('<span>Données importées</span>');
      } catch (err) { toast("<span>Ce fichier n'est pas une sauvegarde VélOr.</span>"); }
      e.target.value = '';
    };
    r.readAsText(f);
  });
  function loadSample() { const s = sample(); st.trips = s.trips; st.mood = s.mood; st.favs = s.favs; st.undo = []; }
  function resetZone() {
    $('reset-zone').innerHTML = '<button class="plain danger" id="reset">Effacer mes trajets</button>';
    $('reset').onclick = () => {
      $('reset-zone').innerHTML = '<div class="confirm"><span>Effacer tous les trajets ?</span><button class="yes" id="r-yes">Effacer</button><button class="no" id="r-no">Garder</button><button class="no" id="r-demo">Charger l\'exemple</button></div>';
      $('r-yes').onclick = () => { st.trips = []; st.mood = {}; st.undo = []; save(); renderAll(); resetZone(); toast('<span>Compteurs remis à zéro</span>'); };
      $('r-demo').onclick = () => { loadSample(); save(); renderAll(); resetZone(); toast("<span>Données d'exemple chargées</span>"); };
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
    const kg = num($('w-kg').value); st.profile.kg = kg >= 30 && kg <= 200 ? Math.round(kg) : null;
    const km = num($('w-km').value), min = num($('w-min').value);
    if (km > 0 && km <= 300) st.favs[0].km = Math.round(km * 10) / 10;
    if (min > 0 && min <= 600) st.favs[0].min = Math.round(min);
    st.price = wPrice; st.onboarded = true;
    if (demo) loadSample();
    save(); $('welcome').hidden = true; renderAll();
    toast(st.profile.name ? `<span>Bienvenue, <b>${esc(st.profile.name)}</b> !</span>` : '<span>Bienvenue sur <b>VélOr</b> !</span>');
  }
  $('welcome-form').addEventListener('submit', e => { e.preventDefault(); finishWelcome(false); });
  $('w-demo').addEventListener('click', () => finishWelcome(true));

  // ---------- Pont vers l'appli native (native.js) ----------
  // native.js ne fait rien dans le navigateur ; dans l'appli iPhone/Android il s'en sert
  // pour importer les sorties vélo d'Apple Santé / Health Connect.
  window.VelOr = {
    state: () => st, save, renderAll, toast, openSheet, closeSheet, toggle, esc, fmtKm, fmtE, key, uid, mkTrip, money,
    addTrips: list => addTrips(list, $('fav-chips'))
  };

  // ---------- Démarrage ----------
  applyTheme();
  if (!st.onboarded) { $('welcome').hidden = false; renderWelcomePrice(); renderWelcomeThemes(); }
  renderAll();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) renderAll(); });

  // Pas de service worker dans l'appli native : les fichiers sont déjà dans l'appli.
  const isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  if (!isNative && 'serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
