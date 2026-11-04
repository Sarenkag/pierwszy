// Moduł znaczków (moduly/znacznik) – JEDEN wzór małych wskaźników w całej apce (Grzegorz 04/11/2026):
//   • licznik  – kropka z liczbą w rogu (dzwonek, kafelek, aparat przy punkcie, dzień w kalendarzu),
//   • lampka   – kolorowa kropka stanu (Wi‑Fi, Dysk, wysyłka, termin): on / mid / off / na,
//   • ikonka z liczbą – np. 📷 3, ⚠ 1, ✓ 12 (stopka klocka, nagłówek zdjęć).
// Zmiana wyglądu tutaj = zmiana na wszystkich ekranach. Starsze nazwy klas (hm-badge, kf-n, fl-ic b, .cd i,
// hm-st .l, pasek wysyłki .n i) są podpięte pod ten sam wzór, więc nic nie wygląda inaczej.
//
//   OESTZnacznik.licznik(3, "red"|"orange"|"accent"|"dashed")  → '<span class="oest-n">3</span>' (0 = nic)
//   OESTZnacznik.lampka("on"|"mid"|"off"|"na")                  → '<i class="oest-l on"></i>'
//   OESTZnacznik.ikona("📷", 3, tone)                            → '<span class="oest-ic">📷 3</span>'
(function (w, d) {
  "use strict";
  if (w.OESTZnacznik) return;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var N = ".oest-n,.hm-badge,.kf-n,.fl-ic b,.cd i";
  var CSS =
    // licznik
    ":is(" + N + "){position:absolute;top:-6px;right:-6px;min-width:18px;height:18px;padding:0 5px;box-sizing:border-box;border-radius:9px;" +
    "background:#ff4d5e;color:#fff;font:800 11px/18px var(--font-body,system-ui);font-style:normal;text-align:center;letter-spacing:0;" +
    "box-shadow:0 2px 6px rgba(0,0,0,.4),0 0 0 2px rgba(10,14,31,.9);display:block;animation:oest-n-in .28s cubic-bezier(.34,1.56,.64,1) both}" +
    ".kf .kf-n{top:8px;right:8px}" +
    ".cd i{top:auto;bottom:3px;right:3px;min-width:16px;height:16px;line-height:16px;font-size:10px;box-shadow:none}" +
    ":is(.oest-n.orange,.cd i){background:#ff8a3d;color:#1a0d00}" +
    ":is(.oest-n.dashed,.cd i.pl){background:transparent;border:1.5px dashed #ff8a3d;color:#ff8a3d;line-height:13px}" +
    ".oest-n.accent,.fl-ic b{background:var(--grad,linear-gradient(90deg,#5b7cff,#a35bff));color:#fff}" +
    ".oest-n.inline{position:static;display:inline-block;vertical-align:1px;margin-left:4px;box-shadow:none}" +
    "@keyframes oest-n-in{from{transform:scale(0)}to{transform:scale(1)}}" +
    // lampka
    ".oest-l,.hm-st .l,.oest-sbar .n i{display:inline-block;flex:none;width:8px;height:8px;border-radius:50%;background:var(--na,#8a93a3);transition:background .3s,box-shadow .3s}" +
    ":is(.oest-l,.hm-st .l).on,.oest-sbar .n i{background:var(--ok,#3ddc84);box-shadow:0 0 6px var(--ok,#3ddc84)}" +
    ":is(.oest-l,.hm-st .l).mid,.oest-sbar .n.mid i{background:var(--warn,#ffd23f);box-shadow:0 0 6px var(--warn,#ffd23f)}" +
    ":is(.oest-l,.hm-st .l).off,.oest-sbar .n.off i{background:var(--bad,#ff4d5e);box-shadow:0 0 6px var(--bad,#ff4d5e)}" +
    // ikonka z liczbą
    ".oest-ic{display:inline-flex;align-items:center;gap:3px;flex:none;font-size:12px;font-weight:700;color:var(--muted,#9aa3cc);white-space:nowrap}" +
    ".oest-ic.t2{color:#5fd6a0}.oest-ic.t3{color:#ff7b72}.oest-ic.t1{color:#f0c75e}.oest-ic.t4{color:#79b8ff}" +
    "@media (prefers-reduced-motion:reduce){:is(" + N + "){animation:none}}:root[data-settings-motion=reduce] :is(" + N + "){animation:none}";
  function css() {
    if (d.getElementById("oest-znacznik-css")) return;
    var s = d.createElement("style"); s.id = "oest-znacznik-css"; s.textContent = CSS; (d.head || d.documentElement).appendChild(s);
  }
  function licznik(n, kind) { css(); return n ? '<span class="oest-n' + (kind ? " " + esc(kind) : "") + '">' + esc(n > 99 ? "99+" : n) + "</span>" : ""; }
  function lampka(state) { css(); return '<i class="oest-l ' + esc(state || "na") + '" aria-hidden="true"></i>'; }
  function ikona(icon, n, tone) { css(); return '<span class="oest-ic' + (tone ? " t" + tone : "") + '"><span aria-hidden="true">' + esc(icon) + "</span>" + esc(n) + "</span>"; }
  css();
  w.OESTZnacznik = { licznik: licznik, lampka: lampka, ikona: ikona, css: css };
})(window, document);
