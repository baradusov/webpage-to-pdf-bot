# Webpage to PDF Bot

Telegram bot that converts web articles into readable PDF files. Send a link, get a clean PDF back.

## Requirements

- Node.js
- Chromium (for Puppeteer)

## Environment Variables

```
BOT_TOKEN=<telegram_bot_token>
BOT_TOKEN_DEV=<telegram_bot_token_for_dev>
```

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

## Deploy

Deployment is automated via GitHub Actions and triggered by publishing a release.

### How to deploy

1. Go to GitHub repository → Releases → "Create a new release"
2. Create a new tag (e.g., `v0.19.5`)
3. Fill in release title and description
4. Click "Publish release"

### Required GitHub secrets

- `SSH_HOST` - server hostname or IP
- `SSH_USERNAME` - SSH user
- `SSH_KEY` - private SSH key for authentication
