import { FormEvent, useState } from "react";
import { Link } from "wouter";
import { ChevronLeft, ShieldCheck, Trash2 } from "lucide-react";
import { noorApi } from "@/lib/noor-api";

export function AccountDeletion() {
  const [recoveryKey, setRecoveryKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<"idle" | "success" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const value = recoveryKey.trim().toUpperCase();
    if (!value || busy) return;
    setBusy(true);
    setState("idle");
    setError("");
    try {
      await noorApi.deleteAccount(value);
      setRecoveryKey("");
      setState("success");
    } catch (err) {
      setState("error");
      setError(err instanceof Error && err.message === "Invalid Recovery Key"
        ? "The Recovery Key could not be verified."
        : "We could not process the request. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 pt-6 pb-4 bg-background/95 backdrop-blur border-b border-border">
        <Link href="/" className="flex items-center justify-center w-9 h-9 rounded-full border border-border text-muted-foreground">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">Account & Data Deletion</h1>
          <p className="text-muted-foreground text-xs">Noor Quran</p>
        </div>
        <ShieldCheck className="w-5 h-5 text-muted-foreground" />
      </div>

      <main className="max-w-xl mx-auto px-4 py-8">
        <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
          <div className="flex items-center gap-3">
            <Trash2 className="w-6 h-6 text-destructive" />
            <h2 className="text-xl font-semibold">Request permanent deletion</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Enter the Recovery Key shown in Noor Quran Settings. This permanently deletes your
            AI Teacher account, encrypted server backup, progress, rewards, and marketplace
            records. The action cannot be undone.
          </p>

          {state === "success" ? (
            <div className="rounded-xl border border-border bg-primary/10 p-4 text-sm text-primary" role="status">
              Your Noor Quran account and associated server data have been permanently deleted.
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <label className="block text-sm font-medium" htmlFor="deletion-recovery-key">
                Recovery Key
              </label>
              <input
                id="deletion-recovery-key"
                value={recoveryKey}
                onChange={(event) => setRecoveryKey(event.target.value.toUpperCase())}
                placeholder="NQ-XXXXXXXX-XXXXXXXX-XXXXXXXX"
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                required
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-destructive px-4 py-3 text-sm font-semibold text-destructive-foreground disabled:opacity-60"
              >
                {busy ? "Processing…" : "Delete my account and data"}
              </button>
              {state === "error" && <p className="text-sm text-destructive" role="alert">{error}</p>}
            </form>
          )}
        </div>
      </main>
    </div>
  );
}