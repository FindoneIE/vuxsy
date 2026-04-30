export type ListingType = "services" | "requests" | "marketplace";

export type ListingSectionConfig = {
  type: ListingType;
  label: string;
  singularLabel: string;
  basePath: string;
  collectionName: string;
  supportsPrice: boolean;
  supportsSpotlight: boolean;
  supportsBump: boolean;
  supportsRenew: boolean;
};

export const listingConfig: Record<ListingType, ListingSectionConfig> = {
  services: {
    type: "services",
    label: "Services",
    singularLabel: "Service",
    basePath: "/services",
    collectionName: "services",
    supportsPrice: true,
    supportsSpotlight: true,
    supportsBump: true,
    supportsRenew: true,
  },

  requests: {
    type: "requests",
    label: "Get Help",
    singularLabel: "Job",
    basePath: "/requests",
    collectionName: "requests",
    supportsPrice: false,
    supportsSpotlight: true,
    supportsBump: true,
    supportsRenew: true,
  },

  marketplace: {
    type: "marketplace",
    label: "Marketplace",
    singularLabel: "Listing",
    basePath: "/marketplace",
    collectionName: "marketplace",
    supportsPrice: true,
    supportsSpotlight: true,
    supportsBump: true,
    supportsRenew: true,
  },
};

export function getListingConfig(type: ListingType): ListingSectionConfig {
  return listingConfig[type];
}