/**
 * Noor Quran — AI Quran Teacher: dashboard
 * Dark-green hub-page style, matching More/Settings/Downloads.
 */

import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  GraduationCap, Play, Flame, Target, BookOpen, RotateCcw,
  History, Trash2, ChevronRight, CheckCircle2, Lock, Sparkles, Clock, TrendingUp,
} from "lucide-react";
import { DAILY_LIMIT } from "@/lib/teacher-config";
import { CURRICULUM, LEVELS, getLesson, getLevelLessons } from "@/lib/teacher-curriculum";
import {
  getDailyStatus, getStats, getNextUncompleted, getMistakeLessons,
  getHistory, loadProgress, resetAllProgress, subscribeProgress,
  startRevision, hasRevisableLessons, endRevision,
} from "@/lib/teacher-progress";

function useTeacherState() {
  const [, setTick] = useState(0);
  useEffect(() => subscribeProgress(() => setTick((t) => t + 1)), []);
  return {
    daily: getDailyStatus(),
    stats: getStats(),
    nextId: getNextUncompleted(),
    mistakes: getMistakeLessons(),
    history: getHistory(),
    progress: loadProgress(),
  };
}

function fmtCountdown(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

function fmtStudyTime(ms: number): string {
  const mins = Math.round(ms / 60000);
  if (mins < 1) return "0m";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  return `${h}h ${mins % 60}m`;
}

export function Teacher() {
  const { daily, stats, nextId, mistakes, history, progress } = useTeacherState();
  const [, navigate] = useLocation();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [, setClock] = useState(0);

  // Refresh the reset countdown every minute
  useEffect(() => {
    const t = setInterval(() => setClock((c) => c + 1), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    // Returning to the dashboard ends any in-progress revision session
    endRevision();
  }, []);

  const nextLesson = nextId ? getLesson(nextId) : undefined;
  const pct = Math.min(100, Math.round((daily.done / DAILY_LIMIT) * 100));
  const ringStyle = {
    background: `conic-gradient(#34d399 ${pct * 3.6}deg, rgba(52,211,153,0.12) 0deg)`,
  };

  return (
    <div
      className="min-h-screen pb-32 md:pb-12 animate-in fade-in duration-500"
      style={{ background: "linear-gradient(150deg, #071a0e 0%, #0a1f12 50%, #061610 100%)" }}
    >
      {/* Header */}
      <div className="px-4 pt-8 pb-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center border border-emerald-700/50"
            style={{ background: "linear-gradient(135deg, rgba(26,92,56,0.5), rgba(6,22,16,0.5))" }}
          >
            <GraduationCap className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-emerald-300">Quran Teacher</h1>
            <p className="text-emerald-700 text-xs">Learn to read, step by step</p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4 max-w-2xl mx-auto">
        {/* Daily Goal */}
        <div
          className="rounded-2xl p-5 border border-emerald-800/40"
          style={{ background: "linear-gradient(135deg, rgba(26,92,56,0.2), rgba(6,22,16,0.4))" }}
          data-testid="card-daily-goal"
        >
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full p-[5px] shrink-0" style={ringStyle}>
              <div className="w-full h-full rounded-full flex flex-col items-center justify-center bg-[#0a1f12]">
                <p className="text-emerald-300 font-bold text-lg leading-none">{daily.done}</p>
                <p className="text-emerald-700 text-[10px] mt-0.5">of {daily.limit}</p>
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-emerald-400" />
                <p className="text-emerald-300 font-semibold text-sm">Today&apos;s Goal</p>
              </div>
              {daily.limitReached ? (
                <p className="text-emerald-500 text-xs leading-relaxed">
                  <span className="text-emerald-300 font-semibold">You have completed today&apos;s learning goal.</span>{" "}
                  Masha&apos;Allah! Review and listening stay open — unlimited. New lessons unlock in{" "}
                  <span className="text-emerald-300 font-medium">{fmtCountdown(daily.msUntilReset)}</span>.
                </p>
              ) : (
                <p className="text-emerald-500 text-xs leading-relaxed">
                  {daily.done === 0
                    ? "Start your first lesson of the day — small steps, every day."
                    : `${daily.limit - daily.done} lesson${daily.limit - daily.done === 1 ? "" : "s"} remaining today.`}{" "}
                  Resets in <span className="text-emerald-300 font-medium">{fmtCountdown(daily.msUntilReset)}</span>.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Continue Learning */}
        {nextLesson ? (
          <Link
            href={`/teacher/lesson/${nextLesson.id}`}
            className="block rounded-2xl p-5 border border-emerald-700/50 transition-all active:scale-[0.99]"
            style={{ background: "linear-gradient(135deg, rgba(26,92,56,0.35), rgba(6,22,16,0.5))" }}
            data-testid="card-continue-learning"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-900/50">
                <Play className="w-5 h-5 text-[#071a0e] ml-0.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-emerald-300 font-semibold text-sm mb-0.5">Continue Learning</p>
                <p className="text-emerald-600 text-xs truncate">
                  Level {nextLesson.level}: {LEVELS[nextLesson.level - 1].title} · Lesson {nextLesson.order}
                </p>
              </div>
              <p className="text-emerald-200 font-arabic text-2xl shrink-0" dir="rtl">{nextLesson.arabic}</p>
              <ChevronRight className="w-4 h-4 text-emerald-700 shrink-0" />
            </div>
          </Link>
        ) : (
          <div
            className="rounded-2xl p-5 border border-emerald-700/50 text-center"
            style={{ background: "linear-gradient(135deg, rgba(26,92,56,0.35), rgba(6,22,16,0.5))" }}
          >
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-emerald-300 font-semibold text-sm">All lessons completed — Masha&apos;Allah!</p>
            <p className="text-emerald-600 text-xs mt-1">More levels are coming in a future update. Keep reviewing to stay sharp.</p>
          </div>
        )}

        {/* Your Progress */}
        <div
          className="rounded-2xl p-5 border border-emerald-800/40"
          style={{ background: "rgba(255,255,255,0.02)" }}
          data-testid="card-your-progress"
        >
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <p className="text-emerald-300 font-semibold text-sm">Your Progress</p>
            <p className="text-emerald-600 text-xs ml-auto">
              {stats.lessonsCompleted} / {stats.totalLessons} lessons
            </p>
          </div>
          {/* Overall curriculum progress */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-emerald-600 text-[11px] flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Overall progress
              </p>
              <p className="text-emerald-300 text-xs font-semibold">{stats.overallPct}%</p>
            </div>
            <div className="h-2 rounded-full bg-emerald-950 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${stats.overallPct}%`,
                  background: "linear-gradient(90deg, #10b981, #34d399)",
                }}
              />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <p className="text-emerald-300 font-bold text-lg">{stats.wordsLearned}</p>
              <p className="text-emerald-700 text-[10px] leading-tight">Words learned</p>
            </div>
            <div>
              <p className="text-emerald-300 font-bold text-lg">{stats.lessonsCompleted}</p>
              <p className="text-emerald-700 text-[10px] leading-tight">Lessons done</p>
            </div>
            <div>
              <p className="text-emerald-300 font-bold text-lg flex items-center justify-center gap-1">
                {stats.streak}<Flame className="w-4 h-4 text-amber-400" />
              </p>
              <p className="text-emerald-700 text-[10px] leading-tight">Day streak</p>
            </div>
            <div>
              <p className="text-emerald-300 font-bold text-lg">{stats.avgAccuracy}%</p>
              <p className="text-emerald-700 text-[10px] leading-tight">Accuracy</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center mt-3 pt-3 border-t border-emerald-900/30">
            <div>
              <p className="text-emerald-300 font-bold text-base flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-500" />{fmtStudyTime(stats.timeSpentMs)}
              </p>
              <p className="text-emerald-700 text-[10px] leading-tight">Time learning</p>
            </div>
            <div>
              <p className="text-emerald-300 font-bold text-base">{stats.totalRetries}</p>
              <p className="text-emerald-700 text-[10px] leading-tight">Retries (practice makes perfect)</p>
            </div>
          </div>
        </div>

        {/* Smart Revision */}
        {hasRevisableLessons() && (
          <button
            onClick={() => {
              const first = startRevision();
              if (first) navigate(`/teacher/lesson/${first}`);
            }}
            className="w-full rounded-2xl p-5 border border-violet-800/40 text-left transition-all active:scale-[0.99]"
            style={{ background: "linear-gradient(135deg, rgba(109,40,217,0.15), rgba(6,22,16,0.4))" }}
            data-testid="button-smart-revision"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center border border-violet-700/40 shrink-0"
                style={{ background: "rgba(109,40,217,0.2)" }}>
                <Sparkles className="w-5 h-5 text-violet-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-violet-200 font-semibold text-sm mb-0.5">Smart Revision</p>
                <p className="text-violet-400/70 text-xs leading-relaxed">
                  {mistakes.length > 0
                    ? "A session built from the letters and words you struggle with most."
                    : "Revise your weakest completed lessons — doesn't count toward the daily limit."}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-violet-700 shrink-0" />
            </div>
          </button>
        )}

        {/* Levels overview */}
        <div className="space-y-2">
          {LEVELS.map((lv) => {
            const lessons = getLevelLessons(lv.level);
            const done = lessons.filter((l) => progress.completed[l.id]).length;
            const firstIncomplete = lessons.find((l) => !progress.completed[l.id]);
            const target = firstIncomplete ?? lessons[0];
            const prevDone = lv.level === 1 ||
              getLevelLessons(lv.level - 1).every((l) => progress.completed[l.id]);
            const cardInner = (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center border border-emerald-800/50 shrink-0 text-emerald-400 text-sm font-bold">
                    {done === lessons.length ? <CheckCircle2 className="w-5 h-5" /> : lv.level}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-emerald-300 text-sm font-medium">{lv.title}</p>
                    <p className="text-emerald-700 text-[11px] truncate">{lv.subtitle}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-emerald-500 text-xs font-medium">{done}/{lessons.length}</p>
                    {!prevDone && <Lock className="w-3 h-3 text-emerald-800 ml-auto mt-0.5" />}
                  </div>
                </div>
                <div className="mt-2 h-1 rounded-full bg-emerald-950 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${lessons.length ? (done / lessons.length) * 100 : 0}%` }}
                  />
                </div>
              </>
            );
            // Locked levels (previous level incomplete) are not clickable
            if (!prevDone) {
              return (
                <div
                  key={lv.level}
                  className="rounded-2xl border border-emerald-900/40 p-4 opacity-60"
                  style={{ background: "rgba(255,255,255,0.02)" }}
                  data-testid={`card-level-${lv.level}`}
                >
                  {cardInner}
                </div>
              );
            }
            return (
              <Link
                key={lv.level}
                href={`/teacher/lesson/${target.id}`}
                className="block rounded-2xl border border-emerald-900/40 p-4 transition-all active:scale-[0.99]"
                style={{ background: "rgba(255,255,255,0.02)" }}
                data-testid={`card-level-${lv.level}`}
              >
                {cardInner}
              </Link>
            );
          })}
        </div>

        {/* Review Mistakes */}
        {mistakes.length > 0 && (
          <div
            className="rounded-2xl border border-amber-900/40 p-4"
            style={{ background: "rgba(217,119,6,0.05)" }}
            data-testid="card-review-mistakes"
          >
            <div className="flex items-center gap-2 mb-3">
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <p className="text-amber-300 font-semibold text-sm">Review Mistakes</p>
            </div>
            <div className="divide-y divide-amber-900/20">
              {mistakes.slice(0, 5).map(({ lessonId, count }) => {
                const l = getLesson(lessonId);
                if (!l) return null;
                return (
                  <Link
                    key={lessonId}
                    href={`/teacher/lesson/${lessonId}`}
                    className="flex items-center justify-between py-2.5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <p className="text-amber-200 font-arabic text-lg shrink-0" dir="rtl">{l.arabic}</p>
                      <p className="text-amber-500/80 text-xs truncate">{l.transliteration}</p>
                    </div>
                    <p className="text-amber-700 text-[11px] shrink-0">{count}× · practice →</p>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Learning History */}
        {history.length > 0 && (
          <div
            className="rounded-2xl border border-emerald-900/40 p-4"
            style={{ background: "rgba(255,255,255,0.02)" }}
            data-testid="card-history"
          >
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-emerald-500" />
              <p className="text-emerald-400 font-semibold text-sm">Learning History</p>
            </div>
            <div className="divide-y divide-emerald-900/20">
              {history.slice(0, 7).map((h) => (
                <div key={h.date} className="flex items-center justify-between py-2">
                  <p className="text-emerald-500 text-xs">{h.date}</p>
                  <p className="text-emerald-600 text-xs">
                    {h.lessons} lesson{h.lessons === 1 ? "" : "s"} · {h.accuracy}% accuracy
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Delete learning data (privacy) */}
        <div className="rounded-2xl border border-emerald-900/30 p-4" style={{ background: "rgba(255,255,255,0.015)" }}>
          {confirmDelete ? (
            <div>
              <p className="text-emerald-400 text-xs mb-3 leading-relaxed">
                This deletes all your Teacher progress, streak, mistakes, and history from this
                device. This cannot be undone. Your bookmarks, favorites, and other app data are
                not affected.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => { resetAllProgress(); setConfirmDelete(false); }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-rose-200 border border-rose-800/60"
                  style={{ background: "rgba(244,63,94,0.12)" }}
                  data-testid="button-confirm-delete-learning"
                >
                  Yes, delete everything
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-emerald-300 border border-emerald-800/50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full flex items-center justify-between"
              data-testid="button-delete-learning"
            >
              <span className="flex items-center gap-2 text-emerald-600 text-xs">
                <Trash2 className="w-3.5 h-3.5" /> Delete my learning data
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-emerald-800" />
            </button>
          )}
        </div>

        <p className="text-center text-emerald-900 text-[11px] pb-4">
          {CURRICULUM.length} lessons · Levels 1–4 · Your voice is never recorded or uploaded
        </p>
      </div>
    </div>
  );
}
