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
| `BASE_PATH=/guitare-pas-a-pas/ npm run build` | Build pour GitHub Pages (fait automatiquement à chaque push sur `main`) |
| `npm run icons` | Régénère les icônes depuis `public/favicon.svg` |

## Structure

```
src/
  app/        routes, enregistrement PWA, invite d'installation
  components/ barre d'onglets, mise en page, icônes
  pages/      un écran par onglet (Accorder, Apprendre, Morceaux, Progrès)
  db/         schéma IndexedDB (Dexie) : progression, morceaux importés, scores, réglages
  stores/     état Zustand (réglages persistés dans IndexedDB)
  audio/      micro → AudioWorklet (capture) → Web Worker (détection pitchy)
  lib/music/  notes, fréquences, accordages (pur, testé)
  lib/tuner/  détection, lissage, logique de l'accordeur (pur, testé)
  lib/lessons/ déroulé des leçons, jeux, reconnaissance de note, progression (pur, testé)
  lib/synth/  son de référence (Karplus-Strong)
  lib/analysis/ analyse de jeu : nettoyage, alignement DP 2 passes, verdicts, score (pur, testé)
  audio/recorder.ts + transcribe.worker.ts : enregistrement brut, transcription Basic Pitch
              (TensorFlow.js, moteur WebAssembly SIMD) dans un Web Worker
  lib/songs/  partitions : durées des mesures, boucle A–B, tablature calculée, import (pur, testé)
  content/    contenu des leçons (JSON) et morceaux intégrés (alphaTex), validés par les tests
  components/player/ lecteur de tablature alphaTab (chargé à la demande)

## Contenu

Les morceaux intégrés sont uniquement des œuvres du domaine public (airs traditionnels,
classiques) ou des créations originales, transcrits en alphaTex. Aucune tablature protégée
n'est incluse : les morceaux récents s'ajoutent par import de fichiers par l'utilisateur.
e2e/          tests Playwright
```
