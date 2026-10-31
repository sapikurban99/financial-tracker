// ui.js — theme, navigation, toasts, and confirm dialogs.
// No business logic lives here; render functions live in their own files.
const THEME_KEY = "financial-tracker-theme";
let theme = "light";

function applyTheme(next) {
  theme = next === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (e) {
    // Theme still applies for this session even if storage is unavailable.
  }
  const btn = el("theme-toggle");
  if (btn) btn.textContent = theme === "dark" ? "Mode Terang" : "Mode Gelap";
}

function initTheme() {
  let saved = "light";
  try {
    saved = localStorage.getItem(THEME_KEY) || "light";
  } catch (e) {
    saved = "light";
  }
  applyTheme(saved);
  el("theme-toggle").addEventListener("click", () => {
    applyTheme(theme === "dark" ? "light" : "dark");
  });
}

function showView(name) {
  document.querySelectorAll(".tabs button").forEach((b) => {
    b.classList.toggle("active", b.dataset.view === name);
  });
  document.querySelectorAll(".view").forEach((v) => {
    v.classList.toggle("active", v.id === "view-" + name);
  });
}

function initNavigation() {
  document.querySelectorAll(".tabs button").forEach((btn) => {
    btn.addEventListener("click", () => showView(btn.dataset.view));
  });
}

function showToast(message, type) {
  const container = el("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = "toast" + (type ? " " + type : "");
  toast.textContent = message;
  container.appendChild(toast);
  window.setTimeout(() => toast.remove(), 4200);
}

// A real dialog, not window.confirm, so destructive actions are explicit
// and the message is readable on mobile too. Resolves true on confirm.
function confirmDialog(message) {
  return new Promise((resolve) => {
    const backdrop = el("confirm-backdrop");
    const msg = el("confirm-message");
    const ok = el("confirm-ok-btn");
    const cancel = el("confirm-cancel-btn");
    msg.textContent = message;
    backdrop.hidden = false;
    const finish = (value) => {
      backdrop.hidden = true;
      ok.removeEventListener("click", onOk);
      cancel.removeEventListener("click", onCancel);
      backdrop.removeEventListener("click", onBackdrop);
      resolve(value);
    };
    const onOk = () => finish(true);
    const onCancel = () => finish(false);
    const onBackdrop = (e) => {
      if (e.target === backdrop) finish(false);
    };
    ok.addEventListener("click", onOk);
    cancel.addEventListener("click", onCancel);
    backdrop.addEventListener("click", onBackdrop);
  });
}

function setSelectOptions(select, values, keepFirst) {
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

function directionLabel(direction) {
  if (direction === "in") return "Masuk";
  if (direction === "out") return "Keluar";
  return "Transfer";
}

function directionClass(direction) {
  if (direction === "in") return "amount-in";
  if (direction === "out") return "amount-out";
  return "amount-transfer";
}

function transferLabel(tx) {
  if (tx.direction !== "transfer") return "";
  return tx.toWallet ? tx.wallet + " → " + tx.toWallet : tx.wallet + " → (tujuan tidak tercatat)";
}
