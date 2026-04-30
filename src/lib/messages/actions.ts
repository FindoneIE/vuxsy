"use server";

import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendMessageNotificationEmail } from "@/lib/email/sendMessageNotificationEmail";
import type { ConversationSummary, MessageItem } from "@/lib/messages/types";

const MIN_MESSAGE_LENGTH = 1;
const MAX_MESSAGE_LENGTH = 2000;

const resolveDisplayName = (profile?: {
  display_name?: string | null;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
}) =>
  profile?.display_name ||
  profile?.full_name ||
  profile?.name ||
  profile?.email ||
  "User";

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
      .select("id, user_id, allow_messages")
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

    const sellerId = listing.user_id;
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
      "id, listing_id, buyer_id, seller_id, last_message, last_message_at, created_at, updated_at, listing:listing_id (id, title, coverImage, images, images1600, price, currency, county, area, city, listing_type)"
    )
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error || !conversations) {
    console.warn("Failed to load conversations", error);
    return [];
  }

  const participantIds = new Set<string>();
  const conversationIds = conversations.map((conversation) => {
    participantIds.add(conversation.buyer_id);
    participantIds.add(conversation.seller_id);
    return conversation.id;
  });

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, full_name, name, email, avatar_url, google_photo_url")
    .in("id", Array.from(participantIds));

  const profileMap = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile])
  );

  const { data: unreadRows } = conversationIds.length
    ? await supabase
        .from("messages")
        .select("conversation_id")
        .eq("recipient_id", user.id)
        .is("read_at", null)
        .in("conversation_id", conversationIds)
    : { data: [] };

  const unreadMap = new Map<string, number>();
  (unreadRows ?? []).forEach((row) => {
    unreadMap.set(row.conversation_id, (unreadMap.get(row.conversation_id) ?? 0) + 1);
  });

  return conversations.map((conversation) => {
    const otherId =
      conversation.buyer_id === user.id ? conversation.seller_id : conversation.buyer_id;
    const otherProfile = profileMap.get(otherId);
    const listing = Array.isArray(conversation.listing)
      ? conversation.listing[0] ?? null
      : conversation.listing ?? null;

    return {
      id: conversation.id,
      listingId: conversation.listing_id,
      buyerId: conversation.buyer_id,
      sellerId: conversation.seller_id,
      lastMessage: conversation.last_message ?? null,
      lastMessageAt: conversation.last_message_at ?? null,
      createdAt: conversation.created_at ?? null,
      updatedAt: conversation.updated_at ?? null,
      listing,
      otherParticipant: {
        id: otherId,
        displayName: resolveDisplayName(otherProfile),
        email: otherProfile?.email ?? null,
        avatarUrl: otherProfile?.avatar_url ?? null,
        googlePhotoUrl: otherProfile?.google_photo_url ?? null,
      },
      unreadCount: unreadMap.get(conversation.id) ?? 0,
    } satisfies ConversationSummary;
  });
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

  const { data: messages, error } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, recipient_id, body, read_at, created_at")
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
    body: message.body,
    readAt: message.read_at ?? null,
    createdAt: message.created_at,
  }));
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

  const recipientId =
    conversation.buyer_id === user.id ? conversation.seller_id : conversation.buyer_id;

  const { data: inserted, error: insertError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      recipient_id: recipientId,
      body: trimmed,
    })
    .select("id, conversation_id, sender_id, recipient_id, body, read_at, created_at")
    .single();

  if (insertError || !inserted) {
    throw new Error("Failed to send message");
  }

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
    recipientId: inserted.recipient_id,
    body: inserted.body,
    readAt: inserted.read_at ?? null,
    createdAt: inserted.created_at,
  } satisfies MessageItem;
}

export async function markConversationRead(conversationId: string) {
  if (!conversationId) return;

  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  if (!user) return;

  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("recipient_id", user.id)
    .is("read_at", null);
}
