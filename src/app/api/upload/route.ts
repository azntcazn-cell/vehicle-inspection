import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Client-side direct-to-Blob uploads. The browser uploads the file straight
// to Vercel Blob and only exchanges a short-lived token with this route, so
// large phone photos/videos never pass through the serverless function (which
// caps request bodies at ~4.5MB and server actions at 1MB).
export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["image/*", "video/*"],
        maximumSizeInBytes: 200 * 1024 * 1024, // 200MB
        addRandomSuffix: true,
      }),
      onUploadCompleted: async () => {
        // No-op — the returned URL is stored with the inspection on submit.
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
