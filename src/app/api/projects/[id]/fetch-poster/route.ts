import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { lookupByTitle, lookupById, searchByTitle, cleanPoster } from "@/lib/omdb";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const customQuery = (body as { q?: string }).q?.trim();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: project, error: projectErr } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", id)
    .single();

  if (projectErr || !project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const lookupName = customQuery || project.name;

  try {
    // 1) Try exact title.
    const direct = await lookupByTitle(lookupName);
    if (direct) {
      const poster = cleanPoster(direct.Poster);
      await supabase
        .from("projects")
        .update({
          imdb_id: direct.imdbID,
          poster_url: poster,
          poster_fetched_at: new Date().toISOString(),
        })
        .eq("id", id);
      return NextResponse.json({
        matched: true,
        poster_url: poster,
        imdb_id: direct.imdbID,
        title: direct.Title,
        year: direct.Year,
      });
    }

    // 2) Search fallback.
    const candidates = await searchByTitle(lookupName);

    if (candidates.length === 0) {
      // Mark as attempted so we don't auto-retry.
      await supabase
        .from("projects")
        .update({ poster_fetched_at: new Date().toISOString() })
        .eq("id", id);
      return NextResponse.json({ matched: false, candidates: [] });
    }

    if (candidates.length === 1) {
      const only = await lookupById(candidates[0].imdbID);
      if (only) {
        const poster = cleanPoster(only.Poster);
        await supabase
          .from("projects")
          .update({
            imdb_id: only.imdbID,
            poster_url: poster,
            poster_fetched_at: new Date().toISOString(),
          })
          .eq("id", id);
        return NextResponse.json({
          matched: true,
          poster_url: poster,
          imdb_id: only.imdbID,
          title: only.Title,
          year: only.Year,
        });
      }
    }

    // Multiple candidates — let the user pick.
    return NextResponse.json({
      matched: false,
      candidates: candidates.map((c) => ({
        imdbID: c.imdbID,
        Title: c.Title,
        Year: c.Year,
        Type: c.Type,
        Poster: cleanPoster(c.Poster),
      })),
    });
  } catch (err) {
    console.error("fetch-poster failed:", err);
    const msg = err instanceof Error ? err.message : "Failed to fetch poster.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
