import { useCallback } from "react";
import { useMutation, useQueryClient, MutationFunction } from "@tanstack/react-query";
import { useOfflineSync } from "./useOfflineSync";

interface UseOfflineMutationOptions<TData, TVariables> {
  /** The Supabase table name for offline queue */
  table: string;
  /** The mutation operation type */
  operationType: "INSERT" | "UPDATE" | "DELETE";
  /** The actual mutation function (called when online) */
  mutationFn: MutationFunction<TData, TVariables>;
  /** Query keys to invalidate on success */
  invalidateKeys?: string[][];
  /** Optimistic update function */
  onOptimisticUpdate?: (variables: TVariables) => void;
  /** Called on success */
  onSuccess?: (data: TData, variables: TVariables) => void;
  /** Called on error */
  onError?: (error: Error, variables: TVariables) => void;
}

/**
 * Hook that wraps mutations with offline support.
 * When online: executes normally.
 * When offline: queues the operation for later sync.
 */
export function useOfflineMutation<TData = unknown, TVariables = unknown>({
  table,
  operationType,
  mutationFn,
  invalidateKeys = [],
  onOptimisticUpdate,
  onSuccess,
  onError,
}: UseOfflineMutationOptions<TData, TVariables>) {
  const { isOnline, addPendingOperation } = useOfflineSync();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (variables: TVariables) => {
      if (!isOnline) {
        // Queue operation for offline sync
        addPendingOperation(table, operationType, variables as Record<string, unknown>);

        // Apply optimistic update
        if (onOptimisticUpdate) {
          onOptimisticUpdate(variables);
        }

        // Return a fake result so the UI updates
        return { offline: true, data: variables } as unknown as TData;
      }

      // Online: execute normally
      return mutationFn(variables);
    },
    onSuccess: (data, variables) => {
      // Invalidate queries to refresh data
      invalidateKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      onSuccess?.(data, variables);
    },
    onError: (error: Error, variables) => {
      if (!isOnline) {
        // Already queued offline, don't show error
        return;
      }
      onError?.(error, variables);
    },
    // Critical: allow mutations to be attempted offline
    networkMode: "offlineFirst",
  });

  return mutation;
}
