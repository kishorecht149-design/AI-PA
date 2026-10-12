"use client";

import React, { useState, useEffect } from "react";
import {
  Languages,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Volume2,
  ChevronRight,
  Filter,
} from "lucide-react";

interface VocabCard {
  id: string;
  language: string;
  word: string;
  translation: string;
  pronunciation: string | null;
  exampleSentence: string | null;
  repetitions: number;
  intervalDays: number;
  nextReviewAt: string;
}

const SUPPORTED_LANGUAGES = [
  "All",
  "German",
  "Japanese",
  "Spanish",
  "French",
  "Sanskrit",
  "Mandarin",
  "Russian",
  "Hindi",
];

export default function LanguagesPage() {
  const [cards, setCards] = useState<VocabCard[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState("All");
  const [loading, setLoading] = useState(true);

  // Active flashcard drill state
  const [activeDrillCard, setActiveDrillCard] = useState<VocabCard | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewResult, setReviewResult] = useState<string | null>(null);

  const fetchCards = async () => {
    try {
      const url =
        selectedLanguage === "All"
          ? "/api/learning"
          : `/api/learning?language=${encodeURIComponent(selectedLanguage)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.vocabularyCards) setCards(data.vocabularyCards);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, [selectedLanguage]);

  const handleRateCard = async (rating: number) => {
    if (!activeDrillCard) return;

    try {
      const res = await fetch("/api/learning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: activeDrillCard.id,
          rating,
        }),
      });

      if (res.ok) {
        setReviewResult(`Recall logged (${rating}/5). SM-2 updated next review interval!`);
        setTimeout(() => {
          setActiveDrillCard(null);
          setIsFlipped(false);
          setReviewResult(null);
          fetchCards();
        }, 1200);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const playPronunciation = (text: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2.5">
            <Languages className="w-6 h-6 text-cyan-400" />
            Language Studio (8 Languages)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            SuperMemo SM-2 spaced repetition flashcards for German, Japanese, Spanish, Sanskrit &amp; more.
          </p>
        </div>

        {cards.length > 0 && (
          <button
            onClick={() => {
              setActiveDrillCard(cards[0]);
              setIsFlipped(false);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition-all shadow-md shadow-cyan-500/20"
          >
            <RotateCcw className="w-4 h-4" /> Start Flashcard Drill
          </button>
        )}
      </div>

      {/* Language Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 text-xs">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <button
            key={lang}
            onClick={() => setSelectedLanguage(lang)}
            className={`px-3 py-1.5 rounded-xl border whitespace-nowrap transition-colors ${
              selectedLanguage === lang
                ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300 font-semibold"
                : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10"
            }`}
          >
            {lang}
          </button>
        ))}
      </div>

      {/* Active Drill Card Modal */}
      {activeDrillCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-[#0b1120] border border-cyan-500/30 rounded-2xl p-6 md:p-8 text-center shadow-2xl space-y-6">
            <span className="text-[10px] uppercase font-mono px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
              {activeDrillCard.language} Spaced Repetition
            </span>

            {/* Front of Card */}
            <div className="py-6 space-y-3">
              <div className="text-3xl font-extrabold text-white">
                {activeDrillCard.word}
              </div>
              {activeDrillCard.pronunciation && (
                <div className="flex items-center justify-center gap-2 text-xs text-slate-400 font-mono">
                  <span>/{activeDrillCard.pronunciation}/</span>
                  <button
                    onClick={() => playPronunciation(activeDrillCard.word)}
                    className="p-1 rounded hover:bg-white/10 text-cyan-400"
                    title="Audio Pronunciation"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Flipped Answer Area */}
            {isFlipped ? (
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2 text-left animate-in fade-in">
                <div className="text-xs text-slate-400 uppercase font-semibold">
                  Translation:
                </div>
                <div className="text-base font-bold text-emerald-400">
                  {activeDrillCard.translation}
                </div>
                {activeDrillCard.exampleSentence && (
                  <div className="text-xs text-slate-300 italic pt-2 border-t border-white/5">
                    &ldquo;{activeDrillCard.exampleSentence}&rdquo;
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setIsFlipped(true)}
                className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold transition-colors"
              >
                Reveal Meaning &amp; Example
              </button>
            )}

            {/* Rating Buttons after flip */}
            {isFlipped && (
              <div className="space-y-2 pt-2">
                <div className="text-[11px] text-slate-400">
                  Rate Recall Confidence (1 = Blackout, 5 = Flawless)
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      onClick={() => handleRateCard(val)}
                      className="py-2 rounded-xl bg-white/5 hover:bg-cyan-500 hover:text-black text-xs font-bold transition-all text-slate-200"
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {reviewResult && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-300 text-xs flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>{reviewResult}</span>
              </div>
            )}

            <button
              onClick={() => setActiveDrillCard(null)}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              Close Drill
            </button>
          </div>
        </div>
      )}

      {/* Vocabulary Cards Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-500">Loading cards...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {cards.map((c) => (
            <div
              key={c.id}
              className="p-4 rounded-xl bg-[#0b1120] border border-white/5 hover:border-white/15 transition-all space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/5 text-cyan-400 font-bold">
                  {c.language}
                </span>
                <span className="text-[10px] text-slate-500">
                  Repetitions: {c.repetitions}
                </span>
              </div>

              <div className="text-sm font-bold text-white">{c.word}</div>
              <div className="text-xs text-emerald-400 font-medium">
                {c.translation}
              </div>

              {c.exampleSentence && (
                <p className="text-[11px] text-slate-400 line-clamp-1 italic">
                  &ldquo;{c.exampleSentence}&rdquo;
                </p>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px] text-slate-500">
                <span>Interval: {c.intervalDays}d</span>
                <button
                  onClick={() => {
                    setActiveDrillCard(c);
                    setIsFlipped(false);
                  }}
                  className="text-cyan-400 hover:underline flex items-center gap-0.5 font-medium"
                >
                  Drill <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
