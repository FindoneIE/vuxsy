export type AvatarSource = "custom" | "google" | "initials" | "placeholder";

export type AvatarData = {
  avatarUrl?: string | null;
  googlePhotoUrl?: string | null;
  displayName?: string | null;
  email?: string | null;
};

export type UserProfile = {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  county?: string | null;
  area?: string | null;
  businessSeller?: boolean | null;
  companyName?: string | null;
  businessAddress?: string | null;
  vatNumber?: string | null;
  website?: string | null;
  registrationNumber?: string | null;
  avatarUrl?: string | null;
  googlePhotoUrl?: string | null;
  avatarSource?: AvatarSource | null;
  language?: string | null;
  emailNotifications?: boolean | null;
  marketplaceAlerts?: boolean | null;
  messageNotifications?: boolean | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
};
