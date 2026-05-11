import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RuntimeLogEntry = {
  event: string;
  payload: Record<string, unknown>;
  at: string;
};

declare global {
  var __runtimeDiagnosticsLogBuffer: RuntimeLogEntry[] | undefined;
}

const MAX_BUFFER = 500;

function getBuffer(): RuntimeLogEntry[] {
  if (!globalThis.__runtimeDiagnosticsLogBuffer) {
    globalThis.__runtimeDiagnosticsLogBuffer = [];
  }
  return globalThis.__runtimeDiagnosticsLogBuffer;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RuntimeLogEntry;
    if (!body || typeof body.event !== "string") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const buffer = getBuffer();
    buffer.push({
      event: body.event,
      payload: body.payload ?? {},
      at: body.at ?? new Date().toISOString(),
    });

    if (buffer.length > MAX_BUFFER) {
      buffer.splice(0, buffer.length - MAX_BUFFER);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

export async function GET() {
  const buffer = getBuffer();
  return NextResponse.json({ logs: buffer });
}

export async function DELETE() {
  globalThis.__runtimeDiagnosticsLogBuffer = [];
  return NextResponse.json({ ok: true });
}
