import type { ReactNode } from "react";

export function AgreementSection({
  number,
  title,
  children,
  className = "",
}: {
  number: number;
  title: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`mt-8 ${className}`}>
      <div className="border-l-4 border-[#2563EB] bg-[#f3f4f6] px-4 py-3">
        <h2 className="text-[15px] font-bold tracking-wide text-[#2563EB]">
          {number}. {title}
        </h2>
      </div>
      <div className="pt-5">{children}</div>
    </section>
  );
}
