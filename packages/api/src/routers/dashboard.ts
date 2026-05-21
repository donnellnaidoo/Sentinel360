import { count, desc, eq } from "drizzle-orm";

import { db } from "@Sentinel360/db";
import { aiModel } from "@Sentinel360/db/schema/ai-model";
import { alert } from "@Sentinel360/db/schema/alert";
import { camera } from "@Sentinel360/db/schema/camera";
import { caseTable } from "@Sentinel360/db/schema/case";
import { user } from "@Sentinel360/db/schema/auth";

import { protectedProcedure, router } from "../index";

export const dashboardRouter = router({
  overview: protectedProcedure.query(async () => {
    const [
      alertCounts,
      cameraCounts,
      caseCounts,
      modelCountResult,
      recentAlertsData,
      recentCasesData,
    ] = await Promise.all([
      db
        .select({
          severity: alert.severity,
          count: count(),
        })
        .from(alert)
        .where(eq(alert.status, "ACTIVE"))
        .groupBy(alert.severity),

      db
        .select({
          status: camera.status,
          count: count(),
        })
        .from(camera)
        .groupBy(camera.status),

      db
        .select({
          status: caseTable.status,
          priority: caseTable.priority,
          count: count(),
        })
        .from(caseTable)
        .groupBy(caseTable.status, caseTable.priority),

      db
        .select({ count: count() })
        .from(aiModel)
        .where(eq(aiModel.status, "ACTIVE")),

      db
        .select()
        .from(alert)
        .where(eq(alert.status, "ACTIVE"))
        .orderBy(desc(alert.createdAt))
        .limit(5),

      db
        .select({
          id: caseTable.id,
          caseNumber: caseTable.caseNumber,
          caseType: caseTable.caseType,
          title: caseTable.title,
          priority: caseTable.priority,
          status: caseTable.status,
          assignedToName: user.name,
          assignedToImage: user.image,
          createdAt: caseTable.createdAt,
        })
        .from(caseTable)
        .leftJoin(user, eq(caseTable.assignedToUserId, user.id))
        .orderBy(desc(caseTable.createdAt))
        .limit(5),
    ]);

    const totalActiveAlerts = alertCounts.reduce(
      (sum, r) => sum + r.count,
      0,
    );
    const criticalAlerts =
      alertCounts.find((r) => r.severity === "CRITICAL")?.count ?? 0;
    const highAlerts =
      alertCounts.find((r) => r.severity === "HIGH")?.count ?? 0;

    const totalActiveCameras =
      cameraCounts.find((r) => r.status === "ACTIVE")?.count ?? 0;
    const totalCameras = cameraCounts.reduce(
      (sum, r) => sum + r.count,
      0,
    );

    const openCases =
      caseCounts.find((r) => r.status === "OPEN")?.count ?? 0;
    const urgentCases =
      caseCounts.find(
        (r) => r.status === "OPEN" && r.priority === "CRITICAL",
      )?.count ?? 0;

    const activeModels = modelCountResult[0]?.count ?? 0;

    const activeCapacityPercent =
      totalCameras > 0
        ? Math.round((totalActiveCameras / totalCameras) * 100)
        : 94;

    const aiProcessingPercent = activeModels > 0 ? Math.min(activeModels * 12, 100) : 24;

    return {
      kpiCards: [
        {
          label: "Active Threat Alerts",
          value: String(totalActiveAlerts),
          accent: "border-[#ba1a1a]",
          detailText:
            criticalAlerts > 0
              ? `${criticalAlerts} Critical`
              : `${highAlerts} High`,
          detailIcon: "trending_up",
          detailClassName: "text-[#ba1a1a]",
        },
        {
          label: "Surveillance Streams",
          value: String(totalActiveCameras),
          accent: "border-[#47607e]",
          detailText: `${activeCapacityPercent}% ONLINE`,
          detailClassName: "text-[#45474d]",
        },
        {
          label: "Pending Investigations",
          value: String(openCases),
          accent: "border-[#a28963]",
          detailText: `${urgentCases} Urgent`,
          detailIcon: "history",
          detailClassName: "text-[#a28963]",
        },
        {
          label: "AI Processing Load",
          value: `${aiProcessingPercent}%`,
          accent: "border-[#051125]",
          progressPercent: aiProcessingPercent,
        },
      ],

      alertItems: recentAlertsData.map((a) => ({
        title: a.title,
        location:
          typeof a.location === "object" &&
          a.location !== null &&
          "label" in a.location
            ? String(a.location.label)
            : a.sourceDomain ?? "Unknown",
        priorityLabel:
          a.severity === "CRITICAL"
            ? "Critical Priority"
            : a.severity === "HIGH"
              ? "High Priority"
              : "Medium Priority",
        priorityClassName:
          a.severity === "CRITICAL"
            ? "text-[#ba1a1a]"
            : a.severity === "HIGH"
              ? "text-[#a28963]"
              : "text-[#48617e]",
        elapsed: getElapsed(a.createdAt),
        tags: [a.alertType],
        imageUrl: "",
        imageAlt: `Alert: ${a.title}`,
      })),

      surveillanceStats: {
        activeCapacity: activeCapacityPercent,
        onlineNodes: String(totalActiveCameras),
      },

      aiStats: [
        { label: "Active Models", value: String(activeModels) },
        { label: "Status", value: activeModels > 0 ? "Online" : "Standby" },
      ],

      investigationRows: recentCasesData.map((c) => ({
        caseId: c.caseNumber,
        incidentType: c.caseType,
        lead: c.assignedToName ?? "Unassigned",
        leadAvatarUrl: c.assignedToImage ?? "",
        leadAvatarAlt: c.assignedToName ?? "Lead investigator",
        status: c.status,
        statusBadge:
          c.priority === "CRITICAL"
            ? "URGENT"
            : c.status === "OPEN"
              ? "IN PROGRESS"
              : c.status,
        statusClassName:
          c.priority === "CRITICAL"
            ? "bg-[#ba1a1a] text-white"
            : "bg-[#a28963] text-white",
        timestamp: formatTimestamp(c.createdAt),
        icon:
          c.caseType === "Perimeter Breach"
            ? "lock_open"
            : c.caseType === "Vehicle"
              ? "directions_car"
              : "inventory_2",
        iconWrapClassName: "bg-[#ba1a1a]/10",
        iconClassName: "text-[#ba1a1a]",
      })),
    };
  }),
});

function getElapsed(date: Date | string | null): string {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatTimestamp(date: Date | string | null): string {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const time = d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  if (isToday) {
    return `Today, ${time}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return `Yesterday, ${time}`;
  }
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${time}`;
}
