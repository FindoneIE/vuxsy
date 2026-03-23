"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optimizeAvatarImage = exports.optimizeListingImages = void 0;
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const fs = __importStar(require("fs/promises"));
const crypto_1 = require("crypto");
const sharp_1 = __importDefault(require("sharp"));
const firebase_functions_1 = require("firebase-functions");
const storage_1 = require("firebase-functions/v2/storage");
const firebase_admin_1 = __importDefault(require("firebase-admin"));
if (!firebase_admin_1.default.apps.length) {
    firebase_admin_1.default.initializeApp();
}
const bucket = firebase_admin_1.default.storage().bucket();
const WEBP_PREFIX = "webp";
const AVATAR_PREFIX = "avatar";
const LISTING_DRAFT_SEPARATOR = "__";
const createTempDir = async (prefix) => {
    return fs.mkdtemp(path.join(os.tmpdir(), prefix));
};
const getSignedUrl = async (filePath) => {
    const [url] = await bucket.file(filePath).getSignedUrl({
        action: "read",
        expires: "03-01-2500",
    });
    return url;
};
const buildDownloadUrl = (filePath, token) => {
    const encodedPath = encodeURIComponent(filePath);
    return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${token}`;
};
const uploadWebp = async (sourcePath, destination, width, downloadToken, height, fit = "contain", position = "centre") => {
    const outputPath = `${sourcePath}-${width}.webp`;
    await (0, sharp_1.default)(sourcePath)
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
    const metadata = {};
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
const getListingDocRef = (listingId) => {
    const ref = firebase_admin_1.default.firestore().collection("listings").doc(listingId);
    return ref;
};
exports.optimizeListingImages = (0, storage_1.onObjectFinalized)({
    cpu: 2,
    memory: "1GiB",
    region: "europe-west1",
}, async (event) => {
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
    firebase_functions_1.logger.info("Listing image source detected", { filePath, userId });
    const draftBaseName = path.parse(fileName).name;
    const separatorIndex = draftBaseName.indexOf(LISTING_DRAFT_SEPARATOR);
    if (separatorIndex === -1) {
        firebase_functions_1.logger.warn("Listing draft filename missing separator", { filePath });
        return;
    }
    const listingId = draftBaseName.slice(0, separatorIndex);
    const imageId = draftBaseName.slice(separatorIndex + LISTING_DRAFT_SEPARATOR.length);
    firebase_functions_1.logger.info("Listing image metadata", {
        listingId,
        imageId,
        userId,
        filePath,
    });
    firebase_functions_1.logger.info("Parsed listing doc id", { docId: listingId, userId, filePath });
    const tempDir = await createTempDir("listing-");
    const tempFile = path.join(tempDir, fileName);
    try {
        await bucket.file(filePath).download({ destination: tempFile });
        const dest600 = `${WEBP_PREFIX}/${userId}/${listingId}/${imageId}-600.webp`;
        const dest1600 = `${WEBP_PREFIX}/${userId}/${listingId}/${imageId}-1600.webp`;
        firebase_functions_1.logger.info("Listing image destination", { path: dest600, userId });
        firebase_functions_1.logger.info("Listing image destination", { path: dest1600, userId });
        const token600 = (0, crypto_1.randomUUID)();
        const token1600 = (0, crypto_1.randomUUID)();
        const output600 = await uploadWebp(tempFile, dest600, 600, token600, 600, "cover", "centre");
        const output1600 = await uploadWebp(tempFile, dest1600, 1600, token1600, 1600, "cover", "centre");
        const url600 = buildDownloadUrl(dest600, token600);
        const url1600 = buildDownloadUrl(dest1600, token1600);
        firebase_functions_1.logger.info("Listing webp urls", { listingId, userId, url600, url1600 });
        firebase_functions_1.logger.info("Listing webp urls generated", {
            listingId,
            userId,
            url600,
            url1600,
        });
        const docRef = getListingDocRef(listingId);
        const listingSnap = await docRef.get();
        firebase_functions_1.logger.info("Listing document lookup", {
            listingId,
            userId,
            collection: "listings",
            docId: docRef.id,
            exists: listingSnap.exists,
        });
        let didUpdate = false;
        if (!listingSnap.exists) {
            firebase_functions_1.logger.error("NO MATCHING LISTING FOUND", {
                listingId,
                userId,
                filePath,
            });
        }
        else {
            try {
                await firebase_admin_1.default.firestore().runTransaction(async (transaction) => {
                    const snapshot = await transaction.get(docRef);
                    if (!snapshot.exists) {
                        firebase_functions_1.logger.warn("Document disappeared during transaction", {
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
                    firebase_functions_1.logger.info("Listing image transaction", {
                        listingId,
                        url600,
                        url1600,
                        nextImages,
                        nextImages1600,
                    });
                    firebase_functions_1.logger.info("Listing image update start", {
                        listingId,
                        collection: "listings",
                        docId: docRef.id,
                    });
                    transaction.update(docRef, {
                        images: nextImages,
                        images1600: nextImages1600,
                        coverImage,
                        updatedAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp(),
                        status: "active",
                    });
                    firebase_functions_1.logger.info("Listing image update queued", {
                        listingId,
                        collection: "listings",
                        docId: docRef.id,
                    });
                    firebase_functions_1.logger.info("Listing cover image set", {
                        listingId,
                        docId: docRef.id,
                        coverImage,
                    });
                    didUpdate = true;
                });
                if (didUpdate) {
                    firebase_functions_1.logger.info("Listing Firestore update success", {
                        listingId,
                        userId,
                        docId: docRef.id,
                    });
                }
            }
            catch (updateError) {
                firebase_functions_1.logger.error("Listing image update failed", {
                    listingId,
                    userId,
                    collection: "listings",
                    docId: docRef.id,
                    updateError,
                });
            }
        }
        firebase_functions_1.logger.info("Listing image update", {
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
            firebase_functions_1.logger.info("Listing draft deleted", { filePath, userId });
        }
        catch (deleteError) {
            firebase_functions_1.logger.error("Listing draft delete failed", { deleteError, filePath, userId });
        }
        await fs.rm(output600, { force: true });
        await fs.rm(output1600, { force: true });
    }
    catch (error) {
        firebase_functions_1.logger.error("Listing image optimization failed", {
            error,
            filePath,
            userId,
        });
    }
    finally {
        await fs.rm(tempDir, { recursive: true, force: true });
    }
});
exports.optimizeAvatarImage = (0, storage_1.onObjectFinalized)({
    cpu: 1,
    memory: "512MiB",
    region: "europe-west1",
}, async (event) => {
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
    firebase_functions_1.logger.info("Avatar source detected", { filePath, userId });
    const tempDir = await createTempDir("avatar-");
    const tempFile = path.join(tempDir, fileName);
    try {
        await bucket.file(filePath).download({ destination: tempFile });
        const dest256 = `${AVATAR_PREFIX}/${userId}/256/avatar.webp`;
        firebase_functions_1.logger.info("Avatar destination", { path: dest256, userId });
        const output256 = await uploadWebp(tempFile, dest256, 256);
        const avatarUrl = await getSignedUrl(dest256);
        await firebase_admin_1.default
            .firestore()
            .collection("users")
            .doc(userId)
            .set({
            avatarUrl,
            updatedAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        await bucket.file(filePath).delete();
        firebase_functions_1.logger.info("Avatar original deleted", { filePath, userId });
        await fs.rm(output256, { force: true });
    }
    catch (error) {
        firebase_functions_1.logger.error("Avatar optimization failed", {
            error,
            filePath,
            userId,
        });
    }
    finally {
        await fs.rm(tempDir, { recursive: true, force: true });
    }
});
