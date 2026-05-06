import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getExtractedText } from "@/lib/box/client";

// Server-side text extraction for a contract's attached Box file.
// Called fire-and-forget after a contract row's box_file_id changes.
// Stores the extracted text in contracts.extracted_text for later FTS + AI Q&A.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: contract, error: cErr } = await supabase
    .from("contracts")
    .select("id, box_file_id")
    .eq("id", id)
    .single();
  if (cErr || !contract) {
    return NextResponse.json({ error: "Contract not found." }, { status: 404 });
  }
  if (!contract.box_file_id) {
    return NextResponse.json({ error: "No file attached." }, { status: 400 });
  }

  try {
    const text = await getExtractedText(contract.box_file_id);
    await supabase
      .from("contracts")
      .update({ extracted_text: text, extracted_at: new Date().toISOString() })
      .eq("id", id);

    return NextResponse.json({ ok: true, char_count: text?.length ?? 0 });
  } catch (err) {
    console.error("extract-text failed:", err);
    const msg = err instanceof Error ? err.message : "Failed to extract text.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
