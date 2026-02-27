import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { OrderDetailContent } from "./_components/order-detail-content";
import { PageSkeleton } from "@/components/shared/loading-skeleton";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sipariş Detayı",
};

async function OrderDetailData({ orderId }: { orderId: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .single();

  if (!order) notFound();

  // İlgili ürünleri order_items üzerinden çek
  const { data: orderItems } = await supabase
    .from("order_items")
    .select("product_id, quantity, unit_price")
    .eq("order_id", orderId)
    .limit(1);

  let product = null;
  if (orderItems && orderItems.length > 0) {
    const { data } = await supabase
      .from("products")
      .select("id, name, sku")
      .eq("id", orderItems[0].product_id)
      .single();
    product = data ? { ...data, title: data.name } : null;
  }

  return <OrderDetailContent order={order} product={product} />;
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<PageSkeleton />}>
      <OrderDetailData orderId={id} />
    </Suspense>
  );
}
