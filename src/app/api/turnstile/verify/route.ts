import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    console.warn("TURNSTILE_SECRET_KEY is not configured — CAPTCHA verification skipped");
    return NextResponse.json(
      { success: false, error: "captcha-not-configured" },
      { status: 503 }
    );
  }

  let token: string | null = null;

  try {
    const body = await request.json() as { token?: unknown };
    token = typeof body.token === "string" ? body.token.trim() : null;
  } catch {
    return NextResponse.json(
      { success: false, error: "invalid-request-body" },
      { status: 400 }
    );
  }

  if (!token) {
    return NextResponse.json(
      { success: false, error: "missing-token" },
      { status: 400 }
    );
  }

  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    undefined;

  const verifyBody = new URLSearchParams({ secret: secretKey, response: token });
  if (ip) verifyBody.set("remoteip", ip);

  let cfData: { success: boolean; "error-codes"?: string[] };

  try {
    const cfResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: verifyBody.toString(),
      }
    );

    if (!cfResponse.ok) {
      console.error("Turnstile upstream error", { status: cfResponse.status });
      return NextResponse.json(
        { success: false, error: "upstream-error" },
        { status: 502 }
      );
    }

    cfData = (await cfResponse.json()) as { success: boolean; "error-codes"?: string[] };
  } catch (err) {
    console.error("Turnstile fetch failed", err);
    return NextResponse.json(
      { success: false, error: "upstream-unreachable" },
      { status: 502 }
    );
  }

  if (!cfData.success) {
    const codes = (cfData["error-codes"] ?? []).join(",");
    console.warn("Turnstile verification failed", { codes });
    return NextResponse.json(
      { success: false, error: codes || "verification-failed" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
