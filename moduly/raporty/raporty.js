/* Moduł raportów (moduly/raporty) – archiwum na telefonie + Word, PDF i dane inspekcji na Dysku.
 *
 * Decyzja Grzegorza 24/11/2026 (zastępuje „na Dysk tylko Word” z 08/11):
 *  - mail dostaje Word + PDF; Dysk dostaje Word + PDF + JSON ze snap,
 *  - jeden raport = trzy pliki o tej samej nazwie bazowej; ponowna wysyłka nadpisuje wszystkie trzy,
 *  - folder: OEST Raporty / budynek / rodzaj inspekcji, nazwa pliku jak raport („KOD DDMMRRRR.docx”),
 *  - na telefonie raporty (Word + PDF) bez limitu dni; po przekroczeniu 200 MB znikają najstarsze, i tylko te, które są już na Dysku;
 *    od 100 MB ostrzeżenie (jak w module zdjęć).
 *
 * Apka woła:  OESTRaporty.save({ key, at, name, docx, pdf, folder: [budynek, rodzaj], meta, snap })  – po wysłaniu maila (albo „Update”)
 *             OESTRaporty.setRec(id, true) / recovered()  – „Odzyskaj do edycji” i lista odzyskanych (etap 2c)
 *             OESTRaporty.sync(drive, { allowed })  – wysyła na Dysk raporty, których tam jeszcze nie ma albo które się zmieniły
 *             OESTRaporty.list() / get(id) / stats()
 *             OESTRaporty.zDysku(id) – pełna kopia z Dysku do lokalnej listy
 * Dysk jest podawany jako adapter { ensureFolder, find, upload, update, list(parentId), download(id) },
 * więc moduł zadziała w innej apce z innym dyskiem (ARCH-003).
 *
 * Zasady bezpieczeństwa danych:
 *  - raport bez potwierdzonych WSZYSTKICH trzech części na Dysku nigdy nie znika z telefonu,
 *  - przed utworzeniem nowego pliku szukamy w folderze pliku o tej samej nazwie (przerwa między wysłaniem a zapisem id
 *    nie robi duplikatu – ryzyko z docs/QUALITY.md, pkt 3),
 *  - plik na Dysku, którego już nie ma (404), jest tworzony od nowa.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OESTRaporty = api.createBrowser(root);
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var MB = 1024 * 1024;
  var LIMITS = { phoneLimitMB: 200, warnMB: 100, rootName: 'OEST Raporty' }; // i18n-ok: nazwa folderu na Dysku (stała, nie tekst ekranu)
  var DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  function complete(r) { return !!(r.driveId && r.drivePdfId && r.driveSnapId && !r.dirty); }

  // nazwy bezpieczne dla Androida i Dysku (jak w module zdjęć)
  function safe(s) { return String(s || '').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120); }
  function size(r) { return (r.docx ? r.docx.byteLength || r.docx.length || 0 : 0) + (r.pdf ? r.pdf.byteLength || r.pdf.length || 0 : 0); }

  /* Co zrobić przy limicie: z telefonu znikają najstarsze (wg ostatniej zmiany), tylko z aktualną kopią na Dysku. */
  function plan(recs, lim) {
    lim = Object.assign({}, LIMITS, lim || {});
    var total = 0; recs.forEach(function (r) { total += r.bytes || 0; });
    var limit = lim.phoneLimitMB * MB, remove = [];
    recs.slice().sort(function (a, b) { return a.updated < b.updated ? -1 : a.updated > b.updated ? 1 : 0; }).forEach(function (r) {
      if (total <= limit) return;
      if (r.keep || !complete(r)) return;
      remove.push(r.id); total -= r.bytes || 0;
    });
    return { remove: remove, bytes: total, over: total > limit };
  }

  function stats(recs, lim) {
    lim = Object.assign({}, LIMITS, lim || {});
    var s = { count: recs.length, bytes: 0, pending: 0, onDrive: 0, limitMB: lim.phoneLimitMB, warnMB: lim.warnMB };
    recs.forEach(function (r) { s.bytes += r.bytes || 0; if (!complete(r)) s.pending++; else s.onDrive++; });
    s.warn = s.bytes >= lim.warnMB * MB;
    return s;
  }

  /* deps: { db: { get(id), put(rec), del(id), all() }, owner(), now(), limits?, onChange? } */
  function createStore(deps) {
    var syncing = null, lim = Object.assign({}, LIMITS, deps.limits || {}), rootId = '', rootOwner = '', adapter = deps.drive || null;
    function accountRoot() { if (rootOwner !== deps.owner()) { rootId = ''; rootOwner = deps.owner(); } }
    // zapisy do bazy po kolei (zapis nowej wersji, zwalnianie miejsca, wynik wysyłki na Dysk): równoległy zapis nie zostanie skasowany
    var chain = Promise.resolve();
    function serial(fn) { var p = chain.then(fn); chain = p.catch(function () {}); return p; }
    function now() { return new Date(deps.now ? deps.now() : Date.now()).toISOString(); }
    function emit() { if (deps.onChange) try { deps.onChange(); } catch (e) {} }
    // „gone” = raport zwolniony z telefonu (jest na Dysku): zostaje mały ślad z nazwą pliku i id na Dysku, żeby inny raport nie dostał tej nazwy
    async function mine(all) { var me = deps.owner(); return (await deps.db.all()).filter(function (r) { return r.owner === me && (all || !r.gone); }); }

    /* Zapis po wysłaniu / Update. Ten sam raport (to samo konto + nazwa) = ten sam wpis i ten sam plik na Dysku. */
    function save(rep) { return serial(function () { return saveNow(rep); }); }
    async function saveNow(rep) {
      var me = deps.owner();
      if (!me) throw Error('ACCOUNT_REQUIRED');
      var name = safe(rep && rep.name);
      if (!name) throw Error('REPORT_NAME');
      if (!rep.docx || !(rep.docx.byteLength || rep.docx.length)) throw Error('REPORT_DOCX');
      // tożsamość raportu = klucz od apki (np. id zadania Reactive); bez klucza – nazwa „KOD DDMMRRRR” (jedna inspekcja na dzień)
      var key = safe(rep.key) || name, id = me + '|' + key, old = await deps.db.get(id), t = now();
      // spóźniony zapis starszej wysyłki (np. ponowienie po błędzie) nie zastępuje nowszej wersji ani w telefonie, ani na Dysku
      if (old && rep.at && old.at && rep.at < old.at) return old;
      var folder = (rep.folder || []).map(safe).filter(Boolean);
      var rec = {
        id: id, owner: me, name: name, key: key, at: rep.at || (old && old.at) || 0,
        file: old && old.file && old.name === name && (old.folder || []).join('/') === folder.join('/') ? old.file : await freeFile(me, id, name, folder),
        folder: folder,
        docx: rep.docx, pdf: rep.pdf || null,
        meta: rep.meta || (old && old.meta) || {},
        // dane inspekcji do „Odzyskaj do edycji” (etap 2c): odpowiedzi, pola i odnośniki do zdjęć – bez plików, kilka KB
        keep: !!(old && old.keep), snap: rep.snap || (old && old.snap) || null, rec: old ? old.rec || 0 : 0,
        created: old ? old.created : t, updated: t, versions: old ? (old.versions || 1) + 1 : 1,
        driveId: old ? old.driveId || '' : '', drivePdfId: old ? old.drivePdfId || '' : '', driveSnapId: old ? old.driveSnapId || '' : '',
        driveName: old ? old.driveName || '' : '', driveFolder: old ? old.driveFolder || '' : '', dirty: true, synced: old ? old.synced || '' : ''
      };
      rec.bytes = size(rec);
      await deps.db.put(rec); emit();
      await enforceNow(); // limit telefonu pilnowany także bez Dysku (znikają tylko raporty z aktualną kopią na Dysku)
      return rec;
    }

    /* Dwa różne raporty o tej samej nazwie w tym samym folderze (np. dwa „REACTIVE Leak 08112026”) dostają osobne pliki: „nazwa (2).docx”. */
    async function freeFile(me, id, name, folder) {
      var taken = {}, where = folder.join('/');
      (await deps.db.all()).forEach(function (r) { if (r.owner === me && r.id !== id && (r.folder || []).join('/') === where) taken[r.file || r.name] = 1; });
      var f = name, n = 1;
      while (taken[f]) f = name + ' (' + (++n) + ')';
      return f;
    }

    function enforce() { return serial(enforceNow); }
    async function enforceNow() {
      var p = plan(await mine(), lim);
      for (var i = 0; i < p.remove.length; i++) {
        var r = await deps.db.get(p.remove[i]);
        if (r && !r.gone && complete(r)) await deps.db.put(Object.assign({}, r, { docx: null, pdf: null, gone: true, bytes: 0 }));
      }
      if (p.remove.length) emit();
      return p;
    }

    /* Wysyła na Dysk (od najstarszych) raporty bez kopii albo zmienione; potem pilnuje limitu telefonu. */
    function sync(drive, o) {
      o = o || {};
      if (syncing) return syncing;
      adapter = drive;
      accountRoot();
      syncing = (async function () {
        var me = deps.owner(), folders = {}, sent = 0;
        function allowed() { return !o.allowed || o.allowed(); }
        async function folderId(parts) {
          if (!rootId) rootId = (await drive.ensureFolder(lim.rootName, '')).id;
          var parent = rootId, key = '';
          for (var i = 0; i < parts.length; i++) {
            key += '/' + parts[i];
            if (!folders[key]) folders[key] = (await drive.ensureFolder(parts[i], parent)).id;
            parent = folders[key];
          }
          return parent;
        }
        var todo = (await mine()).filter(function (r) { return !complete(r); })
          .sort(function (a, b) { return a.updated < b.updated ? -1 : 1; });
        for (var i = 0; i < todo.length; i++) {
          if (deps.owner() !== me) return { skipped: 'account', sent: sent };
          if (!allowed()) return { skipped: 'network', sent: sent };
          var r = todo[i], base = r.file || r.name, file = base + '.docx', parent;
          if (!r.pdf || !(r.pdf.byteLength || r.pdf.length)) throw Error('REPORT_PDF');
          try { parent = await folderId(r.folder); }
          catch (e) { if (rootId && /404/.test(String(e && e.message))) { rootId = ''; folders = {}; parent = await folderId(r.folder); } else throw e; }
          var parts = [
            { field: 'driveId', name: file, blob: toBlob(r.docx) },
            { field: 'drivePdfId', name: base + '.pdf', blob: toBlob(r.pdf, 'application/pdf') },
            { field: 'driveSnapId', name: base + '.json', blob: toBlob(JSON.stringify({ v: 1, key: r.key, name: r.name, file: base, folder: r.folder, at: r.at, meta: r.meta, snap: r.snap, created: r.created, updated: r.updated }), 'application/json') }
          ], ids = {};
          for (var j = 0; j < parts.length; j++) {
            if (deps.owner() !== me) return { skipped: 'account', sent: sent };
            if (!allowed()) return { skipped: 'network', sent: sent };
            var part = parts[j], up = null;
            if (r[part.field] && (!r.driveFolder || r.driveFolder === parent)) {
              try { up = await drive.update(r[part.field], part.blob, part.name); }
              catch (e) { if (!/404/.test(String(e && e.message))) throw e; }
            }
            if (!up) {
              var found = await drive.find(parent, part.name);
              up = found ? await drive.update(found.id, part.blob) : await drive.upload(parent, part.name, part.blob);
            }
            if (!up || !up.id) throw Error('REPORT_UPLOAD');
            ids[part.field] = up.id;
          }
          var stored = await serial(async function () {
            var fresh = await deps.db.get(r.id);
            if (!fresh || deps.owner() !== me) return false;
            if (fresh.versions !== r.versions) return false;
            Object.assign(fresh, ids); fresh.driveName = file; fresh.driveFolder = parent;
            fresh.dirty = false;
            fresh.synced = now();
            await deps.db.put(fresh); return true;
          });
          if (!stored) continue;
          sent++; emit();
        }
        return { sent: sent };
      })().finally(function () {
        syncing = null;
        // limit telefonu także po błędzie / przerwie Dysku (chronione: raporty bez aktualnej kopii)
        return enforce().catch(function () {}).then(emit);
      });
      return syncing;
    }

    function toBlob(bytes, type) { return typeof Blob !== 'undefined' ? new Blob([bytes], { type: type || DOCX }) : bytes; }

    async function driveList(drive) {
      drive = drive || adapter; if (!drive) throw Error('REPORT_DRIVE');
      adapter = drive;
      var me = deps.owner(); if (!me) throw Error('ACCOUNT_REQUIRED');
      accountRoot();
      if (!rootId) rootId = (await drive.ensureFolder(lim.rootName, '')).id;
      var out = [];
      async function walk(parent, path) {
        var files = await drive.list(parent);
        if (deps.owner() !== me) throw Error('GOOGLE_ACCOUNT_MISMATCH');
        for (var i = 0; i < files.length; i++) {
          var f = files[i];
          if (f.mimeType === 'application/vnd.google-apps.folder') { await walk(f.id, path.concat(f.name)); continue; }
          if (!/\.json$/.test(f.name)) continue;
          var base = f.name.slice(0, -5), word = files.find(function (x) { return x.name === base + '.docx'; }), pdf = files.find(function (x) { return x.name === base + '.pdf'; });
          if (word && pdf) out.push({ id: 'drive:' + f.id, owner: me, name: base, file: base, folder: path, driveId: word.id, drivePdfId: pdf.id, driveSnapId: f.id, driveFolder: parent, driveOnly: true });
        }
      }
      await walk(rootId, []); return out;
    }
    async function fromDrive(id, drive) {
      drive = drive || adapter; if (!drive) throw Error('REPORT_DRIVE');
      var me = deps.owner(), local = await deps.db.get(id), r;
      if (!me) throw Error('ACCOUNT_REQUIRED');
      if (local && local.owner === me && !local.gone) return local;
      var copies = await driveList(drive);
      r = copies.find(function (x) { return x.id === id || (local && local.owner === me && x.driveSnapId === local.driveSnapId); });
      if (!r) throw Error('REPORT_MISSING');
      var raw = await drive.download(r.driveSnapId), text = typeof raw === 'string' ? raw : new TextDecoder().decode(raw);
      var data = JSON.parse(text);
      if (data.v !== 1 || typeof data.key !== 'string' || !data.key || data.file !== r.file || !Array.isArray(data.folder) || data.folder.join('/') !== r.folder.join('/') || typeof data.name !== 'string') throw Error('REPORT_DATA');
      var docx = await drive.download(r.driveId), pdf = await drive.download(r.drivePdfId);
      if (!docx || !docx.byteLength || !pdf || !pdf.byteLength) throw Error('REPORT_DATA');
      return serial(async function () {
        if (deps.owner() !== me) throw Error('GOOGLE_ACCOUNT_MISMATCH');
        var key = me + '|' + data.key, current = await deps.db.get(key);
        if (current && !current.gone) return current;
        var rec = Object.assign({}, r, { id: key, key: data.key, name: data.name, at: data.at, meta: data.meta || {}, snap: data.snap || null, created: data.created, updated: data.updated, docx: docx, pdf: pdf, versions: current ? current.versions : 1, rec: current ? current.rec || 0 : 0, dirty: false, gone: false, driveOnly: false, synced: now() });
        rec.bytes = size(rec); await deps.db.put(rec); emit(); return rec;
      });
    }

    return {
      keep: function(id) { return serial(async function() { var r = await deps.db.get(id); if (!r || r.owner !== deps.owner() || r.gone) throw Error('REPORT_MISSING'); r.keep = true; await deps.db.put(r); emit(); return r; }); },
      save: save, sync: sync, enforce: enforce, zDysku: fromDrive, listaDysku: driveList,
      list: async function () { return (await mine()).sort(function (a, b) { return a.updated < b.updated ? 1 : -1; }); },
      get: async function (id) { var r = await deps.db.get(id); return r && r.owner === deps.owner() ? r : null; }, // tylko raporty zalogowanego konta (uwaga Codex #101)
      /* Odzyskane do edycji (etap 2c): klocek Raporty pokazuje je jak zwykłe inspekcje z pigułką „Odzyskana” – także te, których Word jest już tylko na Dysku. */
      recovered: async function () { return (await mine(true)).filter(function (r) { return r.rec && r.snap; }).sort(function (a, b) { return a.rec < b.rec ? 1 : -1; }); },
      setRec: function (id, on) {
        return serial(async function () {
          var r = await deps.db.get(id);
          if (!r || r.owner !== deps.owner()) throw Error('REPORT_MISSING');
          if (on && !r.snap) throw Error('REPORT_NO_DATA');
          r.rec = on ? r.rec || (deps.now ? deps.now() : Date.now()) : 0;
          await deps.db.put(r); emit(); return r;
        });
      },
      stats: async function () { return stats(await mine(), lim); },
      busy: function () { return !!syncing; },
      limits: function () { return Object.assign({}, lim); }
    };
  }

  function createBrowser(win) {
    function who() { return win.OESTKonto.email(); } // moduly/konto
    var dbP = null;
    function open() {
      if (!dbP) dbP = new Promise(function (res, rej) {
        var rq = win.indexedDB.open('oest-raporty', 1);
        rq.onupgradeneeded = function () { rq.result.createObjectStore('raporty', { keyPath: 'id' }); };
        rq.onsuccess = function () { res(rq.result); };
        rq.onerror = function () { dbP = null; rej(rq.error || Error('STORAGE_READ')); };
      });
      return dbP;
    }
    function tx(mode, fn) {
      return open().then(function (db) {
        return new Promise(function (res, rej) {
          var t = db.transaction('raporty', mode), out = fn(t.objectStore('raporty'));
          t.oncomplete = function () { res(out && out.result !== undefined ? out.result : undefined); };
          t.onerror = t.onabort = function () { rej(t.error || Error('STORAGE_WRITE')); };
        });
      });
    }
    var listeners = [];
    var store = createStore({
      db: {
        get: function (id) { return tx('readonly', function (s) { return s.get(id); }); },
        put: function (r) { return tx('readwrite', function (s) { s.put(r); }); },
        del: function (id) { return tx('readwrite', function (s) { s.delete(id); }); },
        all: function () { return tx('readonly', function (s) { return s.getAll(); }).then(function (a) { return a || []; }); }
      },
      owner: who,
      onChange: function () { listeners.forEach(function (f) { try { f(); } catch (e) {} }); try { win.dispatchEvent(new win.CustomEvent('oest:raporty')); } catch (e) {} }
    });
    store.onChange = function (f) { listeners.push(f); };
    var driveProvider = null;
    store.configure = function(o) { driveProvider = o.drive; };
    function drive() { if (!driveProvider) throw Error('REPORT_DRIVE'); return driveProvider(); }
    var download = store.zDysku, listDrive = store.listaDysku;
    store.zDysku = function (id) { return download(id, drive()); };
    store.listaDysku = function () { return listDrive(drive()); };
    store.find = find; store.day = day; store.docxPreview = docxPreview;
    return store;
  }

  /* Przeglądarka raportów (etap 2b): szukanie po słowach w nazwie, kodzie, PPM, folderze (budynek / rodzaj) i dacie dd/mm/rrrr; filtr budynku. */
  function day(r) {
    var t = r.meta && r.meta.sentAt || Date.parse(r.updated) || 0, d = new Date(t);
    if (!t) return '';
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  }
  function find(recs, q, f) {
    f = f || {};
    var words = String(q || '').toLowerCase().split(/\s+/).filter(Boolean);
    return recs.filter(function (r) {
      if (f.building && (r.folder || [])[0] !== f.building) return false;
      var m = r.meta || {}, hay = [r.name, (r.folder || []).join(' '), m.code, m.ppm, m.type, day(r), (r.file || '').replace(/(\d{2})(\d{2})(\d{4})(?!\d)/g, '$1/$2/$3')].join(' ').toLowerCase();
      return words.every(function (w) { return hay.indexOf(w) >= 0; });
    });
  }
  /* Podgląd Worda bez nowych bibliotek: tekst akapitów (komórki tabeli w wierszu razem) i zdjęcia z word/media. Zip = PizZip (jest w apce). */
  function docxPreview(bytes, Zip) {
    var z = new Zip(bytes), f = z.file('word/document.xml'), xml = f ? f.asText() : '', ent = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
    function txt(x) { return (x.match(/<w:t[^>]*>[^<]*<\/w:t>/g) || []).map(function (t) { return t.replace(/<[^>]+>/g, ''); }).join('').replace(/&(amp|lt|gt|quot|apos);/g, function (_, k) { return ent[k]; }); }
    var lines = [];
    xml.replace(/<w:tr[ >][\s\S]*?<\/w:tr>|<w:p[ >][\s\S]*?<\/w:p>/g, function (blk) {
      var t = /^<w:tr/.test(blk) ? (blk.match(/<w:tc[ >][\s\S]*?<\/w:tc>/g) || []).map(txt).filter(Boolean).join(' | ') : txt(blk);
      t = t.replace(/\s+/g, ' ').trim(); if (t) lines.push(t); return '';
    });
    var types = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif' };
    var images = z.file(/^word\/media\//).map(function (m) { var ext = (/\.([a-z]+)$/i.exec(m.name) || [])[1] || ''; return { name: m.name.replace(/^word\/media\//, ''), type: types[ext.toLowerCase()] || '', bytes: m.asUint8Array() }; })
      .filter(function (i) { return i.type; }).sort(function (a, b) { return a.name.localeCompare(b.name, undefined, { numeric: true }); });
    return { lines: lines, images: images };
  }

  return { createStore: createStore, createBrowser: createBrowser, plan: plan, stats: stats, safe: safe, LIMITS: LIMITS, find: find, day: day, docxPreview: docxPreview };
});
