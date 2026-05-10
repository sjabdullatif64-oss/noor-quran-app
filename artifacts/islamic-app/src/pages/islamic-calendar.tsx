import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar, Star, Moon, Sun } from "lucide-react";
import { Link } from "wouter";

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
  { hMonth: 9,  hDay: 1,  name: "First Day of Ramadan",   nameAr: "بِدَايَة رَمَضَان",            type: "ramadan", rangeEnd: 29 },
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

// ── Kuwaiti/Umm al-Qura Hijri conversion algorithm ───────────────────────────

function gregorianToHijri(gy: number, gm: number, gd: number): { year: number; month: number; day: number } {
  // Julian Day Number
  const jd =
    Math.floor((1461 * (gy + 4800 + Math.floor((gm - 14) / 12))) / 4) +
    Math.floor((367 * (gm - 2 - 12 * Math.floor((gm - 14) / 12))) / 12) -
    Math.floor((3 * Math.floor((gy + 4900 + Math.floor((gm - 14) / 12)) / 100)) / 4) +
    gd - 32075;

  let l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
    Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l =
    l -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const month = Math.floor((24 * l) / 709);
  const day   = l - Math.floor((709 * month) / 24);
  const year  = 30 * n + j - 30;

  return { year, month, day };
}

// ── Event colour mapping ──────────────────────────────────────────────────────
const EVENT_STYLES: Record<IslamicEvent["type"], { dot: string; badge: string; text: string }> = {
  "new-year":  { dot: "bg-emerald-400",  badge: "bg-emerald-900/60 border-emerald-700/50",   text: "text-emerald-300"  },
  "ashura":    { dot: "bg-sky-400",      badge: "bg-sky-900/60 border-sky-700/50",            text: "text-sky-300"      },
  "mawlid":    { dot: "bg-amber-400",    badge: "bg-amber-900/60 border-amber-700/50",        text: "text-amber-300"    },
  "miraj":     { dot: "bg-purple-400",   badge: "bg-purple-900/60 border-purple-700/50",      text: "text-purple-300"   },
  "baraat":    { dot: "bg-indigo-400",   badge: "bg-indigo-900/60 border-indigo-700/50",      text: "text-indigo-300"   },
  "ramadan":   { dot: "bg-teal-400",     badge: "bg-teal-900/60 border-teal-700/50",          text: "text-teal-300"     },
  "qadr":      { dot: "bg-yellow-300",   badge: "bg-yellow-900/60 border-yellow-700/50",      text: "text-yellow-200"   },
  "eid-fitr":  { dot: "bg-rose-400",     badge: "bg-rose-900/60 border-rose-700/50",          text: "text-rose-300"     },
  "hajj":      { dot: "bg-orange-400",   badge: "bg-orange-900/60 border-orange-700/50",      text: "text-orange-300"   },
  "arafah":    { dot: "bg-amber-400",    badge: "bg-amber-900/60 border-amber-700/50",        text: "text-amber-300"    },
  "eid-adha":  { dot: "bg-rose-400",     badge: "bg-rose-900/60 border-rose-700/50",          text: "text-rose-300"     },
  "tashreeq":  { dot: "bg-orange-300",   badge: "bg-orange-900/60 border-orange-700/50",      text: "text-orange-300"   },
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

function buildMonthDays(gYear: number, gMonth: number): CalDay[] {
  // gMonth is 0-indexed (JS Date)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstDay = new Date(gYear, gMonth, 1);
  const lastDay  = new Date(gYear, gMonth + 1, 0);

  // Day-of-week offset so grid starts on Monday (0=Mon…6=Sun)
  let startDow = firstDay.getDay(); // 0=Sun…6=Sat
  startDow = startDow === 0 ? 6 : startDow - 1; // convert to Mon=0…Sun=6

  const days: CalDay[] = [];

  // Leading empty cells
  for (let i = 0; i < startDow; i++) {
    days.push(null as unknown as CalDay);
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date  = new Date(gYear, gMonth, d);
    const dow   = date.getDay();        // 0=Sun, 5=Fri, 6=Sat
    const hijri = gregorianToHijri(gYear, gMonth + 1, d);

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

  const days         = useMemo(() => buildMonthDays(viewYear, viewMonth), [viewYear, viewMonth]);
  const monthEvents  = useMemo(() => getMonthEvents(days), [days]);
  const todayHijri   = useMemo(() => gregorianToHijri(today.getFullYear(), today.getMonth() + 1, today.getDate()), []);

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
      className="min-h-screen pb-28 md:pb-10 animate-in fade-in duration-500"
      style={{ background: "linear-gradient(150deg, #071a0e 0%, #0a1f12 55%, #061610 100%)" }}
    >
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-4">
        <Link href="/more" className="text-emerald-600 hover:text-emerald-400 transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-serif font-bold text-emerald-300">Islamic Calendar</h1>
          <p className="text-emerald-700 text-xs mt-0.5">Hijri · Gregorian · Islamic Events</p>
        </div>
        {/* Today button */}
        <button
          onClick={goToday}
          className="text-xs px-3 py-1.5 rounded-full border border-emerald-800/50 text-emerald-500 hover:text-emerald-300 hover:border-emerald-600 transition-all"
        >
          Today
        </button>
      </div>

      <div className="px-4 space-y-4">

        {/* ── Today's date card ─────────────────────────────────────────── */}
        <TodayCard todayHijri={todayHijri} today={today} />

        {/* ── Month navigation ──────────────────────────────────────────── */}
        <div
          className="rounded-2xl border border-emerald-900/40 overflow-hidden"
          style={{ background: "rgba(255,255,255,0.03)" }}
        >
          {/* Month/year header with navigation */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-900/30">
            <button
              onClick={prevMonth}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-emerald-500 hover:text-emerald-300 hover:bg-emerald-900/40 transition-all active:scale-90"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="text-center animate-in fade-in duration-300">
              <p className="text-white font-bold text-base">
                {GREGORIAN_MONTHS[viewMonth]} {viewYear}
              </p>
              <p className="text-emerald-600 text-xs mt-0.5">{hijriMonthLabel}</p>
            </div>

            <button
              onClick={nextMonth}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-emerald-500 hover:text-emerald-300 hover:bg-emerald-900/40 transition-all active:scale-90"
              aria-label="Next month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Weekday labels */}
          <div className="grid grid-cols-7 border-b border-emerald-900/20">
            {WEEK_DAYS.map((wd) => (
              <div
                key={wd}
                className={`text-center py-2 text-xs font-semibold uppercase tracking-wide ${
                  wd === "Fri" ? "text-amber-400" : wd === "Sun" ? "text-rose-400/70" : "text-emerald-700"
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
          <div className="px-4 py-3 border-t border-emerald-900/20 flex flex-wrap gap-3">
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
          <div
            className="rounded-2xl border border-emerald-900/40 overflow-hidden"
            style={{ background: "rgba(255,255,255,0.03)" }}
          >
            <div className="px-4 py-3 border-b border-emerald-900/30">
              <p className="text-emerald-400 text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                <Star className="w-4 h-4" />
                Events This Month
              </p>
            </div>
            <div className="divide-y divide-emerald-900/20">
              {monthEvents.map((ev, i) => {
                const style = EVENT_STYLES[ev.type];
                return (
                  <div key={i} className="px-4 py-3 flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${style.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${style.text}`}>{ev.name}</p>
                      <p className="text-emerald-800 text-xs mt-0.5 font-arabic">{ev.nameAr}</p>
                    </div>
                    <span className="text-emerald-800 text-xs shrink-0">
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
      className="rounded-3xl overflow-hidden border border-emerald-700/30"
      style={{ background: "linear-gradient(135deg, rgba(26,92,56,0.5) 0%, rgba(10,40,20,0.6) 100%)" }}
    >
      <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #1a5c38, #34d399, #059669, #1a5c38)" }} />

      <div className="p-5 flex items-center gap-4">
        {/* Day number */}
        <div className="text-center shrink-0">
          <p
            className="text-5xl font-bold leading-none"
            style={{ color: isFriday ? "#fbbf24" : "#34d399" }}
          >
            {gDay}
          </p>
          <p className={`text-xs font-semibold mt-1 ${isFriday ? "text-amber-400" : "text-emerald-500"}`}>
            {dayName}
          </p>
        </div>

        <div className="w-px h-14 bg-emerald-800/60" />

        {/* Gregorian */}
        <div className="flex-1">
          <p className="text-white font-bold text-lg leading-tight">{gMonth} {gYear}</p>
          <p className="text-emerald-600 text-xs mt-0.5">Gregorian</p>
          {isFriday && (
            <span className="inline-block mt-1.5 text-xs text-amber-300 bg-amber-900/30 border border-amber-700/40 px-2 py-0.5 rounded-full">
              Jumu'ah Mubarak 🌟
            </span>
          )}
        </div>

        <div className="w-px h-14 bg-emerald-800/60" />

        {/* Hijri */}
        <div className="flex-1 text-right">
          <p className="text-emerald-200 font-bold text-lg leading-tight">
            {todayHijri.day} {HIJRI_MONTHS[todayHijri.month - 1]}
          </p>
          <p className="text-emerald-600 text-xs mt-0.5">{todayHijri.year} AH</p>
          <p className="text-emerald-800 text-xs font-arabic mt-0.5">
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

  let cellBg   = "transparent";
  let gNumColor = "text-emerald-200";
  let hNumColor = "text-emerald-800";
  let border   = "border border-transparent";

  if (day.isToday) {
    cellBg    = "rgba(52,211,153,0.18)";
    gNumColor = "text-white font-bold";
    hNumColor = "text-emerald-400";
    border    = "border border-emerald-500/60";
  } else if (day.isFriday) {
    cellBg    = "rgba(251,191,36,0.07)";
    gNumColor = "text-amber-300 font-semibold";
    hNumColor = "text-amber-700";
    border    = "border border-amber-800/20";
  } else if (day.isSunday) {
    gNumColor = "text-rose-400/70";
  } else if (primaryEvent) {
    cellBg    = "rgba(52,211,153,0.05)";
    border    = "border border-emerald-900/30";
  }

  return (
    <div
      className={`relative rounded-xl p-1 flex flex-col items-center justify-center min-h-[52px] ${border} transition-all`}
      style={{ background: cellBg }}
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
      <span className="text-emerald-700 text-xs">{label}</span>
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
      className="rounded-2xl border border-emerald-900/40 overflow-hidden"
      style={{ background: "rgba(255,255,255,0.03)" }}
    >
      <div className="px-4 py-3 border-b border-emerald-900/30">
        <p className="text-emerald-400 text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
          <Moon className="w-4 h-4" />
          Important Islamic Events
        </p>
        <p className="text-emerald-700 text-xs mt-0.5">Annual Hijri calendar highlights</p>
      </div>
      <div className="divide-y divide-emerald-900/20">
        {ALL_EVENTS_DISPLAY.map((ev, i) => {
          const style = EVENT_STYLES[ev.type];
          return (
            <div key={i} className="px-4 py-3.5 flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${style.dot}`}
                style={{ background: "rgba(0,0,0,0.25)" }}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-semibold ${style.text}`}>{ev.name}</p>
                  <span className="text-emerald-800 text-xs shrink-0 mt-0.5">{ev.date}</span>
                </div>
                <p className="text-emerald-600 text-xs mt-0.5">{ev.desc}</p>
                <p className="text-emerald-800/70 text-xs font-arabic mt-0.5">{ev.nameAr}</p>
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
      className="rounded-2xl border border-emerald-900/40 overflow-hidden"
      style={{ background: "rgba(255,255,255,0.03)" }}
    >
      <div className="px-4 py-3 border-b border-emerald-900/30">
        <p className="text-emerald-400 text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Islamic Months
        </p>
      </div>
      <div className="grid grid-cols-2 divide-x divide-emerald-900/20">
        {HIJRI_MONTHS.map((name, i) => (
          <div
            key={i}
            className={`px-4 py-3 ${i % 2 === 0 ? "" : ""} ${i < 10 ? "border-b border-emerald-900/20" : ""}`}
          >
            <div className="flex items-center gap-2">
              <span className="text-emerald-900 text-xs font-mono w-4 shrink-0">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <p className="text-emerald-300 text-sm font-medium">{name}</p>
                <p className="text-emerald-800 text-xs font-arabic">{HIJRI_MONTHS_AR[i]}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
