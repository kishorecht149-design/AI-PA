/**
 * Wikipedia & Wikidata Knowledge Discovery Connector
 * Uses official MediaWiki Action API
 */

export interface WikiArticle {
  title: string;
  snippet: string;
  pageid: number;
  url: string;
}

export async function searchWikipedia(query: string): Promise<WikiArticle[]> {
  try {
    const encoded = encodeURIComponent(query);
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encoded}&format=json&origin=*&utf8=1`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Wikipedia returned HTTP ${res.status}`);
    }

    const data = await res.json();
    const items = data.query?.search || [];

    return items.map((item: any) => ({
      title: item.title,
      snippet: item.snippet.replace(/<\/?[^>]+(>|$)/g, ""), // Strip HTML tags
      pageid: item.pageid,
      url: `https://en.wikipedia.org/?curid=${item.pageid}`,
    }));
  } catch (err: any) {
    console.error("Wikipedia search error:", err);
    return [];
  }
}
