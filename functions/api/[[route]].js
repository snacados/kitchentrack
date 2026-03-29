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

// Simple token: base64(userId:randomHex)
function generateToken(userId) {
  const rand = [...crypto.getRandomValues(new Uint8Array(24))]
    .map(b => b.toString(16).padStart(2, "0")).join("");
  const raw = `${userId}:${rand}`;
  return btoa(raw);
}

function parseToken(token) {
  try {
    const decoded = atob(token);
    const userId = decoded.split(":")[0];
    return userId || null;
  } catch { return null; }
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
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      household_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS households (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      invite_code TEXT UNIQUE,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (owner_id) REFERENCES users(id)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      household_id TEXT NOT NULL,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      category TEXT NOT NULL,
      subtype TEXT,
      quantity INTEGER DEFAULT 1,
      purchase_date TEXT,
      expiration_date TEXT,
      added_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (household_id) REFERENCES households(id)
    )`),
  ]);
}

// ─── Route handlers ───

async function signup(db, body) {
  const { email, password, name } = body;
  if (!email || !password || !name) return err("Email, password, and name are required");
  if (password.length < 6) return err("Password must be at least 6 characters");

  const existing = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email.toLowerCase()).first();
  if (existing) return err("Email already registered");

  const userId = generateId();
  const salt = generateId();
  const hash = await hashPassword(password, salt);

  // Create user
  await db.prepare("INSERT INTO users (id, email, name, password_hash, salt) VALUES (?, ?, ?, ?, ?)")
    .bind(userId, email.toLowerCase(), name, hash, salt).run();

  // Create their household
  const householdId = generateId();
  const inviteCode = generateId().slice(0, 8).toUpperCase();
  await db.prepare("INSERT INTO households (id, name, owner_id, invite_code) VALUES (?, ?, ?, ?)")
    .bind(householdId, `${name}'s Kitchen`, userId, inviteCode).run();

  await db.prepare("UPDATE users SET household_id = ? WHERE id = ?").bind(householdId, userId).run();

  // Create session
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
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7);
    await db.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
  }
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

async function updateHousehold(db, user, body) {
  const household = await db.prepare("SELECT * FROM households WHERE id = ? AND owner_id = ?").bind(user.household_id, user.id).first();
  if (!household) return err("Only the household owner can update settings", 403);
  if (body.name) {
    await db.prepare("UPDATE households SET name = ? WHERE id = ?").bind(body.name, household.id).run();
  }
  return json({ ok: true });
}

async function joinHousehold(db, user, body) {
  const { invite_code } = body;
  if (!invite_code) return err("Invite code is required");

  const household = await db.prepare("SELECT * FROM households WHERE invite_code = ?").bind(invite_code.toUpperCase()).first();
  if (!household) return err("Invalid invite code");

  // Leave old household (clean up if empty)
  const oldHouseholdId = user.household_id;
  await db.prepare("UPDATE users SET household_id = ? WHERE id = ?").bind(household.id, user.id).run();

  if (oldHouseholdId) {
    const remaining = await db.prepare("SELECT COUNT(*) as c FROM users WHERE household_id = ?").bind(oldHouseholdId).first();
    if (remaining.c === 0) {
      await db.prepare("DELETE FROM items WHERE household_id = ?").bind(oldHouseholdId).run();
      await db.prepare("DELETE FROM households WHERE id = ?").bind(oldHouseholdId).run();
    }
  }

  return json({ ok: true, household_id: household.id, household_name: household.name });
}

async function regenerateInvite(db, user) {
  const household = await db.prepare("SELECT * FROM households WHERE id = ? AND owner_id = ?").bind(user.household_id, user.id).first();
  if (!household) return err("Only the household owner can regenerate the invite code", 403);
  const newCode = generateId().slice(0, 8).toUpperCase();
  await db.prepare("UPDATE households SET invite_code = ? WHERE id = ?").bind(newCode, household.id).run();
  return json({ invite_code: newCode });
}

async function removeMember(db, user, memberId) {
  const household = await db.prepare("SELECT * FROM households WHERE id = ? AND owner_id = ?").bind(user.household_id, user.id).first();
  if (!household) return err("Only the household owner can remove members", 403);
  if (memberId === user.id) return err("Cannot remove yourself");

  // Create a new solo household for the removed member
  const member = await db.prepare("SELECT * FROM users WHERE id = ? AND household_id = ?").bind(memberId, user.household_id).first();
  if (!member) return err("Member not found");

  const newHouseholdId = generateId();
  const inviteCode = generateId().slice(0, 8).toUpperCase();
  await db.prepare("INSERT INTO households (id, name, owner_id, invite_code) VALUES (?, ?, ?, ?)")
    .bind(newHouseholdId, `${member.name}'s Kitchen`, memberId, inviteCode).run();
  await db.prepare("UPDATE users SET household_id = ? WHERE id = ?").bind(newHouseholdId, memberId).run();

  return json({ ok: true });
}

// ─── Items CRUD ───

async function getItems(db, user) {
  const items = await db.prepare("SELECT * FROM items WHERE household_id = ? ORDER BY expiration_date ASC")
    .bind(user.household_id).all();
  return json(items.results || []);
}

async function addItem(db, user, body) {
  const id = generateId();
  await db.prepare(`INSERT INTO items (id, household_id, name, location, category, subtype, quantity, purchase_date, expiration_date, added_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, user.household_id, body.name, body.location, body.category, body.subtype || null,
      body.quantity || 1, body.purchaseDate || null, body.expirationDate || null, user.name)
    .run();
  return json({ id, ...body, added_by: user.name });
}

async function updateItem(db, user, itemId, body) {
  // Verify item belongs to user's household
  const item = await db.prepare("SELECT * FROM items WHERE id = ? AND household_id = ?").bind(itemId, user.household_id).first();
  if (!item) return err("Item not found", 404);

  const fields = [];
  const values = [];
  for (const [key, val] of Object.entries(body)) {
    const col = key.replace(/([A-Z])/g, "_$1").toLowerCase(); // camelCase to snake_case
    fields.push(`${col} = ?`);
    values.push(val);
  }
  fields.push("updated_at = datetime('now')");
  values.push(itemId, user.household_id);

  await db.prepare(`UPDATE items SET ${fields.join(", ")} WHERE id = ? AND household_id = ?`)
    .bind(...values).run();
  return json({ ok: true });
}

async function deleteItem(db, user, itemId) {
  await db.prepare("DELETE FROM items WHERE id = ? AND household_id = ?").bind(itemId, user.household_id).run();
  return json({ ok: true });
}

// ─── Router ───

export async function onRequest(context) {
  const { request, env } = context;
  const db = env.DB;
  const url = new URL(request.url);
  const path = url.pathname.replace("/api", "");
  const method = request.method;

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    await initDb(db);

    // Public routes
    if (path === "/auth/signup" && method === "POST") {
      return await signup(db, await request.json());
    }
    if (path === "/auth/login" && method === "POST") {
      return await login(db, await request.json());
    }
    if (path === "/auth/logout" && method === "POST") {
      return await logout(db, request);
    }

    // Protected routes
    const user = await getUser(db, request);
    if (!user) return err("Unauthorized", 401);

    if (path === "/me" && method === "GET") return await getMe(db, user);
    if (path === "/household" && method === "PUT") return await updateHousehold(db, user, await request.json());
    if (path === "/household/join" && method === "POST") return await joinHousehold(db, user, await request.json());
    if (path === "/household/invite" && method === "POST") return await regenerateInvite(db, user);
    if (path.startsWith("/household/members/") && method === "DELETE") {
      return await removeMember(db, user, path.split("/").pop());
    }

    if (path === "/items" && method === "GET") return await getItems(db, user);
    if (path === "/items" && method === "POST") return await addItem(db, user, await request.json());
    if (path.startsWith("/items/") && method === "PUT") {
      return await updateItem(db, user, path.split("/").pop(), await request.json());
    }
    if (path.startsWith("/items/") && method === "DELETE") {
      return await deleteItem(db, user, path.split("/").pop());
    }

    return err("Not found", 404);
  } catch (e) {
    console.error(e);
    return err("Internal server error: " + e.message, 500);
  }
}
