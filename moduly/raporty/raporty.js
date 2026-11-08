/* Moduł raportów (moduly/raporty) – archiwum raportów na telefonie + kopia Word na Dysku Google.
 *
 * Ustalenia Grzegorza 08/11/2026:
 *  - mail dostaje Word + PDF (bez zmian, robi to moduł wysyłki); na Dysk idzie TYLKO Word,
 *  - jeden raport = jeden plik na Dysku; ponowna wysyłka (albo „Update”) nadpisuje ten sam plik – na Dysku zawsze tylko ostatnia wersja,
 *  - folder: OEST Raporty / budynek / rodzaj inspekcji, nazwa pliku jak raport („KOD DDMMRRRR.docx”),
 *  - na telefonie raporty (Word + PDF) bez limitu dni; po przekroczeniu 200 MB znikają najstarsze, i tylko te, które są już na Dysku;
 *    od 100 MB ostrzeżenie (jak w module zdjęć).
 *
 * Apka woła:  OESTRaporty.save({ name, docx, pdf, folder: [budynek, rodzaj], meta })  – po wysłaniu maila (albo „Update”)
 *             OESTRaporty.sync(drive, { allowed })  – wysyła na Dysk raporty, których tam jeszcze nie ma albo które się zmieniły
 *             OESTRaporty.list() / get(id) / stats()
 * Dysk jest podawany z zewnątrz jako adapter { ensureFolder(name, parentId), find(parentId, name), upload(parentId, name, blob), update(id, blob) },
 * więc moduł zadziała w innej apce z innym dyskiem (ARCH-003).
 *
 * Zasady bezpieczeństwa danych:
 *  - raport bez potwierdzonej kopii na Dysku nigdy nie znika z telefonu,
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
      if (!r.driveId || r.dirty) return; // niewysłanego albo zmienionego (stara wersja na Dysku) nie kasujemy nigdy
      remove.push(r.id); total -= r.bytes || 0;
    });
    return { remove: remove, bytes: total, over: total > limit };
  }

  function stats(recs, lim) {
    lim = Object.assign({}, LIMITS, lim || {});
    var s = { count: recs.length, bytes: 0, pending: 0, onDrive: 0, limitMB: lim.phoneLimitMB, warnMB: lim.warnMB };
    recs.forEach(function (r) { s.bytes += r.bytes || 0; if (!r.driveId || r.dirty) s.pending++; else s.onDrive++; });
    s.warn = s.bytes >= lim.warnMB * MB;
    return s;
  }

  /* deps: { db: { get(id), put(rec), del(id), all() }, owner(), now(), limits?, onChange? } */
  function createStore(deps) {
    var syncing = null, lim = Object.assign({}, LIMITS, deps.limits || {}), rootId = '';
    function now() { return new Date(deps.now ? deps.now() : Date.now()).toISOString(); }
    function emit() { if (deps.onChange) try { deps.onChange(); } catch (e) {} }
    async function mine() { var me = deps.owner(); return (await deps.db.all()).filter(function (r) { return r.owner === me; }); }

    /* Zapis po wysłaniu / Update. Ten sam raport (to samo konto + nazwa) = ten sam wpis i ten sam plik na Dysku. */
    async function save(rep) {
      var me = deps.owner();
      if (!me) throw Error('ACCOUNT_REQUIRED');
      var name = safe(rep && rep.name);
      if (!name) throw Error('REPORT_NAME');
      if (!rep.docx || !(rep.docx.byteLength || rep.docx.length)) throw Error('REPORT_DOCX');
      // tożsamość raportu = klucz od apki (np. id zadania Reactive); bez klucza – nazwa „KOD DDMMRRRR” (jedna inspekcja na dzień)
      var key = safe(rep.key) || name, id = me + '|' + key, old = await deps.db.get(id), t = now();
      var folder = (rep.folder || []).map(safe).filter(Boolean);
      var rec = {
        id: id, owner: me, name: name, key: key,
        file: old && old.file && old.name === name && (old.folder || []).join('/') === folder.join('/') ? old.file : await freeFile(me, id, name, folder),
        folder: folder,
        docx: rep.docx, pdf: rep.pdf || null,
        meta: rep.meta || (old && old.meta) || {},
        created: old ? old.created : t, updated: t, versions: old ? (old.versions || 1) + 1 : 1,
        driveId: old ? old.driveId || '' : '', dirty: true, synced: old ? old.synced || '' : ''
      };
      rec.bytes = size(rec);
      await deps.db.put(rec); emit();
      await enforce(); // limit telefonu pilnowany także bez Dysku (znikają tylko raporty z aktualną kopią na Dysku)
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

    async function enforce() {
      var p = plan(await mine(), lim);
      for (var i = 0; i < p.remove.length; i++) await deps.db.del(p.remove[i]);
      if (p.remove.length) emit();
      return p;
    }

    /* Wysyła na Dysk (od najstarszych) raporty bez kopii albo zmienione; potem pilnuje limitu telefonu. */
    function sync(drive, o) {
      o = o || {};
      if (syncing) return syncing;
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
        var todo = (await mine()).filter(function (r) { return r.dirty || !r.driveId; })
          .sort(function (a, b) { return a.updated < b.updated ? -1 : 1; });
        for (var i = 0; i < todo.length; i++) {
          if (deps.owner() !== me) return { skipped: 'account', sent: sent };
          if (!allowed()) return { skipped: 'network', sent: sent };
          var r = todo[i], file = (r.file || r.name) + '.docx', blob = toBlob(r.docx), up = null, parent;
          try { parent = await folderId(r.folder); }
          catch (e) { if (rootId && /404/.test(String(e && e.message))) { rootId = ''; folders = {}; parent = await folderId(r.folder); } else throw e; }
          if (r.driveId) {
            try { up = await drive.update(r.driveId, blob); }
            catch (e) { if (!/404/.test(String(e && e.message))) throw e; up = null; } // plik usunięty z Dysku: tworzymy od nowa
          }
          if (!up) {
            var found = await drive.find(parent, file); // przerwany wcześniej upload: ten sam plik, bez duplikatu (nazwa pliku jest unikalna dla raportu)
            up = found ? await drive.update(found.id, blob) : await drive.upload(parent, file, blob);
          }
          var fresh = await deps.db.get(r.id);
          if (!fresh) continue;
          fresh.driveId = up.id;
          if (fresh.updated === r.updated) fresh.dirty = false; // zmiana w trakcie wysyłki: zostaje do następnej rundy
          fresh.synced = now();
          await deps.db.put(fresh); sent++; emit();
        }
        return { sent: sent };
      })().finally(function () {
        syncing = null;
        // limit telefonu także po błędzie / przerwie Dysku (chronione: raporty bez aktualnej kopii)
        return enforce().catch(function () {}).then(emit);
      });
      return syncing;
    }

    function toBlob(bytes) { return typeof Blob !== 'undefined' ? new Blob([bytes], { type: DOCX }) : bytes; }

    return {
      save: save, sync: sync, enforce: enforce,
      list: async function () { return (await mine()).sort(function (a, b) { return a.updated < b.updated ? 1 : -1; }); },
      get: function (id) { return deps.db.get(id); },
      stats: async function () { return stats(await mine(), lim); },
      busy: function () { return !!syncing; },
      limits: function () { return Object.assign({}, lim); }
    };
  }

  function createBrowser(win) {
    function who() { try { var a = JSON.parse(win.localStorage.getItem('oest.account') || 'null'); return a && a.email ? String(a.email).toLowerCase() : ''; } catch (_) { return ''; } }
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
    return store;
  }

  return { createStore: createStore, createBrowser: createBrowser, plan: plan, stats: stats, safe: safe, LIMITS: LIMITS };
});
