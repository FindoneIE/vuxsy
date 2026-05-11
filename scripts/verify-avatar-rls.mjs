import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env.local");
const envRaw = fs.readFileSync(envPath, "utf8");

for (const line of envRaw.split(/\r?\n/)) {
  if (!line || line.trim().startsWith("#")) continue;
  const idx = line.indexOf("=");
  if (idx === -1) continue;
  const key = line.slice(0, idx).trim();
  const value = line.slice(idx + 1).trim();
  if (!(key in process.env)) process.env[key] = value;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

const bucket = "uploads";

function makeClient() {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function ensureAuthClient(label) {
  const email = `avatar-rls-${label}-${Date.now()}@example.com`;
  const password = "TestPass123!";
  const client = makeClient();

  const signUp = await client.auth.signUp({ email, password });
  if (signUp.error) {
    throw new Error(`${label}: signUp failed -> ${signUp.error.message}`);
  }

  // Try password login (works when email confirmation is not required)
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (!signIn.error && signIn.data.session) {
    const uid = signIn.data.user?.id;
    if (!uid) throw new Error(`${label}: signed in but no uid`);
    return { client, email, uid };
  }

  // Fallback to signup session if available
  const fallbackUid = signUp.data.user?.id;
  const fallbackSession = signUp.data.session;
  if (fallbackUid && fallbackSession) {
    const { error: setSessionError } = await client.auth.setSession({
      access_token: fallbackSession.access_token,
      refresh_token: fallbackSession.refresh_token,
    });
    if (setSessionError) {
      throw new Error(`${label}: failed to use signup session -> ${setSessionError.message}`);
    }
    return { client, email, uid: fallbackUid };
  }

  throw new Error(
    `${label}: could not establish authenticated session (email confirmation may be required)`
  );
}

function bytesFrom(text) {
  return new TextEncoder().encode(text);
}

async function main() {
  const results = [];

  const userA = await ensureAuthClient("a");
  const userB = await ensureAuthClient("b");

  const pathA = `avatars/${userA.uid}/avatar.webp`;
  const pathB = `avatars/${userB.uid}/avatar.webp`;

  const uploadA = await userA.client.storage.from(bucket).upload(pathA, bytesFrom("avatar-a-v1"), {
    contentType: "image/webp",
    upsert: true,
  });
  results.push({ test: "userA upload own", ok: !uploadA.error, error: uploadA.error?.message ?? null });

  const replaceA = await userA.client.storage.from(bucket).upload(pathA, bytesFrom("avatar-a-v2"), {
    contentType: "image/webp",
    upsert: true,
  });
  results.push({ test: "userA replace own", ok: !replaceA.error, error: replaceA.error?.message ?? null });

  const uploadB = await userB.client.storage.from(bucket).upload(pathB, bytesFrom("avatar-b-v1"), {
    contentType: "image/webp",
    upsert: true,
  });
  results.push({ test: "userB upload own", ok: !uploadB.error, error: uploadB.error?.message ?? null });

  const crossWrite = await userA.client.storage.from(bucket).upload(pathB, bytesFrom("hijack"), {
    contentType: "image/webp",
    upsert: true,
  });
  results.push({
    test: "userA cannot write userB path",
    ok: Boolean(crossWrite.error),
    error: crossWrite.error?.message ?? null,
  });

  const removeA = await userA.client.storage.from(bucket).remove([pathA]);
  results.push({ test: "userA remove own", ok: !removeA.error, error: removeA.error?.message ?? null });

  const crossDelete = await userA.client.storage.from(bucket).remove([pathB]);
  results.push({
    test: "userA cannot delete userB path",
    ok: Boolean(crossDelete.error),
    error: crossDelete.error?.message ?? null,
  });

  const anonClient = makeClient();
  const anonUpload = await anonClient.storage
    .from(bucket)
    .upload(`avatars/${userA.uid}/anon.webp`, bytesFrom("anon-write"), {
      contentType: "image/webp",
      upsert: true,
    });
  results.push({
    test: "anonymous cannot upload",
    ok: Boolean(anonUpload.error),
    error: anonUpload.error?.message ?? null,
  });

  // Public-read check from existing uploaded avatar of userB.
  const publicUrl = anonClient.storage.from(bucket).getPublicUrl(pathB).data.publicUrl;
  const publicFetch = await fetch(publicUrl, { method: "GET" });
  results.push({
    test: "public read behavior",
    ok: publicFetch.ok,
    status: publicFetch.status,
    url: publicUrl,
  });

  console.log(JSON.stringify({
    userA: { uid: userA.uid, email: userA.email },
    userB: { uid: userB.uid, email: userB.email },
    results,
  }, null, 2));
}

main().catch((error) => {
  console.error("VERIFY_AVATAR_RLS_FAILED", error);
  process.exit(1);
});
