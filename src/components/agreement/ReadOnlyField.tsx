export function ReadOnlyField({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-center">
      <div className="text-sm font-medium text-[#111827]">{label}</div>
      <div className="rounded-md border border-slate-200 bg-[#f8fafc] px-3 py-2.5 text-sm text-[#111827] whitespace-pre-line">
        {href ? (
          <a href={href} className="text-[#1d4ed8] underline-offset-2 hover:underline">
            {value}
          </a>
        ) : (
          value
        )}
      </div>
    </div>
  );
}
