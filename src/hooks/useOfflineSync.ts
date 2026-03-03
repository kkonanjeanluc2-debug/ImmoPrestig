import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PendingOperation {
  id: string;
  table: string;
  operation: "INSERT" | "UPDATE" | "DELETE";
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
}

const PENDING_OPS_KEY = "immoprestige_pending_operations";
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncProgress, setSyncProgress] = useState({ done: 0, total: 0 });
  const { toast } = useToast();
  const syncingRef = useRef(false);

  // Get pending operations from localStorage
  const getPendingOperations = useCallback((): PendingOperation[] => {
    try {
      const stored = localStorage.getItem(PENDING_OPS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  // Save pending operations to localStorage
  const savePendingOperations = useCallback((ops: PendingOperation[]) => {
    localStorage.setItem(PENDING_OPS_KEY, JSON.stringify(ops));
    setPendingCount(ops.length);
  }, []);

  // Add a pending operation
  const addPendingOperation = useCallback(
    (table: string, operation: PendingOperation["operation"], data: Record<string, unknown>) => {
      const ops = getPendingOperations();
      const newOp: PendingOperation = {
        id: crypto.randomUUID(),
        table,
        operation,
        data,
        timestamp: Date.now(),
        retryCount: 0,
      };
      ops.push(newOp);
      savePendingOperations(ops);

      toast({
        title: "Opération mise en file d'attente",
        description: "Elle sera synchronisée dès le retour de la connexion.",
      });

      return newOp.id;
    },
    [getPendingOperations, savePendingOperations, toast]
  );

  // Execute a single sync operation
  const executeSyncOperation = useCallback(async (op: PendingOperation, accessToken: string | undefined): Promise<boolean> => {
    try {
      const method = op.operation === 'DELETE' ? 'DELETE' : op.operation === 'UPDATE' ? 'PATCH' : 'POST';
      const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/${op.table}`);
      
      if (op.operation === 'UPDATE' || op.operation === 'DELETE') {
        if (op.data.id) {
          url.searchParams.set('id', `eq.${op.data.id}`);
        }
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        'Prefer': 'return=minimal',
      };

      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(url.toString(), {
        method,
        headers,
        body: op.operation !== 'DELETE' ? JSON.stringify(op.data) : undefined,
      });

      return response.ok || response.status === 201 || response.status === 204;
    } catch {
      return false;
    }
  }, []);

  // Sync pending operations when back online
  const syncPendingOperations = useCallback(async () => {
    if (syncingRef.current) return;
    
    const ops = getPendingOperations();
    if (ops.length === 0) return;

    syncingRef.current = true;
    setIsSyncing(true);
    setSyncProgress({ done: 0, total: ops.length });

    const session = await supabase.auth.getSession();
    const accessToken = session.data.session?.access_token;

    const successfulIds: string[] = [];
    const failedOps: PendingOperation[] = [];

    // Sort by timestamp to maintain order
    const sortedOps = [...ops].sort((a, b) => a.timestamp - b.timestamp);

    for (let i = 0; i < sortedOps.length; i++) {
      const op = sortedOps[i];
      const success = await executeSyncOperation(op, accessToken);

      if (success) {
        successfulIds.push(op.id);
      } else {
        const updatedOp = { ...op, retryCount: (op.retryCount || 0) + 1 };
        if (updatedOp.retryCount < MAX_RETRIES) {
          failedOps.push(updatedOp);
        }
        // If max retries exceeded, drop the operation silently
      }

      setSyncProgress({ done: i + 1, total: sortedOps.length });

      // Small delay between operations to avoid overwhelming the server
      if (i < sortedOps.length - 1) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    // Keep only failed operations
    savePendingOperations(failedOps);
    syncingRef.current = false;
    setIsSyncing(false);
    setSyncProgress({ done: 0, total: 0 });

    if (successfulIds.length > 0) {
      toast({
        title: "Synchronisation réussie",
        description: `${successfulIds.length} opération(s) synchronisée(s)`,
      });
    }

    if (failedOps.length > 0) {
      toast({
        title: "Synchronisation partielle",
        description: `${failedOps.length} opération(s) en attente de réessai`,
        variant: "destructive",
      });

      // Retry failed operations after a delay
      setTimeout(() => {
        if (navigator.onLine) {
          syncPendingOperations();
        }
      }, RETRY_DELAY_MS);
    }
  }, [getPendingOperations, savePendingOperations, executeSyncOperation, toast]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      const pending = getPendingOperations();
      if (pending.length > 0) {
        toast({
          title: "Connexion rétablie",
          description: `Synchronisation de ${pending.length} opération(s)...`,
        });
        // Small delay to let the connection stabilize
        setTimeout(() => syncPendingOperations(), 1500);
      } else {
        toast({
          title: "Connexion rétablie",
          description: "Toutes les données sont à jour.",
        });
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Mode hors ligne activé",
        description: "Vos modifications seront enregistrées et synchronisées automatiquement.",
        variant: "destructive",
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initialize pending count
    setPendingCount(getPendingOperations().length);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncPendingOperations, getPendingOperations, toast]);

  // Periodic check: try to sync if online and has pending ops
  useEffect(() => {
    const interval = setInterval(() => {
      if (navigator.onLine && !syncingRef.current) {
        const ops = getPendingOperations();
        if (ops.length > 0) {
          syncPendingOperations();
        }
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [getPendingOperations, syncPendingOperations]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    syncProgress,
    addPendingOperation,
    syncPendingOperations,
  };
};
