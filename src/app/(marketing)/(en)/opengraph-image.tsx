import { OG_IMAGE_SIZE, ogImage, ogImageAlt } from "../_components/og-image";

const LOCALE = "en";

// The legal pages under (en) share this image.
export const alt = ogImageAlt(LOCALE);
export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return ogImage(LOCALE);
}
