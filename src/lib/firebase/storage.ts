import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { auth, storage } from "@/lib/firebase";

export const sanitizeFileName = (fileName: string) =>
  fileName.replace(/[^a-z0-9.\-_]/gi, "_");

const LISTING_DRAFT_SEPARATOR = "__";

export const getDraftImagePath = (userId: string, fileName: string) =>
  `draft/${userId}/${fileName}`;

export const getWebpImagePath = (userId: string, fileName: string) =>
  `webp/${userId}/${fileName}`;

export const getAvatarPath = (userId: string, fileName: string) =>
  `avatar/${userId}/${fileName}`;

const getListingDraftFileName = (listingId: string, imageId: string) =>
  `${listingId}${LISTING_DRAFT_SEPARATOR}${imageId}`;

type UploadImageOptions = {
  userId: string;
  listingId?: string;
  imageId?: string;
  uploadType?: "draft" | "avatar";
};

export const uploadImage = async (file: File, options: UploadImageOptions) => {
  const { userId, listingId, imageId, uploadType = "draft" } = options;
  const timestamp = Date.now();
  const safeName = sanitizeFileName(file.name);
  const resolvedImageId = imageId ?? `${timestamp}-${safeName}`;
  const draftFileName = listingId
    ? getListingDraftFileName(listingId, resolvedImageId)
    : resolvedImageId;
  const storagePath =
    uploadType === "avatar"
      ? getAvatarPath(userId, resolvedImageId)
      : getDraftImagePath(userId, draftFileName);
  const authUid = auth.currentUser?.uid;
  if (process.env.NODE_ENV === "development") {
    console.log("UPLOAD PATH:", storagePath);
    console.log("UPLOAD METADATA:", {
      authUid,
      userId,
      listingId,
      imageId,
      resolvedImageId,
      uploadType,
      storagePath,
    });
  }
  const storageRef = ref(storage, storagePath);

  // TODO: Replace original uploads with optimized WebP outputs (600/1600) once
  // the image processing pipeline is in place.

  await uploadBytes(storageRef, file, {
    contentType: file.type,
  });

  return getDownloadURL(storageRef);
};
