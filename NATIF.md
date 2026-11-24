# VélOr sur iPhone et Android (appli native)

La version web (GitHub Pages) ne change pas. En plus, le même code est emballé en vraie appli
iPhone et Android grâce à [Capacitor](https://capacitorjs.com), ce qui permet d'accéder à
**Apple Santé** (iPhone) et **Health Connect** (Android).

## Ce que l'appli native ajoute

- **Détection automatique des trajets** : à chaque ouverture, VélOr regarde les sorties vélo
  enregistrées dans Santé (Apple Watch, Strava, Samsung Health, Google Fit…) et affiche
  « 2 sorties vélo détectées ». On vérifie, on indique si le trajet remplace un ticket de tram,
  et c'est ajouté. Chaque sortie est rapprochée d'un trajet favori de distance proche
  (à 20 % près) ; une sortie de plus de 15 km sans favori est considérée comme une balade.
- **Export vers Santé** : les trajets saisis dans VélOr (favori, chrono, carte) sont enregistrés
  comme distance à vélo dans Apple Santé / Health Connect. Désactivable dans les réglages.
- **Strava** : l'appli Strava (gratuite) sait envoyer ses activités vers Apple Santé et Health
  Connect. Il suffit d'activer ce partage dans Strava ; VélOr les retrouve ensuite comme les autres.
- Les données ne quittent toujours pas le téléphone (voir `confidentialite.html`).

## Fichiers

```
capacitor.config.json   nom et identifiant de l'appli (io.github.meliejacquin.velor)
sante.js                import des sorties vélo (Raccourci iPhone et appli Android), vérification
native.js               lien avec Apple Santé / Health Connect (ne fait rien dans un navigateur)
scripts/build-web.mjs   prépare le dossier www/ copié dans les applis
android/                projet Android Studio
ios/                    projet Xcode
confidentialite.html    règles de confidentialité (exigées par Apple et Google)
.github/workflows/appli-native.yml   construit et publie l'APK Android
```

## Gratuit, pour le développement comme pour les utilisateurs

Aucun abonnement, aucun magasin d'applis payant :

| | Coût | Comment |
|---|---|---|
| Version web (iPhone, Android, ordinateur) | 0 € | GitHub Pages, comme avant |
| Appli Android | 0 € | construite par GitHub Actions, téléchargée depuis les « Releases » du dépôt (pas de Play Store, qui coûte 25 $) |
| Health Connect, Apple Santé | 0 € | services intégrés aux téléphones |
| Strava | 0 € pour l'utilisateur | l'appli Strava (gratuite) envoie ses sorties vers Santé / Health Connect ; VélOr les lit là. L'API Strava directe exige désormais un abonnement Strava payant pour le développeur, donc on ne l'utilise pas. |
| Appli iPhone sur l'App Store | ✗ | Apple demande 99 €/an : écarté. Sur iPhone, on garde la version web, avec import Santé par Raccourci. |

## Android

**Installer** : sur le téléphone Android, ouvrir
https://github.com/meliejacquin-rgb/velor/releases/latest/download/VelOr.apk
(aussi proposé dans Réglages de la version web, sur Android), ouvrir le fichier et autoriser
l'installation. Health Connect est intégré à Android 14 et plus ; sinon l'installer
gratuitement depuis le Play Store.

**Mises à jour** : chaque modification fusionnée dans `main` publie une nouvelle version dans
les Releases. Elle s'installe par-dessus l'ancienne sans perdre les trajets, car l'APK est
toujours signé avec la même clé (`android/app/velor-debug.keystore`). Cette clé est publique
(dans le dépôt) : la seule source officielle de l'appli est la page Releases du dépôt.

**Avec Android Studio (facultatif, gratuit)** : `npm install` puis `npm run android`.

## iPhone

Sans compte Apple payant, une appli iPhone ne peut pas être distribuée. Les utilisateurs
d'iPhone utilisent la version web (installable depuis Safari → Partager → Sur l'écran
d'accueil), qui fait tout sauf la lecture d'Apple Santé.

Le projet `ios/` reste dans le dépôt pour plus tard : avec un Mac, Xcode (gratuit) permet
d'installer l'appli sur son propre iPhone, mais elle expire au bout de 7 jours avec un
compte Apple gratuit.

**Import gratuit depuis Apple Santé (version web)** : dans Réglages → Apple Santé, VélOr
explique comment créer un **Raccourci** (appli Raccourcis d'Apple, gratuite) qui copie les
distances à vélo de l'Apple Watch. Le bouton « Importer » (ou « Santé » sur l'accueil) lit
ce texte, regroupe les échantillons en trajets (plus de 10 min de pause = nouveau trajet),
les rapproche des favoris et les propose à vérifier, comme dans l'appli Android
(`sante.js`). Une automatisation Raccourcis peut le lancer chaque soir.

Format attendu, une ligne par échantillon « Distance à vélo » :
`2026-11-24T08:05:00+01:00 | 2026-11-24T08:05:30+01:00 | 0,13 | km`

## Après une modification du code web

`npm run sync` recopie `index.html`, `app.js`, `styles.css` et `native.js` dans les deux applis.

## Pas encore fait (prochaines étapes possibles)

- **Détection sans montre ni Strava** (le téléphone seul repère quand on pédale) : demande un
  suivi GPS ou du capteur de mouvement en arrière-plan, plus gourmand en batterie et plus
  strict à faire valider par Apple et Google.
- **Connexion directe à Strava** : écartée, l'API Strava demande maintenant un abonnement
  payant au développeur. Passer par Santé est gratuit.
- Écrire un vrai « entraînement vélo » dans Santé (aujourd'hui : la distance seulement).
