import type { AgreementStatus } from "@/lib/supabase/types";

const STYLES: Record<AgreementStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-blue-50 text-blue-800",
  viewed: "bg-amber-50 text-amber-800",
  signed: "bg-emerald-50 text-emerald-800",
  cancelled: "bg-red-50 text-red-800",
  expired: "bg-slate-200 text-slate-600",
};

export function StatusBadge({ status }: { status: AgreementStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STYLES[status] ?? STYLES.draft}`}
    >
      {status}
    </span>
  );
}
