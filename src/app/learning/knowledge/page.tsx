"use client";

import React, { useState } from "react";
import { Globe2, Search, ExternalLink, Sparkles, BookOpen } from "lucide-react";

export default function KnowledgePage() {
  const [query, setQuery] = useState("Computer architecture");
  const [articles, setArticles] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);

    try {
      const res = await fetch(`/api/learning?wiki=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.articles) setArticles(data.articles);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2.5">
            <Globe2 className="w-6 h-6 text-blue-400" />
            General Knowledge &amp; Concepts
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Encyclopedic concept lookup with official MediaWiki API attribution.
          </p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Wikipedia concepts (e.g. Von Neumann architecture, Shannon entropy)..."
            className="w-full bg-[#0b1120] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-400"
          />
        </div>
        <button
          type="submit"
          disabled={searching}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-md shadow-blue-600/20 disabled:opacity-50"
        >
          {searching ? "Searching..." : "Lookup Concept"}
        </button>
      </form>

      {articles.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-semibold text-slate-400">
            Wikipedia Encyclopedia Results ({articles.length})
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {articles.map((art) => (
              <div
                key={art.pageid}
                className="p-4 rounded-xl bg-[#0b1120] border border-white/5 hover:border-white/15 transition-all space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-white">{art.title}</h3>
                  <a
                    href={art.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:underline text-[11px] flex items-center gap-1 shrink-0"
                  >
                    Wikipedia <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                  {art.snippet}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
