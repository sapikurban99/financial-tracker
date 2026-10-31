// transactions.js — transaction form, filters, sorting, and pagination.
const TX_PAGE_SIZE = 20;
let txPage = 1;

function refreshSelects() {
  // Preserve the user's current selections while rebuilding the lists,
  // so a re-render never silently resets a form the user is filling in.
  const previous = {};
  ["tx-category", "tx-wallet", "tx-wallet-to", "filter-category", "filter-wallet", "budget-category"].forEach((id) => {
    previous[id] = el(id) ? el(id).value : "";
  });
  setSelectOptions(el("tx-category"), state.categories, false);
  setSelectOptions(el("tx-wallet"), state.wallets.map((w) => w.name), false);
  setSelectOptions(el("tx-wallet-to"), state.wallets.map((w) => w.name), false);
  setSelectOptions(el("filter-category"), state.categories, true);
  setSelectOptions(el("filter-wallet"), state.wallets.map((w) => w.name), true);
  setSelectOptions(el("budget-category"), state.categories, false);
  Object.entries(previous).forEach(([id, value]) => {
    if (value && [...el(id).options].some((o) => o.value === value)) el(id).value = value;
  });
  // Budget auto-fill: changing the category shows its existing budget.
  const budgetCategory = el("budget-category").value;
  if (budgetCategory) {
    el("budget-amount").value = state.budgets[budgetCategory] ?? "";
  }
}

function syncTransferFields() {
  const isTransfer = el("tx-direction").value === "transfer";
  el("tx-wallet-to-wrap").hidden = !isTransfer;
  el("tx-wallet-to").required = isTransfer;
  const walletLabel = document.querySelector('label:has(#tx-wallet)');
  if (walletLabel) {
    // Keep the label text accurate without rebuilding the form.
    const firstText = walletLabel.childNodes[0];
    if (firstText) firstText.textContent = isTransfer ? "Dompet Asal" : "Dompet";
  }
}

function txRow(tx) {
  const div = document.createElement("div");
  div.className = "item";
  const main = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = tx.title;
  const meta = document.createElement("small");
  const transfer = transferLabel(tx);
  meta.textContent = fmtDate(tx.date) + " · " + tx.category + " · " +
    (transfer || tx.wallet) + " · " + directionLabel(tx.direction);
  main.appendChild(title);
  main.appendChild(meta);
  const right = document.createElement("div");
  right.style.display = "flex";
  right.style.gap = "8px";
  right.style.alignItems = "center";
  right.style.flexWrap = "wrap";
  const amount = document.createElement("span");
  amount.className = directionClass(tx.direction);
  const sign = tx.direction === "in" ? "+" : tx.direction === "out" ? "-" : "";
  amount.textContent = sign + fmtRp(tx.amount);
  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "ghost";
  editBtn.textContent = "Ubah";
  editBtn.addEventListener("click", () => editTransaction(tx.id));
  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "ghost danger";
  deleteBtn.textContent = "Hapus";
  deleteBtn.addEventListener("click", async () => {
    if (!(await confirmDialog("Hapus transaksi “" + tx.title + "”? Tindakan ini tidak dapat dibatalkan."))) return;
    state.transactions = state.transactions.filter((t) => t.id !== tx.id);
    refreshSampleFlag();
    save();
    renderAll();
    showToast("Transaksi dihapus.", "success");
  });
  right.appendChild(amount);
  right.appendChild(editBtn);
  right.appendChild(deleteBtn);
  div.appendChild(main);
  div.appendChild(right);
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
  const sort = el("filter-sort").value;
  const list = state.transactions.filter((tx) => {
    if (type && tx.direction !== type) return false;
    if (category && tx.category !== category) return false;
    if (wallet && tx.wallet !== wallet && tx.toWallet !== wallet) return false;
    if (search && !String(tx.title).toLowerCase().includes(search)) return false;
    if (!inMonth(tx, month)) return false;
    if (!inDateRange(tx, start, end)) return false;
    return true;
  });
  const byDate = (a, b) => String(a.date).localeCompare(String(b.date));
  if (sort === "date-asc") list.sort(byDate);
  else if (sort === "amount-desc") list.sort((a, b) => b.amount - a.amount);
  else if (sort === "amount-asc") list.sort((a, b) => a.amount - b.amount);
  else if (sort === "title-asc") list.sort((a, b) => String(a.title).localeCompare(String(b.title)));
  else list.sort((a, b) => byDate(b, a));
  return list;
}

function renderTransactions() {
  const list = filteredTransactions();
  const totalPages = Math.max(1, Math.ceil(list.length / TX_PAGE_SIZE));
  if (txPage > totalPages) txPage = totalPages;
  const startIndex = (txPage - 1) * TX_PAGE_SIZE;
  const pageItems = list.slice(startIndex, startIndex + TX_PAGE_SIZE);
  const container = el("transaction-list");
  container.innerHTML = "";
  if (!list.length) {
    container.appendChild(emptyState("Tidak ada transaksi", "Coba ubah filter, atau tambahkan transaksi baru."));
  } else {
    pageItems.forEach((tx) => container.appendChild(txRow(tx)));
  }
  setText("transaction-count", list.length + " transaksi");
  setText("transaction-page-label", list.length
    ? "Halaman " + txPage + " dari " + totalPages + " · menampilkan " + (pageItems.length ? startIndex + 1 : 0) + "–" + (startIndex + pageItems.length) + " dari " + list.length
    : "");
  el("transaction-prev-btn").disabled = txPage <= 1;
  el("transaction-next-btn").disabled = txPage >= totalPages;
}

function editTransaction(id) {
  const tx = state.transactions.find((t) => t.id === id);
  if (!tx) return;
  refreshSelects();
  el("tx-id").value = tx.id;
  el("tx-date").value = tx.date;
  el("tx-title").value = tx.title;
  el("tx-category").value = tx.category;
  el("tx-wallet").value = tx.wallet;
  if (tx.toWallet) el("tx-wallet-to").value = tx.toWallet;
  el("tx-amount").value = tx.amount;
  el("tx-direction").value = tx.direction;
  syncTransferFields();
  el("tx-submit").textContent = "Simpan Perubahan";
  el("tx-cancel").hidden = false;
  showView("transaksi");
  el("transaction-form").scrollIntoView({ behavior: "smooth" });
}

function resetTransactionForm() {
  el("transaction-form").reset();
  el("tx-id").value = "";
  el("tx-submit").textContent = "Simpan Transaksi";
  el("tx-cancel").hidden = true;
  el("tx-direction").value = "out";
  syncTransferFields();
}

function initTransactions() {
  el("tx-direction").addEventListener("change", syncTransferFields);
  syncTransferFields();

  el("transaction-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const direction = el("tx-direction").value;
    const wallet = el("tx-wallet").value;
    const toWallet = el("tx-wallet-to").value;
    if (direction === "transfer") {
      if (!toWallet) {
        showToast("Pilih dompet tujuan untuk transfer.", "error");
        return;
      }
      if (toWallet === wallet) {
        showToast("Dompet tujuan transfer harus berbeda dari dompet asal.", "error");
        return;
      }
    }
    const data = {
      date: el("tx-date").value,
      title: el("tx-title").value.trim(),
      category: el("tx-category").value,
      wallet,
      amount: Number(el("tx-amount").value) || 0,
      direction,
    };
    if (direction === "transfer") data.toWallet = toWallet;
    const id = el("tx-id").value;
    if (id) {
      const tx = state.transactions.find((t) => t.id === id);
      if (tx) {
        Object.assign(tx, data);
        if (direction !== "transfer") delete tx.toWallet;
      }
    } else {
      state.transactions.push({ id: uniqueId("tx"), ...data, sample: false });
    }
    if (data.category && !state.categories.includes(data.category)) state.categories.push(data.category);
    refreshSampleFlag();
    save();
    resetTransactionForm();
    renderAll();
    showToast(id ? "Transaksi diperbarui." : "Transaksi disimpan.", "success");
  });

  el("tx-cancel").addEventListener("click", resetTransactionForm);

  ["filter-type", "filter-category", "filter-wallet", "filter-search", "filter-sort", "filter-month", "filter-start", "filter-end"].forEach((id) => {
    el(id).addEventListener("input", () => {
      txPage = 1;
      renderTransactions();
    });
  });

  el("clear-filters-btn").addEventListener("click", () => {
    ["filter-type", "filter-category", "filter-wallet", "filter-search", "filter-month", "filter-start", "filter-end"].forEach((id) => {
      el(id).value = "";
    });
    el("filter-sort").value = "date-desc";
    txPage = 1;
    renderTransactions();
  });

  el("transaction-prev-btn").addEventListener("click", () => {
    if (txPage > 1) {
      txPage -= 1;
      renderTransactions();
    }
  });
  el("transaction-next-btn").addEventListener("click", () => {
    txPage += 1;
    renderTransactions();
  });
}
