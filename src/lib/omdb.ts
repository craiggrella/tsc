import "server-only";

const OMDB_BASE = "https://www.omdbapi.com/";

export type OmdbCandidate = {
  imdbID: string;
  Title: string;
  Year: string;
  Type: string;
  Poster: string;
};

export type OmdbDetail = OmdbCandidate & {
  Plot?: string;
  Response: "True" | "False";
  Error?: string;
};

function key() {
  const k = process.env.OMDB_API_KEY;
  if (!k) throw new Error("OMDB_API_KEY not configured.");
  return k;
}

export async function lookupByTitle(title: string): Promise<OmdbDetail | null> {
  const url = `${OMDB_BASE}?apikey=${key()}&t=${encodeURIComponent(title)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`OMDB title lookup failed: ${res.status}`);
  const data = (await res.json()) as OmdbDetail;
  return data.Response === "True" ? data : null;
}

export async function lookupById(imdbID: string): Promise<OmdbDetail | null> {
  const url = `${OMDB_BASE}?apikey=${key()}&i=${encodeURIComponent(imdbID)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`OMDB id lookup failed: ${res.status}`);
  const data = (await res.json()) as OmdbDetail;
  return data.Response === "True" ? data : null;
}

export async function searchByTitle(title: string): Promise<OmdbCandidate[]> {
  const url = `${OMDB_BASE}?apikey=${key()}&s=${encodeURIComponent(title)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`OMDB search failed: ${res.status}`);
  const data = (await res.json()) as { Search?: OmdbCandidate[]; Response: string };
  return data.Search || [];
}

// Returns null if poster value is "N/A" or missing.
export function cleanPoster(poster: string | undefined): string | null {
  if (!poster || poster === "N/A") return null;
  return poster;
}
