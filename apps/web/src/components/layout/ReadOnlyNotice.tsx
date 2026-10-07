export default function ReadOnlyNotice({ what }: { what: string }) {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 text-body-sm text-on-surface-variant">
      <span className="material-symbols-outlined text-[18px]">lock</span>
      <span>View only. Changes to {what} can only be made by a super admin.</span>
    </div>
  );
}
