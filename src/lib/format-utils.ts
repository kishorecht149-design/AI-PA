/**
 * Safe HTML Entity Decoding and Text Sanitization Utilities
 */

const NAMED_ENTITIES: Record<string, string> = {
  "&quot;": '"',
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&apos;": "'",
  "&nbsp;": " ",
  "&copy;": "©",
  "&reg;": "®",
  "&trade;": "™",
  "&mdash;": "—",
  "&ndash;": "–",
  "&bull;": "•",
  "&hellip;": "…",
  "&lsquo;": "'",
  "&rsquo;": "'",
  "&ldquo;": '"',
  "&rdquo;": '"',
};

/**
 * Decode common HTML entities, including numeric decimal (&#039;, &#39;)
 * and hexadecimal (&#x27;) references, safely without executing HTML.
 */
export function decodeHtmlEntities(str: string): string {
  if (!str || typeof str !== "string") return "";

  // Replace named entities
  let decoded = str;
  for (const [entity, replacement] of Object.entries(NAMED_ENTITIES)) {
    decoded = decoded.split(entity).join(replacement);
  }

  // Handle decimal numeric entities: e.g. &#039; or &#39;
  decoded = decoded.replace(/&#(\d{1,6});/g, (_match, dec) => {
    try {
      const code = parseInt(dec, 10);
      if (code >= 0 && code <= 0x10ffff) {
        return String.fromCharCode(code);
      }
    } catch {}
    return _match;
  });

  // Handle hexadecimal numeric entities: e.g. &#x27; or &#x0027;
  decoded = decoded.replace(/&#x([0-9a-fA-F]{1,6});/g, (_match, hex) => {
    try {
      const code = parseInt(hex, 16);
      if (code >= 0 && code <= 0x10ffff) {
        return String.fromCharCode(code);
      }
    } catch {}
    return _match;
  });

  return decoded;
}

/**
 * Sanitizes external URLs to prevent javascript: or data: XSS injection.
 */
export function sanitizeUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== "string") return "#";
  const trimmed = rawUrl.trim();

  // Allow standard web protocols and local anchors
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("#")
  ) {
    return trimmed;
  }

  return "#";
}
