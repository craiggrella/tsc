import { NextRequest, NextResponse } from "next/server";
import { getPreviewUrl, getDownloadUrl } from "@/lib/box/client";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    // Try embed link first, fall back to download URL
    let previewUrl = "";
    try {
      previewUrl = await getPreviewUrl(fileId);
    } catch {
      // embed not available for this file type
    }
    const downloadUrl = await getDownloadUrl(fileId);
    return NextResponse.json({ preview_url: previewUrl, download_url: downloadUrl });
  } catch (err) {
    console.error("Box preview error:", err);
    return NextResponse.json(
      { error: "Failed to get preview" },
      { status: 500 }
    );
  }
}
