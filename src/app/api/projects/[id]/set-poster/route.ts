import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { lookupById, cleanPoster } from "@/lib/omdb";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { imdb_id } = body as { imdb_id?: string };

  if (!imdb_id) {
    return NextResponse.json({ error: "imdb_id required." }, { status: 400 });
  }

  try {
    const detail = await lookupById(imdb_id);
    if (!detail) {
      return NextResponse.json({ error: "OMDB returned no record for that ID." }, { status: 404 });
    }
    const poster = cleanPoster(detail.Poster);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { error } = await supabase
      .from("projects")
      .update({
        imdb_id: detail.imdbID,
        poster_url: poster,
        poster_fetched_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      poster_url: poster,
      imdb_id: detail.imdbID,
      title: detail.Title,
      year: detail.Year,
    });
  } catch (err) {
    console.error("set-poster failed:", err);
    const msg = err instanceof Error ? err.message : "Failed to set poster.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
