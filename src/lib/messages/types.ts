export type ConversationParticipant = {
  id: string;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
  googlePhotoUrl: string | null;
};

export type ConversationListing = {
  id: string;
  title: string | null;
  coverImage: string | null;
  images?: string[] | null;
  images1600?: string[] | null;
  price?: number | null;
  currency?: string | null;
  county?: string | null;
  area?: string | null;
  city?: string | null;
  listing_type?: string | null;
};

export type ConversationSummary = {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  listing: ConversationListing | null;
  otherParticipant: ConversationParticipant;
  unreadCount: number;
};

export type MessageItem = {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};
