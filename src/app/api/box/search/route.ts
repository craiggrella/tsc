import { NextRequest, NextResponse } from "next/server";
import { searchFiles } from "@/lib/box/client";

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q");
    const folderId = request.nextUrl.searchParams.get("folder") || undefined;

    if (!query) {
      return NextResponse.json({ error: "Missing query parameter" }, { status: 400 });
    }

    const results = await searchFiles(query, folderId);
    return NextResponse.json({ entries: results.entries || [] });
  } catch (err) {
    console.error("Box search error:", err);
    return NextResponse.json(
      { error: "Failed to search" },
      { status: 500 }
    );
  }
}
