import { WifiOff, RefreshCw, CloudOff, Check, Cloud } from "lucide-react";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

const OfflineIndicator = () => {
  const { isOnline, isSyncing, pendingCount, syncProgress } = useOfflineSync();
  const [showSynced, setShowSynced] = useState(false);
  const [wasSyncing, setWasSyncing] = useState(false);

  // Show "Synchronisé" briefly after sync completes
  useEffect(() => {
    if (isSyncing) {
      setWasSyncing(true);
    } else if (wasSyncing && pendingCount === 0) {
      setShowSynced(true);
      setWasSyncing(false);
      const timer = setTimeout(() => setShowSynced(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isSyncing, wasSyncing, pendingCount]);

  const shouldShow = !isOnline || isSyncing || pendingCount > 0 || showSynced;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50"
        >
          <div
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg backdrop-blur-md border ${
              !isOnline
                ? "bg-destructive/90 text-destructive-foreground border-destructive/50"
                : isSyncing
                ? "bg-amber-500/90 text-white border-amber-400/50"
                : showSynced
                ? "bg-emerald-500/90 text-white border-emerald-400/50"
                : "bg-muted/90 text-muted-foreground border-border"
            }`}
          >
            {!isOnline ? (
              <>
                <WifiOff className="h-4 w-4" />
                <span className="text-sm font-medium">Mode hors ligne</span>
                {pendingCount > 0 && (
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-semibold">
                    {pendingCount} en attente
                  </span>
                )}
              </>
            ) : isSyncing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm font-medium">
                  Synchronisation{syncProgress.total > 0 ? ` ${syncProgress.done}/${syncProgress.total}` : "..."}
                </span>
                {syncProgress.total > 1 && (
                  <div className="w-16 h-1.5 bg-white/30 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-white rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(syncProgress.done / syncProgress.total) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                )}
              </>
            ) : showSynced ? (
              <>
                <Check className="h-4 w-4" />
                <span className="text-sm font-medium">Tout est synchronisé</span>
              </>
            ) : pendingCount > 0 ? (
              <>
                <CloudOff className="h-4 w-4" />
                <span className="text-sm font-medium">{pendingCount} en attente</span>
              </>
            ) : null}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineIndicator;
