import { Document, Link, Page, Text, StyleSheet } from "@react-pdf/renderer";
import { COMPANY } from "@/config/company";

const styles = StyleSheet.create({
  page: {
    paddingTop: 72,
    paddingBottom: 64,
    paddingHorizontal: 56,
    fontFamily: "Helvetica",
    color: "#111827",
  },
  mark: {
    width: 36,
    height: 36,
    backgroundColor: "#1e3a8a",
    color: "#ffffff",
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    paddingTop: 8,
    marginBottom: 12,
  },
  brand: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#1e3a8a",
    marginBottom: 28,
  },
  heading: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    marginBottom: 14,
  },
  body: {
    fontSize: 12,
    lineHeight: 1.5,
    color: "#334155",
    marginBottom: 28,
  },
  button: {
    backgroundColor: "#1e3a8a",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 4,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    textDecoration: "underline",
  },
  url: {
    marginTop: 12,
    fontSize: 9,
    color: "#64748b",
    textAlign: "center",
  },
});

export function SigningCoverPdf({ signingUrl }: { signingUrl: string }) {
  return (
    <Document
      title={`${COMPANY.brandName} Service Agreement`}
      author={COMPANY.brandName}
      subject="Service Agreement — Action Required"
    >
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.mark}>U</Text>
        <Text style={styles.brand}>{COMPANY.brandName}</Text>
        <Text style={styles.heading}>Service Agreement — Action Required</Text>
        <Text style={styles.body}>Please click below to review and sign your service agreement.</Text>
        <Link src={signingUrl} style={styles.button}>
          <Text style={styles.buttonText}>Click here to sign your agreement</Text>
        </Link>
        <Link src={signingUrl}>
          <Text style={styles.url}>{signingUrl}</Text>
        </Link>
      </Page>
    </Document>
  );
}
