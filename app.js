// Financial Tracker: static app, no backend. Data is stored in localStorage only.
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

// Clearly labelled, generic sample data only. No real account data.
// Dates use January 2026 on purpose, so the sample is easy to recognise
// and does not look like a real current-month statement.
function sampleTransactions() {
  return [
    { id: "contoh-1", date: "2026-01-05T08:00", title: "Contoh: Gaji Bulanan", category: "Gaji", wallet: "Bank Contoh", amount: 10000000, direction: "in", sample: true },
    { id: "contoh-2", date: "2026-01-06T12:00", title: "Contoh: Belanja Harian", category: "Belanja", wallet: "Dompet Utama", amount: 250000, direction: "out", sample: true },
    { id: "contoh-3", date: "2026-01-07T13:00", title: "Contoh: Makan Siang", category: "Makan dan Minum", wallet: "Dompet Utama", amount: 75000, direction: "out", sample: true },
    { id: "contoh-4", date: "2026-01-08T09:00", title: "Contoh: Transportasi", category: "Transportasi", wallet: "Bank Contoh", amount: 50000, direction: "out", sample: true },
    { id: "contoh-5", date: "2026-01-10T10:00", title: "Contoh: Tagihan Listrik", category: "Tagihan", wallet: "Bank Contoh", amount: 300000, direction: "out", sample: true },
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

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.transactions)) return defaultState();
    return {
      transactions: parsed.transactions,
      wallets: Array.isArray(parsed.wallets) && parsed.wallets.length ? parsed.wallets : defaultWallets.map((w) => ({ ...w })),
      categories: Array.isArray(parsed.categories) && parsed.categories.length ? parsed.categories : [...defaultCategories],
      budgets: parsed.budgets || { ...defaultBudgets },
      sample: Boolean(parsed.sample),
    };
  } catch (e) {
    return defaultState();
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function fmtRp(n) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

function fmtDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function monthOf(dateValue) {
  return String(dateValue || "").slice(0, 7);
}

function inMonth(tx, month) {
  return !month || monthOf(tx.date) === month;
}

function inDateRange(tx, start, end) {
  const day = String(tx.date || "").slice(0, 10);
  if (start && day < start) return false;
  if (end && day > end) return false;
  return true;
}

function walletBalance(walletName) {
  const wallet = state.wallets.find((w) => w.name === walletName);
  const initial = wallet ? Number(wallet.initial) || 0 : 0;
  let delta = 0;
  for (const tx of state.transactions) {
    if (tx.wallet !== walletName) continue;
    if (tx.direction === "in") delta += Number(tx.amount) || 0;
    if (tx.direction === "out") delta -= Number(tx.amount) || 0;
    // transfer: recorded as a movement only, no balance change in this simple model
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

function el(id) {
  return document.getElementById(id);
}

function optionList(select, values, keepFirst) {
  const first = keepFirst ? select.querySelector("option") : null;
  select.innerHTML = "";
  if (first) select.appendChild(first);
  for (const value of values) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = value;
    select.appendChild(opt);
  }
}

function refreshSelects() {
  optionList(el("tx-category"), state.categories, false);
  optionList(el("tx-wallet"), state.wallets.map((w) => w.name), false);
  optionList(el("filter-category"), state.categories, true);
  optionList(el("filter-wallet"), state.wallets.map((w) => w.name), true);
  optionList(el("budget-category"), state.categories, false);
}

function txRow(tx) {
  const div = document.createElement("div");
  div.className = "item";
  const amountClass =
    tx.direction === "in" ? "amount-in" : tx.direction === "out" ? "amount-out" : "amount-transfer";
  const directionLabel =
    tx.direction === "in" ? "Masuk" : tx.direction === "out" ? "Keluar" : "Transfer";
  const sign = tx.direction === "in" ? "+" : tx.direction === "out" ? "-" : "";
  div.innerHTML =
    "<div><strong></strong><small></small></div>" +
    '<div><span class="' + amountClass + '"></span> ' +
    '<button type="button" data-edit="' + tx.id + '">Ubah</button> ' +
    '<button type="button" data-delete="' + tx.id + '">Hapus</button></div>';
  div.querySelector("strong").textContent = tx.title;
  div.querySelector("small").textContent =
    fmtDate(tx.date) + " · " + tx.category + " · " + tx.wallet + " · " + directionLabel;
  div.querySelector("." + amountClass).textContent = sign + fmtRp(tx.amount);
  div.querySelector("[data-edit]").addEventListener("click", () => editTransaction(tx.id));
  div.querySelector("[data-delete]").addEventListener("click", () => {
    if (!window.confirm("Hapus transaksi ini?")) return;
    state.transactions = state.transactions.filter((t) => t.id !== tx.id);
    if (!state.transactions.some((t) => t.sample)) state.sample = false;
    save();
    renderAll();
  });
  return div;
}

function filteredTransactions() {
  const type = el("filter-type").value;
  const category = el("filter-category").value;
  const wallet = el("filter-wallet").value;
  const search = el("filter-search").value.trim().toLowerCase();
  const month = el("filter-month").value;
  const start = el("filter-start").value;
  const end = el("filter-end").value;
  return state.transactions.filter((tx) => {
    if (type && tx.direction !== type) return false;
    if (category && tx.category !== category) return false;
    if (wallet && tx.wallet !== wallet) return false;
    if (search && !String(tx.title).toLowerCase().includes(search)) return false;
    if (!inMonth(tx, month)) return false;
    if (!inDateRange(tx, start, end)) return false;
    return true;
  });
}

function renderDashboard() {
  const month = el("dashboard-month").value;
  const list = state.transactions.filter((tx) => inMonth(tx, month));
  el("total-in").textContent = fmtRp(sumByDirection(list, "in"));
  el("total-out").textContent = fmtRp(sumByDirection(list, "out"));
  el("net-total").textContent = fmtRp(sumByDirection(list, "in") - sumByDirection(list, "out"));
  el("total-balance").textContent = fmtRp(totalBalance());

  const recent = el("recent-list");
  recent.innerHTML = "";
  const sorted = [...list].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 10);
  if (!sorted.length) recent.textContent = "Belum ada transaksi untuk periode ini.";
  sorted.forEach((tx) => recent.appendChild(txRow(tx)));
}

function renderTransactions() {
  const list = filteredTransactions().sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const container = el("transaction-list");
  container.innerHTML = "";
  if (!list.length) container.textContent = "Tidak ada transaksi yang cocok dengan filter.";
  list.forEach((tx) => container.appendChild(txRow(tx)));
}

function renderLaporan() {
  const month = el("report-month").value;
  const list = state.transactions.filter((tx) => inMonth(tx, month) && tx.direction === "out");
  const totalOut = list.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

  const byCategory = {};
  for (const tx of list) byCategory[tx.category] = (byCategory[tx.category] || 0) + (Number(tx.amount) || 0);

  const breakdown = el("category-breakdown");
  breakdown.innerHTML = "";
  if (!Object.keys(byCategory).length) breakdown.textContent = "Belum ada pengeluaran untuk periode ini.";
  for (const [category, amount] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
    const pct = totalOut ? Math.round((amount / totalOut) * 100) : 0;
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML =
      "<div style='flex:1'><strong></strong><div class='bar-wrap'><div class='bar'></div></div><small></small></div><strong></strong>";
    div.querySelector("strong").textContent = category;
    div.querySelector(".bar").style.width = pct + "%";
    div.querySelector("small").textContent = pct + "% dari total pengeluaran";
    div.querySelectorAll("strong")[1].textContent = fmtRp(amount);
    breakdown.appendChild(div);
  }

  const walletsEl = el("report-wallets");
  walletsEl.innerHTML = "";
  state.wallets.forEach((w) => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = "<div><strong></strong><small></small></div><strong></strong>";
    div.querySelector("strong").textContent = w.name;
    div.querySelector("small").textContent = "Saldo awal " + fmtRp(w.initial);
    div.querySelectorAll("strong")[1].textContent = fmtRp(walletBalance(w.name));
    walletsEl.appendChild(div);
  });
}

function daysInMonth(month) {
  if (!month) return 30;
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

function renderAnggaran() {
  const month = el("budget-month").value;
  const list = state.transactions.filter((tx) => inMonth(tx, month) && tx.direction === "out");
  const totalBudget = Object.values(state.budgets).reduce((s, v) => s + (Number(v) || 0), 0);
  const totalUsed = list.reduce((s, tx) => s + (Number(tx.amount) || 0), 0);
  const remaining = totalBudget - totalUsed;
  el("budget-total").textContent = fmtRp(totalBudget);
  el("budget-used").textContent = fmtRp(totalUsed);
  el("budget-remaining").textContent = fmtRp(remaining);
  el("budget-daily").textContent = fmtRp(Math.max(0, remaining) / daysInMonth(month));

  const container = el("budget-list");
  container.innerHTML = "";
  const categories = [...new Set([...state.categories, ...Object.keys(state.budgets)])];
  categories.forEach((category) => {
    const budget = Number(state.budgets[category]) || 0;
    const used = list
      .filter((tx) => tx.category === category)
      .reduce((s, tx) => s + (Number(tx.amount) || 0), 0);
    const pct = budget ? Math.min(100, Math.round((used / budget) * 100)) : 0;
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML =
      "<div style='flex:1'><strong></strong><div class='bar-wrap'><div class='bar'></div></div><small></small></div><strong></strong>";
    div.querySelector("strong").textContent = category;
    div.querySelector(".bar").style.width = pct + "%";
    div.querySelector("small").textContent =
      "Terpakai " + fmtRp(used) + " dari " + fmtRp(budget) + " (" + pct + "%)";
    div.querySelectorAll("strong")[1].textContent = fmtRp(Math.max(0, budget - used)) + " sisa";
    container.appendChild(div);
  });
}

function renderDompet() {
  const container = el("wallet-list");
  container.innerHTML = "";
  state.wallets.forEach((w) => {
    const used = state.transactions.some((tx) => tx.wallet === w.name);
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = "<div><strong></strong><small></small></div><div><strong></strong> </div>";
    div.querySelector("strong").textContent = w.name;
    div.querySelector("small").textContent = "Saldo awal " + fmtRp(w.initial);
    div.querySelectorAll("strong")[1].textContent = fmtRp(walletBalance(w.name));
    if (!used) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "Hapus";
      btn.addEventListener("click", () => {
        state.wallets = state.wallets.filter((x) => x.name !== w.name);
        save();
        renderAll();
      });
      div.querySelector("div:last-child").appendChild(btn);
    }
    container.appendChild(div);
  });
}

function renderKategori() {
  const container = el("category-list");
  container.innerHTML = "";
  state.categories.forEach((category) => {
    const used = state.transactions.some((tx) => tx.category === category);
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = "<strong></strong><span></span>";
    div.querySelector("strong").textContent = category;
    if (used) {
      div.querySelector("span").textContent = "Dipakai di transaksi";
    } else {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "Hapus";
      btn.addEventListener("click", () => {
        state.categories = state.categories.filter((c) => c !== category);
        delete state.budgets[category];
        save();
        renderAll();
      });
      div.querySelector("span").appendChild(btn);
    }
    container.appendChild(div);
  });
}

function renderAll() {
  refreshSelects();
  el("sample-banner").hidden = !state.sample;
  renderDashboard();
  renderTransactions();
  renderLaporan();
  renderAnggaran();
  renderDompet();
  renderKategori();
}

function editTransaction(id) {
  const tx = state.transactions.find((t) => t.id === id);
  if (!tx) return;
  el("tx-id").value = tx.id;
  el("tx-date").value = tx.date;
  el("tx-title").value = tx.title;
  el("tx-category").value = tx.category;
  el("tx-wallet").value = tx.wallet;
  el("tx-amount").value = tx.amount;
  el("tx-direction").value = tx.direction;
  el("tx-submit").textContent = "Simpan Perubahan";
  el("tx-cancel").hidden = false;
  document.querySelector('[data-view="transaksi"]').click();
  el("transaction-form").scrollIntoView({ behavior: "smooth" });
}

function resetTransactionForm() {
  el("transaction-form").reset();
  el("tx-id").value = "";
  el("tx-submit").textContent = "Simpan Transaksi";
  el("tx-cancel").hidden = true;
  el("tx-direction").value = "out";
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return '"' + text.replaceAll('"', '""') + '"';
  }
  return text;
}

function exportCsv() {
  const header = "date,title,category,wallet,amount,direction";
  const rows = state.transactions.map((tx) =>
    [tx.date, tx.title, tx.category, tx.wallet, tx.amount, tx.direction]
      .map(csvEscape)
      .join(",")
  );
  const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "financial-tracker.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

// Simple CSV parser that handles quoted fields.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (ch !== "\r") field += ch;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.length > 1 || (r[0] && r[0].trim() !== ""));
}

function importCsvFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const rows = parseCsv(String(reader.result || ""));
    if (!rows.length) { window.alert("File CSV kosong."); return; }
    const hasHeader = /date/i.test(rows[0][0] || "");
    const dataRows = hasHeader ? rows.slice(1) : rows;
    let added = 0;
    for (const row of dataRows) {
      const [date, title, category, wallet, amountRaw, direction] = row.map((v) => (v || "").trim());
      if (!date || !title || !amountRaw) continue;
      const amount = Number(String(amountRaw).replace(/[^0-9.-]/g, ""));
      if (!Number.isFinite(amount)) continue;
      const dir = ["in", "out", "transfer"].includes(direction) ? direction : "out";
      if (category && !state.categories.includes(category)) state.categories.push(category);
      if (wallet && !state.wallets.some((w) => w.name === wallet)) {
        state.wallets.push({ name: wallet, initial: 0 });
      }
      const normalizedDate = date.replace(" ", "T");
      state.transactions.push({
        id: "csv-" + Date.now() + "-" + added,
        date: normalizedDate.length === 10 ? normalizedDate + "T00:00" : normalizedDate.slice(0, 16),
        title,
        category: category || "Lain-lain",
        wallet: wallet || "Dompet Utama",
        amount,
        direction: dir,
        sample: false,
      });
      added++;
    }
    if (added) state.sample = state.transactions.some((t) => t.sample);
    save();
    renderAll();
    window.alert(added + " transaksi berhasil diimpor dari CSV.");
  };
  reader.readAsText(file);
}

// ---- Supabase (optional, read-only) ----
// Settings are stored only in this browser (localStorage). They are never
// written to the repo. Use placeholders in .env.example, never real values.
const SUPABASE_SETTINGS_KEY = "financial-tracker-supabase-v1";
let supabaseSettings = loadSupabaseSettings();
let supabaseMonthly = [];
let supabaseCategories = [];

function loadSupabaseSettings() {
  try {
    const raw = localStorage.getItem(SUPABASE_SETTINGS_KEY);
    if (!raw) return { url: "", key: "" };
    const parsed = JSON.parse(raw);
    return {
      url: String(parsed.url || "").trim().replace(/\/$/, ""),
      key: String(parsed.key || "").trim(),
    };
  } catch (e) {
    return { url: "", key: "" };
  }
}

function saveSupabaseSettings() {
  localStorage.setItem(SUPABASE_SETTINGS_KEY, JSON.stringify(supabaseSettings));
}

function setSupabaseStatus(message, kind) {
  const statusEl = el("supabase-status");
  statusEl.textContent = message;
  statusEl.className = "status" + (kind === "success" ? " success" : kind === "error" ? " error" : "");
}

function supabaseConfigured() {
  return Boolean(supabaseSettings.url && supabaseSettings.key);
}

function supabaseHeaders() {
  return {
    apikey: supabaseSettings.key,
    Authorization: "Bearer " + supabaseSettings.key,
    Accept: "application/json",
  };
}

function supabaseErrorMessage(status, bodyText) {
  const text = String(bodyText || "");
  if (status === 404 || text.includes("PGRST205") || text.toLowerCase().includes("could not find the table")) {
    return "Tabel Supabase belum ditemukan. Jalankan file SQL moni di Supabase terlebih dahulu untuk membuat tabel moni_monthly dan moni_monthly_categories, lalu klik Muat Data Supabase lagi.";
  }
  if (status === 401 || status === 403) {
    return "Koneksi Supabase ditolak (HTTP " + status + "). Periksa kembali URL dan publishable key yang Anda masukkan, serta izin akses tabel di Supabase.";
  }
  if (status) return "Koneksi Supabase gagal (HTTP " + status + "). " + (text ? text.slice(0, 200) : "Periksa URL dan koneksi internet Anda.");
  return "Koneksi Supabase gagal. Periksa URL, publishable key, dan koneksi internet Anda.";
}

async function supabaseFetch(table, query) {
  const url = supabaseSettings.url + "/rest/v1/" + table + "?" + query;
  const response = await fetch(url, { headers: supabaseHeaders() });
  const bodyText = await response.text();
  if (!response.ok) {
    const error = new Error(supabaseErrorMessage(response.status, bodyText));
    error.status = response.status;
    throw error;
  }
  try {
    return JSON.parse(bodyText);
  } catch (e) {
    return [];
  }
}

function fmtMonthLabel(monthStart) {
  if (!monthStart) return "-";
  const d = new Date(String(monthStart).slice(0, 10) + "T00:00:00");
  if (Number.isNaN(d.getTime())) return String(monthStart);
  return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

function renderSupabaseMonthly() {
  const container = el("supabase-monthly-list");
  container.innerHTML = "";
  if (!supabaseMonthly.length) {
    container.textContent = "Belum ada data bulanan Supabase yang dimuat.";
    return;
  }
  const sorted = [...supabaseMonthly].sort((a, b) => String(b.month_start).localeCompare(String(a.month_start)));
  sorted.forEach((row) => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = "<div><strong></strong><small></small></div><strong></strong>";
    div.querySelector("strong").textContent = fmtMonthLabel(row.month_start);
    div.querySelector("small").textContent =
      "Masuk " + fmtRp(row.masuk) + " · Keluar " + fmtRp(row.keluar);
    div.querySelectorAll("strong")[1].textContent = fmtRp(row.net_flow);
    container.appendChild(div);
  });
}

function renderSupabaseMonthDetail() {
  const selected = el("supabase-month").value;
  const row = supabaseMonthly.find((r) => String(r.month_start) === selected);
  el("supabase-month-in").textContent = fmtRp(row ? row.masuk : 0);
  el("supabase-month-out").textContent = fmtRp(row ? row.keluar : 0);
  el("supabase-month-net").textContent = fmtRp(row ? row.net_flow : 0);

  const container = el("supabase-category-list");
  container.innerHTML = "";
  if (!selected) {
    container.textContent = "Pilih bulan untuk melihat kategori.";
    return;
  }
  const cats = supabaseCategories.filter((c) => String(c.month_start) === selected);
  if (!cats.length) {
    container.textContent = "Tidak ada kategori Supabase untuk bulan ini.";
    return;
  }
  const totalOut = cats
    .filter((c) => c.direction === "out")
    .reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const totalIn = cats
    .filter((c) => c.direction === "in")
    .reduce((s, c) => s + (Number(c.amount) || 0), 0);
  [...cats]
    .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))
    .forEach((c) => {
      const directionLabel = c.direction === "in" ? "Masuk" : c.direction === "out" ? "Keluar" : c.direction;
      const base = c.direction === "in" ? totalIn : totalOut;
      const pct = base ? Math.round(((Number(c.amount) || 0) / base) * 100) : 0;
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = "<div><strong></strong><small></small></div><strong></strong>";
      div.querySelector("strong").textContent = c.category;
      div.querySelector("small").textContent = directionLabel + " · " + pct + "% dari total " + directionLabel.toLowerCase() + " bulan ini";
      div.querySelectorAll("strong")[1].textContent = fmtRp(c.amount);
      container.appendChild(div);
    });
}

function refreshSupabaseMonthSelector() {
  const select = el("supabase-month");
  const previous = select.value;
  const months = [...new Set(supabaseMonthly.map((r) => String(r.month_start)))].sort().reverse();
  select.innerHTML = "";
  if (!months.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Belum ada bulan";
    select.appendChild(opt);
  }
  months.forEach((monthStart) => {
    const opt = document.createElement("option");
    opt.value = monthStart;
    opt.textContent = fmtMonthLabel(monthStart);
    select.appendChild(opt);
  });
  if (previous && months.includes(previous)) select.value = previous;
  else if (months.length) select.value = months[0];
}

function renderSupabase() {
  refreshSupabaseMonthSelector();
  renderSupabaseMonthly();
  renderSupabaseMonthDetail();
}

async function testSupabaseConnection() {
  if (!supabaseConfigured()) {
    setSupabaseStatus("Masukkan Supabase URL dan publishable key terlebih dahulu, lalu simpan.", "error");
    return;
  }
  setSupabaseStatus("Menguji koneksi Supabase…");
  try {
    const rows = await supabaseFetch("moni_monthly", "select=month_start&order=month_start&limit=1");
    setSupabaseStatus(
      "Koneksi Supabase berhasil. Tabel moni_monthly ditemukan" +
        (Array.isArray(rows) ? " (" + rows.length + " baris pada uji limit 1)." : "."),
      "success"
    );
  } catch (e) {
    setSupabaseStatus(e.message, "error");
  }
}

async function loadSupabaseData() {
  if (!supabaseConfigured()) {
    setSupabaseStatus("Masukkan Supabase URL dan publishable key terlebih dahulu, lalu simpan.", "error");
    return;
  }
  setSupabaseStatus("Memuat data Supabase…");
  try {
    const [monthly, categories] = await Promise.all([
      supabaseFetch("moni_monthly", "select=*&order=month_start"),
      supabaseFetch("moni_monthly_categories", "select=*&order=month_start"),
    ]);
    supabaseMonthly = Array.isArray(monthly) ? monthly : [];
    supabaseCategories = Array.isArray(categories) ? categories : [];
    renderSupabase();
    setSupabaseStatus(
      "Data Supabase dimuat: " + supabaseMonthly.length + " bulan dan " +
        supabaseCategories.length + " baris kategori. Data ini hanya baca.",
      "success"
    );
  } catch (e) {
    supabaseMonthly = [];
    supabaseCategories = [];
    renderSupabase();
    setSupabaseStatus(e.message, "error");
  }
}

function initSupabaseForm() {
  el("supabase-url").value = supabaseSettings.url;
  el("supabase-key").value = supabaseSettings.key;
  if (supabaseConfigured()) {
    setSupabaseStatus("Pengaturan Supabase tersimpan di browser ini. Klik Uji Koneksi atau Muat Data Supabase.");
  }
}

// Navigation
document.querySelectorAll(".tabs button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tabs button").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    btn.classList.add("active");
    el("view-" + btn.dataset.view).classList.add("active");
  });
});

el("transaction-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const id = el("tx-id").value;
  const data = {
    date: el("tx-date").value,
    title: el("tx-title").value.trim(),
    category: el("tx-category").value,
    wallet: el("tx-wallet").value,
    amount: Number(el("tx-amount").value) || 0,
    direction: el("tx-direction").value,
  };
  if (id) {
    const tx = state.transactions.find((t) => t.id === id);
    if (tx) Object.assign(tx, data);
  } else {
    state.transactions.push({ id: "tx-" + Date.now(), ...data, sample: false });
  }
  if (data.category && !state.categories.includes(data.category)) state.categories.push(data.category);
  save();
  resetTransactionForm();
  renderAll();
});

el("tx-cancel").addEventListener("click", resetTransactionForm);

["filter-type", "filter-category", "filter-wallet", "filter-search", "filter-month", "filter-start", "filter-end"].forEach((id) => {
  el(id).addEventListener("input", renderTransactions);
});

el("clear-filters-btn").addEventListener("click", () => {
  ["filter-type", "filter-category", "filter-wallet", "filter-search", "filter-month", "filter-start", "filter-end"].forEach((id) => {
    el(id).value = "";
  });
  renderTransactions();
});

el("dashboard-month").addEventListener("input", renderDashboard);
el("report-month").addEventListener("input", renderLaporan);
el("budget-month").addEventListener("input", renderAnggaran);

el("export-csv-btn").addEventListener("click", exportCsv);
el("import-csv-input").addEventListener("change", (e) => {
  if (e.target.files && e.target.files[0]) importCsvFile(e.target.files[0]);
  e.target.value = "";
});

el("clear-sample-btn").addEventListener("click", () => {
  state.transactions = state.transactions.filter((t) => !t.sample);
  state.sample = false;
  save();
  renderAll();
});

el("load-sample-btn").addEventListener("click", () => {
  const existing = new Set(state.transactions.map((t) => t.id));
  sampleTransactions().forEach((tx) => {
    if (!existing.has(tx.id)) state.transactions.push(tx);
  });
  state.sample = true;
  save();
  renderAll();
});

el("budget-form").addEventListener("submit", (e) => {
  e.preventDefault();
  state.budgets[el("budget-category").value] = Number(el("budget-amount").value) || 0;
  save();
  renderAll();
});

el("wallet-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = el("wallet-name").value.trim();
  if (!name) return;
  if (state.wallets.some((w) => w.name === name)) {
    window.alert("Dompet dengan nama itu sudah ada.");
    return;
  }
  state.wallets.push({ name, initial: Number(el("wallet-initial").value) || 0 });
  el("wallet-form").reset();
  el("wallet-initial").value = 0;
  save();
  renderAll();
});

el("category-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = el("category-name").value.trim();
  if (!name) return;
  if (!state.categories.includes(name)) state.categories.push(name);
  el("category-form").reset();
  save();
  renderAll();
});

el("supabase-form").addEventListener("submit", (e) => {
  e.preventDefault();
  supabaseSettings = {
    url: el("supabase-url").value.trim().replace(/\/$/, ""),
    key: el("supabase-key").value.trim(),
  };
  saveSupabaseSettings();
  setSupabaseStatus(
    supabaseConfigured()
      ? "Pengaturan Supabase disimpan di browser ini saja. Klik Uji Koneksi atau Muat Data Supabase."
      : "Pengaturan Supabase belum lengkap. Masukkan URL dan publishable key.",
    supabaseConfigured() ? "success" : "error"
  );
});

el("supabase-test-btn").addEventListener("click", testSupabaseConnection);
el("supabase-load-btn").addEventListener("click", loadSupabaseData);
el("supabase-month").addEventListener("input", renderSupabaseMonthDetail);

el("supabase-clear-btn").addEventListener("click", () => {
  if (!window.confirm("Hapus pengaturan Supabase dari browser ini?")) return;
  supabaseSettings = { url: "", key: "" };
  supabaseMonthly = [];
  supabaseCategories = [];
  try {
    localStorage.removeItem(SUPABASE_SETTINGS_KEY);
  } catch (e) {
    // ignore storage errors on clear
  }
  el("supabase-url").value = "";
  el("supabase-key").value = "";
  renderSupabase();
  setSupabaseStatus("Pengaturan Supabase telah dihapus dari browser ini.");
});

renderAll();
initSupabaseForm();
renderSupabase();
