// Bot Vantify (Grzegorz 26/11/2026 „Tak, buduj bota”): Google Apps Script na koncie Grzegorza, projekt „OEST bot Vantify”.
// Co 10 min: Gmail „Your issue has been assigned - <nr>” od savillsuk.cafm@vantify.com (= zlecenie zatwierdzone) →
// Job Sheet tego zlecenia: PDF „JOB SHEET … <nr>” w Files zlecenia w Vantify albo na Dysku (apka wysyła tam raporty) →
// Commence (gdy trzeba) + Complete → mail z wynikiem do Grzegorza.
//   • Job Sheet już w Vantify → Complete bez nowego pliku (bez duplikatu). Tylko na Dysku → Complete z tym PDF. Brak obu → czeka.
//   • Do Vantify tylko po mailu „assigned”. Czekające bez Job Sheetu: Dysk przy każdym przebiegu, Vantify najwyżej co godzinę.
//   • Awaria Vantify (sieć, 5xx, logowanie): odstępy 30 min → 1 h → 2 h → 4 h → 12 h, jeden mail na całą awarię.
//   • Bot wyłączony na zleceniu w apce (przełącznik w zakładce Zlecenie, Grzegorz 27/11/2026) = plik „BOT STOP <nr>” na Dysku → nic nie robi.
//   • Odmowa Vantify przy zleceniu (4xx) albo zlecenie w innym stanie → bez ponawiania, jeden mail „zamknij ręcznie”.
// Zapytania (Commence, Complete, daty, typ dokumentu, Visibility) budują te same funkcje co apka: app/www/vantify-akcje.js,
// doklejany przed tym plikiem przy budowie (tools/bot-vantify/zbuduj.cjs) – bez drugiej kopii.
// Hasło tylko we Właściwościach skryptu (VANTIFY_USER, VANTIFY_PASS). Login, hasło ani token nie trafiają do logów ani maili;
// token żyje tylko w pamięci jednego przebiegu. Stan bota (co zamknięte, co czeka, awaria) we Właściwościach skryptu: OEST_BOT_STAN.
var BOT = (function () {
  var API = "https://savillsuk-api.cafm.vantify.com", SITE = 6324, FROM = "savillsuk.cafm@vantify.com";
  var JOB_SHEET = "/documenttypes/1", KLUCZ = "OEST_BOT_STAN";
  var KROKI = [30, 60, 120, 240, 720]; // minuty między próbami przy awarii Vantify (po 4 h już tylko 2× na dobę)
  var CZEKA = 60, MAX = 10, MIN = 60e3, DZIEN = 864e5;
  var SZUKAJ = "from:" + FROM + ' subject:"Your issue has been assigned" newer_than:30d';

  function nrZTematu(s) { var m = /Your issue has been assigned\s*-\s*(\d{5,})/i.exec(String(s || "")); return m ? m[1] : ""; }
  function maNr(s, nr) { return new RegExp("(^|\\D)" + nr + "(\\D|$)").test(String(s || "")); }
  // plik przy zleceniu = finalny Job Sheet: nazwa „JOB SHEET … <nr>” (PR #240), typ dokumentu Job Sheet i PDF, jeśli Vantify je podaje
  // (zdjęcie zapisane omyłkowo jako „Job Sheet” – #3084946 – nie ma tej nazwy, więc niczego nie uruchomi)
  function jestJobSheet(f, nr) {
    if (!f) return false;
    var nazwa = [f.title, f.filename, f.name].filter(function (x) { return typeof x === "string" && x; });
    if (!nazwa.some(function (n) { return /^JOB SHEET\b/i.test(n.trim()) && maNr(n, nr); })) return false;
    var dt = f._links && f._links.documentType && (f._links.documentType.href || f._links.documentType);
    if (typeof dt === "string" && dt && !/\/documenttypes\/1$/.test(dt)) return false;
    var typ = [f.type, f.mimeType, f.contentType, f.mime].filter(function (x) { return typeof x === "string" && x; });
    if (typ.length && !typ.some(function (t) { return /pdf/i.test(t); })) return false;
    if (typeof f.filename === "string" && f.filename && !/\.pdf$/i.test(f.filename)) return false;
    return true;
  }
  function stopZDysku(nazwa, nr) { return /^BOT STOP\b/i.test(String(nazwa || "").trim()) && maNr(nazwa, nr); }
  function pdfZDysku(nazwa, nr) { return /^JOB SHEET\b/i.test(nazwa) && maNr(nazwa, nr) && /\.pdf$/i.test(nazwa); }
  function lista(r) { var l = r && (r.files || r.items || (r._embedded && r._embedded.files)); return Array.isArray(l) ? l : l && Array.isArray(l.items) ? l.items : []; }
  function sciezka(h) { return String(h || "").replace(/^https?:\/\/[^/]+/, ""); }
  function json(t) { try { return t ? JSON.parse(t) : null; } catch (e) { return null; } }
  var POWOD = { other: "Vantify zwrócił inne zlecenie pod tym numerem", state: "zlecenie nie ma ani Commence, ani Complete (inny stan)", doctype: "zlecenie wymaga innego typu dokumentu niż Job Sheet" };

  // env: { now(), dry, props.get/set, szukaj(q) → [{subject}], stop(nr) → true, gdy apka wyłączyła bota na zleceniu, dysk(nr) → {name, size, bytes()} | null, http(m, url, o) → {code, text}, mail(temat, treść), log(s), user, pass }
  // A: funkcje z vantify-akcje.js (OESTVantifyAkcje)
  function run(env, A) {
    var now = env.now(), s = json(env.props.get(KLUCZ)) || {}, zmiana = false, raport = [];
    s.done = s.done || {}; s.jobs = s.jobs || {};
    function log(t) { raport.push(t); env.log(t); }
    Object.keys(s.done).forEach(function (k) { if (now - s.done[k].at > 60 * DZIEN) { delete s.done[k]; zmiana = true; } });
    Object.keys(s.jobs).forEach(function (k) { if (now - s.jobs[k].od > 31 * DZIEN) { delete s.jobs[k]; zmiana = true; } });
    if (s.przerwa && s.przerwa.next > now) { log("Przerwa po awarii Vantify do " + new Date(s.przerwa.next).toISOString()); return koniec(); }

    var nry = [];
    env.szukaj(SZUKAJ).forEach(function (t) { var nr = nrZTematu(t.subject); if (nr && !s.done[nr] && nry.indexOf(nr) < 0) nry.push(nr); });
    if (!nry.length) { log("Brak nowych zatwierdzonych zleceń."); return koniec(); }

    var token = null, ok = false;
    function blad(kind, code, msg) { return { kind: kind, code: code, msg: msg || "" }; }
    function http(m, url, o) { var r; try { r = env.http(m, url, o || {}); } catch (e) { r = { code: 0, text: String(e && e.message || e) }; } return r; }
    function zaloguj() {
      var r = http("POST", API + "/auth", { json: { username: env.user, password: env.pass, source: "web" } }), j = json(r.text);
      if (r.code === 0 || r.code >= 500 || r.code === 429) throw blad("awaria", r.code, "logowanie");
      if (r.code < 200 || r.code > 299 || !j || !j.token) throw blad("login", r.code, "Vantify nie przyjął loginu albo hasła z Właściwości skryptu");
      ok = true; return j.token;
    }
    function v(m, p, body) {
      if (!token) token = zaloguj();
      var r = http(m, /^https:/.test(p) ? p : API + p, { auth: "Bearer " + token, json: body });
      if (r.code === 0 || r.code >= 500 || r.code === 429) throw blad("awaria", r.code, m + " " + sciezka(p));
      if (r.code === 401) throw blad("login", r.code, "Vantify odrzucił logowanie w trakcie");
      if (r.code < 200 || r.code > 299) throw blad("odmowa", r.code, A.errText(json(r.text), r.text));
      ok = true; return json(r.text);
    }
    // PDF z Dysku do Vantify jak apka: POST /files (opis) → formularz do Google Storage z polityką z odpowiedzi
    function wyslij(plik) {
      var tytul = plik.name.replace(/\.pdf$/i, ""), r = v("POST", "/files", { title: tytul, filename: plik.name, type: "application/pdf", size: plik.size });
      var href = r && r._links && r._links.file && r._links.file.href, remote = r && r._links && r._links.remote && r._links.remote.href, pol = r && r.policy;
      if (!href || !remote || !pol) throw blad("odmowa", 0, "Vantify nie dał adresu do wysłania pliku");
      var g = http("POST", remote, { form: pol, file: plik });
      if (g.code === 0 || g.code >= 500) throw blad("awaria", g.code, "wysyłka pliku");
      if (g.code < 200 || g.code > 299) throw blad("odmowa", g.code, "Google Storage nie przyjął pliku");
      return { href: href, title: tytul };
    }
    function zamkniete(nr, wynik, tresc) {
      s.done[nr] = { at: now, wynik: wynik }; delete s.jobs[nr]; zmiana = true;
      if (tresc) env.mail(wynik === "zamknięte" ? "OEST bot: #" + nr + " zamknięte w Vantify" : "OEST bot: #" + nr + " – zamknij ręcznie", tresc);
    }

    try {
      nry.slice(0, MAX).forEach(function (nr) {
        if (env.stop && env.stop(nr)) { log("#" + nr + ": bot wyłączony na tym zleceniu w apce – nic nie robię."); return; }
        var z = s.jobs[nr], dysk = env.dysk(nr);
        if (!z) { z = s.jobs[nr] = { od: now, next: 0 }; zmiana = true; }
        if (z.next > now && !dysk) return; // czeka na Job Sheet: Vantify najwyżej co godzinę, chyba że PDF pojawił się na Dysku
        var krok = "odczyt";
        try {
          var job = v("GET", "/sites/" + SITE + "/jobs/" + nr), why = A.check(job, { id: Number(nr), docType: JOB_SHEET });
          if (why === "final") { log("#" + nr + ": już zamknięte w Vantify – nic nie robię."); if (!env.dry) zamkniete(nr, "było zamknięte"); return; }
          if (why === "approval") { log("#" + nr + ": Vantify nadal pokazuje „czeka na zatwierdzenie” – sprawdzę za godzinę."); if (!env.dry) { z.next = now + CZEKA * MIN; zmiana = true; } return; }
          if (why) throw blad("odmowa", 0, POWOD[why] || why);
          krok = "lista plików";
          var fl = job._links.files && (job._links.files.href || job._links.files), jest = fl ? lista(v("GET", sciezka(fl))).filter(function (f) { return jestJobSheet(f, nr); })[0] : null;
          if (!jest && !dysk) { log("#" + nr + ": zatwierdzone, ale Job Sheetu nie ma ani w Vantify, ani na Dysku – czekam."); if (!env.dry) { z.next = now + CZEKA * MIN; zmiana = true; } return; }
          var skad = jest ? "Job Sheet już w Vantify (" + (jest.title || jest.filename) + ") – Complete bez nowego pliku" : "Job Sheet z Dysku (" + dysk.name + ") – Complete z tym PDF";
          if (env.dry) { log("#" + nr + " [próba, nic nie wysłano]: " + (job._links.commence ? "Commence + " : "") + "Complete. " + skad + "."); return; }
          var d = A.docDate(new Date(now)), d0 = new Date(d.getTime() - MIN), plik = null;
          if (!jest) { krok = "wysyłka Job Sheetu"; plik = wyslij(dysk); }
          if (job._links.commence) { krok = "Commence"; v("POST", "/sites/" + SITE + "/jobs/" + nr + "/workflow/operation/commence", A.commence(A.built("commence"), { date: d0 })); }
          krok = "Complete";
          v("POST", "/sites/" + SITE + "/jobs/" + nr + "/workflow/operation/complete", A.complete(A.built("complete", { docType: JOB_SHEET }), { date: d, files: plik ? [plik] : [] }));
          krok = "sprawdzenie";
          var po = v("GET", "/sites/" + SITE + "/jobs/" + nr);
          if (po && po.is_final_status) { log("#" + nr + ": zamknięte. " + skad + "."); zamkniete(nr, "zamknięte", "Zlecenie #" + nr + " zamknięte przez bota po mailu „assigned”.\n" + (job._links.commence ? "Commence + " : "") + "Complete.\n" + skad + ".\nStatus w Vantify: " + (po.status || "") + "."); }
          else throw blad("odmowa", 0, "Complete wysłany, ale Vantify nie pokazuje zamknięcia (status: " + (po && po.status || "?") + ")");
        } catch (e) {
          if (!e || e.kind !== "odmowa") throw e;
          log("#" + nr + ": " + krok + " – " + (e.code ? "http" + e.code + " " : "") + e.msg);
          if (!env.dry) zamkniete(nr, "do ręki", "Bot nie zamknął zlecenia #" + nr + ". Krok: " + krok + ".\nPowód: " + (e.code ? "http" + e.code + " " : "") + e.msg + "\n" + (krok === "Complete" ? "Commence mogło już przejść. " : "") + "Zamknij je ręcznie w Vantify; bot już do niego nie wraca.");
        }
      });
      if (ok && s.przerwa && !env.dry) { delete s.przerwa; zmiana = true; log("Vantify znowu odpowiada."); }
    } catch (e) {
      if (!e || (e.kind !== "awaria" && e.kind !== "login")) throw e;
      log((e.kind === "login" ? "Logowanie do Vantify: " : "Awaria Vantify: ") + (e.code ? "http" + e.code + " " : "brak połączenia ") + "(" + e.msg + ")");
      if (!env.dry) {
        var n = s.przerwa ? s.przerwa.n + 1 : 0;
        if (!s.przerwa) env.mail("OEST bot: " + (e.kind === "login" ? "nie mogę zalogować się do Vantify" : "Vantify nie odpowiada"), (e.kind === "login" ? "Vantify nie przyjął logowania (" + (e.code ? "http" + e.code : "") + "). Sprawdź VANTIFY_USER i VANTIFY_PASS we Właściwościach skryptu." : "Vantify nie odpowiada (" + (e.code ? "http" + e.code : "brak połączenia") + ").") + "\nBot próbuje dalej co 30 min, 1 h, 2 h, 4 h, potem 2× na dobę. Następny mail dopiero przy kolejnej awarii.");
        s.przerwa = { n: n, od: s.przerwa ? s.przerwa.od : now, next: now + KROKI[Math.min(n, KROKI.length - 1)] * MIN, kind: e.kind };
        zmiana = true;
      }
    }
    return koniec();
    function koniec() { if (zmiana && !env.dry) env.props.set(KLUCZ, JSON.stringify(s)); return raport; }
  }

  // ---------- Apps Script: usługi Google ----------
  function srodowisko(dry) {
    var P = PropertiesService.getScriptProperties();
    return {
      dry: !!dry, now: function () { return Date.now(); },
      user: P.getProperty("VANTIFY_USER") || "", pass: P.getProperty("VANTIFY_PASS") || "",
      props: { get: function (k) { return P.getProperty(k); }, set: function (k, v) { P.setProperty(k, v); } },
      szukaj: function (q) { return GmailApp.search(q, 0, 50).map(function (t) { return { subject: t.getFirstMessageSubject() }; }); },
      stop: function (nr) {
        var it = DriveApp.searchFiles('title contains "' + nr + '" and title contains "BOT STOP" and trashed = false');
        while (it.hasNext()) if (stopZDysku(it.next().getName(), nr)) return true;
        return false;
      },
      dysk: function (nr) {
        var it = DriveApp.searchFiles('title contains "' + nr + '" and title contains "JOB SHEET" and mimeType = "application/pdf" and trashed = false'), best = null;
        while (it.hasNext()) { var f = it.next(); if (pdfZDysku(f.getName(), nr) && (!best || f.getLastUpdated() > best.getLastUpdated())) best = f; }
        return best ? { name: best.getName(), size: best.getSize(), bytes: function () { return best.getBlob().getBytes(); } } : null;
      },
      http: function (m, url, o) {
        var opt = { method: m.toLowerCase(), muteHttpExceptions: true, followRedirects: true, headers: { Accept: "application/json" } };
        if (o.auth) opt.headers.Authorization = o.auth;
        if (o.json !== undefined) { opt.contentType = "application/json"; opt.payload = JSON.stringify(o.json); }
        if (o.form) { var p = {}; Object.keys(o.form).forEach(function (k) { p[k] = String(o.form[k]); }); p.file = Utilities.newBlob(o.file.bytes(), "application/pdf", o.file.name); opt.payload = p; delete opt.headers.Accept; }
        var r = UrlFetchApp.fetch(url, opt);
        return { code: r.getResponseCode(), text: r.getContentText() };
      },
      mail: function (temat, tresc) { MailApp.sendEmail(Session.getEffectiveUser().getEmail(), temat, tresc); },
      log: function (s) { Logger.log(s); }
    };
  }
  function przebieg(dry) {
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(1000)) return Logger.log("Poprzedni przebieg jeszcze trwa.");
    try { return run(srodowisko(dry), OESTVantifyAkcje); } finally { lock.releaseLock(); }
  }
  return { run: run, przebieg: przebieg, nrZTematu: nrZTematu, jestJobSheet: jestJobSheet, pdfZDysku: pdfZDysku, stopZDysku: stopZDysku, SZUKAJ: SZUKAJ, KLUCZ: KLUCZ };
})();

// ---------- funkcje do wyboru w edytorze Apps Script ----------
// sprawdz – próba: czyta Gmail, Dysk i Vantify i pisze w dzienniku, co by zrobił; niczego nie wysyła, nie zapisuje i nie wysyła maili.
function sprawdz() { BOT.przebieg(true); }
// uruchom – jeden prawdziwy przebieg (to samo robi wyzwalacz co 10 min).
function uruchom() { BOT.przebieg(false); }
// wlacz – wyzwalacz co 10 minut (jeden; stary usuwany). wylacz – usuwa wyzwalacz, bot stoi.
function wlacz() { wylacz(); ScriptApp.newTrigger("uruchom").timeBased().everyMinutes(10).create(); Logger.log("Bot włączony: co 10 minut."); }
function wylacz() { ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === "uruchom") ScriptApp.deleteTrigger(t); }); Logger.log("Wyzwalacz bota usunięty."); }
