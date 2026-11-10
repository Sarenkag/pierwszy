// Sprawdzanie Vantify przy starcie apki i po powrocie do niej (Grzegorz 10/11/2026: „Zacznij od automatycznego updatu”).
// Najwyżej co 4 h pyta Vantify po cichu (VantifyPlugin.sync przez OESTVantifyImport.sync). Nic nie zapisuje samo:
//  - nowe albo zamknięte zlecenia → okienko „Pokazać?” → Ustawienia → Vantify z podglądem (zapis po „Zapisz”),
//  - wygasłe logowanie (24 h) → okienko „Zalogować się?” najwyżej raz na dobę,
//  - brak sieci, błąd, brak zmian → cisza.
// Ładowany na końcu głównej strony apki (po moduly/przycisk – okienka), nie na stronie inspekcji.
(function (w) {
  var EVERY = 4 * 3600e3, ASK_LOGIN = 24 * 3600e3;
  function lang() { return (document.documentElement.lang || "pl").slice(0, 2) === "en" ? "en" : "pl"; }
  function L(pl, en) { return lang() === "en" ? en : pl; }
  function native() { var C = w.Capacitor, P = C && C.Plugins && C.Plugins.Vantify; return !!(C && C.isNativePlatform && C.isNativePlatform() && P && P.sync); }
  function ask(o) { var P = w.OESTPrzycisk; return P && P.ask ? P.ask(o) : Promise.resolve(false); }
  function auto() {
    var V = w.OESTVantifyImport; if (!V || !native()) return;
    var st = V.state(), now = Date.now();
    if (st.at && now - st.at < EVERY && now >= st.at) return;
    st.at = now; V.state(st);
    return V.sync().then(function (r) {
      if (r.status === "ok") {
        var pv; try { pv = V.apiPreview(r); } catch (e) { return; }
        var n = pv.changes.added.length, c = pv.changes.closed.length;
        if (!n && !c) { V.keepNew(null); return; }
        V.keepNew(r);
        return ask({ title: "Vantify", text: L("Są nowe terminy PPM z Vantify: nowe zlecenia ", "New PPM due dates from Vantify: new jobs ") + n + L(", zamknięte ", ", closed ") + c + L(". Pokazać przed zapisem?", ". Show them before saving?"), ok: L("Pokaż", "Show"), cancel: L("Później", "Later") })
          .then(function (yes) { if (yes) V.go("nowe"); });
      }
      if (r.status === "login") {
        var s2 = V.state(); if (s2.askedLogin && now - s2.askedLogin < ASK_LOGIN && now >= s2.askedLogin) return;
        s2.askedLogin = now; V.state(s2);
        return ask({ title: "Vantify", text: L("Logowanie do Vantify wygasło (trwa 24 h). Zalogować się teraz, żeby apka pobrała nowe terminy?", "Your Vantify sign-in has expired (it lasts 24 h). Sign in now so the app can get new due dates?"), ok: L("Zaloguj", "Sign in"), cancel: L("Później", "Later") })
          .then(function (yes) { if (yes) V.go("login"); });
      }
    }).catch(function () {});
  }
  setTimeout(auto, 4000);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") auto(); });
  w.OESTVantifyAuto = { check: auto };
})(window);
