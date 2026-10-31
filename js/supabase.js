// supabase.js — optional, read-only Supabase access.
// Settings are stored only in this browser (localStorage). They are never
// written to repo files, never included in JSON backups, and this file
// contains placeholders only. See .env.example for the same placeholders.
const SUPABASE_SETTINGS_KEY = "financial-tracker-supabase-v1";
let supabaseSettings = loadSupabaseSettings();
let supabaseMonthly = [];
let supabaseCategories = [];
let supabaseLoading = false;

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
  try {
    localStorage.setItem(SUPABASE_SETTINGS_KEY, JSON.stringify(supabaseSettings));
  } catch (e) {
    // Settings still apply for this session.
  }
}

function setSupabaseStatus(message, kind) {
  const statusEl = el("supabase-status");
  statusEl.textContent = message;
  statusEl.className = "status" + (kind === "success" ? " success" : kind === "error" ? " error" : kind === "loading" ? " loading" : "");
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

function setSupabaseLoading(loading) {
  supabaseLoading = loading;
  el("supabase-test-btn").disabled = loading;
  el("supabase-load-btn").disabled = loading;
  if (loading) setSupabaseStatus("Memuat data Supabase…", "loading");
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

function renderSupabaseMonthly() {
  const container = el("supabase-monthly-list");
  container.innerHTML = "";
  if (!supabaseMonthly.length) {
    container.appendChild(emptyState("Belum ada data bulanan Supabase", "Klik Muat Data Supabase setelah pengaturan tersimpan."));
    return;
  }
  const sorted = [...supabaseMonthly].sort((a, b) => String(b.month_start).localeCompare(String(a.month_start)));
  sorted.forEach((row) => {
    const div = document.createElement("div");
    div.className = "item";
    const main = document.createElement("div");
    const strong = document.createElement("strong");
    strong.textContent = fmtMonthLabel(row.month_start);
    const small = document.createElement("small");
    small.textContent = "Masuk " + fmtRp(row.masuk) + " · Keluar " + fmtRp(row.keluar);
    main.appendChild(strong);
    main.appendChild(small);
    const amount = document.createElement("strong");
    amount.textContent = fmtRp(row.net_flow);
    div.appendChild(main);
    div.appendChild(amount);
    container.appendChild(div);
  });
}

function renderSupabaseMonthDetail() {
  const selected = el("supabase-month").value;
  const row = supabaseMonthly.find((r) => String(r.month_start) === selected);
  setText("supabase-month-in", fmtRp(row ? row.masuk : 0));
  setText("supabase-month-out", fmtRp(row ? row.keluar : 0));
  setText("supabase-month-net", fmtRp(row ? row.net_flow : 0));

  const container = el("supabase-category-list");
  container.innerHTML = "";
  if (!selected) {
    container.appendChild(emptyState("Pilih bulan", "Pilih bulan untuk melihat kategori."));
    return;
  }
  const cats = supabaseCategories.filter((c) => String(c.month_start) === selected);
  if (!cats.length) {
    container.appendChild(emptyState("Tidak ada kategori Supabase untuk bulan ini", ""));
    return;
  }
  const totalOut = cats.filter((c) => c.direction === "out").reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const totalIn = cats.filter((c) => c.direction === "in").reduce((s, c) => s + (Number(c.amount) || 0), 0);
  [...cats]
    .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))
    .forEach((c) => {
      const direction = directionLabel(c.direction === "in" ? "in" : "out");
      const base = c.direction === "in" ? totalIn : totalOut;
      const pct = base ? Math.round(((Number(c.amount) || 0) / base) * 100) : 0;
      container.appendChild(barRow(c.category, direction + " · " + pct + "% dari total " + direction.toLowerCase() + " bulan ini", fmtRp(c.amount), pct));
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
  setSupabaseLoading(true);
  try {
    const rows = await supabaseFetch("moni_monthly", "select=month_start&order=month_start&limit=1");
    setSupabaseStatus("Koneksi Supabase berhasil. Tabel moni_monthly ditemukan" + (Array.isArray(rows) ? " (" + rows.length + " baris pada uji limit 1)." : "."), "success");
    showToast("Koneksi Supabase berhasil.", "success");
  } catch (e) {
    setSupabaseStatus(e.message, "error");
    showToast("Koneksi Supabase gagal.", "error");
  } finally {
    setSupabaseLoading(false);
  }
}

async function loadSupabaseData() {
  if (!supabaseConfigured()) {
    setSupabaseStatus("Masukkan Supabase URL dan publishable key terlebih dahulu, lalu simpan.", "error");
    return;
  }
  setSupabaseLoading(true);
  try {
    const [monthly, categories] = await Promise.all([
      supabaseFetch("moni_monthly", "select=*&order=month_start"),
      supabaseFetch("moni_monthly_categories", "select=*&order=month_start"),
    ]);
    supabaseMonthly = Array.isArray(monthly) ? monthly : [];
    supabaseCategories = Array.isArray(categories) ? categories : [];
    renderSupabase();
    setSupabaseStatus("Data Supabase dimuat: " + supabaseMonthly.length + " bulan dan " + supabaseCategories.length + " baris kategori. Data ini hanya baca.", "success");
    showToast("Data Supabase dimuat.", "success");
  } catch (e) {
    supabaseMonthly = [];
    supabaseCategories = [];
    renderSupabase();
    setSupabaseStatus(e.message, "error");
    showToast("Gagal memuat data Supabase.", "error");
  } finally {
    setSupabaseLoading(false);
  }
}

function initSupabaseForm() {
  el("supabase-url").value = supabaseSettings.url;
  el("supabase-key").value = supabaseSettings.key;
  if (supabaseConfigured()) {
    setSupabaseStatus("Pengaturan Supabase tersimpan di browser ini. Klik Uji Koneksi atau Muat Data Supabase.");
  }
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
    showToast(supabaseConfigured() ? "Pengaturan Supabase disimpan di browser." : "Pengaturan Supabase belum lengkap.", supabaseConfigured() ? "success" : "error");
  });
  el("supabase-test-btn").addEventListener("click", testSupabaseConnection);
  el("supabase-load-btn").addEventListener("click", loadSupabaseData);
  el("supabase-month").addEventListener("input", renderSupabaseMonthDetail);
  el("supabase-clear-btn").addEventListener("click", async () => {
    if (!(await confirmDialog("Hapus pengaturan Supabase dari browser ini?"))) return;
    supabaseSettings = { url: "", key: "" };
    supabaseMonthly = [];
    supabaseCategories = [];
    try {
      localStorage.removeItem(SUPABASE_SETTINGS_KEY);
    } catch (e) {
      // Ignore storage errors on clear.
    }
    el("supabase-url").value = "";
    el("supabase-key").value = "";
    renderSupabase();
    setSupabaseStatus("Pengaturan Supabase telah dihapus dari browser ini.");
    showToast("Pengaturan Supabase dihapus.", "success");
  });
}
