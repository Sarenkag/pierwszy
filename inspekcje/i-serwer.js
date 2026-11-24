"use strict";
// i-serwer.js – serwer Apps Script, tłumaczenie, model, notatki.
// Korzysta ze wspólnych nazw całej strony (pliki 2–16 z tabeli w docs/podzial-modulow.md); ładować w kolejności z index.html.
// Nie ruszać: adresów i nazw funkcji serwera.
  // ---------- serwer (Twój Google Apps Script) ----------
  function gs(fn) {
    var args = Array.prototype.slice.call(arguments, 1);
    return new Promise(function (res, rej) {
      var r = google.script.run.withSuccessHandler(res).withFailureHandler(rej);
      r[fn].apply(r, args);
    });
  }
  // Ten sam zestaw funkcji (getSetup, translate, submit) przez google.script.run albo POST na …/exec
  function api(fn, arg) {
    if (IN_GAS) return gs(fn, arg, window.GAS_KEY || ""); // klucz wstawia doGet
    if (!cfg.api) return Promise.reject(new Error(window.OESTT("brak adresu skryptu w Ustawieniach", "no script address in Settings")));
    return fetch(cfg.api, {
      method: "POST", redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, // bez preflight CORS
      body: JSON.stringify({ fn: fn, arg: arg, key: cfg.key })
    }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.text();
    }).then(function (t) {
      var j; try { j = JSON.parse(t); } catch (e) { throw new Error(window.OESTT("skrypt zwrócił stronę zamiast danych — sprawdź dostęp „Każdy” we wdrożeniu", "the script returned a page instead of data — check “Anyone” access in the deployment")); }
      if (j.error) throw new Error(j.error);
      return j.result;
    });
  }
  function gErr(e) { return window.OESTBledy ? OESTBledy.text(e) : (e && e.message) ? e.message : String(e); }

  // ---------- tłumaczenie komentarza (tłumacz Google, wymaga sieci) ----------
  // w APK: tłumacz ML Kit w telefonie (offline; za pierwszym razem pobiera słownik PL→EN ok. 30 MB)
  var trPlugin = null;
  function nativeTr() {
    if (IN_GAS || !window.Capacitor || !Capacitor.isNativePlatform || !Capacitor.isNativePlatform()) return null;
    if (!trPlugin) trPlugin = Capacitor.registerPlugin ? Capacitor.registerPlugin("Translate") : Capacitor.Plugins && Capacitor.Plugins.Translate;
    return trPlugin || null;
  }
  function renderTranslate() {
    var can = !!nativeTr() || (online() && (IN_GAS || cfg.api));
    $("translate").hidden = !can;
    if (!can && !$("trHint").textContent) $("trHint").textContent = window.OESTT("Bez sieci tłumaczenie nie działa — użyj gotowych usterek albo wpisz po angielsku.", "Translation does not work offline — use the ready defects or type in English.");
    if (can && /^Bez sieci/.test($("trHint").textContent)) $("trHint").textContent = "";
  }
  $("translate").addEventListener("click", function () {
    var txt = $("komentarz").value.trim(); if (!txt) return;
    var b = this, nt = nativeTr(); b.disabled = true; $("trHint").textContent = nt ? window.OESTT("Tłumaczę… (pierwszy raz pobieram słownik, ok. 30 MB)", "Translating… (first time downloading the dictionary, about 30 MB)") : window.OESTT("Tłumaczę…", "Translating…");
    (nt ? nt.plToEn({ text: txt }).then(function (r) { return r && r.text; }) : api("translate", txt)).then(function (out) {
      out = (out || "").trim();
      if (out) { trOriginal = txt; $("komentarz").value = out; ppmTrack(false, true); /* przetłumaczony komentarz = zmiana */ $("undoTr").hidden = false; $("trHint").textContent = window.OESTT("Gotowe. Możesz poprawić tekst ręcznie.", "Done. You can edit the text by hand."); if (mdReady) runModel(true); }
      else $("trHint").textContent = window.OESTT("Brak odpowiedzi — spróbuj jeszcze raz.", "No answer — try again.");
    }).catch(function (e) { $("trHint").textContent = window.OESTT("Nie udało się przetłumaczyć: ", "Translation failed: ") + gErr(e); })
      .then(function () { b.disabled = false; });
  });
  $("undoTr").addEventListener("click", function () { if (trOriginal != null) { $("komentarz").value = trOriginal; trOriginal = null; } this.hidden = true; $("trHint").textContent = ""; });

  // ---------- model tekstowy na telefonie (opcjonalny): zdanie po angielsku / jeden akapit z kilku notatek ----------
  var mdReady = false, mdSeq = 0, mdInput = null;
  function renderModel() {
    if (IN_GAS || !window.OESTModel || !OESTModel.available()) return;
    OESTModel.ready().then(function (r) { mdReady = r; $("mdRun").hidden = !r; });
  }
  function runModel(auto) {
    var txt = $("komentarz").value.trim(); if (!txt || !mdReady) return;
    // wejście = to, co jest teraz w polu (z Twoimi poprawkami); polski oryginał tylko pomocniczo
    var reference = trOriginal != null ? trOriginal : "", original = txt;
    var notes = txt.split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean);
    var tok = ++mdSeq, form = formSeq; mdInput = txt; mdMode = ""; $("mdRun").disabled = true;
    $("mdWarn").textContent = ""; $("mdBox").hidden = true;
    $("trHint").textContent = (auto ? window.OESTT("Przetłumaczone. ", "Translated. ") : "") + window.OESTT("Model układa tekst na telefonie… (pierwszy raz do ~20 s)", "The model is writing the text on the phone… (first time up to ~20 s)");
    (notes.length > 1 ? OESTModel.combine(notes, reference) : OESTModel.polish(original, reference)).then(function (out) {
      if (tok !== mdSeq || form !== formSeq) return;
      $("mdOut").value = out; $("mdBox").hidden = false;
      var miss = OESTModel.missingNumbers(original, out);
      $("mdWarn").textContent = miss.length ? "⚠ W propozycji brakuje: " + miss.join(", ") + window.OESTT(" — sprawdź.", " — check.") : "";
      $("trHint").textContent = window.OESTT("Propozycja gotowa. Nic nie wstawiam bez Twojej zgody.", "Suggestion ready. Nothing is inserted without your OK.");
    }).catch(function (e) { if (tok === mdSeq) $("trHint").textContent = e.message; })
      .then(function () { if (tok === mdSeq) $("mdRun").disabled = false; });
  }
  $("mdRun").addEventListener("click", function () { runModel(false); });
  // zmiana komentarza unieważnia propozycję (w toku i pokazaną), żeby nie nadpisać nowych poprawek
  $("komentarz").addEventListener("input", function () {
    if (mdInput === null) return; mdSeq++; mdInput = null; $("mdBox").hidden = true; $("mdRun").disabled = false; $("mdWarn").textContent = "";
    if (/^(Propozycja|Model układa|Przetłumaczone\. Model)/.test($("trHint").textContent)) $("trHint").textContent = window.OESTT("Komentarz zmieniony — „✨ Ułóż po angielsku”, gdy skończysz.", "Comment changed — tap “✨ Write in English” when you finish.");
  });
  $("mdUse").addEventListener("click", function () {
    var out = $("mdOut").value.trim(); if (!out) return;
    if ($("komentarz").value.trim() !== mdInput) { $("mdBox").hidden = true; $("trHint").textContent = window.OESTT("Komentarz się zmienił — ułóż jeszcze raz.", "The comment changed — write it again."); return; }
    if (mdMode === "notes") { trOriginal = $("komentarz").value; out = mdInput ? mdInput + "\n\n" + out : out; mdMode = ""; } // notatki: dopisane pod tym, co już jest; „Cofnij” wraca do komentarza sprzed wstawienia
    else if (trOriginal == null) trOriginal = $("komentarz").value.trim(); // „Cofnij” wraca do polskiego oryginału
    $("komentarz").value = out; ppmTrack(false, true); /* wstawiony tekst = zmiana */ $("undoTr").hidden = false; $("mdBox").hidden = true; mdInput = null; $("trHint").textContent = window.OESTT("Wstawione. Możesz poprawić ręcznie albo cofnąć.", "Inserted. You can edit by hand or undo.");
  });
  $("mdDrop").addEventListener("click", function () { mdSeq++; $("mdBox").hidden = true; $("trHint").textContent = ""; });
  renderModel();

  // ---------- notatki głosowe (moduly/notatki, 08/11/2026): przytrzymaj 🎤 → tekst PL → EN; okienko „Notatki”; „Połącz” = propozycja do komentarza ----------
  var mdMode = "";
  function ntScope() { return cur.mode === "one" && cur.type && window.OESTNotatki ? draftKey() : ""; }
  function ntCtx() { return cur.type ? cur.type.title : ""; }
  function ntRefresh() {
    var k = ntScope(), row = $("ntRec") && $("ntRec").parentNode; if (!row) return;
    row.hidden = !k; if (!k) { $("ntJoin").hidden = true; return; }
    OESTNotatki.summary(k).then(function (r) { if (k !== ntScope()) return; $("ntN").textContent = r.all; $("ntN").title = ""; $("ntJoin").hidden = r.ready < 1; var kp = $("komentarz").closest("[data-ui~=panel]"); if (r.all && kp.matches("[data-ui~=fold]")) { kp.dataset.expanded = "true"; kp.hidden = false; }; /* są notatki: pole notatki rozwinięte jak przy wpisanym komentarzu */ })
      .catch(function (e) { if (k !== ntScope()) return; $("ntN").textContent = "–"; $("ntN").title = e && e.message || ""; }); // pamięć apki niedostępna: liczba nieznana (nie udajemy „0”), komunikat w podpowiedzi przycisku; jawny błąd zapisu daje sam moduł przy zapisie
  }
  if (window.OESTNotatki) {
    OESTNotatki.bind($("ntRec"), {
      scope: ntScope, ctx: ntCtx,
      onSaved: function () { ppmTrack(false, true); $("trHint").textContent = window.OESTT("Notatka zapisana. Zamieniam ją na tekst — zobaczysz w „📝 Notatki”.", "Note saved. Turning it into text — see “📝 Notes”."); },
      onError: function (e) { $("trHint").textContent = gErr(e); }
    });
    OESTNotatki.on(function (k) { if (k === ntScope()) ntRefresh(); });
    $("ntOpen").addEventListener("click", function () { var k = ntScope(); if (k) OESTNotatki.open(k, { title: ntCtx() }); });
    $("ntJoin").addEventListener("click", function () {
      var k = ntScope(), b = this, tok = formSeq; if (!k) return; b.disabled = true;
      $("trHint").textContent = window.OESTT("Łączę notatki… (model na telefonie, pierwszy raz do ~20 s)", "Combining notes… (on-phone model, first time up to ~20 s)");
      OESTNotatki.propose(k, ntCtx()).then(function (r) { // tekst + liczby z notatek (PL i EN), których w nim brakuje – jedna reguła w module
        var out = r.text;
        if (tok !== formSeq) return;
        mdSeq++; $("mdRun").disabled = false; /* trwające „✨ Ułóż” unieważnione – przycisk wraca */ mdMode = "notes"; mdInput = $("komentarz").value.trim(); $("mdOut").value = out; $("mdBox").hidden = false; $("mdWarn").textContent = r.miss.length ? window.OESTT("⚠ W propozycji brakuje: ", "⚠ Missing in the suggestion: ") + r.miss.join(", ") + window.OESTT(" — sprawdź.", " — check.") : "";
        $("trHint").textContent = window.OESTT("Propozycja z notatek gotowa — sprawdź i stuknij „Wstaw do komentarza”. Nic nie wstawiam samo.", "Suggestion from the notes is ready — check it and tap “Insert into comment”. Nothing is inserted automatically.");
      }).catch(function (e) { $("trHint").textContent = gErr(e); }).then(function () { b.disabled = false; });
    });
  } else { $("ntRec").parentNode.hidden = true; }

