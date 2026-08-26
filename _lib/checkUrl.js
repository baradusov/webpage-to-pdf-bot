import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

// Split only to word the refusal properly, the reason stays the same.
const VIDEO_SITES = ['tiktok.com', 'youtube.com', 'youtu.be'];

const FEED_SITES = [
  'instagram.com',
  'pinterest.com',
  'pinterest.ru',
  'facebook.com',
];

const NEVER_ARTICLES = [...VIDEO_SITES, ...FEED_SITES];

const PRIVATE_MESSAGE =
  "I can't open this address 🙅";

const matchesHost = (host, domain) =>
  host === domain || host.endsWith('.' + domain);

const isForbiddenIPv4 = (ip) => {
  const [a, b] = ip.split('.').map(Number);

  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && (b === 0 || b === 168)) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT, used by mesh VPNs
  if (a >= 224) return true;

  return false;
};

// Node normalises ::ffff:127.0.0.1 to ::ffff:7f00:1, so the hex form has to be
const unwrapMappedIPv4 = (v) => {
  const tail = v.slice(7);

  if (tail.includes('.')) return tail;

  const groups = tail.split(':').filter(Boolean);
  if (groups.length !== 2) return null;

  const [hi, lo] = groups.map((g) => parseInt(g, 16));
  if (Number.isNaN(hi) || Number.isNaN(lo)) return null;

  return [hi >> 8, hi & 255, lo >> 8, lo & 255].join('.');
};

const isForbiddenIPv6 = (ip) => {
  const v = ip.toLowerCase().split('%')[0];

  if (v === '::1' || v === '::') return true;
  if (v.startsWith('fe80')) return true;
  if (v.startsWith('fc') || v.startsWith('fd')) return true;
  if (v.startsWith('ff')) return true;

  if (v.startsWith('::ffff:')) {
    const mapped = unwrapMappedIPv4(v);
    return mapped === null ? true : isForbiddenIPv4(mapped);
  }

  return false;
};

const isForbiddenAddress = (ip) =>
  isIP(ip) === 6 ? isForbiddenIPv6(ip) : isForbiddenIPv4(ip);

export const checkUrl = async (raw) => {
  let url;

  try {
    url = new URL(raw);
  } catch {
    return {
      ok: false,
      reason: 'bad_url',
      message: "That doesn't look like a link 🤔",
    };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return {
      ok: false,
      reason: 'bad_scheme',
      message: 'I open http and https links only 🙅',
    };
  }

  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();

  if (NEVER_ARTICLES.some((d) => matchesHost(host, d))) {
    const isVideo = VIDEO_SITES.some((d) => matchesHost(host, d));

    return {
      ok: false,
      reason: 'never_articles',
      message: isVideo
        ? "That's a video. I make PDFs from text 🙅"
        : "That's a feed, not an article 🙅",
    };
  }

  if (isIP(host)) {
    return isForbiddenAddress(host)
      ? { ok: false, reason: 'private_address', message: PRIVATE_MESSAGE }
      : { ok: true };
  }

  let addresses;
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    return {
      ok: false,
      reason: 'dns_failed',
      message: "I can't find this site 😞",
    };
  }

  if (addresses.some((a) => isForbiddenAddress(a.address))) {
    return { ok: false, reason: 'private_address', message: PRIVATE_MESSAGE };
  }

  return { ok: true };
};
