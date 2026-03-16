import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/box/client";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folderId = formData.get("folderId") as string | null;

    if (!file || !folderId) {
      return NextResponse.json(
        { error: "Missing file or folderId" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadFile(
      folderId,
      file.name,
      buffer,
      file.type || "application/octet-stream"
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error("Box upload error:", err);
    return NextResponse.json(
      { error: "Failed to upload" },
      { status: 500 }
    );
  }
}
