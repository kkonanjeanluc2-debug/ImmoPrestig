import { WifiOff, RefreshCw, CloudOff, Check } from "lucide-react";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { motion, AnimatePresence } from "framer-motion";

const OfflineIndicator = () => {
  const { isOnline, isSyncing, pendingCount } = useOfflineSync();

  return (
    <AnimatePresence>
      {(!isOnline || isSyncing || pendingCount > 0) && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50"
        >
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg backdrop-blur-sm ${
              !isOnline
                ? "bg-destructive/90 text-destructive-foreground"
                : isSyncing
                ? "bg-amber-500/90 text-white"
                : "bg-emerald/90 text-white"
            }`}
          >
            {!isOnline ? (
              <>
                <WifiOff className="h-4 w-4" />
                <span className="text-sm font-medium">Hors ligne</span>
                {pendingCount > 0 && (
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                    {pendingCount} en attente
                  </span>
                )}
              </>
            ) : isSyncing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm font-medium">Synchronisation...</span>
              </>
            ) : pendingCount > 0 ? (
              <>
                <CloudOff className="h-4 w-4" />
                <span className="text-sm font-medium">{pendingCount} en attente</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span className="text-sm font-medium">Synchronisé</span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineIndicator;
