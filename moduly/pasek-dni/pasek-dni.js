// Moduł paska dni (moduly/pasek-dni) – JEDEN pasek dni dla całej apki (Grzegorz 07/11/2026):
// ekran główny i lista Inspekcji wyglądają i liczą tak samo. Dzień pracy z grafiku = ten sam fioletowy
// gradient co dzień pracy w kalendarzu miesiąca (.cd.sh), dni wolne NIE są przygaszone (przygaszony = miniony).
// Każdy kafelek ma zawsze 4 rzędy (dzień tygodnia, numer, pogoda, licznik), więc pasek nie skacze.
// Moduł nie zna apki: grafik, liczniki i pogodę podaje ekran (adaptery w opts).
//
//   OESTPasekDni.html({
//     start: Date, days: 14, today: Date,           // pierwszy dzień paska, ile dni, dzisiejsza data
//     todayLabel: "Dziś", dayName: function (0..6),  // podpisy z ekranu (PL/EN)
//     selected: "2026-11-10",                        // wybrany dzień (lista Inspekcji), "" = brak
//     isWork: function (iso) → true/false,           // dzień pracy z grafiku (brak grafiku = false)
//     counter: function (iso) → { done, all } | null,// zrobione/wszystkie na ten dzień
//     icon: function (iso) → "☀" | ""               // pogoda (tekst, moduł go escapuje)
//   }) → '<button class="day pd-day …" data-day="2026-11-07">…</button>…'
//   OESTPasekDni.iso(Date) → "RRRR-MM-DD"
(function (w, d) {
  "use strict";
  if (w.OESTPasekDni) return;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function iso(x) { return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0"); }
  var CSS =
    // ten sam odstęp wokół paska na każdym ekranie (poświata „dziś” nie jest ucinana)
    ".days:has(>.pd-day){padding:2px}" +
    ".pd-day{flex:none;width:50px!important;padding:7px 0 5px!important;text-align:center}" +
    ".pd-day small{display:block;font-size:.72rem;text-transform:uppercase}" +
    ".pd-day b{display:block;font-size:1.1rem}" +
    ".pd-day em{display:block;font-style:normal;font-size:.8rem;height:1.2em;line-height:1.2em}" +
    ".pd-day i{display:block;min-width:26px;width:max-content;box-sizing:border-box;padding:0 4px;margin:3px auto 0;border-radius:7px;" +
    "background:rgba(255,255,255,.1);font-style:normal;font-size:.72rem!important;font-weight:700;height:1.45em;line-height:1.45em;color:var(--muted)}" +
    ".pd-day.past{opacity:.4}" +
    // dzień pracy: gradient jak .cd.sh w kalendarzu miesiąca (theme.css), bez nowych kolorów
    ".days .pd-day.sh{background:linear-gradient(135deg,rgba(91,124,255,.35),rgba(163,91,255,.35))!important;border-color:rgba(160,150,255,.45)!important}" +
    // dziś: obwódka akcentu z poświatą (jak dotąd na ekranie głównym); wybrany dzień: dodatkowo biała ramka (jak .cd.on)
    ".days .pd-day.today{border-color:var(--accent)!important;box-shadow:0 0 12px rgba(124,132,255,.5)}" +
    ".days .pd-day.on{border-color:#fff!important;box-shadow:0 0 14px rgba(124,132,255,.7)}";
  function css() {
    if (!d || d.getElementById("oest-pasek-dni-css")) return;
    var s = d.createElement("style"); s.id = "oest-pasek-dni-css"; s.textContent = CSS;
    (d.head || d.documentElement).appendChild(s);
  }
  function html(o) {
    css();
    var t = new Date(o.today.getFullYear(), o.today.getMonth(), o.today.getDate()), k0 = iso(t), h = "";
    for (var i = 0; i < (o.days || 14); i++) {
      var x = new Date(o.start.getFullYear(), o.start.getMonth(), o.start.getDate() + i), k = iso(x);
      var c = o.counter ? o.counter(k) : null, all = c ? c.all || 0 : 0, ic = o.icon ? o.icon(k) : "";
      var cls = "day pd-day" + (k === k0 ? " today" : "") + (k < k0 ? " past" : "") + (o.isWork && o.isWork(k) ? " sh" : "") + (o.selected === k ? " on" : "");
      h += '<button class="' + cls + '" type="button" data-day="' + k + '"><small>' + esc(k === k0 ? o.todayLabel : o.dayName(x.getDay())) + "</small><b>" + x.getDate() + "</b>" +
        "<em>" + esc(ic || "") + '</em><i class="' + (all ? "n" : "") + '">' + (all ? (c.done || 0) + "/" + all : "–") + "</i></button>";
    }
    return h;
  }
  w.OESTPasekDni = { html: html, iso: iso };
})(window, window.document);
