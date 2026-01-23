import { useEffect } from "react";
import { useAgency } from "@/hooks/useAgency";
import { applyBrandColors } from "@/components/settings/BrandingSettings";

export function useBrandColors() {
  const { data: agency } = useAgency();

  useEffect(() => {
    if (agency?.primary_color && agency?.accent_color && agency?.sidebar_color) {
      applyBrandColors(
        agency.primary_color,
        agency.accent_color,
        agency.sidebar_color
      );
    }
  }, [agency]);

  return agency;
}
