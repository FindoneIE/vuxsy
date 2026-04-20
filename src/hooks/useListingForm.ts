"use client";

import * as React from "react";
import type { Listing, ListingInsert, ListingType } from "@/types/listing";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { uploadImage } from "@/lib/supabase/storage";
import { createListing } from "@/lib/listings/createListing";
import { getListingHref } from "@/lib/listings/getListingHref";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
	defaultListingFormValues,
	requiredFieldsByType,
	type ListingFormChangeHandler,
	type ListingFormErrors,
	type ListingFormValues,
} from "@/components/forms/listing/listingFormConfig";

type ListingFormState = {
	formValues: ListingFormValues;
	errors: ListingFormErrors;
	isPreview: boolean;
	isSubmitting: boolean;
	statusMessage: string | null;
};

type UseListingFormReturn = ListingFormState & {
	handleChange: ListingFormChangeHandler;
	handleBusinessToggle: (event: React.ChangeEvent<HTMLInputElement>) => void;
	handlePreview: () => void;
	handleSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
	closePreview: () => void;
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
	const { user, profile } = useAuth();
	const router = useRouter();
	const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);
	const didPrefillContact = React.useRef(false);
	const didPrefillLocation = React.useRef(false);
	const didPrefillBusiness = React.useRef(false);
	const [formValues, setFormValues] = React.useState<ListingFormValues>(
		defaultListingFormValues
	);
	const [errors, setErrors] = React.useState<ListingFormErrors>({});
	const [isPreview, setIsPreview] = React.useState(false);
	const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = React.useState(false);

	React.useEffect(() => {
		setErrors({});
		setIsPreview(false);
		setStatusMessage(null);
		setIsSubmitting(false);
		didPrefillContact.current = false;
		didPrefillLocation.current = false;
		didPrefillBusiness.current = false;
		setFormValues((prev) => {
			revokePhotoPreviews(prev.servicePhotos);
			revokePhotoPreviews(prev.requestPhotos);
			revokePhotoPreviews(prev.marketplacePhotos);
			return defaultListingFormValues;
		});
	}, [type]);

	React.useEffect(() => {
		const nextDisplayName = profile?.displayName ?? "";
		const nextEmail = profile?.email ?? user?.email ?? "";
		const nextPhone = parseContactPhone(profile?.phone);
		if (didPrefillContact.current) return;
		if (!nextDisplayName && !nextEmail && !nextPhone.local) return;
		setFormValues((prev) => ({
			...prev,
			displayName: prev.displayName.trim() ? prev.displayName : nextDisplayName,
			contactEmail: prev.contactEmail.trim() ? prev.contactEmail : nextEmail,
			contactPhone: prev.contactPhone.trim() ? prev.contactPhone : nextPhone.local,
			contactPhoneCountry: prev.contactPhone.trim()
				? prev.contactPhoneCountry
				: nextPhone.country,
		}));
		didPrefillContact.current = true;
	}, [profile?.displayName, profile?.email, profile?.phone, user?.email, type]);

	React.useEffect(() => {
		if (!user?.id) return;
		let mounted = true;
		if (didPrefillLocation.current) return;
		didPrefillLocation.current = true;

		const loadLocation = async () => {
			const { data, error } = await supabase
				.from("profiles")
				.select("county, area")
				.eq("id", user.id)
				.maybeSingle();

			if (!mounted || error) return;

			setFormValues((prev) => ({
				...prev,
				county: prev.county.trim() ? prev.county : data?.county ?? "",
				area: prev.area.trim() ? prev.area : data?.area ?? "",
			}));
		};

		loadLocation();

		return () => {
			mounted = false;
		};
	}, [supabase, user?.id]);

	React.useEffect(() => {
		if (!user?.id) return;
		let mounted = true;
		if (didPrefillBusiness.current) return;
		didPrefillBusiness.current = true;

		const loadBusinessDefaults = async () => {
			const { data, error } = await supabase
				.from("profiles")
				.select(
					"is_business_seller, company_name, business_address, vat_number, website, company_registration_number"
				)
				.eq("id", user.id)
				.maybeSingle();

			if (!mounted || error) return;
			if (!data?.is_business_seller) return;

			setFormValues((prev) => ({
				...prev,
				listAsBusiness: prev.listAsBusiness || Boolean(data?.is_business_seller),
				companyName: prev.companyName.trim() ? prev.companyName : data?.company_name ?? "",
				businessAddress: prev.businessAddress.trim()
					? prev.businessAddress
					: data?.business_address ?? "",
				vatNumber: prev.vatNumber.trim() ? prev.vatNumber : data?.vat_number ?? "",
				website: prev.website.trim() ? prev.website : data?.website ?? "",
				registrationNumber: prev.registrationNumber.trim()
					? prev.registrationNumber
					: data?.company_registration_number ?? "",
			}));
		};

		loadBusinessDefaults();

		return () => {
			mounted = false;
		};
	}, [supabase, user?.id]);

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
				? {}
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

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setIsSubmitting(true);
		setStatusMessage(null);

		const formSnapshot: ListingFormValues = { ...formValues };

		const nextErrors = validateListing(formSnapshot);
		setErrors(nextErrors);

		if (Object.keys(nextErrors).length > 0) {
			setStatusMessage("Please fix the highlighted fields before submitting.");
			setIsSubmitting(false);
			return;
		}

		if (!user) {
			setStatusMessage("Please sign in before submitting a listing.");
			setIsSubmitting(false);
			return;
		}

		const authUser = user;
		if (process.env.NODE_ENV === "development") {
			console.log("AUTH USER:", authUser);
			console.log("AUTH UID:", authUser?.id);
		}

		try {
			const photos = getPhotosForType(type, formSnapshot);
			if (photos.length === 0) {
				setStatusMessage("Please upload at least one photo before submitting.");
				setIsSubmitting(false);
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
				return;
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

						if (process.env.NODE_ENV === "development") {
							console.log("LISTING SUBMIT DEBUG", {
								title: formSnapshot.title,
								description: formSnapshot.description,
								type,
								categoryId: selectedCategoryId,
								county: listingPayload.county,
								area: listingPayload.area,
								price: listingPayload.price,
								sellerType: listingPayload.sellerType,
								photoCount: photos.length,
								photoNames,
								previewUrls,
								payload: listingPayload,
							});
						}

						if (process.env.NODE_ENV === "development") {
							console.log("DATA USER ID:", authUser.id);
							console.log("LISTING PAYLOAD:", listingPayload);
						}
			if (process.env.NODE_ENV === "development") {
				console.log("LISTING DB PAYLOAD:", listingPayload);
			}
			const listingId = await createListing({
				...listingPayload,
				images: [],
				images1600: [],
				coverImage: null,
				photoCount: 0,
			});

			await Promise.all(
				photos.map((photo) =>
					uploadImage(photo.file, {
						userId: authUser.id,
						listingId,
						kind: "listing",
					})
				)
			);
						if (process.env.NODE_ENV === "development") {
							console.log("LISTING CREATED:", listingId);
							console.log("LISTING DOC ID FOR UPLOAD:", listingId);
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
			setStatusMessage("Listing submitted successfully.");

			const href = getListingHref({
				id: listingId,
				type,
				category: selectedCategoryId ?? undefined,
			});
			router.push(href);
		} catch (error) {
			console.error("Listing submission failed:", error);
			setIsSubmitting(false);
			setStatusMessage("Upload failed. Please try again.");
		}
	};

	const closePreview = () => setIsPreview(false);

	return {
		formValues,
		errors,
		isPreview,
		isSubmitting,
		statusMessage,
		handleChange,
		handleBusinessToggle,
		handlePreview,
		handleSubmit,
		closePreview,
	};
};
