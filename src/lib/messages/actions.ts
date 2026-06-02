"use server";

import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildListingImageMap } from "@/lib/listings/listingImages";
import { getListingHref } from "@/lib/listings/getListingHref";
import { revalidatePath } from "next/cache";
import { sendMessageNotificationEmail } from "@/lib/email/sendMessageNotificationEmail";
import type { ConversationSummary, MessageItem } from "@/lib/messages/types";
import { resolveDisplayNameValue } from "@/lib/display-name";
import { formatListingLocation } from "@/components/listings/formatters";

const MIN_MESSAGE_LENGTH = 1;
const MAX_MESSAGE_LENGTH = 2000;

const resolvePositiveInteger = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const resolveNonNegativeInteger = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const MESSAGE_EMAIL_DEBOUNCE_SECONDS = resolvePositiveInteger(
  process.env.MESSAGE_EMAIL_NOTIFICATION_DEBOUNCE_SECONDS,
  300
);
const MESSAGE_EMAIL_ACTIVE_READ_WINDOW_SECONDS = resolveNonNegativeInteger(
  process.env.MESSAGE_EMAIL_ACTIVE_READ_WINDOW_SECONDS,
  90
);
const MESSAGE_EMAIL_PREVIEW_MAX_LENGTH = 80;

console.info("message_notification_config_loaded", {
  rawMessageEmailActiveReadWindowSeconds:
    process.env.MESSAGE_EMAIL_ACTIVE_READ_WINDOW_SECONDS ?? null,
  parsedMessageEmailActiveReadWindowSeconds: MESSAGE_EMAIL_ACTIVE_READ_WINDOW_SECONDS,
});

const resolveParticipantDisplayName = (
  profile?: {
    display_name?: string | null;
    full_name?: string | null;
    name?: string | null;
    email?: string | null;
  },
  sellerSnapshot?: {
    displayName?: string | null;
    fullName?: string | null;
    name?: string | null;
  } | null
) => {
  const profileName = resolveDisplayNameValue(
    profile?.display_name,
    profile?.full_name,
    profile?.name,
    profile?.email
  );
  if (profileName) return profileName;

  const snapshotName = resolveDisplayNameValue(
    sellerSnapshot?.displayName,
    sellerSnapshot?.fullName,
    sellerSnapshot?.name
  );
  if (snapshotName && snapshotName !== "User") return snapshotName;

  return "User";
};


const truncateMessagePreview = (message: string, maxLength = MESSAGE_EMAIL_PREVIEW_MAX_LENGTH) => {
  const normalized = message.trim().replace(/\s+/g, " ");
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
};

const hasRecentConversationReadActivity = async (
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  conversationId: string,
  recipientId: string,
  windowSeconds: number
) => {
  const cutoff = new Date(Date.now() - windowSeconds * 1000).toISOString();
  const { data, error } = await supabase
    .from("messages")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("recipient_id", recipientId)
    .not("read_at", "is", null)
    .gte("read_at", cutoff)
    .limit(1);

  if (error) {
    console.warn("message_notification_skip_check_failed", {
      conversationId,
      recipientId,
      windowSeconds,
      error: error.message,
      code: error.code,
    });
    return false;
  }

  return (data ?? []).length > 0;
};

const reserveMessageEmailNotificationSlot = async (
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  {
    conversationId,
    recipientId,
    messageId,
    debounceSeconds,
  }: {
    conversationId: string;
    recipientId: string;
    messageId: string;
    debounceSeconds: number;
  }
) => {
  const nowIso = new Date().toISOString();
  const cutoffIso = new Date(Date.now() - debounceSeconds * 1000).toISOString();

  const { data: updatedRows, error: updateError } = await supabase
    .from("message_email_notifications")
    .update({
      last_notified_at: nowIso,
      last_message_id: messageId,
      updated_at: nowIso,
    })
    .eq("conversation_id", conversationId)
    .eq("recipient_id", recipientId)
    .lte("last_notified_at", cutoffIso)
    .select("conversation_id")
    .limit(1);

  if (updateError) {
    console.error("message_notification_reservation_failed", {
      conversationId,
      recipientId,
      messageId,
      debounceSeconds,
      error: updateError.message,
      code: updateError.code,
      details: updateError.details,
    });
    return { allowed: false as const, reason: "reservation_failed" as const };
  }

  if ((updatedRows ?? []).length > 0) {
    return { allowed: true as const, reason: "updated" as const };
  }

  const { data: insertedRows, error: insertError } = await supabase
    .from("message_email_notifications")
    .insert({
      conversation_id: conversationId,
      recipient_id: recipientId,
      last_message_id: messageId,
      last_notified_at: nowIso,
      updated_at: nowIso,
    })
    .select("conversation_id")
    .limit(1);

  if (!insertError && (insertedRows ?? []).length > 0) {
    return { allowed: true as const, reason: "inserted" as const };
  }

  if (insertError?.code === "23505") {
    return { allowed: false as const, reason: "debounced" as const };
  }

  if (insertError) {
    console.error("message_notification_insert_reservation_failed", {
      conversationId,
      recipientId,
      messageId,
      debounceSeconds,
      error: insertError.message,
      code: insertError.code,
      details: insertError.details,
    });
    return { allowed: false as const, reason: "reservation_failed" as const };
  }

  return { allowed: false as const, reason: "debounced" as const };
};

export async function getOrCreateConversation(listingId: string) {
  try {
    if (!listingId) {
      return { error: "Missing listing id." };
    }

    const supabase = await createSupabaseServerClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    const user = authData.user;

    if (authError) {
      console.error("CONVERSATION AUTH ERROR", authError);
    }

    if (!user) {
      return { error: "Not authenticated" };
    }

    const buyerId = user.id;

    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("*")
      .eq("id", listingId)
      .maybeSingle();

    if (listingError) {
      console.error("CONVERSATION LISTING LOOKUP ERROR", listingError);
      return { error: listingError.message || "Listing not found" };
    }

    if (!listing) {
      return { error: "Listing not found" };
    }

    if (listing.allow_messages === false) {
      return { error: "Messaging disabled for this listing" };
    }

    const listingOwnerId =
      (listing as { owner_id?: string | null }).owner_id ?? null;
    const listingProfileId =
      (listing as { profile_id?: string | null }).profile_id ??
      ((listing as { seller?: { id?: string | null } | null }).seller?.id ?? null);
    const listingUserId = listing.user_id ?? null;

    const sellerId = [listingUserId, listingOwnerId, listingProfileId].find(
      (candidate) => typeof candidate === "string" && candidate.trim().length > 0
    );
    if (!sellerId) {
      return { error: "Listing missing seller" };
    }

    if (sellerId === buyerId) {
      return { error: "Seller cannot message themselves" };
    }

    const { data: existing, error: existingError } = await supabase
      .from("conversations")
      .select("id")
      .eq("listing_id", listingId)
      .eq("buyer_id", buyerId)
      .eq("seller_id", sellerId)
      .maybeSingle();

    if (existingError) {
      console.error("CONVERSATION LOOKUP ERROR", existingError);
      return { error: existingError.message || "Failed to look up conversation" };
    }

    if (existing?.id) {
      const { error: unhideExistingError } = await supabase
        .from("conversation_hidden")
        .delete()
        .eq("conversation_id", existing.id)
        .in("user_id", [buyerId, sellerId]);

      if (unhideExistingError) {
        console.warn("CONVERSATION UNHIDE EXISTING ERROR", unhideExistingError);
      }
      return { id: existing.id };
    }

    const { data: created, error: createError } = await supabase
      .from("conversations")
      .insert({
        listing_id: listingId,
        buyer_id: buyerId,
        seller_id: sellerId,
      })
      .select("id")
      .single();

    if (createError) {
      console.error("CONVERSATION CREATE ERROR", createError);
      if (createError.code === "23505") {
        const { data: fallback } = await supabase
          .from("conversations")
          .select("id")
          .eq("listing_id", listingId)
          .eq("buyer_id", buyerId)
          .eq("seller_id", sellerId)
          .maybeSingle();
        if (fallback?.id) {
          return { id: fallback.id };
        }
      }
      return { error: createError.message || "Failed to create conversation" };
    }

    if (!created?.id) {
      return { error: "Failed to create conversation" };
    }

    const { error: unhideCreatedError } = await supabase
      .from("conversation_hidden")
      .delete()
      .eq("conversation_id", created.id)
      .in("user_id", [buyerId, sellerId]);

    if (unhideCreatedError) {
      console.warn("CONVERSATION UNHIDE CREATED ERROR", unhideCreatedError);
    }

    return { id: created.id };
  } catch (error) {
    console.error("CONVERSATION CREATE FAILED", error);
    return {
      error:
        (error as { message?: string }).message || "Failed to create conversation",
    };
  }
}

export async function getUserConversations(): Promise<ConversationSummary[]> {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) {
    return [];
  }

  const { data: conversations, error } = await supabase
    .from("conversations")
    .select(
      "id, listing_id, buyer_id, seller_id, last_message, last_message_at, created_at, listing:listings!conversations_listing_id_fkey (id, title, price, county, area, city, listing_type, status, seller)"
    )
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (error || !conversations) {
    console.warn("Failed to load conversations", error);
    return [];
  }

  const hiddenConversationIds = new Set<string>();
  if (conversations.length > 0) {
    const { data: hiddenRows } = await supabase
      .from("conversation_hidden")
      .select("conversation_id")
      .eq("user_id", user.id)
      .in(
        "conversation_id",
        conversations.map((conversation) => conversation.id)
      );

    (hiddenRows ?? []).forEach((row) => {
      if (row.conversation_id) {
        hiddenConversationIds.add(row.conversation_id);
      }
    });
  }

  const conversationsForInbox = conversations.filter(
    (conversation) => !hiddenConversationIds.has(conversation.id)
  );

  if (conversationsForInbox.length === 0) {
    return [];
  }

  const participantIds = new Set<string>();
  const listingIds = new Set<string>();
  const conversationIds = conversationsForInbox.map((conversation) => {
    participantIds.add(conversation.buyer_id);
    participantIds.add(conversation.seller_id);
    if (conversation.listing_id) {
      listingIds.add(conversation.listing_id);
    }
    return conversation.id;
  });

  // Parallelize independent lookups for profiles, listing images and unread counts
  const profilesPromise = supabase
    .from("profiles")
    .select("id, display_name, full_name, name, email, avatar_url, google_photo_url")
    .in("id", Array.from(participantIds));

  const imageRowsPromise = listingIds.size
    ? supabase
        .from("listing_images")
        .select("listing_id, image_url, storage_path_600, storage_path_1800, sort_order")
        .in("listing_id", Array.from(listingIds))
        .order("sort_order", { ascending: true })
    : Promise.resolve({ data: [] });

  const unreadRowsPromise = conversationIds.length
    ? supabase
        .from("messages")
        .select("conversation_id")
        .eq("recipient_id", user.id)
        .neq("sender_id", user.id)
        .is("read_at", null)
        .in("conversation_id", conversationIds)
    : Promise.resolve({ data: [] });

  // Moved into the same Promise.all — was a sequential hop after profiles/images/unread.
  const blockedRowsPromise = conversationIds.length
    ? supabase
        .from("blocked_conversations")
        .select("conversation_id, blocker_user_id")
        .in("conversation_id", conversationIds)
    : Promise.resolve({ data: [] });

  const [{ data: profiles }, { data: imageRows }, { data: unreadRows }, { data: blockedRows }] =
    await Promise.all([
      profilesPromise,
      imageRowsPromise,
      unreadRowsPromise,
      blockedRowsPromise,
    ]);

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  const listingImageMap = buildListingImageMap(
    supabase,
    (imageRows ?? []) as {
      listing_id?: string | null;
      image_url?: string | null;
      storage_path_600?: string | null;
      storage_path_1800?: string | null;
      sort_order?: number | null;
    }[]
  );

  const unreadMap = new Map<string, number>();
  (unreadRows ?? []).forEach((row) => {
    unreadMap.set(row.conversation_id, (unreadMap.get(row.conversation_id) ?? 0) + 1);
  });

  const blockedConversationIds = new Set<string>();
  const blockedByMeConversationIds = new Set<string>();
  (blockedRows ?? []).forEach((row) => {
    if (!row.conversation_id) return;
    blockedConversationIds.add(row.conversation_id);
    if (row.blocker_user_id === user.id) {
      blockedByMeConversationIds.add(row.conversation_id);
    }
  });

  // DB already orders by last_message_at DESC — no need to re-sort in JS.
  return conversationsForInbox
    .map((conversation) => {
      const otherId =
        conversation.buyer_id === user.id ? conversation.seller_id : conversation.buyer_id;
      const otherProfile = profileMap.get(otherId);
      const listingRaw = Array.isArray(conversation.listing)
        ? conversation.listing[0] ?? null
        : conversation.listing ?? null;
      const listingImage = listingRaw?.id
        ? listingImageMap.get(listingRaw.id)
        : null;
      const listingSellerSnapshot = listingRaw?.seller ?? null;
      const listing = listingRaw
        ? {
            id: listingRaw.id,
            title: listingRaw.title ?? null,
            coverImage: listingImage?.coverImage ?? null,
            images: listingImage?.images ?? null,
            images1600: listingImage?.images1600 ?? null,
            price: listingRaw.price ?? null,
            county: listingRaw.county ?? null,
            area: listingRaw.area ?? null,
            city: listingRaw.city ?? null,
            listing_type: listingRaw.listing_type ?? null,
            status: (listingRaw as { status?: string | null }).status ?? null,
          }
        : null;

      return {
        id: conversation.id,
        listingId: conversation.listing_id,
        buyerId: conversation.buyer_id,
        sellerId: conversation.seller_id,
        lastMessage: (conversation.last_message as string | null) ?? null,
        lastMessageAt: (conversation.last_message_at as string | null) ?? null,
        createdAt: conversation.created_at ?? null,
  updatedAt: null,
        listing,
        otherParticipant: {
          id: otherId,
          displayName: resolveParticipantDisplayName(otherProfile, listingSellerSnapshot),
          email: otherProfile?.email ?? null,
          avatarUrl: otherProfile?.avatar_url ?? null,
          googlePhotoUrl: otherProfile?.google_photo_url ?? null,
        },
        unreadCount: unreadMap.get(conversation.id) ?? 0,
        isBlocked: blockedConversationIds.has(conversation.id),
        blockedByMe: blockedByMeConversationIds.has(conversation.id),
      } satisfies ConversationSummary;
    });
}

export async function getVisibleUnreadMessageCountForCurrentUser(
  activeConversationId?: string | null
): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  if (!user) {
    return 0;
  }

  // Single RPC call replaces two round-trips (hidden lookup + unread rows fetch)
  // and the JS deduplication. The DB function returns COUNT(DISTINCT conversation_id).
  const { data, error } = await supabase.rpc("get_unread_conversation_count", {
    p_recipient_id: user.id,
    p_active_conversation_id: activeConversationId ?? null,
  });

  if (error) {
    console.error("Failed to load visible unread conversation count", error);
    return 0;
  }

  return (data as number) ?? 0;
}

export async function getConversationMessages(
  conversationId: string,
  before?: string,
): Promise<{ items: MessageItem[]; hasMore: boolean }> {
  if (!conversationId) return { items: [], hasMore: false };

  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  if (!user) {
    return { items: [], hasMore: false };
  }

  // Fire-and-forget: unhide on open is a side-effect, not on the critical path.
  // Safe without an explicit participant check: the DELETE filter includes
  // user_id = auth user, so it only affects their own rows; a non-participant
  // call simply deletes nothing.
  void supabase
    .from("conversation_hidden")
    .delete()
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id);

  // The explicit conversations SELECT + participant check has been removed.
  // Access is now enforced entirely by the RLS policy on messages
  // (sender_id = auth.uid() OR recipient_id = auth.uid() — see migration
  // 20260602_optimise_messages_rls.sql).  Non-participants get 0 rows.
  let query = supabase
    .from("messages")
    .select("id, conversation_id, sender_id, recipient_id, content, read_at, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(51);

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data: messages, error } = await query;

  if (error || !messages) {
    console.warn("Failed to load messages", error);
    return { items: [], hasMore: false };
  }

  const hasMore = messages.length === 51;
  // Take at most 50 and reverse to chronological order for the UI.
  const page = (hasMore ? messages.slice(0, 50) : messages).reverse();

  return {
    items: page.map((message) => ({
      id: message.id,
      conversationId: message.conversation_id,
      senderId: message.sender_id,
      recipientId: message.recipient_id,
      body: message.content,
      readAt: message.read_at ?? null,
      createdAt: message.created_at,
    })),
    hasMore,
  };
}

export async function restoreConversationVisibilityForCurrentUser(conversationId: string) {
  if (!conversationId) return { success: false, error: "Missing conversation id" };

  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select(
      "id, buyer_id, seller_id, listing_id, listing:listings!conversations_listing_id_fkey (id, title, price, county, area, city, listing_type, seller)"
    )
    .eq("id", conversationId)
    .maybeSingle();

  if (conversationError || !conversation) {
    return { success: false, error: "Conversation not found" };
  }

  const isParticipant =
    conversation.buyer_id === user.id || conversation.seller_id === user.id;

  if (!isParticipant) {
    return { success: false, error: "Not allowed" };
  }

  const { error: unhideError } = await supabase
    .from("conversation_hidden")
    .delete()
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id);

  if (unhideError) {
    return {
      success: false,
      error: unhideError.message,
      details: unhideError.details,
      code: unhideError.code,
    };
  }

  return { success: true };
}

export async function sendMessage(conversationId: string, body: string) {
  console.info("sendMessage_entered", {
    conversationId,
    bodyLength: body?.length ?? 0,
  });

  if (!conversationId) {
    console.info("sendMessage_guard_exit", {
      reason: "missing_conversation_id",
      conversationId,
    });
    throw new Error("Missing conversation id");
  }

  const trimmed = body.trim();
  if (trimmed.length < MIN_MESSAGE_LENGTH || trimmed.length > MAX_MESSAGE_LENGTH) {
    console.info("sendMessage_guard_exit", {
      reason: "invalid_message_length",
      conversationId,
      trimmedLength: trimmed.length,
      minLength: MIN_MESSAGE_LENGTH,
      maxLength: MAX_MESSAGE_LENGTH,
    });
    throw new Error(`Message must be between ${MIN_MESSAGE_LENGTH} and ${MAX_MESSAGE_LENGTH} characters.`);
  }

  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  if (!user) {
    console.info("sendMessage_guard_exit", {
      reason: "not_authenticated",
      conversationId,
    });
    throw new Error("Not authenticated");
  }

  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select(
      "id, buyer_id, seller_id, listing_id, listing:listings!conversations_listing_id_fkey (id, title, price, county, area, city, listing_type, category_id, seller)"
    )
    .eq("id", conversationId)
    .maybeSingle();

  if (conversationError || !conversation) {
    console.info("sendMessage_guard_exit", {
      reason: "conversation_not_found",
      conversationId,
      hasConversation: Boolean(conversation),
      conversationError: conversationError?.message ?? null,
      conversationErrorCode: conversationError?.code ?? null,
    });
    throw new Error("Conversation not found");
  }

  const { data: blockRows } = await supabase
    .from("blocked_conversations")
    .select("id")
    .eq("conversation_id", conversationId)
    .limit(1);

  if ((blockRows ?? []).length > 0) {
    console.info("sendMessage_guard_exit", {
      reason: "conversation_blocked",
      conversationId,
      blockedRowsCount: (blockRows ?? []).length,
    });
    throw new Error("Conversation is blocked");
  }

  const recipientId =
    conversation.buyer_id === user.id ? conversation.seller_id : conversation.buyer_id;

  const { error: unhideOnSendError } = await supabase
    .from("conversation_hidden")
    .delete()
    .eq("conversation_id", conversationId)
    .in("user_id", [user.id, recipientId]);

  if (unhideOnSendError) {
    console.warn("CONVERSATION UNHIDE ON SEND ERROR", unhideOnSendError);
  }

  const { data: inserted, error: insertError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      recipient_id: recipientId,
      content: trimmed,
    })
    .select("id, conversation_id, sender_id, recipient_id, content, read_at, created_at")
    .single();

  if (insertError || !inserted) {
    console.info("sendMessage_guard_exit", {
      reason: "insert_failed",
      conversationId,
      insertError: insertError?.message ?? null,
      insertErrorCode: insertError?.code ?? null,
      hasInsertedRow: Boolean(inserted),
    });
    throw new Error("Failed to send message");
  }

  console.info("sendMessage_after_insert", {
    conversationId,
    messageId: inserted.id,
    senderId: inserted.sender_id,
    recipientId: inserted.recipient_id,
    createdAt: inserted.created_at,
  });

  console.log("sendMessage insert diagnostic", {
    conversationId,
    sender_id: inserted.sender_id,
    recipient_id: inserted.recipient_id,
    currentUserId: user.id,
    read_at: inserted.read_at ?? null,
    created_at: inserted.created_at,
  });

  // Preview cache update is cosmetic — the client already updates optimistically.
  // Fire-and-forget so the INSERT response returns immediately.
  void supabase
    .from("conversations")
    .update({
      last_message: trimmed,
      last_message_at: inserted.created_at,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId);

  console.info("sendMessage_before_notification_block", {
    conversationId,
    messageId: inserted.id,
    senderId: user.id,
    recipientId,
    recipientDiffersFromSender: recipientId !== user.id,
  });

  if (recipientId !== user.id) {
    // offload heavier notification work so this function can return quickly
    void (async () => {
      try {
        const supabaseInner = await createSupabaseServerClient();

        const { data: recipientProfile } = await supabaseInner
          .from("profiles")
          .select("email, message_notifications")
          .eq("id", recipientId)
          .maybeSingle();

        let resolvedRecipientEmail = recipientProfile?.email?.trim() || null;

        if (!resolvedRecipientEmail) {
          try {
            const adminSupabase = createSupabaseAdminClient();
            const { data: authUserData } = await adminSupabase.auth.admin.getUserById(recipientId);
            const authUserEmail = authUserData.user?.email?.trim() || null;
            const authMetadata = authUserData.user?.user_metadata as Record<string, unknown> | undefined;
            const metadataEmailRaw = authMetadata?.email;
            const metadataEmail = typeof metadataEmailRaw === "string" ? metadataEmailRaw.trim() : null;
            if (authUserEmail) resolvedRecipientEmail = authUserEmail;
            else if (metadataEmail) resolvedRecipientEmail = metadataEmail;
          } catch {
            // swallow admin lookup errors in detached flow
          }
        }

        if (!resolvedRecipientEmail) return;
        if (recipientProfile?.message_notifications === false) return;

        const [{ data: senderProfile }, { data: listingImageRows }] = await Promise.all([
          supabaseInner
            .from("profiles")
            .select("display_name, full_name, name")
            .eq("id", user.id)
            .maybeSingle(),
          conversation.listing_id
            ? supabaseInner
                .from("listing_images")
                .select("listing_id, image_url, storage_path_600, storage_path_1800, sort_order")
                .eq("listing_id", conversation.listing_id)
                .order("sort_order", { ascending: true })
            : Promise.resolve({ data: [] }),
        ]);

        type ConversationListing = {
          id?: string | null;
          title?: string | null;
          price?: number | null;
          county?: string | null;
          area?: string | null;
          city?: string | null;
          listing_type?: string | null;
          category_id?: string | null;
          seller?: { displayName?: string | null; display_name?: string | null; fullName?: string | null; full_name?: string | null; name?: string | null; username?: string | null } | null;
        };
        const listingRawFromConversation = (conversation as { listing?: ConversationListing | ConversationListing[] | null }).listing;
        const listingRaw = Array.isArray(listingRawFromConversation)
          ? listingRawFromConversation[0] ?? null
          : listingRawFromConversation ?? null;

        const listingSeller = listingRaw?.seller;

        const senderDisplayName =
          resolveDisplayNameValue(
            listingSeller?.displayName,
            listingSeller?.display_name,
            listingSeller?.fullName,
            listingSeller?.full_name,
            listingSeller?.name,
            listingSeller?.username,
            senderProfile?.display_name,
            senderProfile?.full_name,
            senderProfile?.name
          ) ?? "User";

        const listingTitle = listingRaw?.title?.trim() ?? "";
        const listingLocation = formatListingLocation([
          listingRaw?.county ?? null,
          listingRaw?.area ?? null,
          listingRaw?.city ?? null,
        ]);

        const listingPrice =
          listingRaw?.price !== null && listingRaw?.price !== undefined
            ? (() => {
                const numericPrice = typeof listingRaw.price === "number" ? listingRaw.price : Number.parseFloat(String(listingRaw.price));
                if (!Number.isFinite(numericPrice)) return null;
                return `${new Intl.NumberFormat("en-IE", { maximumFractionDigits: 0 }).format(numericPrice)} €`;
              })()
            : null;

        const listingImageMap = buildListingImageMap(
          supabaseInner,
          (listingImageRows ?? []) as {
            listing_id?: string | null;
            image_url?: string | null;
            storage_path_600?: string | null;
            storage_path_1800?: string | null;
            sort_order?: number | null;
          }[]
        );
        const listingImageEntry = conversation.listing_id ? listingImageMap.get(conversation.listing_id) ?? null : null;
        const listingImageUrl = conversation.listing_id ? listingImageEntry?.coverImage ?? listingImageEntry?.images?.[0] ?? null : null;

        const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.vuxsy.ie").replace(/\/$/, "");
        const conversationUrl = `${baseUrl}/dashboard/messages/${conversationId}`;
        const listingPath = listingRaw?.id
          ? getListingHref({
              id: listingRaw.id,
              type: (listingRaw?.listing_type as "service" | "request" | "marketplace" | null | undefined) ?? undefined,
              category: listingRaw.category_id ?? undefined,
            })
          : null;
        const listingUrl = listingPath ? `${baseUrl}${listingPath}` : null;

        await sendMessageNotificationEmail({
          to: resolvedRecipientEmail,
          conversationUrl,
          senderDisplayName,
          listingTitle,
          listingUrl,
          listingLocation: listingLocation || null,
          listingPrice,
          listingImageUrl,
          messagePreview: truncateMessagePreview(trimmed),
          messageSentAt: inserted.created_at,
        });
      } catch {
        // ignore notification errors in detached flow
      }
    })();
  }

  return {
    id: inserted.id,
    conversationId: inserted.conversation_id,
    senderId: inserted.sender_id,
    recipientId,
    body: inserted.content,
    readAt: inserted.read_at ?? null,
    createdAt: inserted.created_at,
  } satisfies MessageItem;
}

export async function markConversationRead(conversationId: string): Promise<void> {
  if (!conversationId) return;

  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;

  if (!userId) return;

  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("recipient_id", userId)
    .is("read_at", null);

  if (error) {
    throw new Error("Failed to mark conversation as read");
  }
}

export async function getConversationStatus(conversationId: string) {
  if (!conversationId) {
    return {
      isBlocked: false,
      blockedByMe: false,
      blockedByOther: false,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  if (!user) {
    return {
      isBlocked: false,
      blockedByMe: false,
      blockedByOther: false,
    };
  }

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, buyer_id, seller_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conversation) {
    return {
      isBlocked: false,
      blockedByMe: false,
      blockedByOther: false,
    };
  }

  if (conversation.buyer_id !== user.id && conversation.seller_id !== user.id) {
    return {
      isBlocked: false,
      blockedByMe: false,
      blockedByOther: false,
    };
  }

  const { data: blockRows } = await supabase
    .from("blocked_conversations")
    .select("blocker_user_id")
    .eq("conversation_id", conversationId);

  const isBlocked = (blockRows ?? []).length > 0;
  const blockedByMe = (blockRows ?? []).some((row) => row.blocker_user_id === user.id);

  return {
    isBlocked,
    blockedByMe,
    blockedByOther: isBlocked && !blockedByMe,
  };
}

export async function blockConversation(conversationId: string) {
  if (!conversationId) {
    return {
      success: false,
      error: "Missing conversation id",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  if (!user) {
    return {
      success: false,
      error: "Not authenticated",
    };
  }

  const { data: conversation, error } = await supabase
    .from("conversations")
    .select("id, buyer_id, seller_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (error || !conversation) {
    return {
      success: false,
      error: error?.message ?? "Conversation not found",
      details: error?.details ?? null,
      code: error?.code ?? null,
    };
  }

  const isParticipant =
    conversation.buyer_id === user.id || conversation.seller_id === user.id;

  if (!isParticipant) {
    return {
      success: false,
      error: "Not allowed",
    };
  }

  const blockerUserId = user.id;
  const blockedUserId =
    conversation.buyer_id === user.id ? conversation.seller_id : conversation.buyer_id;

  const { data: existingBlock, error: existingBlockError } = await supabase
    .from("blocked_conversations")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("blocker_user_id", blockerUserId)
    .eq("blocked_user_id", blockedUserId)
    .maybeSingle();

  if (existingBlockError) {
    console.error("REAL block precheck error:", existingBlockError);
    return {
      success: false,
      error: existingBlockError.message,
      details: existingBlockError.details,
      code: existingBlockError.code,
    };
  }

  if (existingBlock?.id) {
    return { success: true };
  }

  const { error: insertError } = await supabase
    .from("blocked_conversations")
    .insert({
      conversation_id: conversationId,
      blocker_user_id: blockerUserId,
      blocked_user_id: blockedUserId,
    });

  if (insertError) {
    console.error("REAL block insert error:", insertError);
    console.error("Block insert payload:", {
      conversationId,
      blockerUserId,
      blockedUserId,
    });

    return {
      success: false,
      error: insertError.message,
      details: insertError.details,
      code: insertError.code,
    };
  }

  revalidatePath("/dashboard/messages");
  revalidatePath(`/dashboard/messages/${conversationId}`);

  return { success: true };
}

export async function unblockConversation(conversationId: string) {
  if (!conversationId) {
    return {
      success: false,
      error: "Missing conversation id",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  if (!user) {
    return {
      success: false,
      error: "Not authenticated",
    };
  }

  const { data: conversation, error } = await supabase
    .from("conversations")
    .select("id, buyer_id, seller_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (error || !conversation) {
    return {
      success: false,
      error: error?.message ?? "Conversation not found",
      details: error?.details ?? null,
      code: error?.code ?? null,
    };
  }

  const isParticipant =
    conversation.buyer_id === user.id || conversation.seller_id === user.id;

  if (!isParticipant) {
    return {
      success: false,
      error: "Not allowed",
    };
  }

  const { error: deleteError } = await supabase
    .from("blocked_conversations")
    .delete()
    .eq("conversation_id", conversationId)
    .eq("blocker_user_id", user.id);

  if (deleteError) {
    console.error("Unblock conversation error:", deleteError);
    return {
      success: false,
      error: deleteError.message,
      details: deleteError.details,
      code: deleteError.code,
    };
  }

  revalidatePath("/dashboard/messages");
  revalidatePath(`/dashboard/messages/${conversationId}`);

  return { success: true };
}

export async function deleteConversationForCurrentUser(conversationId: string) {
  if (!conversationId) {
    return {
      success: false,
      error: "Missing conversation id",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  if (!user) {
    return {
      success: false,
      error: "Not authenticated",
    };
  }

  const { data: conversation, error } = await supabase
    .from("conversations")
    .select("id, buyer_id, seller_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (error || !conversation) {
    return {
      success: false,
      error: error?.message ?? "Conversation not found",
      details: error?.details ?? null,
      code: error?.code ?? null,
    };
  }

  const isParticipant =
    conversation.buyer_id === user.id || conversation.seller_id === user.id;

  if (!isParticipant) {
    return {
      success: false,
      error: "Not allowed",
    };
  }

  const { data: existingHidden, error: existingHiddenError } = await supabase
    .from("conversation_hidden")
    .select("conversation_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingHiddenError) {
    return {
      success: false,
      error: existingHiddenError.message,
      details: existingHiddenError.details,
      code: existingHiddenError.code,
    };
  }

  if (existingHidden?.conversation_id) {
    return { success: true };
  }

  const { error: hideError } = await supabase
    .from("conversation_hidden")
    .upsert(
      {
        conversation_id: conversationId,
        user_id: user.id,
      },
      { onConflict: "conversation_id,user_id" }
    );

  if (hideError) {
    console.error("REAL delete conversation error:", hideError);

    return {
      success: false,
      error: hideError.message,
      details: hideError.details,
      code: hideError.code,
    };
  }

  revalidatePath("/dashboard/messages");
  revalidatePath(`/dashboard/messages/${conversationId}`);

  return { success: true };
}

export async function cleanupConversationHiddenRows() {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return { success: false, error: "Not allowed" };
  }

  const { data: hiddenRows, error: hiddenError } = await supabase
    .from("conversation_hidden")
    .select("conversation_id, user_id");

  if (hiddenError) {
    return {
      success: false,
      error: hiddenError.message,
      details: hiddenError.details,
      code: hiddenError.code,
    };
  }

  const rows = hiddenRows ?? [];
  if (rows.length === 0) {
    return { success: true, removedCount: 0, inspectedCount: 0 };
  }

  const conversationIds = Array.from(
    new Set(rows.map((row) => row.conversation_id).filter((id): id is string => Boolean(id)))
  );

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, buyer_id, seller_id")
    .in("id", conversationIds);

  const conversationById = new Map((conversations ?? []).map((row) => [row.id, row]));
  const rowsToDelete = rows.filter((row) => {
    if (!row.conversation_id || !row.user_id) return true;
    const conversation = conversationById.get(row.conversation_id);
    if (!conversation) return true;
    return row.user_id !== conversation.buyer_id && row.user_id !== conversation.seller_id;
  });

  let removedCount = 0;
  for (const row of rowsToDelete) {
    if (!row.conversation_id || !row.user_id) continue;
    const { error: deleteError } = await supabase
      .from("conversation_hidden")
      .delete()
      .eq("conversation_id", row.conversation_id)
      .eq("user_id", row.user_id);

    if (!deleteError) {
      removedCount += 1;
    }
  }

  return {
    success: true,
    removedCount,
    inspectedCount: rows.length,
  };
}
