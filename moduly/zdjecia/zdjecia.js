/* Moduł zdjęć (moduly/zdjecia) – wielokrotnego użytku, bez kodu inspekcji.
 *
 * JEDYNE miejsce zapisu zdjęć w apkach OEST (Grzegorz 04/11/2026: „wystarczy, że się raz zapisze, pozostałe moduły
 * korzystają z jednego miejsca”). Inspekcje, szkice i raporty trzymają tylko id zdjęcia, nie własne kopie.
 *
 * Apka woła:  OESTZdjecia.save(plik, { source, category, code, location, point, kind, hold, when })
 *               kind  = 'formularz' | 'ogolne' | 'punkt' – rozmiar w Standardzie: 1920 / 1600 / 1280 px → { id, blob, width, height, … }
 *               point = punkt / pytanie, przy którym zrobiono zdjęcie (np. nazwa kranu) – trafia do nazwy pliku i wyszukiwania
 *               hold  = kto trzyma zdjęcie (np. 'inspekcja'); trzymanego zdjęcia sprzątanie nigdy nie kasuje z telefonu
 *             OESTZdjecia.blob(id) → zdjęcie;  OESTZdjecia.release(hold, zostaw, minWiekMs) → zwalnia nieużywane
 * Moduł sam:  kompresuje (jakość z ustawień), zapisuje w osobnym magazynie na telefonie (IndexedDB „oest-zdjecia”),
 *             pilnuje limitu miejsca, nadaje nazwę i folder (dzień / kategoria), a przez sync() wysyła na dysk.
 * Dysk jest podawany z zewnątrz jako adapter { ensureFolder(name, parentId), upload(parentId, name, blob), remove(id) },
 * więc ten sam moduł zadziała w innej apce z innym dyskiem.
 *
 * Zasady bezpieczeństwa danych:
 *  - z telefonu znikają tylko zdjęcia, które są już na dysku (niewysłanych nie kasujemy nigdy),
 *  - zdjęcia trzymane przez inspekcję (hold) nie znikają z telefonu nawet po wysłaniu na dysk,
 *  - z dysku znikają najstarsze, gdy przekroczony jest limit dysku (wpis w apce zostaje oznaczony, że go tam już nie ma).
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OESTZdjecia = api.createBrowser(root);
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var MB = 1024 * 1024, THUMB = 400; // miniatura: dłuższy bok w px
  var PRESETS = {
    standard: { max: 1920, q: 0.8, pl: 'Standard (formularz 1920 px, ogólne 1600 px, przy pytaniu 1280 px)', en: 'Standard (form 1920 px, general 1600 px, at a question 1280 px)' },
    wysoka: { max: 3000, q: 0.85, pl: 'Wysoka (do 3000 px, ok. 1,5 MB)', en: 'High (up to 3000 px, about 1.5 MB)' },
    oryginal: { max: 0, q: 0.92, pl: 'Oryginał (pełna rozdzielczość, ok. 3 MB)', en: 'Original (full resolution, about 3 MB)' }
  };
  var DEFAULTS = { preset: 'standard', phoneLimitMB: 1024, driveLimitMB: 5120, wifiOnly: true, rootName: 'OEST Zdjęcia' }; // i18n-ok: nazwa folderu na Dysku (stała, nie tekst ekranu)

  function cleanSettings(s) {
    var out = Object.assign({}, DEFAULTS, s || {});
    if (!PRESETS[out.preset]) out.preset = DEFAULTS.preset;
    out.phoneLimitMB = clampInt(out.phoneLimitMB, 100, 100000, DEFAULTS.phoneLimitMB);
    out.driveLimitMB = clampInt(out.driveLimitMB, 100, 1000000, DEFAULTS.driveLimitMB);
    out.wifiOnly = out.wifiOnly !== false;
    out.rootName = typeof out.rootName === 'string' && out.rootName.trim() ? out.rootName.trim().slice(0, 100) : DEFAULTS.rootName;
    return out;
  }
  function clampInt(v, min, max, def) { v = Math.round(Number(v)); return Number.isFinite(v) && v >= min && v <= max ? v : def; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  // nazwy plików bezpieczne dla Androida i Dysku: bez / \ : * ? " < > | i znaków sterujących
  function safe(s) { return String(s || '').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80); }

  /* Folder i nazwa z kontekstu: OEST Zdjęcia / 2026-11 / 01 / Isolators / TB-L13 ISO-027 171405.jpg */
  function place(meta, when) {
    var d = when instanceof Date && !isNaN(when) ? when : new Date();
    var month = d.getFullYear() + '-' + pad(d.getMonth() + 1), day = pad(d.getDate());
    var category = safe(meta.category) || (meta.source === 'reactive' ? 'Reactive' : 'Inne'); // i18n-ok: nazwa folderu na Dysku
    var label = [safe(meta.location), safe(meta.code), safe(meta.point)].filter(Boolean).join(' ') || category;
    var time = pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
    return { folder: [month, day, category], name: label + ' ' + time + '.jpg', day: month + '-' + day };
  }

  /* Wymiary po kompresji (bez powiększania). */
  // Rozmiar wg rodzaju zdjęcia w Standardzie (Grzegorz 05/11/2026): formularz na całą stronę A4 musi być czytelny,
  // ogólne trochę mniejsze, przy pytaniu / kranie najmniejsze (w raporcie są małe). Bez rodzaju = jak formularz.
  var KINDS = { formularz: { max: 1920, q: 0.8 }, ogolne: { max: 1600, q: 0.78 }, punkt: { max: 1280, q: 0.75 } };
  function fit(w, h, preset, kind) {
    var p = PRESETS[preset] || PRESETS.standard;
    if (p === PRESETS.standard && KINDS[kind]) p = KINDS[kind];
    var s = p.max ? Math.min(1, p.max / Math.max(w, h)) : 1;
    return { width: Math.max(1, Math.round(w * s)), height: Math.max(1, Math.round(h * s)), quality: p.q };
  }

  /* Co skasować, żeby zmieścić się w limitach. Rekordy: {id, created, size, blob?, driveId?, driveDeleted?} */
  function plan(records, settings) {
    var s = cleanSettings(settings), oldest = records.slice().sort(function (a, b) { return a.created < b.created ? -1 : a.created > b.created ? 1 : 0; });
    var onDrive = oldest.filter(function (r) { return r.driveId && !r.driveDeleted; });
    var driveBytes = onDrive.reduce(function (t, r) { return t + (r.size || 0); }, 0), driveRemove = [];
    for (var i = 0; i < onDrive.length && driveBytes > s.driveLimitMB * MB; i++) { driveRemove.push(onDrive[i].id); driveBytes -= onDrive[i].size || 0; }
    var local = oldest.filter(function (r) { return r.hasBlob; });
    var phoneBytes = local.reduce(function (t, r) { return t + (r.size || 0); }, 0), phoneRemove = [];
    for (var j = 0; j < local.length && phoneBytes > s.phoneLimitMB * MB; j++) {
      if (!local[j].driveId) continue; // niewysłane zostają na telefonie
      if (local[j].hold) continue; // zdjęcie w inspekcji zostaje na telefonie
      phoneRemove.push(local[j].id); phoneBytes -= local[j].size || 0;
    }
    return { driveRemove: driveRemove, phoneRemove: phoneRemove, phoneOver: phoneBytes > s.phoneLimitMB * MB };
  }

  function stats(records) {
    var out = { count: records.length, phoneBytes: 0, phoneCount: 0, driveBytes: 0, driveCount: 0, pending: 0, pendingBytes: 0 };
    records.forEach(function (r) {
      if (r.hasBlob) { out.phoneBytes += r.size || 0; out.phoneCount++; }
      if (r.driveId && !r.driveDeleted) { out.driveBytes += r.size || 0; out.driveCount++; }
      if (r.hasBlob && !r.driveId) { out.pending++; out.pendingBytes += r.size || 0; }
    });
    return out;
  }

  /* Wyszukiwanie: po dniu (2026-11-01), kodzie, miejscu, kategorii. Wszystkie słowa muszą pasować. */
  function search(records, query) {
    var words = String(query || '').toLowerCase().split(/\s+/).filter(Boolean);
    return records.filter(function (r) {
      var hay = [r.day, r.code, r.location, r.point, r.kind, r.category, r.name, r.source].join(' ').toLowerCase();
      return words.every(function (w) { return hay.indexOf(w) >= 0; });
    }).sort(function (a, b) { return a.created < b.created ? 1 : -1; });
  }

  /* Magazyn + synchronizacja. deps: { db: {all, get, put, del}, settings: {load, save}, compress(file, preset, kind), wifi(), now() } */
  function createStore(deps) {
    var syncing = null, enforcing = Promise.resolve(), listeners = [], savedListeners = [];
    function emit(list) { (list || listeners).forEach(function (f) { try { f(); } catch (_) {} }); }
    // każde konto ma osobne zdjęcia i osobny stan Dysku (inne konto na tym samym telefonie ich nie widzi)
    function owner() { return String((deps.owner && deps.owner()) || ''); }
    async function mine() { var o = owner(); return (await deps.db.all()).filter(function (r) { return (r.owner || '') === o; }); }
    function settings() { return cleanSettings(deps.settings.load()); }
    function setSettings(next) { var s = cleanSettings(Object.assign({}, deps.settings.load(), next)); deps.settings.save(s); emit(); return s; }
    async function list() { return (await mine()).map(meta); }
    function meta(r) { var m = Object.assign({}, r); delete m.blob; m.hasBlob = !!r.blob; return m; }

    async function save(file, info) {
      info = info || {};
      var when = info.when instanceof Date && !isNaN(info.when) ? info.when : new Date(deps.now());
      var kind = KINDS[info.kind] ? info.kind : '', s = settings(), out = await deps.compress(file, s.preset, kind);
      var p = place(info, when);
      var rec = { id: deps.id(), owner: owner(), created: when.toISOString(), saved: new Date(deps.now()).toISOString(), day: p.day, folder: p.folder, name: p.name,
        source: safe(info.source) || 'inne', category: safe(info.category), code: safe(info.code), location: safe(info.location),
        point: safe(info.point), kind: kind, hold: safe(info.hold),
        width: out.width, height: out.height, size: out.blob.size, preset: s.preset, blob: out.blob, driveId: '', driveDeleted: false };
      await deps.db.put(rec);
      // sprzątanie po limicie w tle: zapis zdjęcia nie czeka na przegląd całego folderu (prędkość zapisu, Grzegorz 04/11)
      enforcing = enforcing.then(function () { return enforce(null); }).catch(function () {}).then(function () { emit(); });
      emit(savedListeners);
      var m = meta(rec); m.blob = out.blob; m.thumb = out.thumb || null; // ten sam plik (i miniatura) dla wołającego: bez drugiej kopii
      return m;
    }

    /* Oznacza istniejące zdjęcia jako trzymane przez `holder` (np. kopie wracające do przywróconej inspekcji). */
    async function keep(ids, holder) {
      holder = safe(holder); if (!holder) return 0;
      var n = 0;
      for (var i = 0; i < (ids || []).length; i++) { var r = await deps.db.get(ids[i]); if (r && r.hold !== holder) { r.hold = holder; await deps.db.put(r); n++; } }
      if (n) emit();
      return n;
    }

    /* Zwalnia zdjęcia trzymane przez `holder`, których id nie ma w `keep` (lista id albo Set) i które są starsze niż
       minAgeMs (świeże mogą jeszcze czekać na zapis szkicu). Zwolnione zdjęcie zostaje w folderze OEST – tylko podlega limitowi. */
    async function release(holder, keep, minAgeMs) {
      holder = safe(holder); if (!holder) return 0;
      var ks = keep instanceof Set ? keep : new Set(keep || []), edge = deps.now() - (minAgeMs || 0), n = 0, all = await mine();
      for (var i = 0; i < all.length; i++) {
        var r = all[i];
        if (r.hold !== holder || ks.has(r.id) || Date.parse(r.saved || r.created) > edge) continue; // wiek od zapisu (zdjęcie z galerii może mieć starą datę)
        r.hold = ''; await deps.db.put(r); n++;
      }
      if (n) { await enforce(null); emit(); }
      return n;
    }

    async function enforce(drive) {
      var all = await mine(), p = plan(all.map(meta), settings());
      if (drive) for (var i = 0; i < p.driveRemove.length; i++) {
        var r = await deps.db.get(p.driveRemove[i]);
        try { await drive.remove(r.driveId); } catch (e) { if (!/404/.test(String(e && e.message))) throw e; }
        r.driveDeleted = true;
        if (!r.blob) await deps.db.del(r.id); else await deps.db.put(r);
      }
      for (var j = 0; j < p.phoneRemove.length; j++) {
        var x = await deps.db.get(p.phoneRemove[j]);
        if (!x || !x.driveId) continue;
        if (x.driveDeleted) await deps.db.del(x.id); else { x.blob = null; await deps.db.put(x); }
      }
      return p;
    }

    /* Wysyła niewysłane (od najstarszych), potem pilnuje limitów. force=true pomija warunek Wi-Fi (ręczne „wyślij teraz”). */
    function sync(drive, force) {
      if (syncing) return syncing;
      syncing = (async function () {
        var s = settings(), who = owner();
        function allowed() { return !(s.wifiOnly && !force && deps.wifi() !== true); }
        if (!allowed()) return { skipped: 'wifi', sent: 0 };
        var folders = {}, sent = 0;
        await enforce(drive); // najpierw zaległe sprzątanie Dysku, żeby pełny Dysk nie blokował wysyłki
        async function folderId(parts) {
          var key = '', parent = s.rootId || '';
          if (!parent) { parent = (await drive.ensureFolder(s.rootName, '')).id; s = setSettings({ rootId: parent }); }
          for (var i = 0; i < parts.length; i++) {
            key += '/' + parts[i];
            if (!folders[key]) folders[key] = (await drive.ensureFolder(parts[i], parent)).id;
            parent = folders[key];
          }
          return parent;
        }
        var all = (await mine()).filter(function (r) { return r.blob && !r.driveId; })
          .sort(function (a, b) { return a.created < b.created ? -1 : 1; });
        for (var i = 0; i < all.length; i++) {
          if (owner() !== who) return { skipped: 'account', sent: sent }; // zmiana konta w trakcie: reszta czeka
          if (!allowed()) return { skipped: 'wifi', sent: sent }; // utrata Wi-Fi w trakcie: reszta czeka
          var r = all[i], parent;
          try { parent = await folderId(r.folder); }
          catch (e) { if (s.rootId && /404/.test(String(e && e.message))) { s = setSettings({ rootId: '' }); folders = {}; parent = await folderId(r.folder); } else throw e; }
          var up = await drive.upload(parent, r.name, r.blob);
          var fresh = await deps.db.get(r.id);
          if (!fresh) continue;
          fresh.driveId = up.id; fresh.synced = new Date(deps.now()).toISOString();
          await deps.db.put(fresh); sent++; emit();
          await enforce(drive);
        }
        setSettings({ lastSync: new Date(deps.now()).toISOString() });
        return { sent: sent };
      })().finally(function () { syncing = null; emit(); });
      return syncing;
    }

    async function blob(id) { var r = await deps.db.get(id); return r && r.blob; }
    async function remove(id) { await deps.db.del(id); emit(); }
    function onChange(f) { listeners.push(f); }
    function onSaved(f) { savedListeners.push(f); }
    return { save: save, keep: keep, release: release, list: list, blob: blob, remove: remove, sync: sync, settings: settings, setSettings: setSettings,
      onChange: onChange, onSaved: onSaved, busy: function () { return !!syncing; } };
  }

  /* ---- przeglądarka / Android WebView ---- */
  function idb(win) {
    var opened = null;
    function open() {
      if (opened) return opened;
      opened = new Promise(function (res, rej) {
        var q = win.indexedDB.open('oest-zdjecia', 1);
        q.onupgradeneeded = function () { q.result.createObjectStore('photos', { keyPath: 'id' }); };
        q.onsuccess = function () { res(q.result); }; q.onerror = function () { rej(q.error); };
      });
      return opened;
    }
    function tx(mode, fn) {
      return open().then(function (db) {
        return new Promise(function (res, rej) {
          var t = db.transaction('photos', mode), st = t.objectStore('photos'), out;
          var req = fn(st); if (req) req.onsuccess = function () { out = req.result; };
          t.oncomplete = function () { res(out); }; t.onerror = t.onabort = function () { rej(t.error); };
        });
      });
    }
    return {
      all: function () { return tx('readonly', function (s) { return s.getAll(); }).then(function (x) { return x || []; }); },
      get: function (id) { return tx('readonly', function (s) { return s.get(id); }); },
      put: function (r) { return tx('readwrite', function (s) { s.put(r); }); },
      del: function (id) { return tx('readwrite', function (s) { s.delete(id); }); }
    };
  }
  function compressIn(win) {
    return async function (file, preset, kind) {
      var img;
      try { img = await win.createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (_) { img = await win.createImageBitmap(file); }
      var f = fit(img.width, img.height, preset, kind), c = win.document.createElement('canvas');
      c.width = f.width; c.height = f.height;
      var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, f.width, f.height); g.drawImage(img, 0, 0, f.width, f.height);
      if (img.close) img.close();
      // miniatura z tego samego płótna (bez drugiego dekodowania), dla ekranów z podglądem
      var k = Math.min(1, THUMB / Math.max(f.width, f.height)), t = win.document.createElement('canvas');
      t.width = Math.max(1, Math.round(f.width * k)); t.height = Math.max(1, Math.round(f.height * k)); t.getContext('2d').drawImage(c, 0, 0, t.width, t.height);
      var both = await Promise.all([new Promise(function (res) { c.toBlob(res, 'image/jpeg', f.quality); }), new Promise(function (res) { t.toBlob(res, 'image/jpeg', 0.8); })]);
      if (!both[0]) throw Error('IMAGE_COMPRESSION');
      return { blob: both[0], thumb: both[1], width: f.width, height: f.height };
    };
  }
  function createBrowser(win) {
    function who() { try { var a = JSON.parse(win.localStorage.getItem('oest.account') || 'null'); return a && a.email ? String(a.email).toLowerCase() : ''; } catch (_) { return ''; } }
    function KEY() { return 'oest.zdjecia.v1.' + who(); }
    var store = createStore({
      owner: who,
      db: idb(win),
      settings: {
        load: function () { try { return JSON.parse(win.localStorage.getItem(KEY()) || '{}'); } catch (_) { return {}; } },
        save: function (s) { try { win.localStorage.setItem(KEY(), JSON.stringify(s)); } catch (_) {} }
      },
      compress: compressIn(win),
      wifi: function () { var c = win.navigator.connection; if (!c || !c.type) return null; return c.type === 'wifi' || c.type === 'ethernet'; },
      now: function () { return Date.now(); },
      id: function () { return win.crypto.randomUUID(); }
    });
    store.PRESETS = PRESETS; store.place = place; store.stats = stats; store.search = search;
    return store;
  }

  return { PRESETS: PRESETS, DEFAULTS: DEFAULTS, cleanSettings: cleanSettings, place: place, fit: fit, plan: plan, stats: stats,
    search: search, createStore: createStore, createBrowser: createBrowser };
});
