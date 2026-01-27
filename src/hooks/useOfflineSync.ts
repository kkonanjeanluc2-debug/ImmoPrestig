import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PendingOperation {
  id: string;
  table: string;
  operation: "INSERT" | "UPDATE" | "DELETE";
  data: Record<string, unknown>;
  timestamp: number;
}

const PENDING_OPS_KEY = "immoprestige_pending_operations";

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const { toast } = useToast();

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
      };
      ops.push(newOp);
      savePendingOperations(ops);
      return newOp.id;
    },
    [getPendingOperations, savePendingOperations]
  );

  // Sync pending operations when back online
  const syncPendingOperations = useCallback(async () => {
    const ops = getPendingOperations();
    if (ops.length === 0) return;

    setIsSyncing(true);
    const successfulIds: string[] = [];
    const failedOps: PendingOperation[] = [];

    const session = await supabase.auth.getSession();
    const accessToken = session.data.session?.access_token;

    for (const op of ops) {
      try {
        const method = op.operation === 'DELETE' ? 'DELETE' : op.operation === 'UPDATE' ? 'PATCH' : 'POST';
        const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/${op.table}`);
        
        if (op.operation === 'UPDATE' || op.operation === 'DELETE') {
          url.searchParams.set('id', `eq.${op.data.id}`);
        }

        const response = await fetch(url.toString(), {
          method,
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Prefer': 'return=minimal'
          },
          body: op.operation !== 'DELETE' ? JSON.stringify(op.data) : undefined
        });

        if (response.ok || response.status === 201 || response.status === 204) {
          successfulIds.push(op.id);
        } else {
          console.error(`Failed to sync operation ${op.id}:`, await response.text());
          failedOps.push(op);
        }
      } catch (error) {
        console.error(`Failed to sync operation ${op.id}:`, error);
        failedOps.push(op);
      }
    }

    // Keep only failed operations
    savePendingOperations(failedOps);
    setIsSyncing(false);

    if (successfulIds.length > 0) {
      toast({
        title: "Synchronisation réussie",
        description: `${successfulIds.length} opération(s) synchronisée(s)`,
      });
    }

    if (failedOps.length > 0) {
      toast({
        title: "Erreur de synchronisation",
        description: `${failedOps.length} opération(s) en attente`,
        variant: "destructive",
      });
    }
  }, [getPendingOperations, savePendingOperations, toast]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Connexion rétablie",
        description: "Synchronisation des données en cours...",
      });
      syncPendingOperations();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Hors ligne",
        description: "Les modifications seront synchronisées à la reconnexion",
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

  return {
    isOnline,
    isSyncing,
    pendingCount,
    addPendingOperation,
    syncPendingOperations,
  };
};
