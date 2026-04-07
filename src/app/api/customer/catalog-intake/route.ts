import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createFormSubmissionWithWorkflow } from "@/lib/workflows/service";
import type { Json } from "@/types/database";

const CATALOG_INTAKE_FORM_CODE = "ATL-201";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        data?: Record<string, unknown>;
      }
    | null;

  if (!body?.data || typeof body.data !== "object") {
    return NextResponse.json({ error: "Katalog intake verisi zorunludur." }, { status: 400 });
  }

  const submission = await createFormSubmissionWithWorkflow({
    userId: user.id,
    formCode: CATALOG_INTAKE_FORM_CODE,
    data: body.data as Json,
  });

  return NextResponse.json(
    {
      success: true,
      submission: {
        id: submission.id,
        formCode: submission.form_code,
        status: submission.status,
      },
    },
    { status: 201 },
  );
}
