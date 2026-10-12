"use client";

import React from "react";

interface MarkdownLatexRendererProps {
  content: string;
  className?: string;
}

/**
 * Converts basic LaTeX formulas into readable formatted math typography.
 * Handles fractions (\frac{a}{b}), superscripts (^2, ^{abc}), subscripts (_1, _{th}),
 * square roots (\sqrt{x}), greek letters, and mathematical symbols.
 */
function renderMathExpression(latex: string, isBlock: boolean = false): React.ReactNode {
  let clean = latex.trim();

  // If empty
  if (!clean) return null;

  // Render fractions
  const fractionRegex = /\\frac\{([^{}]+)\}\{([^{}]+)\}/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Helper to replace greek symbols and common operators
  const replaceSymbols = (str: string) => {
    return str
      .replace(/\\alpha/g, "α")
      .replace(/\\beta/g, "β")
      .replace(/\\gamma/g, "γ")
      .replace(/\\delta/g, "δ")
      .replace(/\\Delta/g, "Δ")
      .replace(/\\epsilon/g, "ε")
      .replace(/\\zeta/g, "ζ")
      .replace(/\\eta/g, "η")
      .replace(/\\theta/g, "θ")
      .replace(/\\lambda/g, "λ")
      .replace(/\\mu/g, "μ")
      .replace(/\\pi/g, "π")
      .replace(/\\rho/g, "ρ")
      .replace(/\\sigma/g, "σ")
      .replace(/\\tau/g, "τ")
      .replace(/\\phi/g, "φ")
      .replace(/\\omega/g, "ω")
      .replace(/\\Omega/g, "Ω")
      .replace(/\\infty/g, "∞")
      .replace(/\\times/g, "×")
      .replace(/\\cdot/g, "·")
      .replace(/\\pm/g, "±")
      .replace(/\\ge/g, "≥")
      .replace(/\\le/g, "≤")
      .replace(/\\neq/g, "≠")
      .replace(/\\approx/g, "≈")
      .replace(/\\int/g, "∫")
      .replace(/\\sum/g, "∑")
      .replace(/\\partial/g, "∂")
      .replace(/\\nabla/g, "∇")
      .replace(/\\sqrt\{([^{}]+)\}/g, "√($1)");
  };

  const renderScriptSub = (text: string): React.ReactNode => {
    // Process superscripts ^x or ^{xyz} and subscripts _x or _{xyz}
    const tokenRegex = /(\^\{[^{}]+\}|\^[0-9a-zA-Z]|\_\{[^{}]+\}|\_[0-9a-zA-Z])/g;
    const tokens = text.split(tokenRegex);

    return tokens.map((tok, i) => {
      if (tok.startsWith("^{") && tok.endsWith("}")) {
        return <sup key={i} className="text-[0.75em] leading-none">{replaceSymbols(tok.slice(2, -1))}</sup>;
      }
      if (tok.startsWith("^")) {
        return <sup key={i} className="text-[0.75em] leading-none">{replaceSymbols(tok.slice(1))}</sup>;
      }
      if (tok.startsWith("_{") && tok.endsWith("}")) {
        return <sub key={i} className="text-[0.75em] leading-none">{replaceSymbols(tok.slice(2, -1))}</sub>;
      }
      if (tok.startsWith("_")) {
        return <sub key={i} className="text-[0.75em] leading-none">{replaceSymbols(tok.slice(1))}</sub>;
      }
      return replaceSymbols(tok);
    });
  };

  // Find fractions
  while ((match = fractionRegex.exec(clean)) !== null) {
    if (match.index > lastIndex) {
      parts.push(renderScriptSub(clean.slice(lastIndex, match.index)));
    }
    const num = match[1];
    const den = match[2];
    parts.push(
      <span key={match.index} className="inline-flex flex-col items-center align-middle mx-1 text-center text-xs">
        <span className="border-b border-cyan-400/40 px-1 pb-0.5">{renderScriptSub(num)}</span>
        <span className="pt-0.5 px-1">{renderScriptSub(den)}</span>
      </span>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < clean.length) {
    parts.push(renderScriptSub(clean.slice(lastIndex)));
  }

  if (isBlock) {
    return (
      <div className="my-3 p-3 rounded-xl bg-black/40 border border-cyan-500/20 text-cyan-200 font-serif italic text-sm md:text-base text-center overflow-x-auto shadow-inner">
        {parts}
      </div>
    );
  }

  return (
    <span className="font-serif italic text-cyan-300 mx-0.5 px-1 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-[0.95em]">
      {parts}
    </span>
  );
}

/**
 * Parses markdown inline tokens (bold, italic, code, math, links)
 */
function renderInline(text: string): React.ReactNode {
  // Regex splitting inline math ($...$), code (`...`), bold (**...**), italic (*...*)
  const regex = /(\$[^$\n]+\$|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(regex);

  return parts.map((part, idx) => {
    if (!part) return null;

    // Inline math: $ ... $
    if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
      const formula = part.slice(1, -1);
      return <React.Fragment key={idx}>{renderMathExpression(formula, false)}</React.Fragment>;
    }

    // Inline code: ` ... `
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code key={idx} className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-white/10 text-cyan-300 border border-white/5">
          {part.slice(1, -1)}
        </code>
      );
    }

    // Bold: ** ... **
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={idx} className="font-bold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Italic: * ... *
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <em key={idx} className="italic text-slate-300">
          {part.slice(1, -1)}
        </em>
      );
    }

    // Markdown link: [text](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={idx}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400 underline hover:text-cyan-300"
        >
          {linkMatch[1]}
        </a>
      );
    }

    return part;
  });
}

export function MarkdownLatexRenderer({ content, className = "" }: MarkdownLatexRendererProps) {
  if (!content) return null;

  // Split into block lines
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let inTable = false;
  let tableBuffer: string[] = [];

  const flushCode = (key: number) => {
    if (codeBuffer.length > 0) {
      elements.push(
        <pre key={key} className="p-3 my-2 rounded-xl bg-[#070b14] border border-white/10 font-mono text-xs text-slate-300 overflow-x-auto">
          <code>{codeBuffer.join("\n")}</code>
        </pre>
      );
      codeBuffer = [];
    }
  };

  const flushTable = (key: number) => {
    if (tableBuffer.length > 0) {
      const rows = tableBuffer.map((r) =>
        r
          .split("|")
          .map((c) => c.trim())
          .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
      );

      const header = rows[0];
      const dataRows = rows.slice(2); // Skip separator row

      elements.push(
        <div key={key} className="my-3 overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-full divide-y divide-white/10 text-xs text-left">
            <thead className="bg-white/5 text-slate-200">
              <tr>
                {header?.map((col, cIdx) => (
                  <th key={cIdx} className="px-3 py-2 font-semibold">
                    {renderInline(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-black/20 text-slate-300">
              {dataRows.map((r, rIdx) => (
                <tr key={rIdx}>
                  {r.map((col, cIdx) => (
                    <td key={cIdx} className="px-3 py-2">
                      {renderInline(col)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableBuffer = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced code blocks
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        flushCode(i);
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Markdown Table rows
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      inTable = true;
      tableBuffer.push(line.trim());
      continue;
    } else if (inTable) {
      flushTable(i);
      inTable = false;
    }

    // Block math: $$ ... $$
    if (line.trim().startsWith("$$") && line.trim().endsWith("$$") && line.trim().length > 4) {
      const math = line.trim().slice(2, -2);
      elements.push(<React.Fragment key={i}>{renderMathExpression(math, true)}</React.Fragment>);
      continue;
    }

    // Headings
    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={i} className="text-lg md:text-xl font-bold text-white mt-4 mb-2 pb-1 border-b border-white/10">
          {renderInline(line.slice(2))}
        </h1>
      );
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="text-base md:text-lg font-bold text-slate-100 mt-3 mb-1.5">
          {renderInline(line.slice(3))}
        </h2>
      );
      continue;
    }
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-sm md:text-base font-semibold text-cyan-300 mt-2.5 mb-1">
          {renderInline(line.slice(4))}
        </h3>
      );
      continue;
    }

    // Blockquotes
    if (line.startsWith("> ")) {
      elements.push(
        <blockquote key={i} className="my-2 pl-3 border-l-2 border-cyan-500/50 text-slate-400 italic text-xs">
          {renderInline(line.slice(2))}
        </blockquote>
      );
      continue;
    }

    // Unordered lists
    if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <li key={i} className="ml-4 list-disc text-xs text-slate-300 my-0.5">
          {renderInline(line.slice(2))}
        </li>
      );
      continue;
    }

    // Ordered lists
    const numMatch = line.match(/^([0-9]+)\.\s(.*)$/);
    if (numMatch) {
      elements.push(
        <li key={i} className="ml-4 list-decimal text-xs text-slate-300 my-0.5">
          {renderInline(numMatch[2])}
        </li>
      );
      continue;
    }

    // Horizontal Rule
    if (line.trim() === "---" || line.trim() === "***") {
      elements.push(<hr key={i} className="my-4 border-white/10" />);
      continue;
    }

    // Empty lines
    if (!line.trim()) {
      elements.push(<div key={i} className="h-2" />);
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="text-xs text-slate-300 leading-relaxed my-1">
        {renderInline(line)}
      </p>
    );
  }

  if (inCodeBlock) flushCode(lines.length);
  if (inTable) flushTable(lines.length);

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
}
