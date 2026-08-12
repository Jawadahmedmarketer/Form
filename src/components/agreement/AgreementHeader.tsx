import { AGREEMENT_INTRO } from "@/config/agreement-content";
import { COMPANY } from "@/config/company";

export function AgreementHeader() {
  return (
    <header className="border-b border-slate-200 pb-8 text-center">
      <p className="text-[11px] font-semibold tracking-[0.28em] text-slate-800">
        {COMPANY.brandName.toUpperCase()}
      </p>
      <h1 className="mt-3 font-serif text-[28px] font-semibold tracking-tight text-[#111827] sm:text-[32px]">
        SERVICE AGREEMENT
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-7 text-[#475569]">
        {AGREEMENT_INTRO}
      </p>
    </header>
  );
}
