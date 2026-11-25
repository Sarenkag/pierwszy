"use strict";
// i-rdzen.js – wspólne podstawy strony: $, stałe, stan inspekcji.
// Korzysta ze wspólnych nazw całej strony (pliki 2–16 z tabeli w docs/podzial-modulow.md); ładować w kolejności z index.html.
// Nie ruszać: nazw globalnych – używają ich wszystkie dalsze pliki.
  var $ = function (id) { return document.getElementById(id); };
  var MIME_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  // ---------- rodzaje inspekcji: inspekcje/rodzaje.js (K02) ----------
  var RD = window.OESTRodzaje, TYPES = RD.lista, FAULTS = RD.usterki;

  // ---------- pamięć lokalna (tylko w tej przeglądarce) ----------
  function load(k, d) { try { var v = localStorage.getItem("insp." + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem("insp." + k, JSON.stringify(v)); return true; } catch (e) { return false; } }

  var DEFAULTS = {
    v: 5, email: "", folder: "",
    pattern: "{urzadzenie} {DD}{MM}{RRRR}",
    site: "One Eastside Tower", insp: "", scope: true, drivePhotos: false,
    api: "", key: "", auto: true
  };
  var savedCfg = load("cfg", {});
  var cfg = Object.assign({}, DEFAULTS);
  if (savedCfg.v === 5) Object.assign(cfg, savedCfg);
  else if (savedCfg.v === 4) { Object.assign(cfg, savedCfg); cfg.v = 5; cfg.stamp = false; save("cfg", cfg); } // 01/11: zdjęcia bez napisów (Grzegorz)
  else {
    ["folder", "site", "insp"].forEach(function (k) { if (savedCfg[k] !== undefined && savedCfg[k] !== "") cfg[k] = savedCfg[k]; });
    if (savedCfg.email) cfg.email = savedCfg.email;
    save("cfg", cfg);
  }
  // na zdjęciach nic nie dopisujemy (01/11/2026; 25.11.2026: „Daty ma nie być wcale”) – dawne ustawienie znika
  delete cfg.stamp; delete cfg.stampChosen;
  // Link z Apps Script (linkDoTelefonu): …/inspekcje/#api=…&key=… — zapisuje adres i klucz, potem czyści pasek adresu
  (function () {
    var h = new URLSearchParams(location.hash.slice(1));
    if (h.get("api") && h.get("key")) {
      cfg.api = h.get("api"); cfg.key = h.get("key"); save("cfg", cfg);
      window.OESTEkrany.czyscAdres(); // adres zmienia tylko szkielet (moduly/szkielet)
    }
  })();
  var serverTpl = null; // {name, bytes} z Google Drive

  // Tryb: strona z Apps Script (google.script.run) albo z GitHub Pages (fetch do …/exec, działa offline)
  var IN_GAS = !!(window.google && google.script && google.script.run);
  var APP = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

  // ---------- pomocnicze ----------
  var NZ = window.OESTNarzedzia; // pad, daty, base64, kb – moduly/narzedzia (K01)
  // esc zostaje tu do osobnej karty: ta sama funkcja jest w 11 plikach .js, łączymy je wszystkie naraz (audyt nr 53)
  var esc = window.OESTNarzedzia.esc; // moduly/narzedzia (audyt nr 53)
  function val(id) { return $(id).value.trim(); }
  function radio(name) { var el = document.querySelector('ion-select[name="' + name + '"]'); return el ? el.value : ""; }
  function online() { return navigator.onLine !== false; }

  // ---------- baza w telefonie (IndexedDB „inspekcje”): kolejka raportów + szablon ----------
  // jeden właściciel bazy: moduly/wysylka (OESTSender.baza, karta K10) – strona nie otwiera jej sama
  var BAZA = window.OESTSender.baza;
  var kvGet = BAZA.kvGet, kvAll = BAZA.kvAll, kvSet = BAZA.kvSet, qAll = BAZA.qAll, qPut = BAZA.qPut, qDel = BAZA.qDel, bazaJest = BAZA.dostepna;
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});

