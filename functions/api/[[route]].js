// Cloudflare Pages Function — handles all /api/* routes
// Uses D1 (SQLite) for storage, no external dependencies

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function err(message, status = 400) {
  return json({ error: message }, status);
}

function generateToken(userId) {
  const rand = [...crypto.getRandomValues(new Uint8Array(24))]
    .map(b => b.toString(16).padStart(2, "0")).join("");
  return btoa(`${userId}:${rand}`);
}

function parseToken(token) {
  try { return atob(token).split(":")[0] || null; }
  catch { return null; }
}

async function hashPassword(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode(salt), iterations: 100000, hash: "SHA-256" },
    keyMaterial, 256
  );
  return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function generateId() {
  return [...crypto.getRandomValues(new Uint8Array(16))]
    .map(b => b.toString(16).padStart(2, "0")).join("");
}

async function getUser(db, request) {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const userId = parseToken(token);
  if (!userId) return null;
  const session = await db.prepare("SELECT user_id FROM sessions WHERE token = ? AND user_id = ?").bind(token, userId).first();
  if (!session) return null;
  return await db.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
}

async function initDb(db) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
      password_hash TEXT NOT NULL, salt TEXT NOT NULL, household_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY, user_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS households (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, owner_id TEXT NOT NULL,
      invite_code TEXT UNIQUE, created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (owner_id) REFERENCES users(id)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY, household_id TEXT NOT NULL, name TEXT NOT NULL,
      location TEXT NOT NULL, category TEXT NOT NULL, subtype TEXT,
      quantity INTEGER DEFAULT 1, purchase_date TEXT, expiration_date TEXT,
      added_by TEXT, created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (household_id) REFERENCES households(id)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY, household_id TEXT NOT NULL, title TEXT NOT NULL,
      source_url TEXT, ingredients TEXT NOT NULL, steps TEXT NOT NULL,
      tags TEXT, servings TEXT, prep_time TEXT, cook_time TEXT,
      added_by TEXT, created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (household_id) REFERENCES households(id)
    )`),
  ]);
}

// ─── Auth ───

async function signup(db, body) {
  const { email, password, name } = body;
  if (!email || !password || !name) return err("Email, password, and name are required");
  if (password.length < 6) return err("Password must be at least 6 characters");
  const existing = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email.toLowerCase()).first();
  if (existing) return err("Email already registered");
  const userId = generateId(), salt = generateId();
  const hash = await hashPassword(password, salt);
  await db.prepare("INSERT INTO users (id, email, name, password_hash, salt) VALUES (?, ?, ?, ?, ?)")
    .bind(userId, email.toLowerCase(), name, hash, salt).run();
  const householdId = generateId(), inviteCode = generateId().slice(0, 8).toUpperCase();
  await db.prepare("INSERT INTO households (id, name, owner_id, invite_code) VALUES (?, ?, ?, ?)")
    .bind(householdId, `${name}'s Kitchen`, userId, inviteCode).run();
  await db.prepare("UPDATE users SET household_id = ? WHERE id = ?").bind(householdId, userId).run();
  const token = generateToken(userId);
  await db.prepare("INSERT INTO sessions (token, user_id) VALUES (?, ?)").bind(token, userId).run();
  return json({ token, user: { id: userId, email: email.toLowerCase(), name, household_id: householdId } });
}

async function login(db, body) {
  const { email, password } = body;
  if (!email || !password) return err("Email and password are required");
  const user = await db.prepare("SELECT * FROM users WHERE email = ?").bind(email.toLowerCase()).first();
  if (!user) return err("Invalid email or password", 401);
  const hash = await hashPassword(password, user.salt);
  if (hash !== user.password_hash) return err("Invalid email or password", 401);
  const token = generateToken(user.id);
  await db.prepare("INSERT INTO sessions (token, user_id) VALUES (?, ?)").bind(token, user.id).run();
  return json({ token, user: { id: user.id, email: user.email, name: user.name, household_id: user.household_id } });
}

async function logout(db, request) {
  const auth = request.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) await db.prepare("DELETE FROM sessions WHERE token = ?").bind(auth.slice(7)).run();
  return json({ ok: true });
}

async function getMe(db, user) {
  const household = await db.prepare("SELECT * FROM households WHERE id = ?").bind(user.household_id).first();
  const members = await db.prepare("SELECT id, name, email FROM users WHERE household_id = ?").bind(user.household_id).all();
  return json({
    user: { id: user.id, email: user.email, name: user.name, household_id: user.household_id },
    household: household ? { id: household.id, name: household.name, invite_code: household.invite_code, owner_id: household.owner_id } : null,
    members: members.results || [],
  });
}

// ─── Household ───

async function updateHousehold(db, user, body) {
  const h = await db.prepare("SELECT * FROM households WHERE id = ? AND owner_id = ?").bind(user.household_id, user.id).first();
  if (!h) return err("Only the household owner can update settings", 403);
  if (body.name) await db.prepare("UPDATE households SET name = ? WHERE id = ?").bind(body.name, h.id).run();
  return json({ ok: true });
}

async function joinHousehold(db, user, body) {
  if (!body.invite_code) return err("Invite code is required");
  const household = await db.prepare("SELECT * FROM households WHERE invite_code = ?").bind(body.invite_code.toUpperCase()).first();
  if (!household) return err("Invalid invite code");
  const oldId = user.household_id;
  await db.prepare("UPDATE users SET household_id = ? WHERE id = ?").bind(household.id, user.id).run();
  if (oldId) {
    const rem = await db.prepare("SELECT COUNT(*) as c FROM users WHERE household_id = ?").bind(oldId).first();
    if (rem.c === 0) {
      await db.batch([
        db.prepare("DELETE FROM items WHERE household_id = ?").bind(oldId),
        db.prepare("DELETE FROM recipes WHERE household_id = ?").bind(oldId),
        db.prepare("DELETE FROM households WHERE id = ?").bind(oldId),
      ]);
    }
  }
  return json({ ok: true, household_id: household.id, household_name: household.name });
}

async function regenerateInvite(db, user) {
  const h = await db.prepare("SELECT * FROM households WHERE id = ? AND owner_id = ?").bind(user.household_id, user.id).first();
  if (!h) return err("Only the household owner can regenerate the invite code", 403);
  const newCode = generateId().slice(0, 8).toUpperCase();
  await db.prepare("UPDATE households SET invite_code = ? WHERE id = ?").bind(newCode, h.id).run();
  return json({ invite_code: newCode });
}

async function removeMember(db, user, memberId) {
  const h = await db.prepare("SELECT * FROM households WHERE id = ? AND owner_id = ?").bind(user.household_id, user.id).first();
  if (!h) return err("Only the household owner can remove members", 403);
  if (memberId === user.id) return err("Cannot remove yourself");
  const member = await db.prepare("SELECT * FROM users WHERE id = ? AND household_id = ?").bind(memberId, user.household_id).first();
  if (!member) return err("Member not found");
  const nid = generateId(), ic = generateId().slice(0, 8).toUpperCase();
  await db.prepare("INSERT INTO households (id, name, owner_id, invite_code) VALUES (?, ?, ?, ?)").bind(nid, `${member.name}'s Kitchen`, memberId, ic).run();
  await db.prepare("UPDATE users SET household_id = ? WHERE id = ?").bind(nid, memberId).run();
  return json({ ok: true });
}

// ─── Items CRUD ───

async function getItems(db, user) {
  const items = await db.prepare("SELECT * FROM items WHERE household_id = ? ORDER BY expiration_date ASC").bind(user.household_id).all();
  return json(items.results || []);
}

async function addItem(db, user, body) {
  const id = generateId();
  await db.prepare(`INSERT INTO items (id, household_id, name, location, category, subtype, quantity, purchase_date, expiration_date, added_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, user.household_id, body.name, body.location, body.category, body.subtype || null, body.quantity || 1, body.purchaseDate || null, body.expirationDate || null, user.name).run();
  return json({ id, ...body, added_by: user.name });
}

async function updateItem(db, user, itemId, body) {
  const item = await db.prepare("SELECT * FROM items WHERE id = ? AND household_id = ?").bind(itemId, user.household_id).first();
  if (!item) return err("Item not found", 404);
  const fields = [], values = [];
  for (const [key, val] of Object.entries(body)) {
    fields.push(`${key.replace(/([A-Z])/g, "_$1").toLowerCase()} = ?`); values.push(val);
  }
  fields.push("updated_at = datetime('now')"); values.push(itemId, user.household_id);
  await db.prepare(`UPDATE items SET ${fields.join(", ")} WHERE id = ? AND household_id = ?`).bind(...values).run();
  return json({ ok: true });
}

async function deleteItem(db, user, itemId) {
  await db.prepare("DELETE FROM items WHERE id = ? AND household_id = ?").bind(itemId, user.household_id).run();
  return json({ ok: true });
}

// ─── Recipes CRUD ───

async function getRecipes(db, user) {
  const recipes = await db.prepare("SELECT * FROM recipes WHERE household_id = ? ORDER BY created_at DESC").bind(user.household_id).all();
  return json((recipes.results || []).map(r => ({
    ...r, ingredients: JSON.parse(r.ingredients || "[]"), steps: JSON.parse(r.steps || "[]"), tags: JSON.parse(r.tags || "[]"),
  })));
}

async function addRecipe(db, user, body) {
  const id = generateId();
  if (!body.title || !body.ingredients || !body.steps) return err("Title, ingredients, and steps are required");
  await db.prepare(`INSERT INTO recipes (id, household_id, title, source_url, ingredients, steps, tags, servings, prep_time, cook_time, added_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, user.household_id, body.title, body.source_url || null, JSON.stringify(body.ingredients), JSON.stringify(body.steps), JSON.stringify(body.tags || []), body.servings || null, body.prep_time || null, body.cook_time || null, user.name).run();
  return json({ id, ...body, added_by: user.name });
}

async function updateRecipe(db, user, recipeId, body) {
  const recipe = await db.prepare("SELECT * FROM recipes WHERE id = ? AND household_id = ?").bind(recipeId, user.household_id).first();
  if (!recipe) return err("Recipe not found", 404);
  const updates = {};
  if (body.title) updates.title = body.title;
  if (body.source_url !== undefined) updates.source_url = body.source_url;
  if (body.ingredients) updates.ingredients = JSON.stringify(body.ingredients);
  if (body.steps) updates.steps = JSON.stringify(body.steps);
  if (body.tags) updates.tags = JSON.stringify(body.tags);
  if (body.servings !== undefined) updates.servings = body.servings;
  if (body.prep_time !== undefined) updates.prep_time = body.prep_time;
  if (body.cook_time !== undefined) updates.cook_time = body.cook_time;
  const fields = Object.keys(updates).map(k => `${k} = ?`), values = Object.values(updates);
  if (fields.length === 0) return json({ ok: true });
  values.push(recipeId, user.household_id);
  await db.prepare(`UPDATE recipes SET ${fields.join(", ")} WHERE id = ? AND household_id = ?`).bind(...values).run();
  return json({ ok: true });
}

async function deleteRecipe(db, user, recipeId) {
  await db.prepare("DELETE FROM recipes WHERE id = ? AND household_id = ?").bind(recipeId, user.household_id).run();
  return json({ ok: true });
}

// ─── Recipe URL Import ───

async function importRecipe(db, user, body) {
  if (!body.url) return err("URL is required");
  let html;
  try {
    const resp = await fetch(body.url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; KitchenTrack/1.0)" }, cf: { cacheTtl: 3600 } });
    html = await resp.text();
  } catch (e) { return err("Could not fetch the URL: " + e.message); }

  // Try JSON-LD structured data first (most recipe sites use this)
  let extracted = null;
  const jsonLdMatches = html.match(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (jsonLdMatches) {
    for (const match of jsonLdMatches) {
      try {
        const content = match.replace(/<script[^>]*>/i, "").replace(/<\/script>/i, "").trim();
        let data = JSON.parse(content);
        if (data["@graph"]) data = data["@graph"];
        if (Array.isArray(data)) data = data.find(d => d["@type"] === "Recipe" || (Array.isArray(d["@type"]) && d["@type"].includes("Recipe")));
        if (data && (data["@type"] === "Recipe" || (Array.isArray(data["@type"]) && data["@type"].includes("Recipe")))) {
          extracted = parseJsonLd(data);
          break;
        }
      } catch { /* try next */ }
    }
  }

  // Fallback: HTML parsing
  if (!extracted) extracted = parseHtml(html);

  if (extracted.ingredients.length === 0 && extracted.steps.length === 0) {
    return err("Could not extract a recipe from this URL. The site may use a format we can't parse. Try adding the recipe manually.");
  }

  const id = generateId();
  await db.prepare(`INSERT INTO recipes (id, household_id, title, source_url, ingredients, steps, tags, servings, prep_time, cook_time, added_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, user.household_id, extracted.title, body.url, JSON.stringify(extracted.ingredients), JSON.stringify(extracted.steps), JSON.stringify(extracted.tags || []), extracted.servings || null, extracted.prep_time || null, extracted.cook_time || null, user.name).run();

  return json({ id, title: extracted.title, source_url: body.url, ingredients: extracted.ingredients, steps: extracted.steps, tags: extracted.tags || [], servings: extracted.servings, prep_time: extracted.prep_time, cook_time: extracted.cook_time, added_by: user.name });
}

function parseJsonLd(data) {
  const ingredients = (data.recipeIngredient || []).map(i => (typeof i === "string" ? i : String(i)).trim()).filter(Boolean);
  let steps = [];
  for (const s of (data.recipeInstructions || [])) {
    if (typeof s === "string") steps.push(s.trim());
    else if (s.text) steps.push(s.text.trim());
    else if (s["@type"] === "HowToSection" && s.itemListElement) {
      for (const sub of s.itemListElement) { if (sub.text) steps.push(sub.text.trim()); else if (typeof sub === "string") steps.push(sub.trim()); }
    }
  }
  const fmtDur = (iso) => { if (!iso) return null; const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/); return m ? ((m[1] ? m[1]+"h " : "") + (m[2] ? m[2]+"m" : "")).trim() || null : null; };
  return {
    title: data.name || "Untitled Recipe", ingredients, steps: steps.filter(Boolean),
    servings: data.recipeYield ? (Array.isArray(data.recipeYield) ? data.recipeYield[0] : String(data.recipeYield)) : null,
    prep_time: fmtDur(data.prepTime), cook_time: fmtDur(data.cookTime),
    tags: [...(data.recipeCategory ? [].concat(data.recipeCategory) : []), ...(data.recipeCuisine ? [].concat(data.recipeCuisine) : [])].filter(Boolean),
  };
}

function parseHtml(html) {
  const strip = (s) => s.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&#\d+;/g, "").trim();
  let title = "Untitled Recipe";
  const tm = html.match(/<h1[^>]*class="[^"]*(?:recipe|entry)[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([\s\S]*?)<\/title>/i);
  if (tm) title = strip(tm[1]).split("|")[0].split("-")[0].trim();
  const ingredients = [];
  const ingS = html.match(/<ul[^>]*class="[^"]*ingredient[^"]*"[^>]*>([\s\S]*?)<\/ul>/i) || html.match(/<div[^>]*class="[^"]*ingredient[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (ingS) { for (const m of ingS[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) ingredients.push(strip(m[1])); }
  const steps = [];
  const stS = html.match(/<ol[^>]*class="[^"]*(?:instruction|direction|step)[^"]*"[^>]*>([\s\S]*?)<\/ol>/i) || html.match(/<div[^>]*class="[^"]*(?:instruction|direction|step)[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (stS) { for (const m of stS[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) { const t = strip(m[1]); if (t.length > 10) steps.push(t); } }
  return { title, ingredients: ingredients.filter(Boolean), steps: steps.filter(Boolean), servings: null, prep_time: null, cook_time: null, tags: [] };
}

// ─── Router ───

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace("/api", "");
  const method = request.method;

  if (method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });

  try {
    const db = env.DB;
    if (!db) return err("Database not configured. Please bind a D1 database named 'DB' to this Pages project.", 503);
    await initDb(db);

    if (path === "/auth/signup" && method === "POST") return await signup(db, await request.json());
    if (path === "/auth/login" && method === "POST") return await login(db, await request.json());
    if (path === "/auth/logout" && method === "POST") return await logout(db, request);

    const user = await getUser(db, request);
    if (!user) return err("Unauthorized", 401);

    if (path === "/me" && method === "GET") return await getMe(db, user);
    if (path === "/household" && method === "PUT") return await updateHousehold(db, user, await request.json());
    if (path === "/household/join" && method === "POST") return await joinHousehold(db, user, await request.json());
    if (path === "/household/invite" && method === "POST") return await regenerateInvite(db, user);
    if (path.startsWith("/household/members/") && method === "DELETE") return await removeMember(db, user, path.split("/").pop());

    if (path === "/items" && method === "GET") return await getItems(db, user);
    if (path === "/items" && method === "POST") return await addItem(db, user, await request.json());
    if (path.startsWith("/items/") && method === "PUT") return await updateItem(db, user, path.split("/").pop(), await request.json());
    if (path.startsWith("/items/") && method === "DELETE") return await deleteItem(db, user, path.split("/").pop());

    if (path === "/recipes" && method === "GET") return await getRecipes(db, user);
    if (path === "/recipes" && method === "POST") return await addRecipe(db, user, await request.json());
    if (path === "/recipes/import" && method === "POST") return await importRecipe(db, user, await request.json());
    if (path.startsWith("/recipes/") && method === "PUT") return await updateRecipe(db, user, path.split("/").pop(), await request.json());
    if (path.startsWith("/recipes/") && method === "DELETE") return await deleteRecipe(db, user, path.split("/").pop());

    return err("Not found", 404);
  } catch (e) {
    console.error("API Error:", e);
    return err("Internal server error: " + (e.message || "Unknown error"), 500);
  }
}
