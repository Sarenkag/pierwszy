// Ekran Start (pierwsze uruchomienie, bez konta): logowanie przez Google albo wejście bez logowania.
// Dane i akcje dla ekranu Start.vue; wygląd rysuje moduly/szkielet (Ionic + Vue). Logowanie Google i zapis konta: bez zmian względem dawnego index.html.
(function (w) {
  var cfg = { conf: {}, native: false, social: null, seed: function () {}, wejdz: function () {} };
  var ui = { blad: "", pomin: false };
  function zmiana() { try { w.dispatchEvent(new CustomEvent("oest:start-stan")); } catch (e) {} }
  // init(): conf = OEST_CONFIG, native/social = Capacitor, seed = przygotowanie profilu po zalogowaniu, wejdz = przejście na ekran główny
  function init(c) {
    cfg = c;
    if (!cfg.conf.googleWebClientId) ui.pomin = true; // podgląd w przeglądarce / wersja bez identyfikatora Google
  }
  function blad(t) { ui.blad = t; zmiana(); }
  function ready() {
    if (!cfg.social || !cfg.conf.googleWebClientId) return Promise.resolve(false);
    return cfg.social.initialize({ google: { webClientId: cfg.conf.googleWebClientId } }).then(function () { return true; });
  }
  function dane() { return { blad: ui.blad, pomin: ui.pomin }; }
  function google() {
    ui.blad = ""; zmiana();
    return ready().then(function (ok) {
      if (!ok) throw new Error(cfg.native ? w.OESTT("Logowanie Google nie jest jeszcze ustawione w tej wersji apki.", "Google sign-in is not set up in this app version yet.") : w.OESTT("Logowanie Google działa tylko w apce na telefonie.", "Google sign-in works only in the phone app."));
      return cfg.social.login({ provider: "google", options: { scopes: ["email", "profile"] } });
    }).then(function (res) {
      var p = (res && res.result && res.result.profile) || {};
      if (!p.email) throw new Error(w.OESTT("Google nie zwrócił adresu e-mail.", "Google did not return an email address."));
      w.OESTKonto.set({ provider: "google", id: p.id || "", email: p.email, name: p.name || "", first: p.givenName || "", last: p.familyName || "", pic: p.imageUrl || "", t: Date.now() });
      cfg.seed();
      cfg.wejdz();
    }).catch(function (e) {
      ui.blad = w.OESTBledy ? w.OESTBledy.text(e) : (e && e.message) || String(e);
      ui.pomin = true; // gdy Google zawiedzie, zawsze da się wejść bez logowania (praca nie może stanąć)
      zmiana();
    });
  }
  // Tymczasowe wejście, dopóki nie ma identyfikatora Google (żeby dało się sprawdzić resztę apki)
  function pomin() { w.OESTKonto.set({ provider: "local", id: "", email: "", name: "", t: Date.now() }); cfg.wejdz(); }
  w.OESTStart = { init: init, dane: dane, google: google, pomin: pomin, blad: blad };
})(window);
