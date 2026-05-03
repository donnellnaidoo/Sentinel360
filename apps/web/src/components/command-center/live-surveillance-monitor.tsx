"use client";

import { cn } from "@Sentinel360/ui/lib/utils";

import CommandCenterShell, {
  MaterialIcon,
  headlineStyle,
} from "./command-center-shell";
import {
  intelligenceFeedItems,
  liveFeedCards,
} from "./live-surveillance-data";

type LiveSurveillanceMonitorProps = {
  agentName: string;
};

const gridViewModes = [
  { icon: "grid_view", active: true },
  { icon: "view_quilt" },
  { icon: "settings_overscan" },
];

const floatingViewModes = [
  { icon: "map", label: "Grid View", active: true },
  { icon: "location_searching", label: "Spatial Map" },
];

export default function LiveSurveillanceMonitor({
  agentName,
}: LiveSurveillanceMonitorProps) {
  const profileSubtitle = agentName.trim() || "Admin-04";

  return (
    <CommandCenterShell
      activeSidebarLabel="Live Surveillance"
      activeTopNavTab="Analytics"
      agentName={agentName}
      searchPlaceholder="Search systems, feeds, or events..."
      variant="surveillance"
      profileTitle="Command Center"
      profileSubtitle={profileSubtitle}
      contentClassName="pb-28 xl:h-[calc(100vh-5rem)] xl:overflow-hidden"
      floatingHud={
        <div className="fixed bottom-8 left-4 right-4 z-20 flex justify-start lg:left-72 lg:right-auto">
          <div className="no-line-shadow flex gap-1 rounded-xl bg-white/60 p-2 backdrop-blur-xl">
            {floatingViewModes.map((mode) => (
              <button
                key={mode.label}
                className={cn(
                  "flex items-center gap-2 rounded-lg p-3 transition-colors",
                  mode.active
                    ? "bg-[#051125] text-white"
                    : "text-[#45474d] hover:bg-[#e7e8e9]",
                )}
                type="button"
              >
                <MaterialIcon name={mode.icon} className="text-sm" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
                  {mode.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      }
    >
      <div className="flex h-full flex-col gap-8 xl:flex-row">
        <section className="sentinel-no-scrollbar min-h-0 flex-1 xl:overflow-y-auto xl:pr-2">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                className="text-2xl font-bold text-[#051125]"
                style={headlineStyle}
              >
                Live Feeds
              </h2>
              <p className="mt-1 text-sm text-[#45474d]">
                9 Active streams from Cluster Alpha
              </p>
            </div>

            <div className="flex gap-2 rounded-lg bg-[#f3f4f5] p-1">
              {gridViewModes.map((mode) => (
                <button
                  key={mode.icon}
                  className={cn(
                    "rounded p-2 transition-colors",
                    mode.active
                      ? "bg-white text-[#051125] shadow-sm"
                      : "text-[#45474d] hover:bg-[#e7e8e9]",
                  )}
                  type="button"
                >
                  <MaterialIcon name={mode.icon} className="text-xl" />
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 2xl:grid-cols-3">
            {liveFeedCards.map((feed) => (
              <article
                key={feed.cameraName}
                className={cn(
                  "no-line-shadow group overflow-hidden rounded-xl bg-white",
                  feed.cardClassName,
                )}
              >
                <div className="relative aspect-video overflow-hidden bg-black">
                  <img
                    alt={feed.imageAlt}
                    className="h-full w-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105"
                    src={feed.imageUrl}
                  />

                  {feed.detections.map((detection) => (
                    <div
                      key={`${feed.cameraName}-${detection.label}`}
                      className={cn(
                        "absolute border-2 border-[#2a9d8f] bg-[#2a9d8f]/10",
                        detection.boxClassName,
                      )}
                    >
                      <span
                        className={cn(
                          "absolute -top-4 left-0 bg-[#2a9d8f] px-1 py-[1px] text-[10px] font-bold uppercase text-white",
                          detection.labelClassName,
                        )}
                      >
                        {detection.label}
                      </span>
                    </div>
                  ))}

                  <div
                    className={cn(
                      "absolute inset-x-0 top-0 flex items-start justify-between bg-gradient-to-b p-4",
                      feed.topOverlayClassName,
                    )}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full",
                            feed.streamDotClassName,
                            feed.streamDotAnimated
                              ? feed.streamStatus.startsWith("ALERT")
                                ? "motion-safe:animate-ping"
                                : "motion-safe:animate-pulse"
                              : "",
                          )}
                        />
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                          {feed.streamStatus}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-medium text-white">
                        {feed.cameraName}
                      </p>
                    </div>

                    {feed.resolution ? (
                      <span className="rounded bg-black/40 px-2 py-1 font-mono text-[10px] text-white/80">
                        {feed.resolution}
                      </span>
                    ) : null}
                  </div>

                  <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/60 to-transparent p-4 opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="flex gap-2">
                      <FeedActionButton icon="fullscreen" />
                      <FeedActionButton icon="photo_camera" />
                    </div>
                    <FeedActionButton
                      className={cn(
                        "bg-[#ba1a1a]/20 hover:bg-[#ba1a1a]",
                        feed.flagButtonClassName,
                      )}
                      icon="flag"
                    />
                  </div>
                </div>

                <div
                  className={cn(
                    "flex items-center justify-between p-4",
                    feed.footerClassName,
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg",
                        feed.footerIconWrapClassName,
                      )}
                    >
                      <MaterialIcon
                        name={feed.statusBadge === "ACTIVE ALERT" ? "warning" : "location_on"}
                        className={cn("text-sm", feed.footerIconClassName)}
                      />
                    </div>
                    <div>
                      <p
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-[0.16em]",
                          feed.footerLabelClassName,
                        )}
                      >
                        {feed.zoneLabel}
                      </p>
                      <p className="text-xs font-semibold text-[#191c1d]">
                        {feed.zoneName}
                      </p>
                    </div>
                  </div>

                  <span
                    className={cn(
                      "rounded px-2 py-1 text-[10px] font-bold",
                      feed.statusBadgeClassName,
                    )}
                  >
                    {feed.statusBadge}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="w-full xl:w-80 xl:min-w-[20rem]">
          <div className="no-line-shadow flex h-full max-h-[720px] flex-col overflow-hidden rounded-2xl bg-[#f3f4f5] p-6 xl:max-h-none">
            <div className="mb-6 flex items-center justify-between">
              <h3
                className="font-bold text-[#051125]"
                style={headlineStyle}
              >
                Intelligence Feed
              </h3>
              <span className="rounded bg-[#1b263b] px-2 py-1 text-[10px] font-bold text-white">
                LIVE
              </span>
            </div>

            <div className="sentinel-no-scrollbar space-y-4 overflow-y-auto pr-2">
              {intelligenceFeedItems.map((item) => (
                <button
                  key={`${item.title}-${item.elapsed}`}
                  className={cn(
                    "w-full rounded-xl border-l-4 bg-white p-4 text-left transition-transform hover:scale-[1.02]",
                    item.borderClassName,
                  )}
                  type="button"
                >
                  <div className="mb-2 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <MaterialIcon
                        name={item.icon}
                        className={cn("text-base", item.iconClassName)}
                      />
                      <span
                        className={cn(
                          "text-[10px] font-bold uppercase",
                          item.iconClassName,
                        )}
                      >
                        {item.label}
                      </span>
                    </div>
                    <span className="text-[10px] font-medium text-[#45474d]">
                      {item.elapsed}
                    </span>
                  </div>

                  <p className="mb-1 text-xs font-bold text-[#051125]">
                    {item.title}
                  </p>

                  {item.description ? (
                    <p className="mb-3 text-[10px] text-[#45474d]">
                      {item.description}
                    </p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.chips.map((chip) => (
                      <span
                        key={chip}
                        className="rounded bg-[#e7e8e9] px-2 py-0.5 text-[9px] font-bold text-[#191c1d]"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>

                  {item.location ? (
                    <p className="mt-2 flex items-center gap-1 text-[10px] text-[#45474d]">
                      <MaterialIcon name="location_on" className="text-[12px]" />
                      <span>{item.location}</span>
                    </p>
                  ) : null}
                </button>
              ))}
            </div>

            <div className="mt-auto pt-4">
              <button
                className="w-full rounded-lg bg-[#051125] py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-[#1b263b]"
                type="button"
              >
                View Full History
              </button>
            </div>
          </div>
        </aside>
      </div>
    </CommandCenterShell>
  );
}

function FeedActionButton({
  icon,
  className,
}: {
  icon: string;
  className?: string;
}) {
  return (
    <button
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white backdrop-blur-md transition-colors hover:bg-white/40",
        className,
      )}
      type="button"
    >
      <MaterialIcon name={icon} className="text-sm" />
    </button>
  );
}
