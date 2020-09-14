const FONTS = {
  telugu:
    'https://rawcdn.githack.com/googlefonts/noto-fonts/115d38430d957d38307457c036302b7bdbe0bbc4/unhinted/NotoSansTelugu/NotoSansTelugu-Regular.ttf',
  arabic:
    'https://rawcdn.githack.com/googlefonts/noto-fonts/115d38430d957d38307457c036302b7bdbe0bbc4/unhinted/NotoSansArabic/NotoSansArabic-Regular.ttf',
  hindi:
    'https://rawcdn.githack.com/googlefonts/noto-fonts/0723a5939124d6be880d5b8eb4666761bab4235e/unhinted/NotoSerifDevanagari/NotoSerifDevanagari-Regular.ttf',
};

const PAGE_STYLE = `
  body { font-size: 2em; }
  pre { padding: 20px; background-color: linen; }
  code { font-family: monospace; }
  img { max-width: 100%; }
`;

module.exports = {
  FONTS,
  PAGE_STYLE,
};
