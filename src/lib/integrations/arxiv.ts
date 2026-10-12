/**
 * arXiv Research Paper Discovery Connector
 * Uses official public arXiv API: http://export.arxiv.org/api/query
 */

export interface ArxivPaper {
  id: string;
  title: string;
  authors: string[];
  summary: string;
  published: string;
  pdfUrl: string;
}

export async function searchArxiv(query: string, maxResults: number = 8): Promise<ArxivPaper[]> {
  try {
    const encoded = encodeURIComponent(`all:${query}`);
    const url = `https://export.arxiv.org/api/query?search_query=${encoded}&start=0&max_results=${maxResults}&sortBy=relevance&sortOrder=descending`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`arXiv API returned HTTP ${res.status}`);
    }

    const xmlText = await res.text();
    // Parse entries from XML
    const entries = xmlText.split("<entry>").slice(1);
    const papers: ArxivPaper[] = entries.map((entry) => {
      const idMatch = entry.match(/<id>(.*?)<\/id>/);
      const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
      const summaryMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/);
      const publishedMatch = entry.match(/<published>(.*?)<\/published>/);

      const authorMatches = [...entry.matchAll(/<author>[\s\S]*?<name>(.*?)<\/name>[\s\S]*?<\/author>/g)];
      const authors = authorMatches.map((m) => m[1]);

      const id = idMatch ? idMatch[1].trim() : "";
      const pdfUrl = id.replace("/abs/", "/pdf/") + ".pdf";

      return {
        id,
        title: titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : "Untitled",
        authors,
        summary: summaryMatch ? summaryMatch[1].replace(/\s+/g, " ").trim() : "",
        published: publishedMatch ? publishedMatch[1].substring(0, 10) : "",
        pdfUrl,
      };
    });

    return papers;
  } catch (err: any) {
    console.error("arXiv search error:", err);
    return [];
  }
}
