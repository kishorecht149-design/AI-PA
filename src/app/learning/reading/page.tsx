"use client";

import React, { useState, useEffect } from "react";
import { Headphones, Book, CheckCircle2, Plus, Star } from "lucide-react";

interface BookItem {
  id: string;
  title: string;
  author: string;
  format: string;
  totalUnits: number;
  completedUnits: number;
  status: string;
  rating: number | null;
}

export default function ReadingPage() {
  const [books, setBooks] = useState<BookItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/learning")
      .then((r) => r.json())
      .then((d) => {
        if (d.books) setBooks(d.books);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2.5">
            <Headphones className="w-6 h-6 text-emerald-400" />
            Reading &amp; Audiobooks Library
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Progress tracking across engineering textbooks, monographs, and audiobooks.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-500">Loading library...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {books.map((b) => {
            const pct =
              b.totalUnits > 0
                ? Math.round((b.completedUnits / b.totalUnits) * 100)
                : 0;
            return (
              <div
                key={b.id}
                className="p-5 rounded-2xl bg-[#0b1120] border border-white/5 space-y-3"
              >
                <div className="flex items-center justify-between text-[10px] font-mono uppercase text-emerald-400">
                  <span>{b.format}</span>
                  <span className="text-slate-400">{b.status}</span>
                </div>

                <div>
                  <h2 className="text-sm font-bold text-white line-clamp-1">
                    {b.title}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">By {b.author}</p>
                </div>

                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Reading Progress</span>
                    <span className="font-semibold text-emerald-300">
                      {b.completedUnits} / {b.totalUnits} Units ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
