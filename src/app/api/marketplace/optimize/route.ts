import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { optimizeListing, optimizeForMultipleMarketplaces, type Marketplace, type ProductInfo } from "@/lib/ai/marketplace";

/**
 * POST /api/marketplace/optimize — Ürün listesi optimizasyonu
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { product, marketplace, marketplaces } = body as {
    product: ProductInfo;
    marketplace?: Marketplace;
    marketplaces?: Marketplace[];
  };

  if (!product || !product.name) {
    return NextResponse.json(
      { error: "product with name is required" },
      { status: 400 }
    );
  }

  try {
    if (marketplaces && marketplaces.length > 0) {
      const results = await optimizeForMultipleMarketplaces(product, marketplaces);
      return NextResponse.json({ optimizations: results });
    }

    if (marketplace) {
      const result = await optimizeListing(product, marketplace);
      return NextResponse.json({ optimization: result });
    }

    return NextResponse.json(
      { error: "marketplace or marketplaces[] required" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[marketplace-optimize] Error:", error);
    return NextResponse.json(
      { error: "Optimization failed" },
      { status: 500 }
    );
  }
}
