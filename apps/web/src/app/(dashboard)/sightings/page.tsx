"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { queryClient } from "@/lib/trpc/client";
import { createClient } from "@/lib/supabase/client";

const PAGE_SIZE = 12;

type FetchSightingsInput = {
  search: string;
  page: number;
};

async function fetchSightings({
  search,
  page,
}: FetchSightingsInput): Promise<{
  items: Sighting[];
  total: number;
}> {
  const supabase = createClient();

  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  console.log("Current Supabase user:", {
    id: user?.id,
    email: user?.email,
    userError,
  });

  let query = supabase
     .from("Sighting")
     .select(
      `
        sighting_id,
        created_by,
        criminal_id,
        location,
        description,
        latitude,
        longitude,
        image,
        timestamp,
        created_at,
        updated_at,
        moderation_status,
        moderation_reason,
        moderated_by,
        moderated_at,
        author:User!Sighting_created_by_fkey (
          user_id,
          name,
          email,
          avatar_url
        )
      `,
      {
        count: "exact",
      },
     )
     .order("created_at", {
      ascending: false,
     })
     .range(from, to);

  const filteredSearch = escapeSearchValue(search.trim());

     if(filteredSearch){
      query = query.or(
        `description.ilike.%${filteredSearch}%,location.ilike.%${filteredSearch}%`,
      );
     }

     function escapeSearchValue(value:string): string {
      return value.replace(/[%_,()]/g, "");
     }

     const { data, error, count } = await query;

    console.log("Sightings query result:", {
      data,
      error,
      count,
    });

     if(error){
      throw new Error(error.message);
     }

     const rows = (data ?? []) as SightingQueryRow[];

     const items: Sighting[] = rows.map((row) => ({
      ...row,
      author: row.author?.[0] ?? null,
     }))

     return {
      items,
      total: count ?? 0,
     };
}

// const STATUS_FILTERS = [
//   { value: undefined, label: "All" },
//   { value: "PENDING", label: "Pending" },
//   { value: "APPROVED", label: "Approved" },
//   { value: "DUPLICATE", label: "Duplicate" },
//   { value: "REJECTED", label: "Rejected" },
// ] as const;

// const STATUS_STYLES: Record<string, string> = {
//   PENDING: "bg-tertiary-container/20 text-tertiary",
//   APPROVED: "bg-secondary-container/20 text-secondary",
//   DUPLICATE: "bg-surface-container text-on-surface-variant",
//   REJECTED: "bg-error-container/20 text-error",
// };

type SightingAuthor = {
  user_id: string;
  name: string;
  email: string;
  avatar_url: string | null;
};

type ModerationStatus = "PENDING" | "APPROVED" | "REJECTED";

const MODERATION_STATUS_STYLES: Record<ModerationStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  APPROVED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
};

const MODERATION_STATUS_LABELS: Record<ModerationStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

type Sighting = {
  sighting_id: string;
  created_by: string | null;
  criminal_id: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  image: string | null;
  timestamp: string | null;
  created_at: string;
  updated_at: string;
  description: string;

  moderation_status: ModerationStatus;
  moderation_reason: string | null;
  moderated_by: string | null;
  moderated_at: string | null;

  author: SightingAuthor | null;
};

type SightingQueryRow = Omit<Sighting, "author"> & {
  author: SightingAuthor[] | null;
};

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

type ModerateSightingInput = {
  sightingId: string;
  authorId: string | null;
  decision: "APPROVED" | "REJECTED";
  reason: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
};

async function moderateSighting({
  sightingId,
  authorId,
  decision,
  reason,
  location,
  latitude,
  longitude,
}: ModerateSightingInput): Promise<void> {
  const supabase = createClient();

  const {
    data: { user: adminUser },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  if (!adminUser) {
    throw new Error(
      "You must be logged in to moderate a sighting.",
    );
  }

  const now = new Date().toISOString();
  const cleanedReason = reason.trim();
  const approved = decision === "APPROVED";

  const { error: updateError } = await supabase
    .from("Sighting")
    .update({
      moderation_status: decision,
      moderation_reason: cleanedReason || null,
      moderated_by: adminUser.id,
      moderated_at: now,
      updated_at: now,
    })
    .eq("sighting_id", sightingId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const alertsToCreate = [
    // Personal alert for the sighting author
    ...(authorId
      ? [
        {
          user_id: authorId,
          created_by: adminUser.id,
          sighting_id: sightingId,
          audience: "PERSONAL",

          alert_type: approved
            ? "SIGHTING_APPROVED"
            : "SIGHTING_REJECTED",

          title: approved
            ? "Your sighting was approved"
            : "Your sighting was rejected",

          message: approved
            ? cleanedReason
              ? `Your sighting was approved. Note: ${cleanedReason}`
              : "Your submitted sighting was reviewed and approved."
            : cleanedReason
              ? `Your sighting was rejected. Reason: ${cleanedReason}`
              : "Your submitted sighting was reviewed and could not be confirmed.",

          location,
          latitude:
            latitude === null
              ? null
              : String(latitude),
          longitude:
            longitude === null
              ? null
              : String(longitude),

          is_read: false,
          created_at: now,
          updated_at: now,
        },
      ]
      : []),

    // Community alert for all approved sightings
    ...(approved
      ? [
        {
          user_id: null,
          created_by: adminUser.id,
          sighting_id: sightingId,
          audience: "COMMUNITY",
          alert_type:
            "COMMUNITY_SIGHTING_APPROVED",

          title: "Community Sighting Confirmed",

          message: cleanedReason
            ? `A community sighting was confirmed. Note: ${cleanedReason}`
            : "A community sighting was reviewed and confirmed.",

          location,
          latitude:
            latitude === null
              ? null
              : String(latitude),
          longitude:
            longitude === null
              ? null
              : String(longitude),

          is_read: false,
          created_at: now,
          updated_at: now,
        },
      ]
      : []),
  ];

  if (alertsToCreate.length === 0) {
    return;
  }

  console.log(
    "Alerts being inserted:",
    alertsToCreate,
  );

  const { data: insertedAlerts, error: alertError } =
    await supabase
      .from("Alert")
      .insert(alertsToCreate)
      .select();

  console.log("Alert insertion result:", {
    insertedAlerts,
    alertError,
  });

  if (alertError) {
    throw new Error(
      `The sighting was moderated, but alerts could not be created: ${alertError.message}`,
    );
  }
}

export default function SightingsPage() {
  const [search, setSearch] = useState("");
  // const [status, setStatus] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Sighting | null>(null);
  const [moderationReason, setModerationReason] = useState("");
  // const [notes, setNotes] = useState("");
  const moderationMutation = useMutation({
    mutationFn: moderateSighting,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["sightings"],
      });

      setSelected(null);
      setModerationReason("");
    },
  });

  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["sightings", search, page],

    queryFn: () => 
      fetchSightings({
        search,
        page,
      }),
  });



  // const { data, isLoading, isError, error } = useQuery(trpc.sightings.list.queryOptions(input));

  // const verify = useMutation(
  //   trpc.sightings.verify.mutationOptions({
  //     onSuccess: () => {
  //       queryClient.invalidateQueries({ queryKey: trpc.sightings.list.queryKey() });
  //       setSelected(null);
  //       setNotes("");
  //     },
  //   }),
  // );

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
          {/* {STATUS_FILTERS.map((f) => (
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
          ))} */}
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
            key={item.sighting_id}
            type="button"
            onClick={() => {
              setSelected(item);
              setModerationReason(item.moderation_reason ?? "");
            }}
            className="w-full text-left bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant hover:shadow-md transition-all p-6 flex items-start justify-between gap-4"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-label-caps font-mono text-on-surface-variant">{item.sighting_id.slice(0, 8).toUpperCase()}</span>

                <span
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${MODERATION_STATUS_STYLES[item.moderation_status]
                    }`}
                >
                  {MODERATION_STATUS_LABELS[item.moderation_status]}
                </span>


                {item.image && (
                  <span className="material-symbols-outlined text-on-surface-variant text-sm">
                    photo_camera
                  </span>
                )}
              </div>

              <p className="text-on-surface text-body-md line-clamp-2">{item.description || "No description given."}</p>

              <p className="text-on-surface text-body-md">{item.location ?? "No location given."}</p>

              {item.latitude !== null && item.longitude !== null && (
                <p className="mt-1 text-sm text-on-surface-variant">
                  Coordinates: {item.latitude}, {item.longitude}
                </p>
              )}
            </div>

            <span className="text-body-sm text-on-surface-variant whitespace-nowrap">
              {new Date(
                item.timestamp ?? item.created_at, 
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
              onClick={() => setSelected(null)}
            /> 

            <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-outline-variant bg-surface shadow-2xl">

              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-outline-variant bg-surface p-5">
                <div>
                  <h3 className="font-semibold text-on-surface">
                    Sighting Details
                  </h3>

                  <p className="mt-1 font-mono text-xs text-on-surface-variant">
                    {selected.sighting_id}
                  </p>
                </div>

                <button type="button" onClick={() => {setSelected(null); setModerationReason("")}} className="rounded-lg p-1.5 transition-colors hover:bg-surface-container">
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
                  <DetailField label="Location" value={selected.location ?? "Not supplied"}/>

                  <DetailField label="Submitted" value={new Date(selected.timestamp ?? selected.created_at,).toLocaleString()}/>

                  <DetailField label="Criminal reference" value={selected.criminal_id ?? "Not linked"} mono={Boolean(selected.criminal_id)}/>
                </div>

                {/* Coordinates */}
                <DetailSection title="Coordinates">
                  {selected.latitude !== null && selected.longitude !== null ? (
                    <div className="space-y-2">
                      <p className="text-sm text-on-surface">
                        Latitude: {selected.latitude}
                      </p>

                      <p className="text-sm text-on-surface">
                        Longitude: {selected.longitude}
                      </p>

                      <a
                        href={`https://www.google.com/maps?q=${selected.latitude}, ${selected.longitude}`}
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
                <DetailSection title="Submitted image">
                  {selected.image ? (
                    <img
                      src={selected.image}
                      alt="Submitted sighting evidencec"
                      className="max-h-[420px] w-full rounded-lg border-outline-variant object-contain"
                    />
                  ) : (
                    <p className="text-sm text-on-surface-variant">
                      No image given
                    </p>
                  )}
                </DetailSection>

                {/* Submitted By */}
                <DetailField 
                  label="Submitted by"
                  value={
                      selected.author
                      ?  `${selected.author.name} (${selected.author.email})`
                      : selected.created_by ?? "Unknown user"
                  }
                />

                <DetailSection title="Moderation Status">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                    MODERATION_STATUS_STYLES[selected.moderation_status]
                  }`}>

                    {MODERATION_STATUS_LABELS[selected.moderation_status]}
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

                  {selected.moderation_status !== "PENDING" && (
                    <p className="mr-auto text-sm text-on-surface-variant">
                      This sighting has already been moderated.
                    </p>
                  )}

                  {moderationMutation.isError && (
                    <p className="text-sm text-error">
                      Failed to update sighting: {moderationMutation.error.message}
                    </p>
                  )}

                  {/* Reject Sighting Button */}
                  <button 
                  type="button" 
                  className="rounded-lg px-4 py-2 text-sm font-medium text-error transition-colors hover:bg-error-container/10"
                  disabled={moderationMutation.isPending || selected.moderation_status !== "PENDING"}
                  onClick={() => {
                    if(!selected) return;

                    moderationMutation.mutate({
                      sightingId: selected.sighting_id,
                      authorId: selected.created_by,
                      decision: "REJECTED",
                      reason: moderationReason,
                      location: selected.location,
                      latitude: selected.latitude,
                      longitude: selected.longitude,
                    });
                  }}
                  >
                    {moderationMutation.isPending
                      ? "Saving..."
                      : "Reject Sighting"
                    } 
                  </button>

                  <button 
                    type="button" 
                    className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-on-primary transition-colors hover:bg-primary/90"
                    disabled={moderationMutation.isPending || selected.moderation_status !== "PENDING"}
                    onClick={() => {
                      if(!selected) return;

                      moderationMutation.mutate({
                        sightingId: selected.sighting_id,
                        authorId: selected.created_by,
                        decision: "APPROVED",
                        reason: moderationReason,
                        location: selected.location,
                        latitude: selected.latitude,
                        longitude: selected.longitude,
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
