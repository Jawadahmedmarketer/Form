export function InvalidLink({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="mx-auto max-w-lg px-6 py-20 text-center">
      <p className="text-xs font-semibold tracking-[0.24em] text-slate-500">UNIFIED TAX GROUP</p>
      <h1 className="mt-4 font-serif text-3xl text-[#111827]">{title}</h1>
      <p className="mt-4 text-sm leading-6 text-[#475569]">{message}</p>
    </div>
  );
}
