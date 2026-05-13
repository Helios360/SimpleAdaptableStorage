# SimpleAdaptableStorage

A self-hosted web application for managing and storing candidate/student profiles. Built for training organizations to track candidates through their formation pipeline — from registration and skills testing to document management and status tracking.

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 24 + Express 5 |
| Database | MySQL 8.4 |
| Auth | JWT (httpOnly cookies) + bcrypt |
| File handling | Formidable, Sharp, pdf-lib |
| AI | OpenAI API (test answer correction) |
| Infrastructure | Docker Compose |

---

## Quick Start

### 1. Run the install script (Arch Linux)

```bash
chmod +x install.sh && ./install.sh
```

This installs Docker, prompts for credentials, and generates a `.env` file.

### 2. Or set up manually

Create a `.env` file at the project root:

```env
PORT=3000
HOST=0.0.0.0
NODE_ENV=production

MYSQL_HOST=mysql
MYSQL_USER=mysql
MYSQL_DATABASE=your_db_name
MYSQL_PASSWORD=your_db_password
MYSQL_ROOT_PASSWORD=your_root_password

MYSQL_DATA_DIR=/mnt/nas/mysql_data       # persistent volume path
NAS_BACKUPS=/mnt/nas/backups             # automated backup destination
NAS_UPLOADS=/mnt/nas/uploads             # uploaded files (CV, ID docs)

APP_UPLOADS_DIR=/usr/src/app/uploads
APP_BASE_DIR=/usr/src/app
APP_URL=https://your-domain.com/

JWT_SECRET=your_jwt_secret
OPENAI_API_KEY=sk-...
```

### 3. Start the stack

```bash
sudo docker compose up --build -d
```

App is served at `http://localhost:3000`.

---

## Development

Use the override compose file, which mounts local paths instead of NAS volumes:

```bash
sudo docker compose -f docker-compose.override.yml up --build -d
```

Data is stored under `./dev/mysql_data` — easy to wipe without touching production volumes.

**Full dev reset** (nukes local DB and rebuilds):

```bash
./reset.sh
```

---

## Docker Operations

| Task | Command |
|---|---|
| Start (fresh build) | `sudo docker compose up --build -d` |
| Stop | `sudo docker compose down` |
| Restart app only | `docker compose stop app && docker compose rm -f app && docker compose up -d app` |
| App logs | `sudo docker logs -f simplepeoplestoring-app-1` |
| MySQL logs | `sudo docker logs -f simplepeoplestoring-mysql-1` |
| Delete DB volume | `sudo docker volume rm simplepeoplestoring_db-data` |
| Full reset | `sudo docker compose down -v --remove-orphans && sudo docker compose up --build -d` |

> **Never** use `docker compose up --build -v` in production — the `-v` flag wipes all volumes including the database.

---

## Database Access

```bash
mysql -h 127.0.0.1 -P 3307 -u root -p your_db_name
```

MySQL is exposed on port **3307** (not 3306) to avoid conflicts with a local MySQL instance.

### Schema overview

| Table | Purpose |
|---|---|
| `Formations` | Training programs / organizations |
| `Users` | Candidates and staff, linked to a formation |
| `StaffSettings` | Maps admin users to the formations they manage |
| `Tests` | Question bank (frontend / backend / psychotechnical) |
| `TestAttempts` | Candidate answers and AI-scored results |

The schema is auto-applied on first container start via `db/init/01-init.sql` and seeded with `db/init/02_seeder.sql`.

---

## Routes

| Path | Access | Description |
|---|---|---|
| `/` | Public | Landing page |
| `/register` | Public | Candidate registration form |
| `/signin` | Public | Login |
| `/profile` | Auth | Candidate profile |
| `/test` | Auth | Skills assessment |
| `/admin-panel` | Admin only | Candidate search and management |
| `/legal` | Public | Legal notices |
| `/reset-password` | Public | Request a password reset |

---

## Auth Flow

- Login issues a JWT signed with `JWT_SECRET`, stored as a **httpOnly, Secure, SameSite=Strict** cookie (2h TTL).
- Admins are redirected to `/admin-panel`; candidates who haven't completed their tests are redirected to `/test`.
- Email verification is required after registration. A tokenized link is sent via Nodemailer.
- Password reset uses the same token mechanism (SHA-256 hash stored in DB, 1h TTL).

---

## Automated Backups

The `mysql-backup` service runs a `mysqldump` every **12 hours** and writes compressed `.sql.gz` files to `NAS_BACKUPS`. Backups older than 7 days are automatically deleted.

---

## SSL / HTTPS

Certificate generation (via Certbot, HTTP challenge):

```bash
sudo docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d your-domain.com \
  --email your@email.com \
  --agree-tos --no-eff-email
```

> Certificate renewal must be done over **HTTP**, not HTTPS.

---

## Project Structure

```
.
├── docker-compose.yml              # Production compose
├── docker-compose.override.yml     # Dev compose (local volumes)
├── Dockerfile
├── install.sh                      # Arch Linux one-shot setup
├── reset.sh                        # Dev full reset
├── db/
│   └── init/
│       ├── 01-init.sql             # Schema
│       └── 02_seeder.sql           # Seed data
└── SimplePeopleStoring-app/
    ├── index.js                    # Express entry point & core routes
    ├── crud.routes.js              # Profile and file upload routes
    ├── test.routes.js              # Test delivery and scoring routes
    ├── helpers.js                  # DB query wrapper, utilities
    ├── mailer.js                   # Nodemailer wrapper
    ├── controllers/
    │   └── authControl.js          # JWT middleware
    ├── public/                     # Static files + public pages
    └── views/                      # Authenticated pages (profile, admin, test)
```
