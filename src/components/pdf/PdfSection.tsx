import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "@react-pdf/renderer";

export const pdfColors = {
  text: "#111827",
  secondary: "#475569",
  border: "#e5e7eb",
  sectionBg: "#f3f4f6",
  blue: "#2563EB",
  calloutBg: "#FFFBEB",
  calloutBorder: "#F59E0B",
  inputBg: "#f8fafc",
};

export const pdfStyles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 42,
    fontFamily: "Times-Roman",
    fontSize: 10,
    color: pdfColors.text,
    lineHeight: 1.45,
  },
  brand: {
    textAlign: "center",
    fontSize: 11,
    letterSpacing: 3,
    fontFamily: "Times-Bold",
    color: pdfColors.text,
  },
  title: {
    textAlign: "center",
    fontSize: 18,
    marginTop: 8,
    marginBottom: 10,
    fontFamily: "Times-Bold",
  },
  intro: {
    fontSize: 10,
    color: pdfColors.secondary,
    marginBottom: 14,
    textAlign: "justify",
  },
  sectionHeader: {
    backgroundColor: pdfColors.sectionBg,
    borderLeftWidth: 4,
    borderLeftColor: pdfColors.blue,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Times-Bold",
    color: "#2563EB",
  },
  paragraph: {
    marginBottom: 6,
    textAlign: "justify",
  },
  listItem: {
    marginBottom: 3,
    paddingLeft: 10,
  },
  callout: {
    backgroundColor: pdfColors.calloutBg,
    borderWidth: 1,
    borderColor: pdfColors.calloutBorder,
    padding: 8,
    marginBottom: 8,
  },
  calloutText: {
    fontFamily: "Times-Bold",
    fontSize: 9.5,
  },
  row: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 6,
    alignItems: "flex-start",
  },
  field: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  label: {
    fontSize: 8,
    color: pdfColors.secondary,
    marginBottom: 2,
    fontFamily: "Times-Bold",
  },
  valueBox: {
    backgroundColor: pdfColors.inputBg,
    borderWidth: 1,
    borderColor: pdfColors.border,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  checkboxRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 6,
  },
  checkboxItem: {
    width: "50%",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  box: {
    width: 9,
    height: 9,
    borderWidth: 1,
    borderColor: "#334155",
    marginRight: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  checked: {
    fontSize: 8,
    fontFamily: "Times-Bold",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 42,
    right: 42,
    fontSize: 8,
    color: pdfColors.secondary,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

export function PdfSection({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children?: ReactNode;
}) {
  return (
    <View>
      <View style={pdfStyles.sectionHeader}>
        <Text style={pdfStyles.sectionTitle}>
          {number}. {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

export function PdfField({ label, value }: { label: string; value?: string | null }) {
  return (
    <View wrap={false} style={pdfStyles.field}>
      <Text style={pdfStyles.label}>{label}</Text>
      <View style={pdfStyles.valueBox}>
        <Text style={{ width: "100%" }}>{value || " "}</Text>
      </View>
    </View>
  );
}

export function PdfLineField({ label, value }: { label: string; value?: string | null }) {
  return (
    <View wrap={false} style={{ marginBottom: 8, width: "100%" }}>
      <Text style={pdfStyles.label}>{label}</Text>
      <View style={pdfStyles.valueBox}>
        <Text style={{ width: "100%" }}>{value || " "}</Text>
      </View>
    </View>
  );
}

export function PdfLegalBlocks({
  blocks,
}: {
  blocks: Array<
    | { type: "paragraph"; text: string }
    | { type: "list"; items: string[] }
    | { type: "columns"; items: string[] }
    | { type: "callout"; text: string; emphasis?: string }
  >;
}) {
  return (
    <View>
      {blocks.map((block, index) => {
        if (block.type === "paragraph") {
          return (
            <Text key={index} style={pdfStyles.paragraph}>
              {block.text}
            </Text>
          );
        }
        if (block.type === "list" || block.type === "columns") {
          return (
            <View key={index}>
              {block.items.map((item) => (
                <Text key={item} style={pdfStyles.listItem}>
                  • {item}
                </Text>
              ))}
            </View>
          );
        }
        return (
          <View key={index} style={pdfStyles.callout}>
            <Text style={pdfStyles.calloutText}>{block.text}</Text>
          </View>
        );
      })}
    </View>
  );
}
