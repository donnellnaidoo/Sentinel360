"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { queryClient, trpc } from "@/lib/trpc/client";

const PAGE_SIZE = 12;

type ModerationStatus = "PENDING" | "APPROVED" | "REJECTED" | "DUPLICATE";

const STATUS_FILTERS: Array<{ value: ModerationStatus | undefined; label: string }> = [
  { value: undefined, label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "DUPLICATE", label: "Duplicate" },
];

const MODERATION_STATUS_STYLES: Record<ModerationStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  APPROVED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
  DUPLICATE: "bg-surface-container text-on-surface-variant border-outline-variant",
};

const MODERATION_STATUS_LABELS: Record<ModerationStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  DUPLICATE: "Duplicate",
};

function moderationStatusOf(value: string): ModerationStatus {
  return value in MODERATION_STATUS_LABELS ? (value as ModerationStatus) : "PENDING";
}

type SightingLocation = {
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  [key: string]: unknown;
};

function asLocation(value: unknown): SightingLocation {
  return value && typeof value === "object" ? (value as SightingLocation) : {};
}

function asMediaIds(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return(
    <section>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
        {title}
      </h4>

      {children}
    </section>
  );
}

function DetailField({
  label,
  value,
  mono = false,
} : {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return(
    <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
        {label}
      </p>

      <p className={`break-all text-sm text-on-surface ${
        mono ? "font-mono" : ""
      }`}>

        {value}
      </p>
    </div>
  );
}

function getLocationAddress(location: SightingLocation): string {
  return typeof location.address === "string" && location.address.trim()
    ? location.address
    : "No location supplied";
}

function getLatitude(location: SightingLocation): number | null {
  return typeof location.latitude === "number" ? location.latitude : null;
}

function getLongitude(location: SightingLocation): number | null {
  return typeof location.longitude === "number" ? location.longitude : null;
}

export default function SightingsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ModerationStatus | undefined>(undefined);
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [moderationReason, setModerationReason] = useState("");

  const input = useMemo(
    () => ({
      search: search.trim() || undefined,
      moderationStatus: status,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }),
    [search, status, page],
  );

  const { data: rawData, isLoading, isError, error } = useQuery(trpc.sightings.list.queryOptions(input));

  const data = useMemo(
    () =>
      rawData && {
        total: rawData.total,
        items: rawData.items.map((item) => ({
          ...item,
          location: asLocation(item.location),
          mediaIds: asMediaIds(item.mediaIds),
          moderationStatus: moderationStatusOf(item.moderationStatus),
        })),
      },
    [rawData],
  );

  const selected = data?.items.find((item) => item.id === selectedId) ?? null;

  const closeDetails = () => {
    setSelectedId(null);
    setModerationReason("");
  };

  const verifySighting = useMutation(trpc.sightings.verify.mutationOptions());
  const createModerationAlerts = useMutation(
    trpc.alerts.createForSightingModeration.mutationOptions(),
  );

  // Moderation goes through the API so it is permission-checked
  // (sightings:moderate) and written to the audit log; the reporter and
  // community alerts are created afterwards.
  const moderationMutation = useMutation({
    mutationFn: async (args: {
      sightingId: string;
      authorId: string | null;
      decision: "APPROVED" | "REJECTED";
      reason: string;
      location: SightingLocation;
    }) => {
      const reason = args.reason.trim() || undefined;

      await verifySighting.mutateAsync({
        id: args.sightingId,
        decision: args.decision,
        notes: reason,
      });

      await createModerationAlerts.mutateAsync({
        sightingId: args.sightingId,
        authorUserId: args.authorId,
        decision: args.decision,
        reason,
        location: args.location,
      });
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: trpc.sightings.list.queryKey() });
      await queryClient.invalidateQueries({ queryKey: trpc.alerts.list.queryKey() });
      closeDetails();
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="max-w-container-max mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Community Sightings</h2>
          <p className="text-on-surface-variant font-body-md">Review queue for citizen-submitted sighting reports.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center bg-surface-container-low px-3 py-2 rounded-lg border border-outline-variant flex-1 min-w-[240px]">
          <span className="material-symbols-outlined text-on-surface-variant text-sm">search</span>
          <input
            className="bg-transparent border-none focus:ring-0 text-body-sm w-full outline-none px-2"
            placeholder="Search by description or reference number..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => {
                setStatus(f.value);
                setPage(0);
              }}
              className={`px-4 py-2 rounded-full text-body-sm font-medium transition-colors ${
                status === f.value
                  ? "bg-surface-container-high text-primary"
                  : "bg-surface hover:bg-surface-container-low text-on-surface-variant"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="text-on-surface-variant text-body-sm">Loading sightings...</p>}
      {isError && <p className="text-error text-body-sm">Failed to load sightings: {error?.message}</p>}
      {!isLoading && !isError && data?.items.length === 0 && (
        <p className="text-on-surface-variant text-body-md py-12 text-center">No sightings match these filters.</p>
      )}

      <div className="space-y-4">
        {data?.items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setSelectedId(item.id);
              setModerationReason(item.moderationReason ?? "");
            }}
            className="w-full text-left bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant hover:shadow-md transition-all p-6 flex items-start justify-between gap-4"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-label-caps font-mono text-on-surface-variant">{item.referenceCode}</span>

                <span
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${MODERATION_STATUS_STYLES[item.moderationStatus]
                    }`}
                >
                  {MODERATION_STATUS_LABELS[item.moderationStatus]}
                </span>


                {item.mediaIds.length > 0 && (
                  <span className="material-symbols-outlined text-on-surface-variant text-sm">
                    photo_camera
                  </span>
                )}
              </div>

              <p className="text-on-surface text-body-md line-clamp-2">{item.description || "No description given."}</p>

              <p className="text-on-surface text-body-md">{getLocationAddress(item.location)}</p>

              {getLatitude(item.location) !== null && getLongitude(item.location) !== null && (
                <p className="mt-1 text-sm text-on-surface-variant">
                  Coordinates: {getLatitude(item.location)}, {getLongitude(item.location)}
                </p>
              )}
            </div>

            <span className="text-body-sm text-on-surface-variant whitespace-nowrap">
              {new Date(
                item.reportedAt ?? item.occurredAt ?? item.createdAt, 
                ).toLocaleDateString()}
            </span>
          </button>
        ))}
      </div>

      {data && data.total > 0 && (
        <div className="mt-stack-lg flex items-center justify-between border-t border-outline-variant pt-stack-md">
          <p className="text-body-sm text-on-surface-variant">
            Showing <span className="font-bold text-on-surface">{data.items.length}</span> of{" "}
            <span className="font-bold text-on-surface">{data.total}</span> sightings
          </p>
          <div className="flex space-x-2">
            <button
              className="p-2 border border-outline-variant rounded-lg hover:bg-surface-container text-on-surface-variant disabled:opacity-30"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <span className="px-4 py-2 text-on-surface-variant">
              Page {page + 1} of {totalPages}
            </span>
            <button
              className="p-2 border border-outline-variant rounded-lg hover:bg-surface-container text-on-surface-variant disabled:opacity-30"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="Close Sighting Details"
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={closeDetails}
            /> 

            <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-outline-variant bg-surface shadow-2xl">

              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-outline-variant bg-surface p-5">
                <div>
                  <h3 className="font-semibold text-on-surface">
                    Sighting Details
                  </h3>

                  <p className="mt-1 font-mono text-xs text-on-surface-variant">
                    {selected.referenceCode}
                  </p>
                </div>

                <button type="button" onClick={closeDetails} className="rounded-lg p-1.5 transition-colors hover:bg-surface-container">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Sighting Details */}
              {/* Description */}
              <div className="space-y-6 p-6">
                <DetailSection title="Description">
                  <p className="whitespace-pre-wrap text-body-md text-on-surface">
                    {selected.description || "No description given."}
                  </p>
                </DetailSection>

                {/* Location */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <DetailField label="Location" value={getLocationAddress(selected.location)}/>

                  <DetailField label="Submitted" value={new Date(selected.reportedAt ?? selected.occurredAt ?? selected.createdAt,).toLocaleString()}/>

                  <DetailField label="Sighting Type" value={selected.sightingType}/>

                  <DetailField label="Visibility" value={selected.visibility}/>

                  <DetailField label="Anonymous" value={selected.isAnonymous ? "Yes" : "No"}/>
                </div>

                {/* Coordinates */}
                <DetailSection title="Coordinates">
                  {getLatitude(selected.location) !== null && getLongitude(selected.location) !== null ? (
                    <div className="space-y-2">
                      <p className="text-sm text-on-surface">
                      Latitude: {getLatitude(selected.location)}
                      </p>

                      <p className="text-sm text-on-surface">
                      Longitude: {getLongitude(selected.location)}
                      </p>

                      <a
                      href={`https://www.google.com/maps?q=${getLatitude(selected.location) }, ${getLongitude(selected.location) }`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          map
                        </span>
                        Open location in Google Maps
                      </a>
                    </div>
                  ) : (
                    <p className="text-sm text-on-surface-variant">
                      No coordinates given
                    </p>
                  )}
                </DetailSection>

                  {/* Submitted Image */}
                <DetailSection title="Submitted images">
                  {selected.mediaIds.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {selected.mediaIds.map((mediaPath) => (
                        <div key={mediaPath} className="rounded-lg border border-outline-variant p-3">
                          <p className="break-all text-sm text-on-surface-variant">
                            {mediaPath}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-on-surface-variant">
                      No images supplied
                    </p>
                  )}
                </DetailSection>

                {/* Submitted By */}
                <DetailField 
                  label="Submitted by"
                  value={
                      selected.isAnonymous
                      ? "Anonymous community member"
                      : selected.author
                        ? `${selected.author.name} (${selected.author.email})`
                        : "Unknown user"
                  }
                />

                <DetailSection title="Moderation Status">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                    MODERATION_STATUS_STYLES[selected.moderationStatus]
                  }`}>

                    {MODERATION_STATUS_LABELS[selected.moderationStatus]}
                  </span>
                </DetailSection>

                <DetailSection title="Moderation Notes">
                  <textarea 
                    value={moderationReason}
                    onChange={(e) => setModerationReason(e.target.value)}
                    placeholder="Enter the reason for approving or rejecting this sighting..."
                    className="w-full min-h-[100px] rounded-lg border border-outline-variant bg-surface-container-low px-3"
                  >
                  </textarea>
                </DetailSection>
              </div>

              {/* Admin Rejection & Approval */}
              <div className="sticky bottom-0 flex justify-end gap-3 border-t border-outline-variant bg-surface p-5">

                  {selected.moderationStatus !== "PENDING" && (
                    <p className="mr-auto text-sm text-on-surface-variant">
                      This sighting has already been moderated.
                    </p>
                  )}

                  {moderationMutation.isError && (
                    <p className="text-sm text-error">
                      Failed to moderate sighting: {" "}
                      {moderationMutation.error.message}
                    </p>
                  )}

                  {/* Reject Sighting Button */}
                  <button 
                  type="button" 
                  className="rounded-lg px-4 py-2 text-sm font-medium text-error transition-colors hover:bg-error-container/10"
                  disabled={moderationMutation.isPending || selected.moderationStatus !== "PENDING"}
                  onClick={() => {
                    if(!selected) return;

                    moderationMutation.mutate({
                      sightingId: selected.id,
                      authorId: selected.reporterUserId,
                      decision: "REJECTED",
                      reason: moderationReason,
                      location: selected.location,
                    });
                  }}
                  >
                    {moderationMutation.isPending
                      ? "Saving..."
                      : "Reject Sighting"
                    } 
                  </button>

                  {/* Approve Sighting Button */}
                  <button 
                    type="button" 
                    className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-on-primary transition-colors hover:bg-primary/90"
                    disabled={moderationMutation.isPending || selected.moderationStatus !== "PENDING"}
                    onClick={() => {
                      if(!selected) return;

                      moderationMutation.mutate({
                        sightingId: selected.id,
                        authorId: selected.reporterUserId,
                        decision: "APPROVED",
                        reason: moderationReason,
                        location: selected.location,
                      });
                    }}
                  >
                    {moderationMutation.isPending
                      ? "Saving..."
                      : "Approve Sighting"
                    }
                  </button>
              </div>

            </div>

        </div>
      )}
    </div>
  );
}
