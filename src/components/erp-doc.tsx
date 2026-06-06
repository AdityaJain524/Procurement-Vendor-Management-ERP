// React PDF document for a purchase order or invoice.
import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, color: "#0f1b3d", fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 2, borderBottomColor: "#0f1b3d", paddingBottom: 12, marginBottom: 16 },
  brand: { fontSize: 18, fontWeight: 700, color: "#0f1b3d" },
  brandSub: { fontSize: 9, color: "#6b7280", marginTop: 2 },
  title: { fontSize: 20, fontWeight: 700, textAlign: "right" },
  meta: { fontSize: 9, color: "#6b7280", textAlign: "right", marginTop: 4 },
  section: { marginTop: 14 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  block: { flex: 1 },
  label: { fontSize: 8, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  value: { fontSize: 11, fontWeight: 600 },
  table: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 4, marginTop: 14 },
  th: { flexDirection: "row", backgroundColor: "#f3f4f6", padding: 8, fontSize: 9, fontWeight: 700 },
  td: { flexDirection: "row", padding: 8, fontSize: 10, borderTopWidth: 1, borderTopColor: "#e5e7eb" },
  col1: { flex: 3 }, col2: { flex: 1, textAlign: "right" }, col3: { flex: 1, textAlign: "right" }, col4: { flex: 1.2, textAlign: "right" },
  totals: { marginTop: 14, alignSelf: "flex-end", width: 240 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, fontSize: 10 },
  grand: { borderTopWidth: 1, borderTopColor: "#0f1b3d", paddingTop: 6, marginTop: 6, fontWeight: 700, fontSize: 12 },
  foot: { marginTop: 36, fontSize: 8, color: "#9ca3af", textAlign: "center" },
});

type DocProps = {
  kind: "PO" | "INVOICE";
  number: string;
  date: string;
  vendor: { name: string; gst?: string | null; address?: string | null; email?: string };
  items: { description: string; qty: number; rate: number }[];
  subtotal: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  total: number;
  terms?: string;
};

export function ErpDoc(p: DocProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>VendorBridge</Text>
            <Text style={styles.brandSub}>Procurement & Vendor Management ERP</Text>
          </View>
          <View>
            <Text style={styles.title}>{p.kind === "PO" ? "PURCHASE ORDER" : "TAX INVOICE"}</Text>
            <Text style={styles.meta}>{p.number}</Text>
            <Text style={styles.meta}>Date: {p.date}</Text>
          </View>
        </View>

        <View style={[styles.row, styles.section]}>
          <View style={styles.block}>
            <Text style={styles.label}>Vendor</Text>
            <Text style={styles.value}>{p.vendor.name}</Text>
            {p.vendor.gst && <Text>GSTIN: {p.vendor.gst}</Text>}
            {p.vendor.address && <Text>{p.vendor.address}</Text>}
            {p.vendor.email && <Text>{p.vendor.email}</Text>}
          </View>
          <View style={styles.block}>
            <Text style={styles.label}>Billed by</Text>
            <Text style={styles.value}>VendorBridge Pvt Ltd</Text>
            <Text>GSTIN: 29ABCDE1234F2Z5</Text>
            <Text>Mumbai, India</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.th}>
            <Text style={styles.col1}>Description</Text>
            <Text style={styles.col2}>Qty</Text>
            <Text style={styles.col3}>Rate</Text>
            <Text style={styles.col4}>Amount</Text>
          </View>
          {p.items.map((it, i) => (
            <View key={i} style={styles.td}>
              <Text style={styles.col1}>{it.description}</Text>
              <Text style={styles.col2}>{it.qty}</Text>
              <Text style={styles.col3}>₹ {it.rate.toLocaleString("en-IN")}</Text>
              <Text style={styles.col4}>₹ {(it.qty * it.rate).toLocaleString("en-IN")}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}><Text>Subtotal</Text><Text>₹ {p.subtotal.toLocaleString("en-IN")}</Text></View>
          {p.cgst != null && <View style={styles.totalRow}><Text>CGST (9%)</Text><Text>₹ {p.cgst.toLocaleString("en-IN")}</Text></View>}
          {p.sgst != null && <View style={styles.totalRow}><Text>SGST (9%)</Text><Text>₹ {p.sgst.toLocaleString("en-IN")}</Text></View>}
          {p.igst != null && p.igst > 0 && <View style={styles.totalRow}><Text>IGST</Text><Text>₹ {p.igst.toLocaleString("en-IN")}</Text></View>}
          <View style={[styles.totalRow, styles.grand]}><Text>Total</Text><Text>₹ {p.total.toLocaleString("en-IN")}</Text></View>
        </View>

        {p.terms && <View style={styles.section}><Text style={styles.label}>Terms</Text><Text>{p.terms}</Text></View>}
        <Text style={styles.foot}>Generated by VendorBridge • This document is system-generated.</Text>
      </Page>
    </Document>
  );
}

export async function downloadErpDoc(props: DocProps, filename: string) {
  const blob = await pdf(<ErpDoc {...props} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function printErpDoc(props: DocProps) {
  const blob = await pdf(<ErpDoc {...props} />).toBlob();
  const url = URL.createObjectURL(blob);
  const w = window.open(url);
  w?.addEventListener("load", () => { w?.print(); });
}
