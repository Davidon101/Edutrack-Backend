# EduTrack AI — Backend Setup Guide (macOS)

School Management System REST API
**Dragks Technologies**

---

## Prerequisites

### Install Homebrew (if not already installed)

Homebrew is the package manager for macOS. Open Terminal and run:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### Node.js (v18 or higher)

```bash
brew install node@18
node --version
```

### PostgreSQL (v15 or higher)

```bash
brew install postgresql@15
brew services start postgresql@15
```

### Git (usually pre-installed on macOS)

```bash
git --version
```

If not installed, macOS will prompt you to install Xcode Command Line Tools. Accept and proceed.

---

## Step 1 — Set Up PostgreSQL

Open Terminal and access PostgreSQL:

```bash
psql postgres
```

Create the database:

```sql
CREATE DATABASE edutrack;
CREATE USER edutrack_user WITH PASSWORD 'yourpassword';
GRANT ALL PRIVILEGES ON DATABASE edutrack TO edutrack_user;
\q
```

Note down:
- **Username:** `edutrack_user` (or your macOS username, which PostgreSQL often uses by default)
- **Password:** the one you just set
- **Port:** `5432` (default)

> **Tip:** On macOS, PostgreSQL sometimes uses your macOS username as the default superuser. If `psql postgres` fails, try `psql -U $(whoami)`.

---

## Step 2 — Unzip the Project

```bash
unzip edutrack-backend-final.zip
cd edutrack-backend
```

Or open Finder, double-click the zip to extract, then drag the folder to Terminal to get the path.

---

## Step 3 — Create the .env File

```bash
cp .env.example .env
open -e .env
```

This opens `.env` in TextEdit. Fill in your values:

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

Save the file: `Cmd + S`, then close TextEdit.

> **Tip:** You can also use VS Code to edit the file: `code .env`

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

Open Safari or Chrome and go to:

```
http://localhost:3000/api/docs
```

You should see the Swagger documentation with all API endpoints listed. If you see this — the backend is running correctly.

---

## Connecting Flutter App (Physical Phone)

Find your Mac's local network IP address:

```bash
ipconfig getifaddr en0
```

If that returns nothing (you may be on Ethernet or a different interface):

```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

You will see something like `192.168.1.105`. In the Flutter app, set the API base URL to:

```
http://192.168.1.105:3000/api/v1
```

> Both the phone and the Mac must be connected to the same WiFi network.

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
| `npx prisma studio` | Open visual database browser |
| `npx prisma migrate dev` | Apply new migrations |
| `npx prisma migrate reset` | Reset database (deletes all data) |

---

## Running as a Background Process (optional)

Install PM2 to keep the server running after closing Terminal:

```bash
npm install -g pm2
npm run build
pm2 start dist/main.js --name edutrack-api
pm2 save
pm2 startup
```

---

## Troubleshooting

**PostgreSQL not running**
```bash
brew services restart postgresql@15
brew services list  # Check status
```

**psql: command not found**
```bash
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
echo 'export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

**Port 3000 already in use**
```bash
lsof -i :3000
# Note the PID and kill it: kill -9 <PID>
# Or change PORT=3001 in .env
```

**Permission denied on uploads folder**
```bash
mkdir -p uploads
chmod 755 uploads
```

**Prisma client out of sync after schema changes**
```bash
npx prisma generate
npm run start:dev
```

**npm install fails with node-gyp errors**
```bash
xcode-select --install
npm install
```
