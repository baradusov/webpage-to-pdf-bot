# Webpage to PDF Bot

Telegram bot that converts web articles into readable PDF files. Send a link, get a clean PDF back.

## Requirements

- Node.js

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
1. Update version in `package.json`
2. Run `npm install` to update `package-lock.json`
3. Update `CHANGELOG.md`
4. Commit with message: `release X.X.X`
5. Push to master

Create release:
1. Go to GitHub repository → Releases → "Create a new release"
2. Create a new tag (e.g., `v0.19.5`)
3. Fill in release title and description
4. Click "Publish release"

### Required GitHub secrets

- `SSH_HOST` - server hostname or IP
- `SSH_USERNAME` - SSH user
- `SSH_KEY` - private SSH key for authentication
