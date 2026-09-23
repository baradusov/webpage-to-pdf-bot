// A post page on t.me is an empty shell filled in by scripts; the embed view
// of the same post comes as plain HTML. Usernames are 5–32 characters, which
// also keeps /s/ and /c/ out.
const POST = /^\/([A-Za-z0-9_]{5,32})\/(\d+)\/?$/;

export const telegramPost = (url) => {
  try {
    const u = new URL(url);

    if (u.hostname !== 't.me' && u.hostname !== 'telegram.me') return null;

    const m = POST.exec(u.pathname);
    if (!m) return null;

    return { url: `https://t.me/${m[1]}/${m[2]}?embed=1`, title: `${m[1]} ${m[2]}` };
  } catch {
    return null;
  }
};
