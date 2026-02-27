import { Skeleton } from "@/components/ui/skeleton";

/** Full-page skeleton loader for perceived instant loading */
const PageSkeleton = () => (
  <div className="min-h-screen bg-background p-6 space-y-6 animate-in fade-in duration-200">
    {/* Header skeleton */}
    <div className="flex items-center justify-between">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-32 rounded-md" />
    </div>
    {/* Stats row */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </div>
    {/* Content skeleton */}
    <Skeleton className="h-10 w-full max-w-md rounded-md" />
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-16 rounded-lg" />
      ))}
    </div>
  </div>
);

export default PageSkeleton;
