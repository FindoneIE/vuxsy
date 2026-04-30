import type { Listing } from "@/types/listing";

type SellerSnapshot = NonNullable<Listing["seller"]> & Record<string, unknown>;

type ProfileSource = Record<string, unknown> | null | undefined;

type SellerSnapshotOptions = {
  sellerType?: Listing["sellerType"] | null;
  displayName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  county?: string | null;
  area?: string | null;
  companyName?: string | null;
  businessAddress?: string | null;
  vatNumber?: string | null;
  registrationNumber?: string | null;
  website?: string | null;
  avatarUrl?: string | null;
  googlePhotoUrl?: string | null;
  createdAt?: string | Date | null;
  existingSeller?: Listing["seller"] | null;
};

const getString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const getBoolean = (value: unknown): boolean => value === true;

const normalizeSellerType = (value?: string | null) => {
  const normalized = getString(value)?.toLowerCase();
  if (normalized === "business" || normalized === "private") return normalized;
  return null;
};

export const resolveSellerTypeFromSnapshot = (
  sellerType?: Listing["sellerType"] | null,
  seller?: Listing["seller"] | null
): "business" | "private" => {
  const normalizedType = normalizeSellerType(sellerType ?? null);
  if (normalizedType) return normalizedType;

  const sellerRecord = (seller ?? {}) as Record<string, unknown>;
  const snapshotType = normalizeSellerType(
    getString(
      (sellerRecord as { type?: string | null; sellerType?: string | null })
        .type ||
        (sellerRecord as { sellerType?: string | null }).sellerType
    )
  );
  if (snapshotType) return snapshotType;

  const isBusiness =
    getBoolean((sellerRecord as { isBusinessSeller?: boolean | null }).isBusinessSeller) ||
    getBoolean((sellerRecord as { is_business_seller?: boolean | null }).is_business_seller) ||
    Boolean(
      getString((sellerRecord as { companyName?: string | null }).companyName) ||
        getString((sellerRecord as { company_name?: string | null }).company_name)
    );

  return isBusiness ? "business" : "private";
};

export const buildSellerSnapshotFromProfile = (
  profile: ProfileSource,
  options: SellerSnapshotOptions = {}
): { sellerSnapshot: SellerSnapshot; sellerType: "business" | "private" } => {
  const profileRecord = (profile ?? {}) as Record<string, unknown>;
  const existingSeller = options.existingSeller ?? null;
  const existingSellerRecord = (existingSeller ?? {}) as Record<string, unknown>;

  const profileCompanyName =
    getString(profileRecord.company_name) || getString(profileRecord.companyName);
  const profileWebsite = getString(profileRecord.website);
  const profileCounty = getString(profileRecord.county);
  const profileArea = getString(profileRecord.area);

  const profileDisplayName =
    getString(profileRecord.display_name) ||
    getString(profileRecord.displayName) ||
    getString(profileRecord.full_name) ||
    getString(profileRecord.fullName) ||
    getString(profileRecord.name) ||
    getString(profileRecord.username) ||
    getString(profileRecord.contact_name) ||
    getString(profileRecord.email);

  const fallbackDisplayName =
    getString(existingSellerRecord.displayName) ||
    getString(existingSellerRecord.display_name) ||
    getString(existingSellerRecord.fullName) ||
    getString(existingSellerRecord.full_name) ||
    getString(existingSellerRecord.name) ||
    getString(existingSellerRecord.username) ||
    getString(existingSellerRecord.email) ||
    profileDisplayName ||
    "User";

  const resolvedSellerType = resolveSellerTypeFromSnapshot(
    options.sellerType ?? null,
    existingSeller ?? null
  );

  const profileIsBusinessSeller =
    getBoolean(profileRecord.is_business_seller) ||
    getBoolean(profileRecord.isBusinessSeller) ||
    Boolean(profileCompanyName);

  const isBusinessSeller =
    resolvedSellerType === "business" ||
    (resolvedSellerType !== "private" && profileIsBusinessSeller);

  const sellerType: "business" | "private" = isBusinessSeller
    ? "business"
    : "private";

  const companyName = isBusinessSeller
    ? getString(options.companyName) ||
      getString(existingSellerRecord.companyName) ||
      getString(existingSellerRecord.company_name) ||
      profileCompanyName
    : null;

  const displayName = getString(options.displayName) || fallbackDisplayName;

  const createdAt =
    (options.createdAt ? new Date(options.createdAt).toISOString() : null) ||
    getString(profileRecord.created_at) ||
    getString(existingSellerRecord.created_at) ||
    null;

  const contactEmail =
    getString(options.contactEmail) ||
    getString(existingSellerRecord.contact_email) ||
    getString(existingSellerRecord.email) ||
    getString(profileRecord.contact_email) ||
    getString(profileRecord.email) ||
    null;

  const contactPhone =
    getString(options.contactPhone) ||
    getString(existingSellerRecord.contact_phone) ||
    getString(profileRecord.contact_phone) ||
    getString(profileRecord.phone) ||
    null;

  const sellerSnapshot: SellerSnapshot = {
    displayName,
    display_name: displayName,
    fullName: displayName,
    full_name: displayName,
    name: displayName,
    username:
      getString(existingSellerRecord.username) ||
      getString(profileRecord.username) ||
      null,
    email: contactEmail,
    contact_email: contactEmail,
    contact_phone: contactPhone,
    companyName,
    company_name: companyName,
    businessAddress: isBusinessSeller
      ? getString(options.businessAddress) ||
        getString(existingSellerRecord.businessAddress) ||
        getString(existingSellerRecord.business_address) ||
        getString(profileRecord.business_address) ||
        null
      : null,
    business_address: isBusinessSeller
      ? getString(options.businessAddress) ||
        getString(existingSellerRecord.businessAddress) ||
        getString(existingSellerRecord.business_address) ||
        getString(profileRecord.business_address) ||
        null
      : null,
    vatNumber: isBusinessSeller
      ? getString(options.vatNumber) ||
        getString(existingSellerRecord.vatNumber) ||
        getString(existingSellerRecord.vat_number) ||
        getString(profileRecord.vat_number) ||
        null
      : null,
    vat_number: isBusinessSeller
      ? getString(options.vatNumber) ||
        getString(existingSellerRecord.vatNumber) ||
        getString(existingSellerRecord.vat_number) ||
        getString(profileRecord.vat_number) ||
        null
      : null,
    registrationNumber: isBusinessSeller
      ? getString(options.registrationNumber) ||
        getString(existingSellerRecord.registrationNumber) ||
        getString(existingSellerRecord.registration_number) ||
        getString(profileRecord.company_registration_number) ||
        null
      : null,
    registration_number: isBusinessSeller
      ? getString(options.registrationNumber) ||
        getString(existingSellerRecord.registrationNumber) ||
        getString(existingSellerRecord.registration_number) ||
        getString(profileRecord.company_registration_number) ||
        null
      : null,
    isBusinessSeller,
    is_business_seller: isBusinessSeller,
    county:
      getString(options.county) ||
      getString(existingSellerRecord.county) ||
      profileCounty ||
      null,
    area:
      getString(options.area) ||
      getString(existingSellerRecord.area) ||
      profileArea ||
      null,
    website: isBusinessSeller
      ? getString(options.website) ||
        getString(existingSellerRecord.website) ||
        profileWebsite ||
        null
      : null,
    avatarUrl:
      getString(options.avatarUrl) ||
      getString(existingSellerRecord.avatarUrl) ||
      getString(existingSellerRecord.avatar_url) ||
      getString(profileRecord.avatar_url) ||
      getString(profileRecord.google_photo_url) ||
      null,
    avatar_url:
      getString(options.avatarUrl) ||
      getString(existingSellerRecord.avatarUrl) ||
      getString(existingSellerRecord.avatar_url) ||
      getString(profileRecord.avatar_url) ||
      getString(profileRecord.google_photo_url) ||
      null,
    googlePhotoUrl:
      getString(options.googlePhotoUrl) ||
      getString(existingSellerRecord.googlePhotoUrl) ||
      getString(existingSellerRecord.google_photo_url) ||
      getString(profileRecord.google_photo_url) ||
      null,
    google_photo_url:
      getString(options.googlePhotoUrl) ||
      getString(existingSellerRecord.googlePhotoUrl) ||
      getString(existingSellerRecord.google_photo_url) ||
      getString(profileRecord.google_photo_url) ||
      null,
    created_at: createdAt,
    createdAt,
    type: sellerType,
    sellerType,
    seller_type: sellerType,
  };

  return { sellerSnapshot, sellerType };
};