/**
 * Temporary AI Teacher touch diagnostics.
 *
 * This is intentionally verbose and must be removed after the real-device
 * touch boundary is identified. It writes to both console/logcat and a small
 * localStorage ring buffer so the complete event sequence survives navigation.
 */

const STORAGE_KEY = "noor-teacher-touch-diagnostics-v1";
const MAX_ENTRIES = 120;

type DiagnosticValue = string | number | boolean | null | undefined;
type DiagnosticData = Record<string, DiagnosticValue>;

function describeElement(element: Element | null): DiagnosticData {
  if (!element) return { element: null };
  const html = element as HTMLElement;
  const rect = html.getBoundingClientRect?.();
  const style = html.ownerDocument?.defaultView?.getComputedStyle(html);
  return {
    element: `${element.tagName.toLowerCase()}${html.id ? `#${html.id}` : ""}${html.dataset?.testid ? `[data-testid=${html.dataset.testid}]` : ""}`,
    disabled: "disabled" in html ? Boolean((html as HTMLButtonElement).disabled) : undefined,
    pointerEvents: style?.pointerEvents,
    visibility: style?.visibility,
    display: style?.display,
    left: rect ? Math.round(rect.left) : undefined,
    top: rect ? Math.round(rect.top) : undefined,
    right: rect ? Math.round(rect.right) : undefined,
    bottom: rect ? Math.round(rect.bottom) : undefined,
    width: rect ? Math.round(rect.width) : undefined,
    height: rect ? Math.round(rect.height) : undefined,
  };
}

function readEntries(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function teacherDiag(label: string, data: DiagnosticData = {}): void {
  const entry = `[Noor/TeacherTouch] ${label} ${JSON.stringify(data)}`;
  console.log(entry);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...readEntries(), entry].slice(-MAX_ENTRIES)));
  } catch {
    // Diagnostic persistence must never affect the Teacher flow.
  }
}

export function describeTouchEvent(event: Event, button: HTMLButtonElement | null): DiagnosticData {
  const pointer = event as PointerEvent;
  const touch = event as TouchEvent;
  const x = typeof pointer.clientX === "number" ? pointer.clientX : touch.touches?.[0]?.clientX;
  const y = typeof pointer.clientY === "number" ? pointer.clientY : touch.touches?.[0]?.clientY;
  const hit = typeof x === "number" && typeof y === "number"
    ? document.elementFromPoint(x, y)
    : null;
  return {
    type: event.type,
    cancelable: event.cancelable,
    defaultPrevented: event.defaultPrevented,
    target: describeElement(event.target as Element | null).element as string | null,
    hitTest: describeElement(hit).element as string | null,
    button: describeElement(button).element as string | null,
    buttonDisabled: button?.disabled,
    buttonPointerEvents: button ? getComputedStyle(button).pointerEvents : undefined,
    clientX: x,
    clientY: y,
  };
}

export function installTeacherTouchDiagnostics(
  button: HTMLButtonElement | null,
  context: { lessonId: string; phase: string },
): () => void {
  teacherDiag("lesson touch diagnostics installed", {
    lessonId: context.lessonId,
    phase: context.phase,
    button: describeElement(button).element as string | null,
    buttonDisabled: button?.disabled,
    buttonPointerEvents: button ? getComputedStyle(button).pointerEvents : undefined,
    topAtButtonCenter: button
      ? describeElement(document.elementFromPoint(
          button.getBoundingClientRect().left + button.getBoundingClientRect().width / 2,
          button.getBoundingClientRect().top + button.getBoundingClientRect().height / 2,
        )).element as string | null
      : null,
  });

  const eventTypes = ["pointerdown", "touchstart", "pointerup", "touchend", "click"];
  const onEvent = (event: Event) => {
    teacherDiag(`DOM capture ${event.type}`, describeTouchEvent(event, button));
  };
  const onWindowError = (event: ErrorEvent) => {
    teacherDiag("window error", {
      message: event.message,
      filename: event.filename,
      line: event.lineno,
      column: event.colno,
    });
  };
  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    teacherDiag("unhandled rejection", { reason: String(event.reason) });
  };

  eventTypes.forEach((type) => document.addEventListener(type, onEvent, true));
  window.addEventListener("error", onWindowError);
  window.addEventListener("unhandledrejection", onUnhandledRejection);

  const onButtonEvent = (event: Event) => {
    teacherDiag(`button native listener ${event.type}`, describeTouchEvent(event, button));
  };
  if (button) eventTypes.forEach((type) => button.addEventListener(type, onButtonEvent));

  return () => {
    eventTypes.forEach((type) => document.removeEventListener(type, onEvent, true));
    window.removeEventListener("error", onWindowError);
    window.removeEventListener("unhandledrejection", onUnhandledRejection);
    if (button) eventTypes.forEach((type) => button.removeEventListener(type, onButtonEvent));
    teacherDiag("lesson touch diagnostics removed", { lessonId: context.lessonId, phase: context.phase });
  };
}