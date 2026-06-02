"use client";

import * as React from "react";
import type { Session, User } from "@supabase/supabase-js";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { runtimeLog } from "@/lib/diagnostics/runtimeLog";
import type { AvatarData, UserProfile } from "@/types/user";

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  avatarData: AvatarData | null;
  loading: boolean;
  profileLoading: boolean;
  refreshProfile: () => Promise<void>;
};

const isMissingProfileError = (error: {
  code?: string | null;
  status?: number | null;
}) => error.code === "PGRST116" || error.status === 406;

const formatProfileError = (error: {
  message?: string | null;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
  status?: number | null;
}) => ({
  message: error.message ?? null,
  details: error.details ?? null,
  hint: error.hint ?? null,
  code: error.code ?? null,
  status: error.status ?? null,
});

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);
let authProviderRenderCount = 0;

type AuthProviderProps = {
  children: React.ReactNode;
  /**
   * Server-resolved Supabase user, read from auth cookies via
   * `createSupabaseServerClient` in the root layout. The root layout always
   * resolves this synchronously (either a `User` or `null`), so the provider
   * starts with `loading=false` — we already know the authoritative answer.
   *
   * The client still calls `getSession()` + `onAuthStateChange` below for
   * reactivity (login/logout during the same tab), but those run silently
   * in the background and never trigger a blank-while-loading phase.
   *
   * This eliminates the protected-route flash where every dashboard/messages/
   * publish page used to render `null` while `getSession()` resolved.
   */
  initialUser?: User | null;
};

export function AuthProvider({ children, initialUser = null }: AuthProviderProps) {
  const DEV = process.env.NODE_ENV !== "production";
  const renderCount = ++authProviderRenderCount;

  const [user, setUser] = React.useState<User | null>(initialUser);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [avatarData, setAvatarData] = React.useState<AvatarData | null>(null);
  // If the root layout resolved a user from SSR cookies, auth is immediately
  // known — loading stays false. If initialUser is null (common on mobile
  // when SSR cookie resolution fails), we don't know yet whether the user is
  // logged in. Set loading=true so ProtectedRoute doesn't fire a redirect
  // while onAuthStateChange/getSession is still resolving, which was the
  // root cause of the mobile "chat → list bounce" on hard refresh.
  const [loading, setLoading] = React.useState(initialUser == null);
  const [profileLoading, setProfileLoading] = React.useState(true);
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);
  const latestProfileRef = React.useRef<UserProfile | null>(null);
  const latestAvatarDataRef = React.useRef<AvatarData | null>(null);
  const userRef = React.useRef<User | null>(user);

  if (DEV) {
    console.debug("[mount-trace] AuthProvider render", {
      renderCount,
      userId: user?.id ?? null,
      loading,
      profileLoading,
      hasProfile: Boolean(profile),
      hasAvatarData: Boolean(avatarData),
    });
    if (typeof performance !== "undefined") {
      performance.mark(`AuthProvider:render:${renderCount}`);
    }
  }

  React.useEffect(() => {
    if (!DEV) return;
    console.debug("[mount-trace] AuthProvider mount");
    return () => {
      console.debug("[mount-trace] AuthProvider unmount");
    };
  }, [DEV]);

  React.useEffect(() => {
    latestProfileRef.current = profile;
  }, [profile]);

  React.useEffect(() => {
    latestAvatarDataRef.current = avatarData;
  }, [avatarData]);

  React.useEffect(() => {
    userRef.current = user;
  }, [user]);

  React.useEffect(() => {
    let isMounted = true;
    // getSession() is the authoritative signal for "no session". onAuthStateChange
    // can fire INITIAL_SESSION with null while a token refresh is still pending
    // (e.g., expired JWT on mobile). We should not clear loading — and risk
    // triggering a ProtectedRoute redirect — until getSession confirms the state.
    let getSessionResolved = false;

    supabase.auth.getSession().then((result: { data: { session: Session | null } }) => {
      if (!isMounted) return;
      getSessionResolved = true;
      if (DEV) {
        console.debug("[DIAG:auth] getSession resolved", {
          userId: result.data.session?.user?.id ?? null,
          hadInitialUser: Boolean(initialUser),
        });
      }
      setUser(result.data.session?.user ?? null);
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        if (!isMounted) return;
        if (DEV) {
          console.debug("[mount-trace] AuthProvider onAuthStateChange", {
            event: _event,
            nextUserId: session?.user?.id ?? null,
            getSessionResolved,
            hadProfile: Boolean(latestProfileRef.current),
            hadAvatarData: Boolean(latestAvatarDataRef.current),
          });
          if (typeof performance !== "undefined") {
            performance.mark(`AuthProvider:onAuthStateChange:${_event}`);
          }
        }
        runtimeLog("AUTH STATE CHANGE", {
          event: _event,
          nextUserId: session?.user?.id ?? null,
        });

        if (!session?.user) {
          if (DEV) {
            console.debug("[mount-trace] AuthProvider logout cache clear", {
              event: _event,
              previousProfileAvatarUrl: latestProfileRef.current?.avatarUrl ?? null,
              previousAvatarDataUrl: latestAvatarDataRef.current?.avatarUrl ?? null,
            });
          }
          runtimeLog("LOGOUT CACHE CLEAR", {
            userId: null,
            previousProfileAvatarUrl: latestProfileRef.current?.avatarUrl ?? null,
            previousAvatarDataUrl: latestAvatarDataRef.current?.avatarUrl ?? null,
            profileCleared: true,
            avatarCleared: true,
          });
          setProfile(null);
          setAvatarData(null);
          setProfileLoading(false);
        }

        setUser(session?.user ?? null);
        // Only clear the loading gate when we have a confirmed user (non-null), or
        // after getSession has already resolved (so its definitive null is safe to use).
        // This prevents a null INITIAL_SESSION from clearing loading before getSession
        // has finished — which was the trigger for the mobile ProtectedRoute bounce.
        if (session?.user || getSessionResolved) {
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, [DEV, initialUser, supabase]);

  const refreshProfile = React.useCallback(async () => {
    const user = userRef.current;
    if (!user) {
      setProfile(null);
      setAvatarData(null);
      setProfileLoading(false);
      return;
    }

    const metadata = user.user_metadata as Record<string, unknown> | undefined;
    const fallbackGooglePhotoUrl =
      (metadata?.picture as string | undefined) ??
      null;

    setProfileLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, email, display_name, role, phone, city, county, area, is_business_seller, company_name, business_address, vat_number, website, company_registration_number, avatar_url, google_photo_url, language, email_notifications, marketplace_alerts, message_notifications, created_at, updated_at"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      if (!isMissingProfileError(error)) {
        console.warn("Failed to load user profile", formatProfileError(error));
      }
      setProfile(null);
      setAvatarData(null);
      setProfileLoading(false);
      return;
    }

    const googlePhotoUrl = data?.google_photo_url ?? fallbackGooglePhotoUrl;
    const displayName = data?.display_name ?? null;
    const email = data?.email ?? user.email ?? null;

    setProfile({
      uid: data?.id ?? user.id,
      role: data?.role ?? "user",
      displayName,
      email,
      phone: data?.phone ?? null,
      city: data?.city ?? null,
      county: data?.county ?? null,
      area: data?.area ?? null,
      businessSeller: data?.is_business_seller ?? null,
      companyName: data?.company_name ?? null,
      businessAddress: data?.business_address ?? null,
      vatNumber: data?.vat_number ?? null,
      website: data?.website ?? null,
      registrationNumber: data?.company_registration_number ?? null,
      avatarUrl: data?.avatar_url ?? null,
      googlePhotoUrl,
      language: data?.language ?? "en",
      emailNotifications: data?.email_notifications ?? true,
      marketplaceAlerts: data?.marketplace_alerts ?? true,
      messageNotifications: data?.message_notifications ?? true,
      createdAt: data?.created_at ?? null,
      updatedAt: data?.updated_at ?? null,
    } as UserProfile);
    setAvatarData({
      avatarUrl: data?.avatar_url ?? null,
      googlePhotoUrl,
      displayName,
      email,
    });
    setProfileLoading(false);
  }, [supabase]);

  React.useEffect(() => {
    if (!user?.id) return;
    let isMounted = true;

    queueMicrotask(() => {
      if (!isMounted) return;
      void refreshProfile();
    });

    return () => {
      isMounted = false;
    };
  }, [refreshProfile, user?.id]);

  const value = React.useMemo(
    () => ({ user, profile, avatarData, loading, profileLoading, refreshProfile }),
    [user, profile, avatarData, loading, profileLoading, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
