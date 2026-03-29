import { useState, useEffect, useCallback, useMemo, useRef } from "react";

// ─── Food Safety Expiration Guidelines (days) ───
const EXPIRATION_RULES = {
  fridge: {
    meat: { chicken: 2, beef: 4, pork: 4, fish: 2, ground_meat: 2, deli_meat: 5, bacon: 7, sausage: 2, turkey: 2, lamb: 4, shrimp: 2, other: 3 },
    dairy: { milk: 7, cheese_hard: 28, cheese_soft: 7, yogurt: 14, butter: 30, cream: 10, eggs: 35, sour_cream: 21, cream_cheese: 14, cottage_cheese: 7, other: 7 },
    fruit: { berries: 5, apples: 28, citrus: 21, grapes: 7, melons_cut: 4, bananas: 5, avocado: 4, pears: 5, peaches: 4, other: 7 },
    vegetable: { leafy_greens: 5, tomatoes: 7, peppers: 10, carrots: 21, broccoli: 5, celery: 14, cucumbers: 7, mushrooms: 5, corn: 3, onions_cut: 7, other: 7 },
    herbs: { basil: 5, cilantro: 7, parsley: 10, rosemary: 14, thyme: 10, mint: 7, dill: 7, chives: 7, other: 7 },
    bread: { white_bread: 7, wheat_bread: 7, bagels: 7, tortillas: 14, pita: 7, rolls: 5, other: 7 },
    condiments: { ketchup: 180, mustard: 365, mayo: 60, soy_sauce: 365, hot_sauce: 180, salad_dressing: 60, jam: 90, pickles: 90, other: 90 },
    leftovers: { cooked_meat: 4, cooked_rice: 4, cooked_pasta: 4, soup: 4, casserole: 4, pizza: 4, other: 3 },
  },
  freezer: {
    meat: { chicken: 270, beef: 365, pork: 180, fish: 180, ground_meat: 120, deli_meat: 60, bacon: 30, sausage: 60, turkey: 365, lamb: 270, shrimp: 180, other: 120 },
    dairy: { milk: 90, cheese_hard: 180, cheese_soft: 180, butter: 270, ice_cream: 60, yogurt: 60, other: 90 },
    fruit: { berries: 365, apples: 365, citrus: 120, grapes: 365, bananas: 180, peaches: 365, other: 300 },
    vegetable: { leafy_greens: 365, peppers: 365, carrots: 365, broccoli: 365, corn: 365, peas: 365, green_beans: 365, other: 300 },
    bread: { white_bread: 90, wheat_bread: 90, bagels: 90, tortillas: 180, rolls: 90, other: 90 },
    herbs: { basil: 180, cilantro: 180, parsley: 180, rosemary: 180, other: 180 },
    leftovers: { cooked_meat: 90, cooked_rice: 90, soup: 90, casserole: 90, pizza: 60, other: 60 },
  },
  pantry: {
    canned: { vegetables: 730, fruit: 545, soup: 730, beans: 730, tuna: 730, other: 545 },
    grains: { rice: 730, pasta: 730, oats: 365, flour: 365, cereal: 240, quinoa: 365, other: 365 },
    snacks: { chips: 60, crackers: 180, nuts: 180, granola_bars: 240, dried_fruit: 180, popcorn: 180, other: 120 },
    baking: { sugar: 730, baking_soda: 730, baking_powder: 365, vanilla_extract: 730, chocolate_chips: 365, other: 365 },
    oils: { olive_oil: 545, vegetable_oil: 365, coconut_oil: 730, sesame_oil: 365, other: 365 },
    sauces: { pasta_sauce: 545, soy_sauce: 730, vinegar: 730, hot_sauce: 730, other: 365 },
    other: { honey: 1095, peanut_butter: 270, coffee: 180, tea: 365, other: 365 },
  },
  spices: {
    ground: { black_pepper: 365, cinnamon: 365, cumin: 365, paprika: 365, chili_powder: 365, garlic_powder: 365, onion_powder: 365, turmeric: 365, ginger: 365, nutmeg: 365, cayenne: 365, other: 365 },
    whole: { peppercorns: 1095, cinnamon_sticks: 1095, cumin_seeds: 1095, bay_leaves: 730, cloves: 1095, other: 1095 },
    dried_herbs: { oregano: 365, thyme: 365, rosemary: 365, basil: 365, parsley: 365, dill: 365, other: 365 },
    blends: { italian_seasoning: 365, taco_seasoning: 365, curry_powder: 365, everything_bagel: 365, old_bay: 365, other: 365 },
    salt: { table_salt: 1825, sea_salt: 1825, kosher_salt: 1825, other: 1825 },
  },
};

const LOCATION_CATEGORIES = {
  fridge: ["meat", "dairy", "fruit", "vegetable", "herbs", "bread", "condiments", "leftovers"],
  freezer: ["meat", "dairy", "fruit", "vegetable", "bread", "herbs", "leftovers"],
  pantry: ["canned", "grains", "snacks", "baking", "oils", "sauces", "other"],
  spices: ["ground", "whole", "dried_herbs", "blends", "salt"],
};

const CATEGORY_ICONS = {
  meat: "🥩", dairy: "🧀", fruit: "🍎", vegetable: "🥦", herbs: "🌿",
  bread: "🍞", condiments: "🫙", leftovers: "🍱", canned: "🥫",
  grains: "🌾", snacks: "🍿", baking: "🧁", oils: "🫒", sauces: "🍝",
  other: "📦", ground: "🧂", whole: "🫚", dried_herbs: "🍃",
  blends: "✨", salt: "🧂",
};

const LOCATION_ICONS = { fridge: "❄️", freezer: "🧊", pantry: "🏠", spices: "🌶️" };

// ─── Helpers ───

function getExpirationDays(location, category, subtype) {
  const loc = EXPIRATION_RULES[location];
  if (!loc) return 365;
  const cat = loc[category];
  if (!cat) return 365;
  return cat[subtype] || cat["other"] || 365;
}

function getDaysUntilExpiry(item) {
  const now = new Date();
  const exp = new Date(item.expirationDate || item.expiration_date);
  return Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
}

function getExpiryStatus(daysLeft) {
  if (daysLeft <= 0) return "expired";
  if (daysLeft <= 2) return "critical";
  if (daysLeft <= 5) return "warning";
  return "fresh";
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function today() {
  return new Date().toISOString().split("T")[0];
}

// Normalize item from API (snake_case) to frontend (camelCase)
function normalizeItem(item) {
  return {
    id: item.id,
    name: item.name,
    location: item.location,
    category: item.category,
    subtype: item.subtype,
    quantity: item.quantity,
    purchaseDate: item.purchase_date || item.purchaseDate,
    expirationDate: item.expiration_date || item.expirationDate,
    addedBy: item.added_by || item.addedBy,
    addedDate: item.created_at || item.addedDate,
  };
}

// ─── API Client ───
const API_BASE = "/api";

function api(token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  async function request(path, method = "GET", body = null) {
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${API_BASE}${path}`, opts);
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        res.ok ? "Server returned an invalid response. Is the D1 database binding configured?"
               : `Server error (${res.status}): ${text.slice(0, 200) || "Empty response. The D1 database binding may not be configured — see README."}`
      );
    }
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  return {
    signup: (email, password, name) => request("/auth/signup", "POST", { email, password, name }),
    login: (email, password) => request("/auth/login", "POST", { email, password }),
    logout: () => request("/auth/logout", "POST"),
    getMe: () => request("/me"),
    updateHousehold: (name) => request("/household", "PUT", { name }),
    joinHousehold: (invite_code) => request("/household/join", "POST", { invite_code }),
    regenerateInvite: () => request("/household/invite", "POST"),
    removeMember: (id) => request(`/household/members/${id}`, "DELETE"),
    getItems: () => request("/items"),
    addItem: (item) => request("/items", "POST", item),
    updateItem: (id, updates) => request(`/items/${id}`, "PUT", updates),
    deleteItem: (id) => request(`/items/${id}`, "DELETE"),
  };
}

// ─── Storage ───
const THEME_KEY = "kitchen_theme";
const TOKEN_KEY = "kitchen_token";

// ─── Components ───

function ThemeToggle({ dark, onToggle }) {
  return (
    <button onClick={onToggle} className="theme-toggle" aria-label="Toggle theme">
      <div className={`toggle-track ${dark ? "active" : ""}`}>
        <span className="toggle-icon sun">☀️</span>
        <span className="toggle-icon moon">🌙</span>
        <div className="toggle-thumb" />
      </div>
    </button>
  );
}

function QuantityControl({ quantity, onChange }) {
  return (
    <div className="qty-control">
      <button className="qty-btn minus" onClick={() => onChange(Math.max(0, quantity - 1))} aria-label="Decrease">−</button>
      <input type="number" className="qty-input" value={quantity} min="0"
        onChange={e => onChange(Math.max(0, parseInt(e.target.value) || 0))} />
      <button className="qty-btn plus" onClick={() => onChange(quantity + 1)} aria-label="Increase">+</button>
    </div>
  );
}

function ExpiryBadge({ daysLeft }) {
  const status = getExpiryStatus(daysLeft);
  const labels = { expired: "EXPIRED", critical: `${daysLeft}d left`, warning: `${daysLeft}d left`, fresh: `${daysLeft}d left` };
  return <span className={`expiry-badge ${status}`}>{labels[status]}</span>;
}

function ItemCard({ item, onUpdate, onDelete, onTransfer, compact = false }) {
  const daysLeft = getDaysUntilExpiry(item);
  const status = getExpiryStatus(daysLeft);
  const canTransfer = item.category === "meat" && (item.location === "fridge" || item.location === "freezer");

  return (
    <div className={`item-card ${status} ${compact ? "compact" : ""}`}>
      <div className="item-card-header">
        <div className="item-info">
          <span className="item-icon">{CATEGORY_ICONS[item.category] || "📦"}</span>
          <div className="item-details">
            <span className="item-name">{item.name}</span>
            <span className="item-meta">
              {item.subtype?.replace(/_/g, " ")} · {item.location}
              {item.purchaseDate && ` · bought ${formatDate(item.purchaseDate)}`}
              {item.addedBy && ` · by ${item.addedBy}`}
            </span>
          </div>
        </div>
        <ExpiryBadge daysLeft={daysLeft} />
      </div>
      <div className="item-card-actions">
        <QuantityControl quantity={item.quantity} onChange={(q) => onUpdate(item.id, { quantity: q })} />
        <div className="action-btns">
          {canTransfer && (
            <button className="btn-transfer" onClick={() => onTransfer(item)}
              title={`Move to ${item.location === "fridge" ? "freezer" : "fridge"}`}>
              {item.location === "fridge" ? "🧊→" : "❄️→"}
            </button>
          )}
          <button className="btn-delete" onClick={() => onDelete(item.id)} title="Remove">✕</button>
        </div>
      </div>
    </div>
  );
}

function AddItemForm({ onAdd, initialLocation = "fridge" }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState(initialLocation);
  const [category, setCategory] = useState(LOCATION_CATEGORIES[initialLocation][0]);
  const [subtype, setSubtype] = useState("other");
  const [quantity, setQuantity] = useState(1);
  const [purchaseDate, setPurchaseDate] = useState(today());
  const nameRef = useRef(null);

  useEffect(() => { setCategory(LOCATION_CATEGORIES[location][0]); }, [location]);
  useEffect(() => {
    const subtypes = EXPIRATION_RULES[location]?.[category];
    if (subtypes) {
      const keys = Object.keys(subtypes);
      setSubtype(keys.includes("other") ? "other" : keys[0]);
    }
  }, [location, category]);
  useEffect(() => { if (open && nameRef.current) nameRef.current.focus(); }, [open]);

  const handleSubmit = () => {
    if (!name.trim()) return;
    const expDays = getExpirationDays(location, category, subtype);
    const expDate = new Date(purchaseDate);
    expDate.setDate(expDate.getDate() + expDays);
    onAdd({
      name: name.trim(), location, category, subtype, quantity, purchaseDate,
      expirationDate: expDate.toISOString().split("T")[0],
    });
    setName(""); setQuantity(1); setPurchaseDate(today()); setOpen(false);
  };

  const subtypeOptions = EXPIRATION_RULES[location]?.[category] ? Object.keys(EXPIRATION_RULES[location][category]) : ["other"];

  if (!open) {
    return (
      <button className="btn-add-item" onClick={() => setOpen(true)}>
        <span className="plus-icon">+</span> Add Item
      </button>
    );
  }

  return (
    <div className="add-form-overlay" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
      <div className="add-form">
        <div className="add-form-header">
          <h3>Add New Item</h3>
          <button className="btn-close" onClick={() => setOpen(false)}>✕</button>
        </div>
        <div className="form-grid">
          <div className="form-group full-width">
            <label>Item Name</label>
            <input ref={nameRef} type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Chicken breast" onKeyDown={e => e.key === "Enter" && handleSubmit()} />
          </div>
          <div className="form-group">
            <label>Location</label>
            <select value={location} onChange={e => setLocation(e.target.value)}>
              {Object.keys(LOCATION_CATEGORIES).map(loc => (
                <option key={loc} value={loc}>{LOCATION_ICONS[loc]} {loc.charAt(0).toUpperCase() + loc.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}>
              {LOCATION_CATEGORIES[location].map(cat => (
                <option key={cat} value={cat}>{CATEGORY_ICONS[cat]} {cat.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Type</label>
            <select value={subtype} onChange={e => setSubtype(e.target.value)}>
              {subtypeOptions.map(st => (<option key={st} value={st}>{st.replace(/_/g, " ")}</option>))}
            </select>
          </div>
          <div className="form-group">
            <label>Quantity</label>
            <QuantityControl quantity={quantity} onChange={setQuantity} />
          </div>
          <div className="form-group">
            <label>Purchase Date</label>
            <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Est. Expiry</label>
            <div className="expiry-preview">
              {(() => {
                const days = getExpirationDays(location, category, subtype);
                const d = new Date(purchaseDate);
                d.setDate(d.getDate() + days);
                return `${formatDate(d.toISOString())} (${days} days)`;
              })()}
            </div>
          </div>
        </div>
        <button className="btn-submit" onClick={handleSubmit} disabled={!name.trim()}>
          Add to {location.charAt(0).toUpperCase() + location.slice(1)}
        </button>
      </div>
    </div>
  );
}

function AlertSection({ items, onUpdate, onDelete, onTransfer }) {
  const alertItems = items
    .filter(item => { const d = getDaysUntilExpiry(item); return d <= 5 && item.quantity > 0; })
    .sort((a, b) => getDaysUntilExpiry(a) - getDaysUntilExpiry(b));
  if (alertItems.length === 0) return null;

  const grouped = {};
  alertItems.forEach(item => { if (!grouped[item.location]) grouped[item.location] = []; grouped[item.location].push(item); });

  return (
    <div className="alert-section">
      <div className="alert-header">
        <span className="alert-icon">⚠️</span>
        <h2>Expiration Alerts</h2>
        <span className="alert-count">{alertItems.length}</span>
      </div>
      {Object.entries(grouped).map(([loc, locItems]) => (
        <div key={loc} className="alert-group">
          <h4 className="alert-group-title">{LOCATION_ICONS[loc]} {loc.charAt(0).toUpperCase() + loc.slice(1)}</h4>
          {locItems.map(item => (
            <ItemCard key={item.id} item={item} onUpdate={onUpdate} onDelete={onDelete} onTransfer={onTransfer} compact />
          ))}
        </div>
      ))}
    </div>
  );
}

function SearchBar({ value, onChange, onClear }) {
  const inputRef = useRef(null);
  return (
    <div className="search-bar">
      <span className="search-icon">🔍</span>
      <input ref={inputRef} type="text" placeholder="Search items..." value={value} onChange={e => onChange(e.target.value)} />
      {value && <button className="search-clear" onClick={() => { onClear(); inputRef.current?.focus(); }}>✕</button>}
    </div>
  );
}

function DraggableScroll({ children, className }) {
  const ref = useRef(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollStart = useRef(0);
  const hasMoved = useRef(false);

  const onPointerDown = (e) => {
    const el = ref.current; if (!el) return;
    isDragging.current = true; hasMoved.current = false;
    startX.current = e.clientX; scrollStart.current = el.scrollLeft;
    el.setPointerCapture(e.pointerId); el.style.cursor = "grabbing"; el.style.userSelect = "none";
  };
  const onPointerMove = (e) => {
    if (!isDragging.current) return;
    const dx = e.clientX - startX.current;
    if (Math.abs(dx) > 3) hasMoved.current = true;
    ref.current.scrollLeft = scrollStart.current - dx;
  };
  const onPointerUp = (e) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const el = ref.current; el.releasePointerCapture(e.pointerId);
    el.style.cursor = "grab"; el.style.userSelect = "";
    if (hasMoved.current) {
      const suppress = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
      el.addEventListener("click", suppress, { capture: true, once: true });
    }
  };

  return (
    <div ref={ref} className={className} onPointerDown={onPointerDown} onPointerMove={onPointerMove}
      onPointerUp={onPointerUp} onPointerCancel={onPointerUp} style={{ cursor: "grab" }}>
      {children}
    </div>
  );
}

function LocationPage({ location, items, onUpdate, onDelete, onAdd, onTransfer }) {
  const [filterCat, setFilterCat] = useState("all");
  const categories = LOCATION_CATEGORIES[location];
  const filtered = items
    .filter(i => i.location === location && i.quantity > 0)
    .filter(i => filterCat === "all" || i.category === filterCat)
    .sort((a, b) => getDaysUntilExpiry(a) - getDaysUntilExpiry(b));

  return (
    <div className="location-page">
      <div className="location-header">
        <h2>{LOCATION_ICONS[location]} {location.charAt(0).toUpperCase() + location.slice(1)}</h2>
        <span className="item-count">{filtered.length} items</span>
      </div>
      <DraggableScroll className="category-tabs">
        <button className={`cat-tab ${filterCat === "all" ? "active" : ""}`} onClick={() => setFilterCat("all")}>All</button>
        {categories.map(cat => {
          const count = items.filter(i => i.location === location && i.category === cat && i.quantity > 0).length;
          return (
            <button key={cat} className={`cat-tab ${filterCat === cat ? "active" : ""}`} onClick={() => setFilterCat(cat)}>
              {CATEGORY_ICONS[cat]} {cat.replace(/_/g, " ")} <span className="tab-count">{count}</span>
            </button>
          );
        })}
      </DraggableScroll>
      <AddItemForm onAdd={onAdd} initialLocation={location} />
      <div className="items-list">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">{LOCATION_ICONS[location]}</span>
            <p>No items in {location}{filterCat !== "all" ? ` → ${filterCat}` : ""}</p>
          </div>
        ) : filtered.map(item => (
          <ItemCard key={item.id} item={item} onUpdate={onUpdate} onDelete={onDelete} onTransfer={onTransfer} />
        ))}
      </div>
    </div>
  );
}

// ─── Auth Page ───
function AuthPage({ onAuth, dark, onToggleDark }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const client = api(null);
      let result;
      if (mode === "login") {
        result = await client.login(email, password);
      } else {
        result = await client.signup(email, password, name);
      }
      localStorage.setItem(TOKEN_KEY, result.token);
      onAuth(result.token, result.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-top-bar">
        <div />
        <ThemeToggle dark={dark} onToggle={onToggleDark} />
      </div>
      <div className="auth-container">
        <div className="auth-logo">🍳</div>
        <h1 className="auth-title">Kitchen Track</h1>
        <p className="auth-subtitle">Track your kitchen inventory across all your devices</p>

        <div className="auth-tabs">
          <button className={`auth-tab ${mode === "login" ? "active" : ""}`} onClick={() => { setMode("login"); setError(""); }}>
            Sign In
          </button>
          <button className={`auth-tab ${mode === "signup" ? "active" : ""}`} onClick={() => { setMode("signup"); setError(""); }}>
            Sign Up
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <div className="form-group">
              <label>Your Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g. Truong" required />
            </div>
          )}
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder={mode === "signup" ? "At least 6 characters" : "Your password"} required minLength={mode === "signup" ? 6 : 1} />
          </div>
          {error && <div className="auth-error">{error}</div>}
          <button className="btn-submit" type="submit" disabled={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Household Settings Page ───
function HouseholdPage({ user, household, members, client, onRefresh, onBack }) {
  const [inviteCode, setInviteCode] = useState(household?.invite_code || "");
  const [joinCode, setJoinCode] = useState("");
  const [householdName, setHouseholdName] = useState(household?.name || "");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const isOwner = household?.owner_id === user.id;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback: user can manually copy */ }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setError(""); setLoading(true);
    try {
      await client.joinHousehold(joinCode.trim());
      setSuccess("Joined household! Refreshing...");
      setTimeout(() => { onRefresh(); setSuccess(""); }, 1000);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleRename = async () => {
    if (!householdName.trim()) return;
    setError("");
    try {
      await client.updateHousehold(householdName.trim());
      setSuccess("Name updated!");
      setTimeout(() => { onRefresh(); setSuccess(""); }, 1000);
    } catch (err) { setError(err.message); }
  };

  const handleRegenerate = async () => {
    setError("");
    try {
      const res = await client.regenerateInvite();
      setInviteCode(res.invite_code);
      setSuccess("New invite code generated!");
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) { setError(err.message); }
  };

  const handleRemove = async (memberId) => {
    setError("");
    try {
      await client.removeMember(memberId);
      setSuccess("Member removed");
      setTimeout(() => { onRefresh(); setSuccess(""); }, 1000);
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="household-page">
      <div className="location-header">
        <h2>👨‍👩‍👧‍👦 Household</h2>
        <button className="btn-back" onClick={onBack}>← Back</button>
      </div>

      {/* Household Info */}
      <div className="settings-section">
        <h3 className="settings-label">Household Name</h3>
        <div className="settings-row">
          <input type="text" value={householdName} onChange={e => setHouseholdName(e.target.value)} disabled={!isOwner} />
          {isOwner && <button className="btn-small" onClick={handleRename}>Save</button>}
        </div>
      </div>

      {/* Invite Code */}
      <div className="settings-section">
        <h3 className="settings-label">Invite Code</h3>
        <p className="settings-hint">Share this code with family members so they can join your household</p>
        <div className="invite-code-display">
          <span className="invite-code">{inviteCode}</span>
          <button className="btn-small" onClick={handleCopy}>{copied ? "Copied!" : "Copy"}</button>
          {isOwner && <button className="btn-small btn-muted" onClick={handleRegenerate}>Regenerate</button>}
        </div>
      </div>

      {/* Join Another Household */}
      <div className="settings-section">
        <h3 className="settings-label">Join Another Household</h3>
        <p className="settings-hint">Enter an invite code to join someone else's household. This will move you out of your current one.</p>
        <div className="settings-row">
          <input type="text" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Enter invite code" maxLength={8} style={{ textTransform: "uppercase", letterSpacing: "0.1em" }} />
          <button className="btn-small" onClick={handleJoin} disabled={loading}>Join</button>
        </div>
      </div>

      {/* Members */}
      <div className="settings-section">
        <h3 className="settings-label">Members ({members.length})</h3>
        <div className="members-list">
          {members.map(m => (
            <div key={m.id} className="member-card">
              <div className="member-info">
                <span className="member-avatar">{m.name[0]?.toUpperCase()}</span>
                <div>
                  <span className="member-name">{m.name} {m.id === user.id && "(you)"}</span>
                  <span className="member-email">{m.email}</span>
                </div>
              </div>
              {isOwner && m.id !== user.id && (
                <button className="btn-small btn-danger" onClick={() => handleRemove(m.id)}>Remove</button>
              )}
              {m.id === household?.owner_id && <span className="member-badge">Owner</span>}
            </div>
          ))}
        </div>
      </div>

      {error && <div className="auth-error">{error}</div>}
      {success && <div className="auth-success">{success}</div>}
    </div>
  );
}

// ─── Main App ───
export default function KitchenInventory() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [household, setHousehold] = useState(null);
  const [members, setMembers] = useState([]);
  const [items, setItems] = useState([]);
  const [dark, setDark] = useState(() => localStorage.getItem(THEME_KEY) === "dark");
  const [page, setPage] = useState("home");
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const pollRef = useRef(null);

  const client = useMemo(() => api(token), [token]);

  useEffect(() => { localStorage.setItem(THEME_KEY, dark ? "dark" : "light"); }, [dark]);

  // Load user data on mount / token change
  const loadData = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    try {
      const [me, serverItems] = await Promise.all([client.getMe(), client.getItems()]);
      setUser(me.user);
      setHousehold(me.household);
      setMembers(me.members);
      setItems(serverItems.map(normalizeItem));
    } catch (err) {
      console.error("Load failed:", err);
      // Token invalid — clear it
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, [token, client]);

  useEffect(() => { loadData(); }, [loadData]);

  // Poll for updates every 30s (simple sync for multi-device)
  useEffect(() => {
    if (!token) return;
    pollRef.current = setInterval(async () => {
      try {
        const serverItems = await client.getItems();
        setItems(serverItems.map(normalizeItem));
      } catch { /* silent */ }
    }, 30000);
    return () => clearInterval(pollRef.current);
  }, [token, client]);

  const handleAuth = useCallback((newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    setLoading(true);
  }, []);

  const handleLogout = useCallback(async () => {
    try { await client.logout(); } catch { /* ok */ }
    localStorage.removeItem(TOKEN_KEY);
    setToken(null); setUser(null); setHousehold(null); setMembers([]); setItems([]);
    setPage("home");
  }, [client]);

  const addItem = useCallback(async (item) => {
    setSyncing(true);
    try {
      const result = await client.addItem(item);
      setItems(prev => [...prev, normalizeItem({ ...item, ...result })]);
    } catch (err) { console.error(err); }
    finally { setSyncing(false); }
  }, [client]);

  const updateItem = useCallback(async (id, updates) => {
    // Optimistic update
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    try { await client.updateItem(id, updates); }
    catch (err) { console.error(err); loadData(); } // revert on failure
  }, [client, loadData]);

  const deleteItem = useCallback((id) => { setConfirmDelete(id); }, []);

  const confirmDeleteItem = useCallback(async () => {
    if (!confirmDelete) return;
    const id = confirmDelete;
    setConfirmDelete(null);
    setItems(prev => prev.filter(i => i.id !== id));
    try { await client.deleteItem(id); }
    catch (err) { console.error(err); loadData(); }
  }, [confirmDelete, client, loadData]);

  const transferMeat = useCallback(async (item) => {
    const newLoc = item.location === "fridge" ? "freezer" : "fridge";
    const expDays = getExpirationDays(newLoc, item.category, item.subtype);
    const transferDate = today();
    const expDate = new Date(transferDate);
    expDate.setDate(expDate.getDate() + expDays);
    const updates = { location: newLoc, purchaseDate: transferDate, expirationDate: expDate.toISOString().split("T")[0] };
    await updateItem(item.id, updates);
  }, [updateItem]);

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return items.filter(i => i.quantity > 0 && (
      i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q) ||
      i.subtype?.toLowerCase().includes(q) || i.location.toLowerCase().includes(q)
    )).sort((a, b) => getDaysUntilExpiry(a) - getDaysUntilExpiry(b));
  }, [items, search]);

  const stats = useMemo(() => {
    const active = items.filter(i => i.quantity > 0);
    const expiring = active.filter(i => getDaysUntilExpiry(i) <= 5);
    return {
      total: active.length, expiring: expiring.length,
      byLocation: {
        fridge: active.filter(i => i.location === "fridge").length,
        freezer: active.filter(i => i.location === "freezer").length,
        pantry: active.filter(i => i.location === "pantry").length,
        spices: active.filter(i => i.location === "spices").length,
      },
    };
  }, [items]);

  const navItems = [
    { id: "home", label: "Home", icon: "🏡" },
    { id: "fridge", label: "Fridge", icon: "❄️" },
    { id: "freezer", label: "Freezer", icon: "🧊" },
    { id: "pantry", label: "Pantry", icon: "🏠" },
    { id: "spices", label: "Spices", icon: "🌶️" },
  ];

  // ─── Render ───
  return (
    <div className={`app ${dark ? "dark" : "light"}`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .app {
          --font-display: 'Fraunces', serif;
          --font-body: 'DM Sans', sans-serif;
          --radius: 14px;
          --radius-sm: 8px;
          --shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
          --shadow-md: 0 4px 16px rgba(0,0,0,0.1);
          --shadow-lg: 0 8px 32px rgba(0,0,0,0.12);
          --transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          min-height: 100vh;
          font-family: var(--font-body);
          transition: background var(--transition), color var(--transition);
        }
        .app.light {
          --bg: #faf8f5; --bg-card: #ffffff; --bg-card-hover: #fefefe;
          --bg-nav: rgba(255,255,255,0.85); --bg-input: #f5f3f0;
          --bg-overlay: rgba(0,0,0,0.4); --text: #1a1814; --text-secondary: #6b6560;
          --text-muted: #9e9893; --border: #e8e4df; --accent: #c06830;
          --accent-light: #fdf0e8; --accent-hover: #a85828;
          --fresh: #2d8a4e; --fresh-bg: #edf7f0; --warning: #c4840d; --warning-bg: #fef7e8;
          --critical: #d44b20; --critical-bg: #fef0eb; --expired: #9b1c1c; --expired-bg: #fde8e8;
          --nav-active: #c06830; --nav-inactive: #9e9893;
        }
        .app.dark {
          --bg: #141210; --bg-card: #1e1c19; --bg-card-hover: #252320;
          --bg-nav: rgba(20,18,16,0.92); --bg-input: #252320;
          --bg-overlay: rgba(0,0,0,0.65); --text: #f0ece6; --text-secondary: #a09890;
          --text-muted: #706860; --border: #2e2a26; --accent: #e08040;
          --accent-light: #2a1f16; --accent-hover: #f09050;
          --fresh: #4caf6a; --fresh-bg: #162218; --warning: #e0a030; --warning-bg: #261e0e;
          --critical: #f06040; --critical-bg: #2a1510; --expired: #e04040; --expired-bg: #2a1010;
          --nav-active: #e08040; --nav-inactive: #706860;
        }
        .app { background: var(--bg); color: var(--text); }
        .main-container { max-width: 820px; margin: 0 auto; padding: 16px 16px 100px; }

        /* ─── Top Bar ─── */
        .top-bar { display: flex; align-items: center; justify-content: space-between; padding: 16px 0 12px; margin-bottom: 8px; }
        .top-bar h1 { font-family: var(--font-display); font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em; }
        .top-bar h1 span { margin-right: 6px; }
        .top-bar-right { display: flex; align-items: center; gap: 8px; }
        .btn-user {
          width: 34px; height: 34px; border-radius: 50%; border: 1px solid var(--border);
          background: var(--accent); color: white; font-size: 14px; font-weight: 600;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          font-family: var(--font-body); transition: opacity var(--transition);
        }
        .btn-user:hover { opacity: 0.85; }

        /* ─── Theme Toggle ─── */
        .theme-toggle { background: none; border: none; cursor: pointer; padding: 4px; }
        .toggle-track {
          position: relative; width: 52px; height: 28px; background: var(--bg-input);
          border: 1px solid var(--border); border-radius: 14px; display: flex;
          align-items: center; justify-content: space-between; padding: 0 6px; transition: background var(--transition);
        }
        .toggle-icon { font-size: 13px; z-index: 1; }
        .toggle-thumb {
          position: absolute; left: 3px; width: 22px; height: 22px; background: var(--accent);
          border-radius: 50%; transition: transform var(--transition);
        }
        .toggle-track.active .toggle-thumb { transform: translateX(24px); }

        /* ─── Search ─── */
        .search-bar { position: relative; margin-bottom: 16px; }
        .search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); font-size: 16px; }
        .search-bar input {
          width: 100%; padding: 12px 40px 12px 44px; border: 1px solid var(--border);
          border-radius: var(--radius); background: var(--bg-card); color: var(--text);
          font-size: 15px; font-family: var(--font-body); outline: none;
          transition: border-color var(--transition), box-shadow var(--transition);
        }
        .search-bar input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-light); }
        .search-bar input::placeholder { color: var(--text-muted); }
        .search-clear {
          position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
          background: var(--bg-input); border: none; width: 24px; height: 24px;
          border-radius: 50%; cursor: pointer; color: var(--text-secondary); font-size: 12px;
          display: flex; align-items: center; justify-content: center;
        }

        /* ─── Stats Row ─── */
        .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
        .stat-card {
          background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius);
          padding: 14px; text-align: center; cursor: pointer;
          transition: transform var(--transition), box-shadow var(--transition);
        }
        .stat-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
        .stat-card .stat-icon { font-size: 20px; }
        .stat-card .stat-num { font-family: var(--font-display); font-size: 1.4rem; font-weight: 700; display: block; margin: 2px 0; }
        .stat-card .stat-label { font-size: 11px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }

        /* ─── Alert Section ─── */
        .alert-section { margin-bottom: 24px; }
        .alert-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
        .alert-header h2 { font-family: var(--font-display); font-size: 1.15rem; font-weight: 600; }
        .alert-icon { font-size: 20px; }
        .alert-count { background: var(--critical); color: white; font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 10px; }
        .alert-group { margin-bottom: 12px; }
        .alert-group-title { font-size: 13px; color: var(--text-secondary); margin-bottom: 6px; font-weight: 500; }

        /* ─── Item Card ─── */
        .item-card {
          background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius);
          padding: 14px; margin-bottom: 8px; transition: transform var(--transition), box-shadow var(--transition);
        }
        .item-card:hover { box-shadow: var(--shadow-sm); }
        .item-card.expired { border-left: 3px solid var(--expired); background: var(--expired-bg); }
        .item-card.critical { border-left: 3px solid var(--critical); background: var(--critical-bg); }
        .item-card.warning { border-left: 3px solid var(--warning); background: var(--warning-bg); }
        .item-card.fresh { border-left: 3px solid var(--fresh); }
        .item-card.compact { padding: 10px 14px; }
        .item-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; gap: 8px; }
        .item-info { display: flex; gap: 10px; align-items: flex-start; flex: 1; min-width: 0; }
        .item-icon { font-size: 22px; flex-shrink: 0; margin-top: 1px; }
        .item-details { display: flex; flex-direction: column; min-width: 0; }
        .item-name { font-weight: 600; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .item-meta { font-size: 12px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .expiry-badge { font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 6px; white-space: nowrap; flex-shrink: 0; }
        .expiry-badge.fresh { background: var(--fresh-bg); color: var(--fresh); }
        .expiry-badge.warning { background: var(--warning-bg); color: var(--warning); }
        .expiry-badge.critical { background: var(--critical-bg); color: var(--critical); }
        .expiry-badge.expired { background: var(--expired-bg); color: var(--expired); }
        .item-card-actions { display: flex; justify-content: space-between; align-items: center; }

        .qty-control {
          display: flex; align-items: center; background: var(--bg-input);
          border-radius: var(--radius-sm); border: 1px solid var(--border); overflow: hidden;
        }
        .qty-btn {
          width: 34px; height: 34px; border: none; background: transparent; cursor: pointer;
          font-size: 16px; font-weight: 600; color: var(--text); display: flex;
          align-items: center; justify-content: center; transition: background var(--transition);
        }
        .qty-btn:hover { background: var(--border); }
        .qty-btn.minus { border-right: 1px solid var(--border); }
        .qty-btn.plus { border-left: 1px solid var(--border); }
        .qty-input {
          width: 44px; border: none; background: transparent; text-align: center;
          font-size: 14px; font-weight: 600; color: var(--text); font-family: var(--font-body);
          outline: none; -moz-appearance: textfield;
        }
        .qty-input::-webkit-outer-spin-button, .qty-input::-webkit-inner-spin-button { -webkit-appearance: none; }
        .action-btns { display: flex; gap: 6px; }
        .btn-transfer, .btn-delete {
          width: 34px; height: 34px; border: 1px solid var(--border); border-radius: var(--radius-sm);
          background: var(--bg-input); cursor: pointer; font-size: 14px; display: flex;
          align-items: center; justify-content: center; transition: background var(--transition);
          color: var(--text-secondary);
        }
        .btn-transfer:hover { background: var(--accent-light); border-color: var(--accent); }
        .btn-delete:hover { background: var(--expired-bg); border-color: var(--expired); color: var(--expired); }

        /* ─── Add Form ─── */
        .btn-add-item {
          width: 100%; padding: 14px; border: 2px dashed var(--border); border-radius: var(--radius);
          background: transparent; color: var(--text-secondary); font-size: 15px; font-family: var(--font-body);
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
          margin-bottom: 16px; transition: all var(--transition);
        }
        .btn-add-item:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-light); }
        .plus-icon { font-size: 20px; font-weight: 300; }
        .add-form-overlay {
          position: fixed; inset: 0; background: var(--bg-overlay); z-index: 100;
          display: flex; align-items: flex-end; justify-content: center; animation: fadeIn 0.15s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .add-form {
          background: var(--bg-card); border-radius: var(--radius) var(--radius) 0 0;
          padding: 24px 20px; width: 100%; max-width: 540px; max-height: 85vh;
          overflow-y: auto; animation: slideUp 0.2s ease;
        }
        .add-form-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .add-form-header h3 { font-family: var(--font-display); font-size: 1.2rem; font-weight: 600; }
        .btn-close {
          width: 32px; height: 32px; border: 1px solid var(--border); border-radius: 50%;
          background: transparent; cursor: pointer; color: var(--text-secondary); font-size: 14px;
          display: flex; align-items: center; justify-content: center;
        }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px; }
        .form-group.full-width { grid-column: 1 / -1; }
        .form-group label {
          display: block; font-size: 12px; font-weight: 500; color: var(--text-secondary);
          margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.04em;
        }
        .form-group input, .form-group select {
          width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm);
          background: var(--bg-input); color: var(--text); font-size: 14px; font-family: var(--font-body);
          outline: none; transition: border-color var(--transition);
        }
        .form-group input:focus, .form-group select:focus { border-color: var(--accent); }
        .expiry-preview {
          padding: 10px 12px; background: var(--accent-light); border-radius: var(--radius-sm);
          font-size: 13px; color: var(--accent); font-weight: 500;
        }
        .btn-submit {
          width: 100%; padding: 14px; background: var(--accent); color: white; border: none;
          border-radius: var(--radius); font-size: 15px; font-weight: 600; font-family: var(--font-body);
          cursor: pointer; transition: background var(--transition);
        }
        .btn-submit:hover { background: var(--accent-hover); }
        .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ─── Location Page ─── */
        .location-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
        .location-header h2 { font-family: var(--font-display); font-size: 1.3rem; font-weight: 600; }
        .item-count { font-size: 13px; color: var(--text-muted); background: var(--bg-input); padding: 4px 10px; border-radius: 20px; }
        .category-tabs {
          position: relative; display: flex; gap: 6px; overflow-x: auto; padding-bottom: 12px;
          padding-right: 20px; margin-bottom: 14px; -webkit-overflow-scrolling: touch;
          scrollbar-width: none; cursor: grab;
        }
        .category-tabs::-webkit-scrollbar { display: none; }
        .cat-tab {
          padding: 7px 14px; border: 1px solid var(--border); border-radius: 20px;
          background: var(--bg-card); color: var(--text-secondary); font-size: 13px;
          font-family: var(--font-body); cursor: pointer; white-space: nowrap;
          transition: all var(--transition); display: flex; align-items: center; gap: 5px; flex-shrink: 0;
        }
        .cat-tab:hover { border-color: var(--accent); }
        .cat-tab.active { background: var(--accent); color: white; border-color: var(--accent); }
        .tab-count { font-size: 11px; opacity: 0.7; }
        .empty-state { text-align: center; padding: 48px 20px; color: var(--text-muted); }
        .empty-icon { font-size: 40px; display: block; margin-bottom: 10px; }
        .empty-state p { font-size: 14px; }
        .search-results { margin-bottom: 24px; }
        .search-results-header { font-size: 13px; color: var(--text-secondary); margin-bottom: 10px; }
        .home-section-title { font-family: var(--font-display); font-size: 1.1rem; font-weight: 600; margin: 20px 0 10px; }

        /* ─── Bottom Nav ─── */
        .bottom-nav {
          position: fixed; bottom: 0; left: 0; right: 0; background: var(--bg-nav);
          backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
          border-top: 1px solid var(--border); padding: 6px 0;
          padding-bottom: max(6px, env(safe-area-inset-bottom)); z-index: 50;
        }
        .nav-inner { max-width: 820px; margin: 0 auto; display: flex; justify-content: space-around; }
        .nav-btn {
          background: none; border: none; cursor: pointer; display: flex; flex-direction: column;
          align-items: center; gap: 2px; padding: 6px 12px; color: var(--nav-inactive);
          transition: color var(--transition); position: relative;
        }
        .nav-btn.active { color: var(--nav-active); }
        .nav-btn .nav-icon { font-size: 22px; }
        .nav-btn .nav-label { font-size: 10px; font-weight: 500; font-family: var(--font-body); text-transform: uppercase; letter-spacing: 0.04em; }
        .nav-btn.active::after {
          content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%);
          width: 20px; height: 2px; background: var(--nav-active); border-radius: 1px;
        }
        .nav-badge {
          position: absolute; top: 2px; right: 4px; background: var(--critical); color: white;
          font-size: 9px; font-weight: 700; min-width: 16px; height: 16px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center; padding: 0 4px;
        }

        /* ─── Confirm Dialog ─── */
        .confirm-overlay {
          position: fixed; inset: 0; background: var(--bg-overlay); z-index: 200;
          display: flex; align-items: center; justify-content: center; animation: fadeIn 0.15s ease;
        }
        .confirm-dialog {
          background: var(--bg-card); border-radius: var(--radius); padding: 24px;
          width: 90%; max-width: 340px; text-align: center; animation: slideUp 0.2s ease;
        }
        .confirm-dialog p { margin-bottom: 20px; font-size: 15px; }
        .confirm-btns { display: flex; gap: 10px; }
        .confirm-btns button {
          flex: 1; padding: 10px; border-radius: var(--radius-sm); font-size: 14px; font-weight: 600;
          cursor: pointer; font-family: var(--font-body); transition: background var(--transition);
        }
        .btn-cancel { background: var(--bg-input); border: 1px solid var(--border); color: var(--text); }
        .btn-confirm-delete { background: var(--expired); border: none; color: white; }

        /* ─── Auth Page ─── */
        .auth-page { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; }
        .auth-top-bar { position: absolute; top: 16px; right: 16px; }
        .auth-container { width: 100%; max-width: 380px; }
        .auth-logo { font-size: 48px; text-align: center; margin-bottom: 8px; }
        .auth-title { font-family: var(--font-display); font-size: 1.8rem; font-weight: 700; text-align: center; margin-bottom: 6px; }
        .auth-subtitle { text-align: center; color: var(--text-secondary); font-size: 14px; margin-bottom: 28px; }
        .auth-tabs { display: flex; gap: 0; margin-bottom: 24px; border-radius: var(--radius); overflow: hidden; border: 1px solid var(--border); }
        .auth-tab {
          flex: 1; padding: 10px; border: none; background: var(--bg-input); color: var(--text-secondary);
          font-size: 14px; font-weight: 600; cursor: pointer; font-family: var(--font-body);
          transition: all var(--transition);
        }
        .auth-tab.active { background: var(--accent); color: white; }
        .auth-form { display: flex; flex-direction: column; gap: 14px; }
        .auth-form .form-group { }
        .auth-form .form-group input { width: 100%; }
        .auth-error { background: var(--expired-bg); color: var(--expired); padding: 10px 14px; border-radius: var(--radius-sm); font-size: 13px; text-align: center; }
        .auth-success { background: var(--fresh-bg); color: var(--fresh); padding: 10px 14px; border-radius: var(--radius-sm); font-size: 13px; text-align: center; }

        /* ─── Household Page ─── */
        .household-page { }
        .btn-back {
          padding: 6px 14px; border: 1px solid var(--border); border-radius: 20px;
          background: var(--bg-card); color: var(--text-secondary); font-size: 13px;
          font-family: var(--font-body); cursor: pointer; transition: all var(--transition);
        }
        .btn-back:hover { border-color: var(--accent); color: var(--accent); }
        .settings-section { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 18px; margin-bottom: 12px; }
        .settings-label { font-family: var(--font-display); font-size: 1rem; font-weight: 600; margin-bottom: 6px; }
        .settings-hint { font-size: 12px; color: var(--text-muted); margin-bottom: 10px; }
        .settings-row { display: flex; gap: 8px; align-items: center; }
        .settings-row input { flex: 1; }
        .btn-small {
          padding: 8px 14px; border: 1px solid var(--accent); border-radius: var(--radius-sm);
          background: var(--accent); color: white; font-size: 13px; font-weight: 600;
          font-family: var(--font-body); cursor: pointer; white-space: nowrap; transition: all var(--transition);
        }
        .btn-small:hover { background: var(--accent-hover); }
        .btn-small:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-small.btn-muted { background: var(--bg-input); color: var(--text-secondary); border-color: var(--border); }
        .btn-small.btn-muted:hover { border-color: var(--accent); color: var(--accent); }
        .btn-small.btn-danger { background: var(--expired); border-color: var(--expired); }
        .invite-code-display { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .invite-code {
          font-family: monospace; font-size: 1.3rem; font-weight: 700; letter-spacing: 0.15em;
          color: var(--accent); background: var(--accent-light); padding: 8px 16px; border-radius: var(--radius-sm);
        }
        .members-list { display: flex; flex-direction: column; gap: 8px; }
        .member-card {
          display: flex; align-items: center; justify-content: space-between; padding: 10px;
          background: var(--bg-input); border-radius: var(--radius-sm);
        }
        .member-info { display: flex; align-items: center; gap: 10px; }
        .member-avatar {
          width: 36px; height: 36px; border-radius: 50%; background: var(--accent);
          color: white; display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 15px; flex-shrink: 0;
        }
        .member-name { font-weight: 600; font-size: 14px; display: block; }
        .member-email { font-size: 12px; color: var(--text-muted); display: block; }
        .member-badge {
          font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 6px;
          background: var(--accent-light); color: var(--accent);
        }

        /* ─── Sync indicator ─── */
        .sync-bar {
          position: fixed; top: 0; left: 0; right: 0; height: 3px; z-index: 999;
          background: linear-gradient(90deg, var(--accent), var(--accent-hover), var(--accent));
          background-size: 200% 100%; animation: shimmer 1.2s infinite;
        }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

        /* ─── Loading ─── */
        .loading-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 12px; }
        .loading-spinner { font-size: 40px; animation: pulse 1s infinite alternate; }
        @keyframes pulse { from { opacity: 0.4; } to { opacity: 1; } }

        /* ─── User Menu ─── */
        .user-menu-overlay { position: fixed; inset: 0; z-index: 150; }
        .user-menu {
          position: absolute; top: 56px; right: 16px; background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--radius); padding: 6px; min-width: 200px; box-shadow: var(--shadow-lg);
          animation: slideUp 0.15s ease; z-index: 151;
        }
        .user-menu-item {
          display: block; width: 100%; padding: 10px 14px; border: none; background: none;
          color: var(--text); font-size: 14px; font-family: var(--font-body); cursor: pointer;
          text-align: left; border-radius: var(--radius-sm); transition: background var(--transition);
        }
        .user-menu-item:hover { background: var(--bg-input); }
        .user-menu-item.danger { color: var(--expired); }
        .user-menu-item.install { color: var(--accent); font-weight: 500; }
        .user-menu-divider { height: 1px; background: var(--border); margin: 4px 0; }
        .user-menu-header { padding: 10px 14px; }
        .user-menu-name { font-weight: 600; font-size: 14px; display: block; }
        .user-menu-email { font-size: 12px; color: var(--text-muted); display: block; }
        .user-menu-household { font-size: 11px; color: var(--accent); margin-top: 2px; display: block; }

        /* ─── Responsive ─── */
        @media (max-width: 480px) {
          .main-container { padding: 12px 12px 100px; }
          .stats-row { grid-template-columns: repeat(2, 1fr); }
          .form-grid { grid-template-columns: 1fr; }
          .form-group.full-width { grid-column: 1; }
          .top-bar h1 { font-size: 1.25rem; }
          .stat-card { padding: 10px; }
          .stat-card .stat-num { font-size: 1.15rem; }
        }
        @media (min-width: 768px) {
          .main-container { padding: 20px 24px 100px; }
          .add-form { border-radius: var(--radius); margin-bottom: 40px; max-height: 80vh; }
          .add-form-overlay { align-items: center; }
        }
      `}</style>

      {syncing && <div className="sync-bar" />}

      {/* Loading */}
      {loading && (
        <div className="loading-page">
          <div className="loading-spinner">🍳</div>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Loading your kitchen...</p>
        </div>
      )}

      {/* Auth */}
      {!loading && !token && (
        <AuthPage onAuth={handleAuth} dark={dark} onToggleDark={() => setDark(d => !d)} />
      )}

      {/* Main App */}
      {!loading && token && user && (
        <>
          <UserMenu user={user} household={household} dark={dark}
            onToggleDark={() => setDark(d => !d)} onLogout={handleLogout}
            onHousehold={() => setPage("household")} />

          <div className="main-container">
            <div className="top-bar">
              <h1><span>🍳</span>Kitchen Track</h1>
            </div>

            {page === "household" && (
              <HouseholdPage user={user} household={household} members={members}
                client={client} onRefresh={loadData} onBack={() => setPage("home")} />
            )}

            {page === "home" && (
              <>
                <SearchBar value={search} onChange={setSearch} onClear={() => setSearch("")} />
                {search ? (
                  <div className="search-results">
                    <div className="search-results-header">
                      {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for "{search}"
                    </div>
                    {searchResults.map(item => (
                      <ItemCard key={item.id} item={item} onUpdate={updateItem} onDelete={deleteItem} onTransfer={transferMeat} />
                    ))}
                    {searchResults.length === 0 && (
                      <div className="empty-state"><span className="empty-icon">🔍</span><p>No items match your search</p></div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="stats-row">
                      {[
                        { icon: "❄️", num: stats.byLocation.fridge, label: "Fridge", p: "fridge" },
                        { icon: "🧊", num: stats.byLocation.freezer, label: "Freezer", p: "freezer" },
                        { icon: "🏠", num: stats.byLocation.pantry, label: "Pantry", p: "pantry" },
                        { icon: "🌶️", num: stats.byLocation.spices, label: "Spices", p: "spices" },
                      ].map(s => (
                        <div key={s.p} className="stat-card" onClick={() => setPage(s.p)}>
                          <span className="stat-icon">{s.icon}</span>
                          <span className="stat-num">{s.num}</span>
                          <span className="stat-label">{s.label}</span>
                        </div>
                      ))}
                    </div>
                    <AlertSection items={items} onUpdate={updateItem} onDelete={deleteItem} onTransfer={transferMeat} />
                    <h3 className="home-section-title">Quick Add</h3>
                    <AddItemForm onAdd={addItem} />
                  </>
                )}
              </>
            )}

            {["fridge", "freezer", "pantry", "spices"].includes(page) && (
              <LocationPage location={page} items={items} onUpdate={updateItem}
                onDelete={deleteItem} onAdd={addItem} onTransfer={transferMeat} />
            )}
          </div>

          <nav className="bottom-nav">
            <div className="nav-inner">
              {navItems.map(nav => (
                <button key={nav.id} className={`nav-btn ${page === nav.id ? "active" : ""}`}
                  onClick={() => { setPage(nav.id); setSearch(""); }}>
                  <span className="nav-icon">{nav.icon}</span>
                  <span className="nav-label">{nav.label}</span>
                  {nav.id === "home" && stats.expiring > 0 && <span className="nav-badge">{stats.expiring}</span>}
                </button>
              ))}
            </div>
          </nav>

          {confirmDelete && (
            <div className="confirm-overlay" onClick={() => setConfirmDelete(null)}>
              <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
                <p>Remove this item from your inventory?</p>
                <div className="confirm-btns">
                  <button className="btn-cancel" onClick={() => setConfirmDelete(null)}>Cancel</button>
                  <button className="btn-confirm-delete" onClick={confirmDeleteItem}>Remove</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── User Menu (floating) ───
function UserMenu({ user, household, dark, onToggleDark, onLogout, onHousehold }) {
  const [open, setOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed as PWA
    if (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone) {
      setIsInstalled(true);
    }
    // Capture the beforeinstallprompt event (Chrome/Edge/Android)
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setIsInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const result = await installPrompt.userChoice;
      if (result.outcome === "accepted") setIsInstalled(true);
      setInstallPrompt(null);
    }
    setOpen(false);
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const showInstallOption = !isInstalled && (installPrompt || isIOS);

  return (
    <>
      <div style={{ position: "fixed", top: 14, right: 16, zIndex: 60, display: "flex", gap: 8, alignItems: "center" }}>
        <ThemeToggle dark={dark} onToggle={onToggleDark} />
        <button className="btn-user" onClick={() => setOpen(!open)}>
          {user.name[0]?.toUpperCase()}
        </button>
      </div>
      {open && (
        <>
          <div className="user-menu-overlay" onClick={() => setOpen(false)} />
          <div className="user-menu">
            <div className="user-menu-header">
              <span className="user-menu-name">{user.name}</span>
              <span className="user-menu-email">{user.email}</span>
              {household && <span className="user-menu-household">{household.name}</span>}
            </div>
            <div className="user-menu-divider" />
            <button className="user-menu-item" onClick={() => { setOpen(false); onHousehold(); }}>
              👨‍👩‍👧‍👦 Household Settings
            </button>
            {showInstallOption && (
              <>
                <div className="user-menu-divider" />
                {installPrompt ? (
                  <button className="user-menu-item install" onClick={handleInstall}>
                    📲 Install App
                  </button>
                ) : isIOS ? (
                  <button className="user-menu-item install" onClick={() => { setOpen(false); alert("To install: tap the Share button (square with arrow) in Safari, then tap \"Add to Home Screen\""); }}>
                    📲 Install App
                  </button>
                ) : null}
              </>
            )}
            <div className="user-menu-divider" />
            <button className="user-menu-item danger" onClick={() => { setOpen(false); onLogout(); }}>
              Sign Out
            </button>
          </div>
        </>
      )}
    </>
  );
}
