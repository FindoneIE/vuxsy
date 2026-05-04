"use client";

import * as React from "react";
import type { Listing, ListingInsert, ListingType } from "@/types/listing";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { uploadImage } from "@/lib/supabase/storage";
import { createListing } from "@/lib/listings/createListing";
import { updateListing } from "@/lib/listings/updateListing";
import { updateUserProfile } from "@/lib/users";
import { validateDisplayName } from "@/lib/display-name-policy";
import { useToast } from "@/components/ui/ToastProvider";
import {
	defaultListingFormValues,
	requiredFieldsByType,
	type ListingFormChangeHandler,
	type ListingFormErrors,
	type ListingFormValues,
} from "@/components/forms/listing/listingFormConfig";
import type { UserProfile } from "@/types/user";

type ListingFormState = {
	formValues: ListingFormValues;
	errors: ListingFormErrors;
	isPreview: boolean;
	isSubmitting: boolean;
	statusMessage: string | null;
	submitMode: "draft" | "publish" | null;
};

type UseListingFormReturn = ListingFormState & {
	handleChange: ListingFormChangeHandler;
	handleBusinessToggle: (event: React.ChangeEvent<HTMLInputElement>) => void;
	handlePreview: () => void;
	handleSaveDraft: () => Promise<void>;
	handleSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
	handleCancel: () => void;
	closePreview: () => void;
	isProfileHydrating: boolean;
};

const getPhotosForType = (type: ListingType, values: ListingFormValues) => {
	switch (type) {
		case "service":
			return values.servicePhotos;
		case "request":
			return values.requestPhotos;
		case "marketplace":
			return values.marketplacePhotos;
		default:
			return [];
	}
};

const getCategoryForType = (type: ListingType, values: ListingFormValues) => {
	switch (type) {
		case "service":
			return values.serviceCategory || null;
		case "request":
			return values.requestCategory || null;
		case "marketplace":
			return values.marketplaceCategory || null;
		default:
			return null;
	}
};

const toNumberOrNull = (value: string) => {
	const next = Number(value);
	return Number.isFinite(next) ? next : null;
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

const buildListingPayload = (
    type: ListingType,
    values: ListingFormValues,
    imageUrls: string[],
    seller: Listing["seller"]
): ListingInsert => {
	const { servicePhotos, requestPhotos, marketplacePhotos, ...rest } = values;
	void servicePhotos;
	void requestPhotos;
	void marketplacePhotos;

	const categoryId = getCategoryForType(type, values);

	const price =
		type === "service"
			? toNumberOrNull(rest.serviceRate)
			: type === "request"
				? toNumberOrNull(rest.requestBudget)
				: toNumberOrNull(rest.marketplacePrice);

	const youtubeUrl =
		type === "service"
			? rest.serviceYoutubeUrl
			: type === "request"
				? rest.requestYoutubeUrl
				: rest.marketplaceYoutubeUrl;

	const sellerType = rest.listAsBusiness ? "business" : "private";
	const contactEmail = rest.contactEmail?.trim() || null;
	const contactPhone = normalizeContactPhone(
		rest.contactPhone ?? "",
		rest.contactPhoneCountry
	);
	const allowMessages = rest.allowMessages ?? true;
	const allowEmail = rest.allowEmail ?? false;
	const allowPhone = rest.allowPhone ?? false;
	const showEmailPublicly = rest.showEmailPublicly ?? false;
	const showPhonePublicly = rest.showPhonePublicly ?? false;

	return {
		title: rest.title,
		description: rest.description || null,
		category_id: categoryId || null,
		county: rest.county || null,
		area: rest.area || null,
		price,
		youtubeUrl: youtubeUrl || null,
		currency: null,
		sellerType,
		listing_type: type,
		images: imageUrls,
		images1600: [],
		coverImage: imageUrls[0] ?? null,
		photoCount: imageUrls.length,
		seller,
		contact_email: contactEmail,
		contact_phone: contactPhone,
		allow_messages: allowMessages,
		allow_email: allowEmail,
		allow_phone: allowPhone,
		show_email_publicly: showEmailPublicly,
		show_phone_publicly: showPhonePublicly,
	};
};

const revokePhotoPreviews = (
	photos: ListingFormValues["servicePhotos"]
) => {
	photos.forEach((photo) => {
		if (photo.previewUrl) URL.revokeObjectURL(photo.previewUrl);
	});
};


export const useListingForm = (type: ListingType): UseListingFormReturn => {
	const { user, profile, refreshProfile } = useAuth();
	const router = useRouter();
	const { addToast } = useToast();
	const didPrefillContact = React.useRef(false);
	const didPrefillLocation = React.useRef(false);
	const didPrefillBusiness = React.useRef(false);
	const [didHydrateProfile, setDidHydrateProfile] = React.useState(false);
	const businessDefaultsRef = React.useRef({
		isBusinessSeller: false,
		companyName: "",
		businessAddress: "",
		vatNumber: "",
		website: "",
		registrationNumber: "",
	});
	const [formValues, setFormValues] = React.useState<ListingFormValues>(
		defaultListingFormValues
	);
	const [errors, setErrors] = React.useState<ListingFormErrors>({});
	const [isPreview, setIsPreview] = React.useState(false);
	const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = React.useState(false);
	const [submitMode, setSubmitMode] = React.useState<"draft" | "publish" | null>(null);
	const [draftListingId, setDraftListingId] = React.useState<string | null>(null);
	const uploadedPhotoNamesRef = React.useRef<Set<string>>(new Set());
	const isProfileHydrating = Boolean(profile && !didHydrateProfile);

	React.useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			setErrors({});
			setIsPreview(false);
			setStatusMessage(null);
			setIsSubmitting(false);
			setSubmitMode(null);
			setDraftListingId(null);
			uploadedPhotoNamesRef.current.clear();
			didPrefillContact.current = false;
			didPrefillLocation.current = false;
			didPrefillBusiness.current = false;
			setFormValues((prev) => {
				revokePhotoPreviews(prev.servicePhotos);
				revokePhotoPreviews(prev.requestPhotos);
				revokePhotoPreviews(prev.marketplacePhotos);
				return defaultListingFormValues;
			});
		}, 0);

		return () => window.clearTimeout(timeoutId);
	}, [type]);

	React.useEffect(() => {
		if (!profile || didHydrateProfile) return;
		const nextDisplayName = profile.displayName ?? "";
		const nextEmail = profile.email ?? user?.email ?? "";
		const nextPhone = parseContactPhone(profile.phone);
		const nextCounty = profile.county ?? "";
		const nextArea = profile.area ?? "";
		const isBusiness = Boolean(profile.businessSeller);
		const defaults = {
			isBusinessSeller: isBusiness,
			companyName: profile.companyName ?? "",
			businessAddress: profile.businessAddress ?? "",
			vatNumber: profile.vatNumber ?? "",
			website: profile.website ?? "",
			registrationNumber: profile.registrationNumber ?? "",
		};

		const timeoutId = window.setTimeout(() => {
			setFormValues((prev) => ({
				...prev,
				displayName: prev.displayName.trim() ? prev.displayName : nextDisplayName,
				contactEmail: prev.contactEmail.trim() ? prev.contactEmail : nextEmail,
				contactPhone: prev.contactPhone.trim() ? prev.contactPhone : nextPhone.local,
				contactPhoneCountry: prev.contactPhone.trim()
					? prev.contactPhoneCountry
					: nextPhone.country,
				county: prev.county.trim() ? prev.county : nextCounty,
				area: prev.area.trim() ? prev.area : nextArea,
				listAsBusiness: prev.listAsBusiness ? prev.listAsBusiness : isBusiness,
				companyName: isBusiness
					? prev.companyName.trim()
						? prev.companyName
						: defaults.companyName
					: prev.companyName,
				businessAddress: isBusiness
					? prev.businessAddress.trim()
						? prev.businessAddress
						: defaults.businessAddress
					: prev.businessAddress,
				vatNumber: isBusiness
					? prev.vatNumber.trim()
						? prev.vatNumber
						: defaults.vatNumber
					: prev.vatNumber,
				website: isBusiness
					? prev.website.trim()
						? prev.website
						: defaults.website
					: prev.website,
				registrationNumber: isBusiness
					? prev.registrationNumber.trim()
						? prev.registrationNumber
						: defaults.registrationNumber
					: prev.registrationNumber,
			}));
			businessDefaultsRef.current = defaults;
			didPrefillContact.current = true;
			didPrefillLocation.current = true;
			didPrefillBusiness.current = true;
			setDidHydrateProfile(true);
		}, 0);

		return () => window.clearTimeout(timeoutId);
	}, [didHydrateProfile, profile, user?.email]);

	const handleChange: ListingFormChangeHandler = (field, value) => {
		setFormValues((prev) => {
			if (field === "county") {
				const nextCounty = String(value ?? "");
				return {
					...prev,
					county: nextCounty,
					area: nextCounty === prev.county ? prev.area : "",
				};
			}
			if (field === "servicePhotos") {
				revokePhotoPreviews(prev.requestPhotos);
				revokePhotoPreviews(prev.marketplacePhotos);
				return {
					...prev,
					servicePhotos: value as ListingFormValues["servicePhotos"],
					requestPhotos: [],
					marketplacePhotos: [],
				};
			}
			if (field === "requestPhotos") {
				revokePhotoPreviews(prev.servicePhotos);
				revokePhotoPreviews(prev.marketplacePhotos);
				return {
					...prev,
					requestPhotos: value as ListingFormValues["requestPhotos"],
					servicePhotos: [],
					marketplacePhotos: [],
				};
			}
			if (field === "marketplacePhotos") {
				revokePhotoPreviews(prev.servicePhotos);
				revokePhotoPreviews(prev.requestPhotos);
				return {
					...prev,
					marketplacePhotos: value as ListingFormValues["marketplacePhotos"],
					servicePhotos: [],
					requestPhotos: [],
				};
			}
			return { ...prev, [field]: value };
		});
	};

	const handleBusinessToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
		const isChecked = event.target.checked;

		setFormValues((prev) => ({
			...prev,
			listAsBusiness: isChecked,
			...(isChecked
				? {
						companyName: prev.companyName.trim()
							? prev.companyName
							: businessDefaultsRef.current.companyName,
						businessAddress: prev.businessAddress.trim()
							? prev.businessAddress
							: businessDefaultsRef.current.businessAddress,
						vatNumber: prev.vatNumber.trim()
							? prev.vatNumber
							: businessDefaultsRef.current.vatNumber,
						website: prev.website.trim()
							? prev.website
							: businessDefaultsRef.current.website,
						registrationNumber: prev.registrationNumber.trim()
							? prev.registrationNumber
							: businessDefaultsRef.current.registrationNumber,
					}
				: {
						companyName: "",
						businessAddress: "",
						vatNumber: "",
						website: "",
						registrationNumber: "",
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

	const validateListing = (values: ListingFormValues) => {
		const nextErrors: ListingFormErrors = {};
		const requiredFields = requiredFieldsByType[type];

		requiredFields.forEach((field) => {
			const value = values[field];
			if (typeof value === "string" && !value.trim()) {
				nextErrors[field] = "This field is required.";
			}
		});

		if (values.listAsBusiness) {
			if (!values.companyName.trim()) {
				nextErrors.companyName = "This field is required.";
			}

			if (!values.businessAddress.trim()) {
				nextErrors.businessAddress = "This field is required.";
			}
		}

		if (values.contactEmail && !values.contactEmail.includes("@")) {
			nextErrors.contactEmail = "Enter a valid email.";
		}

		if (!isValidLocalPhone(values.contactPhone, values.contactPhoneCountry)) {
			nextErrors.contactPhone = "Enter a valid phone number.";
		}

		if (!values.displayName.trim()) {
			nextErrors.displayName = "This field is required.";
		}

		if (values.requestBudget && Number.isNaN(Number(values.requestBudget))) {
			nextErrors.requestBudget = "Use a numeric amount.";
		}

		if (values.serviceRate && Number.isNaN(Number(values.serviceRate))) {
			nextErrors.serviceRate = "Use a numeric rate.";
		}

		if (values.marketplacePrice && Number.isNaN(Number(values.marketplacePrice))) {
			nextErrors.marketplacePrice = "Use a numeric price.";
		}

		if (values.marketplaceQuantity && Number.isNaN(Number(values.marketplaceQuantity))) {
			nextErrors.marketplaceQuantity = "Use a numeric quantity.";
		}

		return nextErrors;
	};

	const handlePreview = () => {
		const nextErrors = validateListing(formValues);
		setErrors(nextErrors);

		if (Object.keys(nextErrors).length > 0) {
			setStatusMessage("Please fix the highlighted fields before previewing.");
			setIsPreview(false);
			return;
		}

		setIsPreview(true);
	};

	const submitListing = async (mode: "draft" | "publish") => {
		setIsSubmitting(true);
		setSubmitMode(mode);
		setStatusMessage(null);
		if (isProfileHydrating) {
			setStatusMessage("Loading your profile defaults...");
			setIsSubmitting(false);
			setSubmitMode(null);
			return;
		}

		const formSnapshot: ListingFormValues = { ...formValues };

		const nextErrors = validateListing(formSnapshot);
		setErrors(nextErrors);

		if (Object.keys(nextErrors).length > 0) {
			setStatusMessage(
				mode === "draft"
					? "Please fix the highlighted fields before saving your draft."
					: "Please fix the highlighted fields before submitting."
			);
			setIsSubmitting(false);
			setSubmitMode(null);
			return;
		}

		if (!user) {
			setStatusMessage("Please sign in before submitting a listing.");
			setIsSubmitting(false);
			setSubmitMode(null);
			return;
		}

		const authUser = user;
		if (process.env.NODE_ENV === "development") {
			console.log("AUTH USER:", authUser);
			console.log("AUTH UID:", authUser?.id);
		}

		try {
			setStatusMessage(mode === "draft" ? "Saving draft…" : "Publishing listing…");
			const photos = getPhotosForType(type, formSnapshot);
			if (mode === "publish" && photos.length === 0) {
				setStatusMessage("Please upload at least one photo before submitting.");
				setIsSubmitting(false);
				setSubmitMode(null);
				return;
			}
			const photoNames = photos.map((photo) => photo.fileName ?? photo.file.name);
			const previewUrls = photos.map((photo) => photo.previewUrl);
			const metadata = authUser.user_metadata as Record<string, unknown> | undefined;
			const displayName = profile?.displayName?.trim() || formSnapshot.displayName?.trim() || "";
			const createdAt = authUser.created_at ? new Date(authUser.created_at).toISOString() : null;
			const googlePhotoUrl =
				profile?.googlePhotoUrl ||
				(metadata?.avatar_url as string | undefined) ||
				(metadata?.picture as string | undefined) ||
				null;
			const selectedCategoryId = getCategoryForType(type, formSnapshot);

			if (!displayName) {
				setErrors((prev) => ({ ...prev, displayName: "This field is required." }));
				setIsSubmitting(false);
				setSubmitMode(null);
				return;
			}

			const isAdmin = profile?.role === "admin";
			const displayNameValidation = validateDisplayName(displayName, isAdmin);
			if (displayNameValidation) {
				setErrors((prev) => ({ ...prev, displayName: displayNameValidation }));
				setStatusMessage(displayNameValidation);
				setIsSubmitting(false);
				setSubmitMode(null);
				return;
			}

			const profileCompanyName =
				profile?.companyName ||
				((profile as Record<string, unknown> | null)?.company_name as
					| string
					| null
					| undefined) ||
				null;
			const resolvedCompanyName =
				formSnapshot.companyName.trim() || profileCompanyName || "";
			if (formSnapshot.listAsBusiness && !resolvedCompanyName) {
				setErrors((prev) => ({
					...prev,
					companyName: "Company name is required when listing as a business.",
				}));
				setStatusMessage("Company name is required when listing as a business.");
				setIsSubmitting(false);
				setSubmitMode(null);
				return;
			}

			if (authUser.id) {
				const profileUpdates: Partial<UserProfile> = {
					businessSeller: formSnapshot.listAsBusiness,
				};

				const trimmedDisplayName = displayName.trim();
				if (trimmedDisplayName) profileUpdates.displayName = trimmedDisplayName;
				const trimmedEmail = formSnapshot.contactEmail.trim();
				if (trimmedEmail) profileUpdates.email = trimmedEmail;
				const normalizedProfilePhone = normalizeContactPhone(
					formSnapshot.contactPhone ?? "",
					formSnapshot.contactPhoneCountry
				);
				if (normalizedProfilePhone) profileUpdates.phone = normalizedProfilePhone;
				const trimmedCounty = formSnapshot.county.trim();
				if (trimmedCounty) profileUpdates.county = trimmedCounty;
				const trimmedArea = formSnapshot.area.trim();
				if (trimmedArea) profileUpdates.area = trimmedArea;
				if (formSnapshot.listAsBusiness && resolvedCompanyName) {
					profileUpdates.companyName = resolvedCompanyName;
					const trimmedBusinessAddress = formSnapshot.businessAddress.trim();
					if (trimmedBusinessAddress) {
						profileUpdates.businessAddress = trimmedBusinessAddress;
					}
					const trimmedVatNumber = formSnapshot.vatNumber.trim();
					if (trimmedVatNumber) profileUpdates.vatNumber = trimmedVatNumber;
					const trimmedWebsite = formSnapshot.website.trim();
					if (trimmedWebsite) profileUpdates.website = trimmedWebsite;
					const trimmedRegistrationNumber = formSnapshot.registrationNumber.trim();
					if (trimmedRegistrationNumber) {
						profileUpdates.registrationNumber = trimmedRegistrationNumber;
					}
				}

				await updateUserProfile(authUser.id, profileUpdates);
				await refreshProfile();
			}

			const listingPayload = buildListingPayload(
				type,
				formSnapshot,
				[],
				{
					displayName,
					type: formSnapshot.listAsBusiness ? "business" : "private",
					createdAt,
					avatarUrl: profile?.avatarUrl ?? null,
					googlePhotoUrl,
					ratingAverage: null,
					reviewCount: null,
					savedByCurrentUser: false,
				}
			);

			if (process.env.NODE_ENV === "development") {
				console.log("SUBMIT SNAPSHOT", {
					title: formSnapshot.title,
					description: formSnapshot.description,
					type,
					categoryId: selectedCategoryId,
					county: formSnapshot.county,
					area: formSnapshot.area,
					price:
						type === "service"
							? formSnapshot.serviceRate
							: type === "request"
							? formSnapshot.requestBudget
							: formSnapshot.marketplacePrice,
					sellerType: formSnapshot.listAsBusiness ? "business" : "private",
					photoCount: photos.length,
					photoNames,
					previewUrls,
					payload: listingPayload,
				});
			}

			const listingStatus = mode === "draft" ? "draft" : "active";
			let listingId = draftListingId;

			if (listingId) {
				const { error } = await updateListing(listingId, {
					...listingPayload,
					status: listingStatus,
				});
				if (error) {
					setStatusMessage(error.message || "Failed to update listing.");
					setIsSubmitting(false);
					setSubmitMode(null);
					return;
				}
			} else {
				listingId = await createListing({
					...listingPayload,
					status: listingStatus,
					images: [],
					images1600: [],
					coverImage: null,
					photoCount: 0,
				});
				setDraftListingId(listingId);
			}

			const uploadTargets = photos.filter((photo) => {
				const name = photo.fileName ?? photo.file.name;
				return !uploadedPhotoNamesRef.current.has(name);
			});

			if (uploadTargets.length > 0) {
				setStatusMessage("Uploading photos…");

				const uploadBatch = async (batch: typeof uploadTargets) => {
					await Promise.all(
						batch.map((photo) =>
							uploadImage(photo.file, {
								userId: authUser.id,
								listingId: listingId ?? "",
								kind: "listing",
							})
						)
					);
				};

				const [coverPhoto, ...restPhotos] = uploadTargets;
				if (coverPhoto) {
					await uploadImage(coverPhoto.file, {
						userId: authUser.id,
						listingId: listingId ?? "",
						kind: "listing",
					});
				}

				for (let i = 0; i < restPhotos.length; i += 2) {
					const batch = restPhotos.slice(i, i + 2);
					await uploadBatch(batch);
				}

				uploadTargets.forEach((photo) => {
					const name = photo.fileName ?? photo.file.name;
					uploadedPhotoNamesRef.current.add(name);
				});
			}

			formSnapshot.servicePhotos.forEach((photo) => {
				if (photo.previewUrl) URL.revokeObjectURL(photo.previewUrl);
			});
			formSnapshot.requestPhotos.forEach((photo) => {
				if (photo.previewUrl) URL.revokeObjectURL(photo.previewUrl);
			});
			formSnapshot.marketplacePhotos.forEach((photo) => {
				if (photo.previewUrl) URL.revokeObjectURL(photo.previewUrl);
			});

			setFormValues(defaultListingFormValues);
			setErrors({});
			setIsPreview(false);
			setStatusMessage(mode === "draft" ? "Draft saved." : "Listing published.");

			if (mode === "draft") {
				addToast({
					title: "Draft saved",
					message: "Your draft is ready in your dashboard.",
					type: "success",
				});
				router.push("/dashboard/listings?status=draft");
			} else {
				addToast({
					title: "Listing published",
					message: "Your listing is now live.",
					type: "success",
				});
				router.push("/dashboard/listings?status=active");
			}
			setIsSubmitting(false);
			setSubmitMode(null);
		} catch (error) {
			console.error("Listing submission failed:", error);
			setIsSubmitting(false);
			setSubmitMode(null);
			setStatusMessage("Upload failed. Please try again.");
		}
	};

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		await submitListing("publish");
	};

	const handleSaveDraft = async () => {
		await submitListing("draft");
	};

	const handleCancel = () => {
		router.push("/dashboard/listings");
	};

	const closePreview = () => setIsPreview(false);

	return {
		formValues,
		errors,
		isPreview,
		isSubmitting,
		statusMessage,
		submitMode,
		handleChange,
		handleBusinessToggle,
		handlePreview,
		handleSaveDraft,
		handleSubmit,
		handleCancel,
		closePreview,
		isProfileHydrating,
	};
};
