import { NextRequest, NextResponse } from "next/server";
import { getFileInfo, getDownloadUrl } from "@/lib/box/client";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    const [info, downloadUrl] = await Promise.all([
      getFileInfo(fileId),
      getDownloadUrl(fileId),
    ]);
    return NextResponse.json({ ...info, download_url: downloadUrl });
  } catch (err) {
    console.error("Box file error:", err);
    return NextResponse.json(
      { error: "Failed to get file" },
      { status: 500 }
    );
  }
}
