"use client";

import { ArrestsSection } from "./prosecution/ArrestsSection";
import { DecisionSection } from "./prosecution/DecisionSection";
import { HearingsSection } from "./prosecution/HearingsSection";
import { JudicialSummary } from "./prosecution/JudicialSummary";

// Ordered the way a matter actually runs: arrest starts the 48-hour clock
// for the first appearance, hearings follow, and the NPA decision is taken
// on the docket once the accused has appeared.
const SECTIONS = [
  { id: "court-summary", label: "Summary" },
  { id: "court-arrests", label: "Arrests" },
  { id: "court-hearings", label: "Hearings" },
  { id: "court-decision", label: "NPA decision" },
];

export function ProsecutionTab({ caseId, caseStatus }: { caseId: string; caseStatus: string }) {
  return (
    <div className="space-y-10">
      <nav aria-label="Jump to section" className="flex flex-wrap gap-2 -mb-4">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            onClick={(e) => {
              e.preventDefault();
              document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="px-3 py-1.5 rounded-full text-xs font-semibold border border-outline-variant text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
          >
            {s.label}
          </a>
        ))}
      </nav>
      <JudicialSummary caseId={caseId} />
      <ArrestsSection caseId={caseId} />
      <HearingsSection caseId={caseId} />
      <DecisionSection caseId={caseId} caseStatus={caseStatus} />
    </div>
  );
}
