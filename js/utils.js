// utils.js — small, pure helpers. No DOM state is created here.
// Loaded first, so every later script can use these globals.
function el(id) {
  return document.getElementById(id);
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

function fmtMonthLabel(monthStart) {
  if (!monthStart) return "-";
  const d = new Date(String(monthStart).slice(0, 10) + "T00:00:00");
  if (Number.isNaN(d.getTime())) return String(monthStart);
  return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
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

function daysInMonth(month) {
  if (!month) return 30;
  const parts = month.split("-").map(Number);
  return new Date(parts[0], parts[1], 0).getDate();
}

// Month key helpers, e.g. "2026-01". Used by the 12-month trend chart.
function monthKeyFromDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return y + "-" + m;
}

function lastMonths(count, endMonth) {
  const end = endMonth
    ? new Date(Number(endMonth.slice(0, 4)), Number(endMonth.slice(5, 7)) - 1, 1)
    : new Date();
  const out = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
    out.push(monthKeyFromDate(d));
  }
  return out;
}

function shortMonthLabel(monthKey) {
  const d = new Date(Number(monthKey.slice(0, 4)), Number(monthKey.slice(5, 7)) - 1, 1);
  return d.toLocaleDateString("id-ID", { month: "short" });
}

function setText(id, text) {
  const node = el(id);
  if (node) node.textContent = text;
}

function emptyState(title, detail) {
  const div = document.createElement("div");
  div.className = "empty";
  const strong = document.createElement("strong");
  strong.textContent = title;
  div.appendChild(strong);
  if (detail) {
    const p = document.createElement("p");
    p.textContent = detail;
    p.style.margin = "0";
    div.appendChild(p);
  }
  return div;
}

function downloadFile(filename, text, mime) {
  const blob = new Blob([text], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function uniqueId(prefix) {
  return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
}
