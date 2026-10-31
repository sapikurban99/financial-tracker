// charts.js — inline SVG charts, no external library and no CDN.
// All values come from local transactions, so the charts work offline.
const CHART_COLORS = [
  "#0f766e", "#2563eb", "#d97706", "#b91c1c", "#7c3aed",
  "#15803d", "#be185d", "#0891b2", "#65a30d", "#ea580c",
];

function escapeXml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Grouped bar chart: income (green) vs expense (red) for the last 12 months.
// The end month is the latest transaction month, or the current month when
// there is no transaction yet, so the chart never shows an empty future.
function monthlyTrendSVG(transactions) {
  const months = transactions.length
    ? lastMonths(12, transactions.map((t) => monthOf(t.date)).filter(Boolean).sort().pop())
    : lastMonths(12, monthKeyFromDate(new Date()));
  const rows = months.map((month) => {
    const list = transactions.filter((tx) => monthOf(tx.date) === month);
    return { month, inAmount: sumByDirection(list, "in"), outAmount: sumByDirection(list, "out") };
  });
  const max = Math.max(1, ...rows.flatMap((r) => [r.inAmount, r.outAmount]));
  const width = 760, height = 280, top = 18, bottom = 34, left = 8, right = 8;
  const plotHeight = height - top - bottom;
  const groupWidth = (width - left - right) / rows.length;
  const barWidth = Math.max(6, Math.min(22, groupWidth * 0.28));
  let bars = "";
  rows.forEach((row, i) => {
    const x = left + i * groupWidth + groupWidth / 2;
    const inH = (row.inAmount / max) * plotHeight;
    const outH = (row.outAmount / max) * plotHeight;
    bars += '<rect x="' + (x - barWidth - 2) + '" y="' + (top + plotHeight - inH) + '" width="' + barWidth + '" height="' + inH + '" fill="#15803d" rx="3"><title>' + escapeXml(shortMonthLabel(row.month) + " masuk: " + fmtRp(row.inAmount)) + "</title></rect>";
    bars += '<rect x="' + (x + 2) + '" y="' + (top + plotHeight - outH) + '" width="' + barWidth + '" height="' + outH + '" fill="#b91c1c" rx="3"><title>' + escapeXml(shortMonthLabel(row.month) + " keluar: " + fmtRp(row.outAmount)) + "</title></rect>";
    bars += '<text x="' + x + '" y="' + (height - 10) + '" text-anchor="middle" font-size="11" fill="currentColor">' + escapeXml(shortMonthLabel(row.month)) + "</text>";
  });
  return '<svg viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="Tren masuk dan keluar 12 bulan terakhir">' + bars + "</svg>";
}

// Donut chart from [{label, amount}]. Returns "" when there is nothing to show.
function categoryDonutSVG(entries) {
  const total = entries.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  if (!total || !entries.length) return "";
  const width = 320, height = 240, cx = 110, cy = 120, r = 82;
  if (entries.length === 1) {
    return '<svg viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="Kategori pengeluaran"><circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + CHART_COLORS[0] + '" /><text x="' + cx + '" y="' + (cy - 4) + '" text-anchor="middle" font-size="13" font-weight="700" fill="#fff">' + escapeXml(entries[0].label) + '</text><text x="' + cx + '" y="' + (cy + 16) + '" text-anchor="middle" font-size="12" fill="#fff">100%</text></svg>';
  }
  let angle = -90;
  let slices = "";
  entries.forEach((entry, i) => {
    const fraction = (Number(entry.amount) || 0) / total;
    const sweep = fraction * 360;
    const start = (angle * Math.PI) / 180;
    const end = ((angle + sweep) * Math.PI) / 180;
    const large = sweep > 180 ? 1 : 0;
    const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end);
    slices += '<path d="M ' + cx + " " + cy + " L " + x1.toFixed(1) + " " + y1.toFixed(1) + " A " + r + " " + r + " 0 " + large + " 1 " + x2.toFixed(1) + " " + y2.toFixed(1) + ' Z" fill="' + CHART_COLORS[i % CHART_COLORS.length] + '"><title>' + escapeXml(entry.label + ": " + fmtRp(entry.amount) + " (" + Math.round(fraction * 100) + "%)") + "</title></path>";
    angle += sweep;
  });
  // Legend is rendered in HTML next to the chart (see finance.js), so the
  // SVG itself only needs the donut and the total in the middle.
  return '<svg viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="Kategori pengeluaran"><g>' + slices + '</g><circle cx="' + cx + '" cy="' + cy + '" r="46" fill="var(--surface)" /><text x="' + cx + '" y="' + (cy - 2) + '" text-anchor="middle" font-size="12" fill="currentColor">Total</text><text x="' + cx + '" y="' + (cy + 18) + '" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">' + escapeXml(fmtRp(total)) + "</text></svg>";
}

function categoryColor(index) {
  return CHART_COLORS[index % CHART_COLORS.length];
}
