// import-export.js — CSV preview/import, CSV export, JSON backup.
// Supabase settings are deliberately excluded from every backup:
// a backup file must never carry credentials, even a publishable key.
let pendingImport = null; // { rows: [...], skipped: [...] } awaiting confirmation

function csvEscape(value) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return '"' + text.replaceAll('"', '""') + '"';
  }
  return text;
}

function exportCsv() {
  const header = "date,title,category,wallet,amount,direction,toWallet";
  const rows = state.transactions.map((tx) =>
    [tx.date, tx.title, tx.category, tx.wallet, tx.amount, tx.direction, tx.toWallet || ""]
      .map(csvEscape)
      .join(",")
  );
  downloadFile("financial-tracker.csv", [header, ...rows].join("\n"), "text/csv;charset=utf-8");
  showToast("CSV diekspor.", "success");
}

function exportJson() {
  const backup = {
    app: "financial-tracker",
    version: 1,
    exportedAt: new Date().toISOString(),
    transactions: state.transactions,
    wallets: state.wallets,
    categories: state.categories,
    budgets: state.budgets,
    sample: state.sample,
  };
  downloadFile("financial-tracker-backup.json", JSON.stringify(backup, null, 2), "application/json");
  showToast("Cadangan JSON diekspor. Pengaturan Supabase tidak ikut diekspor.", "success");
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

// Validate CSV rows without changing state. Returns { rows, skipped }.
// A row is skipped with a reason instead of being silently coerced,
// except for a missing category/wallet, which fall back to defaults.
function validateCsvRows(rows) {
  const hasHeader = rows.length && /date/i.test(rows[0][0] || "");
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const valid = [];
  const skipped = [];
  dataRows.forEach((row, index) => {
    const lineNo = index + (hasHeader ? 2 : 1);
    const [dateRaw, titleRaw, categoryRaw, walletRaw, amountRaw, directionRaw, toWalletRaw] =
      row.map((v) => (v || "").trim());
    if (!dateRaw) { skipped.push({ line: lineNo, reason: "Tanggal kosong." }); return; }
    if (!titleRaw) { skipped.push({ line: lineNo, reason: "Judul kosong." }); return; }
    if (!amountRaw) { skipped.push({ line: lineNo, reason: "Jumlah kosong." }); return; }
    const amount = Number(String(amountRaw).replace(/[^0-9.-]/g, ""));
    if (!Number.isFinite(amount) || amount < 0) { skipped.push({ line: lineNo, reason: "Jumlah tidak valid: " + amountRaw }); return; }
    if (!["in", "out", "transfer"].includes(directionRaw)) {
      skipped.push({ line: lineNo, reason: "Arah tidak valid: " + (directionRaw || "(kosong)") + ". Gunakan in, out, atau transfer." });
      return;
    }
    const direction = directionRaw;
    const wallet = walletRaw || "Dompet Utama";
    const toWallet = (toWalletRaw || "").trim();
    if (direction === "transfer") {
      if (!toWallet) { skipped.push({ line: lineNo, reason: "Transfer butuh dompet tujuan (kolom toWallet)." }); return; }
      if (toWallet === wallet) { skipped.push({ line: lineNo, reason: "Dompet tujuan transfer sama dengan dompet asal." }); return; }
    }
    const normalizedDate = dateRaw.replace(" ", "T");
    valid.push({
      id: uniqueId("csv"),
      date: normalizedDate.length === 10 ? normalizedDate + "T00:00" : normalizedDate.slice(0, 16),
      title: titleRaw,
      category: categoryRaw || "Lain-lain",
      wallet,
      toWallet: direction === "transfer" ? toWallet : undefined,
      amount,
      direction,
      sample: false,
    });
  });
  return { rows: valid, skipped };
}

function openImportPreview() {
  const backdrop = el("import-backdrop");
  const summary = el("import-summary");
  const preview = el("import-preview");
  const valid = pendingImport.rows;
  const skipped = pendingImport.skipped;
  summary.textContent = valid.length + " baris valid dan " + skipped.length + " baris dilewati. Periksa dulu, lalu konfirmasi untuk mengimpor.";
  preview.innerHTML = "";
  if (valid.length) {
    const title = document.createElement("h4");
    title.textContent = "Pratinjau (" + Math.min(20, valid.length) + " dari " + valid.length + " baris valid)";
    preview.appendChild(title);
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    thead.innerHTML = "<tr><th>Tanggal</th><th>Judul</th><th>Kategori</th><th>Dompet</th><th>Jumlah</th><th>Arah</th></tr>";
    table.appendChild(thead);
    const tbody = document.createElement("tbody");
    valid.slice(0, 20).forEach((tx) => {
      const tr = document.createElement("tr");
      const cells = [tx.date.slice(0, 10), tx.title, tx.category, tx.toWallet ? tx.wallet + " → " + tx.toWallet : tx.wallet, fmtRp(tx.amount), directionLabel(tx.direction)];
      cells.forEach((text) => {
        const td = document.createElement("td");
        td.textContent = text;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    preview.appendChild(table);
  }
  if (skipped.length) {
    const title = document.createElement("h4");
    title.textContent = "Baris dilewati";
    preview.appendChild(title);
    const list = document.createElement("ul");
    skipped.slice(0, 30).forEach((s) => {
      const li = document.createElement("li");
      li.textContent = "Baris " + s.line + ": " + s.reason;
      list.appendChild(li);
    });
    preview.appendChild(list);
    if (skipped.length > 30) {
      const more = document.createElement("p");
      more.className = "hint";
      more.textContent = "Dan " + (skipped.length - 30) + " baris dilewati lainnya.";
      preview.appendChild(more);
    }
  }
  if (!valid.length && !skipped.length) {
    preview.appendChild(emptyState("File kosong", "Tidak ada baris data yang ditemukan."));
  }
  backdrop.hidden = false;
}

function closeImportPreview() {
  el("import-backdrop").hidden = true;
  pendingImport = null;
}

function applyPendingImport() {
  if (!pendingImport) return;
  let added = 0;
  for (const tx of pendingImport.rows) {
    if (tx.category && !state.categories.includes(tx.category)) state.categories.push(tx.category);
    if (!state.wallets.some((w) => w.name === tx.wallet)) state.wallets.push({ name: tx.wallet, initial: 0 });
    if (tx.toWallet && !state.wallets.some((w) => w.name === tx.toWallet)) state.wallets.push({ name: tx.toWallet, initial: 0 });
    state.transactions.push(tx);
    added += 1;
  }
  refreshSampleFlag();
  save();
  closeImportPreview();
  renderAll();
  showToast(added + " transaksi berhasil diimpor.", "success");
}

function prepareCsvImport(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const rows = parseCsv(String(reader.result || ""));
    if (!rows.length) {
      showToast("File CSV kosong.", "error");
      return;
    }
    pendingImport = validateCsvRows(rows);
    if (!pendingImport.rows.length) {
      showToast("Tidak ada baris CSV yang valid. Periksa format dan arah (in, out, transfer).", "error");
      pendingImport = null;
      return;
    }
    openImportPreview();
  };
  reader.readAsText(file);
}

function prepareJsonImport(file) {
  const reader = new FileReader();
  reader.onload = async () => {
    let parsed;
    try {
      parsed = JSON.parse(String(reader.result || ""));
    } catch (e) {
      showToast("File JSON tidak valid.", "error");
      return;
    }
    if (!parsed || !Array.isArray(parsed.transactions)) {
      showToast("File JSON bukan cadangan Financial Tracker yang valid.", "error");
      return;
    }
    const txCount = parsed.transactions.length;
    const ok = await confirmDialog("Impor cadangan JSON dengan " + txCount + " transaksi? Data saat ini akan tetap ada, dan data cadangan akan ditambahkan.");
    if (!ok) return;
    const before = state.transactions.length;
    for (const raw of parsed.transactions) {
      state.transactions.push(normalizeTransaction(raw));
    }
    if (Array.isArray(parsed.wallets)) {
      for (const w of parsed.wallets) {
        if (w && w.name && !state.wallets.some((x) => x.name === w.name)) {
          state.wallets.push({ name: String(w.name), initial: Number(w.initial) || 0 });
        }
      }
    }
    if (Array.isArray(parsed.categories)) {
      for (const c of parsed.categories) {
        if (c && !state.categories.includes(String(c))) state.categories.push(String(c));
      }
    }
    if (parsed.budgets && typeof parsed.budgets === "object") {
      state.budgets = { ...state.budgets, ...parsed.budgets };
    }
    refreshSampleFlag();
    save();
    renderAll();
    showToast((state.transactions.length - before) + " transaksi berhasil diimpor dari JSON.", "success");
  };
  reader.readAsText(file);
}

function initImportExport() {
  el("export-csv-btn").addEventListener("click", exportCsv);
  el("export-json-btn").addEventListener("click", exportJson);
  el("import-csv-input").addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) prepareCsvImport(e.target.files[0]);
    e.target.value = "";
  });
  el("import-json-input").addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) prepareJsonImport(e.target.files[0]);
    e.target.value = "";
  });
  el("import-cancel-btn").addEventListener("click", closeImportPreview);
  el("import-confirm-btn").addEventListener("click", applyPendingImport);
  el("import-backdrop").addEventListener("click", (e) => {
    if (e.target === el("import-backdrop")) closeImportPreview();
  });
}
