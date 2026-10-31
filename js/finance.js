// finance.js — dashboard, laporan (with charts), anggaran, dompet, kategori.
function barRow(label, detail, amountText, pct) {
  const div = document.createElement("div");
  div.className = "item";
  const main = document.createElement("div");
  main.style.flex = "1";
  const strong = document.createElement("strong");
  strong.textContent = label;
  const barWrap = document.createElement("div");
  barWrap.className = "bar-wrap";
  const bar = document.createElement("div");
  bar.className = "bar" + (pct > 100 ? " over" : "");
  bar.style.width = Math.min(100, pct) + "%";
  barWrap.appendChild(bar);
  const small = document.createElement("small");
  small.textContent = detail;
  main.appendChild(strong);
  main.appendChild(barWrap);
  main.appendChild(small);
  const amount = document.createElement("strong");
  amount.textContent = amountText;
  div.appendChild(main);
  div.appendChild(amount);
  return div;
}

function renderDashboard() {
  const month = el("dashboard-month").value;
  const list = state.transactions.filter((tx) => inMonth(tx, month));
  const totalIn = sumByDirection(list, "in");
  const totalOut = sumByDirection(list, "out");
  setText("total-in", fmtRp(totalIn));
  setText("total-out", fmtRp(totalOut));
  setText("net-total", fmtRp(totalIn - totalOut));
  setText("total-balance", fmtRp(totalBalance()));
  el("trend-chart").innerHTML = monthlyTrendSVG(state.transactions);

  const recent = el("recent-list");
  recent.innerHTML = "";
  const sorted = [...list].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 8);
  if (!sorted.length) {
    recent.appendChild(emptyState("Belum ada transaksi untuk periode ini", "Ubah bulan di atas, atau tambahkan transaksi baru."));
  } else {
    sorted.forEach((tx) => recent.appendChild(txRow(tx)));
  }
}

function renderLaporan() {
  const month = el("report-month").value;
  const list = state.transactions.filter((tx) => inMonth(tx, month) && tx.direction === "out");
  const totalOut = list.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
  const byCategory = {};
  for (const tx of list) byCategory[tx.category] = (byCategory[tx.category] || 0) + (Number(tx.amount) || 0);
  const entries = Object.entries(byCategory)
    .map(([label, amount]) => ({ label, amount }))
    .sort((a, b) => b.amount - a.amount);

  const chart = el("category-chart");
  if (!entries.length) {
    chart.innerHTML = "";
    chart.appendChild(emptyState("Belum ada pengeluaran", "Pilih bulan lain, atau tambahkan transaksi keluar."));
  } else {
    chart.innerHTML = categoryDonutSVG(entries);
    const legend = document.createElement("div");
    legend.className = "chart-legend";
    entries.forEach((entry, i) => {
      const pct = totalOut ? Math.round((entry.amount / totalOut) * 100) : 0;
      const span = document.createElement("span");
      const swatch = document.createElement("span");
      swatch.className = "swatch";
      swatch.style.background = categoryColor(i);
      span.appendChild(swatch);
      span.appendChild(document.createTextNode(entry.label + " · " + pct + "%"));
      legend.appendChild(span);
    });
    chart.appendChild(legend);
  }

  const breakdown = el("category-breakdown");
  breakdown.innerHTML = "";
  if (!entries.length) {
    breakdown.appendChild(emptyState("Belum ada pengeluaran untuk periode ini", ""));
  } else {
    entries.forEach((entry) => {
      const pct = totalOut ? Math.round((entry.amount / totalOut) * 100) : 0;
      breakdown.appendChild(barRow(entry.label, pct + "% dari total pengeluaran", fmtRp(entry.amount), pct));
    });
  }

  const walletsEl = el("report-wallets");
  walletsEl.innerHTML = "";
  state.wallets.forEach((w) => {
    const div = document.createElement("div");
    div.className = "item";
    const main = document.createElement("div");
    const strong = document.createElement("strong");
    strong.textContent = w.name;
    const small = document.createElement("small");
    small.textContent = "Saldo awal " + fmtRp(w.initial);
    main.appendChild(strong);
    main.appendChild(small);
    const amount = document.createElement("strong");
    amount.textContent = fmtRp(walletBalance(w.name));
    div.appendChild(main);
    div.appendChild(amount);
    walletsEl.appendChild(div);
  });
}

function renderAnggaran() {
  const month = el("budget-month").value;
  const list = state.transactions.filter((tx) => inMonth(tx, month) && tx.direction === "out");
  const totalBudget = Object.values(state.budgets).reduce((s, v) => s + (Number(v) || 0), 0);
  const totalUsed = list.reduce((s, tx) => s + (Number(tx.amount) || 0), 0);
  const remaining = totalBudget - totalUsed;
  setText("budget-total", fmtRp(totalBudget));
  setText("budget-used", fmtRp(totalUsed));
  setText("budget-remaining", fmtRp(remaining));
  setText("budget-daily", fmtRp(Math.max(0, remaining) / daysInMonth(month)));

  const container = el("budget-list");
  container.innerHTML = "";
  const categories = [...new Set([...state.categories, ...Object.keys(state.budgets)])];
  categories.forEach((category) => {
    const budget = Number(state.budgets[category]) || 0;
    const used = list
      .filter((tx) => tx.category === category)
      .reduce((s, tx) => s + (Number(tx.amount) || 0), 0);
    const pct = budget ? Math.round((used / budget) * 100) : 0;
    container.appendChild(barRow(
      category,
      "Terpakai " + fmtRp(used) + " dari " + fmtRp(budget) + " (" + pct + "%)" + (pct > 100 ? " · melebihi anggaran" : ""),
      fmtRp(Math.max(0, budget - used)) + " sisa",
      pct
    ));
  });
}

function renderDompet() {
  const container = el("wallet-list");
  container.innerHTML = "";
  if (!state.wallets.length) {
    container.appendChild(emptyState("Belum ada dompet", "Tambahkan dompet di atas."));
    return;
  }
  state.wallets.forEach((w) => {
    const div = document.createElement("div");
    div.className = "item";
    const main = document.createElement("div");
    const strong = document.createElement("strong");
    strong.textContent = w.name;
    const small = document.createElement("small");
    small.textContent = "Saldo awal " + fmtRp(w.initial);
    main.appendChild(strong);
    main.appendChild(small);
    const right = document.createElement("div");
    right.style.display = "flex";
    right.style.gap = "8px";
    right.style.alignItems = "center";
    const amount = document.createElement("strong");
    amount.textContent = fmtRp(walletBalance(w.name));
    right.appendChild(amount);
    if (!walletIsUsed(w.name)) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ghost danger";
      btn.textContent = "Hapus";
      btn.addEventListener("click", async () => {
        if (!(await confirmDialog("Hapus dompet “" + w.name + "”?"))) return;
        state.wallets = state.wallets.filter((x) => x.name !== w.name);
        save();
        renderAll();
        showToast("Dompet dihapus.", "success");
      });
      right.appendChild(btn);
    }
    div.appendChild(main);
    div.appendChild(right);
    container.appendChild(div);
  });
}

function renderKategori() {
  const container = el("category-list");
  container.innerHTML = "";
  state.categories.forEach((category) => {
    const div = document.createElement("div");
    div.className = "item";
    const strong = document.createElement("strong");
    strong.textContent = category;
    div.appendChild(strong);
    if (categoryIsUsed(category)) {
      const span = document.createElement("span");
      span.className = "badge";
      span.textContent = "Dipakai di transaksi";
      div.appendChild(span);
    } else {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ghost danger";
      btn.textContent = "Hapus";
      btn.addEventListener("click", async () => {
        if (!(await confirmDialog("Hapus kategori “" + category + "”?"))) return;
        state.categories = state.categories.filter((c) => c !== category);
        delete state.budgets[category];
        save();
        renderAll();
        showToast("Kategori dihapus.", "success");
      });
      div.appendChild(btn);
    }
    container.appendChild(div);
  });
}

function initFinance() {
  el("dashboard-month").addEventListener("input", renderDashboard);
  el("report-month").addEventListener("input", renderLaporan);
  el("budget-month").addEventListener("input", renderAnggaran);

  // Budget auto-fill: when the category changes, show its saved budget.
  el("budget-category").addEventListener("change", () => {
    const category = el("budget-category").value;
    el("budget-amount").value = category ? (state.budgets[category] ?? "") : "";
  });

  el("budget-form").addEventListener("submit", (e) => {
    e.preventDefault();
    state.budgets[el("budget-category").value] = Number(el("budget-amount").value) || 0;
    save();
    renderAll();
    showToast("Anggaran disimpan.", "success");
  });

  el("wallet-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = el("wallet-name").value.trim();
    if (!name) return;
    if (state.wallets.some((w) => w.name === name)) {
      showToast("Dompet dengan nama itu sudah ada.", "error");
      return;
    }
    state.wallets.push({ name, initial: Number(el("wallet-initial").value) || 0 });
    el("wallet-form").reset();
    el("wallet-initial").value = 0;
    save();
    renderAll();
    showToast("Dompet ditambahkan.", "success");
  });

  el("category-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = el("category-name").value.trim();
    if (!name) return;
    if (!state.categories.includes(name)) state.categories.push(name);
    el("category-form").reset();
    save();
    renderAll();
    showToast("Kategori ditambahkan.", "success");
  });
}
