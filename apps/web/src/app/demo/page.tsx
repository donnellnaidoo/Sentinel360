"use client";

import LiveSurveillanceMonitor from "@/components/command-center/live-surveillance-monitor";

export default function DemoPage() {
  return (
    <div className="w-full h-full">
      <LiveSurveillanceMonitor agentName="Test Agent" />
    </div>
  );
}
