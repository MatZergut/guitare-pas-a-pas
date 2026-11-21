# GuitarePasÀPas

PWA d'apprentissage de la guitare (accordeur, leçons, morceaux, analyse de jeu).
Tout le traitement audio se fait sur l'appareil.

## Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de dev sur http://localhost:5173 |
| `npm run dev:phone` | Dev en HTTPS sur le réseau local (pour tester le micro sur le téléphone) |
| `npm run build` / `npm run preview` | Build de production (avec service worker) et prévisualisation |
| `npm run preview:phone` | Build prévisualisé en HTTPS sur le réseau local (test PWA/hors ligne) |
| `npm test` | Tests unitaires (Vitest) |
| `npm run e2e` | Parcours utilisateur (Playwright, profils Pixel 7 et 360 px) |
| `npm run icons` | Régénère les icônes depuis `public/favicon.svg` |

## Structure

```
src/
  app/        routes, enregistrement PWA, invite d'installation
  components/ barre d'onglets, mise en page, icônes
  pages/      un écran par onglet (Accorder, Apprendre, Morceaux, Progrès)
  db/         schéma IndexedDB (Dexie) : progression, morceaux importés, scores, réglages
  stores/     état Zustand (réglages persistés dans IndexedDB)
  lib/        logique audio/musique pure et testée (phases suivantes)
e2e/          tests Playwright
```
