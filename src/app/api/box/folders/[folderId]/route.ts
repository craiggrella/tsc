import { NextRequest, NextResponse } from "next/server";
import { listFolder, getFolderInfo } from "@/lib/box/client";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const { folderId } = await params;
    const [items, info] = await Promise.all([
      listFolder(folderId),
      getFolderInfo(folderId),
    ]);
    return NextResponse.json({ items: items.entries || [], folder: info });
  } catch (err) {
    console.error("Box folder error:", err);
    return NextResponse.json(
      { error: "Failed to list folder" },
      { status: 500 }
    );
  }
}
