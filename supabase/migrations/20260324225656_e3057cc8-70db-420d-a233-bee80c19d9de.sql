-- Clean up duplicate ilots from multiple DXF imports
-- Keep the first ILOTS and LOTS, soft-delete the rest
UPDATE ilots SET deleted_at = now() 
WHERE id IN ('35bc5a8d-462e-4bf8-a296-3b0f9a558d84', 'ef7ef789-0e26-4f34-940d-544a0d0d58ba', 'cafc92f5-4086-4e60-b1d0-536eaf69c370', 'd643fe92-3d51-4333-82d6-37fc1e017adb')