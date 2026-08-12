import type { ReactNode } from "react";

export function DocumentShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f4f6f8] px-3 py-6 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-[960px] bg-white px-4 py-8 shadow-[0_10px_40px_rgba(15,23,42,0.08)] sm:px-10 sm:py-12 md:px-14">
        {children}
      </div>
    </div>
  );
}
