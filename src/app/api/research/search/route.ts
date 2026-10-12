import { NextResponse } from "next/server";
import { searchOpenAlex } from "@/lib/integrations/openalex";
import { searchArxiv } from "@/lib/integrations/arxiv";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const source = searchParams.get("source") || "both"; // "openalex" | "arxiv" | "both"

    if (!query.trim()) {
      return NextResponse.json({ papers: [] });
    }

    let openAlexResults: any[] = [];
    let arxivResults: any[] = [];

    if (source === "openalex" || source === "both") {
      openAlexResults = await searchOpenAlex(query, 6);
    }
    if (source === "arxiv" || source === "both") {
      arxivResults = await searchArxiv(query, 6);
    }

    const unifiedPapers = [
      ...openAlexResults.map((p) => ({
        ...p,
        source: "OpenAlex",
      })),
      ...arxivResults.map((p) => ({
        id: p.id,
        title: p.title,
        authors: p.authors,
        publicationYear: p.published ? parseInt(p.published.substring(0, 4), 10) : 2024,
        abstract: p.summary,
        venue: "arXiv Preprint",
        openAccessUrl: p.pdfUrl,
        doi: null,
        source: "arXiv",
      })),
    ];

    return NextResponse.json({ papers: unifiedPapers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
