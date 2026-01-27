import { useState, useEffect } from "react";
import { X, Download, Share, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { cn } from "@/lib/utils";

const BANNER_DISMISSED_KEY = "pwa-banner-dismissed";
const BANNER_DELAY_MS = 3000; // Show after 3 seconds

export function PWAInstallBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const { canInstall, isIOS, promptInstall } = usePWAInstall();

  useEffect(() => {
    // Check if already dismissed
    const isDismissed = localStorage.getItem(BANNER_DISMISSED_KEY);
    if (isDismissed) return;

    // Only show on mobile devices
    const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    if (!isMobile) return;

    // Show banner after delay if installation is available
    const timer = setTimeout(() => {
      if (canInstall) {
        setIsVisible(true);
      }
    }, BANNER_DELAY_MS);

    return () => clearTimeout(timer);
  }, [canInstall]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      localStorage.setItem(BANNER_DISMISSED_KEY, "true");
    }, 300);
  };

  const handleInstall = async () => {
    if (isIOS) {
      // For iOS, we can't trigger install, so just dismiss and let them know
      handleDismiss();
    } else {
      const installed = await promptInstall();
      if (installed) {
        handleDismiss();
      }
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-r from-navy via-navy-dark to-navy border-t border-emerald/30 shadow-lg transition-all duration-300",
        isExiting ? "translate-y-full opacity-0" : "translate-y-0 opacity-100",
        "animate-[slide-up_0.3s_ease-out]"
      )}
      style={{
        paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div className="flex items-start gap-3 max-w-lg mx-auto">
        {/* App Icon */}
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-emerald to-emerald-dark flex items-center justify-center shadow-md">
          <Download className="w-6 h-6 text-white" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-base font-semibold text-white">
            Installer ImmoPrestige
          </h3>
          {isIOS ? (
            <p className="text-xs text-white/70 mt-0.5 flex items-center gap-1 flex-wrap">
              Appuyez sur <Share className="w-3.5 h-3.5 inline" /> puis{" "}
              <span className="inline-flex items-center gap-0.5">
                <Plus className="w-3 h-3" /> "Sur l'écran d'accueil"
              </span>
            </p>
          ) : (
            <p className="text-xs text-white/70 mt-0.5">
              Accédez rapidement à votre gestion immobilière
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {!isIOS && (
            <Button
              size="sm"
              onClick={handleInstall}
              className="bg-emerald hover:bg-emerald-dark text-white text-xs px-3 h-8"
            >
              Installer
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="text-white/60 hover:text-white hover:bg-white/10 h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
