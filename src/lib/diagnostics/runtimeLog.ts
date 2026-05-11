"use client";

type RuntimeLogPayload = Record<string, unknown>;

type RuntimeLogEntry = {
  event: string;
  payload: RuntimeLogPayload;
  at: string;
};

const SESSION_KEY = "diag:runtime-logs";
const MAX_ENTRIES = 250;

function safeReadSessionLogs(): RuntimeLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RuntimeLogEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWriteSessionLogs(entries: RuntimeLogEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    // ignore diagnostics write failures
  }
}

export function runtimeLog(event: string, payload: RuntimeLogPayload) {
  const entry: RuntimeLogEntry = {
    event,
    payload,
    at: new Date().toISOString(),
  };

  console.info(event, payload);

  if (typeof window === "undefined") return;

  const nextEntries = [...safeReadSessionLogs(), entry].slice(-MAX_ENTRIES);
  safeWriteSessionLogs(nextEntries);

  const body = JSON.stringify(entry);

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/diagnostics/runtime-logs", blob);
      return;
    }
  } catch {
    // ignore and fallback to fetch
  }

  void fetch("/api/diagnostics/runtime-logs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // ignore diagnostics transport failures
  });
}

export function clearRuntimeLogs() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}
