/**
 * ─── Atlas Platform — Role Management API ───
 * Admin endpoints for managing user roles.
 * Only super_admin can change roles.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { USER_ROLE, type UserRole } from "@/types/enums";

const VALID_ROLES = Object.values(USER_ROLE);

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin access
    const role = (user.app_metadata?.user_role as UserRole) || "customer";
    if (role !== "super_admin" && role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("user_roles")
      .select(
        `
        id,
        user_id,
        role,
        is_active,
        created_at,
        users!inner(email, first_name, last_name, company_name)
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ roles: data });
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only super_admin can change roles
    const callerRole = (user.app_metadata?.user_role as UserRole) || "customer";
    if (callerRole !== "super_admin") {
      return NextResponse.json(
        { error: "Only super_admin can manage roles" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, newRole } = body as {
      userId?: string;
      newRole?: string;
    };

    if (!userId || !newRole) {
      return NextResponse.json(
        { error: "userId and newRole are required" },
        { status: 400 }
      );
    }

    if (!VALID_ROLES.includes(newRole as UserRole)) {
      return NextResponse.json(
        { error: `Invalid role. Valid roles: ${VALID_ROLES.join(", ")}` },
        { status: 400 }
      );
    }

    // Prevent self-demotion
    if (userId === user.id) {
      return NextResponse.json(
        { error: "Cannot change your own role" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from("user_roles")
      .update({ role: newRole })
      .eq("user_id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, userId, newRole });
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
