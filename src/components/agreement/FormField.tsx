import type { ReactNode } from "react";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

const fieldClass =
  "w-full rounded-md border border-slate-200 bg-[#f8fafc] px-3 py-2.5 text-sm text-[#111827] outline-none transition focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

export function FormField({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[#111827]">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </span>
      {children}
      {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : null}
    </label>
  );
}

export function TextInput({
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  return (
    <input
      {...props}
      className={`${fieldClass} ${error ? "border-red-400" : ""} ${props.className ?? ""}`}
    />
  );
}

export function TextArea({
  error,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string }) {
  return (
    <textarea
      {...props}
      className={`${fieldClass} min-h-[96px] resize-y ${error ? "border-red-400" : ""} ${props.className ?? ""}`}
    />
  );
}
