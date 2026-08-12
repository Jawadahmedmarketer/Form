import { COMPANY } from "@/config/company";
import { getAppUrl } from "@/lib/agreement";
import { logError, logInfo, logWarn } from "@/lib/logger";

type SignedEmailInput = {
  to: string;
  clientName: string;
  filename: string;
  pdf: Buffer;
  recordUrl: string;
};

export async function sendSignedAgreementEmail(input: SignedEmailInput) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() || `${COMPANY.brandName} <${COMPANY.email}>`;

  if (!apiKey) {
    logWarn("email.skipped_missing_config");
    return { skipped: true as const };
  }

  logInfo("email.send_started");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      reply_to: COMPANY.email,
      subject: `Your signed ${COMPANY.brandName} Service Agreement`,
      html: `
        <p>Hello ${input.clientName},</p>
        <p>Thank you for signing the ${COMPANY.brandName} Service Agreement. A PDF copy is attached for your records.</p>
        <p>You can also view the permanent signed record here:<br />
        <a href="${input.recordUrl}">${input.recordUrl}</a></p>
        <p>If you have questions, contact us at ${COMPANY.email} or ${COMPANY.phone}.</p>
        <p>${COMPANY.brandName}<br />${COMPANY.legalName}</p>
      `,
      attachments: [
        {
          filename: input.filename,
          content: input.pdf.toString("base64"),
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    logError("email.send_failed", { message: text.slice(0, 300) });
    throw new Error("Unable to send the signed agreement email.");
  }

  logInfo("email.sent");
  return { skipped: false as const };
}

export function signedRecordUrl(token: string) {
  return `${getAppUrl()}/agreement/${token}/completed`;
}
