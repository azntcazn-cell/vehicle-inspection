import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

export type PdfImage = { data: Buffer; format: "png" | "jpg" };

export type InspectionPdfData = {
  vehicleTitle: string;
  vin: string;
  plate: string | null;
  buyerName: string | null;
  odometer: number | null;
  inspectorName: string;
  startedAt: string;
  updatedAt: string | null;
  notes: string | null;
  diagram: PdfImage | null;
  diagramLabels: { text: string }[];
  categories: {
    name: string;
    items: {
      label: string;
      status: "pass" | "fail" | "na";
      notes: string | null;
      images: PdfImage[];
      videoCount: number;
    }[];
  }[];
};

const STATUS_LABEL = { pass: "PASS", fail: "FAIL", na: "N/A" } as const;
const STATUS_COLOR = { pass: "#15803d", fail: "#b91c1c", na: "#737373" } as const;

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#171717",
  },
  title: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
  },
  subtitle: {
    fontSize: 10,
    color: "#525252",
    marginTop: 2,
    marginBottom: 14,
  },
  metaBox: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderWidth: 1,
    borderColor: "#d4d4d4",
    borderRadius: 4,
    padding: 10,
    marginBottom: 14,
  },
  metaItem: {
    width: "33%",
    marginBottom: 6,
    paddingRight: 8,
  },
  metaLabel: {
    fontSize: 7,
    color: "#737373",
    textTransform: "uppercase",
    marginBottom: 1,
  },
  metaValue: {
    fontSize: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    marginTop: 12,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderColor: "#d4d4d4",
  },
  diagramImage: {
    width: 300,
    height: 400,
    objectFit: "contain",
    alignSelf: "center",
    marginVertical: 6,
  },
  legendRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  legendNum: {
    width: 16,
    fontFamily: "Helvetica-Bold",
  },
  itemRow: {
    borderBottomWidth: 1,
    borderColor: "#ececec",
    paddingVertical: 5,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  itemLabel: {
    fontSize: 10,
    flex: 1,
    paddingRight: 8,
  },
  itemStatus: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
  itemNotes: {
    fontSize: 9,
    color: "#525252",
    marginTop: 2,
  },
  mediaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
  },
  mediaImage: {
    width: 90,
    height: 90,
    objectFit: "cover",
    borderRadius: 3,
  },
  videoNote: {
    fontSize: 8,
    color: "#737373",
    marginTop: 2,
  },
  overallNotes: {
    fontSize: 10,
    lineHeight: 1.4,
  },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#a3a3a3",
  },
});

export function InspectionPdf({ data }: { data: InspectionPdfData }) {
  return (
    <Document title={`Inspection ${data.vin}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Vehicle Inspection Report</Text>
        <Text style={styles.subtitle}>
          {data.vehicleTitle} — {data.vin}
        </Text>

        <View style={styles.metaBox}>
          <Meta label="Vehicle" value={data.vehicleTitle} />
          <Meta label="VIN" value={data.vin} />
          <Meta label="Plate" value={data.plate ?? "—"} />
          <Meta label="Buyer" value={data.buyerName ?? "—"} />
          <Meta
            label="Odometer"
            value={data.odometer != null ? String(data.odometer) : "—"}
          />
          <Meta label="Inspector" value={data.inspectorName} />
          <Meta
            label="Inspection date"
            value={new Date(data.startedAt).toLocaleString("en-US")}
          />
          {data.updatedAt && (
            <Meta
              label="Last edited"
              value={new Date(data.updatedAt).toLocaleString("en-US")}
            />
          )}
        </View>

        {data.diagram && (
          <View>
            <Text style={styles.sectionTitle}>Vehicle Diagram</Text>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={data.diagram} style={styles.diagramImage} />
            {data.diagramLabels.map((label, i) => (
              <View key={i} style={styles.legendRow}>
                <Text style={styles.legendNum}>{i + 1}.</Text>
                <Text>{label.text}</Text>
              </View>
            ))}
          </View>
        )}

        {data.categories.map((category) => (
          <View key={category.name}>
            <Text style={styles.sectionTitle}>{category.name}</Text>
            {category.items.map((item, i) => (
              <View key={i} style={styles.itemRow} wrap={false}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemLabel}>{item.label}</Text>
                  <Text
                    style={[styles.itemStatus, { color: STATUS_COLOR[item.status] }]}
                  >
                    {STATUS_LABEL[item.status]}
                  </Text>
                </View>
                {item.notes && <Text style={styles.itemNotes}>{item.notes}</Text>}
                {item.images.length > 0 && (
                  <View style={styles.mediaRow}>
                    {item.images.map((img, j) => (
                      // eslint-disable-next-line jsx-a11y/alt-text
                      <Image key={j} src={img} style={styles.mediaImage} />
                    ))}
                  </View>
                )}
                {item.videoCount > 0 && (
                  <Text style={styles.videoNote}>
                    {item.videoCount} video{item.videoCount > 1 ? "s" : ""} attached
                    (viewable in the app)
                  </Text>
                )}
              </View>
            ))}
          </View>
        ))}

        {data.notes && (
          <View>
            <Text style={styles.sectionTitle}>Overall Notes</Text>
            <Text style={styles.overallNotes}>{data.notes}</Text>
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text>
            Inspection report — {data.vin} —{" "}
            {new Date(data.startedAt).toLocaleDateString("en-US")}
          </Text>
          <Text
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}
