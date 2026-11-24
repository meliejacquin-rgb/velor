/* VélOr — import des sorties vélo depuis Apple Santé ou Health Connect.
 *
 * Partagé par :
 *   - la version web sur iPhone : un Raccourci Apple (appli Raccourcis, gratuite) copie les
 *     distances à vélo d'Apple Santé ; VélOr les lit dans le presse-papiers et les regroupe
 *     en trajets ;
 *   - l'appli Android (native.js), qui lit Health Connect directement.
 * Dans les deux cas, l'utilisateur vérifie chaque trajet avant de l'ajouter.
 */
(function () {
  'use strict';
  const V = window.VelOr;
  if (!V) return;
  const $ = id => document.getElementById(id);
  const GAP_MIN = 10; // plus de 10 min sans pédaler = un nouveau trajet

  // ---------- Proposition de trajet ----------
  // Rapproche une sortie d'un favori de distance proche et repère un éventuel doublon.
  function suggest({ id, km, min, date, src }) {
    const st = V.state();
    km = Math.round(km * 10) / 10;
    const k = V.key(date);
    const fav = st.favs
      .map(f => ({ f, gap: Math.abs(f.km - km) / f.km }))
      .filter(x => x.gap <= 0.2)
      .sort((a, b) => a.gap - b.gap)[0];
    return {
      id, km, min: Math.max(1, Math.round(min)), k, date, src,
      fav: fav ? fav.f.id : null,
      name: fav ? fav.f.name : 'Sortie vélo',
      tram: fav ? fav.f.tram : km <= 15, // une longue balade ne remplace pas un ticket
      dup: st.trips.some(t => t.k === k && Math.abs(t.km - km) <= Math.max(0.5, km * 0.2))
    };
  }

  // ---------- Feuille de vérification ----------
  // `pending` est modifié sur place (les trajets ajoutés ou ignorés en sont retirés).
  function review(pending, { name, remember, after }) {
    const draw = () => {
      if (!pending.length) { V.closeSheet(); after && after(); return; }
      const rows = pending.map((p, i) => {
        const day = p.date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
        const hour = p.date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        return `<div class="hc-row">
          <div class="hc-row-h"><div><b>${V.esc(p.name)} · ${day} ${hour}</b><span class="num">${V.fmtKm(p.km)} · ${p.min} min · ${V.esc(p.src)}</span>${p.dup ? '<span class="hc-dup">Un trajet semblable est déjà noté ce jour-là</span>' : ''}</div><button class="link" data-skip="${i}">Ignorer</button></div>
          ${V.toggle('hc-t' + i, 'Remplace un ticket de tram', p.tram, '')}
        </div>`;
      }).join('');
      V.openSheet(`<div class="sh-h"><div><b>Sorties vélo détectées</b><span>Trouvées dans ${V.esc(name)}</span></div><button class="x" id="sh-close" aria-label="Fermer">✕</button></div>
        <p class="note" style="text-align:left;margin:0 0 6px">Vérifiez ces trajets. Seuls ceux qui remplacent un ticket de tram comptent dans vos économies ; tous comptent pour la santé et le CO₂.</p>
        <div class="hc-list">${rows}</div>
        <button class="btn primary wide" id="hc-add">Ajouter ${pending.length > 1 ? 'les ' + pending.length + ' trajets' : 'le trajet'}</button>
        <button class="plain" id="hc-none" style="width:100%;margin-top:8px">Tout ignorer</button>`);
      const keep = () => pending.forEach((p, i) => { const c = $('hc-t' + i); if (c) p.tram = c.checked; });
      $('sh-close').onclick = () => { keep(); V.closeSheet(); after && after(); };
      $('sheet').querySelectorAll('[data-skip]').forEach(b => b.onclick = () => {
        keep(); const [p] = pending.splice(Number(b.dataset.skip), 1); remember([p.id]); draw();
      });
      $('hc-none').onclick = () => { remember(pending.map(p => p.id)); pending.length = 0; V.closeSheet(); after && after(); };
      $('hc-add').onclick = () => {
        keep();
        const list = pending.map(p => Object.assign(V.mkTrip({ k: p.k, km: p.km, min: p.min, fav: p.fav, name: p.name, tram: p.tram, dur: 'sante', dist: 'sante' }), { hid: p.id }));
        remember(pending.map(p => p.id)); pending.length = 0;
        V.closeSheet(); after && after();
        V.toast(V.addTrips(list));
      };
    };
    draw();
  }

  // ---------- Lecture du texte copié par le Raccourci ----------
  // Une ligne par échantillon « Distance à vélo » : début | fin | valeur | unité
  // (séparateurs acceptés : | ; ou tabulation). Les dates sont au format ISO 8601.
  function parse(text) {
    const samples = [];
    String(text || '').split(/\r?\n/).forEach(line => {
      const parts = line.split(/\s*[|;\t]\s*/).map(s => s.trim()).filter(Boolean);
      if (parts.length < 3) return;
      const a = Date.parse(parts[0]), b = Date.parse(parts[1]);
      const v = parseFloat(parts[2].replace(/\s/g, '').replace(',', '.'));
      if (!isFinite(a) || !isFinite(b) || !isFinite(v) || v <= 0) return;
      const u = (parts[3] || parts[2].replace(/[\d.,\s]/g, '') || 'km').toLowerCase();
      const km = /^mi/.test(u) ? v * 1.609344 : /^(m|mètres?|metres?)$/.test(u) ? v / 1000 : v;
      samples.push({ a, b: Math.max(a, b), km });
    });
    return samples;
  }

  // Regroupe les échantillons (une Apple Watch en écrit un toutes les quelques secondes) en trajets.
  function group(samples) {
    samples.sort((x, y) => x.a - y.a);
    const trips = [];
    let cur = null;
    for (const s of samples) {
      if (cur && s.a - cur.b <= GAP_MIN * 6e4) { cur.b = Math.max(cur.b, s.b); cur.km += s.km; }
      else { cur = { a: s.a, b: s.b, km: s.km }; trips.push(cur); }
    }
    return trips
      .filter(t => t.km >= 0.5 && t.b - t.a >= 3 * 6e4)
      .map(t => ({ id: 'raccourci:' + new Date(t.a).toISOString().slice(0, 16), km: t.km, min: (t.b - t.a) / 6e4, date: new Date(t.a), src: 'Apple Santé' }));
  }

  // ---------- Version web sur iPhone : import via Raccourcis ----------
  const native = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  const apple = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
  const CFG_KEY = 'velor-raccourci-v1';
  const cfg = Object.assign({ used: false, seen: [] }, (() => { try { return JSON.parse(localStorage.getItem(CFG_KEY)) || {}; } catch (e) { return {}; } })());
  const store = () => { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) { /* ignoré */ } };
  const remember = ids => { cfg.seen = cfg.seen.concat(ids).slice(-500); store(); };

  function importText(text) {
    const st = V.state();
    const known = new Set(st.trips.map(t => t.hid).filter(Boolean).concat(cfg.seen));
    const samples = parse(text);
    if (!samples.length) { openPaste("Le texte copié ne ressemble pas à ce que donne le Raccourci VélOr. Lancez le Raccourci, puis réessayez, ou collez le texte ci-dessous."); return; }
    cfg.used = true; store(); renderEntry();
    const pending = group(samples).filter(x => !known.has(x.id)).map(suggest);
    if (!pending.length) { V.toast('<span>Aucune nouvelle sortie vélo à importer.</span>'); return; }
    review(pending, { name: 'Apple Santé', remember });
  }

  async function fromClipboard() {
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) throw new Error('indisponible');
      importText(await navigator.clipboard.readText());
    } catch (e) {
      openPaste('');
    }
  }

  // Si la lecture du presse-papiers est refusée : coller à la main.
  function openPaste(msg) {
    V.openSheet(`<div class="sh-h"><div><b>Importer depuis Santé</b><span>Texte copié par le Raccourci VélOr</span></div><button class="x" id="sh-close" aria-label="Fermer">✕</button></div>
      ${msg ? `<p class="err">${V.esc(msg)}</p>` : ''}
      <div class="field"><label for="rc-text">Touchez le champ, puis « Coller »</label><textarea id="rc-text" rows="4" style="width:100%;font:inherit;border-radius:12px;border:1px solid var(--line);background:var(--surface);color:var(--ink);padding:10px"></textarea></div>
      <button class="btn primary wide" id="rc-ok">Importer</button>
      <button class="link" id="rc-help">Créer le Raccourci VélOr</button>`);
    $('sh-close').onclick = V.closeSheet;
    $('rc-ok').onclick = () => { const t = $('rc-text').value; V.closeSheet(); importText(t); };
    $('rc-help').onclick = openHelp;
  }

  const step = (n, html) => `<li><b>${n}.</b> ${html}</li>`;
  function openHelp() {
    V.openSheet(`<div class="sh-h"><div><b>Créer le Raccourci VélOr</b><span>Une seule fois, environ 5 minutes</span></div><button class="x" id="sh-close" aria-label="Fermer">✕</button></div>
      <p class="note" style="text-align:left;margin:0">Le Raccourci copie les distances à vélo enregistrées par votre Apple Watch dans Santé. VélOr les transforme en trajets. Tout reste sur votre iPhone.</p>
      <ol class="rc-steps">
        ${step(1, "Ouvrez l'appli <b>Raccourcis</b>, touchez <b>+</b> et nommez le raccourci <b>VélOr</b>.")}
        ${step(2, "Ajoutez l'action <b>Rechercher des échantillons de santé</b> (tapez « échantillons » dans la recherche). Réglez : <b>Type</b> est <b>Distance à vélo</b> ; ajoutez le filtre <b>Date de début</b> est dans les <b>7 derniers jours</b> ; <b>Limite</b> désactivée.")}
        ${step(3, "Ajoutez l'action <b>Répéter avec chaque</b> (elle se branche sur les échantillons trouvés).")}
        ${step(4, "Dans la boucle, ajoutez l'action <b>Texte</b> et composez :<br><code>Date de début | Date de fin | Valeur | Unité</code><br>Pour chaque élément, touchez <b>Variables</b> → <b>Élément de répétition</b>, puis choisissez la propriété. Pour les deux dates, touchez-les et choisissez le format <b>ISO 8601</b>. Les traits <code>|</code> se tapent entre les éléments.")}
        ${step(5, "Après la boucle, ajoutez <b>Combiner le texte</b> (Résultats de répétition, avec <b>Nouvelle ligne</b>), puis <b>Copier dans le presse-papiers</b>.")}
        ${step(6, "Lancez le raccourci (autorisez l'accès à Santé la première fois), ouvrez VélOr et touchez <b>Importer depuis Santé</b>.")}
      </ol>
      <p class="note" style="text-align:left;margin:0"><b>Bonus automatique</b> : dans Raccourcis, onglet <b>Automatisation</b> → <b>Heure de la journée</b> (par ex. 20 h) → <b>Exécuter immédiatement</b> → raccourci VélOr. Ajoutez en dernière action <b>Afficher une notification</b> « Trajets prêts, ouvrez VélOr » pour y penser.</p>
      <p class="note" style="text-align:left;margin:0">Un jour sans montre ? Touchez simplement votre trajet favori sur l'accueil, avec « + le retour ».</p>
      <button class="btn primary wide" id="rc-done">J'ai compris</button>`);
    $('sh-close').onclick = V.closeSheet;
    $('rc-done').onclick = V.closeSheet;
  }

  // Boutons : dans les Réglages (iPhone, iPad, Mac) et sur l'accueil une fois le Raccourci utilisé.
  function renderEntry() {
    if (native || !(apple || cfg.used)) return;
    let box = $('rc-settings');
    if (!box) {
      box = document.createElement('div'); box.id = 'rc-settings'; box.style.display = 'contents';
      $('export').closest('.actions').previousElementSibling.insertAdjacentElement('beforebegin', box);
      box.innerHTML = `<div class="section-h"><h3>Apple Santé</h3></div>
        <div class="setting"><div class="t"><b>Importer mes sorties vélo</b><span>Les trajets enregistrés par votre Apple Watch arrivent dans VélOr grâce à un Raccourci Apple (gratuit).</span></div>
          <button class="plain" id="rc-import">Importer</button></div>
        <button class="link" id="rc-howto" style="align-self:flex-start">Créer le Raccourci VélOr</button>`;
      $('rc-import').onclick = fromClipboard;
      $('rc-howto').onclick = openHelp;
    }
    if (cfg.used && !$('rc-home')) {
      const b = document.createElement('button');
      b.id = 'rc-home'; b.className = 'chip-btn';
      b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7-4.3-8.7-8.6C2 8.1 4 4.8 7.2 4.8c1.9 0 3.3 1 4.8 2.8 1.5-1.8 2.9-2.8 4.8-2.8 3.2 0 5.2 3.3 3.9 6.6C19 15.7 12 20 12 20z"/></svg>Santé';
      b.setAttribute('aria-label', 'Importer depuis Apple Santé');
      b.onclick = fromClipboard;
      const start = $('chrono-start');
      const wrap = document.createElement('div'); wrap.style.cssText = 'display:flex;gap:8px';
      start.replaceWith(wrap); wrap.append(b, start);
    }
  }

  window.VelOrSante = { suggest, review, parse, group, importText };
  renderEntry();
})();
