"use server";

import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildListingImageMap } from "@/lib/listings/listingImages";
import { revalidatePath } from "next/cache";
import { sendMessageNotificationEmail } from "@/lib/email/sendMessageNotificationEmail";
import type { ConversationSummary, MessageItem } from "@/lib/messages/types";
import { resolveDisplayNameValue } from "@/lib/display-name";

const MIN_MESSAGE_LENGTH = 1;
const MAX_MESSAGE_LENGTH = 2000;

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

const escapePostgrestInValue = (value: string) =>
  value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');

const serializePostgrestInFilter = (values: string[]) =>
  `(${values.map((value) => `"${escapePostgrestInValue(value)}"`).join(",")})`;

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
      "id, listing_id, buyer_id, seller_id, created_at, listing:listings!conversations_listing_id_fkey (id, title, price, county, area, city, listing_type, seller)"
    )
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

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

  const visibleConversations = conversations.filter(
    (conversation) => !hiddenConversationIds.has(conversation.id)
  );

  const shouldBypassHiddenFilter =
    conversations.length > 0 && hiddenConversationIds.size === conversations.length;
  if (shouldBypassHiddenFilter && process.env.NODE_ENV !== "production") {
    console.warn(
      "CONVERSATION HIDDEN SAFETY TRIGGER: all conversations are hidden; returning fallback visible list",
      {
        authUserId: user.id,
        totalConversations: conversations.length,
        hiddenConversations: hiddenConversationIds.size,
      }
    );
  }

  const conversationsForInbox = shouldBypassHiddenFilter
    ? conversations
    : visibleConversations;

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

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, full_name, name, email, avatar_url, google_photo_url")
    .in("id", Array.from(participantIds));

  const profileMap = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile])
  );

  const { data: imageRows } = listingIds.size
    ? await supabase
        .from("listing_images")
        .select("listing_id, image_url, storage_path_600, storage_path_1800, sort_order")
        .in("listing_id", Array.from(listingIds))
        .order("sort_order", { ascending: true })
    : { data: [] };

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

  const { data: unreadRows } = conversationIds.length
    ? await supabase
        .from("messages")
        .select("conversation_id")
        .eq("recipient_id", user.id)
        .neq("sender_id", user.id)
        .is("read_at", null)
        .in("conversation_id", conversationIds)
    : { data: [] };

  const unreadMap = new Map<string, number>();
  (unreadRows ?? []).forEach((row) => {
    unreadMap.set(row.conversation_id, (unreadMap.get(row.conversation_id) ?? 0) + 1);
  });

  const blockedConversationIds = new Set<string>();
  const blockedByMeConversationIds = new Set<string>();
  if (conversationIds.length > 0) {
    const { data: blockedRows } = await supabase
      .from("blocked_conversations")
      .select("conversation_id, blocker_user_id")
      .in("conversation_id", conversationIds);

    (blockedRows ?? []).forEach((row) => {
      if (!row.conversation_id) return;
      blockedConversationIds.add(row.conversation_id);
      if (row.blocker_user_id === user.id) {
        blockedByMeConversationIds.add(row.conversation_id);
      }
    });
  }

  const latestMessageMap = new Map<string, { body: string; createdAt: string }>();
  if (conversationIds.length > 0) {
    const { data: latestRows } = await supabase
      .from("messages")
      .select("conversation_id, content, created_at")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false });

    (latestRows ?? []).forEach((row) => {
      if (!row.conversation_id || latestMessageMap.has(row.conversation_id)) return;
      latestMessageMap.set(row.conversation_id, {
        body: row.content ?? "",
        createdAt: row.created_at,
      });
    });
  }

  return conversationsForInbox
    .map((conversation) => {
      const latest = latestMessageMap.get(conversation.id) ?? null;
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
          }
        : null;

      return {
        id: conversation.id,
        listingId: conversation.listing_id,
        buyerId: conversation.buyer_id,
        sellerId: conversation.seller_id,
        lastMessage: latest?.body ?? null,
        lastMessageAt: latest?.createdAt ?? null,
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
    })
    .sort((a, b) => {
      const aTime = a.lastMessageAt ?? a.createdAt ?? "";
      const bTime = b.lastMessageAt ?? b.createdAt ?? "";
      return aTime < bTime ? 1 : -1;
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

  const { data: hiddenRows, error: hiddenError } = await supabase
    .from("conversation_hidden")
    .select("conversation_id")
    .eq("user_id", user.id);

  if (hiddenError) {
    console.error("Failed to load hidden conversations for unread count", hiddenError);
    return 0;
  }

  const hiddenConversationIds = (hiddenRows ?? [])
    .map((row) => row.conversation_id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  const excludedConversationIds = activeConversationId
    ? Array.from(new Set([...hiddenConversationIds, activeConversationId]))
    : hiddenConversationIds;

  const excludedConversationFilter =
    excludedConversationIds.length > 0
      ? serializePostgrestInFilter(excludedConversationIds)
      : null;

  let unreadQuery = supabase
    .from("messages")
    .select("conversation_id")
    .eq("recipient_id", user.id)
    .neq("sender_id", user.id)
    .is("read_at", null);

  if (excludedConversationFilter) {
    unreadQuery = unreadQuery.not("conversation_id", "in", excludedConversationFilter);
  }

  const { data: unreadRows, error: unreadError } = await unreadQuery;

  if (unreadError) {
    console.error("Failed to load visible unread conversation count", unreadError);
    return 0;
  }

  const unreadConversationIds = new Set(
    (unreadRows ?? [])
      .map((row) => row.conversation_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0)
  );

  return unreadConversationIds.size;
}

export async function getConversationMessages(
  conversationId: string
): Promise<MessageItem[]> {
  if (!conversationId) return [];

  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  if (!user) {
    return [];
  }

  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("id, buyer_id, seller_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (conversationError || !conversation) {
    return [];
  }

  const isParticipant =
    conversation.buyer_id === user.id || conversation.seller_id === user.id;

  if (!isParticipant) {
    return [];
  }

  const { error: unhideOpenError } = await supabase
    .from("conversation_hidden")
    .delete()
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id);

  if (unhideOpenError) {
    console.warn("CONVERSATION UNHIDE ON OPEN ERROR", unhideOpenError);
  }

  const { data: messages, error } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, recipient_id, content, read_at, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error || !messages) {
    console.warn("Failed to load messages", error);
    return [];
  }

  return messages.map((message) => ({
    id: message.id,
    conversationId: message.conversation_id,
    senderId: message.sender_id,
    recipientId: message.recipient_id,
    body: message.content,
    readAt: message.read_at ?? null,
    createdAt: message.created_at,
  }));
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
    .select("id, buyer_id, seller_id")
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
  if (!conversationId) {
    throw new Error("Missing conversation id");
  }

  const trimmed = body.trim();
  if (trimmed.length < MIN_MESSAGE_LENGTH || trimmed.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Message must be between ${MIN_MESSAGE_LENGTH} and ${MAX_MESSAGE_LENGTH} characters.`);
  }

  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("id, buyer_id, seller_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (conversationError || !conversation) {
    throw new Error("Conversation not found");
  }

  const { data: blockRows } = await supabase
    .from("blocked_conversations")
    .select("id")
    .eq("conversation_id", conversationId)
    .limit(1);

  if ((blockRows ?? []).length > 0) {
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
    throw new Error("Failed to send message");
  }

  console.log("sendMessage insert diagnostic", {
    conversationId,
    sender_id: inserted.sender_id,
    recipient_id: inserted.recipient_id,
    currentUserId: user.id,
    read_at: inserted.read_at ?? null,
    created_at: inserted.created_at,
  });

  await supabase
    .from("conversations")
    .update({
      last_message: trimmed,
      last_message_at: inserted.created_at,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId);

  if (recipientId !== user.id) {
    const { data: recipientProfile } = await supabase
      .from("profiles")
      .select("email, message_notifications")
      .eq("id", recipientId)
      .maybeSingle();

    if (recipientProfile?.email && recipientProfile.message_notifications !== false) {
      const baseUrl =
        process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
      const conversationUrl = `${baseUrl}/dashboard/messages/${conversationId}`;

      await sendMessageNotificationEmail({
        to: recipientProfile.email,
        conversationUrl,
      });
    }
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

export async function markConversationRead(conversationId: string): Promise<number> {
  if (!conversationId) return 0;

  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  if (!user) return 0;

  const { data: authDataVerification } = await supabase.auth.getUser();
  const authUid = authDataVerification.user?.id ?? null;
  const userId = user.id;

  const filterValues = {
    conversation_id: conversationId,
    recipient_id: userId,
    read_at_is_null: true,
  };

  console.log("markConversationRead diagnostic auth", {
    authUid,
    userId,
    authUidMatchesUserId: authUid === userId,
    conversationId,
  });

  const { data: beforeRows, error: beforeError } = await supabase
    .from("messages")
    .select("id, sender_id, recipient_id, read_at")
    .eq("conversation_id", conversationId)
    .eq("recipient_id", userId)
    .is("read_at", null)
    .order("id", { ascending: true });

  console.log("markConversationRead diagnostic before", {
    filterValues,
    beforeRowsCount: beforeRows?.length ?? 0,
    beforeRows: beforeRows ?? [],
    beforeError,
  });

  if (beforeError) {
    throw new Error("Failed to load pre-update unread rows");
  }

  const updatePayload = { read_at: new Date().toISOString() };

  const updateResponse = await supabase
    .from("messages")
    .update(updatePayload)
    .eq("conversation_id", conversationId)
    .eq("recipient_id", userId)
    .is("read_at", null);

  console.log("markConversationRead diagnostic update", {
    filterValues,
    updatePayload,
    rawUpdateResponse: updateResponse,
    rawUpdateError: updateResponse.error,
  });

  if (updateResponse.error) {
    console.error("Failed to mark conversation as read", updateResponse.error);
    throw new Error("Failed to mark conversation as read");
  }

  const { data: afterRows, error: afterError } = await supabase
    .from("messages")
    .select("id, sender_id, recipient_id, read_at")
    .eq("conversation_id", conversationId)
    .eq("recipient_id", userId)
    .is("read_at", null)
    .order("id", { ascending: true });

  console.log("markConversationRead diagnostic after", {
    filterValues,
    afterRowsCount: afterRows?.length ?? 0,
    afterRows: afterRows ?? [],
    afterError,
  });

  if (afterError) {
    throw new Error("Failed to load post-update unread rows");
  }

  const beforeCount = beforeRows?.length ?? 0;
  const afterCount = afterRows?.length ?? 0;
  const affectedRows = Math.max(beforeCount - afterCount, 0);

  console.log("markConversationRead diagnostic summary", {
    conversationId,
    authUid,
    userId,
    authUidMatchesUserId: authUid === userId,
    beforeRowsCount: beforeCount,
    afterRowsCount: afterCount,
    affectedRows,
  });

  return affectedRows;
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
