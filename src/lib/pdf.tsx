import { renderToBuffer } from "@react-pdf/renderer";
import { AgreementPdf, type AgreementPdfData } from "@/components/pdf/AgreementPdf";
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
