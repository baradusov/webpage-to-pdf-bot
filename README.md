# Webpage to PDF Bot

Telegram bot that converts web articles into readable PDF files. Send a link, get a clean PDF back.

## Requirements

- Node.js >= 22.12.0 (required by puppeteer 25)
- `unzip` — puppeteer extracts the bundled Chrome with it during `npm ci`

## Environment Variables

```
BOT_TOKEN=<telegram_bot_token>
BOT_TOKEN_DEV=<telegram_bot_token_for_dev>
```

## Statistics

Every handled message is recorded in SQLite at `data/stats.db` through
`node:sqlite` — see [`_lib/stats.js`](_lib/stats.js). The table is created on
first run; there is nothing to set up. Override the location with
`STATS_DB_PATH`.

Each row is a chat id, a **domain**, an outcome (`pdf`, `full`, `failed`,
`not_a_link`) and a timestamp. The full address is deliberately not stored —
the domain answers every product question without keeping a reading history
tied to a person. Recording never throws: statistics must not take the bot down.

```js
import { summary, topUsers, topHosts, outcomes, reasons,
         returning, timings, slowestHosts } from './_lib/stats.js';

summary(30);       // { requests, users, pdf }
topUsers(30);      // [{ chatId, count }, …]
topHosts(30);      // [{ host, count }, …]
outcomes(30);      // [{ outcome, count }, …]
reasons(30);       // [{ reason, count }, …] why it did not work
returning(30);     // active in this window and the previous one
timings(30);       // { count, median, p90, p99, max }
slowestHosts(30);  // [{ host, count, avgMs }, …]
```

`ADMIN_CHAT_ID` is never recorded — that chat is where the bot gets tested,
and testing is not usage. It is dropped in `record()` rather than filtered in
each query, so a query added later cannot forget about it.

Every row also carries how long the person waited, so the table answers "how
slow is the bot" and "which sites drag" — questions the logs never could.

### The /stats command

`/stats` sends the whole picture back as tables, using Bot API rich messages
(`sendRichMessage`). It takes an optional period: `/stats 7`.

The command is **not** declared in the bot's command menu and answers only the
chat in `ADMIN_CHAT_ID`; everyone else gets silence, so its existence is not
advertised. With `ADMIN_CHAT_ID` unset it answers nobody.

Two things worth knowing if you touch it:

- grammY's convenience methods are **positional** — `api.sendRichMessage(chatId, message)`.
  The object form lives on `api.raw`, and passing an object to the convenience
  method silently sends an empty rich message.
- The message is built from typed **blocks**, never the `html` or `markdown`
  fields. Cell text is then literal, so a hostname can't smuggle in markup.
  A test guards this.

Telegram has no Bot API method for bot analytics. The monthly-users figure
shown on a bot's profile in the app is Telegram's own and is not exposed —
read it there, and get everything else from this table.

Raw pm2 logs are rotated daily and kept for 30 days, so they answer
"what happened last week" but not "how did this change over the year". That is
what this table is for.

## Tests

```bash
npm test
```

Covers the statistics layer with the built-in `node:test` against a throwaway
SQLite file. Bot handlers are not covered.

## Development

```bash
npm install
NODE_ENV=development npm start
```

Uses `BOT_TOKEN_DEV` when `NODE_ENV=development`.

## Production

```bash
npm ci
npm start
```

Uses `BOT_TOKEN` by default.

### PM2 Commands

```bash
pm2 stop pdf      # Stop the bot
pm2 start pdf     # Start the bot
pm2 restart pdf   # Restart the bot
pm2 logs pdf      # View logs
pm2 status        # Check status
```

## Deploy

### Manual deploy

```bash
ssh user@server
cd ~/www/webpage-to-pdf-bot/app
git pull
npm ci
pm2 restart pdf
```

### GitHub Actions deploy

Automated deployment is triggered by publishing a release.

Before creating release:
1. Commit all code changes first (separate commit)
2. Then prepare release commit:
   - Update version in `package.json`
   - Run `npm install` to update `package-lock.json`
   - Update `CHANGELOG.md`
   - Commit with message: `release X.X.X`
3. Push to master

Create release:
1. Go to GitHub repository → Releases → "Create a new release"
2. Create a new tag (e.g., `0.19.5`)
3. Fill in release title and description
4. Click "Publish release"

### Required GitHub secrets

- `TS_OAUTH_CLIENT_ID` - Tailscale OAuth client ID
- `TS_OAUTH_SECRET` - Tailscale OAuth client secret
- `SSH_HOST` - server Tailscale IP or hostname
- `SSH_USERNAME` - SSH user
- `SSH_KEY` - private SSH key for authentication
