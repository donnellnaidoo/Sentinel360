"use client";

import "@photo-sphere-viewer/core/index.css";
import "@photo-sphere-viewer/markers-plugin/index.css";

import { Viewer } from "@photo-sphere-viewer/core";
import { type MarkerConfig, MarkersPlugin } from "@photo-sphere-viewer/markers-plugin";
import { useEffect, useRef, useState } from "react";

type Direction = { yaw: number; pitch: number };

function asDirection(value: unknown): Direction | null {
  const d = value as Partial<Direction> | null | undefined;
  return d && typeof d.yaw === "number" && typeof d.pitch === "number" ? { yaw: d.yaw, pitch: d.pitch } : null;
}

function detectionLabel(meta: Record<string, unknown>): string {
  if (typeof meta.weaponClass === "string") return `Detected: ${meta.weaponClass}`;
  if (meta.eventType === "ALTERCATION") return meta.reason === "fall" ? "Possible fall" : "Possible fight";
  return "Detection";
}

// Directions come from apps/ai (pipeline.py#_attach_panorama): yaw 0 is the
// panorama's centre, both in degrees — the same convention as the viewer.
function buildMarkers(meta: Record<string, unknown>): { markers: MarkerConfig[]; focus: Direction | null } {
  const markers: MarkerConfig[] = [];
  const target = asDirection(meta.panoramaTarget);
  if (target) {
    markers.push({
      id: "detection",
      position: { yaw: `${target.yaw}deg`, pitch: `${target.pitch}deg` },
      circle: 22,
      svgStyle: { fill: "rgba(239, 68, 68, 0.18)", stroke: "#ef4444", strokeWidth: "3px" },
      tooltip: { content: detectionLabel(meta), position: "top center" },
    });
  }
  const faces = Array.isArray(meta.faces) ? (meta.faces as Record<string, unknown>[]) : [];
  faces.forEach((face, index) => {
    const direction = asDirection(face.panoramaDirection);
    if (!direction) return;
    markers.push({
      id: `face-${index + 1}`,
      position: { yaw: `${direction.yaw}deg`, pitch: `${direction.pitch}deg` },
      circle: 12,
      svgStyle: { fill: "rgba(250, 204, 21, 0.15)", stroke: "#facc15", strokeWidth: "2px" },
      tooltip: { content: `Face ${index + 1}`, position: "top center" },
    });
  });
  return { markers, focus: target ?? asDirection(faces[0]?.panoramaDirection) };
}

/**
 * Interactive 360° view of an AI PANORAMA evidence item: drag to look
 * around, scroll/pinch to zoom, fullscreen. Opens facing the detection,
 * with markers on it and on every face captured with the event.
 */
export default function PanoramaViewer({
  url,
  title,
  metadata,
}: {
  url: string;
  title: string;
  metadata: unknown;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const { markers, focus } = buildMarkers((metadata ?? {}) as Record<string, unknown>);
    const viewer = new Viewer({
      container,
      panorama: url,
      caption: title,
      defaultYaw: `${focus?.yaw ?? 0}deg`,
      defaultPitch: `${focus?.pitch ?? 0}deg`,
      // No download button: downloads go through the evidence Download
      // action so they're logged to the chain of custody.
      navbar: ["zoom", "move", ...(markers.length > 0 ? ["markers"] : []), "caption", "fullscreen"],
      plugins: [[MarkersPlugin, { markers }]],
    });
    const onError = () => setFailed(true);
    viewer.addEventListener("panorama-error", onError);
    return () => {
      viewer.removeEventListener("panorama-error", onError);
      viewer.destroy();
    };
  }, [url, title, metadata]);

  if (failed) {
    return (
      <p role="alert" className="text-xs text-error">
        The 360° image couldn&apos;t be loaded. Close the viewer and open it again.
      </p>
    );
  }

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label={`360° view: ${title}. Drag to look around, scroll to zoom.`}
      className="h-[min(60vh,480px)] w-full overflow-hidden rounded-lg bg-black"
    />
  );
}
