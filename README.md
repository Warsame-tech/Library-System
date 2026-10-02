---
title: Library Management System
emoji: 📚
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
---

# نظام إدارة المكتبة (Arabic Library Management System)

Full-stack library management system with a fully Arabic, RTL user interface.

**Stack:** React (Vite) + Tailwind CSS → Node.js/Express → MySQL (XAMPP)

## Project structure

```
Library Management System/
├── server/         Express API + MySQL access + file uploads
│   ├── config/db.js        MySQL connection pool
│   ├── routes/              auth, arts, authors, publishers, books, dashboard
│   ├── middleware/          JWT auth, uploads, rate limiting, Zod validation
│   ├── schemas/             Zod validation schemas
│   ├── utils/audit.js       Audit log helper
│   ├── db/schema.sql        Database schema (tables, FKs, indexes, audit_logs)
│   ├── db/seed.js           Creates the default admin user
│   ├── tests/                Jest + Supertest suite (isolated test DB)
│   ├── utils/pdfStorage.js  PDF storage in the database (chunked)
│   └── uploads/              legacy pdfs/ folder (pre-database uploads only)
└── client/         React app (Arabic UI, RTL, dark/light mode)
    └── src/
        ├── pages/            Login, Dashboard, entity pages, books, reports
        ├── components/       Sidebar, Navbar, Layout, shared UI
        └── context/          Auth, Theme, Toast
```

## Prerequisites

- Node.js (v18+)
- XAMPP with MySQL running on port 3306 (default `root` user, no password)

## First-time setup

Already done for you in this environment, but for reference on a new machine:

```powershell
# 1. Start MySQL from the XAMPP control panel

# 2. Create the database schema
& "C:\xampp\mysql\bin\mysql.exe" -u root --default-character-set=utf8mb4 -e "source server\db\schema.sql"

# 3. Install dependencies
cd server; npm install
cd ../client; npm install

# 4. Create the default admin account
cd ../server; npm run seed
```

## Running the app

```powershell
# Terminal 1 - server (http://localhost:5000)
cd server
npm run dev

# Terminal 2 - client (http://localhost:5173)
cd client
npm run dev
```

Open http://localhost:5173 in your browser.

## PDF storage

PDF files are stored **inside the MySQL database** (table `book_pdf_chunks`, 256KB pieces per row), not on disk. One database backup therefore contains all data *and* all PDFs, and moving the database to another computer or host moves the PDFs with it. The small piece size keeps every row within default MySQL/MariaDB limits (`max_allowed_packet`, InnoDB redo log), so no server tuning is needed on XAMPP, Railway or anywhere else.

PDFs uploaded before this change lived in `server/uploads/pdfs/`. Move them into the database once with:

```powershell
cd server
node db/importPdfFiles.js                          # preview
node db/importPdfFiles.js --apply                  # import from uploads/pdfs
node db/importPdfFiles.js "D:\old\pdfs" --apply    # import from a folder copied from another computer
```

Files that were never imported are still served from `uploads/pdfs/` as a fallback.

## Hosting on Railway

The repository deploys to Railway as one service (API + built frontend, via the `Dockerfile` and `railway.json`) plus a Railway MySQL database.

1. **New Project → Deploy from GitHub repo** → select this repository.
2. In the same project: **+ New → Database → MySQL**.
3. App service → **Variables**:
   ```
   DB_HOST=${{MySQL.MYSQLHOST}}
   DB_PORT=${{MySQL.MYSQLPORT}}
   DB_USER=${{MySQL.MYSQLUSER}}
   DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
   DB_NAME=${{MySQL.MYSQLDATABASE}}
   NODE_ENV=production
   JWT_SECRET=<long random string>
   DEFAULT_ADMIN_USERNAME=<admin username>
   DEFAULT_ADMIN_PASSWORD=<strong password>
   ```
4. App service → **Settings → Networking → Generate Domain**, then add `FRONTEND_URL=https://<your-domain>`.
5. On first start the server creates all tables and the admin account automatically. `/api/health` is used as the deploy health check.

To copy existing local data to Railway, take a backup locally and restore it into Railway using the MySQL service's **`MYSQL_PUBLIC_URL`** (MySQL service → Variables), as shown below.

## Backup, restore and moving hosts

The project includes its own backup/restore commands (they use the same driver as the app, so they work with XAMPP/MariaDB, Railway's MySQL 8 and any other MySQL host). A backup is a single `.sql` file containing **all tables and all PDF files**.

```powershell
cd server

# Back up the local database (settings from server/.env)
npm run backup

# Back up the Railway database (paste MYSQL_PUBLIC_URL from Railway)
npm run backup -- --url=mysql://root:PASSWORD@HOST:PORT/railway

# Choose where the file is saved
npm run backup -- --out=D:\backups\library.sql

# Restore a backup (preview first, then add --yes). This REPLACES all data in the target.
npm run restore -- library-backup-2026-09-27.sql --url=mysql://root:PASSWORD@HOST:PORT/railway
npm run restore -- library-backup-2026-09-27.sql --url=mysql://root:PASSWORD@HOST:PORT/railway --yes
```

Without `--url`, both commands use the database configured in `server/.env`. The backup contains data only; restoring creates any missing tables from `schema.sql` first, so a backup can be restored into an empty database on any host.

## Default admin login

The default admin username/password are set via `DEFAULT_ADMIN_USERNAME` / `DEFAULT_ADMIN_PASSWORD` in `server/.env` (see `server/.env.example`), and are only used when running `npm run seed`. Set your own values there before seeding — do not use example defaults in production. Additional admin users can be created directly via the `users` table (passwords are stored with bcrypt hashing — never in plain text).

## Configuration

Server (backend) settings live in `server/.env` (copied from `.env.example`):

- `DB_*` — MySQL connection (defaults match a standard XAMPP install)
- `JWT_SECRET` — auto-generated random secret on first setup
- `JWT_EXPIRES_IN` — optional login lifetime (e.g. `8h`, `30d`). Not set by default: users stay logged in until they log out
- `MAX_PDF_SIZE_MB` — PDF upload size limit (default 50MB)
- `FRONTEND_URL` — allowed CORS origin
- `LOGIN_MAX_ATTEMPTS` / `LOGIN_LOCK_MINUTES` — account lockout after repeated failed logins (default 5 attempts / 15 min)
- `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MINUTES` — general API rate limit (default 300 req / 15 min per IP)
- `LOGIN_RATE_LIMIT_MAX` / `LOGIN_RATE_LIMIT_WINDOW_MINUTES` — stricter limit on `/api/auth/login` (default 20 req / 15 min per IP)

Client (frontend) settings live in `client/.env`:

- `VITE_API_BASE_URL` — backend API base URL (default `http://localhost:5000/api`)

## Security

This system was hardened against common threats while keeping it a **single-admin** system (no multi-role/RBAC — there is only one account tier, the admin login).

**Authentication & session**
- Passwords hashed with bcrypt (never stored or logged in plain text).
- JWT secret and all credentials read from `.env` (never hardcoded); logins do not expire unless `JWT_EXPIRES_IN` is set, and there is no inactivity logout (users stay logged in until they click log out).
- Account lockout: after `LOGIN_MAX_ATTEMPTS` failed logins, the account is locked for `LOGIN_LOCK_MINUTES` (HTTP 423), independent of IP rate limiting so an attacker can't bypass it by rotating IPs.
- Login/username errors are intentionally generic (no user enumeration).
- No refresh-token flow was added — deliberate trade-off for a single-admin internal tool; `JWT_EXPIRES_IN` can be set if logins should expire.

**API hardening**
- `helmet` sets standard security headers on every response.
- `express-rate-limit`: a general limit on all `/api/*` routes plus a stricter one on `/api/auth/login`.
- All request bodies are validated with **Zod** (`server/schemas/`) — invalid input is rejected with a 400 before touching the database.
- All SQL uses parameterized queries (`?` placeholders) or fixed, developer-controlled table names — no user input is ever concatenated into SQL.
- The global error handler never leaks internal error details to the client in production (`NODE_ENV=production`); full errors are still logged server-side for debugging.
- CORS is restricted to `FRONTEND_URL` with an explicit method/header allowlist.

**File uploads**
- Only PDF files are accepted, checked both by MIME type **and** by verifying the actual file signature (`%PDF-` magic bytes) after upload — a renamed non-PDF file is rejected and deleted.
- Stored filenames are always fully server-generated random names with a forced `.pdf` extension (the original filename/extension is never trusted), which also eliminates any path-traversal risk.
- Uploaded PDFs are never served from a public/static directory — only through authenticated view/download routes.
- A failed upload (invalid file, validation error) is fully rolled back: no orphan database rows or leftover files.

**Auditing**
- Every login, logout, and create/update/delete action (books, authors, publishers, arts, PDFs) is recorded in the `audit_logs` table (who, what, when, IP address).

**Frontend**
- No secrets of any kind live in frontend code (`VITE_API_BASE_URL` is just a URL).
- All routes except `/login` are wrapped in `ProtectedRoute` and redirect unauthenticated users automatically.
- A 401 from any API call clears the session and redirects to login.
- React escapes all rendered content by default and the codebase contains no `dangerouslySetInnerHTML`/`eval`, so there is no XSS injection point for user-entered data (book titles, names, etc.).
- No sensitive data (tokens, passwords) is ever written to the browser console.
- **Known trade-off:** the JWT is kept in `localStorage` (not an httpOnly cookie) to keep the existing login flow simple; this is safe as long as the app has no XSS surface, which is verified above. Moving to httpOnly cookies would require CSRF protection and cross-origin cookie configuration — a larger change deliberately left out of this pass.

**Dependencies**
- `npm audit` reports **0 vulnerabilities** in both `server` and `client` (a moderate `qs`/Express advisory was fixed via a package `overrides` entry pinning `qs` to a patched version, without bumping Express's major version).

**Tests**

Backend tests run against a fully isolated database (`library_management_test`, auto-created/dropped by the test run — your real data is never touched):

```powershell
cd server
npm test
```

Covers: login validation/lockout/success, protected-route rejection (missing/invalid token), input validation (empty/oversized/duplicate names), and PDF upload security (wrong MIME type, spoofed content, path-traversal filenames, randomized storage names).

## Notes

- Book IDs are never shown in the UI — books are referenced by title only.
- Book fields: title, authors (many-to-many), publisher, art/category, volume count (عدد المجلدات), shelf number (الرف رقم), and PDF files.
- Editing a book does **not** delete its existing PDF files automatically; PDFs are removed individually via their own delete button.
- All uploaded PDF files are validated by type and size on the backend, stored in the database, and served only to authenticated requests.
