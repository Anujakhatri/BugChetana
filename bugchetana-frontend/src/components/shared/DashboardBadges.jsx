// Shared dashboard helpers used by the per-role pages.
// (These were duplicated across the three old dashboard files; extracted
// to one place so the per-page splits don't drift out of sync.)

export const SEVERITY_STYLES = {
  critical: "bg-rose-50 text-rose-700 border-rose-200",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export const STATUS_STYLES = {
  open: "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  resolved: "bg-purple-50 text-purple-700 border-purple-200",
  closed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-rose-50 text-rose-700 border-rose-200",
  resubmitted: "bg-indigo-50 text-indigo-700 border-indigo-200",
};

export function SeverityBadge({ severity }) {
  return (
    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border capitalize ${SEVERITY_STYLES[severity] || SEVERITY_STYLES.medium}`}>
      {severity}
    </span>
  );
}

export function StatusBadge({ status }) {
  return (
    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border capitalize ${STATUS_STYLES[status] || STATUS_STYLES.open}`}>
      {status?.replace("_", " ")}
    </span>
  );
}

export function timeAgo(iso) {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(diffMs / 3600000);
  if (hrs < 1) return "just now";
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
