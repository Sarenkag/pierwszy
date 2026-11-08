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
//   OESTZnacznik.ikona("zdjecia"|"punkty"|"usterki"|"termin", "4", "off")  → ta sama ikonka liniowa (SVG) z liczbą; "off" = szara (niewymagane)
//   OESTZnacznik.formularz("brak"|"ok"|"blad")                    → zdjęcie formularza (Grzegorz 04/11): szary dokument
//        (inspekcja nie zaczęta) / zielone ✓ w kółku (zdjęcie formularza dodane) / czerwone ✗ w kółku (jeszcze brak)
//   OESTZnacznik.status("zalegla"|"nierozpoczeta"|"wtrakcie"|"wstrzymana"|"gotowa"|"odzyskana")  → pigułka statusu (Grzegorz 07/11/2026 18:29):
//        JEDEN wygląd – ten sam kształt, wielkość (98 px), zaokrąglenie, wypełnienie i cień 3D; różni się tylko kolor i napis.
//        Napisy PL/EN wbudowane (Nie rozpoczęta = pauzy „– – – –”). Szerokość dobrana do najdłuższego napisu („Wstrzymana”).
//        „Odzyskana” (fioletowa, Grzegorz 08/11/2026 12:55): inspekcja odzyskana z raportu – tylko w klocku Raporty.
//        Wzór i wartości: moduly/znacznik/README.md. Pilnuje test app/tests/pigulka-statusu-ui-check.cjs.
(function (w, d) {
  "use strict";
  if (w.OESTZnacznik) return;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var N = ".oest-n,.hm-badge,.kf-n,.fl-ic b,.cd i";
  var CSS =
    // licznik
    ":is(" + N + "){position:absolute;top:-6px;right:-6px;min-width:18px;height:18px;padding:0 5px;box-sizing:border-box;border-radius:9px;" +
    "background:#ff4d5e;color:#fff;font:800 11px/18px var(--font-body,system-ui);font-style:normal;text-align:center;letter-spacing:0;" +
    "box-shadow:0 2px 6px rgba(0,0,0,.4),0 0 0 2px rgba(10,14,31,.9);display:block;animation:var(--ruch-znacznik-efekt,oest-n-in) var(--ruch-znacznik-czas,.28s) var(--ruch-znacznik-easing,cubic-bezier(.34,1.56,.64,1)) both}" + // ruch z tabeli (moduly/wyglad, rola „znacznik”)
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
    ".oest-ic svg{width:17px;height:17px;flex:none;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}" +
    ".oest-ic.zdjecia svg{color:#3ccfe8}.oest-ic.punkty svg{color:#3ddc84}.oest-ic.usterki svg{color:#ff7b72}.oest-ic.termin svg{color:var(--muted,#9aa3cc)}" +
    ".oest-ic.zdjecia,.oest-ic.punkty,.oest-ic.usterki{color:var(--ink,#eef1ff);font-size:13px}" +
    // niewymagane w tej inspekcji: cała ikonka szara i przygaszona
    ".oest-ic.toff,.oest-ic.toff svg{color:#8a909c!important;opacity:.55}" +
    ".oest-rp.brak{opacity:.55}" +
    ".oest-rp{display:inline-grid;place-items:center;flex:none;line-height:0}.oest-rp svg{width:19px;height:19px;fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}" +
    ".oest-rp.brak svg{stroke:#9097a6}.oest-rp.ok svg{stroke:#21c45a}.oest-rp.blad svg{stroke:#ef3b36}" +
    ".oest-rp svg{animation:var(--ruch-znacznik-efekt,oest-n-in) var(--ruch-znacznik-czas,.28s) var(--ruch-znacznik-easing,cubic-bezier(.34,1.56,.64,1)) both}" +
    ".oest-ic.t2{color:#5fd6a0}.oest-ic.t3{color:#ff7b72}.oest-ic.t1{color:#f0c75e}.oest-ic.t4{color:#79b8ff}" +
    // pigułka statusu (07/11/2026): wszystko poza kolorem jest wspólne; kolor = currentColor z klasy trybu
    ".oest-st{display:inline-block;flex:none;box-sizing:border-box;width:var(--oest-st-w,98px);padding:5px 6px;border-radius:999px;border:1px solid currentColor;" +
    "background:color-mix(in srgb,currentColor 16%,transparent);font:700 12px/1 var(--font-body,system-ui);letter-spacing:0;text-align:center;white-space:nowrap;overflow:hidden;" +
    "box-shadow:inset 0 1px 0 rgba(255,255,255,.28),inset 0 -2px 0 rgba(0,0,0,.35),0 3px 6px rgba(0,0,0,.45);text-shadow:0 1px 1px rgba(0,0,0,.4)}" +
    ".oest-st.zalegla{color:#ef3b36}.oest-st.nierozpoczeta{color:#c3c9e8}.oest-st.wtrakcie{color:#f0c75e}.oest-st.wstrzymana{color:#79b8ff}.oest-st.gotowa{color:#00d84a}.oest-st.odzyskana{color:#a35bff}" +
    // mniej ruchu: także ikonki formularza (.oest-rp) – wcześniej pominięte (07/11/2026)
    "@media (prefers-reduced-motion:reduce){:is(" + N + ",.oest-rp svg){animation:none}}:root[data-settings-motion=reduce] :is(" + N + ",.oest-rp svg){animation:none}";
  function css() {
    if (d.getElementById("oest-znacznik-css")) return;
    var s = d.createElement("style"); s.id = "oest-znacznik-css"; s.textContent = CSS; (d.head || d.documentElement).appendChild(s);
  }
  function licznik(n, kind) { css(); return n ? '<span class="oest-n' + (kind ? " " + esc(kind) : "") + '">' + esc(n > 99 ? "99+" : n) + "</span>" : ""; }
  function lampka(state) { css(); return '<i class="oest-l ' + esc(state || "na") + '" aria-hidden="true"></i>'; }
  // ikonki liniowe – jeden zestaw dla wszystkich klocków i nagłówków
  var SVG = {
    zdjecia: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="M4 18l5-5 4 4 3-3 4 4"/>',
    punkty: '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M8 12.5l3 3 5.5-6.5"/>',
    usterki: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17.2v.1"/>',
    termin: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'
  };
  var FORM = {
    brak: '<path d="M7 3h7.5L19 7.5V19a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z"/><path d="M8.5 10.5h6.5M8.5 14.5h5"/>',
    ok: '<circle cx="12" cy="12" r="9"/><path d="M8 12.3l2.8 3L16.2 9"/>',
    blad: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>'
  };
  function T(pl, en) { return w.OESTT ? w.OESTT(pl, en) : pl; }
  var FORM_TXT = { brak: ["Zdjęcie formularza", "Form photo"], ok: ["Zdjęcie formularza dodane", "Form photo added"], blad: ["Brak zdjęcia formularza", "No form photo yet"] };
  function ikona(icon, n, tone) {
    css();
    var svg = SVG[icon];
    return '<span class="oest-ic' + (svg ? " " + icon : "") + (tone ? " t" + tone : "") + '">' + (svg ? '<svg viewBox="0 0 24 24" aria-hidden="true">' + svg + "</svg>" : '<span aria-hidden="true">' + esc(icon) + "</span>") + esc(n) + "</span>";
  }
  function formularz(state) {
    css(); state = FORM[state] ? state : "brak"; var t = T(FORM_TXT[state][0], FORM_TXT[state][1]);
    return '<span class="oest-rp ' + state + '" role="img" aria-label="' + esc(t) + '" title="' + esc(t) + '"><svg viewBox="0 0 24 24">' + FORM[state] + "</svg></span>";
  }
  // pigułka statusu: tryb → napis PL/EN (kolor w CSS powyżej)
  var STATUS = { zalegla: ["Zaległa", "Overdue"], nierozpoczeta: ["– – – –", "– – – –"], wtrakcie: ["W trakcie", "In progress"], wstrzymana: ["Wstrzymana", "On hold"], gotowa: ["Gotowa", "Ready"], odzyskana: ["Odzyskana", "Recovered"] };
  var STATUS_OPIS = { nierozpoczeta: ["Nie rozpoczęta", "Not started"] };
  function status(tryb) {
    css(); tryb = STATUS[tryb] ? tryb : "nierozpoczeta";
    var o = STATUS_OPIS[tryb] || STATUS[tryb], opis = T(o[0], o[1]);
    return '<span class="oest-st ' + tryb + '" role="img" aria-label="' + esc(opis) + '" title="' + esc(opis) + '">' + esc(T(STATUS[tryb][0], STATUS[tryb][1])) + "</span>";
  }
  status.tryby = Object.keys(STATUS);
  css();
  w.OESTZnacznik = { licznik: licznik, lampka: lampka, ikona: ikona, formularz: formularz, status: status, css: css };
})(window, document);
