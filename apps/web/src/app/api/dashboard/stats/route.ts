import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createAdminClient();

  const [
    { count: totalCases },
    { count: activeCases },
    { count: activeAlerts },
    { count: totalEvidence },
    { count: criticalIncidents },
    { count: totalUsers },
    { count: totalSightings },
    { count: lowSeverity },
    { count: mediumSeverity },
    { count: highSeverity },
    { count: criticalSeverity },
    { data: recentCases },
  ] = await Promise.all([
    adminClient.from("case").select("*", { count: "exact", head: true }),
    adminClient.from("case").select("*", { count: "exact", head: true }).eq("status", "OPEN"),
    adminClient.from("alert").select("*", { count: "exact", head: true }).eq("status", "ACTIVE"),
    adminClient.from("case_evidence").select("*", { count: "exact", head: true }),
    adminClient.from("incident").select("*", { count: "exact", head: true }).eq("severity", "CRITICAL").neq("status", "CLOSED"),
    adminClient.from("user").select("*", { count: "exact", head: true }),
    adminClient.from("sighting").select("*", { count: "exact", head: true }),
    adminClient.from("incident").select("*", { count: "exact", head: true }).eq("severity", "LOW"),
    adminClient.from("incident").select("*", { count: "exact", head: true }).eq("severity", "MEDIUM"),
    adminClient.from("incident").select("*", { count: "exact", head: true }).eq("severity", "HIGH"),
    adminClient.from("incident").select("*", { count: "exact", head: true }).eq("severity", "CRITICAL"),
    adminClient.from("case").select("id, case_number, title, priority, status, updated_at").order("updated_at", { ascending: false }).limit(5),
  ]);

  return NextResponse.json({
    stats: {
      activeCases: activeCases ?? 0,
      pendingAlerts: activeAlerts ?? 0,
      openEvidence: totalEvidence ?? 0,
      criticalThreats: criticalIncidents ?? 0,
      totalCases: totalCases ?? 0,
      totalUsers: totalUsers ?? 0,
      totalSightings: totalSightings ?? 0,
    },
    severityDistribution: {
      LOW: lowSeverity ?? 0,
      MEDIUM: mediumSeverity ?? 0,
      HIGH: highSeverity ?? 0,
      CRITICAL: criticalSeverity ?? 0,
    },
    recentCases: recentCases ?? [],
  });
}
