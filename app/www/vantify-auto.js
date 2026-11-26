// Sprawdzanie Vantify przy starcie apki i po powrocie do niej (Grzegorz 10/11/2026: „Zacznij od automatycznego updatu”).
// Najwyżej co 4 h pyta Vantify po cichu (VantifyPlugin.sync przez OESTVantifyImport.sync):
//  - lista pobrana → plan zapisuje się od razu, po cichu (Grzegorz 26/11/2026: „Od razu zapis, jedna karta”);
//    zmiany widać na karcie w Ustawienia → Vantify,
//  - wygasłe logowanie (24 h): z zapisanym loginem i hasłem okno Vantify loguje się samo (VantifyLogin); bez nich albo gdy
//    Vantify odrzuci hasło → okienko najwyżej raz na dobę,
//  - brak sieci, błąd, brak zmian → cisza.
// Ładowany na końcu głównej strony apki (po moduly/przycisk – okienka), nie na stronie inspekcji.
(function (w) {
  var EVERY = 4 * 3600e3, ASK_LOGIN = 24 * 3600e3;
  function lang() { return (document.documentElement.lang || "pl").slice(0, 2) === "en" ? "en" : "pl"; }
  function L(pl, en) { return w.OESTT(pl, en); }
  function native() { var C = w.Capacitor, P = C && C.Plugins && C.Plugins.Vantify; return !!(C && C.isNativePlatform && C.isNativePlatform() && P && P.sync); }
  function ask(o) { var P = w.OESTPrzycisk; return P && P.ask ? P.ask(o) : Promise.resolve(false); }
  function auto() {
    var V = w.OESTVantifyImport; if (!V || !native()) return;
    var st = V.state(), now = Date.now();
    if (st.at && now - st.at < EVERY && now >= st.at) return;
    st.at = now; V.state(st);
    return V.sync().then(function (r) {
      if (r.status === "ok") { try { V.zapiszPlan(V.apiPreview(r)); } catch (e) {} return; }
      if (r.status === "login") {
        var s2 = V.state(); if (s2.askedLogin && now - s2.askedLogin < ASK_LOGIN && now >= s2.askedLogin) return;
        s2.askedLogin = now; V.state(s2);
        // zapisane hasło odrzucone (zmienione w Vantify?) → Ustawienia → Vantify, wpisać nowe; bez zapisanego → okno logowania
        if (r.code === "bad") return ask({ title: "Vantify", text: L("Vantify nie przyjął zapisanego hasła. Wpisać aktualne hasło?", "Vantify did not accept the saved password. Type the current password?"), ok: L("Wpisz", "Type it"), cancel: L("Później", "Later") })
          .then(function (yes) { if (yes) V.go("haslo"); });
        return ask({ title: "Vantify", text: L("Logowanie do Vantify wygasło (trwa 24 h). Zalogować się teraz, żeby apka pobrała nowe terminy? Możesz też zapisać login i hasło w Ustawienia → Vantify – wtedy apka loguje się sama.", "Your Vantify sign-in has expired (it lasts 24 h). Sign in now so the app can get new due dates? You can also save the login and password in Settings → Vantify – then the app signs in by itself."), ok: L("Zaloguj", "Sign in"), cancel: L("Później", "Later") })
          .then(function (yes) { if (yes) V.go("login"); });
      }
    }).catch(function () {});
  }
  setTimeout(auto, 4000);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") auto(); });
  w.OESTVantifyAuto = { check: auto };
})(window);
