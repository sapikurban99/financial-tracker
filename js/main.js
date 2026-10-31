// main.js — wiring only. All views are rendered by their own modules.
// Load order (see index.html): utils, state, charts, ui, transactions,
// finance, import-export, supabase, then this file.
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

function initSampleButtons() {
  el("clear-sample-btn").addEventListener("click", async () => {
    if (!(await confirmDialog("Hapus semua data contoh? Transaksi Anda yang lain tidak akan dihapus."))) return;
    state.transactions = state.transactions.filter((t) => !t.sample);
    state.sample = false;
    save();
    renderAll();
    showToast("Data contoh dihapus.", "success");
  });

  el("load-sample-btn").addEventListener("click", () => {
    const existing = new Set(state.transactions.map((t) => t.id));
    sampleTransactions().forEach((tx) => {
      if (!existing.has(tx.id)) state.transactions.push(tx);
    });
    state.sample = true;
    save();
    renderAll();
    showToast("Data contoh dimuat.", "success");
  });
}

initTheme();
initNavigation();
initTransactions();
initFinance();
initImportExport();
initSampleButtons();
renderAll();
initSupabaseForm();
renderSupabase();
