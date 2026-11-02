// Weekly Flushing (TA / TB / P): wypełnianie wspólnego wzoru Word (tpl-flush.js) — czyste funkcje, bez DOM.
// Tydzień miesiąca wybiera inżynier (apka nie liczy go z daty, Grzegorz 02/11/2026).
(function (root) {
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var LABEL = { yes: "Yes", no: "No", na: "N/A" };
  var GREEN = "92D050";
  function x(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  // d: { noDate (Date odznaczone), building: "A"|"B"|"Pavilion", year, month (0–11), week (1–5), date: Date, name, taps: [{ name, state, note }] }
  function fill(xml, d) {
    var parts = xml.split("<!--ROW-->");
    if (parts.length !== 3) throw Error("FLUSH_TPL");
    var dateTxt = d.noDate ? "" : pad(d.date.getDate()) + "." + pad(d.date.getMonth() + 1) + "." + d.date.getFullYear(); // „Date” odznaczone w nagłówku → puste
    var rows = d.taps.map(function (t) {
      var v = { o: t.name, c11: d.name, c12: t.note || "" };
      v["c" + (2 * d.week - 1)] = LABEL[t.state] || "";
      v["c" + 2 * d.week] = t.state === "na" ? "" : dateTxt;
      return parts[1].replace(/\{(o|c\d+)\}/g, function (_, k) { return x(v[k] || ""); });
    }).join("");
    var out = parts[0] + rows + parts[2];
    for (var i = 0; i < 6; i++) {
      out = out.split("{y" + i + "}").join(String(d.year + i)).split("{yf" + i + "}").join(i === 0 ? GREEN : "auto");
    }
    for (var m = 11; m >= 0; m--) out = out.split("{mf" + m + "}").join(m === d.month ? GREEN : "auto");
    return out;
  }
  function header(xml, building) { var tower = building.length === 1; return tower ? xml.split("{twr}").join("TOWER").split("{bld}").join(x(building)) : xml.split("{twr}").join(x(building.toUpperCase())).split(" {bld}").join("").split("{bld}").join(""); }
  function summary(d) {
    var no = d.taps.filter(function (t) { return t.state === "no"; }).length, na = d.taps.filter(function (t) { return t.state === "na"; }).length;
    return no ? no + " outlet(s) not flushed – record in the Fault and Remedial Actions Log" : "All outlets flushed" + (na ? " (" + na + " N/A)" : "");
  }
  var api = { fill: fill, header: header, summary: summary, MONTHS: MONTHS, LABEL: LABEL };
  if (typeof module === "object" && module.exports) module.exports = api; else root.OESTFlush = api;
})(this);
