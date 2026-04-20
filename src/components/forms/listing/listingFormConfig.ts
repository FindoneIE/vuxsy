import type { Listing, ListingType } from "@/types/listing";
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
  displayName: string;
  contactEmail: string;
  contactPhone: string;
  contactPhoneCountry: "+353" | "+44";
  allowMessages: boolean;
  allowEmail: boolean;
  allowPhone: boolean;
  showEmailPublicly: boolean;
  showPhonePublicly: boolean;
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
  marketplaceQuantity: string;
  marketplacePrice: string;
  marketplaceCondition: string;
  category_id: string | null;
  city: string | null;
  price: number | null;
  status: Listing["status"] | null;
  listing_type: ListingType | null;
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
  displayName: "",
  contactEmail: "",
  contactPhone: "",
  contactPhoneCountry: "+353",
  allowMessages: true,
  allowEmail: false,
  allowPhone: false,
  showEmailPublicly: false,
  showPhonePublicly: false,
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
  marketplaceQuantity: "",
  marketplacePrice: "",
  marketplaceCondition: "",
  category_id: null,
  city: null,
  price: null,
  status: null,
  listing_type: null,
};

export const requiredFieldsByType: Record<ListingType, Array<keyof ListingFormValues>> = {
  service: ["title", "description", "county", "serviceCategory", "servicePricing"],
  request: ["title", "description", "county", "requestCategory", "requestBudget"],
  marketplace: [
    "title",
    "description",
    "county",
    "marketplaceCategory",
    "marketplacePrice",
  ],
};
