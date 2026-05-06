import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Per-contract Q&A. Sends the contract's extracted text + question to Anthropic
// and returns a natural-language answer that quotes the relevant clause.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { question } = body as { question?: string };

  if (!question || question.trim().length < 3) {
    return NextResponse.json({ error: "Question is too short." }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured." }, { status: 500 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: contract } = await supabase
    .from("contracts")
    .select("id, contract_name, extracted_text, client:clients!client_id(full_name)")
    .eq("id", id)
    .single();

  if (!contract?.extracted_text) {
    return NextResponse.json(
      { error: "No contract text available yet. Make sure a file is attached and extraction has finished." },
      { status: 400 }
    );
  }

  const clientName =
    (contract.client as unknown as { full_name?: string } | null)?.full_name || "this client";
  const contractName = contract.contract_name || "the contract";

  const system =
    "You answer questions about entertainment-industry contracts. Be precise. " +
    "Quote the relevant clause verbatim when possible. If the contract doesn't address the question, say so directly. " +
    "Keep answers tight — 1-3 sentences plus the quoted clause.";

  const userMessage = `Question about ${clientName}'s contract (${contractName}): ${question}\n\n--- Contract text ---\n${contract.extracted_text}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Anthropic error:", res.status, errText);
      return NextResponse.json({ error: `Anthropic API error ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    const answer = data.content?.[0]?.text || "";
    return NextResponse.json({ answer, model: data.model });
  } catch (err) {
    console.error("ask failed:", err);
    const msg = err instanceof Error ? err.message : "Failed to ask.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
