"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type ProductSelectionContextValue = {
  image: string;
  setImage: (image: string) => void;
};

const ProductSelectionContext = createContext<ProductSelectionContextValue | null>(null);

export function ProductSelectionProvider({
  initialImage,
  children,
}: {
  initialImage: string;
  children: ReactNode;
}) {
  const [image, setImage] = useState(initialImage);
  const value = useMemo(() => ({ image, setImage }), [image]);
  return <ProductSelectionContext.Provider value={value}>{children}</ProductSelectionContext.Provider>;
}

export function useProductSelection(): ProductSelectionContextValue {
  return useContext(ProductSelectionContext) ?? { image: "", setImage: () => undefined };
}
