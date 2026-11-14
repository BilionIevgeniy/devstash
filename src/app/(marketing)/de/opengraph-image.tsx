import { OG_IMAGE_SIZE, ogImage, ogImageAlt } from "../_components/og-image";

const LOCALE = "de";

export const alt = ogImageAlt(LOCALE);
export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";

export default function GermanOpenGraphImage() {
  return ogImage(LOCALE);
}
