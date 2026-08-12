import { COMPANY } from "@/config/company";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
      <p className="text-xs font-semibold tracking-[0.28em] text-slate-500">
        {COMPANY.brandName.toUpperCase()}
      </p>
      <h1 className="mt-4 font-serif text-4xl text-[#111827]">Service Agreement</h1>
      <p className="mt-4 text-[15px] leading-7 text-[#475569]">
        Agreements are issued through a unique, secure link. If you received an agreement from
        Unified Tax Group, please use the link in your email or text message.
      </p>
      <p className="mt-6 text-sm text-[#475569]">
        {COMPANY.legalName}
        <br />
        {COMPANY.email} · {COMPANY.phone}
      </p>
    </main>
  );
}
