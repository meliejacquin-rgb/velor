# VélOr

VélOr compte l'argent que vous économisez en prenant le vélo au lieu du tram, et le transforme en jeu : niveaux, séries de jours, badges et objectifs. L'appli suit aussi votre activité physique et le CO₂ évité.

C'est une application web installable (PWA) : elle s'ouvre dans le navigateur, s'ajoute à l'écran d'accueil du téléphone comme une vraie appli et fonctionne hors connexion. Les données restent sur le téléphone.

## Fonctionnalités

- **Accueil** : accueil avec votre prénom, économies du mois et barre d'objectif, montants du jour, de la semaine et depuis le début.
- **Ajout de trajets** : vos trajets favoris (Boulot, Courses, Sport…) s'ajoutent en un geste, avec « + le retour ». Un trajet « Autre » se mesure en traçant départ et arrivée sur une carte, ou en saisissant les km. Le chrono (Démarrer / Je suis arrivé) mesure la durée réelle. Chaque trajet indique s'il remplace un ticket de tram : seuls ceux-là comptent dans les économies, tous comptent pour la santé et le CO₂. Toucher un jour de la semaine affiche ses trajets pour en supprimer ou en ajouter.
- **Stats** : semaine, mois, année ou tout, avec graphique, comparaison avec la période précédente et carnets non achetés.
- **Impact** : minutes d'activité par rapport aux 150 min/semaine de l'OMS, calories, distance, ressenti après le trajet, CO₂ évité par rapport à la voiture, au bus et au tram. Un encadré « Fiabilité des chiffres » indique d'où viennent les données.
- **Défis** : niveaux et XP, série de jours (les week-ends ne la cassent pas), objectifs mensuel et hebdomadaire, 12 badges.
- **Réglages** : prénom, poids (facultatif), trajets favoris, 6 thèmes de couleurs avec leur logo plus une couleur personnalisée, mode clair, sombre ou automatique, prix de référence (ticket 1,90 € ou carnet de 10 à 17 €), objectifs, export et import des données.

## Tarifs et estimations

| Donnée | Valeur utilisée |
|---|---|
| Ticket de tram (aller) | 1,90 € |
| Carnet de 10 tickets | 17 €, soit 1,70 € le trajet |
| CO₂ par km et par passager | voiture ≈ 218 g, bus ≈ 113 g, tram ≈ 4,3 g, vélo 0 g (ordres de grandeur ADEME) |
| Calories | 6,8 MET × poids × durée réelle du trajet (vélo à allure modérée). Sans poids : fourchette pour 55 à 85 kg, affichée avec « ≈ » |
| Distance tracée sur la carte | vol d'oiseau × 1,3 pour tenir compte des rues |
| Essence | 6,5 L aux 100 km |

## Appli iPhone et Android

VélOr existe aussi en appli native (Capacitor) qui se relie à **Apple Santé** et **Health Connect** : les sorties vélo enregistrées par une montre ou Strava sont détectées et proposées comme trajets. Tout est expliqué dans [NATIF.md](NATIF.md).

## Lancer en local

Aucune dépendance. Depuis le dossier du projet :

```sh
python3 -m http.server 8000
```

puis ouvrir http://localhost:8000.

## Mettre en ligne avec GitHub Pages

1. Dans le dépôt GitHub : **Settings → Pages**.
2. Source : **Deploy from a branch**, branche `main`, dossier `/ (root)`.
3. L'appli est en ligne quelques minutes plus tard sur `https://<compte>.github.io/velor/`.

Pour l'installer sur un téléphone : ouvrir ce lien, puis « Partager → Sur l'écran d'accueil » sur iPhone, ou « Installer l'application » dans le menu de Chrome sur Android.

## Structure

```
index.html            écrans de l'appli
styles.css            styles et couleurs
app.js                logique (calculs, gamification, thèmes, stockage local)
native.js             Apple Santé / Health Connect (appli native seulement)
sw.js                 service worker (fonctionnement hors connexion)
manifest.webmanifest  nom, icônes et couleurs pour l'installation
icons/                icônes de l'appli
brand/                planche des thèmes et logo
```
