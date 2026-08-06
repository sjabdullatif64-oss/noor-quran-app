import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getLang } from "@/lib/settings";
import { getTeacherSpeechCopy } from "@/lib/teacher-speech-copy";
import { SPEECH_LANG } from "@/lib/teacher-config";
import type { Assessment, ListenResult } from "@/lib/teacher-speech";

interface TeacherSpeechDiagnosticsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessment: Assessment | null;
  speech: ListenResult | null;
}

export function TeacherSpeechDiagnostics({
  open,
  onOpenChange,
  assessment,
  speech,
}: TeacherSpeechDiagnosticsProps) {
  const copy = getTeacherSpeechCopy(getLang());
  const errors = [...new Set([
    ...(speech?.errors ?? []),
    ...(speech?.error ? [speech.error] : []),
  ])];
  const errorText = errors.length > 0
    ? errors.map((error) => copy.errorLabels[error] ?? copy.errors).join(" · ")
    : copy.noErrors;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader className="text-left">
          <DialogTitle className="text-foreground">{copy.diagnosticsTitle}</DialogTitle>
          <DialogDescription>{copy.diagnosticsDescription}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm" dir={getLang() === "arabic" || getLang() === "urdu" ? "rtl" : "ltr"}>
          <div className="grid grid-cols-2 gap-3">
            <DiagnosticValue label={copy.recognizedText} value={speech?.alternatives?.[0] || "—"} arabic />
            <DiagnosticValue label={copy.score} value={assessment ? `${assessment.matchScore}%` : "—"} />
            <DiagnosticValue label={copy.language} value={SPEECH_LANG} />
            <DiagnosticValue
              label={copy.confidence}
              value={speech && speech.confidence >= 0 ? `${Math.round(speech.confidence * 100)}%` : "—"}
            />
            <DiagnosticValue label={copy.status} value={speech?.status || "—"} />
          </div>
          <div className="rounded-xl border border-border bg-background/60 p-3">
            <p className="text-muted-foreground text-xs mb-1">{copy.errors}</p>
            <p className="text-foreground text-xs leading-relaxed">{errorText}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="w-full rounded-xl border border-border py-2.5 text-sm font-semibold text-foreground"
        >
          {copy.close}
        </button>
      </DialogContent>
    </Dialog>
  );
}

function DiagnosticValue({
  label,
  value,
  arabic = false,
}: {
  label: string;
  value: string;
  arabic?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/60 p-3 min-w-0">
      <p className="text-muted-foreground text-xs mb-1">{label}</p>
      <p className={`text-foreground text-sm break-words ${arabic ? "font-arabic" : ""}`} dir={arabic ? "rtl" : undefined}>
        {value}
      </p>
    </div>
  );
}