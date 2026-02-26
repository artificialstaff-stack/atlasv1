import { KPICardsSkeleton, PageSkeleton } from "@/components/shared/loading-skeleton";

export default function AdminLoading() {
  return (
    <div className="space-y-6">
      <KPICardsSkeleton count={4} />
      <PageSkeleton />
    </div>
  );
}
