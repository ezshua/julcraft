export function buildSimilarConfiguratorHref(
  categorySlug: string,
  productSlug: string,
  image: string,
): string {
  const params = new URLSearchParams({ product: productSlug });
  if (image) params.set("image", image);
  return `/configurator/${encodeURIComponent(categorySlug)}?${params.toString()}`;
}

export function getValidProductImage(
  product: { slug: string; categoryId: number; images: string[] },
  categoryId: number,
  requestedProductSlug: string | undefined,
  requestedImage: string | undefined,
): string | null {
  if (
    !requestedProductSlug ||
    !requestedImage ||
    product.slug !== requestedProductSlug ||
    product.categoryId !== categoryId ||
    !product.images.includes(requestedImage)
  ) {
    return null;
  }
  return requestedImage;
}
