/* Moduł zdjęć (moduly/zdjecia) – wielokrotnego użytku, bez kodu inspekcji.
 *
 * Apka woła:  OESTZdjecia.save(plik, { source, category, code, location, when })
 * Moduł sam:  kompresuje (jakość z ustawień), zapisuje w osobnym magazynie na telefonie (IndexedDB „oest-zdjecia”),
 *             pilnuje limitu miejsca, nadaje nazwę i folder (dzień / kategoria), a przez sync() wysyła na dysk.
 * Dysk jest podawany z zewnątrz jako adapter { ensureFolder(name, parentId), upload(parentId, name, blob), remove(id) },
 * więc ten sam moduł zadziała w innej apce z innym dyskiem.
 *
 * Zasady bezpieczeństwa danych:
 *  - z telefonu znikają tylko zdjęcia, które są już na dysku (niewysłanych nie kasujemy nigdy),
 *  - z dysku znikają najstarsze, gdy przekroczony jest limit dysku (wpis w apce zostaje oznaczony, że go tam już nie ma).
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OESTZdjecia = api.createBrowser(root);
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var MB = 1024 * 1024;
  var PRESETS = {
    standard: { max: 1920, q: 0.8, pl: 'Standard (do 1920 px, ok. 0,5 MB)' },
    wysoka: { max: 3000, q: 0.85, pl: 'Wysoka (do 3000 px, ok. 1,5 MB)' },
    oryginal: { max: 0, q: 0.92, pl: 'Oryginał (pełna rozdzielczość, ok. 3 MB)' }
  };
  var DEFAULTS = { preset: 'standard', phoneLimitMB: 1024, driveLimitMB: 5120, wifiOnly: true, rootName: 'OEST Zdjęcia' };

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
    var category = safe(meta.category) || (meta.source === 'reactive' ? 'Reactive' : 'Inne');
    var label = [safe(meta.location), safe(meta.code)].filter(Boolean).join(' ') || category;
    var time = pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
    return { folder: [month, day, category], name: label + ' ' + time + '.jpg', day: month + '-' + day };
  }

  /* Wymiary po kompresji (bez powiększania). */
  function fit(w, h, preset) {
    var p = PRESETS[preset] || PRESETS.standard;
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
      var hay = [r.day, r.code, r.location, r.category, r.name, r.source].join(' ').toLowerCase();
      return words.every(function (w) { return hay.indexOf(w) >= 0; });
    }).sort(function (a, b) { return a.created < b.created ? 1 : -1; });
  }

  /* Magazyn + synchronizacja. deps: { db: {all, get, put, del}, settings: {load, save}, compress(file, preset), wifi(), now() } */
  function createStore(deps) {
    var syncing = null, listeners = [];
    function emit() { listeners.forEach(function (f) { try { f(); } catch (_) {} }); }
    function settings() { return cleanSettings(deps.settings.load()); }
    function setSettings(next) { var s = cleanSettings(Object.assign({}, deps.settings.load(), next)); deps.settings.save(s); emit(); return s; }
    async function list() { return (await deps.db.all()).map(meta); }
    function meta(r) { var m = Object.assign({}, r); delete m.blob; m.hasBlob = !!r.blob; return m; }

    async function save(file, info) {
      info = info || {};
      var when = info.when instanceof Date && !isNaN(info.when) ? info.when : new Date(deps.now());
      var s = settings(), out = await deps.compress(file, s.preset);
      var p = place(info, when);
      var rec = { id: deps.id(), created: when.toISOString(), day: p.day, folder: p.folder, name: p.name,
        source: safe(info.source) || 'inne', category: safe(info.category), code: safe(info.code), location: safe(info.location),
        width: out.width, height: out.height, size: out.blob.size, preset: s.preset, blob: out.blob, driveId: '', driveDeleted: false };
      await deps.db.put(rec);
      await enforce(null);
      emit();
      return meta(rec);
    }

    async function enforce(drive) {
      var all = await deps.db.all(), p = plan(all.map(meta), settings());
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
        var s = settings();
        if (s.wifiOnly && !force && deps.wifi() !== true) return { skipped: 'wifi', sent: 0 };
        var folders = {}, sent = 0;
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
        var all = (await deps.db.all()).filter(function (r) { return r.blob && !r.driveId; })
          .sort(function (a, b) { return a.created < b.created ? -1 : 1; });
        for (var i = 0; i < all.length; i++) {
          var r = all[i], parent;
          try { parent = await folderId(r.folder); }
          catch (e) { if (s.rootId && /404/.test(String(e && e.message))) { s = setSettings({ rootId: '' }); folders = {}; parent = await folderId(r.folder); } else throw e; }
          var up = await drive.upload(parent, r.name, r.blob);
          var fresh = await deps.db.get(r.id);
          if (!fresh) continue;
          fresh.driveId = up.id; fresh.synced = new Date(deps.now()).toISOString();
          await deps.db.put(fresh); sent++; emit();
        }
        await enforce(drive);
        setSettings({ lastSync: new Date(deps.now()).toISOString() });
        return { sent: sent };
      })().finally(function () { syncing = null; emit(); });
      return syncing;
    }

    async function blob(id) { var r = await deps.db.get(id); return r && r.blob; }
    async function remove(id) { await deps.db.del(id); emit(); }
    function onChange(f) { listeners.push(f); }
    return { save: save, list: list, blob: blob, remove: remove, sync: sync, settings: settings, setSettings: setSettings,
      onChange: onChange, busy: function () { return !!syncing; } };
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
    return async function (file, preset) {
      var img;
      try { img = await win.createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (_) { img = await win.createImageBitmap(file); }
      var f = fit(img.width, img.height, preset), c = win.document.createElement('canvas');
      c.width = f.width; c.height = f.height;
      var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, f.width, f.height); g.drawImage(img, 0, 0, f.width, f.height);
      if (img.close) img.close();
      var blob = await new Promise(function (res) { c.toBlob(res, 'image/jpeg', f.quality); });
      if (!blob) throw Error('IMAGE_COMPRESSION');
      return { blob: blob, width: f.width, height: f.height };
    };
  }
  function createBrowser(win) {
    var KEY = 'oest.zdjecia.v1';
    var store = createStore({
      db: idb(win),
      settings: {
        load: function () { try { return JSON.parse(win.localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; } },
        save: function (s) { try { win.localStorage.setItem(KEY, JSON.stringify(s)); } catch (_) {} }
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
