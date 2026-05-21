import { createContext, useContext, useEffect, useState } from "react";
import { useBrands, type Brand } from "@/hooks/useBrands";

const STORAGE_KEY = "genius_active_brand_id";

interface BrandContextValue {
  selectedBrand: Brand | null;
  setSelectedBrand: (brand: Brand) => void;
  brands: Brand[];
  isLoading: boolean;
}

const BrandContext = createContext<BrandContextValue | null>(null);

export const BrandProvider = ({ children }: { children: React.ReactNode }) => {
  const { brands } = useBrands();
  const [selectedBrand, setSelectedBrandState] = useState<Brand | null>(null);

  const brandList = brands.data ?? [];
  const isLoading = brands.isLoading;

  useEffect(() => {
    if (isLoading || brandList.length === 0) return;

    const savedId = localStorage.getItem(STORAGE_KEY);
    setSelectedBrandState((prev) => {
      // Refresh data for the current brand when the list updates (e.g. generated_promise saved)
      if (prev) {
        const fresh = brandList.find((b) => b.id === prev.id);
        if (fresh) return fresh;
      }
      const saved = savedId ? brandList.find((b) => b.id === savedId) : null;
      return saved ?? brandList[0];
    });
  }, [isLoading, brandList]);

  const setSelectedBrand = (brand: Brand) => {
    setSelectedBrandState(brand);
    localStorage.setItem(STORAGE_KEY, brand.id);
  };

  return (
    <BrandContext.Provider value={{ selectedBrand, setSelectedBrand, brands: brandList, isLoading }}>
      {children}
    </BrandContext.Provider>
  );
};

export const useBrandContext = () => {
  const ctx = useContext(BrandContext);
  if (!ctx) throw new Error("useBrandContext must be used inside BrandProvider");
  return ctx;
};
