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
- **Strava** : Strava sait déjà envoyer ses activités vers Apple Santé et Health Connect.
  Il suffit d'activer ce partage dans Strava ; VélOr les retrouve ensuite comme les autres.
- Les données ne quittent toujours pas le téléphone (voir `confidentialite.html`).

## Fichiers

```
capacitor.config.json   nom et identifiant de l'appli (io.github.meliejacquin.velor)
native.js               lien avec Apple Santé / Health Connect (ne fait rien dans un navigateur)
scripts/build-web.mjs   prépare le dossier www/ copié dans les applis
android/                projet Android Studio
ios/                    projet Xcode
confidentialite.html    règles de confidentialité (exigées par Apple et Google)
.github/workflows/appli-native.yml   construit l'APK Android et vérifie le projet iPhone
```

## Android

**Sans ordinateur** : à chaque modification, GitHub construit l'appli. Dans le dépôt :
onglet **Actions** → dernière exécution « Appli native » → en bas, **Artifacts** →
`VelOr-android`. Dézipper, envoyer `app-debug.apk` sur le téléphone, l'ouvrir et accepter
l'installation d'applis de source inconnue. Health Connect est intégré à Android 14 et plus ;
sinon l'installer depuis le Play Store.

**Avec Android Studio** : `npm install` puis `npm run android`.

**Play Store** : compte Google Play Console (25 $ une fois), fiche de l'appli, formulaire
« Health Connect » de Google (justifier la lecture des entraînements) et une appli signée
(`./gradlew bundleRelease` avec une clé de signature à créer et à garder précieusement).

## iPhone

Il faut obligatoirement **un Mac avec Xcode** et un **compte Apple Developer payant
(99 €/an)** : Apple n'autorise pas l'accès à Santé avec un compte gratuit.

1. Sur le Mac : `npm install` puis `npm run ios` (ouvre Xcode).
2. Dans Xcode : cible **App** → **Signing & Capabilities** → choisir son équipe (Team).
   La capacité **HealthKit** est déjà déclarée (`ios/App/App/App.entitlements`).
3. Brancher l'iPhone et appuyer sur ▶︎. Pour partager à d'autres : **TestFlight**, puis
   publication sur l'App Store (formulaire de confidentialité « Données de santé »).

## Après une modification du code web

`npm run sync` recopie `index.html`, `app.js`, `styles.css` et `native.js` dans les deux applis.

## Pas encore fait (prochaines étapes possibles)

- **Détection sans montre ni Strava** (le téléphone seul repère quand on pédale) : demande un
  suivi GPS ou du capteur de mouvement en arrière-plan, plus gourmand en batterie et plus
  strict à faire valider par Apple et Google.
- **Connexion directe à Strava** (sans passer par Santé) : demande un petit serveur pour
  garder la clé secrète Strava. Passer par Santé évite ce serveur.
- Écrire un vrai « entraînement vélo » dans Santé (aujourd'hui : la distance seulement).
