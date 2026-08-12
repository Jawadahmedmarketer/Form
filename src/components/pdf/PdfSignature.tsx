import { Image, Text, View, StyleSheet } from "@react-pdf/renderer";
import { pdfColors } from "@/components/pdf/PdfSection";

const styles = StyleSheet.create({
  wrap: {
    marginTop: 4,
    marginBottom: 8,
  },
  label: {
    fontSize: 8,
    fontFamily: "Times-Bold",
    color: pdfColors.secondary,
    marginBottom: 3,
  },
  box: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    height: 72,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  image: {
    height: 64,
    objectFit: "contain",
  },
  empty: {
    fontSize: 9,
    color: pdfColors.secondary,
  },
});

export function PdfSignature({
  label,
  dataUrl,
}: {
  label: string;
  dataUrl?: string | null;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.box}>
        {dataUrl ? (
          <Image src={dataUrl} style={styles.image} />
        ) : (
          <Text style={styles.empty}>Signature on file</Text>
        )}
      </View>
    </View>
  );
}
