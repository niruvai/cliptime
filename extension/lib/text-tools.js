// ClipTime — text tools (pure functions, no DOM required except stripHtml fallback)

const normalizeEOL = (s) => String(s ?? '').replace(/\r\n?/g, '\n');
const lines = (s) => normalizeEOL(s).split('\n');

// Split text into "words" for programmer-style cases (camelCase, snake_case …)
function words(s) {
  return normalizeEOL(s)
    .replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, '$1 $2')       // fooBar -> foo Bar
    .replace(/(\p{Lu})(\p{Lu}\p{Ll})/gu, '$1 $2')        // XMLHttp -> XML Http
    .split(/[^\p{L}\p{N}\p{M}]+/u)
    .filter(Boolean);
}

const cap = (w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w);

// Apply a word-joining transform line by line so multi-line input keeps its lines
const perLine = (fn) => (s) => lines(s).map((l) => (l.trim() ? fn(l) : l)).join('\n');

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

export const TOOLS = {
  // ---- Case ----
  upper: (s) => normalizeEOL(s).toUpperCase(),
  lower: (s) => normalizeEOL(s).toLowerCase(),
  title: (s) =>
    normalizeEOL(s)
      .toLowerCase()
      .replace(/(^|[\s\-_/("'“‘])(\p{L})/gu, (_, p, c) => p + c.toUpperCase()),
  sentence: (s) =>
    normalizeEOL(s)
      .toLowerCase()
      .replace(/(^\s*|[.!?।]\s+|\n\s*)(\p{L})/gu, (_, p, c) => p + c.toUpperCase()),
  toggle: (s) =>
    [...normalizeEOL(s)]
      .map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()))
      .join(''),
  camel: perLine((l) => words(l).map((w, i) => (i ? cap(w) : w.toLowerCase())).join('')),
  pascal: perLine((l) => words(l).map(cap).join('')),
  snake: perLine((l) => words(l).map((w) => w.toLowerCase()).join('_')),
  kebab: perLine((l) => words(l).map((w) => w.toLowerCase()).join('-')),
  constant: perLine((l) => words(l).map((w) => w.toUpperCase()).join('_')),

  // ---- Clean / format ----
  removeBlankLines: (s) => lines(s).filter((l) => l.trim() !== '').join('\n'),
  collapseBlankLines: (s) =>
    lines(s)
      .map((l) => (l.trim() === '' ? '' : l))
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^\n+|\n+$/g, ''),
  trimLines: (s) => lines(s).map((l) => l.trim()).join('\n'),
  removeExtraSpaces: (s) =>
    lines(s)
      .map((l) => l.replace(/[ \t  - 　]+/g, ' ').trim())
      .join('\n'),
  joinLines: (s) =>
    lines(s)
      .map((l) => l.trim())
      .filter(Boolean)
      .join(' '),
  smartClean: (s) =>
    lines(s)
      .map((l) => l.replace(/[ \t  - 　]+/g, ' ').trim())
      .filter(Boolean)
      .join('\n'),
  uniqueLines: (s) => [...new Set(lines(s))].join('\n'),
  sortLines: (s) =>
    lines(s)
      .slice()
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
      .join('\n'),
  reverseLines: (s) => lines(s).reverse().join('\n'),
  numberLines: (s) => {
    let n = 0;
    return lines(s)
      .map((l) => (l.trim() ? `${++n}. ${l}` : l))
      .join('\n');
  },
  removeNumbering: (s) =>
    lines(s)
      .map((l) => l.replace(/^\s*(?:\d+|[০-৯]+|[•\-*–])[.)\]:]?\s+/, ''))
      .join('\n'),
  stripHtml: (s) => {
    const str = normalizeEOL(s);
    if (typeof DOMParser !== 'undefined') {
      const doc = new DOMParser().parseFromString(str, 'text/html');
      return doc.body ? doc.body.textContent || '' : str;
    }
    return str
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&');
  },
  toBnDigits: (s) => normalizeEOL(s).replace(/[0-9]/g, (d) => BN_DIGITS[d]),
  toEnDigits: (s) => normalizeEOL(s).replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d))),
};

export function stats(s) {
  const str = normalizeEOL(s);
  return {
    chars: [...str].length,
    words: (str.match(/[\p{L}\p{N}\p{M}]+(?:['’][\p{L}]+)?/gu) || []).length,
    lines: str ? str.split('\n').length : 0,
  };
}

// Snippet placeholders: {date} {time} {datetime}
export function expandPlaceholders(text, locale) {
  const now = new Date();
  return String(text ?? '')
    .replace(/\{datetime\}/g, now.toLocaleString(locale))
    .replace(/\{date\}/g, now.toLocaleDateString(locale))
    .replace(/\{time\}/g, now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }));
}
