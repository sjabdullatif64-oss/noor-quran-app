import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import {
  ChevronLeft, Plus, Search, Trash2, Edit3, X, Check,
  BookOpen, Moon, Bell, User, Tag, Clock, FileText, Sparkles,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
export type NoteCategory = "dua" | "quran" | "reminder" | "personal";

export interface Note {
  id: string;
  title: string;
  content: string;
  category: NoteCategory;
  createdAt: number;
  updatedAt: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const STORAGE_KEY = "noor-writing-notes";

const CATEGORIES: { id: NoteCategory; label: string; icon: React.ReactNode; color: string; bg: string; border: string }[] = [
  {
    id: "dua",
    label: "Dua Notes",
    icon: <Moon className="w-4 h-4" />,
    color: "text-purple-300",
    bg: "rgba(168,85,247,0.15)",
    border: "border-purple-700/40",
  },
  {
    id: "quran",
    label: "Quran Notes",
    icon: <BookOpen className="w-4 h-4" />,
    color: "text-emerald-300",
    bg: "rgba(52,211,153,0.12)",
    border: "border-emerald-700/40",
  },
  {
    id: "reminder",
    label: "Reminders",
    icon: <Bell className="w-4 h-4" />,
    color: "text-amber-300",
    bg: "rgba(217,119,6,0.15)",
    border: "border-amber-700/40",
  },
  {
    id: "personal",
    label: "Personal",
    icon: <User className="w-4 h-4" />,
    color: "text-sky-300",
    bg: "rgba(56,189,248,0.12)",
    border: "border-sky-700/40",
  },
];

const CAT_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<NoteCategory, typeof CATEGORIES[number]>;

// ── Storage helpers ───────────────────────────────────────────────────────────
function loadNotes(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Note[];
  } catch {
    return [];
  }
}

function saveNotes(notes: Note[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(notes)); } catch {}
}

function generateId(): string {
  return `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

// ── Main component ────────────────────────────────────────────────────────────
export function Writing() {
  const [notes, setNotes]               = useState<Note[]>(() => loadNotes());
  const [filterCat, setFilterCat]       = useState<NoteCategory | "all">("all");
  const [searchQuery, setSearchQuery]   = useState("");
  const [showSearch, setShowSearch]     = useState(false);
  const [editingNote, setEditingNote]   = useState<Note | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Persist whenever notes change
  useEffect(() => { saveNotes(notes); }, [notes]);

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const createNote = () => {
    const blank: Note = {
      id: generateId(),
      title: "",
      content: "",
      category: "personal",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setNotes((prev) => [blank, ...prev]);
    setEditingNote(blank);
  };

  const updateNote = useCallback((updated: Note) => {
    const now = Date.now();
    const merged = { ...updated, updatedAt: now };
    setNotes((prev) => prev.map((n) => (n.id === merged.id ? merged : n)));
    setEditingNote(merged);
  }, []);

  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (editingNote?.id === id) setEditingNote(null);
    setDeleteTarget(null);
  };

  const closeEditor = () => {
    // Remove empty notes on close
    if (editingNote && !editingNote.title.trim() && !editingNote.content.trim()) {
      setNotes((prev) => prev.filter((n) => n.id !== editingNote.id));
    }
    setEditingNote(null);
  };

  // ── Filter & search ────────────────────────────────────────────────────────
  const filteredNotes = notes.filter((n) => {
    const matchesCat = filterCat === "all" || n.category === filterCat;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery = !q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
    return matchesCat && matchesQuery;
  });

  const totalByCategory = (cat: NoteCategory) => notes.filter((n) => n.category === cat).length;

  // ── Render: Editor ─────────────────────────────────────────────────────────
  if (editingNote !== null) {
    return (
      <NoteEditor
        note={editingNote}
        onUpdate={updateNote}
        onClose={closeEditor}
        onDelete={(id) => { deleteNote(id); }}
      />
    );
  }

  // ── Render: List ──────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen pb-28 md:pb-10 animate-in fade-in duration-400"
      style={{ background: "linear-gradient(150deg, #071a0e 0%, #0a1f12 50%, #061610 100%)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-3">
        <Link href="/more" className="text-emerald-600 hover:text-emerald-400 transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-serif font-bold text-emerald-300">Islamic Writing</h1>
          <p className="text-emerald-800 text-xs mt-0.5">{notes.length} note{notes.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowSearch((v) => !v); if (showSearch) setSearchQuery(""); }}
            className="w-9 h-9 rounded-full flex items-center justify-center border border-emerald-800/40 text-emerald-500 hover:text-emerald-300 transition-all"
            style={{ background: "rgba(52,211,153,0.06)" }}
            data-testid="button-writing-search"
            aria-label="Search notes"
          >
            {showSearch ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          </button>
          <button
            onClick={createNote}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white transition-all hover:brightness-110 active:scale-95"
            style={{ background: "linear-gradient(135deg, #1a5c38 0%, #16a34a 100%)" }}
            data-testid="button-writing-new"
            aria-label="New note"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="px-5 pb-3 animate-in slide-in-from-top-2 duration-200">
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-800/40"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            <Search className="w-4 h-4 text-emerald-600 shrink-0" />
            <input
              autoFocus
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-white text-sm placeholder-emerald-800 outline-none"
              data-testid="input-writing-search"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-emerald-700 hover:text-emerald-500">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Category summary cards */}
      {!searchQuery && (
        <div className="px-4 pb-4">
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilterCat(filterCat === cat.id ? "all" : cat.id)}
                className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl border transition-all ${
                  filterCat === cat.id ? `${cat.border} ${cat.color}` : "border-emerald-900/30 text-emerald-700"
                }`}
                style={{ background: filterCat === cat.id ? cat.bg : "rgba(255,255,255,0.03)" }}
                data-testid={`button-cat-${cat.id}`}
              >
                <span className={filterCat === cat.id ? cat.color : "text-emerald-800"}>
                  {cat.icon}
                </span>
                <span className="text-xs font-bold leading-none">{totalByCategory(cat.id)}</span>
                <span className="text-[10px] leading-none text-center opacity-70">
                  {cat.label.split(" ")[0]}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 space-y-3">

        {/* All / category filter label */}
        {filterCat !== "all" && (
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${CAT_MAP[filterCat].color} ${CAT_MAP[filterCat].border}`}
              style={{ background: CAT_MAP[filterCat].bg }}>
              {CAT_MAP[filterCat].label}
            </span>
            <button onClick={() => setFilterCat("all")} className="text-xs text-emerald-700 hover:text-emerald-500">
              Clear filter
            </button>
          </div>
        )}

        {/* Empty state */}
        {filteredNotes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
              style={{ background: "rgba(52,211,153,0.08)" }}
            >
              <FileText className="w-9 h-9 text-emerald-800" />
            </div>
            <p className="text-emerald-500 font-semibold">
              {searchQuery ? "No notes found" : "No notes yet"}
            </p>
            <p className="text-emerald-800 text-sm mt-1">
              {searchQuery
                ? `No results for "${searchQuery}"`
                : "Tap + to write your first Islamic note"}
            </p>
            <p className="text-emerald-900 text-xs mt-1 font-arabic">اكتب بسم الله</p>
            {!searchQuery && (
              <button
                onClick={createNote}
                className="mt-5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110"
                style={{ background: "linear-gradient(135deg, #1a5c38 0%, #16a34a 100%)" }}
              >
                Write First Note
              </button>
            )}
          </div>
        )}

        {/* Note cards */}
        {filteredNotes.map((note, i) => {
          const cat = CAT_MAP[note.category];
          return (
            <div
              key={note.id}
              className="rounded-2xl border border-emerald-900/40 overflow-hidden transition-all hover:border-emerald-700/40"
              style={{
                background: "rgba(255,255,255,0.03)",
                animation: "fadeSlideUp 0.35s ease both",
                animationDelay: `${i * 35}ms`,
              }}
              data-testid={`note-card-${note.id}`}
            >
              <div className="p-4">
                {/* Top row */}
                <div className="flex items-start gap-3 mb-2">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${cat.color}`}
                    style={{ background: cat.bg }}
                  >
                    {cat.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm leading-tight truncate">
                      {note.title || <span className="text-emerald-700 italic">Untitled note</span>}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-semibold ${cat.color}`}>{cat.label}</span>
                      <span className="text-emerald-800 text-[10px] flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />{formatRelative(note.updatedAt)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setEditingNote(note)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-emerald-600 hover:text-emerald-300 transition-colors"
                      style={{ background: "rgba(52,211,153,0.06)" }}
                      data-testid={`button-edit-${note.id}`}
                      aria-label="Edit note"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(note.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-red-700 hover:text-red-400 transition-colors"
                      style={{ background: "rgba(239,68,68,0.06)" }}
                      data-testid={`button-delete-${note.id}`}
                      aria-label="Delete note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Content preview */}
                {note.content ? (
                  <p className="text-emerald-600 text-sm leading-relaxed line-clamp-2 pl-11">
                    {note.content}
                  </p>
                ) : (
                  <p className="text-emerald-900 text-xs italic pl-11">Empty note — tap edit to add content</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
          <div
            className="w-full max-w-sm rounded-2xl p-6 border border-red-900/40 animate-in slide-in-from-bottom-4 duration-200"
            style={{ background: "#0a1f12" }}
          >
            <p className="text-white font-bold text-base mb-1">Delete this note?</p>
            <p className="text-emerald-700 text-sm mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-emerald-800/50 text-emerald-400 text-sm font-semibold transition-all"
                style={{ background: "rgba(52,211,153,0.06)" }}
              >
                Cancel
              </button>
              <button
                onClick={() => deleteNote(deleteTarget)}
                className="flex-1 py-2.5 rounded-xl bg-red-900/60 border border-red-700/50 text-red-300 text-sm font-semibold transition-all hover:bg-red-800/60"
                data-testid="button-confirm-delete"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Note Editor ───────────────────────────────────────────────────────────────
function NoteEditor({
  note, onUpdate, onClose, onDelete,
}: {
  note: Note;
  onUpdate: (n: Note) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const [title, setTitle]     = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [category, setCategory] = useState<NoteCategory>(note.category);
  const [saved, setSaved]     = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-save on every change (debounced 700ms)
  const triggerSave = useCallback((t: string, c: string, cat: NoteCategory) => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      onUpdate({ ...note, title: t, content: c, category: cat, updatedAt: Date.now() });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }, 700);
  }, [note, onUpdate]);

  useEffect(() => () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); }, []);

  const handleTitle = (v: string) => { setTitle(v); triggerSave(v, content, category); };
  const handleContent = (v: string) => { setContent(v); triggerSave(title, v, category); };
  const handleCat = (cat: NoteCategory) => { setCategory(cat); triggerSave(title, content, cat); };

  const catInfo = CAT_MAP[category];
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col animate-in fade-in duration-200"
      style={{ background: "linear-gradient(150deg, #071a0e 0%, #0a1f12 50%, #061610 100%)" }}
      data-testid="writing-editor"
    >
      {/* Editor header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-3 border-b border-emerald-900/30 shrink-0">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center text-emerald-600 hover:text-emerald-300 transition-colors"
          style={{ background: "rgba(52,211,153,0.06)" }}
          data-testid="button-editor-close"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          <p className={`text-xs font-medium flex items-center gap-1.5 ${catInfo.color}`}>
            {catInfo.icon} {catInfo.label}
          </p>
        </div>

        {/* Save indicator */}
        <div className={`flex items-center gap-1 text-xs transition-all ${saved ? "text-emerald-400 opacity-100" : "opacity-0"}`}>
          <Check className="w-3.5 h-3.5" />
          Saved
        </div>

        {/* Delete */}
        <button
          onClick={() => setDeleteConfirm(true)}
          className="w-9 h-9 rounded-full flex items-center justify-center text-red-700 hover:text-red-400 transition-colors"
          style={{ background: "rgba(239,68,68,0.06)" }}
          data-testid="button-editor-delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Category selector */}
      <div className="flex gap-2 overflow-x-auto px-4 py-3 border-b border-emerald-900/20 shrink-0 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCat(cat.id)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              category === cat.id
                ? `${cat.color} ${cat.border}`
                : "text-emerald-800 border-emerald-900/40"
            }`}
            style={{ background: category === cat.id ? cat.bg : "rgba(255,255,255,0.02)" }}
            data-testid={`button-editor-cat-${cat.id}`}
          >
            {cat.icon}
            {cat.label}
          </button>
        ))}
      </div>

      {/* Title input */}
      <div className="px-5 pt-5 pb-2 shrink-0">
        <input
          type="text"
          placeholder="Note title..."
          value={title}
          onChange={(e) => handleTitle(e.target.value)}
          className="w-full bg-transparent text-white text-xl font-bold placeholder-emerald-900 outline-none"
          data-testid="input-note-title"
          maxLength={120}
        />
      </div>

      {/* Content textarea */}
      <div className="flex-1 px-5 pb-5 overflow-hidden">
        <textarea
          placeholder="بِسْمِ اللَّهِ&#10;&#10;Start writing your Islamic notes here..."
          value={content}
          onChange={(e) => handleContent(e.target.value)}
          className="w-full h-full bg-transparent text-emerald-300 text-base leading-relaxed placeholder-emerald-900/60 outline-none resize-none"
          data-testid="textarea-note-content"
          style={{ fontFamily: "inherit" }}
        />
      </div>

      {/* Footer stats */}
      <div
        className="flex items-center justify-between px-5 py-3 border-t border-emerald-900/30 shrink-0"
        style={{ background: "rgba(0,0,0,0.2)" }}
      >
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-emerald-800 text-xs">
            <Tag className="w-3 h-3" />{wordCount} words
          </span>
          <span className="text-emerald-900 text-xs">{charCount} chars</span>
        </div>
        <span className="text-emerald-900 text-xs flex items-center gap-1">
          <Sparkles className="w-3 h-3" />Auto-saving
        </span>
      </div>

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="absolute inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
          <div
            className="w-full max-w-sm rounded-2xl p-6 border border-red-900/40"
            style={{ background: "#0a1f12" }}
          >
            <p className="text-white font-bold text-base mb-1">Delete this note?</p>
            <p className="text-emerald-700 text-sm mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-emerald-800/50 text-emerald-400 text-sm font-semibold"
                style={{ background: "rgba(52,211,153,0.06)" }}
              >
                Cancel
              </button>
              <button
                onClick={() => onDelete(note.id)}
                className="flex-1 py-2.5 rounded-xl bg-red-900/60 border border-red-700/50 text-red-300 text-sm font-semibold"
                data-testid="button-editor-confirm-delete"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
