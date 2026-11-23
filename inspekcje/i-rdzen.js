"use strict";
// i-rdzen.js – wspólne podstawy strony: $, stałe, stan inspekcji.
// Korzysta z: 2 (numery z tabeli w docs/podzial-modulow.md).
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
    site: "One Eastside Tower", insp: "", scope: true, stamp: false, drivePhotos: false,
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
  // 01/11/2026 Grzegorz: na zdjęciach nic nie dopisujemy. Stare „tak” z domyślnych ustawień wyłączamy raz; włączyć można ręcznie w Ustawieniach.
  if (!cfg.stampChosen) cfg.stamp = false;
  // Link z Apps Script (linkDoTelefonu): …/inspekcje/#api=…&key=… — zapisuje adres i klucz, potem czyści pasek adresu
  (function () {
    var h = new URLSearchParams(location.hash.slice(1));
    if (h.get("api") && h.get("key")) {
      cfg.api = h.get("api"); cfg.key = h.get("key"); save("cfg", cfg);
      try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
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
  function radio(name) { var r = document.querySelector('input[name="' + name + '"]:checked'); return r ? r.value : ""; }
  function online() { return navigator.onLine !== false; }

  // ---------- baza w telefonie (IndexedDB): kolejka raportów + szablon ----------
  var mem = { queue: {}, kv: {} }; // bez IndexedDB: odczyt = pusto; zapis = jawny błąd STORAGE_WRITE (audyt 19/11/2026 nr 21, D11 – nie cichy zapas w pamięci)
  var dbP = new Promise(function (res) {
    try {
      var rq = indexedDB.open("inspekcje", 1);
      rq.onupgradeneeded = function () { var db = rq.result; db.createObjectStore("queue", { keyPath: "id" }); db.createObjectStore("kv"); };
      rq.onsuccess = function () { res(rq.result); };
      rq.onerror = function () { res(null); };
    } catch (e) { res(null); }
  });
  function idb(store, mode, fn) {
    return dbP.then(function (db) {
      if (!db) { if (mode === "readwrite") throw Error("STORAGE_WRITE"); return fn(null, mem[store]); }
      return new Promise(function (res, rej) {
        var tx = db.transaction(store, mode), out = fn(tx.objectStore(store));
        tx.oncomplete = function () { res(out instanceof IDBRequest ? out.result : out); };
        tx.onerror = tx.onabort = function () { rej(tx.error); };
      });
    });
  }
  function kvGet(k) { return idb("kv", "readonly", function (s, m) { return m ? m[k] : s.get(k); }); }
  function kvSet(k, v) { return idb("kv", "readwrite", function (s, m) { if (m) m[k] = v; else s.put(v, k); }); }
  function qAll() { return idb("queue", "readonly", function (s, m) { return m ? Object.keys(m).map(function (k) { return m[k]; }) : s.getAll(); }); }
  function qPut(it) { return idb("queue", "readwrite", function (s, m) { if (m) m[it.id] = it; else s.put(it); }); }
  function qDel(id) { return idb("queue", "readwrite", function (s, m) { if (m) delete m[id]; else s.delete(id); }); }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});

