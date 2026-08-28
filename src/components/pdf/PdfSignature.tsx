import { Image, Text, View, StyleSheet } from "@react-pdf/renderer";
import { pdfColors } from "@/components/pdf/PdfSection";

const styles = StyleSheet.create({
  wrap: {
    marginTop: 3,
    marginBottom: 6,
  },
  label: {
    fontSize: 8,
    fontFamily: "Times-Bold",
    color: pdfColors.secondary,
    marginBottom: 2,
  },
  box: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },
  image: {
    width: "90%",
    height: 40,
    objectFit: "contain",
  },
  empty: {
    fontSize: 8.5,
    color: pdfColors.secondary,
  },
});

export function PdfSignature({
  label,
  dataUrl,
  emptyLabel = "Signature on file",
}: {
  label: string;
  dataUrl?: string | null;
  emptyLabel?: string;
}) {
  return (
    <View style={styles.wrap} wrap={false}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.box}>
        {dataUrl ? (
          <Image src={dataUrl} style={styles.image} />
        ) : (
          <Text style={styles.empty}>{emptyLabel}</Text>
        )}
      </View>
    </View>
  );
}
