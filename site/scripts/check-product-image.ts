import assert from "node:assert/strict";
import {
  buildSimilarConfiguratorHref,
  getValidProductImage,
} from "../lib/product-image";

const product = {
  slug: "kolco-voskresnoe",
  categoryId: 7,
  images: ["/uploads/products/one.jpg", "/uploads/products/two.jpg"],
};

assert.equal(
  buildSimilarConfiguratorHref("kolca", product.slug, "/uploads/products/two.jpg"),
  "/configurator/kolca?product=kolco-voskresnoe&image=%2Fuploads%2Fproducts%2Ftwo.jpg",
);
assert.equal(
  buildSimilarConfiguratorHref("kolca", product.slug, ""),
  "/configurator/kolca?product=kolco-voskresnoe",
);

assert.equal(
  getValidProductImage(product, 7, product.slug, "/uploads/products/two.jpg"),
  "/uploads/products/two.jpg",
);
assert.equal(getValidProductImage(product, 8, product.slug, "/uploads/products/two.jpg"), null);
assert.equal(getValidProductImage(product, 7, "other-product", "/uploads/products/two.jpg"), null);
assert.equal(
  getValidProductImage(product, 7, product.slug, "/uploads/products/not-in-db.jpg"),
  null,
);
assert.equal(getValidProductImage(product, 7, product.slug, undefined), null);

console.log("OK product image transfer");
