"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { Listing } from "@/types/listing";
import { useAuth } from "@/components/auth/AuthProvider";
import { getOrCreateConversation, sendMessage } from "@/lib/messages/actions";
import VuxsyVerifiedBadge from "@/components/ui/VuxsyVerifiedBadge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type SellerProfileSource = NonNullable<Listing["seller"]> & {
  company_name?: string | null;
  is_business_seller?: boolean | null;
  sellerType?: string | null;
  display_name?: string | null;
  full_name?: string | null;
  website?: string | null;
  county?: string | null;
  area?: string | null;
  name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  google_photo_url?: string | null;
  created_at?: string | Date | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  phone?: string | null;
  email?: string | null;
};

type SellerCardV2Props = {
  seller?: Listing["seller"] | null;
  sellerType?: Listing["sellerType"] | null;
  createdAt?: Listing["created_at"] | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  listingId?: string | null;
  sellerId?: string | null;
  allowMessages?: boolean | null;
};

const cleanValue = (value?: string | null) =>
  typeof value === "string" ? value.trim() : "";

const capitalizeWords = (value?: string | null) =>
  typeof value === "string" && value.trim()
    ? value
        .trim()
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ")
    : "";

export default function SellerCardV2({
  seller,
  sellerType,
  createdAt,
  contactPhone,
  contactEmail,
  listingId,
  sellerId,
  allowMessages,
}: SellerCardV2Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [contactLoading, setContactLoading] = React.useState(false);
  const [contactError, setContactError] = React.useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [messageDraft, setMessageDraft] = React.useState(
    "Hi, is this still available?"
  );
  const [sendError, setSendError] = React.useState<string | null>(null);
  const presetMessages = React.useMemo(
    () => [
      "Hi, is this still available?",
      "What’s your best price?",
      "Can I view it today?",
    ],
    []
  );
  const sellerProfile = (seller ?? {}) as SellerProfileSource;

  const companyName = cleanValue(
    sellerProfile.companyName ?? sellerProfile.company_name
  );

  const displayName = cleanValue(
    sellerProfile.displayName ?? sellerProfile.display_name
  );

  const fullName = cleanValue(
    sellerProfile.fullName ?? sellerProfile.full_name
  );

  const plainName = cleanValue(sellerProfile.name);
  const username = cleanValue(sellerProfile.username);
  const email = cleanValue(sellerProfile.email);

  const hasSeller = Boolean(
    seller &&
      [
        displayName,
        fullName,
        plainName,
        username,
        email,
        companyName,
        cleanValue(sellerProfile.area),
        cleanValue(sellerProfile.county),
      ].some((value) => value.length > 0)
  );

  const isBusinessSeller =
    sellerProfile.isBusinessSeller === true ||
    sellerProfile.is_business_seller === true ||
    cleanValue(sellerProfile.type).toLowerCase() === "business" ||
    cleanValue(sellerProfile.sellerType).toLowerCase() === "business" ||
    cleanValue(sellerType).toLowerCase() === "business";

  const privateName =
    displayName ||
    fullName ||
    plainName ||
    username ||
    email;

  const sellerName = hasSeller
    ? isBusinessSeller
      ? companyName || privateName || "Seller"
      : privateName || companyName || "Seller"
    : "Seller";

  const isOfficialVuxsy = displayName === "VUXSY";

  const sellerLabel = isBusinessSeller ? "BUSINESS" : "PRIVATE";

  const websiteLabel = cleanValue(sellerProfile.website);
  const websiteHref = websiteLabel
    ? websiteLabel.startsWith("http://") || websiteLabel.startsWith("https://")
      ? websiteLabel
      : `https://${websiteLabel}`
    : "";

  const avatarUrl =
    cleanValue(sellerProfile.avatarUrl) ||
    cleanValue(sellerProfile.googlePhotoUrl) ||
    cleanValue(sellerProfile.avatar_url) ||
    cleanValue(sellerProfile.google_photo_url);

  const areaLabel = capitalizeWords(sellerProfile.area);
  const countyLabel = capitalizeWords(sellerProfile.county);

  const sellerLocationLabel = [countyLabel, areaLabel].filter(Boolean).join(" • ");

  const sellerInitial =
    cleanValue(sellerName).charAt(0).toUpperCase() || "S";

  const sellerSince =
    sellerProfile.createdAt ?? sellerProfile.created_at ?? createdAt ?? null;

  const [daysOnPlatform, setDaysOnPlatform] = React.useState<number>(0);
  const [showPhone, setShowPhone] = React.useState(false);
  const isMessagingDisabled = allowMessages === false;
  const isSeller = Boolean(user?.id && sellerId && user?.id === sellerId);

  React.useEffect(() => {
    if (!sellerSince) {
      queueMicrotask(() => setDaysOnPlatform(0));
      return;
    }

    const sellerDate = new Date(sellerSince as string | number | Date);

    if (Number.isNaN(sellerDate.getTime())) {
      queueMicrotask(() => setDaysOnPlatform(0));
      return;
    }

    const nextDays = Math.max(
      1,
      Math.ceil((Date.now() - sellerDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    queueMicrotask(() => setDaysOnPlatform(nextDays));
  }, [sellerSince]);

  React.useEffect(() => {
    if (isModalOpen) {
      queueMicrotask(() => {
        setMessageDraft("Hi, is this still available?");
        setSendError(null);
      });
    }
  }, [isModalOpen]);

  const handleContactSeller = () => {
    if (isMessagingDisabled || isSeller) {
      setContactError(
        isSeller ? "You can’t message your own listing." : "Messaging unavailable"
      );
      return;
    }
    setContactError(null);
    setSendError(null);
    setIsModalOpen(true);
  };

  const handleSendMessage = async () => {
    if (contactLoading) return;
    if (!listingId) {
      setSendError("Listing not available for messaging.");
      return;
    }
    if (!user) {
      setSendError("Not authenticated");
      return;
    }
    if (isSeller) {
      setSendError("You can’t message your own listing.");
      return;
    }

    const trimmed = messageDraft.trim();
    if (!trimmed) {
      setSendError("Message cannot be empty.");
      return;
    }

    setContactLoading(true);
    setSendError(null);

    try {
      const conversation = await getOrCreateConversation(listingId);
      if (conversation?.error) {
        setSendError(conversation.error);
        return;
      }
      if (!conversation?.id) {
        setSendError("Unable to start a conversation right now.");
        return;
      }

      await sendMessage(conversation.id, trimmed);
      setIsModalOpen(false);
      router.push(`/dashboard/messages/${conversation.id}`);
    } catch (error) {
      console.error("Failed to send message", error);
      setSendError(
        (error as { message?: string }).message ||
          "Unable to send message right now."
      );
    } finally {
      setContactLoading(false);
    }
  };

  const ratingAverage = sellerProfile.ratingAverage;
  const reviewCount = sellerProfile.reviewCount;

  const ratingLabel = typeof ratingAverage === "number" ? ratingAverage : 0;
  const reviewsLabel = typeof reviewCount === "number" ? reviewCount : 0;

  const phoneLabel =
    cleanValue(contactPhone) ||
    cleanValue(sellerProfile.contact_phone) ||
    cleanValue(sellerProfile.phone) ||
    "";

  const emailLabel =
    cleanValue(contactEmail) ||
    cleanValue(sellerProfile.contact_email) ||
    cleanValue(sellerProfile.email) ||
    "";

  return (
    <>
      <div className="w-full lg:w-92 rounded-2xl border border-gray-200 bg-white p-3 lg:p-6 shadow-sm listing-seller-card">
        <div className="flex h-full flex-col gap-3 lg:gap-5 listing-seller-card-inner">
          <div className="space-y-3 lg:space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-700">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={sellerName}
                  width={48}
                  height={48}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{sellerInitial}</span>
              )}
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {sellerLabel}
              </p>

              <div className="mt-1 text-lg font-semibold text-foreground">
                {isOfficialVuxsy ? (
                  <span className="inline-flex items-center">
                    VUXSY
                    <VuxsyVerifiedBadge displayName={displayName} size={18} />
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    {sellerName}
                  </span>
                )}
              </div>

              {sellerLocationLabel ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {sellerLocationLabel}
                </p>
              ) : null}

              {isBusinessSeller && websiteLabel ? (
                <a
                  className="mt-1 block text-sm font-medium text-primary hover:underline"
                  href={websiteHref}
                  target="_blank"
                  rel="noreferrer"
                >
                  {websiteLabel}
                </a>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-xl border border-gray-100 bg-white p-3 text-sm text-slate-700">
            <div>
              <p className="text-xs text-muted-foreground">Rating</p>
              <p className="text-base font-semibold text-slate-700">
                {ratingLabel.toFixed(1)} ⭐
              </p>
            </div>

            <div className="border-l border-gray-100 pl-3">
              <p className="text-xs text-muted-foreground">Reviews</p>
              <p className="text-base font-semibold text-slate-700">
                {reviewsLabel}
              </p>
            </div>

            <div className="border-l border-gray-100 pl-3">
              <p className="text-xs text-muted-foreground">On Vuxsy</p>
              <p className="text-base font-semibold text-slate-700">
                {daysOnPlatform}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <button
              className="btn btn--primary w-full rounded-xl"
              type="button"
              onClick={handleContactSeller}
              disabled={contactLoading || isMessagingDisabled || isSeller}
            >
              {isSeller
                ? "Your listing"
                : isMessagingDisabled
                ? "Messaging unavailable"
                : contactLoading
                ? "Starting chat…"
                : "Contact seller"}
            </button>

            {contactError ? (
              <p className="text-xs text-rose-600">{contactError}</p>
            ) : null}

            {phoneLabel ? (
              <button
                className="btn btn--ghost w-full rounded-xl"
                type="button"
                onClick={() => setShowPhone((prev) => !prev)}
              >
                {showPhone ? `Call ${phoneLabel}` : "Show contact number"}
              </button>
            ) : null}

            {emailLabel ? (
              <a
                className="btn btn--secondary w-full rounded-xl"
                href={`mailto:${emailLabel}`}
              >
                Email seller
              </a>
            ) : null}
          </div>
        </div>

          <div className="mt-auto flex justify-start">
            <button className="btn btn--secondary rounded-xl px-4 text-slate-400 hover:text-slate-500">
              View all ads
            </button>
          </div>
        </div>
      </div>
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="top-0 left-0 h-full w-full max-w-none translate-x-0 translate-y-0 rounded-none bg-(--bg-page) ring-0 shadow-none sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl">
          <DialogHeader>
            <DialogTitle>Send message</DialogTitle>
            <DialogDescription>
              Contact {sellerName} about this listing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-(--bg-card) p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Seller</p>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {isOfficialVuxsy ? (
                  <span className="inline-flex items-center">
                    VUXSY
                    <VuxsyVerifiedBadge displayName={displayName} size={18} />
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    {sellerName}
                  </span>
                )}
              </div>
              {sellerLocationLabel ? (
                <p className="text-xs text-slate-500">{sellerLocationLabel}</p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                <span className="rounded-full border border-slate-200 bg-white px-2 py-1">
                  {sellerLabel}
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-2 py-1">
                  Verification pending
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-2 py-1">
                  Safe meeting tips
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Quick message
              </label>
              <select
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                onChange={(event) => {
                  const nextValue = event.target.value;
                  if (nextValue) {
                    setMessageDraft(nextValue);
                  }
                }}
              >
                <option value="">Choose a template</option>
                {presetMessages.map((preset) => (
                  <option key={preset} value={preset}>
                    {preset}
                  </option>
                ))}
              </select>

              <Textarea
                value={messageDraft}
                onChange={(event) => setMessageDraft(event.target.value)}
                rows={5}
                placeholder="Write your message…"
              />
              {!user ? (
                <p className="mt-2 text-xs text-rose-600">Not authenticated</p>
              ) : null}
              {sendError ? (
                <p className="mt-2 text-xs text-rose-600">{sendError}</p>
              ) : null}
            </div>
          </div>
          <DialogFooter className="border-t-0 bg-transparent">
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={contactLoading || !user}
              className="rounded-xl bg-(--color-primary) px-4 py-2 text-sm font-semibold text-white transition hover:bg-(--color-primary-hover) disabled:cursor-not-allowed disabled:bg-gray-300"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              {contactLoading ? "Sending…" : "Send message"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}