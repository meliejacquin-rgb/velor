// Prépare le dossier www/ utilisé par les applis iPhone et Android (Capacitor).
// La version web (GitHub Pages) continue d'être servie directement depuis la racine du dépôt.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const out = 'www';
rmSync(out, { recursive: true, force: true });
mkdirSync(out);
for (const f of ['styles.css', 'app.js', 'native.js', 'manifest.webmanifest', 'confidentialite.html']) cpSync(f, `${out}/${f}`);
cpSync('icons', `${out}/icons`, { recursive: true });
// Health Connect affiche cette page quand on touche « Règles de confidentialité ».
cpSync('confidentialite.html', `${out}/privacypolicy.html`);
// Pont JavaScript de Capacitor, chargé seulement dans l'appli native.
cpSync('node_modules/@capacitor/core/dist/capacitor.js', `${out}/capacitor.js`);

const html = readFileSync('index.html', 'utf8');
if (!html.includes('<script src="app.js" defer></script>')) throw new Error('index.html : balise app.js introuvable');
writeFileSync(`${out}/index.html`, html.replace('<script src="app.js" defer></script>', '<script src="capacitor.js"></script>\n<script src="app.js" defer></script>'));
console.log('www/ prêt');
