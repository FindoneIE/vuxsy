import type { ListingType } from "@/types/listing";
import type { PhotoDraft } from "@/components/forms/listing/PhotoUploadField";

export type ListingFormValues = {
  title: string;
  description: string;
  county: string;
  area: string;
  listAsBusiness: boolean;
  companyName: string;
  businessAddress: string;
  vatNumber: string;
  website: string;
  registrationNumber: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  servicePhotos: PhotoDraft[];
  requestPhotos: PhotoDraft[];
  marketplacePhotos: PhotoDraft[];
  serviceYoutubeUrl: string;
  requestYoutubeUrl: string;
  marketplaceYoutubeUrl: string;
  serviceCategory: string;
  servicePricing: string;
  serviceRate: string;
  serviceAvailability: string;
  requestCategory: string;
  requestBudget: string;
  requestNeededBy: string;
  requestUrgency: string;
  marketplaceCategory: string;
  marketplaceCondition: string;
  marketplaceQuantity: string;
  marketplacePrice: string;
  marketplaceDelivery: string;
};

export type ListingFormErrors = Partial<Record<keyof ListingFormValues | "form", string>>;
export type ListingFormChangeHandler = (
  field: keyof ListingFormValues,
  value: ListingFormValues[keyof ListingFormValues]
) => void;

export const defaultListingFormValues: ListingFormValues = {
  title: "",
  description: "",
  county: "",
  area: "",
  listAsBusiness: false,
  companyName: "",
  businessAddress: "",
  vatNumber: "",
  website: "",
  registrationNumber: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  servicePhotos: [],
  requestPhotos: [],
  marketplacePhotos: [],
  serviceYoutubeUrl: "",
  requestYoutubeUrl: "",
  marketplaceYoutubeUrl: "",
  serviceCategory: "",
  servicePricing: "",
  serviceRate: "",
  serviceAvailability: "",
  requestCategory: "",
  requestBudget: "",
  requestNeededBy: "",
  requestUrgency: "",
  marketplaceCategory: "",
  marketplaceCondition: "",
  marketplaceQuantity: "",
  marketplacePrice: "",
  marketplaceDelivery: "",
};

export const requiredFieldsByType: Record<ListingType, Array<keyof ListingFormValues>> = {
  service: ["title", "description", "county", "serviceCategory", "servicePricing"],
  request: ["title", "description", "county", "requestCategory", "requestBudget"],
  marketplace: [
    "title",
    "description",
    "county",
    "marketplaceCategory",
    "marketplaceCondition",
    "marketplacePrice",
  ],
};
