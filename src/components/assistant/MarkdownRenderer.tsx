"use client";

import React, { useState } from "react";
import { Copy, Check, Terminal, ExternalLink } from "lucide-react";
import { decodeHtmlEntities, sanitizeUrl } from "@/lib/format-utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  if (!content) return null;

  // 1. Decode entities
  const decodedContent = decodeHtmlEntities(content);

  // 2. Separate code blocks from normal markdown text
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  const blocks: Array<{ type: "code" | "markdown"; code?: string; lang?: string; text?: string; id?: number }> = [];

  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let counter = 0;

  while ((match = codeBlockRegex.exec(decodedContent)) !== null) {
    if (match.index > lastIdx) {
      blocks.push({
        type: "markdown",
        text: decodedContent.substring(lastIdx, match.index),
      });
    }
    blocks.push({
      type: "code",
      lang: match[1] || "text",
      code: match[2].trim(),
      id: counter++,
    });
    lastIdx = match.index + match[0].length;
  }

  if (lastIdx < decodedContent.length) {
    blocks.push({
      type: "markdown",
      text: decodedContent.substring(lastIdx),
    });
  }

  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(id);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  /**
   * Parse inline markdown (bold, italic, code, links) within a text string.
   */
  const renderInline = (line: string, keyPrefix: string): React.ReactNode => {
    // Regex for inline code: `code`
    // Regex for link: [title](url)
    // Regex for bold: **text**
    // Regex for italic: *text*
    const tokens: React.ReactNode[] = [];
    let remaining = line;
    let idx = 0;

    while (remaining.length > 0) {
      // 1. Inline code: `...`
      const codeMatch = remaining.match(/^`([^`]+)`/);
      if (codeMatch) {
        tokens.push(
          <code
            key={`${keyPrefix}-code-${idx++}`}
            className="px-1.5 py-0.5 rounded bg-black/50 border border-white/10 font-mono text-[11px] text-cyan-300 font-normal"
          >
            {codeMatch[1]}
          </code>
        );
        remaining = remaining.substring(codeMatch[0].length);
        continue;
      }

      // 2. Links: [title](url)
      const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        const title = linkMatch[1];
        const rawUrl = linkMatch[2];
        const safeUrl = sanitizeUrl(rawUrl);
        tokens.push(
          <a
            key={`${keyPrefix}-link-${idx++}`}
            href={safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 underline font-medium transition-colors"
          >
            <span>{title}</span>
            <ExternalLink className="w-3 h-3 inline-block shrink-0 opacity-80" />
          </a>
        );
        remaining = remaining.substring(linkMatch[0].length);
        continue;
      }

      // 3. Bold: **text**
      const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
      if (boldMatch) {
        tokens.push(
          <strong key={`${keyPrefix}-bold-${idx++}`} className="text-white font-semibold">
            {boldMatch[1]}
          </strong>
        );
        remaining = remaining.substring(boldMatch[0].length);
        continue;
      }

      // 4. Italic: *text* (excluding bullets at start)
      const italicMatch = remaining.match(/^\*([^*]+)\*/);
      if (italicMatch) {
        tokens.push(
          <em key={`${keyPrefix}-italic-${idx++}`} className="text-slate-300 italic">
            {italicMatch[1]}
          </em>
        );
        remaining = remaining.substring(italicMatch[0].length);
        continue;
      }

      // 5. Plain text segment up to next special character
      const nextSpecial = remaining.search(/[`*\[]/);
      if (nextSpecial === -1) {
        tokens.push(<span key={`${keyPrefix}-txt-${idx++}`}>{remaining}</span>);
        break;
      } else if (nextSpecial === 0) {
        // Unmatched delimiter, consume 1 char
        tokens.push(<span key={`${keyPrefix}-char-${idx++}`}>{remaining[0]}</span>);
        remaining = remaining.substring(1);
      } else {
        tokens.push(
          <span key={`${keyPrefix}-txt-${idx++}`}>{remaining.substring(0, nextSpecial)}</span>
        );
        remaining = remaining.substring(nextSpecial);
      }
    }

    return tokens;
  };

  /**
   * Render markdown lines (headings, lists, blockquotes, paragraphs)
   */
  const renderMarkdownBlock = (rawText: string, blockIndex: number) => {
    const lines = rawText.split("\n");
    const elements: React.ReactNode[] = [];

    let currentList: React.ReactNode[] = [];
    let listType: "ul" | "ol" | null = null;

    const flushList = () => {
      if (currentList.length > 0 && listType) {
        if (listType === "ul") {
          elements.push(
            <ul key={`ul-${elements.length}`} className="space-y-1 my-1.5 pl-2">
              {currentList}
            </ul>
          );
        } else {
          elements.push(
            <ol key={`ol-${elements.length}`} className="space-y-1 my-1.5 pl-2">
              {currentList}
            </ol>
          );
        }
        currentList = [];
        listType = null;
      }
    };

    lines.forEach((line, lineIdx) => {
      const trimmed = line.trim();

      // Heading 1: # ...
      if (trimmed.startsWith("# ")) {
        flushList();
        elements.push(
          <h1
            key={`h1-${lineIdx}`}
            className="text-base font-bold text-white mt-3 mb-1.5 tracking-tight border-b border-white/10 pb-1"
          >
            {renderInline(trimmed.substring(2), `h1-${lineIdx}`)}
          </h1>
        );
        return;
      }

      // Heading 2: ## ...
      if (trimmed.startsWith("## ")) {
        flushList();
        elements.push(
          <h2
            key={`h2-${lineIdx}`}
            className="text-sm font-bold text-cyan-200 mt-2.5 mb-1 tracking-tight"
          >
            {renderInline(trimmed.substring(3), `h2-${lineIdx}`)}
          </h2>
        );
        return;
      }

      // Heading 3: ### ...
      if (trimmed.startsWith("### ")) {
        flushList();
        elements.push(
          <h3
            key={`h3-${lineIdx}`}
            className="text-xs font-bold text-cyan-300 mt-2 mb-1 uppercase tracking-wider"
          >
            {renderInline(trimmed.substring(4), `h3-${lineIdx}`)}
          </h3>
        );
        return;
      }

      // Heading 4: #### ...
      if (trimmed.startsWith("#### ")) {
        flushList();
        elements.push(
          <h4
            key={`h4-${lineIdx}`}
            className="text-xs font-semibold text-slate-300 mt-1.5 mb-0.5"
          >
            {renderInline(trimmed.substring(5), `h4-${lineIdx}`)}
          </h4>
        );
        return;
      }

      // Blockquote: > ...
      if (trimmed.startsWith("> ")) {
        flushList();
        elements.push(
          <blockquote
            key={`quote-${lineIdx}`}
            className="p-2.5 my-1.5 border-l-2 border-cyan-400 bg-white/[0.02] text-slate-300 italic text-xs rounded-r-lg"
          >
            {renderInline(trimmed.substring(2), `quote-${lineIdx}`)}
          </blockquote>
        );
        return;
      }

      // Unordered list item: - ... or * ... or • ...
      const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
      if (bulletMatch) {
        if (listType !== "ul") {
          flushList();
          listType = "ul";
        }
        currentList.push(
          <li key={`li-${lineIdx}`} className="flex items-start gap-2 text-slate-300 text-xs">
            <span className="text-cyan-400 font-bold select-none">•</span>
            <div className="flex-1">{renderInline(bulletMatch[1], `li-${lineIdx}`)}</div>
          </li>
        );
        return;
      }

      // Ordered list item: 1. ...
      const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
      if (orderedMatch) {
        if (listType !== "ol") {
          flushList();
          listType = "ol";
        }
        currentList.push(
          <li key={`oli-${lineIdx}`} className="flex items-start gap-2 text-slate-300 text-xs">
            <span className="font-mono text-cyan-400 font-semibold text-[11px] select-none">
              {orderedMatch[1]}.
            </span>
            <div className="flex-1">{renderInline(orderedMatch[2], `oli-${lineIdx}`)}</div>
          </li>
        );
        return;
      }

      // Empty line
      if (!trimmed) {
        flushList();
        elements.push(<div key={`sp-${lineIdx}`} className="h-1" />);
        return;
      }

      // Standard paragraph line
      flushList();
      elements.push(
        <p key={`p-${lineIdx}`} className="text-slate-200 text-xs leading-relaxed my-0.5">
          {renderInline(line, `p-${lineIdx}`)}
        </p>
      );
    });

    flushList();

    return (
      <div key={`block-${blockIndex}`} className="space-y-1">
        {elements}
      </div>
    );
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {blocks.map((b, i) => {
        if (b.type === "code") {
          const isCopied = copiedIdx === b.id;
          return (
            <div
              key={i}
              className="my-2.5 rounded-xl bg-black/70 border border-white/10 overflow-hidden font-mono text-[11px] shadow-lg"
            >
              <div className="flex items-center justify-between px-3 py-1.5 bg-white/[0.04] border-b border-white/10 text-slate-400">
                <span className="flex items-center gap-1.5 text-[10px] uppercase font-semibold text-cyan-300 font-mono">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  {b.lang || "code"}
                </span>
                <button
                  onClick={() => copyToClipboard(b.code || "", b.id || 0)}
                  className="flex items-center gap-1 text-[10px] text-slate-300 hover:text-white transition-colors"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 font-semibold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 overflow-x-auto text-slate-200 leading-relaxed">
                <code>{b.code}</code>
              </pre>
            </div>
          );
        }

        return renderMarkdownBlock(b.text || "", i);
      })}
    </div>
  );
}
