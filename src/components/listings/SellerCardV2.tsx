"use client";

import * as React from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Listing } from "@/types/listing";
import { useAuth } from "@/components/auth/AuthProvider";
import { runtimeLog } from "@/lib/diagnostics/runtimeLog";
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
  allowPhone?: boolean | null;
  allowEmail?: boolean | null;
  showPhonePublicly?: boolean | null;
  showEmailPublicly?: boolean | null;
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

const getMemberSinceLabel = (daysOnPlatform: number) => {
  if (!Number.isFinite(daysOnPlatform) || daysOnPlatform < 30) return "New";
  if (daysOnPlatform < 90) return "1 mo";
  if (daysOnPlatform < 180) return "3 mo";
  if (daysOnPlatform < 365) return "6 mo";
  if (daysOnPlatform < 3 * 365) return "1 yr";
  if (daysOnPlatform < 5 * 365) return "3 yrs";
  if (daysOnPlatform < 12 * 365) return "5 yrs";
  return "12 yrs";
};

export default function SellerCardV2({
  seller,
  sellerType,
  createdAt,
  contactPhone,
  contactEmail,
  listingId,
  sellerId,
  allowMessages,
  allowPhone,
  allowEmail,
  showPhonePublicly,
  showEmailPublicly,
}: SellerCardV2Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, profile } = useAuth();
  const [contactLoading, setContactLoading] = React.useState(false);
  const [contactError, setContactError] = React.useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [messageDraft, setMessageDraft] = React.useState(
    "Hi, is this still available?"
  );
  const [sendError, setSendError] = React.useState<string | null>(null);
  const messageTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);
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

  const avatarFieldUsed: "avatarUrl" | "googlePhotoUrl" | "avatar_url" | "google_photo_url" | "fallback" =
    cleanValue(sellerProfile.avatarUrl)
      ? "avatarUrl"
      : cleanValue(sellerProfile.googlePhotoUrl)
        ? "googlePhotoUrl"
        : cleanValue(sellerProfile.avatar_url)
          ? "avatar_url"
          : cleanValue(sellerProfile.google_photo_url)
            ? "google_photo_url"
            : "fallback";

  const sellerAvatarFieldValues = React.useMemo(
    () => ({
      avatarUrl: cleanValue(sellerProfile.avatarUrl) || null,
      googlePhotoUrl: cleanValue(sellerProfile.googlePhotoUrl) || null,
      avatar_url: cleanValue(sellerProfile.avatar_url) || null,
      google_photo_url: cleanValue(sellerProfile.google_photo_url) || null,
    }),
    [
      sellerProfile.avatarUrl,
      sellerProfile.googlePhotoUrl,
      sellerProfile.avatar_url,
      sellerProfile.google_photo_url,
    ]
  );

  const currentProfileAvatarUrl = user?.id
    ? cleanValue(profile?.avatarUrl) || cleanValue(profile?.googlePhotoUrl)
    : "";

  const avatarSourceUsed: "sellerProfile" | "fallback" | "WRONG_currentUser" =
    avatarUrl.length === 0
      ? "fallback"
      : currentProfileAvatarUrl.length > 0 &&
          avatarUrl === currentProfileAvatarUrl &&
          Boolean(user?.id) &&
          Boolean(sellerId) &&
          user?.id !== sellerId
        ? "WRONG_currentUser"
        : "sellerProfile";

  React.useEffect(() => {
    runtimeLog("SELLER CARD DATA", {
      listingId: listingId ?? null,
      listingOwnerId: sellerId ?? null,
      authUserId: user?.id ?? null,
      sellerAvatarFields: sellerAvatarFieldValues,
      avatarFieldUsed,
      finalResolvedAvatarUrl: avatarUrl || null,
      sellerAvatarUrl: avatarUrl || null,
      currentProfileAvatarUrl: currentProfileAvatarUrl || null,
      avatarSourceUsed,
    });
  }, [
    listingId,
    sellerId,
    user?.id,
    avatarUrl,
    avatarFieldUsed,
    sellerAvatarFieldValues,
    currentProfileAvatarUrl,
    avatarSourceUsed,
  ]);

  const areaLabel = capitalizeWords(sellerProfile.area);
  const countyLabel = capitalizeWords(sellerProfile.county);

  const sellerLocationLabel = [countyLabel, areaLabel].filter(Boolean).join(" • ");

  const sellerInitial =
    cleanValue(sellerName).charAt(0).toUpperCase() || "S";

  const sellerSince =
    sellerProfile.createdAt ?? sellerProfile.created_at ?? createdAt ?? null;

  const [daysOnPlatform, setDaysOnPlatform] = React.useState<number>(0);
  const [showPhone, setShowPhone] = React.useState(Boolean(showPhonePublicly));
  const canMessage = allowMessages === true;
  const canPhone = allowPhone === true;
  const canEmail = allowEmail === true;
  const phoneAlwaysVisible = showPhonePublicly === true;
  const emailAlwaysVisible = showEmailPublicly === true;
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

  const resizeMessageTextarea = React.useCallback(
    (target?: HTMLTextAreaElement | null) => {
      const textarea = target ?? messageTextareaRef.current;
      if (!textarea) return;

      const minHeight = 44;
      const maxHeight = 116;

      textarea.style.height = `${minHeight}px`;
      const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${Math.max(minHeight, nextHeight)}px`;
      textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
    },
    []
  );

  React.useEffect(() => {
    if (!isModalOpen) return;
    if (typeof window === "undefined") return;

    window.requestAnimationFrame(() => {
      resizeMessageTextarea();
    });
  }, [isModalOpen, messageDraft, resizeMessageTextarea]);


  const handleContactSeller = () => {
    if (!user) {
  redirectToLogin();
      return;
    }
    if (!canMessage || isSeller) {
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
      setSendError("Please log in to contact this seller.");
      setIsModalOpen(false);
  redirectToLogin();
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
  const memberSinceLabel = getMemberSinceLabel(daysOnPlatform);

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

  const hasPhoneOption = canPhone && Boolean(phoneLabel);
  const hasEmailOption = canEmail && Boolean(emailLabel);
  const hasMessageOption = canMessage;
  const hasContactOptions = hasMessageOption || hasPhoneOption || hasEmailOption;
  const phoneVisible = Boolean(user) && (phoneAlwaysVisible || showPhone);
  const emailButtonLabel = Boolean(user) && emailAlwaysVisible ? emailLabel : "Email seller";


  const buildRedirectPath = React.useCallback(() => {
    const search = searchParams?.toString();
    const basePath = pathname ?? "/";
    return search ? `${basePath}?${search}` : basePath;
  }, [pathname, searchParams]);

  const redirectToLogin = React.useCallback(() => {
    const redirectPath = buildRedirectPath();
    setContactError("Please log in to contact this seller.");
    router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`);
  }, [buildRedirectPath, router]);

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
                {memberSinceLabel}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {hasMessageOption ? (
              <button
                className="btn btn-primary"
                type="button"
                onClick={handleContactSeller}
                disabled={contactLoading || isSeller}
              >
                {isSeller
                  ? "Your listing"
                  : contactLoading
                  ? "Starting chat…"
                  : "Contact seller"}
              </button>
            ) : null}

            {contactError ? (
              <p className="text-xs text-rose-600">{contactError}</p>
            ) : null}

            {hasPhoneOption ? (
              phoneVisible ? (
                <a
                  className="btn btn-outline"
                  href={`tel:${phoneLabel}`}
                >
                  Call {phoneLabel}
                </a>
              ) : (
                <button
                  className="btn btn-outline"
                  type="button"
                  onClick={() => {
                    if (!user) {
                      redirectToLogin();
                      return;
                    }
                    if (phoneAlwaysVisible) return;
                    setShowPhone(true);
                  }}
                >
                  Show contact number
                </button>
              )
            ) : null}

            {hasEmailOption ? (
              user ? (
                <a
                  className="btn btn-outline btn-outline-muted"
                  href={`mailto:${emailLabel}`}
                >
                  {emailButtonLabel}
                </a>
              ) : (
                <button
                  className="btn btn-outline btn-outline-muted"
                  type="button"
                  onClick={() => redirectToLogin()}
                >
                  {emailButtonLabel}
                </button>
              )
            ) : null}

            {!hasContactOptions ? (
              <p className="text-xs text-slate-500">
                This seller has not enabled contact options.
              </p>
            ) : null}
          </div>
        </div>

          <div className="mt-auto flex justify-start">
            <button className="seller-link" type="button">
              View all ads
            </button>
          </div>
        </div>
      </div>
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-h-[calc(100vh-16px)] max-w-115 overflow-hidden bg-(--bg-page) p-2">
          <DialogHeader className="mb-2 gap-2 rounded-xl p-2">
            <DialogTitle>Send message</DialogTitle>
            <DialogDescription>
              Contact {sellerName} about this listing.
            </DialogDescription>
          </DialogHeader>
          <div className="mb-2 space-y-2">
            <div className="mb-2 rounded-xl border border-slate-200 bg-(--bg-card) p-2">
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

            <div className="mb-2 space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Quick message
              </label>
              <select
                className="w-full rounded-[10px] border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
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

              <textarea
                ref={messageTextareaRef}
                value={messageDraft}
                onChange={(event) => {
                  setMessageDraft(event.target.value);
                  resizeMessageTextarea(event.currentTarget);
                }}
                onInput={(event) => resizeMessageTextarea(event.currentTarget)}
                rows={1}
                placeholder="Write your message…"
                className="w-full resize-none rounded-[10px] border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-(--color-primary) focus:ring-2 focus:ring-(--color-primary)/20"
                style={{
                  height: "44px",
                  minHeight: "44px",
                  maxHeight: "116px",
                  overflowY: "hidden",
                  resize: "none",
                }}
              />
              {!user ? (
                <p className="text-xs text-rose-600">
                  Please log in to contact this seller.
                </p>
              ) : null}
              {sendError ? (
                <p className="text-xs text-rose-600">{sendError}</p>
              ) : null}
            </div>
          </div>
          <DialogFooter className="mt-2 border-t-0 bg-transparent p-2">
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={contactLoading || !user}
              className="btn btn-primary min-h-11 transition hover:bg-(--color-primary-hover) disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {contactLoading ? "Sending…" : "Send message"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}