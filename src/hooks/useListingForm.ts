"use client";

import * as React from "react";
import type { ListingType } from "@/types/listing";
import { useAuth } from "@/components/auth/AuthProvider";
import { auth } from "@/lib/firebase";
import { uploadImage } from "@/lib/firebase/storage";
import { createListing } from "@/lib/listings/createListing";
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

const buildListingPayload = (
	type: ListingType,
	values: ListingFormValues,
	imageUrls: string[],
	userId: string
) => {
	const { servicePhotos, requestPhotos, marketplacePhotos, ...rest } = values;
	void servicePhotos;
	void requestPhotos;
	void marketplacePhotos;

	const price =
		type === "service"
			? toNumberOrNull(rest.serviceRate)
			: type === "request"
				? toNumberOrNull(rest.requestBudget)
				: toNumberOrNull(rest.marketplacePrice);

	const sellerType = rest.listAsBusiness ? "business" : "private";

	return {
		title: rest.title,
		description: rest.description || null,
		type,
		category: getCategoryForType(type, values),
		county: rest.county || null,
		area: rest.area || null,
		price,
		currency: null,
		sellerType,
		images: imageUrls,
		images1600: [],
		coverImage: imageUrls[0] ?? null,
		photoCount: imageUrls.length,
		userId,
		status: "active" as const,
	};
};

export const useListingForm = (type: ListingType): UseListingFormReturn => {
	const { user } = useAuth();
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
		setFormValues(defaultListingFormValues);
	}, [type]);

	const handleChange: ListingFormChangeHandler = (field, value) => {
		setFormValues((prev) => ({ ...prev, [field]: value }));
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
		setStatusMessage("Preview mode is on.");
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

				const authUser = auth.currentUser;
				if (process.env.NODE_ENV === "development") {
					console.log("AUTH USER:", authUser);
					console.log("AUTH UID:", authUser?.uid);
				}

		if (!authUser) {
			setStatusMessage("Please sign in before submitting a listing.");
			setIsSubmitting(false);
			return;
		}

		try {
			const photos = getPhotosForType(type, formSnapshot);
			const photoNames = photos.map((photo) => photo.fileName ?? photo.file.name);
			const previewUrls = photos.map((photo) => photo.previewUrl);
			const listingPayload = buildListingPayload(
				type,
				formSnapshot,
				[],
				authUser.uid
			);

						if (process.env.NODE_ENV === "development") {
							console.log("SUBMIT SNAPSHOT", {
								title: formSnapshot.title,
								description: formSnapshot.description,
								type,
								category: getCategoryForType(type, formSnapshot),
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
								category: listingPayload.category,
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
							console.log("DATA USER ID:", listingPayload.userId);
							console.log("LISTING PAYLOAD:", listingPayload);
						}
			const listingId = await createListing({
				...listingPayload,
				photoCount: photos.length,
				coverImage: null,
			});
						if (process.env.NODE_ENV === "development") {
							console.log("LISTING CREATED:", listingId);
							console.log("LISTING DOC ID FOR UPLOAD:", listingId);
						}

			await Promise.all(
				photos.map((photo) => {
					const draftFileName = `${listingId}__${photo.id}`;
					const uploadPath = `draft/${user.uid}/${draftFileName}`;
										if (process.env.NODE_ENV === "development") {
											console.log("LISTING IMAGE UPLOAD", {
												listingId,
												fileName: photo.file.name,
												previewUrl: photo.previewUrl,
												localFile: photo.file,
												uploadPath,
											});
										}
					return uploadImage(photo.file, {
						userId: user.uid,
						listingId,
						imageId: photo.id,
					});
				})
			);

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
			setStatusMessage("Listing submitted successfully. Images are processing now.");
			setIsSubmitting(false);
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
