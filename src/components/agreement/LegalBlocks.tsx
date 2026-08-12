import type { LegalBlock } from "@/config/agreement-content";

export function LegalBlocks({ blocks }: { blocks: LegalBlock[] }) {
  return (
    <div className="space-y-3 text-[15px] leading-7 text-[#111827]">
      {blocks.map((block, index) => {
        if (block.type === "paragraph") {
          return <p key={index}>{block.text}</p>;
        }
        if (block.type === "list") {
          return (
            <ul key={index} className="list-disc space-y-1 pl-5">
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          );
        }
        return (
          <div
            key={index}
            className="rounded-md border border-amber-400 bg-[#FFFBEB] px-4 py-3 text-[14px] leading-6 text-[#111827]"
          >
            <p className="font-semibold">{block.text}</p>
            {block.emphasis ? (
              <p className="mt-2 text-sm font-medium text-amber-900">{block.emphasis}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
