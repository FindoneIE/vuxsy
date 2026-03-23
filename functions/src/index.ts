import * as path from "path";
import * as os from "os";
import * as fs from "fs/promises";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { logger } from "firebase-functions";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const bucket = admin.storage().bucket();

const WEBP_PREFIX = "webp";
const AVATAR_PREFIX = "avatar";
const LISTING_DRAFT_SEPARATOR = "__";

const createTempDir = async (prefix: string) => {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
};

const getSignedUrl = async (filePath: string) => {
  const [url] = await bucket.file(filePath).getSignedUrl({
    action: "read",
    expires: "03-01-2500",
  });
  return url;
};

const buildDownloadUrl = (filePath: string, token: string) => {
  const encodedPath = encodeURIComponent(filePath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${token}`;
};

const uploadWebp = async (
  sourcePath: string,
  destination: string,
  width: number,
  downloadToken?: string,
  height?: number,
  fit: "cover" | "contain" = "contain",
  position: "centre" | "center" = "centre"
) => {
  const outputPath = `${sourcePath}-${width}.webp`;

  await sharp(sourcePath)
    .rotate()
    .resize({
      width,
      height,
      fit,
      position,
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toFile(outputPath);

  const metadata: Record<string, string> = {};

  if (downloadToken) {
    metadata.firebaseStorageDownloadTokens = downloadToken;
  }

  await bucket.upload(outputPath, {
    destination,
    metadata: {
      contentType: "image/webp",
      cacheControl: "public, max-age=31536000, immutable",
      ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
    },
  });

  return outputPath;
};

const getListingDocRef = (listingId: string) => {
  const ref = admin.firestore().collection("listings").doc(listingId);
  return ref;
};

export const optimizeListingImages = onObjectFinalized(
  {
    cpu: 2,
    memory: "1GiB",
    region: "europe-west1",
  },
  async (event) => {
    const object = event.data;
    const filePath = object.name;

    if (!filePath || !object.contentType?.startsWith("image/")) {
      return;
    }

    const match = filePath.match(/^draft\/([^/]+)\/(.+)$/);
    if (!match) {
      return;
    }

    const [, userId, fileName] = match;
    logger.info("Listing image source detected", { filePath, userId });

    const draftBaseName = path.parse(fileName).name;
    const separatorIndex = draftBaseName.indexOf(LISTING_DRAFT_SEPARATOR);

    if (separatorIndex === -1) {
      logger.warn("Listing draft filename missing separator", { filePath });
      return;
    }

    const listingId = draftBaseName.slice(0, separatorIndex);
    const imageId = draftBaseName.slice(
      separatorIndex + LISTING_DRAFT_SEPARATOR.length
    );
    logger.info("Listing image metadata", {
      listingId,
      imageId,
      userId,
      filePath,
    });
    logger.info("Parsed listing doc id", { docId: listingId, userId, filePath });

    const tempDir = await createTempDir("listing-");
    const tempFile = path.join(tempDir, fileName);

    try {
      await bucket.file(filePath).download({ destination: tempFile });

      const dest600 = `${WEBP_PREFIX}/${userId}/${listingId}/${imageId}-600.webp`;
      const dest1600 = `${WEBP_PREFIX}/${userId}/${listingId}/${imageId}-1600.webp`;

      logger.info("Listing image destination", { path: dest600, userId });
      logger.info("Listing image destination", { path: dest1600, userId });

      const token600 = randomUUID();
      const token1600 = randomUUID();

      const output600 = await uploadWebp(
        tempFile,
        dest600,
        600,
        token600,
        600,
        "cover",
        "centre"
      );
      const output1600 = await uploadWebp(
        tempFile,
        dest1600,
        1600,
        token1600,
        1600,
        "cover",
        "centre"
      );

      const url600 = buildDownloadUrl(dest600, token600);
      const url1600 = buildDownloadUrl(dest1600, token1600);

      logger.info("Listing webp urls", { listingId, userId, url600, url1600 });
      logger.info("Listing webp urls generated", {
        listingId,
        userId,
        url600,
        url1600,
      });

      const docRef = getListingDocRef(listingId);
      const listingSnap = await docRef.get();

      logger.info("Listing document lookup", {
        listingId,
        userId,
        collection: "listings",
        docId: docRef.id,
        exists: listingSnap.exists,
      });

      let didUpdate = false;

      if (!listingSnap.exists) {
        logger.error("NO MATCHING LISTING FOUND", {
          listingId,
          userId,
          filePath,
        });
      } else {
        try {
          await admin.firestore().runTransaction(async (transaction) => {
            const snapshot = await transaction.get(docRef);

            if (!snapshot.exists) {
              logger.warn("Document disappeared during transaction", {
                listingId,
                userId,
                collection: "listings",
                docId: docRef.id,
              });
              return;
            }

            const data = snapshot.data() ?? {};
            const currentImages = Array.isArray(data.images) ? data.images : [];
            const currentImages1600 = Array.isArray(data.images1600)
              ? data.images1600
              : [];

            const nextImages = currentImages.includes(url600)
              ? currentImages
              : [...currentImages, url600];

            const nextImages1600 = currentImages1600.includes(url1600)
              ? currentImages1600
              : [...currentImages1600, url1600];

            const coverImage = url600;

            logger.info("Listing image transaction", {
              listingId,
              url600,
              url1600,
              nextImages,
              nextImages1600,
            });

            logger.info("Listing image update start", {
              listingId,
              collection: "listings",
              docId: docRef.id,
            });

            transaction.update(docRef, {
              images: nextImages,
              images1600: nextImages1600,
              coverImage,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              status: "active",
            });

            logger.info("Listing image update queued", {
              listingId,
              collection: "listings",
              docId: docRef.id,
            });

            logger.info("Listing cover image set", {
              listingId,
              docId: docRef.id,
              coverImage,
            });

            didUpdate = true;
          });

          if (didUpdate) {
            logger.info("Listing Firestore update success", {
              listingId,
              userId,
              docId: docRef.id,
            });
          }
        } catch (updateError) {
          logger.error("Listing image update failed", {
            listingId,
            userId,
            collection: "listings",
            docId: docRef.id,
            updateError,
          });
        }
      }

      logger.info("Listing image update", {
        listingId,
        userId,
        collection: "listings",
        docId: docRef.id,
        didUpdate,
        url600,
        url1600,
      });

      try {
        await bucket.file(filePath).delete();
        logger.info("Listing draft deleted", { filePath, userId });
      } catch (deleteError) {
        logger.error("Listing draft delete failed", { deleteError, filePath, userId });
      }

      await fs.rm(output600, { force: true });
      await fs.rm(output1600, { force: true });
    } catch (error) {
      logger.error("Listing image optimization failed", {
        error,
        filePath,
        userId,
      });
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }
);

export const optimizeAvatarImage = onObjectFinalized(
  {
    cpu: 1,
    memory: "512MiB",
    region: "europe-west1",
  },
  async (event) => {
    const object = event.data;
    const filePath = object.name;

    if (!filePath || !object.contentType?.startsWith("image/")) {
      return;
    }

    const match = filePath.match(/^avatar\/([^/]+)\/(.+)$/);
    if (!match) {
      return;
    }

    const [, userId, fileName] = match;

    if (filePath.includes("/256/") || fileName.endsWith(".webp")) {
      return;
    }

    logger.info("Avatar source detected", { filePath, userId });

    const tempDir = await createTempDir("avatar-");
    const tempFile = path.join(tempDir, fileName);

    try {
      await bucket.file(filePath).download({ destination: tempFile });

      const dest256 = `${AVATAR_PREFIX}/${userId}/256/avatar.webp`;
      logger.info("Avatar destination", { path: dest256, userId });

      const output256 = await uploadWebp(tempFile, dest256, 256);
      const avatarUrl = await getSignedUrl(dest256);

      await admin
        .firestore()
        .collection("users")
        .doc(userId)
        .set(
          {
            avatarUrl,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

      await bucket.file(filePath).delete();
      logger.info("Avatar original deleted", { filePath, userId });

      await fs.rm(output256, { force: true });
    } catch (error) {
      logger.error("Avatar optimization failed", {
        error,
        filePath,
        userId,
      });
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }
);