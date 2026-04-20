import sharp from "sharp";

type ListingImageVariants = {
  image1800: Buffer;
  image600: Buffer;
};

export const processListingImage = async (buffer: Buffer): Promise<ListingImageVariants> => {
  const base = sharp(buffer).rotate();

  const [image1800, image600] = await Promise.all([
    base
      .clone()
      .resize({ width: 1800, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer(),
    base
      .clone()
      .resize({ width: 600, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer(),
  ]);

  return { image1800, image600 };
};

export const processAvatarImage = async (buffer: Buffer) =>
  sharp(buffer)
    .rotate()
    .resize({ width: 250, height: 250, fit: "cover" })
    .webp({ quality: 80 })
    .toBuffer();
