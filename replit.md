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
  - Calculation method: `noor-calc-method` setting, default "auto" = omit `method` param so Aladhan auto-selects the regional authority (Umm al-Qura for Saudi, Karachi for PK/IN, Diyanet for TR, ISNA for US). Manual override always wins. Single source: `calcMethodParam()` in `src/lib/settings.ts` — used by api.ts hooks AND azan-scheduler.ts; method is embedded in all query keys & offline cache keys

## Architecture decisions

- No backend: all data fetched from free public APIs, persisted client-side
- Settings persisted in localStorage (`noor-city`, `noor-country`, `noor-lang`)
- Bookmarks + Favorites in localStorage; Download audio in IndexedDB
- Dark "hub" pages (More, Settings, Downloads, etc.) use a dark green gradient; light pages use the cream theme
- Bottom nav has exactly 5 tabs on mobile: Home, Quran, Prayers, Teacher, More (Teacher approved in AI Quran Teacher Phase 1)

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
- 10 translation languages supported: Urdu, English, Sindhi, Hindi, Turkish, Bengali, Indonesian, French, Spanish, Malay
- Remove buttons must always be visible on mobile (no hover-only opacity)

## Gotchas

- Do not run `pnpm dev` at workspace root — use `restart_workflow` or the workflow system
- Sindhi edition is `sd.amroti` — do NOT use `sd.mewati` (that returns raw Arabic Quran text)
- Audio downloads use IndexedDB; text uses localStorage keys prefixed `noor-dl-text-{packId}`
- The `getLang()` / `getCity()` functions in `src/lib/settings.ts` are the single source of truth for user preferences
- Ayah card text zoom (`noor-ayah-scale`) and show/hide explanatory-words (`noor-show-explanatory`) settings live in `src/lib/ayah-display.ts` — a pub/sub store shared by Surah and Juz readers via `useAyahDisplaySettings()`. `stripExplanatory()`/`applyExplanatorySetting()` are display-layer only — never call them on data that feeds TTS audio or gets saved to bookmarks/favorites
- Shared `<AyahActionsMenu>` (`src/components/ayah-actions-menu.tsx`) renders the three-dot "More" menu (Share, Copy, Zoom, Show/Hide explanatory words) used identically in both readers — extend it there rather than duplicating menu logic per page

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
