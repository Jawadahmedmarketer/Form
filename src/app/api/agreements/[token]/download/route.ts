import { NextResponse } from "next/server";
import { downloadSignedPdf, getAgreementAccessState, getAgreementByToken } from "@/lib/agreement";
import { isLikelyToken } from "@/lib/tokens";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  if (!isLikelyToken(token)) {
    return NextResponse.json({ error: "Invalid agreement link." }, { status: 400 });
  }

  const row = await getAgreementByToken(token);
  if (!row || getAgreementAccessState(row) !== "signed" || !row.pdf_path) {
    return NextResponse.json({ error: "Signed agreement not available." }, { status: 404 });
  }

  const pdf = await downloadSignedPdf(row.pdf_path);
  const filename = row.pdf_filename || "Unified-Tax-Group-Service-Agreement.pdf";

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
