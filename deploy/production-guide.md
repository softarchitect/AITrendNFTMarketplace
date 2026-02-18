# TrendMint production deploy guide (Nginx + PostgreSQL cluster)

## 1) Environment files

Use these files from this repo:
- `frontend/env.production`
- `backend/env.production`

Update placeholders before go-live:
- `backend/env.production`: `RPC_URL`, `MINTER_PRIVATE_KEY`, AI/IPFS/payment keys, admin credentials
- `frontend/env.production`: `NEXT_PUBLIC_CONTRACT_ADDRESS` if needed

On the server, keep it simple by copying production env files to `.env`:

```bash
cd /var/www/trendmint/backend && cp env.production .env
cd /var/www/trendmint/frontend && cp env.production .env
```

## 2) Install deps and build frontend

```bash
cd /var/www/trendmint/frontend
npm ci
npm run build
```

Install backend deps too:

```bash
cd /var/www/trendmint/backend
npm ci
```

## 3) Start apps with PM2 (simple)

Install PM2 globally once:

```bash
sudo npm install -g pm2
```

Use the provided ecosystem file:
- `deploy/ecosystem.config.cjs`

Start both services:

```bash
cd /var/www/trendmint
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 status
```

Enable PM2 startup on reboot:

```bash
pm2 startup
# run the command PM2 prints
pm2 save
```

Useful PM2 commands:

```bash
pm2 logs trendmint-backend --lines 100
pm2 logs trendmint-frontend --lines 100
pm2 restart trendmint-backend trendmint-frontend
pm2 status
```

## 4) Nginx setup

Install config:

```bash
sudo cp /var/www/trendmint/deploy/nginx-trendmint.conf /etc/nginx/sites-available/trendmint
sudo ln -sf /etc/nginx/sites-available/trendmint /etc/nginx/sites-enabled/trendmint
sudo nginx -t
sudo systemctl reload nginx
```

## 5) Database cluster settings

Backend now supports managed PostgreSQL via URL + SSL:
- `DATABASE_URL=postgresql://...?...sslmode=require`
- `PG_SSL_MODE=require`

If strict TLS validation fails temporarily with provider certificates:
- `PG_SSL_MODE=no-verify` (temporary only, not ideal long term)

## 6) Smoke tests

```bash
curl -i http://127.0.0.1:4000/health
curl -i http://127.0.0.1:4000/health/persistence/check
curl -i http://68.183.183.154/health
curl -i http://68.183.183.154/
```

