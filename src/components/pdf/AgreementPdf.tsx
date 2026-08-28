import { Document, Page, Text, View } from "@react-pdf/renderer";
import {
  COMPANY_READONLY_FIELDS,
  LEGAL_SECTIONS,
  AGREEMENT_INTRO,
  CLIENT_ACCEPTANCE_TEXT,
  COMPANY_ACCEPTANCE_TEXT,
} from "@/config/agreement-content";
import { COMPANY } from "@/config/company";
import { SERVICE_OPTIONS, normalizeSelectedServices } from "@/config/services";
import {
  PdfField,
  PdfLegalBlocks,
  PdfLineField,
  PdfSection,
  pdfStyles,
} from "@/components/pdf/PdfSection";
import { PdfSignature } from "@/components/pdf/PdfSignature";

export type AgreementPdfData = {
  firstName: string;
  lastName: string;
  businessName: string;
  email: string;
  phone: string;
  businessAddress: string;
  taxPeriod: string;
  agreementDate: string;
  businessesCovered: string;
  selectedServices: string[];
  otherService: string;
  serviceDescription: string;
  serviceStartDate: string;
  serviceEndDate: string;
  setupFee: string;
  monthlyFee: string;
  paymentSchedule: string;
  paymentMethod: string;
  clientPrintedName: string;
  clientTitle: string;
  clientSignedDate: string;
  clientSignatureDataUrl: string | null;
  representativeName: string;
  representativeTitle: string;
  representativeDate: string;
  representativeSignatureDataUrl: string | null;
  signedAtLabel: string;
  maskedIp: string;
  fingerprint: string;
};

function sectionByNumber(number: number) {
  return LEGAL_SECTIONS.find((section) => section.number === number);
}

export function AgreementPdf({ data }: { data: AgreementPdfData }) {
  const feesLegal = sectionByNumber(4);
  const legalOnly = LEGAL_SECTIONS.filter((section) => section.number >= 5 && section.number <= 19);

  return (
    <Document
      title={`${COMPANY.brandName} Service Agreement`}
      author={COMPANY.brandName}
      subject="Service Agreement"
    >
      <Page size="LETTER" style={pdfStyles.page}>
        <Text style={pdfStyles.brand}>{COMPANY.brandName.toUpperCase()}</Text>
        <Text style={pdfStyles.title}>SERVICE AGREEMENT</Text>
        <Text style={pdfStyles.intro}>{AGREEMENT_INTRO}</Text>

        <PdfSection number={1} title="CLIENT INFORMATION">
          <View style={pdfStyles.row}>
            <PdfField label="Client First Name" value={data.firstName} />
            <PdfField label="Client Last Name" value={data.lastName} />
          </View>
          <View style={pdfStyles.row}>
            <PdfField label="Business Name (if applicable)" value={data.businessName} />
            <PdfField label="Email" value={data.email} />
          </View>
          <View style={pdfStyles.row}>
            <PdfField label="Phone" value={data.phone} />
            <PdfField label="Tax Year(s) / Period Covered" value={data.taxPeriod} />
          </View>
          <View style={pdfStyles.row}>
            <PdfField label="Business Address" value={data.businessAddress} />
            <PdfField label="Agreement Date" value={data.agreementDate} />
          </View>
          <PdfLineField label="Businesses Covered" value={data.businessesCovered} />
        </PdfSection>

        <PdfSection number={2} title="UNIFIED TAX GROUP INFORMATION">
          {COMPANY_READONLY_FIELDS.map((field) => (
            <PdfLineField key={field.label} label={field.label} value={field.value} />
          ))}
        </PdfSection>

        <PdfSection number={3} title="SELECTED SERVICES">
          <Text style={{ ...pdfStyles.paragraph, color: "#475569" }}>
            Please select all services included under this Agreement:
          </Text>
          <View style={pdfStyles.checkboxRow}>
            {SERVICE_OPTIONS.map((service) => {
              const checked = normalizeSelectedServices(data.selectedServices).includes(service.id);
              return (
                <View key={service.id} style={pdfStyles.checkboxItem}>
                  <View style={pdfStyles.box}>
                    <Text style={pdfStyles.checked}>{checked ? "X" : " "}</Text>
                  </View>
                  <Text>{service.label}</Text>
                </View>
              );
            })}
          </View>
          <View style={pdfStyles.row}>
            <PdfField label="Other Service" value={data.otherService} />
            <PdfField label="Service Start Date" value={data.serviceStartDate} />
          </View>
          <View style={pdfStyles.row}>
            <PdfField label="Service Description / Notes" value={data.serviceDescription} />
            <PdfField label="Service End Date" value={data.serviceEndDate} />
          </View>
        </PdfSection>

        <PdfSection number={4} title="FEES & PAYMENT TERMS">
          <View style={pdfStyles.row}>
            <PdfField label="Total Cost / Setup Fee" value={data.setupFee} />
            <PdfField label="Monthly Fee (if applicable)" value={data.monthlyFee} />
          </View>
          <View style={pdfStyles.row}>
            <PdfField label="Payment Schedule" value={data.paymentSchedule} />
            <PdfField label="Payment Method" value={data.paymentMethod} />
          </View>
          {feesLegal ? <PdfLegalBlocks blocks={feesLegal.blocks} /> : null}
        </PdfSection>

        {legalOnly.map((section) => (
          <View key={section.id} wrap={section.number !== 15}>
            <View style={pdfStyles.sectionHeader}>
              <Text style={pdfStyles.sectionTitle}>
                {section.number}. {section.title}
              </Text>
            </View>
            <PdfLegalBlocks blocks={section.blocks} />
          </View>
        ))}

        <View wrap={false} style={{ flexDirection: "row", gap: 16, marginTop: 10 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <PdfSection number={20} title="CLIENT ACCEPTANCE">
              <Text style={pdfStyles.paragraph}>{CLIENT_ACCEPTANCE_TEXT}</Text>
              <PdfSignature label="CLIENT SIGNATURE" dataUrl={data.clientSignatureDataUrl} />
              <PdfLineField label="PRINTED NAME" value={data.clientPrintedName} />
              <PdfLineField label="TITLE (IF SIGNING FOR A BUSINESS)" value={data.clientTitle} />
              <PdfLineField label="DATE" value={data.clientSignedDate} />
            </PdfSection>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <PdfSection number={21} title="UNIFIED TAX GROUP ACCEPTANCE">
              <Text style={pdfStyles.paragraph}>{COMPANY_ACCEPTANCE_TEXT}</Text>
              <PdfSignature
                label="AUTHORIZED REPRESENTATIVE SIGNATURE"
                dataUrl={data.representativeSignatureDataUrl}
              />
              <PdfLineField label="PRINTED NAME" value={data.representativeName} />
              <PdfLineField label="TITLE" value={data.representativeTitle} />
              <PdfLineField label="DATE" value={data.representativeDate} />
            </PdfSection>
          </View>
        </View>

        <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingTop: 8 }}>
          <Text style={{ fontFamily: "Times-Bold", marginBottom: 4 }}>Electronic Signing Record</Text>
          <Text>Electronically signed: {data.signedAtLabel}</Text>
          <Text>IP Address: {data.maskedIp}</Text>
          <Text>Document fingerprint (SHA-256): {data.fingerprint}</Text>
        </View>

        <View style={pdfStyles.footer} fixed>
          <Text>
            {COMPANY.brandName} · {COMPANY.legalName}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
