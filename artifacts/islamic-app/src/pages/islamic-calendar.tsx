import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar, Star, Moon, Sun } from "lucide-react";
import { Link } from "wouter";
import { useHijriMonthCalendar, type HijriCalendarDay } from "@/lib/api";

// ── Hijri calendar data ───────────────────────────────────────────────────────

const HIJRI_MONTHS = [
  "Muharram", "Safar", "Rabi al-Awwal", "Rabi al-Thani",
  "Jumada al-Awwal", "Jumada al-Thani", "Rajab", "Sha'ban",
  "Ramadan", "Shawwal", "Dhul Qi'dah", "Dhul Hijjah",
];

const HIJRI_MONTHS_AR = [
  "مُحَرَّم", "صَفَر", "رَبِيع الأَوَّل", "رَبِيع الثَّانِي",
  "جُمَادَى الأُولَى", "جُمَادَى الآخِرَة", "رَجَب", "شَعْبَان",
  "رَمَضَان", "شَوَّال", "ذُو الْقَعْدَة", "ذُو الْحِجَّة",
];

const GREGORIAN_MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// Weekday labels — starting Monday (Islamic week starts Sunday, but Mon–Sun is universal)
const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ── Islamic events (Hijri month/day, 1-indexed) ───────────────────────────────
interface IslamicEvent {
  hMonth: number; // 1–12
  hDay:   number; // 1–30
  name:   string;
  nameAr: string;
  type:   "new-year" | "ashura" | "mawlid" | "miraj" | "baraat" | "ramadan" | "qadr" | "eid-fitr" | "hajj" | "arafah" | "eid-adha" | "tashreeq";
  rangeEnd?: number; // for multi-day events (e.g. Ramadan ends on 30)
}

const ISLAMIC_EVENTS: IslamicEvent[] = [
  { hMonth: 1,  hDay: 1,  name: "Islamic New Year",      nameAr: "رَأْس السَّنَة الهِجْرِيَّة", type: "new-year"  },
  { hMonth: 1,  hDay: 10, name: "Day of Ashura",          nameAr: "يَوْم عَاشُورَاء",            type: "ashura"    },
  { hMonth: 3,  hDay: 12, name: "Mawlid al-Nabi ﷺ",       nameAr: "الْمَوْلِد النَّبَوِيّ",      type: "mawlid"    },
  { hMonth: 7,  hDay: 27, name: "Laylat al-Mi'raj",       nameAr: "لَيْلَة المِعْرَاج",          type: "miraj"     },
  { hMonth: 8,  hDay: 15, name: "Laylat al-Bara'ah",      nameAr: "لَيْلَة البَرَاءَة",          type: "baraat"    },
  { hMonth: 9,  hDay: 1,  name: "First Day of Ramadan",   nameAr: "بِدَايَة رَمَضَان",            type: "ramadan", rangeEnd: 30 },
  { hMonth: 9,  hDay: 21, name: "Laylatul Qadr (21st)",   nameAr: "لَيْلَة القَدْر",              type: "qadr"      },
  { hMonth: 9,  hDay: 23, name: "Laylatul Qadr (23rd)",   nameAr: "لَيْلَة القَدْر",              type: "qadr"      },
  { hMonth: 9,  hDay: 25, name: "Laylatul Qadr (25th)",   nameAr: "لَيْلَة القَدْر",              type: "qadr"      },
  { hMonth: 9,  hDay: 27, name: "Laylatul Qadr (27th) ★", nameAr: "لَيْلَة القَدْر",              type: "qadr"      },
  { hMonth: 9,  hDay: 29, name: "Laylatul Qadr (29th)",   nameAr: "لَيْلَة القَدْر",              type: "qadr"      },
  { hMonth: 10, hDay: 1,  name: "Eid ul Fitr",            nameAr: "عِيد الفِطْر",                type: "eid-fitr"  },
  { hMonth: 12, hDay: 8,  name: "Hajj Begins",            nameAr: "بِدَايَة الحَجّ",              type: "hajj"      },
  { hMonth: 12, hDay: 9,  name: "Day of Arafah",          nameAr: "يَوْم عَرَفَة",               type: "arafah"    },
  { hMonth: 12, hDay: 10, name: "Eid ul Adha",            nameAr: "عِيد الأَضْحَى",              type: "eid-adha"  },
  { hMonth: 12, hDay: 11, name: "Days of Tashreeq",       nameAr: "أَيَّام التَّشْرِيق",          type: "tashreeq", rangeEnd: 13 },
];

// ── Umm al-Qura Hijri conversion via Intl.DateTimeFormat ─────────────────────
//
// Uses the browser/WebView's built-in Islamic-Umalqura calendar (the official
// Saudi calendar). This matches aladhan.com and all major Islamic references
// exactly, with no drift or tabular-approximation errors.
//
// Supported in all modern browsers and Android WebView (API ≥ 24).

const _hijriFormatter = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
  day:   "numeric",
  month: "numeric",   // returns 1-based month (Muharram=1 … Dhul Hijjah=12)
  year:  "numeric",
});

function gregorianToHijri(gy: number, gm: number, gd: number): { year: number; month: number; day: number } {
  // gm is 1-based (Jan=1)
  const date  = new Date(gy, gm - 1, gd);
  const parts = _hijriFormatter.formatToParts(date);
  const get   = (type: string) =>
    parseInt(parts.find((p) => p.type === type)?.value ?? "0", 10);
  return { year: get("year"), month: get("month"), day: get("day") };
}

// ── Event colour mapping ──────────────────────────────────────────────────────
const EVENT_STYLES: Record<IslamicEvent["type"], { dot: string; badge: string; text: string }> = {
  "new-year":  { dot: "bg-emerald-400",  badge: "bg-muted border-border",   text: "text-primary"  },
  "ashura":    { dot: "bg-sky-400",      badge: "bg-muted border-border",            text: "text-primary"      },
  "mawlid":    { dot: "bg-amber-400",    badge: "bg-muted border-border",        text: "text-primary"    },
  "miraj":     { dot: "bg-purple-400",   badge: "bg-muted border-border",      text: "text-primary"   },
  "baraat":    { dot: "bg-indigo-400",   badge: "bg-muted border-border",      text: "text-primary"   },
  "ramadan":   { dot: "bg-teal-400",     badge: "bg-muted border-border",          text: "text-primary"     },
  "qadr":      { dot: "bg-yellow-300",   badge: "bg-muted border-border",      text: "text-primary"   },
  "eid-fitr":  { dot: "bg-rose-400",     badge: "bg-muted border-border",          text: "text-primary"     },
  "hajj":      { dot: "bg-orange-400",   badge: "bg-muted border-border",      text: "text-primary"   },
  "arafah":    { dot: "bg-amber-400",    badge: "bg-muted border-border",        text: "text-primary"    },
  "eid-adha":  { dot: "bg-rose-400",     badge: "bg-muted border-border",          text: "text-primary"     },
  "tashreeq":  { dot: "bg-orange-300",   badge: "bg-muted border-border",      text: "text-primary"   },
};

// ── Day cell data ─────────────────────────────────────────────────────────────
interface CalDay {
  gDay:    number;
  gDate:   Date;
  hDay:    number;
  hMonth:  number;
  hYear:   number;
  isFriday:   boolean;
  isToday:    boolean;
  isSunday:   boolean;
  events:  IslamicEvent[];
}

/**
 * Build the calendar grid for the given Gregorian month.
 * hijriLookup: Map<gDay, HijriCalendarDay> from Aladhan API.
 * Falls back to the local Intl-based function for any day missing from the map
 * (e.g. while the API response is still loading).
 */
function buildMonthDays(
  gYear: number,
  gMonth: number, // 0-indexed (JS Date)
  hijriLookup: Map<number, HijriCalendarDay>,
): CalDay[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstDay = new Date(gYear, gMonth, 1);
  const lastDay  = new Date(gYear, gMonth + 1, 0);

  // Day-of-week offset so grid starts on Monday (0=Mon…6=Sun)
  let startDow = firstDay.getDay(); // 0=Sun…6=Sat
  startDow = startDow === 0 ? 6 : startDow - 1;

  const days: CalDay[] = [];

  // Leading empty cells
  for (let i = 0; i < startDow; i++) {
    days.push(null as unknown as CalDay);
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date  = new Date(gYear, gMonth, d);
    const dow   = date.getDay();

    // Prefer API data; fall back to local Intl calculation while loading
    const apiEntry = hijriLookup.get(d);
    const hijri = apiEntry
      ? { year: apiEntry.hYear, month: apiEntry.hMonth, day: apiEntry.hDay }
      : gregorianToHijri(gYear, gMonth + 1, d);

    const dayEvents = ISLAMIC_EVENTS.filter((ev) => {
      if (ev.hMonth !== hijri.month) return false;
      if (ev.rangeEnd !== undefined) return hijri.day >= ev.hDay && hijri.day <= ev.rangeEnd;
      return hijri.day === ev.hDay;
    });

    days.push({
      gDay:     d,
      gDate:    date,
      hDay:     hijri.day,
      hMonth:   hijri.month,
      hYear:    hijri.year,
      isFriday: dow === 5,
      isSunday: dow === 0,
      isToday:  date.getTime() === today.getTime(),
      events:   dayEvents,
    });
  }

  return days;
}

// Collect unique events for the visible month (for the events list below)
function getMonthEvents(days: (CalDay | null)[]): IslamicEvent[] {
  const seen = new Set<string>();
  const result: IslamicEvent[] = [];
  for (const day of days) {
    if (!day) continue;
    for (const ev of day.events) {
      const key = `${ev.hMonth}-${ev.hDay}-${ev.name}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(ev);
      }
    }
  }
  return result;
}

// ── Main component ────────────────────────────────────────────────────────────
export function IslamicCalendar() {
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed

  // ── Aladhan Hijri calendar API calls ───────────────────────────────────────
  // Fetch accurate Hijri dates for the currently-viewed Gregorian month.
  // gMonth is 1-based for the API.
  const { data: viewMonthHijri }  = useHijriMonthCalendar(viewMonth + 1, viewYear);

  // Fetch today's month separately so the TodayCard always has accurate data
  // even when the user navigates to a different month.
  const todayGMonth = today.getMonth() + 1;
  const todayGYear  = today.getFullYear();
  const { data: todayMonthHijri } = useHijriMonthCalendar(todayGMonth, todayGYear);

  // Build gDay → hijri lookup for the viewed month
  const hijriLookup = useMemo<Map<number, HijriCalendarDay>>(
    () => new Map((viewMonthHijri ?? []).map((d) => [d.gDay, d])),
    [viewMonthHijri],
  );

  // Today's accurate Hijri date (API when loaded, Intl fallback while loading)
  const todayHijri = useMemo(() => {
    const apiDay = todayMonthHijri?.find((d) => d.gDay === today.getDate());
    if (apiDay) return { year: apiDay.hYear, month: apiDay.hMonth, day: apiDay.hDay };
    return gregorianToHijri(todayGYear, todayGMonth, today.getDate());
  }, [todayMonthHijri, todayGMonth, todayGYear]); // eslint-disable-line react-hooks/exhaustive-deps

  const days         = useMemo(() => buildMonthDays(viewYear, viewMonth, hijriLookup), [viewYear, viewMonth, hijriLookup]);
  const monthEvents  = useMemo(() => getMonthEvents(days), [days]);

  // Determine dominant Hijri month for the header (mid-month day)
  const midDay = days.find((d) => d && d.gDay === 15) ?? days.find((d) => d);
  const hijriMonthLabel = midDay
    ? `${HIJRI_MONTHS[midDay.hMonth - 1]} ${midDay.hYear} AH`
    : "";

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };

  const goToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  };

  return (
    <div
      className="min-h-screen pb-28 md:pb-10 animate-in fade-in duration-500 bg-background text-foreground"
    >
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-4">
        <Link href="/more" className="text-muted-foreground hover:text-primary transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-serif font-bold text-foreground">Islamic Calendar</h1>
          <p className="text-muted-foreground text-xs mt-0.5">Hijri · Gregorian · Islamic Events</p>
        </div>
        {/* Today button */}
        <button
          onClick={goToday}
          className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-primary hover:border-border transition-all bg-card"
        >
          Today
        </button>
      </div>

      <div className="px-4 space-y-4">

        {/* ── Today's date card ─────────────────────────────────────────── */}
        <TodayCard todayHijri={todayHijri} today={today} />

        {/* ── Month navigation ──────────────────────────────────────────── */}
        <div
          className="rounded-2xl border border-border overflow-hidden bg-card"
        >
          {/* Month/year header with navigation */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <button
              onClick={prevMonth}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted transition-all active:scale-90"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="text-center animate-in fade-in duration-300">
                <p className="text-foreground font-bold text-base">
                {GREGORIAN_MONTHS[viewMonth]} {viewYear}
              </p>
                <p className="text-muted-foreground text-xs mt-0.5">{hijriMonthLabel}</p>
            </div>

            <button
              onClick={nextMonth}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted transition-all active:scale-90"
              aria-label="Next month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Weekday labels */}
          <div className="grid grid-cols-7 border-b border-border">
            {WEEK_DAYS.map((wd) => (
              <div
                key={wd}
                className={`text-center py-2 text-xs font-semibold uppercase tracking-wide ${
                  wd === "Fri" ? "text-amber-700 dark:text-amber-300" : wd === "Sun" ? "text-rose-700 dark:text-rose-300" : "text-muted-foreground"
                }`}
              >
                {wd}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 p-1 gap-0.5">
            {days.map((day, i) =>
              day ? (
                <DayCell key={i} day={day} />
              ) : (
                <div key={i} />
              )
            )}
          </div>

          {/* Legend */}
          <div className="px-4 py-3 border-t border-border flex flex-wrap gap-3">
            <LegendDot color="bg-emerald-400" label="Today" />
            <LegendDot color="bg-amber-400/70" label="Friday" />
            <LegendDot color="bg-rose-400" label="Eid" />
            <LegendDot color="bg-teal-400" label="Ramadan" />
            <LegendDot color="bg-yellow-300" label="Laylatul Qadr" />
            <LegendDot color="bg-purple-400" label="Event" />
          </div>
        </div>

        {/* ── Events this month ─────────────────────────────────────────── */}
        {monthEvents.length > 0 && (
          <div className="rounded-2xl border border-border overflow-hidden bg-card">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-primary text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                <Star className="w-4 h-4" />
                Events This Month
              </p>
            </div>
            <div className="divide-y divide-border">
              {monthEvents.map((ev, i) => {
                const style = EVENT_STYLES[ev.type];
                return (
                  <div key={i} className="px-4 py-3 flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${style.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${style.text}`}>{ev.name}</p>
                      <p className="text-muted-foreground text-xs mt-0.5 font-arabic">{ev.nameAr}</p>
                    </div>
                    <span className="text-muted-foreground text-xs shrink-0">
                      {ev.hDay}{ev.rangeEnd ? `–${ev.rangeEnd}` : ""} {HIJRI_MONTHS[ev.hMonth - 1]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Full Islamic events reference ──────────────────────────────── */}
        <AllEventsSection />

        {/* ── Hijri months reference ────────────────────────────────────── */}
        <HijriMonthsSection />

      </div>
    </div>
  );
}

// ── Today card ────────────────────────────────────────────────────────────────
function TodayCard({ todayHijri, today }: { todayHijri: { year: number; month: number; day: number }; today: Date }) {
  const gDay   = today.getDate();
  const gMonth = GREGORIAN_MONTHS[today.getMonth()];
  const gYear  = today.getFullYear();
  const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const dayName  = dayNames[today.getDay()];
  const isFriday = today.getDay() === 5;

  return (
    <div
      className="rounded-3xl overflow-hidden border border-primary/30 bg-card"
    >
      <div className="h-1 w-full bg-primary" />

      <div className="p-5 flex items-center gap-4">
        {/* Day number */}
        <div className="text-center shrink-0">
          <p
            className={`text-5xl font-bold leading-none ${isFriday ? "text-amber-700 dark:text-amber-300" : "text-primary"}`}
          >
            {gDay}
          </p>
          <p className={`text-xs font-semibold mt-1 ${isFriday ? "text-amber-700 dark:text-amber-300" : "text-primary"}`}>
            {dayName}
          </p>
        </div>

        <div className="w-px h-14 bg-muted" />

        {/* Gregorian */}
        <div className="flex-1">
          <p className="text-foreground font-bold text-lg leading-tight">{gMonth} {gYear}</p>
          <p className="text-muted-foreground text-xs mt-0.5">Gregorian</p>
          {isFriday && (
            <span className="inline-block mt-1.5 text-xs text-amber-300 bg-amber-900/30 border border-amber-700/40 px-2 py-0.5 rounded-full">
              Jumu'ah Mubarak 🌟
            </span>
          )}
        </div>

        <div className="w-px h-14 bg-muted" />

        {/* Hijri */}
        <div className="flex-1 text-right">
          <p className="text-primary font-bold text-lg leading-tight">
            {todayHijri.day} {HIJRI_MONTHS[todayHijri.month - 1]}
          </p>
          <p className="text-muted-foreground text-xs mt-0.5">{todayHijri.year} AH</p>
          <p className="text-muted-foreground text-xs font-arabic mt-0.5">
            {HIJRI_MONTHS_AR[todayHijri.month - 1]}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Day cell ──────────────────────────────────────────────────────────────────
function DayCell({ day }: { day: CalDay }) {
  const primaryEvent = day.events[0];
  const eventStyle   = primaryEvent ? EVENT_STYLES[primaryEvent.type] : null;

  let cellBg   = "";
  let gNumColor = "text-foreground";
  let hNumColor = "text-muted-foreground";
  let border   = "border border-transparent";

  if (day.isToday) {
    cellBg    = "bg-primary/20";
    gNumColor = "text-primary-foreground font-bold";
    hNumColor = "text-primary";
    border    = "border border-emerald-500/60";
  } else if (day.isFriday) {
    cellBg    = "bg-amber-500/10";
    gNumColor = "text-amber-700 dark:text-amber-300 font-semibold";
    hNumColor = "text-amber-800 dark:text-amber-200";
    border    = "border border-amber-800/20 dark:border-amber-300/30";
  } else if (day.isSunday) {
    gNumColor = "text-rose-700 dark:text-rose-300";
  } else if (primaryEvent) {
    cellBg    = "bg-primary/5";
    border    = "border border-border";
  }

  return (
    <div
      className={`relative rounded-xl p-1 flex flex-col items-center justify-center min-h-[52px] ${border} ${cellBg} transition-all`}
    >
      {/* Gregorian day */}
      <span className={`text-sm leading-tight ${gNumColor}`}>{day.gDay}</span>

      {/* Hijri day */}
      <span className={`text-[9px] leading-tight ${hNumColor}`}>{day.hDay}</span>

      {/* Event dots */}
      {day.events.length > 0 && (
        <div className="flex gap-0.5 mt-0.5">
          {day.events.slice(0, 3).map((ev, i) => (
            <span key={i} className={`w-1 h-1 rounded-full ${EVENT_STYLES[ev.type].dot}`} />
          ))}
        </div>
      )}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  );
}

// ── All Islamic events reference ──────────────────────────────────────────────
const ALL_EVENTS_DISPLAY = [
  { name: "Islamic New Year",      nameAr: "رَأْس السَّنَة الهِجْرِيَّة",  date: "1 Muharram",          type: "new-year"  as const, desc: "Beginning of the Hijri calendar year"                              },
  { name: "Day of Ashura",         nameAr: "يَوْم عَاشُورَاء",             date: "10 Muharram",         type: "ashura"    as const, desc: "Day of fasting — Moses was saved from Pharaoh"                   },
  { name: "Mawlid al-Nabi ﷺ",      nameAr: "الْمَوْلِد النَّبَوِيّ",       date: "12 Rabi al-Awwal",    type: "mawlid"    as const, desc: "Birthday of the Prophet Muhammad ﷺ"                              },
  { name: "Laylat al-Mi'raj",      nameAr: "لَيْلَة المِعْرَاج",           date: "27 Rajab",            type: "miraj"     as const, desc: "Night Journey and Ascension of the Prophet ﷺ"                    },
  { name: "Laylat al-Bara'ah",     nameAr: "لَيْلَة البَرَاءَة",           date: "15 Sha'ban",          type: "baraat"    as const, desc: "Night of forgiveness and records"                                },
  { name: "Ramadan",               nameAr: "رَمَضَان",                      date: "1–29/30 Ramadan",     type: "ramadan"   as const, desc: "Month of fasting, prayer, and Quran"                            },
  { name: "Laylatul Qadr",         nameAr: "لَيْلَة القَدْر",              date: "Odd nights, last 10", type: "qadr"      as const, desc: "Night of Power — better than 1000 months"                        },
  { name: "Eid ul Fitr",           nameAr: "عِيد الفِطْر",                  date: "1 Shawwal",           type: "eid-fitr"  as const, desc: "Celebration marking the end of Ramadan"                         },
  { name: "Day of Arafah",         nameAr: "يَوْم عَرَفَة",                date: "9 Dhul Hijjah",       type: "arafah"    as const, desc: "Forgiveness of sins — fasting recommended"                      },
  { name: "Eid ul Adha",           nameAr: "عِيد الأَضْحَى",               date: "10 Dhul Hijjah",      type: "eid-adha"  as const, desc: "Celebration of Prophet Ibrahim's ﵇ sacrifice"                    },
  { name: "Hajj",                  nameAr: "حَجّ",                          date: "8–13 Dhul Hijjah",    type: "hajj"      as const, desc: "Annual Islamic pilgrimage to Makkah"                            },
];

function AllEventsSection() {
  return (
    <div
      className="rounded-2xl border border-border overflow-hidden bg-card"
    >
      <div className="px-4 py-3 border-b border-border">
        <p className="text-primary text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
          <Moon className="w-4 h-4" />
          Important Islamic Events
        </p>
        <p className="text-muted-foreground text-xs mt-0.5">Annual Hijri calendar highlights</p>
      </div>
      <div className="divide-y divide-border">
        {ALL_EVENTS_DISPLAY.map((ev, i) => {
          const style = EVENT_STYLES[ev.type];
          return (
            <div key={i} className="px-4 py-3.5 flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${style.dot}`}
                style={{ background: "hsl(var(--muted) / 0.7)" }}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-semibold ${style.text}`}>{ev.name}</p>
                  <span className="text-muted-foreground text-xs shrink-0 mt-0.5">{ev.date}</span>
                </div>
                <p className="text-muted-foreground text-xs mt-0.5">{ev.desc}</p>
                <p className="text-muted-foreground text-xs font-arabic mt-0.5">{ev.nameAr}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Hijri months reference ────────────────────────────────────────────────────
function HijriMonthsSection() {
  return (
    <div
      className="rounded-2xl border border-border overflow-hidden bg-card"
    >
      <div className="px-4 py-3 border-b border-border">
        <p className="text-primary text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Islamic Months
        </p>
      </div>
      <div className="grid grid-cols-2 divide-x divide-border">
        {HIJRI_MONTHS.map((name, i) => (
          <div
            key={i}
            className={`px-4 py-3 ${i % 2 === 0 ? "" : ""} ${i < 10 ? "border-b border-border" : ""}`}
          >
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs font-mono w-4 shrink-0">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <p className="text-primary text-sm font-medium">{name}</p>
                <p className="text-muted-foreground text-xs font-arabic">{HIJRI_MONTHS_AR[i]}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
