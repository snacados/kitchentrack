# Kitchen Track — Complete Setup Guide (From Zero)

This guide assumes you have nothing installed and walks you through every step to get your Kitchen Track app live on Cloudflare Pages.

---

## Part 1: Install the Tools You Need

You need two things installed on your computer: **Git** (to upload your code) and **Node.js** (to build the app). Pick your operating system below.

### Windows

**Step 1 — Install Git:**
1. Go to https://git-scm.com/download/win
2. Download the installer and run it
3. Click "Next" through all the screens — the defaults are fine
4. When done, you'll have a program called **Git Bash** — use this for all the commands below

**Step 2 — Install Node.js:**
1. Go to https://nodejs.org
2. Download the **LTS** version (the green button on the left)
3. Run the installer, click "Next" through everything
4. Restart your computer after installing

**Step 3 — Verify both are installed:**
Open **Git Bash** (search for it in your Start menu) and type:
```
git --version
node --version
```
Both should print a version number. If they do, you're good.

---

### Mac

**Step 1 — Install Git:**
1. Open the **Terminal** app (search for "Terminal" in Spotlight with Cmd+Space)
2. Type: `git --version`
3. If Git isn't installed, your Mac will prompt you to install it — click "Install"
4. If it prints a version number, you already have it

**Step 2 — Install Node.js:**
1. Go to https://nodejs.org
2. Download the **LTS** version (the green button)
3. Open the downloaded `.pkg` file and follow the installer

**Step 3 — Verify:**
In Terminal, type:
```
git --version
node --version
```
Both should print version numbers.

---

## Part 2: Create a GitHub Account

You need a free GitHub account to connect your code to Cloudflare.

1. Go to https://github.com
2. Click **Sign up** and follow the steps
3. Verify your email address

---

## Part 3: Set Up Your Project Files

**Step 1 — Download the files from this conversation:**
Download ALL of these files from the chat and save them into a single folder on your computer. For example, create a folder on your Desktop called `kitchen-track`.

The folder structure must look EXACTLY like this:
```
kitchen-track/
├── index.html
├── package.json
├── vite.config.js
├── wrangler.toml
├── .gitignore
├── public/
│   ├── _headers
│   └── _redirects
└── src/
    ├── main.jsx
    └── App.jsx
```

**Important — make sure you have the right files in the right places:**
- `index.html`, `package.json`, `vite.config.js`, `wrangler.toml`, and `.gitignore` go directly in the `kitchen-track` folder
- Create a subfolder called `src` and put `main.jsx` and `App.jsx` inside it
- Create a subfolder called `public` and put `_headers` and `_redirects` inside it
- The file `kitchen-track.jsx` from the chat is the same as `App.jsx` — you only need one copy, saved as `src/App.jsx`

**Note about the `.gitignore` file:** On Mac, files starting with a dot are hidden by default. If you can't see it after downloading:
- In Finder, press `Cmd + Shift + .` to show hidden files
- Or just create it yourself: open Terminal, navigate to your folder, and type `echo "node_modules\ndist\n.wrangler" > .gitignore`

**Step 2 — Test the build locally (optional but recommended):**
Open your terminal (Git Bash on Windows, Terminal on Mac) and navigate to your folder:
```bash
cd ~/Desktop/kitchen-track
```
Then run:
```bash
npm install
npm run build
```
If you see a `dist/` folder appear with no errors, everything is correct. If you get an error about `src/main.jsx` not found, double-check that the `src/` folder exists with `main.jsx` and `App.jsx` inside it.

---

## Part 4: Upload Your Code to GitHub

**Step 1 — Create a new repository on GitHub:**
1. Go to https://github.com/new
2. Repository name: `kitchen-track`
3. Leave it as **Public** (Cloudflare needs to read it)
4. Do NOT check "Add a README" or any other boxes
5. Click **Create repository**
6. You'll see a page with instructions — keep this page open

**Step 2 — Push your code:**
Open your terminal and navigate to your project folder:
```bash
cd ~/Desktop/kitchen-track
```

Now run these commands one at a time:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/kitchen-track.git
git push -u origin main
```

**Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username.**

When you run `git push`, GitHub will ask for your credentials:
- **Username:** Your GitHub username
- **Password:** You need a **Personal Access Token** (not your regular password)

**To create a Personal Access Token:**
1. Go to https://github.com/settings/tokens
2. Click **Generate new token (classic)**
3. Give it a name like "kitchen-track"
4. Check the **repo** box
5. Click **Generate token**
6. Copy the token immediately — you won't see it again
7. Paste it when Git asks for your password

**Step 3 — Verify your code is on GitHub:**
Go to `https://github.com/YOUR_USERNAME/kitchen-track` in your browser. You should see all your files, including the `src/` folder with `main.jsx` and `App.jsx` inside it.

If the `src/` folder is missing, that's the problem. Go back and make sure the folder structure is correct, then run:
```bash
git add .
git commit -m "Add missing files"
git push
```

---

## Part 5: Deploy to Cloudflare Pages

**Step 1 — Create a Cloudflare account:**
1. Go to https://dash.cloudflare.com/sign-up
2. Sign up with your email — it's free

**Step 2 — Create a Pages project:**
1. In the Cloudflare dashboard, click **Workers & Pages** in the left sidebar
2. Click the **Create** button
3. Click the **Pages** tab
4. Click **Connect to Git**

**Step 3 — Connect GitHub:**
1. Click **Connect GitHub**
2. Authorize Cloudflare to access your repositories
3. Select the `kitchen-track` repository
4. Click **Begin setup**

**Step 4 — Configure the build:**
- **Project name:** `kitchen-track` (this becomes your URL)
- **Production branch:** `main`
- **Framework preset:** Select **Vite** from the dropdown
- **Build command:** `npm install && npm run build`
- **Build output directory:** `dist`

**Step 5 — Deploy:**
1. Click **Save and Deploy**
2. Wait for the build to complete (usually 1-2 minutes)
3. When it says "Success", your app is live!

**Step 6 — Visit your app:**
Your app will be at: `https://kitchen-track.pages.dev`

(If the name was taken, Cloudflare may add a suffix like `kitchen-track-abc.pages.dev`)

---

## Part 6: Making Changes Later

Whenever you want to update the app:

1. Edit the files in your `kitchen-track` folder
2. Open your terminal and navigate to the folder:
   ```bash
   cd ~/Desktop/kitchen-track
   ```
3. Push the changes:
   ```bash
   git add .
   git commit -m "Description of what you changed"
   git push
   ```
4. Cloudflare automatically detects the push and re-deploys (takes about 1 minute)

---

## Troubleshooting

**"src/main.jsx not found" during build:**
Your `src/` folder didn't get uploaded. Go to your GitHub repo in a browser and check that `src/main.jsx` and `src/App.jsx` exist. If not, make sure the files are in the right place locally and run `git add . && git commit -m "fix" && git push`.

**"Permission denied" when pushing to GitHub:**
You need a Personal Access Token — see Part 4, Step 2 above.

**Build succeeds but app shows a blank page:**
Open browser developer tools (F12) and check the Console tab for errors. The most common cause is a typo in a filename — make sure `App.jsx` has a capital A.

**"command not found: git" or "command not found: node":**
The tool isn't installed or your terminal needs to be restarted. Close and reopen your terminal, then try again.

**Changes aren't showing up:**
Make sure you committed AND pushed. Run `git status` — if it shows changed files, you need to `git add . && git commit -m "update" && git push`.
