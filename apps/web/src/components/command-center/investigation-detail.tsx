"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@Sentinel360/ui/lib/utils";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { supabase } from "@/lib/supabase";
import CommandCenterShell, {
  MaterialIcon,
  headlineStyle,
} from "./command-center-shell";

type InvestigationDetailProps = {
  agentName: string;
  caseId: string;
};

type CaseData = {
  id: string;
  caseNumber: string;
  caseType: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  assignedToName: string | null;
  assignedToImage: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  resolutionNotes: string | null;
};

type InvestigationNote = {
  id: string;
  noteType: string;
  content: string;
  createdByUserId: string | null;
  createdByName: string | null;
  createdAt: string;
};

type CaseEvidence = {
  id: string;
  evidenceEntityType: string;
  evidenceEntityId: string;
  relationshipDescription: string | null;
  createdAt: string;
  imageUrl: string | null;
  displayName: string | null;
};

type LinkedSuspect = {
  id: string;
  entityProfileId: string;
  displayName: string | null;
  primaryFaceImageUrl: string | null;
  watchlistStatus: string;
  status: string;
  relationshipDescription: string | null;
};

async function resolveUserId(): Promise<string | null> {
  const { data: session } = await supabase.auth.getSession();
  const authUserId = session.session?.user?.id;
  if (!authUserId) return null;
  const { data: existing } = await supabase
    .from("user")
    .select("id")
    .eq("id", authUserId)
    .single();
  return existing?.id ?? null;
}

export default function InvestigationDetail({
  agentName,
  caseId,
}: InvestigationDetailProps) {
  const resolvedAgentName = agentName.trim() || "Det. James Miller";
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    "overview" | "evidence" | "suspects" | "notes"
  >("overview");
  const [noteContent, setNoteContent] = useState("");
  const [noteType, setNoteType] = useState("GENERAL");

  const [showLinkEvidence, setShowLinkEvidence] = useState(false);
  const [linkEvidenceType, setLinkEvidenceType] = useState("media_asset");
  const [linkEvidenceId, setLinkEvidenceId] = useState("");
  const [linkEvidenceDesc, setLinkEvidenceDesc] = useState("");

  const [showLinkSuspect, setShowLinkSuspect] = useState(false);
  const [suspectSearch, setSuspectSearch] = useState("");
  const [selectedSuspectId, setSelectedSuspectId] = useState<string | null>(null);
  const [suspectRelationDesc, setSuspectRelationDesc] = useState("");

  const { data: caseData, isLoading: caseLoading } = useQuery({
    queryKey: ["investigation", caseId],
    queryFn: async () => {
      const { data: c, error } = await supabase
        .from("case")
        .select("*")
        .eq("id", caseId)
        .single();
      if (error) throw error;

      let assignedToName: string | null = null;
      let assignedToImage: string | null = null;
      let createdByName: string | null = null;

      if (c.assigned_to_user_id) {
        const { data: u } = await supabase
          .from("user")
          .select("name, image")
          .eq("id", c.assigned_to_user_id)
          .single();
        if (u) {
          assignedToName = u.name;
          assignedToImage = u.image;
        }
      }
      if (c.created_by_user_id) {
        const { data: u } = await supabase
          .from("user")
          .select("name")
          .eq("id", c.created_by_user_id)
          .single();
        if (u) createdByName = u.name;
      }

      return {
        id: c.id,
        caseNumber: c.case_number,
        caseType: c.case_type,
        title: c.title,
        description: c.description,
        priority: c.priority,
        status: c.status,
        assignedToName,
        assignedToImage,
        createdByName,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        closedAt: c.closed_at,
        resolutionNotes: c.resolution_notes,
      } satisfies CaseData;
    },
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["investigation", caseId, "notes"],
    queryFn: async () => {
      const { data: n, error } = await supabase
        .from("investigation_note")
        .select("*")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const userIds = n.map((x) => x.created_by_user_id).filter(Boolean) as string[];
      const userMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from("user")
          .select("id, name")
          .in("id", userIds);
        if (users) {
          for (const u of users) userMap.set(u.id, u.name);
        }
      }

      return n.map((x) => ({
        id: x.id,
        noteType: x.note_type,
        content: x.content,
        createdByUserId: x.created_by_user_id,
        createdByName: x.created_by_user_id
          ? userMap.get(x.created_by_user_id) ?? null
          : null,
        createdAt: x.created_at,
      })) satisfies InvestigationNote[];
    },
  });

  const { data: evidence = [] } = useQuery({
    queryKey: ["investigation", caseId, "evidence"],
    queryFn: async () => {
      const { data: e, error } = await supabase
        .from("case_evidence")
        .select("*")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      if (e.length === 0) return [];

      const mediaIds = e
        .filter((x) => x.evidence_entity_type === "media_asset")
        .map((x) => x.evidence_entity_id);
      const profileIds = e
        .filter((x) => x.evidence_entity_type === "entity_profile")
        .map((x) => x.evidence_entity_id);
      const detectionIds = e
        .filter((x) => x.evidence_entity_type === "detection")
        .map((x) => x.evidence_entity_id);

      const [mediaAssets, profiles, detections] = await Promise.all([
        mediaIds.length > 0
          ? supabase.from("media_asset").select("id, storage_url, title").in("id", mediaIds)
          : { data: [] },
        profileIds.length > 0
          ? supabase.from("entity_profile").select("id, display_name, primary_face_image_url").in("id", profileIds)
          : { data: [] },
        detectionIds.length > 0
          ? supabase.from("detection").select("id, frame_url").in("id", detectionIds)
          : { data: [] },
      ]);

      const mediaMap = new Map((mediaAssets.data ?? []).map((m) => [m.id, m]));
      const profileMap = new Map((profiles.data ?? []).map((p) => [p.id, p]));
      const detectionMap = new Map((detections.data ?? []).map((d) => [d.id, d]));

      return e.map((x) => {
        let imageUrl: string | null = null;
        let displayName: string | null = null;

        if (x.evidence_entity_type === "media_asset") {
          const m = mediaMap.get(x.evidence_entity_id);
          imageUrl = m?.storage_url ?? null;
          displayName = m?.title ?? null;
        } else if (x.evidence_entity_type === "entity_profile") {
          const p = profileMap.get(x.evidence_entity_id);
          imageUrl = p?.primary_face_image_url ?? null;
          displayName = p?.display_name ?? null;
        } else if (x.evidence_entity_type === "detection") {
          const d = detectionMap.get(x.evidence_entity_id);
          imageUrl = d?.frame_url ?? null;
        }

        return {
          id: x.id,
          evidenceEntityType: x.evidence_entity_type,
          evidenceEntityId: x.evidence_entity_id,
          relationshipDescription: x.relationship_description,
          createdAt: x.created_at,
          imageUrl,
          displayName,
        } satisfies CaseEvidence;
      });
    },
  });

  const { data: linkedSuspects = [] } = useQuery({
    queryKey: ["investigation", caseId, "suspects"],
    queryFn: async () => {
      const { data: links, error } = await supabase
        .from("case_evidence")
        .select("*")
        .eq("case_id", caseId)
        .eq("evidence_entity_type", "entity_profile");
      if (error) throw error;

      if (links.length === 0) return [];

      const profileIds = links.map((l) => l.evidence_entity_id).filter(Boolean) as string[];

      let profiles: { id: string; display_name: string | null; primary_face_image_url: string | null; watchlist_status: string; status: string }[] = [];

      if (profileIds.length > 0) {
        const { data: p, error: profileError } = await supabase
          .from("entity_profile")
          .select("id, display_name, primary_face_image_url, watchlist_status, status")
          .in("id", profileIds);
        if (profileError) throw profileError;
        profiles = p ?? [];
      }

      const profileMap = new Map(profiles.map((p) => [p.id, p]));

      return links.map((l) => {
        const profile = l.evidence_entity_id ? profileMap.get(l.evidence_entity_id) : undefined;
        return {
          id: l.id,
          entityProfileId: l.evidence_entity_id,
          displayName: profile?.display_name ?? null,
          primaryFaceImageUrl: profile?.primary_face_image_url ?? null,
          watchlistStatus: profile?.watchlist_status ?? "NONE",
          status: profile?.status ?? "UNKNOWN",
          relationshipDescription: l.relationship_description,
        } satisfies LinkedSuspect;
      });
    },
  });

  const { data: allSuspects = [] } = useQuery({
    queryKey: ["suspects", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entity_profile")
        .select("id, display_name, primary_face_image_url, watchlist_status, status")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      const userId = await resolveUserId();
      const { error } = await supabase.from("investigation_note").insert({
        case_id: caseId,
        note_type: noteType,
        content: noteContent,
        created_by_user_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNoteContent("");
      queryClient.invalidateQueries({ queryKey: ["investigation", caseId, "notes"] });
    },
  });

  const linkEvidenceMutation = useMutation({
    mutationFn: async () => {
      const userId = await resolveUserId();
      const { error } = await supabase.from("case_evidence").insert({
        case_id: caseId,
        evidence_entity_type: linkEvidenceType,
        evidence_entity_id: linkEvidenceId,
        relationship_description: linkEvidenceDesc || null,
        created_by_user_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setShowLinkEvidence(false);
      setLinkEvidenceType("media_asset");
      setLinkEvidenceId("");
      setLinkEvidenceDesc("");
      queryClient.invalidateQueries({ queryKey: ["investigation", caseId, "evidence"] });
      queryClient.invalidateQueries({ queryKey: ["investigation", caseId, "suspects"] });
    },
  });

  const linkSuspectMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSuspectId) return;
      const userId = await resolveUserId();
      const { error } = await supabase.from("case_evidence").insert({
        case_id: caseId,
        evidence_entity_type: "entity_profile",
        evidence_entity_id: selectedSuspectId,
        relationship_description: suspectRelationDesc || null,
        created_by_user_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setShowLinkSuspect(false);
      setSelectedSuspectId(null);
      setSuspectSearch("");
      setSuspectRelationDesc("");
      queryClient.invalidateQueries({ queryKey: ["investigation", caseId, "suspects"] });
      queryClient.invalidateQueries({ queryKey: ["investigation", caseId, "evidence"] });
    },
    onError: (err) => {
      console.error("Link suspect error:", err);
      alert("Failed to link suspect: " + (err instanceof Error ? err.message : String(err)));
    },
  });

  const unlinkSuspectMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase.from("case_evidence").delete().eq("id", linkId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investigation", caseId, "suspects"] });
      queryClient.invalidateQueries({ queryKey: ["investigation", caseId, "evidence"] });
    },
  });

  const unlinkEvidenceMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase.from("case_evidence").delete().eq("id", linkId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investigation", caseId, "evidence"] });
      queryClient.invalidateQueries({ queryKey: ["investigation", caseId, "suspects"] });
    },
  });

  const notLinkedSuspects = allSuspects.filter(
    (s) => !linkedSuspects.some((ls) => ls.entityProfileId === s.id),
  );
  const filteredAvailableSuspects = notLinkedSuspects.filter((s) => {
    if (!suspectSearch) return true;
    const q = suspectSearch.toLowerCase();
    return (s.display_name ?? "").toLowerCase().includes(q);
  });

  if (caseLoading) {
    return (
      <CommandCenterShell activeSidebarLabel="Investigations" activeTopNavTab="Analytics" agentName={agentName} brandIcon="search_check" profileTitle={resolvedAgentName} profileSubtitle="Level 4 Investigator" searchPlaceholder="Search...">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#051125] border-t-transparent" />
        </div>
      </CommandCenterShell>
    );
  }

  if (!caseData) {
    return (
      <CommandCenterShell activeSidebarLabel="Investigations" activeTopNavTab="Analytics" agentName={agentName} brandIcon="search_check" profileTitle={resolvedAgentName} profileSubtitle="Level 4 Investigator" searchPlaceholder="Search...">
        <div className="flex flex-col items-center justify-center py-20 text-[#45474d]">
          <MaterialIcon name="error_outline" className="mb-2 text-4xl" />
          <p className="text-sm font-medium">Case not found</p>
          <Link href="/dashboard/investigations" className="mt-4 text-xs font-bold text-[#051125] underline">
            Back to Investigations
          </Link>
        </div>
      </CommandCenterShell>
    );
  }

  const priorityColor = (p: string) => {
    switch (p) {
      case "CRITICAL": return "bg-[#ffdad6] text-[#93000a]";
      case "HIGH": return "bg-[#ffedd5] text-[#9a5b00]";
      case "MEDIUM": return "bg-[#dbeafe] text-[#1e40af]";
      default: return "bg-[#f3f4f5] text-[#45474d]";
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "OPEN": return "bg-[#dbeafe] text-[#1e40af]";
      case "CLOSED": return "bg-[#dcfce7] text-[#166534]";
      default: return "bg-[#f3f4f5] text-[#45474d]";
    }
  };

  const evidenceIcon = (type: string) => {
    switch (type) {
      case "detection": return "videocam";
      case "media_asset": return "image";
      case "incident": return "warning";
      case "entity_profile": return "person";
      default: return "inventory_2";
    }
  };

  return (
    <CommandCenterShell
      activeSidebarLabel="Investigations"
      activeTopNavTab="Analytics"
      agentName={agentName}
      brandIcon="search_check"
      profileTitle={resolvedAgentName}
      profileSubtitle="Level 4 Investigator"
      searchPlaceholder="Search case ID, evidence, suspect..."
      variant="investigation"
      contentClassName="flex h-[calc(100vh-4rem)] flex-col overflow-hidden"
    >
      <div className="flex items-end justify-between gap-6 bg-[#f8f9fa] px-0 py-2 pb-6">
        <div>
          <nav className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-[#45474d]">
            <Link href="/dashboard/investigations" className="transition-colors hover:text-[#051125]">
              Investigations
            </Link>
            <MaterialIcon name="chevron_right" className="text-[10px]" />
            <span>{caseData.caseNumber}</span>
          </nav>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#051125]" style={headlineStyle}>
            {caseData.title}
          </h2>
          <div className="mt-2 flex items-center gap-3">
            <span className={cn("inline-block rounded-full px-2.5 py-1 text-[11px] font-bold", priorityColor(caseData.priority))}>
              {caseData.priority === "CRITICAL" ? "PRIORITY: ALPHA" : `PRIORITY: ${caseData.priority}`}
            </span>
            <span className={cn("inline-block rounded-full px-2.5 py-1 text-[11px] font-bold", statusColor(caseData.status))}>
              {caseData.status}
            </span>
            <span className="text-[11px] font-medium text-[#45474d]">
              <MaterialIcon name="history" className="mr-1 text-xs" />
              Updated {formatRelative(caseData.updatedAt)}
            </span>
          </div>
        </div>
      </div>

      <div className="mb-4 flex gap-1 rounded-lg bg-[#edeeef] p-1">
        {(["overview", "evidence", "suspects", "notes"] as const).map((tab) => (
          <button
            key={tab}
            className={cn(
              "flex-1 rounded-md px-4 py-2 text-xs font-bold capitalize transition-all",
              activeTab === tab ? "bg-white text-[#051125] shadow-sm" : "text-[#45474d] hover:text-[#051125]",
            )}
            onClick={() => setActiveTab(tab)}
            type="button"
          >
            {tab === "overview" && "Overview"}
            {tab === "evidence" && `Evidence (${evidence.length})`}
            {tab === "suspects" && `Suspects (${linkedSuspects.length})`}
            {tab === "notes" && `Notes (${notes.length})`}
          </button>
        ))}
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        {activeTab === "overview" && (
          <div className="flex flex-1 gap-6 overflow-hidden">
            <div className="flex flex-1 flex-col gap-6 overflow-y-auto pr-2">
              <section className="rounded-xl bg-white p-6 shadow-sm shadow-[#051125]/5">
                <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-[#051125]" style={headlineStyle}>
                  <MaterialIcon name="description" />
                  <span>Case Details</span>
                </h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#45474d]">Case Number</p>
                    <p className="mt-1 font-mono text-xs font-semibold text-[#191c1d]">{caseData.caseNumber}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#45474d]">Case Type</p>
                    <p className="mt-1 text-xs font-semibold text-[#191c1d]">{caseData.caseType}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#45474d]">Assigned To</p>
                    <div className="mt-1 flex items-center gap-2">
                      {caseData.assignedToImage ? (
                        <img alt={caseData.assignedToName ?? ""} className="h-5 w-5 rounded-full object-cover" src={caseData.assignedToImage} />
                      ) : (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#edeeef]">
                          <MaterialIcon name="person" className="text-[10px] text-[#45474d]" />
                        </div>
                      )}
                      <span className="text-xs font-semibold text-[#191c1d]">{caseData.assignedToName ?? "Unassigned"}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#45474d]">Created By</p>
                    <p className="mt-1 text-xs font-semibold text-[#191c1d]">{caseData.createdByName ?? "Unknown"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#45474d]">Created</p>
                    <p className="mt-1 text-xs font-semibold text-[#191c1d]">{formatFullDate(caseData.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#45474d]">Last Updated</p>
                    <p className="mt-1 text-xs font-semibold text-[#191c1d]">{formatFullDate(caseData.updatedAt)}</p>
                  </div>
                </div>
                {caseData.description && (
                  <div className="mt-6 border-t border-[#c5c6cd]/20 pt-4">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#45474d]">Description</p>
                    <p className="text-xs leading-relaxed text-[#191c1d]">{caseData.description}</p>
                  </div>
                )}
                {caseData.resolutionNotes && (
                  <div className="mt-4 border-t border-[#c5c6cd]/20 pt-4">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#45474d]">Resolution Notes</p>
                    <p className="text-xs leading-relaxed text-[#191c1d]">{caseData.resolutionNotes}</p>
                  </div>
                )}
              </section>
            </div>

            <div className="flex w-80 flex-col gap-6">
              <section className="rounded-xl bg-white p-5 shadow-sm shadow-[#051125]/5">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#051125]" style={headlineStyle}>
                  <MaterialIcon name="quick_reference" />
                  <span>Quick Actions</span>
                </h3>
                <div className="space-y-2">
                  <button className="flex w-full items-center gap-2 rounded-lg border border-[#c5c6cd]/50 px-3 py-2 text-xs font-semibold text-[#051125] transition-all hover:bg-[#f3f4f5]" onClick={() => setShowLinkEvidence(true)} type="button">
                    <MaterialIcon name="link" className="text-sm" />
                    <span>Link Evidence</span>
                  </button>
                  <button className="flex w-full items-center gap-2 rounded-lg border border-[#c5c6cd]/50 px-3 py-2 text-xs font-semibold text-[#051125] transition-all hover:bg-[#f3f4f5]" onClick={() => setShowLinkSuspect(true)} type="button">
                    <MaterialIcon name="person_add" className="text-sm" />
                    <span>Link Suspect</span>
                  </button>
                  <button className="flex w-full items-center gap-2 rounded-lg border border-[#c5c6cd]/50 px-3 py-2 text-xs font-semibold text-[#051125] transition-all hover:bg-[#f3f4f5]" onClick={() => setActiveTab("notes")} type="button">
                    <MaterialIcon name="add_notes" className="text-sm" />
                    <span>Add Note</span>
                  </button>
                </div>
              </section>

              <section className="rounded-xl bg-white p-5 shadow-sm shadow-[#051125]/5">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#051125]" style={headlineStyle}>
                  <MaterialIcon name="fact_check" />
                  <span>Evidence Summary</span>
                </h3>
                <div className="space-y-3">
                  {evidence.length === 0 ? (
                    <p className="text-xs text-[#45474d]">No evidence linked</p>
                  ) : (
                    evidence.slice(0, 4).map((e) => (
                      <div key={e.id} className="flex items-center gap-3 rounded-lg border border-[#c5c6cd]/20 bg-[#f8f9fa] p-3">
                        {e.imageUrl ? (
                          <img alt="" className="h-8 w-8 rounded object-cover" src={e.imageUrl} />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded bg-[#edeeef]">
                            <MaterialIcon name={evidenceIcon(e.evidenceEntityType)} className="text-xs text-[#45474d]" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[10px] font-bold uppercase tracking-[0.1em] text-[#45474d]">{e.evidenceEntityType}</p>
                          <p className="truncate text-xs font-medium text-[#191c1d]">{e.displayName ?? e.evidenceEntityId}</p>
                        </div>
                      </div>
                    ))
                  )}
                  {evidence.length > 4 && (
                    <p className="text-[10px] font-medium text-[#45474d]">+{evidence.length - 4} more</p>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}

        {activeTab === "evidence" && (
          <div className="flex flex-1 gap-6 overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              <section className="rounded-xl bg-white p-6 shadow-sm shadow-[#051125]/5">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-base font-bold text-[#051125]" style={headlineStyle}>
                    <MaterialIcon name="perm_media" />
                    <span>Case Evidence</span>
                  </h3>
                  <button className="flex items-center gap-1.5 rounded-lg bg-[#051125] px-3 py-2 text-[10px] font-bold text-white transition-all hover:bg-[#1b263b] active:scale-95" onClick={() => setShowLinkEvidence(true)} type="button">
                    <MaterialIcon name="add" className="text-sm" />
                    <span>Link Evidence</span>
                  </button>
                </div>

                {evidence.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-[#45474d]">
                    <MaterialIcon name="inventory_2" className="mb-2 text-4xl" />
                    <p className="text-sm font-medium">No evidence linked to this case</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {evidence.map((e) => (
                      <div key={e.id} className="group relative overflow-hidden rounded-xl border border-[#c5c6cd]/20 bg-white transition-all hover:border-[#1b263b]">
                        <div className="relative aspect-video bg-[#f3f4f5]">
                          {e.imageUrl ? (
                            <img alt={e.displayName ?? ""} className="h-full w-full object-cover" src={e.imageUrl} />
                          ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center gap-2">
                              <MaterialIcon name={evidenceIcon(e.evidenceEntityType)} className="text-3xl text-[#45474d]" />
                              <span className="text-[10px] font-medium text-[#45474d]">{e.evidenceEntityType.replace(/_/g, " ")}</span>
                            </div>
                          )}
                          <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 font-mono text-[10px] text-white backdrop-blur-md">
                            {e.evidenceEntityType.replace(/_/g, " ")}
                          </span>
                          <button
                            className="absolute right-2 top-2 rounded bg-black/60 p-1.5 text-white opacity-0 backdrop-blur-md transition-opacity hover:bg-[#ba1a1a] group-hover:opacity-100"
                            onClick={() => unlinkEvidenceMutation.mutate(e.id)}
                            type="button"
                          >
                            <MaterialIcon name="delete" className="text-xs" />
                          </button>
                        </div>
                        <div className="p-3">
                          <p className="truncate text-xs font-bold text-[#051125]">{e.displayName ?? e.evidenceEntityId}</p>
                          {e.relationshipDescription && (
                            <p className="mt-0.5 text-[10px] text-[#45474d]">{e.relationshipDescription}</p>
                          )}
                          <p className="mt-1 text-[9px] text-[#45474d]">{formatRelative(e.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}

        {activeTab === "suspects" && (
          <div className="flex flex-1 gap-6 overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              <section className="rounded-xl bg-white p-6 shadow-sm shadow-[#051125]/5">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-base font-bold text-[#051125]" style={headlineStyle}>
                    <MaterialIcon name="person_search" />
                    <span>Linked Suspects</span>
                  </h3>
                  <button className="flex items-center gap-1.5 rounded-lg bg-[#051125] px-3 py-2 text-[10px] font-bold text-white transition-all hover:bg-[#1b263b] active:scale-95" onClick={() => setShowLinkSuspect(true)} type="button">
                    <MaterialIcon name="person_add" className="text-sm" />
                    <span>Link Suspect</span>
                  </button>
                </div>

                {linkedSuspects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-[#45474d]">
                    <MaterialIcon name="person_off" className="mb-2 text-4xl" />
                    <p className="text-sm font-medium">No suspects linked to this case</p>
                    <button className="mt-3 flex items-center gap-1 text-xs font-bold text-[#051125] underline" onClick={() => setShowLinkSuspect(true)} type="button">
                      <MaterialIcon name="person_add" className="text-sm" />
                      <span>Link a suspect from database</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {linkedSuspects.map((s) => (
                      <div key={s.id} className="group relative overflow-hidden rounded-xl border border-[#c5c6cd]/20 bg-[#f8f9fa] p-4 transition-all hover:border-[#1b263b]">
                        <div className="flex items-center gap-4">
                          {s.primaryFaceImageUrl ? (
                            <img alt={s.displayName ?? ""} className="h-14 w-14 rounded-lg object-cover" src={s.primaryFaceImageUrl} />
                          ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-[#edeeef]">
                              <MaterialIcon name="person" className="text-xl text-[#45474d]" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-[#051125]">
                              {s.displayName ?? (
                                <span className="font-mono text-[10px] text-[#45474d]">
                                  Profile: {s.entityProfileId.slice(0, 8)}...
                                </span>
                              )}
                            </p>
                            <span className={cn("mt-1 inline-block rounded px-1.5 py-0.5 text-[9px] font-bold", s.watchlistStatus === "WANTED" ? "bg-[#ffdad6] text-[#93000a]" : "bg-[#edeeef] text-[#45474d]")}>
                              {s.watchlistStatus}
                            </span>
                          </div>
                          <button className="absolute right-2 top-2 rounded p-1 text-[#45474d] opacity-0 transition-all hover:bg-[#ffdad6] hover:text-[#ba1a1a] group-hover:opacity-100" onClick={() => unlinkSuspectMutation.mutate(s.id)} type="button">
                            <MaterialIcon name="delete" className="text-sm" />
                          </button>
                        </div>
                        {s.relationshipDescription && (
                          <p className="mt-3 border-t border-[#c5c6cd]/20 pt-3 text-[10px] text-[#45474d]">{s.relationshipDescription}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <div className="flex w-72 flex-col gap-4">
              <Link href="/dashboard/suspect-database" className="flex items-center gap-2 rounded-xl bg-white p-4 shadow-sm shadow-[#051125]/5 transition-all hover:bg-[#f8f9fa]">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#051125]/10">
                  <MaterialIcon name="open_in_new" className="text-sm text-[#051125]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#051125]">Suspect Database</p>
                  <p className="text-[10px] text-[#45474d]">Browse all profiles</p>
                </div>
              </Link>
              <div className="rounded-xl bg-white p-4 shadow-sm shadow-[#051125]/5">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#45474d]">Available to Link</p>
                <p className="text-2xl font-extrabold text-[#051125]">{notLinkedSuspects.length}</p>
                <p className="text-[10px] text-[#45474d]">unlinked profiles</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "notes" && (
          <div className="flex flex-1 gap-6 overflow-hidden">
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto pr-2">
              <section className="rounded-xl bg-white p-6 shadow-sm shadow-[#051125]/5">
                <h3 className="mb-6 flex items-center gap-2 text-base font-bold text-[#051125]" style={headlineStyle}>
                  <MaterialIcon name="edit_note" />
                  <span>Investigation Notes</span>
                </h3>
                <div className="mb-6 space-y-3">
                  <select className="w-full rounded-lg border border-[#c5c6cd]/50 bg-white px-3 py-2 text-xs text-[#191c1d] outline-none focus:ring-2 focus:ring-[#051125]/20" value={noteType} onChange={(e) => setNoteType(e.target.value)}>
                    <option value="GENERAL">General Note</option>
                    <option value="FINDING">Finding</option>
                    <option value="INTERVIEW">Interview Record</option>
                    <option value="FORENSIC">Forensic Result</option>
                    <option value="ACTION">Action Taken</option>
                  </select>
                  <textarea className="h-24 w-full resize-none rounded-lg border border-[#c5c6cd]/50 bg-white p-3 text-xs text-[#191c1d] placeholder:text-[#45474d]/50 focus:ring-2 focus:ring-[#051125]/20" placeholder="Add a new investigation note..." value={noteContent} onChange={(e) => setNoteContent(e.target.value)} />
                  <button className="flex items-center gap-2 rounded-lg bg-[#051125] px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-[#1b263b] active:scale-95 disabled:opacity-50" disabled={!noteContent.trim() || addNoteMutation.isPending} onClick={() => addNoteMutation.mutate()} type="button">
                    <MaterialIcon name="send" className="text-sm" />
                    <span>{addNoteMutation.isPending ? "Saving..." : "Add Note"}</span>
                  </button>
                </div>
                {notes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-[#45474d]">
                    <MaterialIcon name="notes" className="mb-2 text-3xl" />
                    <p className="text-xs font-medium">No notes yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {notes.map((note) => (
                      <div key={note.id} className="rounded-lg border-l-4 border-[#1b263b] bg-[#f8f9fa] p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="rounded bg-[#edeeef] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#45474d]">{note.noteType}</span>
                          <span className="text-[9px] text-[#45474d]">{formatFullDate(note.createdAt)}{note.createdByName ? ` by ${note.createdByName}` : ""}</span>
                        </div>
                        <p className="text-xs leading-relaxed text-[#191c1d]">{note.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </div>

      {showLinkEvidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-extrabold tracking-tight text-[#051125]">Link Evidence</h2>
              <button className="rounded-lg p-2 text-[#45474d] transition-colors hover:bg-[#f3f4f5]" onClick={() => setShowLinkEvidence(false)} type="button">
                <MaterialIcon name="close" />
              </button>
            </div>
            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.15em] text-[#45474d]">Evidence Type</label>
                <select className="w-full rounded-lg border border-[#c5c6cd]/50 px-4 py-2.5 text-sm text-[#191c1d] outline-none focus:ring-2 focus:ring-[#051125]/20" value={linkEvidenceType} onChange={(e) => setLinkEvidenceType(e.target.value)}>
                  <option value="media_asset">Media Asset</option>
                  <option value="detection">Detection</option>
                  <option value="incident">Incident</option>
                  <option value="entity_profile">Entity Profile</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.15em] text-[#45474d]">Entity ID *</label>
                <input className="w-full rounded-lg border border-[#c5c6cd]/50 px-4 py-2.5 text-sm text-[#191c1d] outline-none focus:ring-2 focus:ring-[#051125]/20" placeholder="UUID or reference ID" value={linkEvidenceId} onChange={(e) => setLinkEvidenceId(e.target.value)} type="text" />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.15em] text-[#45474d]">Description (optional)</label>
                <input className="w-full rounded-lg border border-[#c5c6cd]/50 px-4 py-2.5 text-sm text-[#191c1d] outline-none focus:ring-2 focus:ring-[#051125]/20" placeholder="e.g. CCTV footage from main entrance" value={linkEvidenceDesc} onChange={(e) => setLinkEvidenceDesc(e.target.value)} type="text" />
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button className="rounded-lg border border-[#c5c6cd]/50 px-5 py-2.5 text-sm font-semibold text-[#45474d] transition-colors hover:bg-[#f3f4f5]" onClick={() => setShowLinkEvidence(false)} type="button">Cancel</button>
              <button className="rounded-lg bg-[#051125] px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#1b263b] active:scale-95 disabled:opacity-50" disabled={!linkEvidenceId.trim() || linkEvidenceMutation.isPending} onClick={() => linkEvidenceMutation.mutate()} type="button">
                {linkEvidenceMutation.isPending ? "Linking..." : "Link Evidence"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showLinkSuspect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex h-[600px] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#c5c6cd]/20 px-6 py-4">
              <h2 className="text-lg font-extrabold tracking-tight text-[#051125]">Link Suspect</h2>
              <button className="rounded-lg p-2 text-[#45474d] transition-colors hover:bg-[#f3f4f5]" onClick={() => setShowLinkSuspect(false)} type="button">
                <MaterialIcon name="close" />
              </button>
            </div>

            <div className="border-b border-[#c5c6cd]/20 px-6 py-3">
              <div className="relative">
                <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#45474d]" />
                <input className="w-full rounded-lg border border-[#c5c6cd]/50 bg-[#f8f9fa] py-2 pl-9 pr-4 text-xs text-[#191c1d] outline-none focus:ring-2 focus:ring-[#051125]/20" placeholder="Search suspects..." value={suspectSearch} onChange={(e) => setSuspectSearch(e.target.value)} type="text" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {filteredAvailableSuspects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-[#45474d]">
                  <MaterialIcon name="person_off" className="mb-2 text-3xl" />
                  <p className="text-xs font-medium">No suspects available</p>
                  <p className="mt-1 text-[10px]">Create profiles in the Suspect Database first</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAvailableSuspects.map((s) => (
                    <button key={s.id} className={cn("flex w-full items-center gap-4 rounded-xl border p-3 text-left transition-all", selectedSuspectId === s.id ? "border-[#1b263b] bg-[#f3f4f5]" : "border-transparent hover:bg-[#f8f9fa]")} onClick={() => setSelectedSuspectId(selectedSuspectId === s.id ? null : s.id)} type="button">
                      {s.primary_face_image_url ? (
                        <img alt={s.display_name ?? ""} className="h-10 w-10 rounded-lg object-cover" src={s.primary_face_image_url} />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#edeeef]">
                          <MaterialIcon name="person" className="text-sm text-[#45474d]" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-[#051125]">{s.display_name ?? "Unknown"}</p>
                        <p className="text-[10px] text-[#45474d]">{s.watchlist_status} · {s.status}</p>
                      </div>
                      {selectedSuspectId === s.id && (
                        <MaterialIcon name="check_circle" className="text-sm text-[#1b263b]" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedSuspectId && (
              <div className="border-t border-[#c5c6cd]/20 px-6 py-4">
                <input className="mb-3 w-full rounded-lg border border-[#c5c6cd]/50 px-4 py-2 text-xs text-[#191c1d] outline-none focus:ring-2 focus:ring-[#051125]/20" placeholder="Relationship description (optional)" value={suspectRelationDesc} onChange={(e) => setSuspectRelationDesc(e.target.value)} type="text" />
                <button className="w-full rounded-lg bg-[#051125] px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#1b263b] active:scale-95 disabled:opacity-50" disabled={linkSuspectMutation.isPending} onClick={() => linkSuspectMutation.mutate()} type="button">
                  {linkSuspectMutation.isPending ? "Linking..." : "Link Suspect to Case"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </CommandCenterShell>
  );
}

function formatRelative(date: string | null): string {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatFullDate(date: string | null): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
