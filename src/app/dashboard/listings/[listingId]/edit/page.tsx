"use client";

import * as React from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/auth/AuthProvider";
import PageContainer from "@/components/layout/PageContainer";
import ListingStatusBadge from "@/components/listings/ListingStatusBadge";
import LocationFields from "@/components/location/LocationFields";
import PhotoUploadField, { type PhotoDraft } from "@/components/forms/listing/PhotoUploadField";
import ServiceFormFields from "@/components/forms/listing/ServiceFormFields";
import RequestFormFields from "@/components/forms/listing/RequestFormFields";
import MarketplaceFormFields from "@/components/forms/listing/MarketplaceFormFields";
import { CATEGORIES_MARKETPLACE, CATEGORIES_REQUESTS, CATEGORIES_SERVICES } from "@/components/filters/categories";
import {
  defaultListingFormValues,
  requiredFieldsByType,
  type ListingFormErrors,
  type ListingFormValues,
  type ListingFormChangeHandler,
} from "@/components/forms/listing/listingFormConfig";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ChevronDown } from "@/components/ui/Icon";
import { getListingById } from "@/lib/listings/getListingById";
import { updateListing } from "@/lib/listings/updateListing";
import { updateListingStatus } from "@/lib/listings/updateListingStatus";
import { deleteListing } from "@/lib/listings/deleteListing";
import { getListingHref } from "@/lib/listings/getListingHref";
import { uploadImage } from "@/lib/supabase/storage";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { updateUserProfile } from "@/lib/users";
import { validateDisplayName } from "@/lib/display-name-policy";
import { buildSellerSnapshotFromProfile } from "@/lib/listings/sellerSnapshot";
import type { Listing, ListingType } from "@/types/listing";
import type { UserProfile } from "@/types/user";

type ExistingImage = {
  path600?: string | null;
  path1800?: string | null;
  url?: string | null;
  largeUrl?: string | null;
  sortOrder?: number | null;
};

const statusOptions: Array<{ value: Listing["status"]; label: string }> = [
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "archived", label: "Archived" },
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending review" },
  { value: "rejected", label: "Rejected" },
];

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

const toNumberOrNull = (value: string) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
};

const resolveNonEmptyString = (
  ...values: Array<string | null | undefined>
) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return "";
};

const resolveNonEmptyNullable = (
  ...values: Array<string | null | undefined>
) => {
  const resolved = resolveNonEmptyString(...values);
  return resolved ? resolved : null;
};

const MIN_PHONE_LENGTH = 7;
const MAX_PHONE_LENGTH = 11;

const normalizeContactPhone = (value: string, country: "+353" | "+44") => {
  let digits = value.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (country === "+353" && digits.length !== 9) {
    throw new Error("Invalid IE phone");
  }

  if (country === "+44" && digits.length !== 10) {
    throw new Error("Invalid UK phone");
  }

  if (digits.length < MIN_PHONE_LENGTH || digits.length > MAX_PHONE_LENGTH) {
    return null;
  }

  return `${country}${digits}`;
};

const parseContactPhone = (value?: string | null) => {
  const trimmed = value?.trim() ?? "";
  if (trimmed.startsWith("+353")) {
    return { country: "+353" as const, local: trimmed.slice(4) };
  }
  if (trimmed.startsWith("+44")) {
    return { country: "+44" as const, local: trimmed.slice(3) };
  }
  return { country: "+353" as const, local: "" };
};


export default function ListingEditPage() {
  const router = useRouter();
  const params = useParams<{ listingId: string }>();
  const listingId = params?.listingId;
  const { user, profile, refreshProfile, profileLoading } = useAuth();
  const isAdmin = profile?.role === "admin";
  const isProfileHydrating = profileLoading && !profile;

  const [listing, setListing] = React.useState<Listing | null>(null);
  const [listingType, setListingType] = React.useState<ListingType>("service");
  const [formValues, setFormValues] = React.useState<ListingFormValues>(
    defaultListingFormValues
  );
  const [errors, setErrors] = React.useState<ListingFormErrors>({});
  const [status, setStatus] = React.useState<Listing["status"]>("active");
  const [existingImages, setExistingImages] = React.useState<ExistingImage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = React.useState<string | null>(null);
  const [dirty, setDirty] = React.useState(false);
  const privateNameRef = React.useRef<string>("");

  React.useEffect(() => {
    if (dirty) return;
  const fallbackEmail = profile?.email ?? user?.email ?? "";
  const fallbackPhone = profile?.phone ?? "";
  const fallbackDisplayName = profile?.displayName ?? "";
    if (!fallbackEmail && !fallbackPhone && !fallbackDisplayName) return;
    queueMicrotask(() => {
      setFormValues((prev) => ({
        ...prev,
        displayName: prev.displayName.trim() ? prev.displayName : fallbackDisplayName,
        contactEmail: prev.contactEmail.trim() ? prev.contactEmail : fallbackEmail,
        contactPhone: prev.contactPhone.trim() ? prev.contactPhone : fallbackPhone,
      }));
    });
  }, [dirty, profile?.displayName, profile?.email, profile?.phone, user?.email]);

  const categoryOptions = React.useMemo(() => {
    if (listingType === "marketplace") return CATEGORIES_MARKETPLACE;
    if (listingType === "request") return CATEGORIES_REQUESTS;
    return CATEGORIES_SERVICES;
  }, [listingType]);

  const handleChange: ListingFormChangeHandler = (field, value) => {
    setFormValues((prev) => {
      if (field === "displayName" && !prev.listAsBusiness && typeof value === "string") {
        privateNameRef.current = value;
      }
      return { ...prev, [field]: value };
    });
    setDirty(true);
  };

  const handleBusinessToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = event.target.checked;
    setFormValues((prev) => ({
      ...prev,
      listAsBusiness: isChecked,
      ...(isChecked
        ? {
            companyName:
              prev.companyName.trim() ||
              resolveNonEmptyString(
                profile?.companyName ?? null,
                (profile as Record<string, unknown> | null)?.company_name as
                  | string
                  | null
                  | undefined
              ),
            businessAddress:
              prev.businessAddress.trim() ||
              resolveNonEmptyString(
                profile?.businessAddress ?? null,
                (profile as Record<string, unknown> | null)?.business_address as
                  | string
                  | null
                  | undefined
              ),
            vatNumber:
              prev.vatNumber.trim() ||
              resolveNonEmptyString(
                profile?.vatNumber ?? null,
                (profile as Record<string, unknown> | null)?.vat_number as
                  | string
                  | null
                  | undefined
              ),
            website:
              prev.website.trim() ||
              resolveNonEmptyString(profile?.website ?? null),
            registrationNumber:
              prev.registrationNumber.trim() ||
              resolveNonEmptyString(
                profile?.registrationNumber ?? null,
                (profile as Record<string, unknown> | null)?.company_registration_number as
                  | string
                  | null
                  | undefined
              ),
            displayName:
              prev.displayName.trim() ||
              resolveNonEmptyString(
                profile?.companyName ?? null,
                (profile as Record<string, unknown> | null)?.company_name as
                  | string
                  | null
                  | undefined,
                prev.displayName
              ),
          }
        : {
            companyName: "",
            businessAddress: "",
            vatNumber: "",
            website: "",
            registrationNumber: "",
            displayName: resolveNonEmptyString(privateNameRef.current, prev.displayName),
          }),
    }));

    if (!isChecked) {
      setErrors((prev) => {
        const nextErrors = { ...prev };
        delete nextErrors.companyName;
        delete nextErrors.businessAddress;
        return nextErrors;
      });
    }
  };

  const selectedCategory =
    listingType === "service"
      ? formValues.serviceCategory
      : listingType === "request"
      ? formValues.requestCategory
      : formValues.marketplaceCategory;

  const currentPhotos: PhotoDraft[] =
    listingType === "service"
      ? formValues.servicePhotos
      : listingType === "request"
      ? formValues.requestPhotos
      : formValues.marketplacePhotos;

  const setPhotos = (photos: PhotoDraft[]) => {
    if (listingType === "service") handleChange("servicePhotos", photos);
    else if (listingType === "request") handleChange("requestPhotos", photos);
    else handleChange("marketplacePhotos", photos);
  };

  const setCategory = (value: string) => {
    if (listingType === "service") handleChange("serviceCategory", value);
    if (listingType === "request") handleChange("requestCategory", value);
    if (listingType === "marketplace") handleChange("marketplaceCategory", value);
  };

  const resolveCategoryId = React.useCallback(
    async (value: string) => {
      if (!value) return null;
      if (isUuid(value)) return value;
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", value)
        .maybeSingle();
      if (error || !data?.id) return null;
      return data.id as string;
    },
    []
  );

  const resolveCategorySlug = React.useCallback(
    async (value?: string | null) => {
      if (!value) return "";
      if (!isUuid(value)) return value;
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("categories")
        .select("slug")
        .eq("id", value)
        .maybeSingle();
      if (error || !data?.slug) return "";
      return data.slug as string;
    },
    []
  );

  const loadListing = React.useCallback(async () => {
    if (!listingId) return;
    setLoading(true);
  setSaveError(null);
  setSaveSuccess(null);
    const result = await getListingById(String(listingId), {
      includeSavedStatus: false,
      currentUserId: user?.id ?? null,
    });
    if (!result) {
      setListing(null);
      setLoading(false);
      return;
    }

    const type = (result.listing_type ?? "service") as ListingType;
    setListingType(type);
    setListing(result);
    setStatus(result.status ?? "active");

    const [categorySlug, imageRows] = await Promise.all([
      resolveCategorySlug(result.category_id),
      createSupabaseBrowserClient()
        .from("listing_images")
        .select("storage_path_600, storage_path_1800, sort_order")
        .eq("listing_id", result.id)
        .order("sort_order", { ascending: true })
        .then(({ data }) => data ?? []),
    ]);

    const fallbackPhone = profile?.phone ?? "";
    const fallbackDisplayName = profile?.displayName ?? "";
    const sellerSnapshot = result.seller ?? null;
    const profileBusinessValue =
      profile?.businessSeller ??
      ((profile as Record<string, unknown> | null)?.is_business_seller as
        | boolean
        | null
        | undefined);
    const snapshotSellerType =
      result.sellerType ??
      sellerSnapshot?.type ??
      (sellerSnapshot?.isBusinessSeller ||
      (sellerSnapshot as Record<string, unknown> | null)?.is_business_seller
        ? "business"
        : "private");
    const resolvedSellerType =
      typeof profileBusinessValue === "boolean"
        ? profileBusinessValue
          ? "business"
          : "private"
        : snapshotSellerType;
    const profileCompanyName = resolveNonEmptyString(
      profile?.companyName ?? null,
      (profile as Record<string, unknown> | null)?.company_name as string | null | undefined
    );
    const listingCompanyName = resolveNonEmptyString(
      sellerSnapshot?.companyName ?? null,
      (sellerSnapshot as { company_name?: string | null })?.company_name ?? null
    );
    const snapshotCompanyName = resolveNonEmptyString(
      listingCompanyName,
      profileCompanyName
    );
    const snapshotSellerName = resolveNonEmptyString(
      sellerSnapshot?.displayName ?? null,
      sellerSnapshot?.fullName ?? null,
      sellerSnapshot?.name ?? null,
      profile?.displayName ?? null,
      fallbackDisplayName
    );
    const privateDisplayName = resolveNonEmptyString(
      snapshotSellerName && snapshotSellerName !== snapshotCompanyName
        ? snapshotSellerName
        : "",
      profile?.displayName ?? null,
      fallbackDisplayName,
      snapshotSellerName
    );
    privateNameRef.current = privateDisplayName;
    const snapshotDisplayName =
      resolvedSellerType === "business"
        ? resolveNonEmptyString(snapshotCompanyName, snapshotSellerName, fallbackDisplayName)
        : privateDisplayName;
    const listingContactEmail = resolveNonEmptyString(
      result.contact_email ?? null,
      (sellerSnapshot as { contact_email?: string | null })?.contact_email ?? null,
      (sellerSnapshot as { email?: string | null })?.email ?? null
    );
    const profileContactEmail = resolveNonEmptyString(
      profile?.email ?? null,
      user?.email ?? null
    );
    const snapshotEmail = resolveNonEmptyString(
      listingContactEmail,
      profileContactEmail
    );

    const listingContactPhone = resolveNonEmptyString(
      result.contact_phone ?? null,
      (sellerSnapshot as { contact_phone?: string | null })?.contact_phone ?? null
    );
    const profileContactPhone = resolveNonEmptyString(profile?.phone ?? null, fallbackPhone);
    const snapshotPhone = resolveNonEmptyString(
      listingContactPhone,
      profileContactPhone
    );

    const listingCounty = resolveNonEmptyString(
      result.county ?? null,
      result.city ?? null,
      (sellerSnapshot as { county?: string | null })?.county ?? null
    );
    const profileCounty = resolveNonEmptyString(
      profile?.county ?? null,
      profile?.city ?? null
    );
    const snapshotCounty = resolveNonEmptyString(
      listingCounty,
      profileCounty
    );

    const listingArea = resolveNonEmptyString(
      result.area ?? null,
      (sellerSnapshot as { area?: string | null })?.area ?? null
    );
    const profileArea = resolveNonEmptyString(profile?.area ?? null);
    const snapshotArea = resolveNonEmptyString(
      listingArea,
      profileArea
    );
    const snapshotWebsite = resolveNonEmptyString(
      resolvedSellerType === "business" ? profile?.website ?? null : null,
      (sellerSnapshot as { website?: string | null })?.website ?? null
    );
    const snapshotBusinessAddress = resolveNonEmptyString(
      resolvedSellerType === "business" ? profile?.businessAddress ?? null : null,
      resolvedSellerType === "business"
        ? ((profile as Record<string, unknown> | null)?.business_address as
            | string
            | null
            | undefined)
        : null,
      (sellerSnapshot as { business_address?: string | null })?.business_address ?? null
    );
    const snapshotVatNumber = resolveNonEmptyString(
      resolvedSellerType === "business" ? profile?.vatNumber ?? null : null,
      resolvedSellerType === "business"
        ? ((profile as Record<string, unknown> | null)?.vat_number as
            | string
            | null
            | undefined)
        : null,
      (sellerSnapshot as { vat_number?: string | null })?.vat_number ?? null
    );
    const snapshotRegistrationNumber = resolveNonEmptyString(
      resolvedSellerType === "business" ? profile?.registrationNumber ?? null : null,
      resolvedSellerType === "business"
        ? ((profile as Record<string, unknown> | null)?.company_registration_number as
            | string
            | null
            | undefined)
        : null,
      (sellerSnapshot as { registration_number?: string | null })?.registration_number ?? null
    );

    const profileBusinessFlag = profileBusinessValue === true;
    const finalDisplayName = resolveNonEmptyString(
      snapshotDisplayName,
      profile?.displayName ?? null
    );
    const finalEmail = resolveNonEmptyString(
      snapshotEmail,
      profile?.email ?? null,
      user?.email ?? null
    );
    const finalPhone = resolveNonEmptyString(
      snapshotPhone,
      profile?.phone ?? null
    );
    const parsedPhone = parseContactPhone(finalPhone);
    const finalCounty = resolveNonEmptyString(
      snapshotCounty,
      profile?.county ?? null,
      profile?.city ?? null
    );
    const finalArea = resolveNonEmptyString(snapshotArea, profile?.area ?? null);
    const finalCompanyName = profileBusinessFlag
      ? resolveNonEmptyString(
          profile?.companyName ?? null,
          (profile as Record<string, unknown> | null)?.company_name as
            | string
            | null
            | undefined,
          snapshotCompanyName
        )
      : "";
    const finalBusinessAddress = profileBusinessFlag
      ? resolveNonEmptyString(
          profile?.businessAddress ?? null,
          (profile as Record<string, unknown> | null)?.business_address as
            | string
            | null
            | undefined,
          snapshotBusinessAddress
        )
      : "";
    const finalVatNumber = profileBusinessFlag
      ? resolveNonEmptyString(
          profile?.vatNumber ?? null,
          (profile as Record<string, unknown> | null)?.vat_number as
            | string
            | null
            | undefined,
          snapshotVatNumber
        )
      : "";
    const finalWebsite = profileBusinessFlag
      ? resolveNonEmptyString(profile?.website ?? null, snapshotWebsite)
      : "";
    const finalRegistrationNumber = profileBusinessFlag
      ? resolveNonEmptyString(
          profile?.registrationNumber ?? null,
          (profile as Record<string, unknown> | null)?.company_registration_number as
            | string
            | null
            | undefined,
          snapshotRegistrationNumber
        )
      : "";

    if (process.env.NODE_ENV === "development") {
      console.log("EDIT LISTING LOCATION SNAPSHOT", {
        listingCounty,
        listingArea,
        profileCounty,
        profileArea,
        mergedCounty: snapshotCounty,
        mergedArea: snapshotArea,
        loadedCounty: snapshotCounty,
        loadedArea: snapshotArea,
        sellerType: resolvedSellerType,
      });
    }

    setFormValues({
      ...defaultListingFormValues,
      title: result.title ?? "",
      description: result.description ?? "",
      county: finalCounty,
      area: finalArea,
      displayName: finalDisplayName,
      contactEmail: finalEmail ?? "",
  contactPhone: parsedPhone.local,
  contactPhoneCountry: parsedPhone.country,
      listAsBusiness: profileBusinessFlag,
      companyName: finalCompanyName,
      businessAddress: finalBusinessAddress,
      vatNumber: finalVatNumber,
      website: finalWebsite,
      registrationNumber: finalRegistrationNumber,
      serviceCategory: type === "service" ? categorySlug : "",
      requestCategory: type === "request" ? categorySlug : "",
      marketplaceCategory: type === "marketplace" ? categorySlug : "",
      servicePricing: result.servicePricing ?? "",
      serviceRate:
        type === "service"
          ? String(result.serviceRate ?? result.price ?? "")
          : "",
      serviceAvailability: result.serviceAvailability ?? "",
      requestBudget:
        type === "request"
          ? String(result.requestBudget ?? result.price ?? "")
          : "",
      requestNeededBy: result.requestNeededBy ?? "",
      requestUrgency: result.requestUrgency ?? "",
      marketplaceQuantity: result.marketplaceQuantity ?? "",
      marketplacePrice:
        type === "marketplace"
          ? String(result.price ?? "")
          : "",
      serviceYoutubeUrl: result.serviceYoutubeUrl ?? "",
      requestYoutubeUrl: result.requestYoutubeUrl ?? "",
      marketplaceYoutubeUrl: result.marketplaceYoutubeUrl ?? "",
    });

    const supabase = createSupabaseBrowserClient();
    const images: ExistingImage[] = (imageRows ?? []).map((row) => {
      const url = row.storage_path_600
        ? supabase.storage.from("uploads").getPublicUrl(row.storage_path_600).data
            ?.publicUrl ?? null
        : null;
      const largeUrl = row.storage_path_1800
        ? supabase.storage.from("uploads").getPublicUrl(row.storage_path_1800).data
            ?.publicUrl ?? null
        : null;
      return {
        path600: row.storage_path_600,
        path1800: row.storage_path_1800,
        url,
        largeUrl,
        sortOrder: row.sort_order,
      };
    });

    setExistingImages(images);
    setDirty(false);
    setLoading(false);
  }, [listingId, profile, resolveCategorySlug, user?.email, user?.id]);

  React.useEffect(() => {
    queueMicrotask(() => {
      loadListing();
    });
  }, [loadListing]);

  const validate = () => {
    const requiredFields = requiredFieldsByType[listingType] ?? [];
    const nextErrors: ListingFormErrors = {};

    requiredFields.forEach((field) => {
      const value = formValues[field];
      if (typeof value === "string" && !value.trim()) {
        nextErrors[field] = "This field is required.";
      }
    });

    if (formValues.requestBudget && Number.isNaN(Number(formValues.requestBudget))) {
      nextErrors.requestBudget = "Use a numeric amount.";
    }
    if (formValues.serviceRate && Number.isNaN(Number(formValues.serviceRate))) {
      nextErrors.serviceRate = "Use a numeric rate.";
    }
    if (formValues.marketplacePrice && Number.isNaN(Number(formValues.marketplacePrice))) {
      nextErrors.marketplacePrice = "Use a numeric price.";
    }
    if (formValues.marketplaceQuantity && Number.isNaN(Number(formValues.marketplaceQuantity))) {
      nextErrors.marketplaceQuantity = "Use a numeric quantity.";
    }

  const displayNameValidation = validateDisplayName(formValues.displayName.trim(), isAdmin);
    if (displayNameValidation) {
      nextErrors.displayName = displayNameValidation;
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleRemoveExisting = async (image: ExistingImage) => {
    if (!listingId || !image.path600) return;
    const supabase = createSupabaseBrowserClient();
    await supabase
      .from("listing_images")
      .delete()
      .eq("listing_id", listingId)
      .eq("storage_path_600", image.path600);
    setExistingImages((prev) => prev.filter((item) => item.path600 !== image.path600));
    setDirty(true);
  };

  const handleSetCover = async (image: ExistingImage) => {
    if (!listingId || !image.path600) return;
    const sorted = [...existingImages]
      .filter((item) => item.path600)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const reordered = [image, ...sorted.filter((item) => item.path600 !== image.path600)];
    const supabase = createSupabaseBrowserClient();

    await Promise.all(
      reordered.map((item, index) =>
        supabase
          .from("listing_images")
          .update({ sort_order: index })
          .eq("listing_id", listingId)
          .eq("storage_path_600", item.path600)
      )
    );

    setExistingImages(
      reordered.map((item, index) => ({
        ...item,
        sortOrder: index,
      }))
    );
    setDirty(true);
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!listingId) return;
    if (isProfileHydrating) {
      setSaveError("Loading your profile defaults...");
      return;
    }
    if (!formValues.displayName.trim()) {
      setSaveError("Please enter your name before saving.");
      return;
    }
    if (!validate()) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const selectedCategoryId = await resolveCategoryId(selectedCategory);

      const price =
        listingType === "service"
          ? toNumberOrNull(formValues.serviceRate)
          : listingType === "request"
          ? toNumberOrNull(formValues.requestBudget)
          : toNumberOrNull(formValues.marketplacePrice);

      console.log("RAW EDIT FORM VALUES", formValues);

      const profileCompanyName = resolveNonEmptyNullable(
        profile?.companyName ?? null,
        (profile as Record<string, unknown> | null)?.company_name as
          | string
          | null
          | undefined
      );
      const resolvedCompanyName = formValues.companyName.trim() || profileCompanyName || "";

      if (formValues.listAsBusiness && !resolvedCompanyName) {
        setErrors((prev) => ({
          ...prev,
          companyName: "Company name is required when listing as a business.",
        }));
        setSaveError("Company name is required when listing as a business.");
        setSaving(false);
        return;
      }

      let normalizedContactPhone: string | null = null;
      try {
        normalizedContactPhone = normalizeContactPhone(
          formValues.contactPhone,
          formValues.contactPhoneCountry
        );
      } catch {
        normalizedContactPhone = null;
      }

      if (user?.id) {
        const profileUpdates: Partial<UserProfile> = {
          businessSeller: formValues.listAsBusiness,
        };
        const trimmedDisplayName = formValues.displayName.trim();
        if (trimmedDisplayName) profileUpdates.displayName = trimmedDisplayName;
        const trimmedEmail = formValues.contactEmail.trim();
        if (trimmedEmail) profileUpdates.email = trimmedEmail;
        if (normalizedContactPhone) profileUpdates.phone = normalizedContactPhone;
        const trimmedCounty = formValues.county.trim();
        if (trimmedCounty) profileUpdates.county = trimmedCounty;
        const trimmedArea = formValues.area.trim();
        if (trimmedArea) profileUpdates.area = trimmedArea;
        if (formValues.listAsBusiness && resolvedCompanyName) {
          profileUpdates.companyName = resolvedCompanyName;
          const trimmedBusinessAddress = formValues.businessAddress.trim();
          if (trimmedBusinessAddress) {
            profileUpdates.businessAddress = trimmedBusinessAddress;
          }
          const trimmedVatNumber = formValues.vatNumber.trim();
          if (trimmedVatNumber) profileUpdates.vatNumber = trimmedVatNumber;
          const trimmedWebsite = formValues.website.trim();
          if (trimmedWebsite) profileUpdates.website = trimmedWebsite;
          const trimmedRegistrationNumber = formValues.registrationNumber.trim();
          if (trimmedRegistrationNumber) {
            profileUpdates.registrationNumber = trimmedRegistrationNumber;
          }
        }

        await updateUserProfile(user.id, profileUpdates);
        await refreshProfile();
      }

      const companyName = formValues.listAsBusiness
        ? resolveNonEmptyNullable(resolvedCompanyName)
        : null;
      const businessAddress = formValues.listAsBusiness
        ? resolveNonEmptyNullable(formValues.businessAddress)
        : null;
      const vatNumber = formValues.listAsBusiness
        ? resolveNonEmptyNullable(formValues.vatNumber)
        : null;
      const website = formValues.listAsBusiness
        ? resolveNonEmptyNullable(formValues.website)
        : null;
      const registrationNumber = formValues.listAsBusiness
        ? resolveNonEmptyNullable(formValues.registrationNumber)
        : null;

      const { sellerSnapshot, sellerType } = buildSellerSnapshotFromProfile(
        profile as Record<string, unknown> | null,
        {
          sellerType: formValues.listAsBusiness ? "business" : "private",
          displayName: resolveNonEmptyNullable(formValues.displayName),
          contactEmail: resolveNonEmptyNullable(formValues.contactEmail),
          contactPhone: normalizedContactPhone ?? resolveNonEmptyNullable(formValues.contactPhone),
          county: formValues.county.trim() || null,
          area: formValues.area.trim() || null,
          companyName,
          businessAddress,
          vatNumber,
          registrationNumber,
          website,
          avatarUrl: listing?.seller?.avatarUrl ?? profile?.avatarUrl ?? null,
          googlePhotoUrl:
            listing?.seller?.googlePhotoUrl ?? profile?.googlePhotoUrl ?? null,
          existingSeller: listing?.seller ?? null,
        }
      );

      const payload = {
        title: formValues.title,
        description: formValues.description,
        category_id: formValues.category_id ?? selectedCategoryId ?? null,
        city: formValues.city ?? formValues.county ?? null,
        county: formValues.county ?? null,
        area: formValues.area ?? null,
        price:
          typeof formValues.price === "number"
            ? formValues.price
            : price ?? 0,
        status: formValues.status ?? status,
        listing_type: formValues.listing_type ?? listingType,
  contact_email: formValues.contactEmail,
  contact_phone: normalizedContactPhone ?? formValues.contactPhone,
        marketplace_condition: formValues.marketplaceCondition ?? null,
        sellerType,
        seller: sellerSnapshot,
      };

      if (process.env.NODE_ENV === "development") {
        console.log("EDIT LISTING SAVE LOCATION", {
          payloadCounty: payload.county,
          payloadArea: payload.area,
          sellerCounty: sellerSnapshot.county,
          sellerArea: sellerSnapshot.area,
        });
      }

      console.log("FINAL LISTINGS UPDATE PAYLOAD", payload);

      const photosToUpload = currentPhotos ?? [];
      const uploads = photosToUpload.length
        ? await Promise.all(
            photosToUpload.map((photo) =>
              uploadImage(photo.file, {
                userId: user?.id ?? "",
                listingId,
                kind: "listing",
              })
            )
          )
        : [];

      console.log("RAW DATA PASSED TO updateListing", payload);

      const { error } = await updateListing(listingId, payload);

      if (error) {
        console.warn("Listing update failed", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          payload,
        });
        setSaveError(error.message || "Failed to save listing");
        return;
      }

      if (uploads.length) {
        const nextImages: ExistingImage[] = uploads.map((item) => ({
          path600: item.path,
          path1800: item.largePath,
          url: item.publicUrl ?? null,
          largeUrl: item.largeUrl ?? item.publicUrl ?? null,
        }));
        setExistingImages((prev) => [...prev, ...nextImages]);
      }

      setPhotos([]);
      setSaveSuccess("Changes saved.");
      setDirty(false);
    } catch (error) {
      console.error("LISTING UPDATE ERROR", {
        message: (error as { message?: string }).message,
        code: (error as { code?: string }).code,
        details: (error as { details?: string }).details,
        hint: (error as { hint?: string }).hint,
        full: error,
      });
      setSaveError(
        (error as { message?: string }).message ||
          "Unexpected error while saving."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!listingId) return;
    await deleteListing(listingId);
    router.push("/dashboard/listings");
  };

  const handleQuickStatus = async (nextStatus: Listing["status"]) => {
    if (!listingId) return;
    setSaveError(null);
    setSaveSuccess(null);
    const { error } = await updateListingStatus(listingId, nextStatus);
    if (error) {
      console.warn("Listing status update failed", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        status: nextStatus,
      });
      setSaveError(error.message || "Failed to update status.");
      return;
    }
    setStatus(nextStatus);
    setDirty(true);
  };

  const handleViewListing = () => {
    if (!listing) return;
    router.push(
      getListingHref({
        id: listing.id,
        type: listingType,
        category: listing.category_id ?? undefined,
      })
    );
  };

  return (
    <ProtectedRoute>
      <PageContainer className="mx-auto max-w-5xl">
        <div className="space-y-6 py-4 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold text-slate-900">Edit listing</h1>
              <p className="text-sm text-slate-500">
                Update your listing details, media, and visibility.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {dirty && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  Unsaved changes
                </span>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="bg-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="edit-listing-form"
                disabled={saving || isProfileHydrating}
              >
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>

          {loading ? (
            <div
              className="min-h-30"
              aria-busy="true"
              aria-live="polite"
            />
          ) : !listing ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600">
              We could not load this listing.
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
              <form id="edit-listing-form" onSubmit={handleSave} className="space-y-6">
                <section className="form-section form-card">
                  <h3 className="form-card-title">Basic information</h3>
                  <div className="field-block">
                    <label htmlFor="listing-title" className="field-label">
                      Listing title
                    </label>
                    <input
                      id="listing-title"
                      className="input field-input"
                      value={formValues.title}
                      onChange={(event) => handleChange("title", event.target.value)}
                      placeholder="e.g. Weekend garden maintenance"
                    />
                    {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
                  </div>

                  <div className="field-block">
                    <label htmlFor="listing-description" className="field-label">
                      Description
                    </label>
                    <textarea
                      id="listing-description"
                      className="textarea field-textarea"
                      value={formValues.description}
                      onChange={(event) => handleChange("description", event.target.value)}
                      placeholder="Tell clients what they should know before contacting you."
                    />
                    {errors.description && (
                      <p className="text-xs text-destructive">{errors.description}</p>
                    )}
                  </div>

                  <div className="field-block">
                    <label className="field-label">Listing type</label>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                      {listingType.charAt(0).toUpperCase() + listingType.slice(1)}
                    </div>
                  </div>
                </section>

                <section className="form-section form-card">
                  <h3 className="form-card-title">Category</h3>
                  <div className="field-block">
                    <label className="sr-only" htmlFor="listing-category">
                      Category
                    </label>
                    <div className="relative">
                      <select
                        id="listing-category"
                        className="select field-select pr-10"
                        value={selectedCategory}
                        onChange={(event) => setCategory(event.target.value)}
                      >
                        <option value="">Select a category</option>
                        {categoryOptions.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                    {listingType === "service" && errors.serviceCategory && (
                      <p className="text-xs text-destructive">{errors.serviceCategory}</p>
                    )}
                    {listingType === "request" && errors.requestCategory && (
                      <p className="text-xs text-destructive">{errors.requestCategory}</p>
                    )}
                    {listingType === "marketplace" && errors.marketplaceCategory && (
                      <p className="text-xs text-destructive">{errors.marketplaceCategory}</p>
                    )}
                  </div>
                </section>

                <section className="form-section form-card">
                  <h3 className="form-card-title">Location</h3>
                  <div className="field-block">
                    <label className="field-label">County and area</label>
                    <LocationFields
                      county={formValues.county}
                      area={formValues.area}
                      onCountyChange={(value) => handleChange("county", value)}
                      onAreaChange={(value) => handleChange("area", value)}
                    />
                    {errors.county && <p className="text-xs text-destructive">{errors.county}</p>}
                  </div>
                </section>

                <section className="form-section form-card">
                  <h3 className="form-card-title">Media</h3>
                  <p className="text-xs text-slate-500">
                    Upload up to 10 photos. The first image is used as the cover.
                  </p>
                  {existingImages.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-3">
                      {existingImages.map((image, index) => (
                        <div
                          key={image.path600 ?? image.url}
                          className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                        >
                          {image.url ? (
                            <Image
                              src={image.url}
                              alt="Listing image"
                              width={320}
                              height={200}
                              className="aspect-square w-full object-cover"
                            />
                          ) : null}
                          {index === 0 && (
                            <div className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold text-slate-700">
                              Cover
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveExisting(image)}
                            className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold text-slate-700"
                          >
                            Remove
                          </button>
                          {index !== 0 && (
                            <button
                              type="button"
                              onClick={() => handleSetCover(image)}
                              className="absolute left-2 bottom-2 rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold text-slate-700"
                            >
                              Set cover
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
                      No images uploaded yet. Add photos to help your listing stand out.
                    </div>
                  )}

                  <PhotoUploadField
                    photos={currentPhotos}
                    onChange={setPhotos}
                    youtubeValue={
                      listingType === "service"
                        ? formValues.serviceYoutubeUrl
                        : listingType === "request"
                        ? formValues.requestYoutubeUrl
                        : formValues.marketplaceYoutubeUrl
                    }
                    onYoutubeChange={(value) => {
                      if (listingType === "service") handleChange("serviceYoutubeUrl", value);
                      if (listingType === "request") handleChange("requestYoutubeUrl", value);
                      if (listingType === "marketplace") handleChange("marketplaceYoutubeUrl", value);
                    }}
                  />
                </section>

                {listingType === "service" && (
                  <ServiceFormFields values={formValues} onChange={handleChange} errors={errors} />
                )}
                {listingType === "request" && (
                  <RequestFormFields values={formValues} onChange={handleChange} errors={errors} />
                )}
                {listingType === "marketplace" && (
                  <MarketplaceFormFields values={formValues} onChange={handleChange} errors={errors} />
                )}

                <section className="form-section form-card">
                  <h3 className="form-card-title">Contact & visibility</h3>

                  <label className="business-toggle-row" htmlFor="list-as-business">
                    <input
                      id="list-as-business"
                      type="checkbox"
                      checked={formValues.listAsBusiness}
                      onChange={handleBusinessToggle}
                    />
                    <span>List as a business</span>
                  </label>

                  <div className="field-block">
                    <label htmlFor="contact-display-name" className="field-label">
                      Your name *
                    </label>
                    <input
                      id="contact-display-name"
                      className="input field-input"
                      value={formValues.displayName}
                      onChange={(event) => handleChange("displayName", event.target.value)}
                      placeholder="Your public name"
                      required
                    />
                    <p className="text-xs text-slate-500">
                      Shown publicly on this listing and saved to your profile.
                    </p>
                  </div>

                  <div className="field-block">
                    <label htmlFor="contact-email" className="field-label">
                      Contact email
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      className="input field-input"
                      value={formValues.contactEmail}
                      onChange={(event) => handleChange("contactEmail", event.target.value)}
                      placeholder="name@email.com"
                    />
                    <p className="text-xs text-slate-500">
                      Pre-filled from your account. You can edit this for this listing.
                    </p>
                    {errors.contactEmail && (
                      <p className="text-xs text-destructive">{errors.contactEmail}</p>
                    )}
                  </div>

                  <div className="field-block">
                    <label htmlFor="contact-phone" className="field-label">
                      Contact phone
                    </label>
                    <input
                      id="contact-phone"
                      className="input field-input"
                      value={formValues.contactPhone}
                      onChange={(event) => handleChange("contactPhone", event.target.value)}
                      placeholder="+353 000000000"
                    />
                    <p className="text-xs text-slate-500">
                      Pre-filled from your account. You can edit this for this listing.
                    </p>
                  </div>
                </section>

                {saveError && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {saveError}
                  </div>
                )}
                {saveSuccess && (
                  <div className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary">
                    {saveSuccess}
                  </div>
                )}
              </form>

              <aside className="space-y-4">
                <div className="card card--padded space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Status
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <ListingStatusBadge status={status ?? "active"} />
                      <span className="text-xs font-medium text-slate-500">
                        {listingType.charAt(0).toUpperCase() + listingType.slice(1)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>Created</span>
                      <span>{listing.created_at ? new Date(listing.created_at).toLocaleDateString() : "—"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Updated</span>
                      <span>{listing.updated_at ? new Date(listing.updated_at).toLocaleDateString() : "—"}</span>
                    </div>
                  </div>

                  <div className="field-block">
                    <label className="field-label" htmlFor="listing-status">
                      Visibility status
                    </label>
                    <select
                      id="listing-status"
                      className="select field-select"
                      value={status ?? "active"}
                      onChange={(event) => setStatus(event.target.value as Listing["status"])}
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value ?? ""}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    {status === "active" ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleViewListing}
                        className="w-full justify-between"
                      >
                        View listing
                        <ArrowUpRight className="h-4 w-4" />
                      </Button>
                    ) : null}
                    {(status === "active" || status === "paused") ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          handleQuickStatus(status === "active" ? "paused" : "active")
                        }
                        className="w-full"
                      >
                        {status === "active" ? "Pause listing" : "Resume listing"}
                      </Button>
                    ) : null}
                    {(status === "active" || status === "paused") ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleQuickStatus("archived")}
                        className="w-full"
                      >
                        Archive listing
                      </Button>
                    ) : null}
                    {status === "archived" ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleQuickStatus("active")}
                        className="w-full"
                      >
                        Restore listing
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleDelete}
                      className="w-full"
                    >
                      Delete listing
                    </Button>
                  </div>
                </div>

                <div className="card card--padded space-y-3">
                  <p className="text-sm font-semibold text-slate-900">Preview</p>
                  <div className="flex items-start gap-3">
                    <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-slate-100">
                      {listing.coverImage ? (
                        <Image
                          src={listing.coverImage}
                          alt={listing.title}
                          fill
                          className="object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 line-clamp-2">
                        {listing.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        {listing.city ?? listing.county ?? ""}
                      </p>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>
      </PageContainer>
    </ProtectedRoute>
  );
}
