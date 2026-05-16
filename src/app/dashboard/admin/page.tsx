import { revalidatePath, unstable_cache } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ListingType } from "@/types/listing";
import AdminModerationClient from "@/components/admin/AdminModerationClient";

// Opt out of prerendering: this page renders AdminModerationClient which uses
// useSearchParams(). The root src/app/loading.tsx Suspense boundary was
// removed (Fix 1). Admin is auth-gated so dynamic is the correct mode anyway.
export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "info@vuxsy.com";

type ListingReport = {
  id: string;
  listing_id: string;
  user_id: string;
  reason: string;
  details?: string | null;
  created_at: string;
  status?: string | null;
};

type ProfileRow = {
  id: string;
  email: string | null;
  role?: string | null;
  created_at?: string | null;
  is_banned?: boolean | null;
};

type ListingRow = {
  id: string;
  title: string | null;
  user_id: string | null;
  created_at: string | null;
  promotion_status: string | null;
  status: string | null;
};

type ReportListingRow = {
  id: string;
  title: string | null;
  listing_type: ListingType | null;
  category_id: string | null;
};

type ConversationRow = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

type AdminAuditLog = {
  id: string;
  actor_id: string | null;
  actor_email?: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
};

async function getAdminUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return null;
  }

  const normalizedEmail = data.user.email?.trim().toLowerCase();
  if (normalizedEmail !== ADMIN_EMAIL) {
    return null;
  }

  return data.user;
}

async function getModeratorUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return null;
  }

  const normalizedEmail = data.user.email?.trim().toLowerCase();
  if (normalizedEmail !== ADMIN_EMAIL) {
    return null;
  }

  return { user: data.user, role: "admin" as const };
}

async function requireAdmin() {
  const user = await getAdminUser();
  if (!user) {
    redirect("/dashboard/listings");
  }
  return user;
}

async function requireModerator() {
  const user = await getModeratorUser();
  if (!user) {
    redirect("/dashboard/listings");
  }
  return user;
}

async function logAdminAction(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  entry: {
    actorId: string;
    actorEmail?: string | null;
    action: string;
    targetType?: string | null;
    targetId?: string | null;
    details?: Record<string, unknown> | null;
    metadata?: Record<string, unknown> | null;
  }
) {
  try {
    await adminClient.from("admin_audit_logs").insert({
      actor_id: entry.actorId,
      actor_email: entry.actorEmail ?? null,
      action: entry.action,
      target_type: entry.targetType ?? null,
      target_id: entry.targetId ?? null,
      details: entry.details ?? null,
      metadata: entry.metadata ?? null,
    });
  } catch (error) {
    console.error("ADMIN AUDIT LOG ERROR", error);
  }
}

const loadAdminDataCached = unstable_cache(
  async (adminUserId: string, currentRole: "admin" | "moderator") => {
    const adminClient = createSupabaseAdminClient();
  const debugLogs =
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_DEBUG_LOGS === "true";

  const { data: reports, error: reportsError } = await adminClient
    .from("reports")
    .select("id, listing_id, user_id, reason, details, created_at, status")
    .order("created_at", { ascending: false })
    .limit(100);

  if (reportsError) {
    console.error("ADMIN REPORTS FETCH ERROR", reportsError);
    throw new Error(reportsError.message);
  }

  if (debugLogs) {
    console.log("ADMIN REPORTS FETCH RESULT", reports ?? []);
  }

  const reportListingIds = (reports ?? []).map((report) => report.listing_id);
  const reportUserIds = (reports ?? []).map((report) => report.user_id);

  const { data: reportListings } = await adminClient
    .from("listings")
    .select("id, title, listing_type, category_id")
    .in("id", reportListingIds);

  const { data: reportProfiles } = await adminClient
    .from("profiles")
    .select("id, email")
    .in("id", reportUserIds as string[]);

  const listingMetaById = Object.fromEntries(
    (reportListings as ReportListingRow[] | null | undefined)?.map((listing) => [
      listing.id,
      {
        title: listing.title,
        listing_type: listing.listing_type,
        category_id: listing.category_id,
      },
    ]) ?? []
  );
  const reporterEmailById = Object.fromEntries(
    (reportProfiles ?? []).map((profile) => [profile.id, profile.email])
  );

  const { count: profilesCount, error: profilesCountError } = await adminClient
    .from("profiles")
    .select("id", { count: "exact", head: true });

  if (profilesCountError) {
    console.error("ADMIN PROFILES COUNT ERROR", profilesCountError);
  }

  const { data: profiles, error: profilesError } = await adminClient
    .from("profiles")
    .select("id, email, role")
    .order("email");

  if (profilesError) {
    console.error("ADMIN PROFILES FETCH ERROR", profilesError);
  }

  const profileIds = (profiles ?? []).map((profile) => profile.id);
  const profileEmailById = Object.fromEntries(
    (profiles ?? []).map((profile) => [profile.id, profile.email])
  );
  const listingCounts: Record<string, number> = {};
  if (profileIds.length > 0) {
    const { data: listingRows } = await adminClient
      .from("listings")
      .select("user_id")
      .in("user_id", profileIds);
    (listingRows ?? []).forEach((row) => {
      const userId = row.user_id as string | null;
      if (!userId) return;
      listingCounts[userId] = (listingCounts[userId] ?? 0) + 1;
    });
  }

  const { data: listings } = await adminClient
    .from("listings")
    .select("id, title, user_id, created_at, promotion_status, status")
    .order("created_at", { ascending: false })
    .limit(200);

  const { data: conversations } = await adminClient
    .from("conversations")
    .select("id, listing_id, buyer_id, seller_id, last_message, last_message_at, created_at")
    .order("last_message_at", { ascending: false })
    .limit(50);

  const conversationIds = (conversations ?? []).map((conversation) => conversation.id);
  let messages: MessageRow[] = [];
  if (conversationIds.length > 0) {
    const { data: messageRows } = await adminClient
      .from("messages")
      .select("id, conversation_id, sender_id, body, created_at")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false })
      .limit(200);
    messages = (messageRows ?? []) as MessageRow[];
  }

  const normalizedReports = (reports ?? []).map((report) => ({
    ...report,
    status: report.status ?? "pending",
  }));
  const pendingReportsCount = normalizedReports.filter(
    (report) => report.status === "pending"
  ).length;

  const { data: auditLogs, error: auditLogsError } = await adminClient
    .from("admin_audit_logs")
    .select("id, actor_id, actor_email, action, target_type, target_id, details, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (auditLogsError) {
    console.error("ADMIN AUDIT LOG FETCH ERROR", auditLogsError);
  }

    return {
    reports: normalizedReports as ListingReport[],
  pendingReportsCount,
    profiles: (profiles ?? []) as ProfileRow[],
    profilesCount: profilesCount ?? profiles?.length ?? 0,
    listings: (listings ?? []) as ListingRow[],
    listingCounts,
    conversations: (conversations ?? []) as ConversationRow[],
    messages,
    listingMetaById,
    reporterEmailById,
    profileEmailById,
    auditLogs: (auditLogs ?? []) as AdminAuditLog[],
      currentRole,
    };
  },
  ["admin-dashboard-data"],
  { revalidate: 30 }
);

async function loadAdminData() {
  const adminUser = await getModeratorUser();
  if (!adminUser) {
    redirect("/dashboard");
  }
  return loadAdminDataCached(adminUser.user.id, adminUser.role);
}

async function deleteListingAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const adminClient = createSupabaseAdminClient();
  const listingId = String(formData.get("listingId") ?? "");
  if (!listingId) return;
  await adminClient.from("listings").delete().eq("id", listingId);
  await adminClient.from("reports").update({ status: "reviewed" }).eq("listing_id", listingId);
  await logAdminAction(adminClient, {
    actorId: user.id,
    actorEmail: user.email ?? null,
    action: "delete_listing",
    targetType: "listing",
    targetId: listingId,
  });
  revalidatePath("/dashboard/admin");
}

async function ignoreReportAction(formData: FormData) {
  "use server";
  const user = await requireModerator();
  const adminClient = createSupabaseAdminClient();
  const reportId = String(formData.get("reportId") ?? "");
  if (!reportId) return;
  await adminClient.from("reports").update({ status: "ignored" }).eq("id", reportId);
  await logAdminAction(adminClient, {
    actorId: user.user.id,
    actorEmail: user.user.email ?? null,
    action: "ignore_report",
    targetType: "report",
    targetId: reportId,
    details: { reportId },
  });
  revalidatePath("/dashboard/admin");
}

async function deleteReportAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const adminClient = createSupabaseAdminClient();
  const reportId = String(formData.get("reportId") ?? "");
  if (!reportId) return;
  await adminClient.from("reports").delete().eq("id", reportId);
  await logAdminAction(adminClient, {
    actorId: user.id,
    actorEmail: user.email ?? null,
    action: "delete_report",
    targetType: "report",
    targetId: reportId,
    details: { reportId },
  });
  revalidatePath("/dashboard/admin");
}

async function warnUserAction(formData: FormData) {
  "use server";
  const user = await requireModerator();
  const adminClient = createSupabaseAdminClient();
  const userId = String(formData.get("userId") ?? "");
  const reason = String(formData.get("reason") ?? "Admin warning");
  if (!userId) return;
  await adminClient.from("user_warnings").insert({
    user_id: userId,
    reason,
    created_by: user.user.id,
  });
  const reportId = String(formData.get("reportId") ?? "");
  if (reportId) {
    await adminClient.from("reports").update({ status: "reviewed" }).eq("id", reportId);
  }
  await logAdminAction(adminClient, {
    actorId: user.user.id,
    actorEmail: user.user.email ?? null,
    action: "warn_user",
    targetType: "user",
    targetId: userId,
    details: reportId ? { reportId, reason } : { reason },
  });
  revalidatePath("/dashboard/admin");
}

async function banUserAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const adminClient = createSupabaseAdminClient();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return;
  await adminClient.from("profiles").update({ is_banned: true, banned_at: new Date().toISOString() }).eq("id", userId);
  await logAdminAction(adminClient, {
    actorId: user.id,
    actorEmail: user.email ?? null,
    action: "ban_user",
    targetType: "user",
    targetId: userId,
  });
  revalidatePath("/dashboard/admin");
}

async function deleteUserAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const adminClient = createSupabaseAdminClient();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return;
  await adminClient.from("listings").delete().eq("user_id", userId);
  await adminClient.from("profiles").delete().eq("id", userId);
  await logAdminAction(adminClient, {
    actorId: user.id,
    action: "delete_user",
    targetType: "user",
    targetId: userId,
  });
  revalidatePath("/dashboard/admin");
}

async function deactivateListingAction(formData: FormData) {
  "use server";
  const user = await requireModerator();
  const adminClient = createSupabaseAdminClient();
  const listingId = String(formData.get("listingId") ?? "");
  if (!listingId) return;
  await adminClient.from("listings").update({ status: "paused" }).eq("id", listingId);
  await logAdminAction(adminClient, {
    actorId: user.user.id,
    action: "deactivate_listing",
    targetType: "listing",
    targetId: listingId,
  });
  revalidatePath("/dashboard/admin");
}

async function removePromotionAction(formData: FormData) {
  "use server";
  const user = await requireModerator();
  const adminClient = createSupabaseAdminClient();
  const listingId = String(formData.get("listingId") ?? "");
  if (!listingId) return;
  await adminClient
    .from("listings")
    .update({ promotion_status: "cancelled", promoted_until: null, promotion_weight: 0 })
    .eq("id", listingId);
  await logAdminAction(adminClient, {
    actorId: user.user.id,
    action: "remove_promotion",
    targetType: "listing",
    targetId: listingId,
  });
  revalidatePath("/dashboard/admin");
}

async function bulkResolveReportsAction(reportIds: string[]) {
  "use server";
  const user = await requireModerator();
  if (!reportIds.length) return;
  const adminClient = createSupabaseAdminClient();
  await adminClient.from("reports").update({ status: "reviewed" }).in("id", reportIds);
  await logAdminAction(adminClient, {
    actorId: user.user.id,
    action: "bulk_resolve_reports",
    targetType: "report",
    metadata: { count: reportIds.length },
  });
  revalidatePath("/dashboard/admin");
}

async function bulkIgnoreReportsAction(reportIds: string[]) {
  "use server";
  const user = await requireModerator();
  if (!reportIds.length) return;
  const adminClient = createSupabaseAdminClient();
  await adminClient.from("reports").update({ status: "ignored" }).in("id", reportIds);
  await logAdminAction(adminClient, {
    actorId: user.user.id,
    action: "bulk_ignore_reports",
    targetType: "report",
    metadata: { count: reportIds.length },
  });
  revalidatePath("/dashboard/admin");
}

async function bulkWarnUsersAction(userIds: string[]) {
  "use server";
  const user = await requireModerator();
  if (!userIds.length) return;
  const adminClient = createSupabaseAdminClient();
  await adminClient.from("user_warnings").insert(
    userIds.map((userId) => ({
      user_id: userId,
      reason: "Admin warning",
      created_by: user.user.id,
    }))
  );
  await logAdminAction(adminClient, {
    actorId: user.user.id,
    action: "bulk_warn_users",
    targetType: "user",
    metadata: { count: userIds.length },
  });
  revalidatePath("/dashboard/admin");
}

async function bulkBanUsersAction(userIds: string[]) {
  "use server";
  const user = await requireAdmin();
  if (!userIds.length) return;
  const adminClient = createSupabaseAdminClient();
  await adminClient
    .from("profiles")
    .update({ is_banned: true, banned_at: new Date().toISOString() })
    .in("id", userIds);
  await logAdminAction(adminClient, {
    actorId: user.id,
    action: "bulk_ban_users",
    targetType: "user",
    metadata: { count: userIds.length },
  });
  revalidatePath("/dashboard/admin");
}

async function bulkDeactivateListingsAction(listingIds: string[]) {
  "use server";
  const user = await requireModerator();
  if (!listingIds.length) return;
  const adminClient = createSupabaseAdminClient();
  await adminClient.from("listings").update({ status: "paused" }).in("id", listingIds);
  await logAdminAction(adminClient, {
    actorId: user.user.id,
    action: "bulk_deactivate_listings",
    targetType: "listing",
    metadata: { count: listingIds.length },
  });
  revalidatePath("/dashboard/admin");
}

async function bulkRemovePromotionsAction(listingIds: string[]) {
  "use server";
  const user = await requireModerator();
  if (!listingIds.length) return;
  const adminClient = createSupabaseAdminClient();
  await adminClient
    .from("listings")
    .update({ promotion_status: "cancelled", promoted_until: null, promotion_weight: 0 })
    .in("id", listingIds);
  await logAdminAction(adminClient, {
    actorId: user.user.id,
    action: "bulk_remove_promotions",
    targetType: "listing",
    metadata: { count: listingIds.length },
  });
  revalidatePath("/dashboard/admin");
}

export default async function AdminModerationPage() {
  let data;
  try {
    data = await loadAdminData();
  } catch {
    return (
      <div className="py-6 sm:py-8">
        <div className="mx-auto w-full max-w-250 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          You do not have access to this page.
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-col gap-2 sm:mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Admin moderation</h1>
          <p className="text-sm text-slate-500">
            Review reports, users, and listings in one streamlined moderation hub.
          </p>
        </div>
      <AdminModerationClient
        data={{
          reports: data.reports,
          profiles: data.profiles,
          profilesCount: data.profilesCount,
          listings: data.listings,
          listingCounts: data.listingCounts,
          listingMetaById: data.listingMetaById,
          reporterEmailById: data.reporterEmailById,
          profileEmailById: data.profileEmailById,
          auditLogs: data.auditLogs,
          currentRole: data.currentRole,
        }}
        pendingReportsCount={data.pendingReportsCount}
        activeListingsCount={data.listings.filter((listing) => listing.status === "active").length}
        actions={{
          deleteListingAction,
          deleteReportAction,
          ignoreReportAction,
          warnUserAction,
          banUserAction,
          deleteUserAction,
          deactivateListingAction,
          removePromotionAction,
          bulkResolveReportsAction,
          bulkIgnoreReportsAction,
          bulkWarnUsersAction,
          bulkBanUsersAction,
          bulkDeactivateListingsAction,
          bulkRemovePromotionsAction,
        }}
      />
    </div>
  );
}
