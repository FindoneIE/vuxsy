type UploadImageOptions = {
  userId: string;
  listingId?: string;
  kind?: "listing" | "avatar";
};

export type UploadImageResult = {
  path: string;
  publicUrl: string | null;
  largePath?: string;
  largeUrl?: string | null;
  imageId?: string;
};

export async function removeAvatar(): Promise<void> {
  const response = await fetch("/api/uploads/avatar", {
    method: "DELETE",
  });

  if (!response.ok) {
    const message = await response.text();
    console.error("PROFILE_AVATAR_UPLOAD_ERROR", message || response.status);
    throw new Error(message || "Avatar remove failed");
  }
}

export async function uploadImage(
  file: File,
  options: UploadImageOptions
): Promise<UploadImageResult> {
  const { userId, listingId, kind } = options;
  const formData = new FormData();
  formData.append("file", file);

  if (kind === "listing") {
    if (!listingId) {
      throw new Error("Missing listingId for listing image upload");
    }
    formData.append("listingId", listingId);
    const response = await fetch("/api/uploads/listing", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const message = await response.text();
      console.error("LISTING_UPLOAD_ERROR", message || response.status);
      throw new Error(message || "Listing image upload failed");
    }

    const result = (await response.json()) as UploadImageResult;
    return result;
  }

  formData.append("userId", userId);
  const response = await fetch("/api/uploads/avatar", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text();
    console.error("PROFILE_AVATAR_UPLOAD_ERROR", message || response.status);
    throw new Error(message || "Avatar upload failed");
  }

  const result = (await response.json()) as UploadImageResult;
  return result;
}
