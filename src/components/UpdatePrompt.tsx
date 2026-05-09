import { useEffect, useState, useCallback } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const UpdatePrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      console.log("SW Registered:", swUrl);
      if (r) {
        setSwRegistration(r);
        r.update();
        setInterval(() => {
          r.update();
        }, 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error("SW registration error", error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      setShowPrompt(true);
      const timer = setTimeout(() => {
        handleUpdate();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [needRefresh]);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      await updateServiceWorker(true);
      window.location.reload();
    } catch (error) {
      console.error('Update failed:', error);
      window.location.reload();
    }
  };

  const handleManualCheck = useCallback(async () => {
    setIsChecking(true);
    try {
      // 1. Vider tous les caches (Workbox + browser)
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // 2. Désinscrire TOUS les service workers (reset dur en cas de chunks périmés)
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map(r => r.unregister()));
        } catch (err) {
          console.warn("SW unregister failed:", err);
        }
      }

      toast.success("Cache vidé", {
        description: "Rechargement de l'application...",
      });

      // 3. Rechargement forcé sans cache
      setTimeout(() => {
        window.location.reload();
      }, 600);
    } catch (error) {
      console.error("Manual update check failed:", error);
      window.location.reload();
    } finally {
      setIsChecking(false);
    }
  }, []);

  const handleDismiss = () => {
    setNeedRefresh(false);
    setShowPrompt(false);
  };

  return (
    <>
      {/* Floating refresh button - always visible */}
      <motion.button
        onClick={handleManualCheck}
        disabled={isChecking || isUpdating}
        className="fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-70"
        whileTap={{ scale: 0.9 }}
        title="Actualiser l'application"
      >
        <RefreshCw className={`h-5 w-5 ${isChecking ? 'animate-spin' : ''}`} />
      </motion.button>

      {/* Update available prompt */}
      <AnimatePresence>
        {showPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
          >
            <div className="bg-card border border-border rounded-xl shadow-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <RefreshCw className={`h-5 w-5 text-primary ${isUpdating ? 'animate-spin' : ''}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">
                    {isUpdating ? "Mise à jour en cours..." : "Mise à jour disponible"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isUpdating 
                      ? "L'application va se recharger automatiquement." 
                      : "Une nouvelle version est disponible. Rechargement automatique dans quelques secondes..."}
                  </p>
                  {!isUpdating && (
                    <div className="flex gap-2 mt-3">
                      <Button onClick={handleUpdate} size="sm" className="flex-1">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Actualiser maintenant
                      </Button>
                      <Button onClick={handleDismiss} variant="ghost" size="sm">
                        Plus tard
                      </Button>
                    </div>
                  )}
                </div>
                {!isUpdating && (
                  <button
                    onClick={handleDismiss}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default UpdatePrompt;
