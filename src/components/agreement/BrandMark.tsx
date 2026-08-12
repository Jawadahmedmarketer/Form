import { COMPANY } from "@/config/company";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#1e3a8a] font-serif text-lg font-bold text-white">
        U
      </div>
      <span className={`font-semibold tracking-tight text-[#111827] ${compact ? "text-sm" : "text-base"}`}>
        {COMPANY.brandName}
      </span>
    </div>
  );
}
