# GlucoMate

A minimal, full‑stack diabetes companion app. Backend uses **Node.js + Express + SQLite (better‑sqlite3 + Sequelize)**; frontend is a lightweight **React/Vite** app. Includes JWT auth, medication reminders via cron, and optional email notifications via SMTP.

---

## Table of contents

* [Features](#features)
* [Requirements](#requirements)
* [Quick start](#quick-start)
* [Environment variables](#environment-variables)
* [Running the servers](#running-the-servers)
* [Useful API routes](#useful-api-routes)



---

## Features

* JWT-based authentication
* CRUD for glucose readings & medications
* Per‑user medication schedule with cron‑based email reminders
* SQLite database with WAL mode; painless local dev (single `gluco_mate.db` file)
* Debug routes for sending test mail and running reminder sweeps on demand



---

## Requirements

* **Node.js** 18+ (tested on 22.x)
* **npm** 8+
* **Git** (optional, for cloning/pushing)
* Outbound internet if you plan to use SMTP (Gmail app password)

---

## Quick start

```bash
# 1) Clone your repo
git clone https://github.com/Mohammed Ghara/gluco-mate.git
cd gluco-mate

# 2) Install dependencies
In two terminals:
cd server
npm install
cd client
npm install

# 3) Configure environment
#   Create server/.env (see below). Client env is optional. if you have two ..

# 4) Start both apps (two terminals)
npm run dev      # http://localhost:5000
npm run dev      # http://localhost:5173
```

If you prefer a single command runner, install something like `concurrently` and wire a root `start` script (not included by default).

---

## Environment variables

Create **`server/.env`**:

```ini
# Server
PORT=5000

# JWT
JWT_SECRET=replace_with_a_long_random_string

# SMTP (optional, for email reminders)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=0            # 0 = STARTTLS (port 587), 1 = SSL (port 465)
SMTP_USER=you@gmail.com  # sender account
SMTP_PASS=your_16_char_google_app_password
SMTP_FROM=you@gmail.com  # or "Your App <you@gmail.com>"
```

> **Gmail note**: You must enable 2‑Step Verification on the account and create an **App Password**. Regular passwords are rejected with `535 5.7.8`.

Optional **`client/.env`** (Vite reads `VITE_*`):

```ini
VITE_API_URL=http://localhost:5000
```

---

## Running the servers

### Backend (Express)

```bash
cd server
npm run dev
```

The server prints `SQLite connected successfully: <path>/gluco_mate.db` and starts at **[http://localhost:5000](http://localhost:5000)**.

### Frontend (Vite)

```bash
cd client
npm run dev
```

Opens **[http://localhost:5173](http://localhost:5173)**. The UI expects `VITE_API_URL` to point to the backend.

---

## Useful API routes

Public endpoints:

* `GET  /api/health` – health check
* `POST /api/auth/register` – register `{ email, password }`
* `POST /api/auth/login` – login → `{ token }`

Protected (send header `Authorization: Bearer <token>`):

* `GET  /api/readings` / `POST /api/readings` …
* `GET  /api/meds` etc.
* `GET/POST /api/user/meds` (or `/api` with `auth` depending on your mount)

Debug (do not expose in production):

* `POST /api/debug/mail` – send a test email `{ to: "you@example.com" }`
* `POST /api/debug/remind-now` – run the reminder sweep immediately

PowerShell friendly request (Windows):

```powershell
irm -Method Post -Uri 'http://localhost:5000/api/debug/mail' -ContentType 'application/json' -Body '{ "to": "you@example.com" }'
```

