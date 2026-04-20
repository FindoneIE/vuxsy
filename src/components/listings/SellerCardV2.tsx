import * as React from "react";
import Image from "next/image";
import type { Listing } from "@/types/listing";

type SellerProfileSource = NonNullable<Listing["seller"]> & {
  company_name?: string | null;
  is_business_seller?: boolean | null;
  display_name?: string | null;
  full_name?: string | null;
  website?: string | null;
  county?: string | null;
  area?: string | null;
  name?: string | null;
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
  createdAt?: Listing["created_at"] | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
};

const cleanValue = (value?: string | null) => (typeof value === "string" ? value.trim() : "");
const capitalizeWords = (value?: string | null) =>
  typeof value === "string"
    ? value
        .trim()
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ")
    : "";

export default function SellerCardV2({
  seller,
  createdAt,
  contactPhone,
  contactEmail,
}: SellerCardV2Props) {
  const sellerProfile = (seller ?? {}) as SellerProfileSource;
  const companyName = cleanValue(sellerProfile.companyName ?? sellerProfile.company_name);
  const isBusinessSeller =
    (sellerProfile.isBusinessSeller ?? sellerProfile.is_business_seller) === true &&
    companyName.length > 0;
  const privateName =
    cleanValue(sellerProfile.displayName ?? sellerProfile.display_name) ||
    cleanValue(sellerProfile.fullName ?? sellerProfile.full_name) ||
    cleanValue(sellerProfile.name);
  const sellerName = isBusinessSeller ? companyName : privateName || "Seller";
  const sellerLabel = isBusinessSeller ? "BUSINESS" : "PRIVATE";
  const websiteLabel = cleanValue(sellerProfile.website ?? sellerProfile.website);
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
  const sellerLocationLabel = [
    countyLabel,
    areaLabel,
  ]
    .filter(Boolean)
    .join(" • ");
  const fallbackName = isBusinessSeller ? companyName : privateName || "Seller";
  const sellerInitial = fallbackName.trim().charAt(0).toUpperCase() || "S";
  const sellerSince = sellerProfile.createdAt ?? sellerProfile.created_at ?? createdAt ?? null;
  const [daysOnPlatform, setDaysOnPlatform] = React.useState<number>(0);
  const [showPhone, setShowPhone] = React.useState(false);
  React.useEffect(() => {
    if (!sellerSince) {
      setDaysOnPlatform(0);
      return;
    }
    const sellerDate = new Date(sellerSince as string | number | Date);
    if (Number.isNaN(sellerDate.getTime())) {
      setDaysOnPlatform(0);
      return;
    }
    const nextDays = Math.max(
      1,
      Math.ceil((Date.now() - sellerDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    setDaysOnPlatform(nextDays);
  }, [sellerSince]);
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
    <div className="w-full lg:w-92 rounded-2xl border border-gray-200 bg-white p-3 lg:p-6 shadow-sm">
      <div className="flex h-full flex-col gap-3 lg:gap-5">
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
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{sellerLabel}</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{sellerName}</p>
            {sellerLocationLabel ? (
              <p className="mt-1 text-sm text-muted-foreground">{sellerLocationLabel}</p>
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
            <p className="text-base font-semibold text-slate-700">{ratingLabel.toFixed(1)} ⭐</p>
          </div>
          <div className="border-l border-gray-100 pl-3">
            <p className="text-xs text-muted-foreground">Reviews</p>
            <p className="text-base font-semibold text-slate-700">{reviewsLabel}</p>
          </div>
          <div className="border-l border-gray-100 pl-3">
            <p className="text-xs text-muted-foreground">On Vuxsy</p>
            <p className="text-base font-semibold text-slate-700">{daysOnPlatform}</p>
          </div>
        </div>

        <div className="space-y-2">
          <button className="btn btn--primary w-full rounded-xl">Contact seller</button>
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
            <a className="btn btn--secondary w-full rounded-xl" href={`mailto:${emailLabel}`}>
              Email seller
            </a>
          ) : null}
        </div>
        </div>

        <div className="mt-auto flex justify-start">
          <button className="btn btn--secondary rounded-xl px-4 text-slate-400 underline hover:text-slate-500">
            View all ads
          </button>
        </div>
      </div>
    </div>
  );
}
