# EduTrack AI — Backend Setup Guide (Windows)

School Management System REST API
**Dragks Technologies**

---

## Prerequisites

Download and install all three before starting:

| Software | Where to Download | Version |
|---|---|---|
| Node.js | https://nodejs.org | v18 or higher |
| PostgreSQL | https://www.postgresql.org/download/windows | v15 or higher |
| Git | https://git-scm.com/download/win | Latest |

All three have standard Windows installers — Next, Next, Finish.

---

## Step 1 — Set Up PostgreSQL

After installing PostgreSQL, open **pgAdmin** (installed automatically with PostgreSQL) or open **SQL Shell (psql)** from the Start Menu.

Create the EduTrack database:

```sql
CREATE DATABASE edutrack;
```

Note down these values — you will need them in Step 3:
- **Username** (default: `postgres`)
- **Password** (the one you set during PostgreSQL installation)
- **Port** (default: `5432`)

---

## Step 2 — Unzip and Open the Project

1. Unzip `edutrack-backend-final.zip` to any folder on your PC
2. Open the folder in **VS Code**
3. Open the terminal inside VS Code: `Ctrl + backtick (`)` or go to Terminal → New Terminal

All remaining commands are run inside this terminal.

---

## Step 3 — Create the .env File

Copy the example environment file:

```bash
copy .env.example .env
```

Open `.env` in VS Code and fill in your values:

```env
# Database
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/edutrack"

# JWT — use any long random strings (min 32 characters)
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

Replace `yourpassword` with the PostgreSQL password you set during installation.

---

## Step 4 — Install Dependencies

```bash
npm install
```

This downloads all required packages. May take a few minutes on first run.

---

## Step 5 — Run Database Migrations

This creates all the database tables:

```bash
npx prisma migrate dev --name init
```

Then generate the Prisma client:

```bash
npx prisma generate
```

---

## Step 6 — Seed the Database

This creates the SUPER_ADMIN account (Dragks Technologies). Run this only once:

```bash
npx ts-node prisma/seed.ts
```

You should see: `✅ SUPER_ADMIN created: treasure@dragks.com`

If you see `✅ SUPER_ADMIN already exists — skipping creation`, that is also fine.

---

## Step 7 — Start the Server

```bash
npm run start:dev
```

You should see:

```
🚀 EduTrack API running on http://localhost:3000/api/v1
📚 Swagger docs:         http://localhost:3000/api/docs
```

---

## Step 8 — Confirm It Is Working

Open your browser and go to:

```
http://localhost:3000/api/docs
```

You should see the Swagger documentation with all API endpoints listed and interactive. If you see this page — the backend is running correctly.

---

## Connecting Flutter App (Physical Phone)

When testing on a physical phone, `localhost` means the phone itself — not your PC. You need your PC's local network IP address.

**Find your PC's IP address:**

Open Command Prompt (search "cmd" in Start Menu) and run:

```bash
ipconfig
```

Look for **IPv4 Address** under your active WiFi adapter. It will look like:

```
IPv4 Address. . . . . . . . . . . : 192.168.1.105
```

**In the Flutter app**, set the API base URL to:

```
http://192.168.1.105:3000/api/v1
```

Replace `192.168.1.105` with your actual IP address.

> Both the phone and the PC must be connected to the same WiFi network.

---

## Login Credentials

| Role | Login Field | Endpoint |
|---|---|---|
| Super Admin / Admin | Email + Password | `POST /api/v1/auth/login` |
| Teacher | Staff ID + Password | `POST /api/v1/auth/teacher/login` |
| Student | Student ID + Password | `POST /api/v1/auth/student/login` |

**Super Admin first login:**
- Email: the `SUPER_ADMIN_EMAIL` you set in `.env`
- Password: the `SUPER_ADMIN_PASSWORD` you set in `.env`

---

## Useful Commands

| Command | What It Does |
|---|---|
| `npm run start:dev` | Start server with hot reload (development) |
| `npm run build` | Build for production |
| `npm run start` | Start production build |
| `npx prisma studio` | Open visual database browser in browser |
| `npx prisma migrate dev` | Apply new migrations after schema changes |
| `npx prisma migrate reset` | Reset database (deletes all data) |

---

## Swagger API Docs

```
http://localhost:3000/api/docs
```

Every endpoint is documented here with request bodies, response shapes, and a Try It button for live testing.

---

## Troubleshooting

**Error: Cannot connect to database**
- Make sure PostgreSQL is running. Open Services (Win + R → services.msc) and check that `postgresql` is running.
- Double-check your `DATABASE_URL` in `.env` — especially the password.

**Error: Port 3000 already in use**
- Change `PORT=3001` in `.env` and restart.

**Error: Cannot find module**
- Run `npm install` again.

**Prisma errors after schema changes**
- Run `npx prisma generate` then restart the server.
