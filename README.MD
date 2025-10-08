# BankBlood

A blood donation management web app (Node.js/Express + React) with inventory, issues/emergencies, and stats.

## Quick Start

### 1) Backend
```bash
cd BankBlood  # adjust if your server folder name differs
npm install
cp .env.example .env    # if you have one; otherwise create .env (see below)
npm run dev             # or: npm start
```

**Environment variables (.env):**
```
PORT=4000
DB_DIALECT=sqlite
DB_STORAGE=./bloodbank.sqlite
JWT_SECRET=change_me
```

### 2) Frontend
```bash
cd client
npm install
npm run dev
```

## Scripts
- Server: `npm run dev` (nodemon) or `npm start`
- Client: `npm run dev`

## Project Structure (simplified)
- `BankBlood/` – Node.js/Express API (routes: auth, donation, issue, emergency, stats, etc.)
- `client/` – React front‑end (login/register, dashboards)
- `bloodbank.sqlite` – local SQLite database (ignored by git)

## Deployment Notes
- Never commit `.env` or `*.sqlite` to GitHub.
- Set environment variables on your hosting (Render/Heroku/Vercel/Netlify).
- Use a persistent database (e.g., PostgreSQL) for production.
## env
*   DB_DIALECT=sqlite
*   DB_STORAGE=./bloodbank.sqlite
*   PORT=3000
*   JWT_SECRET=supersecret_change_me
*   ADMIN_EMAIL=admin@gmail.com
*   ADMIN_PASSWORD=123
*   ADMIN_NAME=Admin
*   AUTO_OPEN_ADMIN=true

**  So just after using npm start we create a super user (admin) with these informations:
mail : admin@gmail.com  
pass: 123
