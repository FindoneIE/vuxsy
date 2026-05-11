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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [avatarData, setAvatarData] = React.useState<AvatarData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [profileLoading, setProfileLoading] = React.useState(true);
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);
  const latestProfileRef = React.useRef<UserProfile | null>(null);
  const latestAvatarDataRef = React.useRef<AvatarData | null>(null);

  React.useEffect(() => {
    latestProfileRef.current = profile;
  }, [profile]);

  React.useEffect(() => {
    latestAvatarDataRef.current = avatarData;
  }, [avatarData]);

  React.useEffect(() => {
    let isMounted = true;

  supabase.auth.getSession().then((result: { data: { session: Session | null } }) => {
      if (!isMounted) return;
      setUser(result.data.session?.user ?? null);
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        if (!isMounted) return;
        runtimeLog("AUTH STATE CHANGE", {
          event: _event,
          nextUserId: session?.user?.id ?? null,
        });

        if (!session?.user) {
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
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  const refreshProfile = React.useCallback(async () => {
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

    console.info("TEMP LOG: fetched profile row", data);

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
  }, [supabase, user]);

  React.useEffect(() => {
    let isMounted = true;
    if (!user) return;

    queueMicrotask(() => {
      if (!isMounted) return;
      void refreshProfile();
    });

    return () => {
      isMounted = false;
    };
  }, [refreshProfile, user]);

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
