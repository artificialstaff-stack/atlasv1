import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/storage/upload
 * Supabase Storage signed upload URL oluşturur.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bucket, path } = (await request.json()) as {
    bucket: string;
    path: string;
  };

  // Güvenlik: kullanıcı sadece kendi klasörüne yükleyebilir
  const safePath = `${user.id}/${path}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(safePath);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ signedUrl: data.signedUrl, path: safePath });
}
