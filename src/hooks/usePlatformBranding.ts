import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import defaultLogo from "@/assets/immoprestige-logo.png";

export function usePlatformBranding() {
  const { data: settings, isLoading } = usePlatformSettings();

  const logoUrl = settings?.find(s => s.key === "app_logo_url")?.value || null;
  const appName = settings?.find(s => s.key === "app_name")?.value || "ImmoPrestige";

  return {
    logoUrl: logoUrl || defaultLogo,
    appName,
    isLoading,
    hasCustomLogo: !!logoUrl,
  };
}
