import {
  Home,
  Hammer,
  Sparkles,
  Truck,
  Car,
  Laptop,
  Users,
  Handshake,
  GraduationCap,
  Camera,
  Palette,
  Briefcase,
  PawPrint,
  Layers,
} from "@/components/ui/Icon";

export const CATEGORIES_SERVICES = [
  { id: "home-property", label: "Home & Property", Icon: Home },
  { id: "construction-trades", label: "Construction & Trades", Icon: Hammer },
  { id: "cleaning", label: "Cleaning", Icon: Sparkles },
  { id: "moving-transport", label: "Moving & Transport", Icon: Truck },
  { id: "cars-vehicles", label: "Cars & Vehicles", Icon: Car },
  { id: "it-tech", label: "IT & Tech", Icon: Laptop },
  { id: "kids-family", label: "Kids & Family", Icon: Users },
  { id: "care-support", label: "Care & Support", Icon: Handshake },
  { id: "education-training", label: "Education & Training", Icon: GraduationCap },
  { id: "events-media", label: "Events & Media", Icon: Camera },
  { id: "handmade-creative", label: "Handmade & Creative", Icon: Palette },
  { id: "business-office", label: "Business & Office", Icon: Briefcase },
  { id: "pets-animals", label: "Pets & Animals", Icon: PawPrint },
  { id: "other", label: "Other", Icon: Layers },
];

// For now requests/marketplace reuse the same list, but keep them separate so they
// can be changed independently in future without editing the sidebar component.
export const CATEGORIES_REQUESTS = [...CATEGORIES_SERVICES];
export const CATEGORIES_MARKETPLACE = [...CATEGORIES_SERVICES];

// Legacy default export name used elsewhere in the codebase
export const CATEGORIES = CATEGORIES_SERVICES;

export const CATEGORIES_BY_MODE = {
  services: CATEGORIES_SERVICES,
  requests: CATEGORIES_REQUESTS,
  marketplace: CATEGORIES_MARKETPLACE,
} as const;
