# Kitchen Track v2 — With Accounts & Household Sync

## What's New

This version adds user accounts and household sharing. Everyone in a household sees the same inventory in real-time across all their devices.

- **Sign up / Sign in** — Simple email + password auth
- **Households** — Each user gets a household when they sign up
- **Invite code** — Share your 8-character code so family members can join
- **Cloud sync** — All data stored in Cloudflare D1 (serverless database), synced every 30 seconds
- **Member management** — Household owner can rename, regenerate invite codes, or remove members

---

## How It Works

- **Frontend**: React (Vite) → deployed as static files on Cloudflare Pages
- **Backend**: Cloudflare Pages Functions → serverless API at `/api/*`
- **Database**: Cloudflare D1 (SQLite at the edge) → tables auto-created on first request

---

## Deployment Guide (Step by Step)

### Prerequisites

You need these installed (see the previous guide if you need install instructions):
- **Git** — to push code
- **Node.js** — to build locally (optional but helpful)
- **Wrangler CLI** — Cloudflare's tool (we'll install this below)

### Step 1 — Install Wrangler

Open your terminal (Git Bash on Windows, Terminal on Mac) and run:

```bash
npm install -g wrangler
```

Then log in to Cloudflare:

```bash
wrangler login
```

This opens a browser window — click "Allow" to authorize.

### Step 2 — Create a D1 Database

Run this command to create your database:

```bash
wrangler d1 create kitchen-track-db
```

It will output something like:

```
✅ Successfully created DB 'kitchen-track-db'

[[d1_databases]]
binding = "DB"
database_name = "kitchen-track-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**Copy the `database_id` value** — you'll need it in the next step.

### Step 3 — Create wrangler.toml

Create a file called `wrangler.toml` in your project root (same folder as `package.json`) with this content:

```toml
name = "kitchen-track"
compatibility_date = "2024-09-23"
pages_build_output_dir = "./dist"

[[d1_databases]]
binding = "DB"
database_name = "kitchen-track-db"
database_id = "PASTE_YOUR_DATABASE_ID_HERE"
```

**Replace `PASTE_YOUR_DATABASE_ID_HERE` with the actual database_id from Step 2.**

⚠️ **IMPORTANT**: The `wrangler.toml` file is ONLY used for Wrangler CLI deploys. Do NOT push it if you're using Git-based deploys (see Step 4 options).

### Step 4 — Deploy

You have two options:

#### Option A: Deploy with Wrangler CLI (Recommended for D1)

This is the simplest way since D1 bindings are configured in `wrangler.toml`:

```bash
# Build the frontend
npm install
npm run build

# Deploy everything (Pages + Functions + D1 binding)
wrangler pages deploy dist --project-name kitchen-track
```

The first time, Wrangler will create the Pages project. Your app will be live at:
`https://kitchen-track.pages.dev`

**To update later:**
```bash
npm run build
wrangler pages deploy dist --project-name kitchen-track
```

#### Option B: Deploy via Git + Cloudflare Dashboard

1. Push your code to GitHub (but do NOT include `wrangler.toml`):
   ```bash
   git init
   git add .
   git commit -m "Kitchen Track v2"
   git remote add origin https://github.com/YOUR_USER/kitchen-track.git
   git push -u origin main
   ```

2. In the Cloudflare dashboard:
   - Go to **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
   - Select your repo, set framework to **Vite**, build command to `npm install && npm run build`, output to `dist`
   - Deploy

3. **Bind the D1 database** (this is the critical step):
   - Go to your Pages project → **Settings** → **Functions** → **D1 database bindings**
   - Click **Add binding**
   - Variable name: `DB`
   - D1 database: Select `kitchen-track-db`
   - Click **Save**

4. **Redeploy** to pick up the binding (push a commit or trigger a redeploy from the dashboard)

### Step 5 — Test It

1. Go to your app URL (e.g., `https://kitchen-track.pages.dev`)
2. You should see the sign-up / sign-in page
3. Create an account — this also creates your household
4. Add some items, then sign in from another device to see them sync

### Step 6 — Invite Family Members

1. Click your avatar (top right) → **Household Settings**
2. Copy the **Invite Code** (8-character code)
3. Send it to your family member
4. They sign up for their own account, then go to **Household Settings** → paste the code in **Join Another Household** → click **Join**
5. Now you all share the same inventory!

---

## Project Structure

```
kitchen-track/
├── index.html              # Entry point
├── package.json            # Dependencies
├── vite.config.js          # Vite config
├── wrangler.toml           # Cloudflare config (create manually, see Step 3)
├── .gitignore
├── public/
│   ├── _headers            # Security headers
│   └── _redirects          # SPA routing
├── src/
│   ├── main.jsx            # React mount
│   └── App.jsx             # Full app (auth + inventory)
└── functions/
    └── api/
        └── [[route]].js    # Backend API (auth, households, items CRUD)
```

---

## Troubleshooting

**"DB is not defined" or "Internal server error"**
The D1 database binding isn't configured. If using Wrangler CLI, check your `wrangler.toml` has the correct `database_id`. If using Git deploys, add the D1 binding in the Cloudflare dashboard (Settings → Functions → D1 database bindings → variable name `DB`).

**Sign up works but items don't save**
Same as above — the D1 binding is missing. The auth tables and items tables are all in the same D1 database.

**"Invalid email or password" but I just signed up**
Emails are case-insensitive (stored lowercase). Make sure you're using the same email.

**Changes from another device don't appear**
The app polls every 30 seconds. Wait a moment or refresh the page manually.

**"Unauthorized" errors after working fine**
Your session token may have been cleared. Sign in again.
