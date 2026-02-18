# TrendMint production deploy guide (Nginx + PostgreSQL cluster)

## 1) Environment files

Use these files from this repo:
- `frontend/.env.production`
- `backend/.env.production`

Update placeholders before go-live:
- `backend/.env.production`: `RPC_URL`, `MINTER_PRIVATE_KEY`, AI/IPFS/payment keys, admin credentials
- `frontend/.env.production`: `NEXT_PUBLIC_CONTRACT_ADDRESS` if needed

## 2) Build frontend

```bash
cd /var/www/trendmint/frontend
npm ci
npm run build
```

## 3) Start services with systemd

Create `/etc/systemd/system/trendmint-backend.service`:

```ini
[Unit]
Description=TrendMint Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/trendmint/backend
EnvironmentFile=/var/www/trendmint/backend/.env.production
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Create `/etc/systemd/system/trendmint-frontend.service`:

```ini
[Unit]
Description=TrendMint Frontend (Next.js)
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/trendmint/frontend
EnvironmentFile=/var/www/trendmint/frontend/.env.production
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable/start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable trendmint-backend trendmint-frontend
sudo systemctl restart trendmint-backend trendmint-frontend
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

