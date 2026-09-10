# EduTrack AI — Backend Setup Guide (Linux)

School Management System REST API
**Dragks Technologies**

---

## Prerequisites

Install all three before starting. Commands below are for Ubuntu/Debian-based distros.
For other distros (Fedora, Arch etc.), use your package manager equivalent.

### Node.js (v18 or higher)

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node --version
```

### PostgreSQL (v15 or higher)

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Git

```bash
sudo apt install -y git
```

---

## Step 1 — Set Up PostgreSQL

Switch to the postgres user and create the database:

```bash
sudo -u postgres psql
```

Inside the PostgreSQL shell:

```sql
CREATE DATABASE edutrack;
CREATE USER edutrack_user WITH PASSWORD 'yourpassword';
GRANT ALL PRIVILEGES ON DATABASE edutrack TO edutrack_user;
\q
```

Note down:
- **Username:** `edutrack_user` (or `postgres` if you prefer)
- **Password:** the one you just set
- **Port:** `5432` (default)

---

## Step 2 — Clone or Unzip the Project

If you received a zip file:

```bash
unzip edutrack-backend-final.zip
cd edutrack-backend
```

---

## Step 3 — Create the .env File

```bash
cp .env.example .env
nano .env
```

Fill in your values:

```env
# Database
DATABASE_URL="postgresql://edutrack_user:yourpassword@localhost:5432/edutrack"

# JWT — use long random strings (min 32 characters)
JWT_SECRET="replace-with-a-very-long-random-string-here"
JWT_REFRESH_SECRET="replace-with-another-very-long-random-string-here"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="30d"

# Super Admin — Dragks Technologies
SUPER_ADMIN_EMAIL="treasure@dragks.com"
SUPER_ADMIN_PASSWORD="YourStrongPasswordHere"
SUPER_ADMIN_NAME="Dragks Technologies"

# Server
PORT=3000
CORS_ORIGINS="http://localhost:3000"

# File uploads
MAX_FILE_SIZE_MB=10
UPLOAD_PATH="./uploads"
```

Save and exit: `Ctrl + X`, then `Y`, then `Enter`.

---

## Step 4 — Install Dependencies

```bash
npm install
```

---

## Step 5 — Run Database Migrations

Create all database tables:

```bash
npx prisma migrate dev --name init
```

Generate the Prisma client:

```bash
npx prisma generate
```

---

## Step 6 — Seed the Database

Create the SUPER_ADMIN account. Run once only:

```bash
npx ts-node prisma/seed.ts
```

Expected output: `✅ SUPER_ADMIN created: treasure@dragks.com`

---

## Step 7 — Start the Server

```bash
npm run start:dev
```

Expected output:

```
🚀 EduTrack API running on http://localhost:3000/api/v1
📚 Swagger docs:         http://localhost:3000/api/docs
```

---

## Step 8 — Confirm It Is Working

Open a browser and go to:

```
http://localhost:3000/api/docs
```

You should see the Swagger documentation with all API endpoints. If you see this — the backend is running correctly.

---

## Connecting Flutter App (Physical Phone)

Find your PC's local network IP:

```bash
ip addr show | grep "inet " | grep -v 127.0.0.1
```

Or:

```bash
hostname -I
```

You will see something like `192.168.1.105`. In the Flutter app, set the API base URL to:

```
http://192.168.1.105:3000/api/v1
```

> Both the phone and the PC must be on the same WiFi network.

---

## Login Credentials

| Role | Login Field | Endpoint |
|---|---|---|
| Super Admin / Admin | Email + Password | `POST /api/v1/auth/login` |
| Teacher | Staff ID + Password | `POST /api/v1/auth/teacher/login` |
| Student | Student ID + Password | `POST /api/v1/auth/student/login` |

---

## Useful Commands

| Command | What It Does |
|---|---|
| `npm run start:dev` | Start with hot reload (development) |
| `npm run build` | Build for production |
| `npm run start` | Start production build |
| `npx prisma studio` | Visual database browser |
| `npx prisma migrate dev` | Apply new migrations |
| `npx prisma migrate reset` | Reset database (deletes all data) |

---

## Running as a Background Process (optional)

Install PM2 to keep the server running after closing the terminal:

```bash
npm install -g pm2
npm run build
pm2 start dist/main.js --name edutrack-api
pm2 save
pm2 startup
```

---

## Troubleshooting

**PostgreSQL connection refused**
```bash
sudo systemctl status postgresql
sudo systemctl start postgresql
```

**Port 3000 already in use**
```bash
sudo lsof -i :3000
# Change PORT=3001 in .env and restart
```

**Permission denied on uploads folder**
```bash
mkdir -p uploads
chmod 755 uploads
```

**Prisma errors after schema changes**
```bash
npx prisma generate
npm run start:dev
```
