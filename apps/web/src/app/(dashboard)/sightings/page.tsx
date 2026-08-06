"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { queryClient, trpc } from "@/lib/trpc/client";
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
  items: CommunitySighting[];
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
     .from("community_sighting")
     .select(
      `
      id,
      reference_code,
      reporter_user_id,
      sighting_type,
      title,
      description,
      location,
      occurred_at,
      media_ids,
      status,
      severity,
      visibility,
      operator_notes,
      linked_incident_id,
      moderation_status,
      moderation_reason,
      reported_at,
      is_anonymous,
      created_at,
      updated_at,

      author:user!community_sighting_reporter_user_id_fkey (
        id,
        name,
        email,
        image
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
        [
          `description.ilike.%${filteredSearch}%`,
          `reference_code.ilike.%${filteredSearch}%`,
          `title.ilike.%${filteredSearch}%`,
        ].join(","),
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

     const rows = (data ?? []) as unknown as CommunitySightingQueryRow[];

     const items: CommunitySighting[] = rows.map((row) => ({
      ...row,

      media_ids: Array.isArray(row.media_ids)
      ? row.media_ids.filter(
        (item): item is string => typeof item === "string",
      )
      :[],

      author: Array.isArray(row.author)
      ? row.author[0] ?? null
      : row.author,
     }));

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
  id: string;
  name: string;
  email: string;
  image: string | null;
};

type SightingLocation = {
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  [key: string]: unknown;
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

type CommunitySighting = {
  id: string;
  reference_code: string;
  reporter_user_id: string | null;
  sighting_type: string;
  title: string | null;
  description: string;
  location: SightingLocation;
  occurred_at: string | null;
  media_ids: string[];
  status: string;
  severity: string | null;
  visibility: string;
  operator_notes: string | null;
  linked_incident_id: string | null;
  moderation_status: ModerationStatus;
  moderation_reason: string | null;
  reported_at: string | null;
  is_anonymous: boolean;
  created_at: string;
  updated_at: string;
  author: SightingAuthor | null;
};

type CommunitySightingQueryRow = Omit<CommunitySighting, "author" | "media_ids"> & {
  media_ids: unknown;
  author: SightingAuthor | SightingAuthor[] | null;
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
  location: SightingLocation;
};

async function moderateSighting({
  sightingId,
  authorId,
  decision,
  reason,
  location,
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
    .from("community_sighting")
    .update({
      moderation_status: decision,
      moderation_reason: cleanedReason || null,
      status: approved ? "APPROVED" : "REJECTED",
      visibility: approved ? "COMMUNITY" : "PRIVATE",
      operator_notes: cleanedReason || null,
      updated_at: now,
    })
    .eq("id", sightingId);

  if (updateError) {
    throw new Error(updateError.message);
  }

//   const alertsToCreate = [
//     // Personal alert for the sighting author
//     ...(authorId
//       ? [
//         {
//           user_id: authorId,
//           created_by: adminUser.id,
//           sighting_id: sightingId,
//           audience: "PERSONAL",

//           alert_type: approved
//             ? "SIGHTING_APPROVED"
//             : "SIGHTING_REJECTED",

//           title: approved
//             ? "Your sighting was approved"
//             : "Your sighting was rejected",

//           message: approved
//             ? cleanedReason
//               ? `Your sighting was approved. Note: ${cleanedReason}`
//               : "Your submitted sighting was reviewed and approved."
//             : cleanedReason
//               ? `Your sighting was rejected. Reason: ${cleanedReason}`
//               : "Your submitted sighting was reviewed and could not be confirmed.",

//           location,
//           latitude:
//             latitude === null
//               ? null
//               : String(latitude),
//           longitude:
//             longitude === null
//               ? null
//               : String(longitude),

//           is_read: false,
//           created_at: now,
//           updated_at: now,
//         },
//       ]
//       : []),

//     // Community alert for all approved sightings
//     ...(approved
//       ? [
//         {
//           user_id: null,
//           created_by: adminUser.id,
//           sighting_id: sightingId,
//           audience: "COMMUNITY",
//           alert_type:
//             "COMMUNITY_SIGHTING_APPROVED",

//           title: "Community Sighting Confirmed",

//           message: cleanedReason
//             ? `A community sighting was confirmed. Note: ${cleanedReason}`
//             : "A community sighting was reviewed and confirmed.",

//           location,
//           latitude:
//             latitude === null
//               ? null
//               : String(latitude),
//           longitude:
//             longitude === null
//               ? null
//               : String(longitude),

//           is_read: false,
//           created_at: now,
//           updated_at: now,
//         },
//       ]
//       : []),
//   ];

//   if (alertsToCreate.length === 0) {
//     return;
//   }

//   console.log(
//     "Alerts being inserted:",
//     alertsToCreate,
//   );

//   const { data: insertedAlerts, error: alertError } =
//     await supabase
//       .from("Alert")
//       .insert(alertsToCreate)
//       .select();

//   console.log("Alert insertion result:", {
//     insertedAlerts,
//     alertError,
//   });

//   if (alertError) {
//     throw new Error(
//       `The sighting was moderated, but alerts could not be created: ${alertError.message}`,
//     );
//   }
}

export default function SightingsPage() {
  const [search, setSearch] = useState("");
  // const [status, setStatus] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<CommunitySighting | null>(null);
  const [moderationReason, setModerationReason] = useState("");
  // const [notes, setNotes] = useState("");

  const createModerationAlerts = useMutation(
    trpc.alerts.createForSightingModeration.mutationOptions(),
  );

  const moderationMutation = useMutation({
    mutationFn: async (input: ModerateSightingInput) => {
      await moderateSighting(input);

      await createModerationAlerts.mutateAsync({
        sightingId: input.sightingId,
        authorUserId: input.authorId,
        decision: input.decision,
        reason: input.reason.trim() || undefined,
        location: input.location,
      });
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["sightings"],
      });

      await queryClient.invalidateQueries({
        queryKey: trpc.alerts.list.queryKey(),
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

  function getLocationAddress(
    location: SightingLocation | null,
  ): string {
    if(!location)
    {
      return "No location supplied";
    }

    if(
      typeof location.address === "string" &&
      location.address.trim()
    )
    {
      return location.address;
    }

    return "No location supplied";
  }

  function getLatitude(
    location: SightingLocation | null,
  ): number | null {
    return typeof location?.latitude === "number"
    ? location.latitude
    : null;
  }

  function getLongitude(
    location: SightingLocation | null,
  ): number | null {
    return typeof location?.longitude === "number"
    ? location.longitude
    : null;
  }

  

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
            key={item.id}
            type="button"
            onClick={() => {
              setSelected(item);
              setModerationReason(item.moderation_reason ?? "");
            }}
            className="w-full text-left bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant hover:shadow-md transition-all p-6 flex items-start justify-between gap-4"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-label-caps font-mono text-on-surface-variant">{item.reference_code}</span>

                <span
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${MODERATION_STATUS_STYLES[item.moderation_status]
                    }`}
                >
                  {MODERATION_STATUS_LABELS[item.moderation_status]}
                </span>


                {item.media_ids.length > 0 && (
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
                item.reported_at ?? item.occurred_at ?? item.created_at, 
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
                    {selected.reference_code}
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
                  <DetailField label="Location" value={getLocationAddress(selected.location) ?? "Not supplied"}/>

                  <DetailField label="Submitted" value={new Date(selected.reported_at ?? selected.occurred_at ?? selected.created_at,).toLocaleString()}/>

                  <DetailField label="Sighting Type" value={selected.sighting_type}/>

                  <DetailField label="Visibility" value={selected.visibility}/>

                  <DetailField label="Anonymous" value={selected.is_anonymous ? "Yes" : "No"}/>
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
                  {selected.media_ids.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {selected.media_ids.map((mediaPath) => (
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
                      selected.is_anonymous
                      ? "Anonymous community member"
                      : selected.author
                        ? `${selected.author.name} (${selected.author.email})`
                        : selected.reporter_user_id ?? "Unknown user"
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
                      Failed to moderate sighting: {" "}
                      {moderationMutation.error.message}
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
                      sightingId: selected.id,
                      authorId: selected.reporter_user_id,
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
                    disabled={moderationMutation.isPending || selected.moderation_status !== "PENDING"}
                    onClick={() => {
                      if(!selected) return;

                      moderationMutation.mutate({
                        sightingId: selected.id,
                        authorId: selected.reporter_user_id,
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
