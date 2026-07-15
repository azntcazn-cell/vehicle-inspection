import { createElement, type ReactElement } from "react";
import { eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  inspections,
  vehicles,
  users,
  inspectionResults,
  checklistItems,
  inspectionMedia,
} from "@/db/schema";
import {
  InspectionPdf,
  type InspectionPdfData,
  type PdfImage,
} from "@/lib/inspection-pdf";

// Embedding remote images can take a while on large inspections.
export const maxDuration = 60;

// Fetch an image ourselves and hand react-pdf a raw buffer — its internal
// URL fetcher fails opaquely on some responses, and this lets us skip
// anything that isn't a PNG/JPEG (e.g. HEIC) instead of breaking the PDF.
async function fetchImage(url: string): Promise<PdfImage | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = Buffer.from(await res.arrayBuffer());
    if (data.length > 8 && data[0] === 0x89 && data[1] === 0x50) {
      return { data, format: "png" };
    }
    if (data.length > 3 && data[0] === 0xff && data[1] === 0xd8) {
      return { data, format: "jpg" };
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const inspectionId = Number(id);

  const [inspection] = await db
    .select({
      id: inspections.id,
      odometer: inspections.odometer,
      notes: inspections.notes,
      diagramUrl: inspections.diagramUrl,
      diagramLabels: inspections.diagramLabels,
      startedAt: inspections.startedAt,
      updatedAt: inspections.updatedAt,
      vin: vehicles.vin,
      year: vehicles.year,
      make: vehicles.make,
      model: vehicles.model,
      plate: vehicles.plate,
      inspectorName: users.name,
    })
    .from(inspections)
    .innerJoin(vehicles, eq(inspections.vehicleId, vehicles.id))
    .innerJoin(users, eq(inspections.inspectorId, users.id))
    .where(eq(inspections.id, inspectionId))
    .limit(1);

  if (!inspection) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const results = await db
    .select({
      id: inspectionResults.id,
      status: inspectionResults.status,
      notes: inspectionResults.notes,
      category: checklistItems.category,
      label: checklistItems.label,
      sortOrder: checklistItems.sortOrder,
    })
    .from(inspectionResults)
    .innerJoin(checklistItems, eq(inspectionResults.itemId, checklistItems.id))
    .where(eq(inspectionResults.inspectionId, inspectionId))
    .orderBy(checklistItems.sortOrder);

  const media =
    results.length > 0
      ? await db
          .select()
          .from(inspectionMedia)
          .where(
            inArray(
              inspectionMedia.resultId,
              results.map((r) => r.id)
            )
          )
      : [];
  const mediaByResult = media.reduce<Record<number, typeof media>>((acc, m) => {
    (acc[m.resultId] ??= []).push(m);
    return acc;
  }, {});

  // react-pdf fetches images itself, so local-disk fallback URLs
  // (/uploads/...) must be absolute.
  const origin = new URL(request.url).origin;
  const absolutize = (url: string) =>
    url.startsWith("http") ? url : `${origin}${url}`;

  let diagramLabels: { text: string }[] = [];
  if (inspection.diagramLabels) {
    try {
      diagramLabels = JSON.parse(inspection.diagramLabels);
    } catch {
      diagramLabels = [];
    }
  }

  const categoryOrder: string[] = [];
  const grouped = new Map<string, InspectionPdfData["categories"][number]["items"]>();
  for (const result of results) {
    if (!grouped.has(result.category)) {
      grouped.set(result.category, []);
      categoryOrder.push(result.category);
    }
    const itemMedia = mediaByResult[result.id] ?? [];
    const imageUrls = itemMedia
      .filter((m) => m.type === "image")
      .map((m) => absolutize(m.url));
    const images = (await Promise.all(imageUrls.map(fetchImage))).filter(
      (img): img is PdfImage => img !== null
    );
    grouped.get(result.category)!.push({
      label: result.label,
      status: result.status,
      notes: result.notes,
      images,
      videoCount: itemMedia.filter((m) => m.type === "video").length,
    });
  }

  const diagram = inspection.diagramUrl
    ? await fetchImage(absolutize(inspection.diagramUrl))
    : null;

  const data: InspectionPdfData = {
    vehicleTitle:
      [inspection.year, inspection.make, inspection.model]
        .filter(Boolean)
        .join(" ") || "Vehicle",
    vin: inspection.vin,
    plate: inspection.plate,
    odometer: inspection.odometer,
    inspectorName: inspection.inspectorName,
    startedAt: inspection.startedAt,
    updatedAt: inspection.updatedAt,
    notes: inspection.notes,
    diagram,
    diagramLabels,
    categories: categoryOrder.map((name) => ({
      name,
      items: grouped.get(name)!,
    })),
  };

  const buffer = await renderToBuffer(
    createElement(InspectionPdf, { data }) as unknown as ReactElement<DocumentProps>
  );

  const dateSlug = inspection.startedAt.slice(0, 10);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="inspection-${inspection.vin}-${dateSlug}.pdf"`,
    },
  });
}
