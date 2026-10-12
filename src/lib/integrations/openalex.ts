/**
 * OpenAlex Live Research Literature Connector
 * Uses official public OpenAlex API: https://api.openalex.org/works
 */

export interface OpenAlexWork {
  id: string;
  doi: string | null;
  title: string;
  publicationYear: number;
  authors: string[];
  venue: string | null;
  citedByCount: number;
  abstract: string | null;
  openAccessUrl: string | null;
}

export async function searchOpenAlex(query: string, limit: number = 8): Promise<OpenAlexWork[]> {
  try {
    const mailto = process.env.OPENALEX_MAILTO || "student@amahas.internal";
    const encoded = encodeURIComponent(query);
    const url = `https://api.openalex.org/works?search=${encoded}&per-page=${limit}&mailto=${mailto}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": `AMAHAS-StudentOS/1.0 (mailto:${mailto})`,
      },
    });

    if (!res.ok) {
      throw new Error(`OpenAlex returned HTTP ${res.status}`);
    }

    const data = await res.json();
    const results: OpenAlexWork[] = (data.results || []).map((w: any) => {
      // Reconstruct abstract from inverted index if present
      let reconstructedAbstract: string | null = null;
      if (w.abstract_inverted_index) {
        const words: { word: string; pos: number }[] = [];
        for (const [word, positions] of Object.entries(w.abstract_inverted_index)) {
          for (const pos of positions as number[]) {
            words.push({ word, pos });
          }
        }
        words.sort((a, b) => a.pos - b.pos);
        reconstructedAbstract = words.map((item) => item.word).join(" ");
      }

      return {
        id: w.id,
        doi: w.doi || null,
        title: w.title || "Untitled Paper",
        publicationYear: w.publication_year || 0,
        authors: (w.authorships || []).map((a: any) => a.author?.display_name).filter(Boolean),
        venue: w.primary_location?.source?.display_name || null,
        citedByCount: w.cited_by_count || 0,
        abstract: reconstructedAbstract,
        openAccessUrl: w.open_access?.oa_url || null,
      };
    });

    return results;
  } catch (err: any) {
    console.error("OpenAlex search error:", err);
    return [];
  }
}
