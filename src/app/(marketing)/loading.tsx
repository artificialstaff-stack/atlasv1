import { Skeleton } from "@/components/ui/skeleton";

export default function MarketingLoading() {
  return (
    <div className="container mx-auto px-4 py-20 space-y-8 animate-pulse">
      {/* Hero skeleton */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <Skeleton className="h-6 w-40 mx-auto rounded-full" />
        <Skeleton className="h-12 w-full max-w-xl mx-auto" />
        <Skeleton className="h-5 w-full max-w-md mx-auto" />
      </div>
      {/* Content skeleton */}
      <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto pt-12">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-6 space-y-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
