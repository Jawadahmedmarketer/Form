"use client";

import { useState } from "react";

const defaultClassName =
  "inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50";

export function CopyLinkButton({
  value,
  label = "Copy link",
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" onClick={() => void copy()} className={className ?? defaultClassName}>
      {copied ? "Copied" : label}
    </button>
  );
}
