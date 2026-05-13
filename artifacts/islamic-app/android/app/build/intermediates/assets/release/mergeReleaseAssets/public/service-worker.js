/**
 * Noor Quran — Service Worker
 * Handles scheduled local notifications for prayers, Quran reminders, and dhikr.
 * Checks every 60 seconds and fires notifications when the scheduled time matches.
 */

const QURAN_AYAHS = [
  "In the name of Allah, the Most Gracious, the Most Merciful. [Quran 1:1]",
  "And He is with you wherever you are. [Quran 57:4]",
  "Verily, with hardship comes ease. [Quran 94:5-6]",
  "Allah does not burden a soul beyond that it can bear. [Quran 2:286]",
  "So remember Me; I will remember you. [Quran 2:152]",
  "Whoever relies upon Allah — then He is sufficient for him. [Quran 65:3]",
  "Indeed, Allah is with the patient. [Quran 2:153]",
  "And your Lord is the Forgiving, full of mercy. [Quran 18:58]",
  "Say: He is Allah, the One and Only. [Quran 112:1]",
  "And We have certainly made the Quran easy for remembrance. [Quran 54:17]",
  "Recite what has been revealed to you of the Book. [Quran 29:45]",
  "The greatest verse in the Book of Allah is Ayat al-Kursi. [2:255]",
];

const ISLAMIC_QUOTES = [
  "The best of people are those that bring the most benefit to others. — Prophet ﷺ",
  "Speak good or remain silent. — Prophet Muhammad ﷺ",
  "The strong man controls himself when angry. — Prophet Muhammad ﷺ",
  "Make things easier, do not make things complicated. — Prophet ﷺ",
  "Cleanliness is half of faith. — Prophet Muhammad ﷺ",
  "Feed the hungry, visit the sick, and set free the captives. — Prophet ﷺ",
  "A believer is a mirror to a fellow believer. — Prophet Muhammad ﷺ",
  "None of you believes until he loves for his brother what he loves for himself. — Prophet ﷺ",
];

const MORNING_AZKAR = [
  "🌅 Begin your day: SubhanAllah 33×, Alhamdulillah 33×, Allahu Akbar 34×",
  "🌅 Morning protection: Recite Ayat al-Kursi and the three Quls",
  "🌅 Morning Azkar time — Seek refuge in Allah from the accursed Shaytan",
  "🌅 Say: Bismillahi tawakkaltu 'ala-llahi, la hawla wa la quwwata illa billah",
];

const EVENING_AZKAR = [
  "🌙 Evening Dhikr: SubhanAllah 33×, Alhamdulillah 33×, Allahu Akbar 34×",
  "🌙 Evening protection: Recite Al-Ikhlas, Al-Falaq, and An-Nas 3× each",
  "🌙 Evening Azkar — End your day in the remembrance of Allah",
  "🌙 Say: Astaghfirullah wa atubu ilayh — seek Allah's forgiveness before sleep",
];

let settings = null;
const lastShown = {};
let tickInterval = null;

// ── Lifecycle ──────────────────────────────────────────────────────────────

// ── Cache config ───────────────────────────────────────────────────────────
const CACHE_NAME = "noor-quran-shell-v1";

// App-shell assets to pre-cache on install
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/site.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/favicon-32.png",
];

// External hostnames that should NEVER be intercepted (live data APIs)
const PASSTHROUGH_HOSTS = [
  "api.alquran.cloud",
  "cdn.islamic.network",
  "api.aladhan.com",
  "nominatim.openstreetmap.org",
  "fonts.googleapis.com",
  "fonts.gstatic.com",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(PRECACHE_URLS).catch(() => {
        // Non-fatal: if pre-cache fails the SW still installs
      })
    )
  );
});

self.addEventListener("activate", (event) => {
  // Remove stale caches from older SW versions
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => clients.claim())
      .then(startTicking)
  );
});

// ── Fetch handler (required for PWA installability) ────────────────────────
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle GET requests
  if (req.method !== "GET") return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }

  // Let external API calls go straight to the network
  if (PASSTHROUGH_HOSTS.some((h) => url.hostname === h || url.hostname.endsWith("." + h))) {
    return;
  }

  // Only intercept same-origin requests
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      // Cache-first for same-origin assets
      if (cached) return cached;

      return fetch(req)
        .then((response) => {
          // Only cache successful same-origin responses
          if (response && response.status === 200 && response.type === "basic") {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline fallback: serve index.html for navigation requests
          if (req.mode === "navigate") {
            return caches.match("/index.html") || caches.match("/");
          }
        });
    })
  );
});

self.addEventListener("message", (event) => {
  if (!event.data) return;
  if (event.data.type === "SYNC_SETTINGS") {
    settings = event.data.settings;
    if (event.data.lastShown) Object.assign(lastShown, event.data.lastShown);
    startTicking();
  }
  if (event.data.type === "TEST_NOTIFICATION") {
    self.registration.showNotification("🌙 Noor Quran", {
      body: "Notifications are working! May Allah bless you and your family.",
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      tag: "test",
      vibrate: [200, 100, 200],
      data: { url: "/" },
    });
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        const existing = clientList.find((c) =>
          c.url.includes(self.location.origin)
        );
        if (existing) {
          existing.focus();
          return existing.navigate(targetUrl);
        }
        return clients.openWindow(targetUrl);
      })
  );
});

// ── Tick loop ─────────────────────────────────────────────────────────────

function startTicking() {
  if (tickInterval) clearInterval(tickInterval);
  tickInterval = setInterval(checkNotifications, 60 * 1000);
  checkNotifications(); // immediate check on first run
}

// ── Notification logic ────────────────────────────────────────────────────

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function todayKey(tag) {
  return `${tag}-${new Date().toDateString()}`;
}

function alreadyShownToday(tag) {
  return !!lastShown[todayKey(tag)];
}

function markShown(tag) {
  lastShown[todayKey(tag)] = true;
  // Broadcast back to page so it can persist state
  clients.matchAll({ type: "window" }).then((cls) =>
    cls.forEach((c) => c.postMessage({ type: "LAST_SHOWN", lastShown }))
  );
}

function fire(tag, title, body, url = "/") {
  if (alreadyShownToday(tag)) return;
  markShown(tag);
  return self.registration.showNotification(title, {
    body,
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    tag,
    vibrate: [200, 100, 200],
    requireInteraction: false,
    data: { url },
  });
}

function checkNotifications() {
  if (!settings) return;

  const now = new Date();
  const hh = now.getHours().toString().padStart(2, "0");
  const mm = now.getMinutes().toString().padStart(2, "0");
  const timeNow = `${hh}:${mm}`;
  const isFriday = now.getDay() === 5;

  const checks = [
    {
      key: "quranAyah",
      s: settings.quranAyah,
      title: "📖 Daily Quran Ayah",
      body: rand(QURAN_AYAHS),
      url: "/quran",
    },
    {
      key: "islamicQuote",
      s: settings.islamicQuote,
      title: "✨ Islamic Wisdom",
      body: rand(ISLAMIC_QUOTES),
      url: "/",
    },
    {
      key: "morningAzkar",
      s: settings.morningAzkar,
      title: "🌅 Morning Azkar",
      body: rand(MORNING_AZKAR),
      url: "/",
    },
    {
      key: "eveningAzkar",
      s: settings.eveningAzkar,
      title: "🌙 Evening Azkar",
      body: rand(EVENING_AZKAR),
      url: "/",
    },
    {
      key: "tasbeehReminder",
      s: settings.tasbeehReminder,
      title: "📿 Tasbeeh Reminder",
      body: "SubhanAllah · Alhamdulillah · Allahu Akbar — Take a moment for dhikr.",
      url: "/tasbeeh",
    },
    {
      key: "fajrReminder",
      s: settings.fajrReminder,
      title: "🌅 Fajr Prayer",
      body: "Time for Fajr prayer — the prayer of the dawn. Rise and worship Allah.",
      url: "/prayer-times",
    },
    {
      key: "dhuhrReminder",
      s: settings.dhuhrReminder,
      title: "🌤️ Dhuhr Prayer",
      body: "Time for Dhuhr prayer. Pause your day and connect with Allah.",
      url: "/prayer-times",
    },
    {
      key: "asrReminder",
      s: settings.asrReminder,
      title: "⛅ Asr Prayer",
      body: "Time for Asr prayer. Do not miss this blessed prayer.",
      url: "/prayer-times",
    },
    {
      key: "maghribReminder",
      s: settings.maghribReminder,
      title: "🌇 Maghrib Prayer",
      body: "Time for Maghrib prayer. The sun has set — remember Allah.",
      url: "/prayer-times",
    },
    {
      key: "ishaReminder",
      s: settings.ishaReminder,
      title: "🌙 Isha Prayer",
      body: "Time for Isha prayer. End your day with worship and gratitude.",
      url: "/prayer-times",
    },
  ];

  for (const { key, s, title, body, url } of checks) {
    if (s?.enabled && s.time === timeNow) {
      fire(key, title, body, url);
    }
  }

  // Friday-only Jumma reminder
  if (isFriday && settings.jummaReminder?.enabled && settings.jummaReminder.time === timeNow) {
    fire(
      "jummaReminder",
      "🕌 Jumu'ah Mubarak",
      "Friday Mubarak! Read Surah Al-Kahf and send salawat upon the Prophet ﷺ.",
      "/quran"
    );
  }
}
