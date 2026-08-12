# Deploying to a Proxmox VM

## 1. Prep the VM
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-plugin git
sudo usermod -aG docker $USER   # re-login after this
```

## 2. Clone repos
```bash
git clone <backend-repo-url> backend
git clone <frontend-repo-url> frontend
# docker-compose.yml, Dockerfiles and this file should sit one level above both
```

## 3. Configure environment
Copy `backend/.env` from your local machine (or recreate it) on the VM, but:
- Rotate `JWT_SECRET` and `INBOUND_API_KEY` to new production values.
- Keep `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` as-is (shared storage bucket — no file migration needed).
- `DATABASE_URL` and `REDIS_URL` are overridden by `docker-compose.yml` automatically to point at the `postgres` / `redis` service names — no edits needed there.

## 4. Migrate the database (choose one)

**A. Fresh install** — skip straight to step 5; `prisma migrate deploy` creates the schema, then run:
```bash
docker compose exec backend npm run db:seed
```

**B. Copy existing local data**
```bash
# On local PC
pg_dump -U kyc -h localhost -d touristkyc -F c -f touristkyc.dump
scp touristkyc.dump user@<vm-ip>:/tmp/

# On VM, after `docker compose up -d postgres`
docker compose exec -T postgres pg_restore -U tourist_kyc -d tourist_kyc --clean --if-exists < /tmp/touristkyc.dump
```

## 5. Build and start everything
```bash
docker compose up -d --build
```
This starts, in order: `postgres`, `redis`, `backend` (runs `prisma migrate deploy` then boots the API + job workers + schedulers), and `frontend` (nginx serving the built SPA and proxying `/api` + `/socket.io` to the backend container).

## 6. Verify
```bash
curl http://localhost:3001/health   # backend health check, bypassing nginx
docker compose logs -f backend
```

## 7. TLS / domain (recommended before real go-live)
Put the VM behind a reverse proxy (nginx or Caddy) on the Proxmox host or another edge box, terminate TLS via Let's Encrypt, and forward to the VM's port 80.

## 8. Ongoing operations
- `docker compose logs -f backend` — tail application logs (also written to the `backend_logs` volume, rotated daily via Winston).
- `docker compose exec backend npx prisma migrate deploy` — apply new migrations after a `git pull` + rebuild.
- `docker compose up -d --build backend frontend` — redeploy after code changes.

## 9. Using a custom frontend port and multiple platforms on the same VM

By default the Docker Compose setup publishes the frontend on port `80`. To use a different port (e.g. `2112`) so another platform can share the same IP, update the frontend container:

1. `frontend/nginx.conf` — change `listen 80;` to the new port (`listen 2112;`).
2. `frontend/Dockerfile` — change `EXPOSE 80` to `EXPOSE 2112`.
3. `docker-compose.yml` — change `ports: - "80:80"` to `ports: - "2112:2112"`.
4. Open the port on the VM firewall:
   ```bash
   sudo ufw allow 2112/tcp   # or equivalent for your firewall
   ```

Then access the portal at `http://<vm-ip>:2112`. The backend can still be reached through the frontend's nginx proxy at `/api/` and `/socket.io/`, or directly at `http://<vm-ip>:3001`.

### Adding a second platform on the same IP

Each platform needs its own unique **host port**. The simplest approach is to keep KYC in one directory/project and the other platform in another, then start each with its own `docker-compose`.

If you want both in the same `docker-compose.yml`, make sure service names are unique:

```yaml
  other-frontend:
    build: ./other-platform/frontend
    container_name: other-platform-frontend
    ports:
      - "8080:80"   # other platform on port 8080

  other-backend:
    build: ./other-platform/backend
    container_name: other-platform-backend
    ports:
      - "3002:3002" # another backend port
```

Update the second frontend's nginx config to proxy to its own backend container name. Open each new host port on the firewall.

If the KYC backend still allows CORS from all origins (`FRONTEND_URL` unset or `*`), no extra CORS changes are needed. For stricter CORS, set `FRONTEND_URL=http://<vm-ip>:2112` in `backend/.env`.

---

# Alternative: Backend on a VM + Frontend on Vercel

Use this if you want the backend on your own VM and the React (Vite) frontend hosted on Vercel.

## A. Backend on the VM

### A.1 VM prerequisites

- Ubuntu 22.04/24.04 LTS (or any Linux VM).
- Node.js 20 LTS.
- PostgreSQL 15+.
- Redis 7+.
- Git.
- Nginx (as reverse proxy + SSL).

```bash
# Install Node.js 20
sudo apt update
sudo apt install -y curl ca-certificates gnupg
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
NODE_MAJOR=20
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/deb_$NODE_MAJOR.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list
sudo apt update
sudo apt install -y nodejs

# Install PostgreSQL + Redis + Nginx + Git + build tools
sudo apt install -y postgresql postgresql-contrib redis-server nginx git build-essential
```

### A.2 Create the database and user

```bash
sudo -u postgres psql -c "CREATE USER tourist_kyc WITH PASSWORD 'change-me-strong-password';"
sudo -u postgres psql -c "CREATE DATABASE tourist_kyc OWNER tourist_kyc;"
sudo -u postgres psql -c "ALTER USER tourist_kyc WITH SUPERUSER;"   # only needed for Prisma shadow DB during migrate dev; safe to remove later
```

### A.3 Clone and install

```bash
cd /var/www
git clone <your-backend-repo-url> tourist-kyc-backend
cd tourist-kyc-backend/backend
npm ci
```

> Use `npm ci` on the VM so the lockfile is respected. Do not run `npm install` on the server.

### A.4 Environment variables

Create `backend/.env` on the VM (do not commit it):

```env
DATABASE_URL="postgresql://tourist_kyc:change-me-strong-password@localhost:5432/tourist_kyc"
REDIS_URL="redis://localhost:6379"
PORT=3001
JWT_SECRET="change-me-to-a-256-bit-random-string"

# Provider API used by the backend to push assignments
PROVIDER_BASE_URL="https://provider.emrg.example"
PROVIDER_API_KEY="provider-api-key"
PROVIDER_ASSIGN_ENDPOINT="/api/assign"
PROVIDER_TIMEOUT_MS=10000
PROVIDER_MAX_RETRIES=5

# Key given to EMRG to call /resources endpoints
INBOUND_API_KEY="emrg-inbound-api-key-change-me"

# Storage: local or supabase
STORAGE_PROVIDER="supabase"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_KEY="your-service-role-key"
SUPABASE_BUCKET="upload_images"

# Optional tuning
RESERVATION_DEFAULT_HOLD_SECONDS=120
VISA_SUSPEND_LEAD_HOURS=24
DEREGISTER_STALE_DAYS=14
```

Rotate all secrets from local development values.

### A.5 Database migration

**Fresh database:**

```bash
cd /var/www/tourist-kyc-backend/backend
npx prisma migrate deploy --schema=src/prisma/schema.prisma
npm run db:seed
```

**Migrating from an existing local/dev database:**

On the old machine:

```bash
pg_dump -U <user> -h <host> -d tourist_kyc -F c -f tourist_kyc.dump
```

Copy the dump to the VM (`scp`, `rsync`, etc.), then:

```bash
# On VM
sudo -u postgres pg_restore -U tourist_kyc -d tourist_kyc --clean --if-exists /path/to/tourist_kyc.dump

# Then apply any new migrations that didn't exist when the dump was taken
cd /var/www/tourist-kyc-backend/backend
npx prisma migrate deploy --schema=src/prisma/schema.prisma
```

> **Rule of thumb:** in production always use `prisma migrate deploy`, never `prisma migrate dev`.

### A.6 Build and run with PM2

```bash
cd /var/www/tourist-kyc-backend/backend
npm run build

sudo npm install -g pm2
pm2 start dist/server.js --name tourist-kyc-backend
pm2 save
pm2 startup systemd
```

Backend will listen on `http://localhost:3001`.

### A.7 Nginx reverse proxy + SSL

Create `/etc/nginx/sites-available/tourist-kyc`:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;   # support long-lived Socket.IO connections
    }
}
```

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/tourist-kyc /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Then get a certificate:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

### A.8 CORS (optional but recommended)

The backend currently does `app.use(cors())` (all origins). For production you can restrict it to the Vercel frontend origin. Edit `backend/src/app.ts` if you want to tighten it:

```ts
app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
```

Then add `FRONTEND_URL=https://your-vercel-app.vercel.app` to the backend `.env` and restart.

### A.9 API docs URL

Once deployed, Swagger UI is publicly available at:

```
https://api.yourdomain.com/api-docs
```

The raw OpenAPI JSON is at `/api-docs.json`.

## B. Frontend on Vercel

### B.1 Project setup

1. Push the repository to GitHub / GitLab / Bitbucket.
2. In Vercel, click **Add New Project** → import the repository.
3. Under **Root Directory**, set `frontend`.
4. Framework preset should auto-detect **Vite**. If not, choose it manually.

### B.2 Build settings

Vercel normally detects Vite automatically. Verify these values in the project settings:

- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install` (or `npm ci` if you commit `package-lock.json`)

### B.3 Environment variables

Add in Vercel → Settings → Environment Variables:

```
VITE_API_URL=https://api.yourdomain.com/api/v1
```

The frontend client uses this base URL for all API calls. Make sure it matches the public VM domain and includes `/api/v1`.

### B.4 Deploy

Every push to `main` will auto-deploy. For the first deploy, Vercel gives you a `.vercel.app` domain; you can later add a custom domain in Vercel settings.

## C. Database migration strategy for ongoing updates

1. **New migrations are committed** in `backend/src/prisma/migrations/`.
2. On the VM, pull the latest code:
   ```bash
   cd /var/www/tourist-kyc-backend
   git pull origin main
   cd backend
   npm ci
   npm run build
   ```
3. Apply migrations:
   ```bash
   npx prisma migrate deploy --schema=src/prisma/schema.prisma
   ```
4. Restart the backend:
   ```bash
   pm2 restart tourist-kyc-backend
   ```
5. **Backup before any risky migration:**
   ```bash
   sudo -u postgres pg_dump -U tourist_kyc -d tourist_kyc -F c -f /backups/tourist_kyc_$(date +%F).dump
   ```

## D. Quick verification checklist

- `curl https://api.yourdomain.com/health` returns `{"status":"ok"}`.
- `curl https://api.yourdomain.com/api-docs.json` returns the OpenAPI spec.
- Vercel preview URL loads the login page.
- Login with a seeded admin user works and dashboard data loads.
