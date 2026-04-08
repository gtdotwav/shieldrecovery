import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { verifySessionToken } from "@/server/auth/core";
import { appEnv } from "@/server/recovery/config";

function getSupabase() {
  return createClient(appEnv.supabaseUrl, appEnv.supabaseServiceRoleKey);
}

async function getSession(request: Request) {
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .find((c) => c.trim().startsWith("pagrecovery_session="));
  const token = cookie?.split("=")[1]?.trim();
  return verifySessionToken(token);
}

export async function GET(request: Request) {
  const session = await getSession(request);
  if (!session || (session.role !== "admin" && session.role !== "market")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabase();
  const { data, error } = await db
    .from("marketing_scenarios")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[marketing/scenarios] GET error:", error.message);
    return NextResponse.json({ error: "Failed to load scenarios" }, { status: 500 });
  }

  return NextResponse.json({ scenarios: data });
}

export async function POST(request: Request) {
  const session = await getSession(request);
  if (!session || (session.role !== "admin" && session.role !== "market")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const db = getSupabase();

  // If setting as active, deactivate all others first
  if (body.is_active) {
    await db
      .from("marketing_scenarios")
      .update({ is_active: false })
      .eq("is_active", true);
  }

  const { data, error } = await db
    .from("marketing_scenarios")
    .insert({
      name: body.name || "Novo cenario",
      description: body.description || "",
      is_active: body.is_active ?? false,
      chart_data: body.chart_data || [],
      total_recovered: body.total_recovered || 0,
      total_revenue: body.total_revenue || 0,
      recovery_rate: body.recovery_rate || 0,
      avg_recovery_time_hours: body.avg_recovery_time_hours || 0,
      active_recoveries: body.active_recoveries || 0,
      highlights: body.highlights || [],
      channels: body.channels || {},
      strategy_notes: body.strategy_notes || "",
      audience_segments: body.audience_segments || [],
      created_by_email: session.email,
    })
    .select()
    .single();

  if (error) {
    console.error("[marketing/scenarios] POST error:", error.message);
    return NextResponse.json({ error: "Failed to save scenario" }, { status: 500 });
  }

  return NextResponse.json({ scenario: data });
}

export async function PUT(request: Request) {
  const session = await getSession(request);
  if (!session || (session.role !== "admin" && session.role !== "market")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  if (!body.id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const db = getSupabase();

  // If setting as active, deactivate all others first
  if (body.is_active) {
    await db
      .from("marketing_scenarios")
      .update({ is_active: false })
      .eq("is_active", true);
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) update.name = body.name;
  if (body.description !== undefined) update.description = body.description;
  if (body.is_active !== undefined) update.is_active = body.is_active;
  if (body.chart_data !== undefined) update.chart_data = body.chart_data;
  if (body.total_recovered !== undefined) update.total_recovered = body.total_recovered;
  if (body.total_revenue !== undefined) update.total_revenue = body.total_revenue;
  if (body.recovery_rate !== undefined) update.recovery_rate = body.recovery_rate;
  if (body.avg_recovery_time_hours !== undefined) update.avg_recovery_time_hours = body.avg_recovery_time_hours;
  if (body.active_recoveries !== undefined) update.active_recoveries = body.active_recoveries;
  if (body.highlights !== undefined) update.highlights = body.highlights;
  if (body.channels !== undefined) update.channels = body.channels;
  if (body.strategy_notes !== undefined) update.strategy_notes = body.strategy_notes;
  if (body.audience_segments !== undefined) update.audience_segments = body.audience_segments;

  const { data, error } = await db
    .from("marketing_scenarios")
    .update(update)
    .eq("id", body.id)
    .select()
    .single();

  if (error) {
    console.error("[marketing/scenarios] PUT error:", error.message);
    return NextResponse.json({ error: "Failed to save scenario" }, { status: 500 });
  }

  return NextResponse.json({ scenario: data });
}

export async function DELETE(request: Request) {
  const session = await getSession(request);
  if (!session || (session.role !== "admin" && session.role !== "market")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const db = getSupabase();
  const { error } = await db.from("marketing_scenarios").delete().eq("id", id);

  if (error) {
    console.error("[marketing/scenarios] DELETE error:", error.message);
    return NextResponse.json({ error: "Failed to delete scenario" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
