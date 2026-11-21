/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { VitePWA } from 'vite-plugin-pwa'
import { alphaTab } from '@coderline/alphatab-vite'

// `--mode https` : certificat auto-signé pour tester le micro sur le téléphone
// via le réseau local (getUserMedia exige un contexte sécurisé).
// BASE_PATH=/guitare-pas-a-pas/ pour GitHub Pages ; « / » en local.
const base = process.env.BASE_PATH ?? '/'

export default defineConfig(({ mode }) => ({
  base,
  plugins: [
    react(),
    tailwindcss(),
    mode === 'https' && basicSsl(),
    // Copie la police Bravura et les banques de sons, configure workers et worklets d'alphaTab.
    alphaTab(),
    VitePWA({
      registerType: 'prompt', // la mise à jour est proposée, jamais imposée en pleine leçon
      injectRegister: false, // enregistrement fait dans src/app/pwa.ts
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        id: base,
        name: 'GuitarePasÀPas',
        short_name: 'GuitarePasÀPas',
        description: 'Apprendre la guitare pas à pas : accordeur, leçons, morceaux et analyse de jeu.',
        lang: 'fr',
        dir: 'ltr',
        start_url: base,
        scope: base,
        display: 'standalone',
        // « any » : portrait par défaut dans l'UI, mais la tablature doit
        // pouvoir passer en paysage quand on tourne le téléphone.
        orientation: 'any',
        background_color: '#0f1115',
        theme_color: '#0f1115',
        categories: ['education', 'music'],
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Hors ligne : on garde la banque de sons allégée (sf3) et la police woff2, pas les variantes.
        globPatterns: ['**/*.{js,mjs,css,html,svg,png,ico,woff2,json,wasm,sf3}'],
        globIgnores: ['**/font/Bravura.{svg,eot,otf,woff}', '**/soundfont/*.sf2'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
}))
