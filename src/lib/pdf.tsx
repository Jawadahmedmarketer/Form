import { renderToBuffer } from "@react-pdf/renderer";
import { AgreementPdf, type AgreementPdfData } from "@/components/pdf/AgreementPdf";
import { SigningCoverPdf } from "@/components/pdf/SigningCoverPdf";
import { getAppUrl } from "@/lib/agreement";
import { logError, logInfo } from "@/lib/logger";

export async function generateAgreementPdf(data: AgreementPdfData) {
  logInfo("pdf.generation_started");
  try {
    const buffer = await renderToBuffer(<AgreementPdf data={data} />);
    logInfo("pdf.generation_completed", { bytes: buffer.byteLength });
    return Buffer.from(buffer);
  } catch (error) {
    logError("pdf.generation_failed", {
      message: error instanceof Error ? error.message : "PDF generation failed",
    });
    throw new Error("Unable to generate the signed agreement PDF.");
  }
}

export async function generateSigningCoverPdf(token: string) {
  const signingUrl = `${getAppUrl()}/agreement/${token}`;
  logInfo("pdf.cover_generation_started");
  try {
    const buffer = await renderToBuffer(<SigningCoverPdf signingUrl={signingUrl} />);
    logInfo("pdf.cover_generation_completed", { bytes: buffer.byteLength });
    return Buffer.from(buffer);
  } catch (error) {
    logError("pdf.cover_generation_failed", {
      message: error instanceof Error ? error.message : "Cover PDF generation failed",
    });
    throw new Error("Unable to generate the signing cover PDF.");
  }
}
