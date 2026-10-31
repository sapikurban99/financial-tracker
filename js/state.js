// state.js — the single source of truth for local data.
// Data lives in localStorage only. Supabase settings live in a separate key
// (see supabase.js) and are never included in backups or repo files.
const STORAGE_KEY = "financial-tracker-v1";

const defaultCategories = [
  "Gaji",
  "Makan dan Minum",
  "Transportasi",
  "Belanja",
  "Tagihan",
  "Hiburan",
  "Lain-lain",
];

const defaultWallets = [
  { name: "Dompet Utama", initial: 0 },
  { name: "Bank Contoh", initial: 0 },
];

const defaultBudgets = {
  "Makan dan Minum": 1000000,
  Transportasi: 500000,
  Belanja: 1000000,
  Tagihan: 1000000,
  Hiburan: 500000,
  "Lain-lain": 500000,
};

// Generic sample data only. Every title starts with "Contoh:" and the
// dates are January 2026 on purpose, so the sample never looks like a
// real current-month statement. No real account data is used anywhere.
function sampleTransactions() {
  return [
    { id: "contoh-1", date: "2026-01-05T08:00", title: "Contoh: Gaji Bulanan", category: "Gaji", wallet: "Bank Contoh", amount: 10000000, direction: "in", sample: true },
    { id: "contoh-2", date: "2026-01-06T12:00", title: "Contoh: Belanja Harian", category: "Belanja", wallet: "Dompet Utama", amount: 250000, direction: "out", sample: true },
    { id: "contoh-3", date: "2026-01-07T13:00", title: "Contoh: Makan Siang", category: "Makan dan Minum", wallet: "Dompet Utama", amount: 75000, direction: "out", sample: true },
    { id: "contoh-4", date: "2026-01-08T09:00", title: "Contoh: Transportasi", category: "Transportasi", wallet: "Bank Contoh", amount: 50000, direction: "out", sample: true },
    { id: "contoh-5", date: "2026-01-10T10:00", title: "Contoh: Tagihan Listrik", category: "Tagihan", wallet: "Bank Contoh", amount: 300000, direction: "out", sample: true },
    // A proper transfer: money leaves Bank Contoh and arrives in Dompet Utama.
    { id: "contoh-6", date: "2026-01-11T10:00", title: "Contoh: Pindah ke Dompet Utama", category: "Lain-lain", wallet: "Bank Contoh", toWallet: "Dompet Utama", amount: 500000, direction: "transfer", sample: true },
  ];
}

function defaultState() {
  return {
    transactions: sampleTransactions(),
    wallets: defaultWallets.map((w) => ({ ...w })),
    categories: [...defaultCategories],
    budgets: { ...defaultBudgets },
    sample: true,
  };
}

function normalizeTransaction(tx) {
  // Older saved rows may have no toWallet. A transfer without a destination
  // is kept for history, but it does not move any balance (see walletBalance).
  const out = {
    id: tx.id || uniqueId("tx"),
    date: String(tx.date || ""),
    title: String(tx.title || ""),
    category: String(tx.category || "Lain-lain"),
    wallet: String(tx.wallet || "Dompet Utama"),
    amount: Number(tx.amount) || 0,
    direction: ["in", "out", "transfer"].includes(tx.direction) ? tx.direction : "out",
    sample: Boolean(tx.sample),
  };
  if (tx.toWallet) out.toWallet = String(tx.toWallet);
  return out;
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.transactions)) return defaultState();
    return {
      transactions: parsed.transactions.map(normalizeTransaction),
      wallets: Array.isArray(parsed.wallets) && parsed.wallets.length
        ? parsed.wallets.map((w) => ({ name: String(w.name), initial: Number(w.initial) || 0 }))
        : defaultWallets.map((w) => ({ ...w })),
      categories: Array.isArray(parsed.categories) && parsed.categories.length
        ? parsed.categories.map(String)
        : [...defaultCategories],
      budgets: parsed.budgets && typeof parsed.budgets === "object" ? parsed.budgets : { ...defaultBudgets },
      sample: Boolean(parsed.sample),
    };
  } catch (e) {
    return defaultState();
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    // Storage may be full or unavailable (private mode). The app still
    // renders from memory; the toast in main.js explains a save failure
    // only when an action explicitly reports it.
  }
}

let state = load();

function refreshSampleFlag() {
  state.sample = state.transactions.some((t) => t.sample);
}

function walletBalance(walletName) {
  const wallet = state.wallets.find((w) => w.name === walletName);
  const initial = wallet ? Number(wallet.initial) || 0 : 0;
  let delta = 0;
  for (const tx of state.transactions) {
    const amount = Number(tx.amount) || 0;
    if (tx.direction === "in" && tx.wallet === walletName) delta += amount;
    if (tx.direction === "out" && tx.wallet === walletName) delta -= amount;
    if (tx.direction === "transfer") {
      if (tx.wallet === walletName) delta -= amount;
      if (tx.toWallet === walletName) delta += amount;
    }
  }
  return initial + delta;
}

function totalBalance() {
  return state.wallets.reduce((sum, w) => sum + walletBalance(w.name), 0);
}

function sumByDirection(list, direction) {
  return list
    .filter((tx) => tx.direction === direction)
    .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
}

function walletIsUsed(name) {
  return state.transactions.some((tx) => tx.wallet === name || tx.toWallet === name);
}

function categoryIsUsed(name) {
  return state.transactions.some((tx) => tx.category === name);
}
