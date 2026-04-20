"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/auth/AuthProvider";
import UserAvatar from "@/components/ui/UserAvatar";

export default function MessagesPage() {
  const { user, profile } = useAuth();
  const metadata = user?.user_metadata as Record<string, unknown> | undefined;
  const resolvedGooglePhotoUrl =
    profile?.googlePhotoUrl ?? (metadata?.avatar_url as string | undefined) ?? null;
  const resolvedDisplayName = profile?.displayName ?? user?.email ?? null;
  const resolvedEmail = profile?.email ?? user?.email ?? null;

  return (
    <ProtectedRoute>
      <div className="py-8">
        <div className="flex items-center gap-3">
          {user ? (
            <UserAvatar
              avatarUrl={profile?.avatarUrl ?? null}
              googlePhotoUrl={resolvedGooglePhotoUrl}
              displayName={resolvedDisplayName}
              email={resolvedEmail}
              size={36}
            />
          ) : null}
          <h1 className="text-2xl font-semibold text-slate-900">Messages</h1>
        </div>
        <p className="mt-2 text-sm text-slate-500">Your conversations will appear here.</p>
      </div>
    </ProtectedRoute>
  );
}
