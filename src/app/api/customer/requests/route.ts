import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCustomerRequest, getCustomerRequestThreads } from "@/lib/customer-workspace";
import type { CustomerWorkstreamKey } from "@/lib/customer-workspace";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const threads = await getCustomerRequestThreads(user.id);
  return NextResponse.json({ threads });
}

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
        subject?: string;
        message?: string;
        workstreamKey?: CustomerWorkstreamKey | null;
      }
    | null;

  const subject = body?.subject?.trim();
  const message = body?.message?.trim();
  if (!subject || !message) {
    return NextResponse.json({ error: "subject ve message zorunludur." }, { status: 400 });
  }

  const result = await createCustomerRequest({
    userId: user.id,
    subject,
    message,
    workstreamKey: body?.workstreamKey ?? null,
  });

  return NextResponse.json({ success: true, ...result }, { status: 201 });
}
