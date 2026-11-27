// Moduł znaczków (moduly/znacznik) – JEDEN wzór małych wskaźników w całej apce (Grzegorz 04/11/2026):
//   • licznik  – kropka z liczbą w rogu (dzwonek, kafelek, aparat przy punkcie, dzień w kalendarzu),
//   • lampka   – kolorowa kropka stanu (CSS dla .hm-st .l),
//   • formularz – ikonka zdjęcia formularza przy inspekcji.
// Zmiana wyglądu tutaj = zmiana na wszystkich ekranach. Starsze nazwy klas (hm-badge, kf-n, fl-ic b, .cd i,
// hm-st .l, pasek wysyłki .n i) są podpięte pod ten sam wzór, więc nic nie wygląda inaczej.
//
//   OESTZnacznik.licznik(3, "red"|"orange"|"accent"|"dashed"|"inline")  → '<span class="oest-n">3</span>' (0 = nic)
//   OESTZnacznik.formularz("brak"|"ok"|"blad")                    → zdjęcie formularza (Grzegorz 04/11): szary dokument
//        (inspekcja nie zaczęta) / zielone ✓ w kółku (zdjęcie formularza dodane) / czerwone ✗ w kółku (jeszcze brak)
// Pigułka statusu: moduly/szkielet/src/czesci/Pigulka.vue (jedna w całej apce). Dawne lampka / ikona / status
// (HTML z kodu) usunięte 27/11/2026 – status był drugą kopią pigułki, lampki i ikony nikt już nie wołał.
(function (w, d) {
  "use strict";
  if (w.OESTZnacznik) return;
  var esc = w.OESTNarzedzia.esc; // moduly/narzedzia (audyt nr 53)
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
    ".oest-l,.hm-st .l{display:inline-block;flex:none;width:8px;height:8px;border-radius:50%;background:var(--na,#8a93a3);transition:background .3s,box-shadow .3s}" +
    ":is(.oest-l,.hm-st .l).on{background:var(--ok,#3ddc84);box-shadow:0 0 6px var(--ok,#3ddc84)}" +
    ":is(.oest-l,.hm-st .l).mid{background:var(--warn,#ffd23f);box-shadow:0 0 6px var(--warn,#ffd23f)}" +
    ":is(.oest-l,.hm-st .l).off{background:var(--bad,#ff4d5e);box-shadow:0 0 6px var(--bad,#ff4d5e)}" +
    // ikonka zdjęcia formularza
    ".oest-rp.brak{opacity:.55}" +
    ".oest-rp{display:inline-grid;place-items:center;flex:none;line-height:0}.oest-rp svg{width:19px;height:19px;fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}" +
    ".oest-rp.brak svg{stroke:#9097a6}.oest-rp.ok svg{stroke:#21c45a}.oest-rp.blad svg{stroke:#ef3b36}" +
    ".oest-rp svg{animation:var(--ruch-znacznik-efekt,oest-n-in) var(--ruch-znacznik-czas,.28s) var(--ruch-znacznik-easing,cubic-bezier(.34,1.56,.64,1)) both}" +
    // mniej ruchu: także ikonki formularza (.oest-rp) – wcześniej pominięte (07/11/2026)
    "@media (prefers-reduced-motion:reduce){:is(" + N + ",.oest-rp svg){animation:none}}:root[data-settings-motion=reduce] :is(" + N + ",.oest-rp svg){animation:none}";
  function css() {
    if (d.getElementById("oest-znacznik-css")) return;
    var s = d.createElement("style"); s.id = "oest-znacznik-css"; s.textContent = CSS; (d.head || d.documentElement).appendChild(s);
  }
  function licznik(n, kind) { css(); return n ? '<span class="oest-n' + (kind ? " " + esc(kind) : "") + '">' + esc(n > 99 ? "99+" : n) + "</span>" : ""; }
  var FORM = {
    brak: '<path d="M7 3h7.5L19 7.5V19a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z"/><path d="M8.5 10.5h6.5M8.5 14.5h5"/>',
    ok: '<circle cx="12" cy="12" r="9"/><path d="M8 12.3l2.8 3L16.2 9"/>',
    blad: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>'
  };
  var FORM_TXT = { brak: ["Zdjęcie formularza", "Form photo"], ok: ["Zdjęcie formularza dodane", "Form photo added"], blad: ["Brak zdjęcia formularza", "No form photo yet"] };
  function formularz(state) {
    css(); state = FORM[state] ? state : "brak"; var t = w.OESTT(FORM_TXT[state][0], FORM_TXT[state][1]);
    return '<span class="oest-rp ' + state + '" role="img" aria-label="' + esc(t) + '" title="' + esc(t) + '"><svg viewBox="0 0 24 24">' + FORM[state] + "</svg></span>";
  }
  css();
  w.OESTZnacznik = { licznik: licznik, formularz: formularz, css: css };
})(window, document);
