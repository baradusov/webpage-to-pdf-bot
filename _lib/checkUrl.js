import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

// Only domains with a 100% failure rate over a month; x.com (72%) is not one.
const NEVER_ARTICLES = [
  'instagram.com',
  'pinterest.com',
  'pinterest.ru',
  'tiktok.com',
  'youtube.com',
  'youtu.be',
  'facebook.com',
];

const PRIVATE_MESSAGE =
  "That address is not reachable from the internet, so I won't open it 🙅";

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
// unpacked too — a dotted-quad check alone would miss it.
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

/**
 * Resolves the name before judging it: internal.example.com can point at
 * 127.0.0.1, and a string comparison would wave it through.
 *
 * @returns {Promise<{ok: true} | {ok: false, reason: string, message: string}>}
 */
export const checkUrl = async (raw) => {
  let url;

  try {
    url = new URL(raw);
  } catch {
    return {
      ok: false,
      reason: 'bad_url',
      message: "That doesn't look like a valid address 🤔",
    };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return {
      ok: false,
      reason: 'bad_scheme',
      message: 'I can only open http and https links 🙅',
    };
  }

  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();

  if (NEVER_ARTICLES.some((d) => matchesHost(host, d))) {
    return {
      ok: false,
      reason: 'never_articles',
      message:
        'This site keeps its content behind a script, so there is no article for me to save 🙅\nSend me a link to a text page instead.',
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
      message: "I can't find that site 😞",
    };
  }

  if (addresses.some((a) => isForbiddenAddress(a.address))) {
    return { ok: false, reason: 'private_address', message: PRIVATE_MESSAGE };
  }

  return { ok: true };
};
