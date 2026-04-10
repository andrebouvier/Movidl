export type OmdbMovieResponse = {
  imdbID?: string;
  Title?: string;
  Year?: string;
  imdbRating?: string;
  Response?: string;
  Error?: string;
};

export async function omdbByImdbId(apiKey: string, imdbId: string): Promise<OmdbMovieResponse> {
  const clean = imdbId.startsWith("tt") ? imdbId : `tt${imdbId}`;
  const url = new URL("https://www.omdbapi.com/");
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("i", clean);
  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) {
    throw new Error(`OMDb failed: ${res.status}`);
  }
  return res.json() as Promise<OmdbMovieResponse>;
}

export function parseImdbRating(raw: string | undefined): number | null {
  if (!raw || raw === "N/A") return null;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}
