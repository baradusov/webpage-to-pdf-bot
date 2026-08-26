// Ours since article-extractor 9 stopped exposing its own. Trimmed to what a
// printed page can show: no iframe, video or audio, which cannot render in a
// PDF and would only fetch from a stranger's host.
export const SANITIZE_OPTIONS = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'u', 'b', 'i', 'em', 'strong', 'small', 'sup', 'sub',
    'div', 'span', 'p', 'article', 'blockquote', 'section',
    'details', 'summary',
    'pre', 'code',
    'ul', 'ol', 'li', 'dd', 'dl', 'dt',
    'table', 'th', 'tr', 'td', 'thead', 'tbody', 'tfoot', 'caption',
    'figure', 'figcaption', 'img', 'picture', 'source',
    'br', 'hr', 'label', 'abbr', 'a',
  ],
  allowedAttributes: {
    h1: ['id'], h2: ['id'], h3: ['id'], h4: ['id'], h5: ['id'], h6: ['id'],
    a: ['href', 'title'],
    abbr: ['title'],
    img: ['src', 'srcset', 'alt', 'title'],
    picture: ['media', 'srcset'],
    source: ['src', 'srcset', 'type', 'media', 'sizes'],
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan'],
  },
  allowedSchemes: ['http', 'https', 'data'],
  disallowedTagsMode: 'discard',
  allowVulnerableTags: false,
  parseStyleAttributes: false,
  enforceHtmlBoundary: false,
};
