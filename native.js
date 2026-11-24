/* VélOr — fonctions de l'appli native (iPhone et Android).
 *
 * Dans le navigateur, ce fichier ne fait rien : la version web reste identique.
 * Dans l'appli installée depuis Xcode / Android Studio (Capacitor), il relie VélOr
 * au carnet santé du téléphone :
 *   - Apple Santé sur iPhone (HealthKit),
 *   - Health Connect sur Android.
 *
 * Ce qu'il fait :
 *   1. Détection automatique : à chaque ouverture, il cherche les nouvelles sorties vélo
 *      enregistrées dans Santé (par une Apple Watch, Strava, Samsung Health, Google Fit…)
 *      et propose de les ajouter comme trajets, sans rien ressaisir.
 *   2. Export : les trajets saisis dans VélOr peuvent être enregistrés dans Santé
 *      comme distance parcourue à vélo.
 */
(function () {
  'use strict';
  const Cap = window.Capacitor;
  if (!Cap || !Cap.isNativePlatform || !Cap.isNativePlatform()) return;
  const V = window.VelOr;
  if (!V) return;

  const Health = Cap.registerPlugin('Health');
  const ios = Cap.getPlatform() === 'ios';
  const NAME = ios ? 'Apple Santé' : 'Health Connect';
  const CFG_KEY = 'velor-native-v1';
  const DAY = 864e5;
  const $ = id => document.getElementById(id);

  // ---------- Réglages propres à l'appli native ----------
  const cfg = Object.assign({ connected: false, autoImport: true, exportTrips: true, seen: [], since: null }, read());
  function read() { try { return JSON.parse(localStorage.getItem(CFG_KEY)) || {}; } catch (e) { return {}; } }
  function store() { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) { /* ignoré */ } }

  let available = null; // null = pas encore vérifié
  let pending = [];      // sorties vélo trouvées, en attente de validation

  const PERMS = { read: ['workouts', 'distanceCycling'], write: ['distanceCycling'] };

  async function connect() {
    try {
      const a = await Health.isAvailable();
      available = !!a.available;
      if (!available) {
        V.toast(ios ? "<span>Apple Santé n'est pas disponible sur cet appareil.</span>" : '<span>Installez « Health Connect » depuis le Play Store, puis réessayez.</span>', 4500);
        if (!ios) try { await Health.openHealthConnectSettings(); } catch (e) { /* ignoré */ }
        renderSettings(); return;
      }
      const res = await Health.requestAuthorization(PERMS);
      // Sur iPhone, Apple ne dit jamais si la lecture est refusée (protection de la vie privée) :
      // on considère la connexion faite et on affiche simplement ce qu'on trouve.
      cfg.connected = ios || (res.readAuthorized || []).includes('workouts');
      if (!cfg.since) cfg.since = new Date(Date.now() - 7 * DAY).toISOString();
      store(); renderSettings();
      if (cfg.connected) { V.toast(`<span>Connecté à <b>${NAME}</b></span>`); await check(true); }
      else V.toast(`<span>Autorisez la lecture des entraînements dans ${NAME} pour importer vos sorties vélo.</span>`, 4500);
    } catch (e) {
      V.toast(`<span>Connexion à ${NAME} impossible.</span>`, 4000);
    }
  }

  // ---------- Détection automatique des sorties vélo ----------
  async function check(manual) {
    if (!cfg.connected) return;
    try {
      // Fenêtre glissante de 30 jours, sans remonter avant la connexion (moins 7 jours).
      const floor = Date.now() - 30 * DAY;
      const startDate = new Date(Math.max(floor, cfg.since ? Date.parse(cfg.since) : floor)).toISOString();
      const { workouts = [] } = await Health.queryWorkouts({ workoutType: 'cycling', startDate, endDate: new Date().toISOString(), limit: 100, ascending: true });
      const st = V.state();
      const known = new Set(st.trips.map(t => t.hid).filter(Boolean).concat(cfg.seen));
      pending = workouts
        .filter(w => (w.totalDistance || 0) >= 500 && w.duration >= 180)
        .map(w => ({ id: w.platformId || (w.startDate + '|' + w.duration), w }))
        .filter(x => !known.has(x.id))
        .map(x => suggest(x));
      renderBanner();
      if (manual && !pending.length) V.toast('<span>Aucune nouvelle sortie vélo trouvée.</span>');
    } catch (e) {
      if (manual) V.toast(`<span>Lecture de ${NAME} impossible.</span>`, 4000);
    }
  }

  // Transforme une sortie Santé en proposition de trajet (voir sante.js).
  function suggest({ id, w }) {
    return window.VelOrSante.suggest({ id, km: w.totalDistance / 1000, min: w.duration / 60, date: new Date(w.startDate), src: w.sourceName || NAME });
  }

  function renderBanner() {
    let b = $('hc-banner');
    if (!pending.length) { if (b) b.remove(); return; }
    if (!b) {
      b = document.createElement('button');
      b.id = 'hc-banner'; b.className = 'hc-banner';
      const top = document.querySelector('#s-home .top');
      top.insertAdjacentElement('afterend', b);
      b.onclick = openReview;
    }
    const n = pending.length;
    b.innerHTML = `<span class="hc-dot" aria-hidden="true"></span><span><b>${n} sortie${n > 1 ? 's' : ''} vélo détectée${n > 1 ? 's' : ''}</b><span>dans ${NAME} · Toucher pour vérifier</span></span><span aria-hidden="true">›</span>`;
  }

  function openReview() {
    window.VelOrSante.review(pending, { name: NAME, remember, after: renderBanner });
  }

  function remember(ids) {
    cfg.seen = cfg.seen.concat(ids).slice(-500);
    store();
  }

  // ---------- Export des trajets VélOr vers Santé ----------
  async function onTripsAdded(list) {
    if (!cfg.connected || !cfg.exportTrips) return;
    const todayK = V.key(new Date());
    for (const t of list) {
      if (t.dur === 'sante') continue; // déjà dans Santé
      // Trajet du jour : il vient de se terminer. Autre jour : placé à midi.
      const end = t.k === todayK ? new Date() : new Date(t.k + 'T12:00:00');
      const start = new Date(end.getTime() - t.min * 6e4);
      try {
        await Health.saveSample({ dataType: 'distanceCycling', value: Math.round(t.km * 1000), unit: 'meter', startDate: start.toISOString(), endDate: end.toISOString(), metadata: { source: 'VélOr', trajet: t.name || 'Trajet' } });
      } catch (e) { /* refusé ou indisponible : VélOr continue sans */ }
    }
  }

  // ---------- Carte « Santé » dans les Réglages ----------
  function renderSettings() {
    let box = $('hc-settings');
    if (!box) {
      box = document.createElement('div'); box.id = 'hc-settings';
      const anchor = $('export').closest('.actions').previousElementSibling; // titre « Mes données »
      anchor.insertAdjacentElement('beforebegin', box);
    }
    const on = cfg.connected;
    box.innerHTML = `<div class="section-h"><h3>${NAME}</h3></div>
      <div class="setting"><div class="t"><b>${on ? 'Connecté' : 'Relier VélOr à ' + NAME}</b><span>${on
        ? 'VélOr repère vos sorties vélo enregistrées par une montre ou une autre appli (Strava…).'
        : 'Pour ajouter automatiquement les sorties vélo de votre montre ou de Strava, sans rien ressaisir.'}</span></div>
        <button class="plain" id="hc-connect">${on ? 'Chercher' : 'Connecter'}</button></div>
      ${on ? V.toggle('hc-auto', 'Détection automatique', cfg.autoImport, "Cherche les nouvelles sorties à chaque ouverture de l'appli") : ''}
      ${on ? V.toggle('hc-export', 'Enregistrer mes trajets dans ' + NAME, cfg.exportTrips, 'Les trajets ajoutés dans VélOr comptent aussi dans ' + NAME) : ''}
      ${on && !ios ? '<button class="link" id="hc-manage">Gérer les autorisations Health Connect</button>' : ''}`;
    $('hc-connect').onclick = () => (on ? check(true) : connect());
    if ($('hc-auto')) $('hc-auto').onchange = e => { cfg.autoImport = e.target.checked; store(); };
    if ($('hc-export')) $('hc-export').onchange = e => { cfg.exportTrips = e.target.checked; store(); };
    if ($('hc-manage')) $('hc-manage').onclick = () => Health.openHealthConnectSettings().catch(() => {});
  }

  window.VelOrNative = { healthName: NAME, onTripsAdded, check };
  document.documentElement.classList.add('native', ios ? 'ios' : 'android');
  renderSettings();
  if (cfg.connected && cfg.autoImport) check(false);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && cfg.connected && cfg.autoImport) check(false); });
})();
