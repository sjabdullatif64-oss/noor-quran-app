# Noor Quran

A full-featured Islamic mobile web app for reading the Holy Quran with Urdu & English translations, audio playback, prayer times, Qibla direction, Tasbeeh counter, bookmarks, favorites, Islamic Gifts, and offline downloads.

## Run & Operate

- `pnpm --filter @workspace/islamic-app run dev` — run the app (port managed by workflow)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- React + Vite + Wouter (client-only, no backend)
- Tailwind CSS + shadcn/ui component library
- TanStack Query for data fetching & caching
- next-themes for dark/light mode

## Where things live

- `artifacts/islamic-app/src/pages/` — all screen components
- `artifacts/islamic-app/src/lib/` — shared utilities: api.ts, bookmarks.ts, favorites.ts, settings.ts, downloads.ts
- `artifacts/islamic-app/src/components/layout.tsx` — app shell, sidebar, bottom nav

## APIs used

- AlQuran Cloud `api.alquran.cloud/v1/surah/{n}` — Quran text (Arabic + translations)
  - Urdu: `ur.jalandhry`, English: `en.sahih`
- Audio CDN: `cdn.islamic.network/quran/audio/128/ar.alafasy/{globalNum}.mp3`
- Aladhan `api.aladhan.com/v1/timingsByCity` — prayer times

## Architecture decisions

- No backend: all data fetched from free public APIs, persisted client-side
- Settings persisted in localStorage (`noor-city`, `noor-country`, `noor-lang`)
- Bookmarks + Favorites in localStorage; Download audio in IndexedDB
- Dark "hub" pages (More, Settings, Downloads, etc.) use a dark green gradient; light pages use the cream theme
- Bottom nav has exactly 4 tabs on mobile: Home, Quran, Prayers, More

## Product

- Quran reader with Arabic text, Urdu/English translation switch, audio playback per ayah
- Prayer times for any city with preset city quick-tabs
- Offline downloads: surah text + audio stored in IndexedDB with real progress
- Islamic Gifts: shareable/downloadable greeting cards using Canvas API
- Tasbeeh counter, Qibla compass, Bookmarks, Favorites
- Settings: dark mode, default translation language, default city

## User preferences

- App name: **Noor Quran** — use this everywhere, no abbreviation to just "Noor"
- Package name: `com.sj64noorquran`
- Islamic green theme (`#1a5c38` primary) — keep throughout
- Sindhi translation removed permanently — only Urdu and English
- Remove buttons must always be visible on mobile (no hover-only opacity)

## Gotchas

- Do not run `pnpm dev` at workspace root — use `restart_workflow` or the workflow system
- Sindhi (`ur.sahih`?) was removed — do not re-add it
- Audio downloads use IndexedDB; text uses localStorage keys prefixed `noor-dl-text-{packId}`
- The `getLang()` / `getCity()` functions in `src/lib/settings.ts` are the single source of truth for user preferences

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
