import { KPICardsSkeleton, PageSkeleton } from "@/components/shared/loading-skeleton";

export default function ClientLoading() {
  return (
    <div className="space-y-6">
      <KPICardsSkeleton count={3} />
      <PageSkeleton />
    </div>
  );
}
