import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const resolveGooglePhotoUrl = (user: User) => {
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  return (metadata?.picture as string | undefined) ?? null;
};

const resolveDisplayName = (user: User, fallback?: string | null) => {
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  return (
    (metadata?.name as string | undefined) ??
    fallback ??
    null
  );
};

const ensureUserProfile = async (user: User, displayName?: string | null) => {
  if (!user?.id) return;
  const supabase = createSupabaseBrowserClient();
  const { data: existing, error: fetchError } = await supabase
    .from("profiles")
    .select("id, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  const createdAt = user.created_at ? new Date(user.created_at).toISOString() : null;
  const googlePhotoUrl = resolveGooglePhotoUrl(user);
  const existingAvatarUrl = existing?.avatar_url ?? null;
  const avatarSource = existingAvatarUrl
    ? "custom"
    : googlePhotoUrl
      ? "google"
      : "initials";
  const resolvedDisplayName = resolveDisplayName(user, displayName);
  const now = new Date().toISOString();

  if (!existing) {
    const { error } = await supabase.from("profiles").insert({
      id: user.id,
      display_name: resolvedDisplayName,
      email: user.email ?? null,
      avatar_url: null,
      google_photo_url: googlePhotoUrl,
      avatar_source: avatarSource,
      created_at: createdAt ?? now,
      updated_at: now,
    });

    if (error) {
      throw error;
    }
    return;
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: resolvedDisplayName,
      email: user.email ?? null,
      google_photo_url: googlePhotoUrl,
      avatar_source: avatarSource,
      updated_at: now,
    })
    .eq("id", user.id);

  if (error) {
    throw error;
  }
};

export const signUpWithEmail = async (
  email: string,
  password: string,
  firstName?: string
) => {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName ?? null,
      },
    },
  });

  if (error) {
    throw error;
  }

  if (data.user) {
    await ensureUserProfile(data.user, firstName ?? null);
  }

  return data.user;
};

export const signInWithEmail = async (email: string, password: string) => {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  if (data.user) {
    await ensureUserProfile(data.user);
  }

  return data.user;
};

export const signInWithGoogle = async (redirectTo?: string) => {
  const supabase = createSupabaseBrowserClient();
  const callbackUrl = `${window.location.origin}/auth/callback`;
  const resolvedRedirect = redirectTo
    ? `${callbackUrl}?redirect=${encodeURIComponent(redirectTo)}`
    : callbackUrl;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: resolvedRedirect,
    },
  });

  if (error) {
    throw error;
  }

  return data;
};

export const logOut = async () => {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
};
