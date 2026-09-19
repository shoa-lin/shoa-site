/**
 * Derives a plain-English alt description from an image filename, e.g.
 * "/assets/food/slug/01-storefront.jpg" -> "storefront". Falls back to the
 * bare filename when there is no numeric order prefix to strip.
 */
export function deriveImageAlt(imagePath: string): string {
  const filename = imagePath.split("/").pop() ?? "";
  const withoutExtension = filename.replace(/\.[^./]+$/, "");
  const withoutOrderPrefix = withoutExtension.replace(/^\d+-/, "");
  return withoutOrderPrefix.replace(/-/g, " ");
}
