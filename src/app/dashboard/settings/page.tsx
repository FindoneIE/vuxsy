"use client";

import * as React from "react";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/auth/AuthProvider";
import UserAvatar from "@/components/ui/UserAvatar";
import CountySelect from "@/components/location/CountySelect";
import AreaSelect from "@/components/location/AreaSelect";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { uploadImage } from "@/lib/supabase/storage";
import { updateUserProfile } from "@/lib/users";
import type { UserProfile } from "@/types/user";
import { validateDisplayName } from "@/lib/display-name-policy";
import { buildSellerSnapshotFromProfile } from "@/lib/listings/sellerSnapshot";
import type { Listing } from "@/types/listing";

const MAX_SIZE_MB = 5;
const MIN_PHONE_LENGTH = 7;
const MAX_PHONE_LENGTH = 11;

const normalizePhoneNumber = (local: string, country: "+353" | "+44") => {
  let digits = local.replace(/\D/g, "");

  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (country === "+353" && digits.length !== 9) {
    throw new Error("Invalid IE phone");
  }

  if (country === "+44" && digits.length !== 10) {
    throw new Error("Invalid UK phone");
  }

  return `${country}${digits}`;
};

const splitPhoneNumber = (value?: string | null) => {
  const trimmed = value?.trim() ?? "";
  if (trimmed.startsWith("+353")) {
    return { country: "+353" as const, local: trimmed.slice(4) };
  }
  if (trimmed.startsWith("+44")) {
    return { country: "+44" as const, local: trimmed.slice(3) };
  }
  return { country: "+353" as const, local: "" };
};

const isValidLocalPhone = (value: string, country: "+353" | "+44") => {
  if (!value.trim()) return true;
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  if (country === "+353") return digits.length === 9;
  if (country === "+44") return digits.length === 10;
  return digits.length >= MIN_PHONE_LENGTH && digits.length <= MAX_PHONE_LENGTH;
};

type SwitchProps = {
  className?: string;
  checked?: boolean;
  onCheckedChange?: (value: boolean) => void;
};

const Switch = ({ className, checked, onCheckedChange }: SwitchProps) => (
  <span className={`relative inline-flex h-6 w-11 items-center ${className ?? ""}`}>
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
      className="peer sr-only"
    />
  <span className="absolute inset-0 rounded-full bg-slate-200 transition peer-checked:bg-primary" />
    <span className="absolute left-1 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white transition peer-checked:translate-x-5" />
  </span>
);

export default function DashboardSettingsPage() {
  const { user, profile, profileLoading, refreshProfile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);
  const [status, setStatus] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [photoState, setPhotoState] = React.useState<"saved" | "saving" | "error">("saved");
  const [personalState, setPersonalState] = React.useState<"saved" | "saving" | "error">("saved");
  const [preferencesState, setPreferencesState] = React.useState<"saved" | "saving" | "error">("saved");
  const [phoneError, setPhoneError] = React.useState<string | null>(null);
  const [locationError, setLocationError] = React.useState<string | null>(null);
  const [displayNameError, setDisplayNameError] = React.useState<string | null>(null);
  const [personalForm, setPersonalForm] = React.useState({
    displayName: "",
    email: "",
    phoneCountry: "+353" as "+353" | "+44",
    phoneLocal: "",
    county: "",
    area: "",
    businessSeller: false,
    companyName: "",
    businessAddress: "",
    vatNumber: "",
    website: "",
    registrationNumber: "",
  });
  const [preferencesForm, setPreferencesForm] = React.useState({
    language: "en",
    emailNotifications: true,
    marketplaceAlerts: true,
    messageNotifications: true,
  });

  const metadata = user?.user_metadata as Record<string, unknown> | undefined;
  const googlePhotoUrl =
    profile?.googlePhotoUrl ??
    (metadata?.avatar_url as string | undefined) ??
    (metadata?.picture as string | undefined) ??
    null;
  const displayName = profile?.displayName ?? null;

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setStatus(`File is too large. Max size is ${MAX_SIZE_MB}MB.`);
      return;
    }

  setStatus(null);
  setPhotoState("saving");
    setIsUploading(true);
    try {
      const { publicUrl } = await uploadImage(file, {
        userId: user.id,
        kind: "avatar",
      });

      await updateUserProfile(user.id, {
        avatarUrl: publicUrl,
        googlePhotoUrl: googlePhotoUrl ?? null,
      });

      setStatus("Avatar updated successfully.");
      setPhotoState("saved");
    } catch {
      setStatus("We couldn’t upload your avatar. Please try again.");
      setPhotoState("error");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const handleRemove = async () => {
    if (!user) return;
    setPhotoState("saving");
    try {
      await updateUserProfile(user.id, {
        avatarUrl: null,
        googlePhotoUrl: googlePhotoUrl ?? null,
      });
      setPhotoState("saved");
    } catch {
      setPhotoState("error");
    }
  };

  const handleUseGoogle = async () => {
    if (!user || !googlePhotoUrl) return;
    setPhotoState("saving");
    try {
      await updateUserProfile(user.id, {
        avatarUrl: null,
        googlePhotoUrl,
      });
      setPhotoState("saved");
    } catch {
      setPhotoState("error");
    }
  };

  React.useEffect(() => {
    if (!profile) return;
    console.info("SETTINGS LOAD: profile.phone", profile.phone);
    const phoneParts = splitPhoneNumber(profile.phone);
    console.info("SETTINGS LOAD: split phone", phoneParts);
    queueMicrotask(() => {
      setPersonalForm({
        displayName: profile.displayName ?? "",
        email: profile.email ?? user?.email ?? "",
        phoneCountry: phoneParts.country,
        phoneLocal: phoneParts.local,
        county: profile.county ?? "",
        area: profile.area ?? "",
        businessSeller: profile.businessSeller ?? false,
        companyName: profile.companyName ?? "",
        businessAddress: profile.businessAddress ?? "",
        vatNumber: profile.vatNumber ?? "",
        website: profile.website ?? "",
        registrationNumber: profile.registrationNumber ?? "",
      });
      setPreferencesForm({
        language: profile.language ?? "en",
        emailNotifications: profile.emailNotifications ?? true,
        marketplaceAlerts: profile.marketplaceAlerts ?? true,
        messageNotifications: profile.messageNotifications ?? true,
      });
    });
  }, [profile, user?.email]);

  React.useEffect(() => {
    if (!profile?.phone) return;
    const { country, local } = splitPhoneNumber(profile.phone);
    console.info("SETTINGS LOAD: split phone (effect)", { country, local });
    queueMicrotask(() => {
      setPersonalForm((prev) => ({
        ...prev,
        phoneCountry: country,
        phoneLocal: local,
      }));
    });
  }, [profile?.phone]);

  React.useEffect(() => {
    console.info("SETTINGS STATE: phoneCountry", personalForm.phoneCountry);
  }, [personalForm.phoneCountry]);

  React.useEffect(() => {
    if (!user?.id) return;
    let mounted = true;

    const loadLocation = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "county, area, is_business_seller, company_name, business_address, vat_number, website, company_registration_number"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (!mounted || error) return;

      setPersonalForm((prev) => ({
        ...prev,
        county: data?.county ?? "",
        area: data?.area ?? "",
        businessSeller: data?.is_business_seller ?? prev.businessSeller,
        companyName: data?.company_name ?? prev.companyName,
        businessAddress: data?.business_address ?? prev.businessAddress,
        vatNumber: data?.vat_number ?? prev.vatNumber,
        website: data?.website ?? prev.website,
        registrationNumber: data?.company_registration_number ?? prev.registrationNumber,
      }));
    };

    loadLocation();

    return () => {
      mounted = false;
    };
  }, [supabase, user?.id]);

  const statusLabel = (state: "saved" | "saving" | "error") => {
    if (state === "saving") return "Saving";
    if (state === "error") return "Error";
    return "Saved";
  };

  const statusClassName = (state: "saved" | "saving" | "error") => {
  if (state === "saving") return "bg-primary/10 text-primary";
  if (state === "error") return "bg-rose-50 text-rose-700";
  return "bg-primary/10 text-primary";
  };

  const handlePersonalSave = async () => {
    if (!user?.id) {
      console.error("SETTINGS SAVE: missing user id", { user });
      setPhoneError("You must be signed in to save settings.");
      setPersonalState("error");
      return;
    }
    const trimmed = {
      displayName: personalForm.displayName.trim(),
      email: personalForm.email.trim(),
      phoneLocal: personalForm.phoneLocal.trim(),
      phoneCountry: personalForm.phoneCountry,
      county: personalForm.county.trim(),
      area: personalForm.area.trim(),
      businessSeller: personalForm.businessSeller,
      companyName: personalForm.companyName.trim(),
      businessAddress: personalForm.businessAddress.trim(),
      vatNumber: personalForm.vatNumber.trim(),
      website: personalForm.website.trim(),
      registrationNumber: personalForm.registrationNumber.trim(),
    };

  const displayNameValidation = validateDisplayName(trimmed.displayName, isAdmin);
    if (displayNameValidation) {
      setDisplayNameError(displayNameValidation);
      setPersonalState("error");
      return;
    }

    setDisplayNameError(null);

    if (trimmed.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed.email)) {
      setPersonalState("error");
      return;
    }

    if (!isValidLocalPhone(trimmed.phoneLocal, trimmed.phoneCountry)) {
      setPhoneError("Enter a valid phone number.");
      setPersonalState("error");
      return;
    }

    if (!trimmed.county || !trimmed.area) {
      setLocationError("Select a county and area.");
      setPersonalState("error");
      return;
    }

    setPhoneError(null);
    setLocationError(null);
    let normalizedPhone: string | null = null;
    try {
      normalizedPhone = normalizePhoneNumber(trimmed.phoneLocal, trimmed.phoneCountry);
      console.info("SETTINGS SAVE: normalized phone", normalizedPhone);
    } catch (error) {
      setPhoneError(error instanceof Error ? error.message : "Invalid phone number.");
      setPersonalState("error");
      return;
    }

    const normalizedWebsite =
      trimmed.website && trimmed.website.trim()
        ? /^https?:\/\//i.test(trimmed.website.trim())
          ? trimmed.website.trim()
          : `https://${trimmed.website.trim()}`
        : null;

    setPersonalState("saving");
    try {
      const profileUpdates: Partial<UserProfile> = {
        businessSeller: trimmed.businessSeller ?? false,
      };
      if (trimmed.displayName) profileUpdates.displayName = trimmed.displayName;
      if (trimmed.email) profileUpdates.email = trimmed.email;
      if (normalizedPhone) profileUpdates.phone = normalizedPhone;
      if (trimmed.county) profileUpdates.county = trimmed.county;
      if (trimmed.area) profileUpdates.area = trimmed.area;
      if (trimmed.companyName) profileUpdates.companyName = trimmed.companyName;
      if (trimmed.businessAddress) profileUpdates.businessAddress = trimmed.businessAddress;
      if (trimmed.vatNumber) profileUpdates.vatNumber = trimmed.vatNumber;
      if (normalizedWebsite) profileUpdates.website = normalizedWebsite;
      if (trimmed.registrationNumber) profileUpdates.registrationNumber = trimmed.registrationNumber;

      await updateUserProfile(user.id, profileUpdates);
      await refreshProfile();

      const payload = {
        id: user.id,
        display_name: trimmed.displayName || null,
        email: trimmed.email || null,
        phone: normalizedPhone,
        county: trimmed.county || null,
        area: trimmed.area || null,
        is_business_seller: trimmed.businessSeller ?? false,
        company_name: trimmed.companyName || null,
        business_address: trimmed.businessAddress || null,
        vat_number: trimmed.vatNumber || null,
        website: normalizedWebsite,
        company_registration_number: trimmed.registrationNumber || null,
      };
      console.info("SETTINGS SAVE: user id", user.id);
      console.info("SETTINGS SAVE: profile payload", payload);

      const { data: listings, error: listingsError } = await supabase
        .from("listings")
        .select("id, seller")
        .eq("user_id", user.id);

      if (!listingsError && listings) {
        await Promise.all(
          listings.map((listing) => {
            const existingSellerSnapshot =
              (listing.seller as Listing["seller"] | null) ?? null;
            const { sellerSnapshot: nextSellerSnapshot, sellerType } =
              buildSellerSnapshotFromProfile(payload, {
                sellerType: trimmed.businessSeller ? "business" : "private",
                displayName: trimmed.displayName || null,
                contactEmail: trimmed.email || null,
                contactPhone: normalizedPhone,
                county: trimmed.county || null,
                area: trimmed.area || null,
                companyName: trimmed.companyName || null,
                businessAddress: trimmed.businessAddress || null,
                vatNumber: trimmed.vatNumber || null,
                registrationNumber: trimmed.registrationNumber || null,
                website: normalizedWebsite,
                existingSeller: existingSellerSnapshot,
              });

            return supabase
              .from("listings")
              .update({
                seller: nextSellerSnapshot,
                sellerType,
                county: trimmed.county || null,
                area: trimmed.area || null,
                city: trimmed.county || null,
              })
              .eq("id", listing.id);
          })
        );
      }

      setPersonalState("saved");
      setPersonalForm((prev) => ({
        ...prev,
        county: trimmed.county,
        area: trimmed.area,
        businessSeller: trimmed.businessSeller ?? prev.businessSeller,
        companyName: trimmed.companyName,
        businessAddress: trimmed.businessAddress,
        vatNumber: trimmed.vatNumber,
        website: trimmed.website,
        registrationNumber: trimmed.registrationNumber,
      }));
    } catch (error) {
      console.error("SETTINGS SAVE: update failed", error);
      if (!phoneError) {
        setPhoneError("We couldn’t save your settings. Please try again.");
      }
      setPersonalState("error");
    }
  };

  const handlePreferenceUpdate = async (nextPrefs: typeof preferencesForm) => {
    if (!user) return;
    setPreferencesForm(nextPrefs);
    setPreferencesState("saving");
    try {
      await updateUserProfile(user.id, {
        language: nextPrefs.language,
        emailNotifications: nextPrefs.emailNotifications,
        marketplaceAlerts: nextPrefs.marketplaceAlerts,
        messageNotifications: nextPrefs.messageNotifications,
      });
      setPreferencesState("saved");
    } catch {
      setPreferencesState("error");
    }
  };

  return (
    <ProtectedRoute>
  <div className="space-y-10">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Account settings</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your profile, login methods, and preferences.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <UserAvatar
                avatarUrl={profile?.avatarUrl ?? null}
                googlePhotoUrl={googlePhotoUrl}
                displayName={displayName}
                email={profile?.email ?? user?.email ?? null}
                size={72}
              />
              <div>
                <p className="text-sm font-semibold text-slate-900">Profile photo</p>
                <p className="mt-1 text-xs text-slate-500">
                  Upload a photo or use your Google avatar.
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  Recommended: square image, max 5 MB
                </p>
              </div>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusClassName(
                  photoState
                )}`}
              >
                {statusLabel(photoState)}
              </span>
              <div className="flex flex-wrap gap-2">
              <label className="cursor-pointer rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-gray-300">
                {isUploading ? "Uploading..." : "Upload new"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
              <button
                type="button"
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={handleRemove}
                disabled={isUploading}
              >
                Remove photo
              </button>
              <button
                type="button"
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleUseGoogle}
                disabled={!googlePhotoUrl || isUploading}
              >
                Use Google photo
              </button>
            </div>
            </div>
          </div>

          {profileLoading ? (
            <p className="mt-4 text-xs text-slate-500">Loading profile…</p>
          ) : status ? (
            <p className="mt-4 text-xs text-slate-600">{status}</p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
            <h2 className="text-base font-semibold text-slate-900">Personal information</h2>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusClassName(
                personalState
              )}`}
            >
              {statusLabel(personalState)}
            </span>
          </div>
          <div className="mt-4 space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Your name *</label>
                <input
                  className="h-11 w-full rounded-lg border border-gray-200 px-3"
                  value={personalForm.displayName}
                  onChange={(event) => {
                    setPersonalForm((prev) => ({
                      ...prev,
                      displayName: event.target.value,
                    }));
                    if (displayNameError) {
                      setDisplayNameError(null);
                    }
                  }}
                  required
                />
                {displayNameError && (
                  <p className="text-xs text-rose-600">{displayNameError}</p>
                )}
                <p className="text-xs text-slate-500">
                  This is the public name shown on your listings.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email</label>
                <input
                  className="h-11 w-full rounded-lg border border-gray-200 px-3"
                  value={personalForm.email}
                  onChange={(event) =>
                    setPersonalForm((prev) => ({
                      ...prev,
                      email: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Phone</label>
                <div className="flex gap-2">
                  <select
                    className="select field-select w-28"
                    value={personalForm.phoneCountry}
                    onChange={(event) => {
                      console.info("SETTINGS SELECT: phoneCountry", event.target.value);
                      setPersonalForm((prev) => ({
                        ...prev,
                        phoneCountry: event.target.value as "+353" | "+44",
                      }));
                    }}
                  >
                    <option value="+353">Ireland (+353)</option>
                    <option value="+44">United Kingdom (+44)</option>
                  </select>
                  <input
                    className="input field-input"
                    value={personalForm.phoneLocal}
                    onChange={(event) =>
                      setPersonalForm((prev) => ({
                        ...prev,
                        phoneLocal: event.target.value,
                      }))
                    }
                    placeholder="0868672333"
                  />
                </div>
                {phoneError && (
                  <p className="text-xs text-rose-600">{phoneError}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">County *</label>
                <CountySelect
                  className="h-11 w-full rounded-lg border border-gray-200 px-3"
                  value={personalForm.county}
                  onChange={(value) => {
                    setPersonalForm((prev) => {
                      if (prev.county === value) {
                        return prev;
                      }
                      return {
                        ...prev,
                        county: value,
                        area: "",
                      };
                    });
                    setLocationError(null);
                  }}
                  placeholder="Select county"
                  ariaLabel="County"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Area *</label>
                <AreaSelect
                  className="h-11 w-full rounded-lg border border-gray-200 px-3"
                  county={personalForm.county}
                  value={personalForm.area}
                  onChange={(value) => {
                    setPersonalForm((prev) => ({
                      ...prev,
                      area: value,
                    }));
                    setLocationError(null);
                  }}
                  placeholder={personalForm.county ? "Select area" : "Select county first"}
                  ariaLabel="Area"
                />
                <p className="text-xs text-slate-500">
                  Used as the default location for new listings.
                </p>
                {locationError && (
                  <p className="text-xs text-rose-600">{locationError}</p>
                )}
              </div>
              <div className="space-y-3 md:col-span-2">
                <label className="business-toggle-row">
                  <input
                    type="checkbox"
                    checked={personalForm.businessSeller}
                    onChange={(event) =>
                      setPersonalForm((prev) => ({
                        ...prev,
                        businessSeller: event.target.checked,
                      }))
                    }
                  />
                  <span>Business seller</span>
                </label>

                {personalForm.businessSeller && (
                  <div className="form-card form-card--nested">
                    <h4 className="text-sm font-semibold text-slate-700">
                      Business details <span className="font-medium text-slate-400">(optional)</span>
                    </h4>
                    <div className="field-block">
                      <label htmlFor="settings-company-name" className="field-label">
                        Company name
                      </label>
                      <input
                        id="settings-company-name"
                        className="input field-input"
                        value={personalForm.companyName}
                        onChange={(event) =>
                          setPersonalForm((prev) => ({
                            ...prev,
                            companyName: event.target.value,
                          }))
                        }
                        placeholder="e.g. Dublin Home Services"
                      />
                    </div>

                    <div className="field-block">
                      <label htmlFor="settings-business-address" className="field-label">
                        Business address
                      </label>
                      <input
                        id="settings-business-address"
                        className="input field-input"
                        value={personalForm.businessAddress}
                        onChange={(event) =>
                          setPersonalForm((prev) => ({
                            ...prev,
                            businessAddress: event.target.value,
                          }))
                        }
                        placeholder="Street, city, country"
                      />
                    </div>

                    <div className="field-block">
                      <label htmlFor="settings-vat-number" className="field-label">
                        VAT number
                      </label>
                      <input
                        id="settings-vat-number"
                        className="input field-input"
                        value={personalForm.vatNumber}
                        onChange={(event) =>
                          setPersonalForm((prev) => ({
                            ...prev,
                            vatNumber: event.target.value,
                          }))
                        }
                        placeholder="Optional"
                      />
                    </div>

                    <div className="field-block">
                      <label htmlFor="settings-company-website" className="field-label">
                        Website
                      </label>
                      <input
                        id="settings-company-website"
                        className="input field-input"
                        value={personalForm.website}
                        onChange={(event) =>
                          setPersonalForm((prev) => ({
                            ...prev,
                            website: event.target.value,
                          }))
                        }
                        placeholder="Optional"
                      />
                    </div>

                    <div className="field-block">
                      <label htmlFor="settings-registration-number" className="field-label">
                        Company registration number
                      </label>
                      <input
                        id="settings-registration-number"
                        className="input field-input"
                        value={personalForm.registrationNumber}
                        onChange={(event) =>
                          setPersonalForm((prev) => ({
                            ...prev,
                            registrationNumber: event.target.value,
                          }))
                        }
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              className="rounded-xl bg-(--color-primary) px-4 py-2 text-sm font-semibold text-white transition hover:bg-(--color-primary-hover) disabled:cursor-not-allowed disabled:bg-gray-300"
              style={{ backgroundColor: "var(--color-primary)" }}
              onClick={handlePersonalSave}
              disabled={personalState === "saving"}
            >
              Save changes
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
            <h2 className="text-base font-semibold text-slate-900">Login & security</h2>
            </div>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
              Saved
            </span>
          </div>
          <div className="mt-4 grid gap-3 text-sm">
            <div className="grid gap-2 rounded-xl border border-slate-200 px-4 py-3 transition-colors hover:bg-slate-50 sm:grid-cols-[1fr_auto_auto] sm:items-center">
              <span className="text-slate-600">Email login</span>
              <span className="font-medium text-slate-900">{profile?.email ?? user?.email ?? "—"}</span>
              <span className="text-xs text-slate-500">Primary</span>
            </div>
            <div className="grid gap-2 rounded-xl border border-slate-200 px-4 py-3 transition-colors hover:bg-slate-50 sm:grid-cols-[1fr_auto_auto] sm:items-center">
              <span className="text-slate-600">Google connected</span>
              <span className="font-medium text-slate-900">
                {googlePhotoUrl ? "Connected" : "Not connected"}
              </span>
              <button className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100">
                {googlePhotoUrl ? "Manage" : "Connect"}
              </button>
            </div>
            <div className="grid gap-2 rounded-xl border border-slate-200 px-4 py-3 transition-colors hover:bg-slate-50 sm:grid-cols-[1fr_auto_auto] sm:items-center">
              <span className="text-slate-600">Change password</span>
              <span className="text-slate-500">••••••••</span>
              <button className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100">
                Update
              </button>
            </div>
            <div className="grid gap-2 rounded-xl border border-slate-200 px-4 py-3 transition-colors hover:bg-slate-50 sm:grid-cols-[1fr_auto_auto] sm:items-center">
              <span className="text-slate-600">Last sign in</span>
              <span className="text-slate-500">Just now</span>
              <span className="text-xs text-slate-400">Current session</span>
            </div>
            <div className="grid gap-2 rounded-xl border border-slate-200 px-4 py-3 transition-colors hover:bg-slate-50 sm:grid-cols-[1fr_auto_auto] sm:items-center">
              <span className="text-slate-600">Active session</span>
              <span className="text-slate-500">This device</span>
              <button className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100">
                Manage
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
            <h2 className="text-base font-semibold text-slate-900">Preferences</h2>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusClassName(
                preferencesState
              )}`}
            >
              {statusLabel(preferencesState)}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              type="button"
              className="flex h-12 items-center justify-between rounded-lg border border-slate-200 px-4"
              onClick={() =>
                handlePreferenceUpdate({
                  ...preferencesForm,
                  language: preferencesForm.language === "lv" ? "en" : "lv",
                })
              }
            >
              <span className="text-sm font-medium text-slate-700">Language</span>
              <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                {preferencesForm.language === "lv" ? "Latviešu" : "English"}
                <svg
                  className="h-4 w-4 text-slate-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </button>
            <label className="flex h-12 items-center justify-between rounded-xl border border-gray-200 px-4">
              <span className="text-sm font-medium leading-none text-gray-700">Marketplace alerts</span>
              <Switch
                className="scale-90 relative top-px"
                checked={preferencesForm.marketplaceAlerts}
                onCheckedChange={(value) =>
                  handlePreferenceUpdate({
                    ...preferencesForm,
                    marketplaceAlerts: value,
                  })
                }
              />
            </label>
            <label className="flex h-12 items-center justify-between rounded-xl border border-gray-200 px-4">
              <span className="text-sm font-medium leading-none text-gray-700">Email notifications</span>
              <Switch
                className="scale-90 relative top-px"
                checked={preferencesForm.emailNotifications}
                onCheckedChange={(value) =>
                  handlePreferenceUpdate({
                    ...preferencesForm,
                    emailNotifications: value,
                  })
                }
              />
            </label>
            <label className="flex h-12 items-center justify-between rounded-xl border border-gray-200 px-4">
              <span className="text-sm font-medium leading-none text-gray-700">Message notifications</span>
              <Switch
                className="scale-90 relative top-px"
                checked={preferencesForm.messageNotifications}
                onCheckedChange={(value) =>
                  handlePreferenceUpdate({
                    ...preferencesForm,
                    messageNotifications: value,
                  })
                }
              />
            </label>
          </div>
        </div>

  <div className="rounded-2xl border border-rose-200/70 bg-red-50 p-7 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold text-rose-700">Danger zone</h2>
            <p className="text-sm text-rose-600">
              Manage sensitive actions for your account.
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100">
              Deactivate account
            </button>
            <button className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700">
              Delete account
            </button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
