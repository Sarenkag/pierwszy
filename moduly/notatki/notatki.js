/* Notatki głosowe (OESTNotatki) – jeden moduł zapisu, odczytu i poprawiania notatek (Grzegorz 08/11/2026).
   Przytrzymaj 🎤 i mów → apka sama: nagranie → tekst PL (offline) → poprawa słów branżowych → tłumaczenie PL→EN (ML Kit)
   → model układa zdanie (gdy pobrany) → sprawdzenie liczb. Notatki leżą w telefonie (IndexedDB „oest-notatki”), osobno dla
   każdego miejsca (scope, np. szkic inspekcji). Okienko „Notatki”: lista, odsłuchanie, poprawa PL/EN, usunięcie.
   Nic nie trafia do raportu samo – „Połącz notatki” daje tylko propozycję tekstu.
   Zależności: OESTVoice (moduly/notatki/glos.js), OESTPrzycisk (okienko), opcjonalnie OESTModel i wtyczka Translate. */
(function (w) {
  'use strict';
  function T(pl, en) { return w.OESTT ? w.OESTT(pl, en) : pl; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // ---------- jakość tekstu: słowa branżowe (rozpoznawanie mowy i tłumacz mylą je najczęściej) ----------
  // PL: po rozpoznaniu mowy, przed tłumaczeniem. EN: po tłumaczeniu i po modelu. Dopisuj tu kolejne pary.
  var WORDS = {
    pl: [
      // „stopnie” → °C tylko przy temperaturze: „celsjusza” albo słowo o temperaturze w tym samym zdaniu; kąt („pod kątem 90 stopni”) zostaje
      [/(\d+(?:[.,]\d+)?)\s*(?:stopni(?:e|a)?|st\.)(\s*celsjusza)?(?![\p{L}])/giu, function (m, n, c, at, all) {
        if (c) return n + ' °C';
        var a = all.lastIndexOf('.', at - 1), b2 = all.slice(at).search(/[.!?;\n]/), zd = all.slice(a + 1, b2 < 0 ? all.length : at + b2 + 1).toLowerCase();
        return /temperatur|ciepł|zimn|gorąc|wod|kran|termometr|cwu|zwu|°c/.test(zd) && !/kąt|obr[oó]t|obróc|nachyl/.test(zd) ? n + ' °C' : m;
      }],
      [/(^|[^\p{L}])a\s?o\s?w(?![\p{L}])/giu, '$1AOV'],
      [/(^|[^\p{L}])de\s?be(?![\p{L}])/giu, '$1DB'],
      [/(^|[^\p{L}])a\s?h\s?u(?![\p{L}])/giu, '$1AHU'],
      [/(^|[^\p{L}])te\s?em\s?wu(?![\p{L}])/giu, '$1TMV'],
      [/(^|[^\p{L}])pe\s?pe\s?em(?![\p{L}])/giu, '$1PPM']
    ],
    en: [
      [/\binsulator(s?)\b/g, 'isolator$1'], [/\bInsulator(s?)\b/g, 'Isolator$1'],
      [/\bfaucet(s?)\b/g, 'tap$1'], [/\bFaucet(s?)\b/g, 'Tap$1'],
      [/\belevator(s?)\b/g, 'lift$1'], [/\bElevator(s?)\b/g, 'Lift$1'],
      [/\baluminum\b/g, 'aluminium'],
      [/(\d)\s*(?:degrees? Celsius|degrees? C\b|°\s?C\b)/g, '$1 °C']
    ]
  };
  function fix(text, lang) {
    var s = String(text || '');
    (WORDS[lang] || []).forEach(function (r) { s = s.replace(r[0], r[1]); });
    return s.replace(/[ \t]+/g, ' ').trim();
  }
  // liczby z oryginału, których brakuje w tekście EN (ostrzeżenie, nie blokada); jedna reguła z modułu modelu
  function missing(pl, en) {
    if (w.OESTModel && w.OESTModel.missingNumbers) return w.OESTModel.missingNumbers(pl, en);
    var re = /[-−]?\d+(?:[.,]\d+)?/g, norm = function (n) { return n.replace(',', '.').replace('−', '-'); }, have = {}, miss = [];
    (String(en || '').match(re) || []).forEach(function (n) { have[norm(n)] = 1; });
    (String(pl || '').match(re) || []).forEach(function (n) { if (!have[norm(n)] && miss.indexOf(n) < 0) miss.push(n); });
    return miss;
  }
  // stan notatki z jej treści: ready = EN gotowy; check = EN bez którejś liczby; pl = tylko polski; audio = samo nagranie
  function state(n) {
    if (n.st === 'busy') return 'busy'; // przerwane (apka zamknięta w trakcie) wznawia resume()
    if (String(n.en || '').trim()) return missing(n.pl, n.en).length ? 'check' : 'ready';
    if (String(n.pl || '').trim()) return 'pl';
    return n.err ? 'error' : 'audio';
  }

  // ---------- magazyn w telefonie ----------
  var mem = { notes: {}, audio: {} }, dbP = null;
  function db() {
    if (dbP) return dbP;
    dbP = new Promise(function (res) {
      try {
        var rq = w.indexedDB.open('oest-notatki', 1);
        rq.onupgradeneeded = function () { var d = rq.result; d.createObjectStore('notes', { keyPath: 'id' }).createIndex('scope', 'scope'); d.createObjectStore('audio'); };
        rq.onsuccess = function () { res(rq.result); }; rq.onerror = function () { res(null); };
      } catch (e) { res(null); }
    }).then(function (d) {
      if (!d) dbP = null; // następna próba otworzy bazę od nowa
      return d;
    });
    return dbP;
  }
  function tx(store, mode, fn) {
    return db().then(function (d) {
      // bez bazy w telefonie nic nie udajemy: zapis = błąd (pamięć RAM tylko w testach, notatkiPamiecTestowa)
      if (!d) { if (w.notatkiPamiecTestowa) return fn(null, mem[store]); throw Error(T('Nie udało się zapisać notatki w telefonie (pamięć apki niedostępna). Spróbuj jeszcze raz.', 'Could not save the note on the phone (app storage unavailable). Try again.')); }
      return new Promise(function (res, rej) {
        var t = d.transaction(store, mode), out = fn(t.objectStore(store));
        t.oncomplete = function () { res(w.IDBRequest && out instanceof w.IDBRequest ? out.result : out); };
        t.onerror = t.onabort = function () { rej(t.error); };
      });
    });
  }
  function list(scope) {
    if (!scope) return Promise.resolve([]);
    return tx('notes', 'readonly', function (s, m) { return m ? Object.keys(m).map(function (k) { return cp(m[k]); }).filter(function (n) { return n.scope === scope; }) : s.index('scope').getAll(scope); })
      .then(function (a) { return (a || []).slice().sort(function (x, y) { return x.at - y.at || (x.seq || 0) - (y.seq || 0); }); });
  }
  function cp(n) { return JSON.parse(JSON.stringify(n)); } // pamięć testowa oddaje kopie jak IndexedDB
  function put(n) { return tx('notes', 'readwrite', function (s, m) { if (m) m[n.id] = cp(n); else s.put(n); }).then(function () { emit(n.scope); return n; }); }
  function audioGet(id) { return tx('audio', 'readonly', function (s, m) { return m ? m[id] : s.get(id); }); }
  function audioPut(id, blob) { return tx('audio', 'readwrite', function (s, m) { if (m) m[id] = blob; else s.put(blob, id); }); }
  function remove(n) {
    return tx('audio', 'readwrite', function (s, m) { (n.audio || []).forEach(function (a) { if (m) delete m[a]; else s.delete(a); }); })
      .then(function () { return tx('notes', 'readwrite', function (s, m) { if (m) delete m[n.id]; else s.delete(n.id); }); })
      .then(function () { emit(n.scope); });
  }
  function clear(scope) { delete szkice[scope]; return list(scope).then(function (a) { return a.reduce(function (p, n) { return p.then(function () { return remove(n); }); }, Promise.resolve()); }); }
  // szkic inspekcji przechodzi do archiwum (nowy termin): jego notatki idą razem z nim
  function move(from, to) { return list(from).then(function (a) { return Promise.all(a.map(function (n) { n.scope = to; return put(n); })).then(function () { emit(from); }); }); }
  // notatka „zamieniam na tekst” z poprzedniego uruchomienia (apka zamknięta w trakcie): zamiana rusza od nowa z zapisanego nagrania
  var running = {}, szkice = {}; // szkice: niezapisana poprawka, gdy okienko zamknięto gestem Wstecz / obok okienka (wraca przy następnym otwarciu)
  function resume(a) {
    a.forEach(function (n) {
      if (n.st !== 'busy' || running[n.id]) return; running[n.id] = 1;
      queue = queue.then(function () { return audioGet(n.audio && n.audio[0]).then(function (blob) {
        if (blob) return transcribe(n, blob);
        n.st = ''; n.err = T('Brak nagrania – wpisz tekst w „Popraw”.', 'Recording missing – type the text in “Edit”.'); return keep(n);
      }); }).catch(function () {}).then(function () { delete running[n.id]; });
    });
    return a;
  }
  function summary(scope) {
    return list(scope).then(resume).then(function (a) { var r = { all: a.length, ready: 0, busy: 0 }; a.forEach(function (n) { var s = state(n); if (s === 'busy') r.busy++; else if (s === 'ready' || s === 'check') r.ready++; }); return r; });
  }
  var subs = [];
  function on(fn) { subs.push(fn); return function () { subs = subs.filter(function (f) { return f !== fn; }); }; }
  function emit(scope) { subs.slice().forEach(function (f) { try { f(scope); } catch (e) {} }); }

  // ---------- tekst: mowa → PL → EN → model ----------
  function native() { var C = w.Capacitor; return !!(C && C.isNativePlatform && C.isNativePlatform()); }
  var trP = null;
  function translator() { if (!native()) return null; if (!trP) { var C = w.Capacitor; trP = C.registerPlugin ? C.registerPlugin('Translate') : C.Plugins && C.Plugins.Translate; } return trP || null; }
  function modelReady() { return w.OESTModel && w.OESTModel.available && w.OESTModel.available() ? w.OESTModel.ready() : Promise.resolve(false); }
  // PL (już poprawiony) → EN: tłumacz, słowa branżowe, potem model (gdy pobrany) z kontekstem miejsca
  function english(pl, ctx) {
    var tr = translator(); if (!pl || !tr) return Promise.resolve('');
    return tr.plToEn({ text: pl }).then(function (r) { return fix(r && r.text, 'en'); }, function () { return ''; }).then(function (en) {
      if (!en) return '';
      return modelReady().then(function (ok) {
        if (!ok) return en;
        return w.OESTModel.polish(en, pl, ctx).then(function (out) { return fix(out, 'en') || en; }, function () { return en; });
      });
    });
  }
  var voice = null, queue = Promise.resolve(), seq = 0;
  function vc() {
    if (voice || !w.OESTVoice) return voice;
    voice = w.OESTVoice.create({ maxMs: 120000, onAudio: function (media) { return pending && pending(media); }, onError: function (e) { if (pendingErr) pendingErr(e); } });
    return voice;
  }
  var pending = null, pendingErr = null;
  // nagranie → nowa notatka; tekst powstaje w tle (kolejka: jedno rozpoznawanie naraz)
  function addAudio(scope, ctx, media) {
    var id = 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), aid = id + '-a1';
    var n = { id: id, scope: scope, at: Date.now(), seq: ++seq, ctx: ctx || '', ms: media.ms || 0, audio: [aid], pl: '', en: '', st: 'busy', err: '' };
    return audioPut(aid, media.blob).then(function () { return put(n); }).then(function () {
      running[id] = 1;
      queue = queue.then(function () { return transcribe(n, media.blob); }).catch(function () {}).then(function () { delete running[id]; });
      return n;
    });
  }
  // rozpoznawanie rusza dopiero, gdy nagrywanie całkiem się zamknęło (OESTVoice nie zamienia w trakcie nagrania)
  function idle(v) { return new Promise(function (r) { (function t() { if (!v || !v.busy) r(); else setTimeout(t, 50); })(); }); }
  function transcribe(n, blob) {
    var v = vc();
    var p = native() && v ? idle(v).then(function () { return v.transcribe(blob); }).then(function (r) { return fix(r && r.text, 'pl'); }) : Promise.reject(Error(T('Zamiana nagrania na tekst działa w apce na telefonie. Możesz wpisać tekst w „Popraw”.', 'Turning a recording into text works in the phone app. You can type the text in “Edit”.')));
    return p.then(function (pl) {
      n.pl = pl; n.err = pl ? '' : T('Nie rozpoznano słów. Odsłuchaj nagranie i wpisz tekst w „Popraw”.', 'No words recognised. Listen to the recording and type the text in “Edit”.');
      return english(pl, n.ctx);
    }).then(function (en) { n.en = en || ''; }, function (e) { n.err = e && e.message || String(e); })
      .then(function () { n.st = ''; return keep(n); });
  }
  // wynik zamiany zapisujemy tylko, gdy notatka nadal istnieje (usunięta albo „Wyczyść inspekcję” w trakcie – nie wraca)
  // miejsce (scope) bierzemy z zapisanego rekordu: notatka przeniesiona w trakcie do archiwum terminu zostaje w archiwum
  function keep(n) {
    return tx('notes', 'readonly', function (s, m) { return m ? m[n.id] : s.get(n.id); }).then(function (cur) { if (!cur) return n; n.scope = cur.scope; return put(n); });
  }
  // przycisk „🎤 Nagraj notatkę”: przytrzymaj = nagrywa do puszczenia; stuknij = do „Zakończ”. Jeden przycisk na stronę.
  // o: { scope(): string, ctx(): string, onSaved(note), onError(err) }
  function bind(btn, o) {
    var v = vc(); if (!btn || !v) return null;
    pending = function (media) {
      var scope = o.scope && o.scope(); if (!scope) { if (o.onError) o.onError(Error(T('Najpierw otwórz inspekcję.', 'Open an inspection first.'))); return; }
      return addAudio(scope, o.ctx ? o.ctx() : '', media).then(function (n) { if (o.onSaved) o.onSaved(n); }, function (e) { if (o.onError) o.onError(e); });
    };
    pendingErr = function (e) { if (o.onError) o.onError(e); };
    return w.OESTVoice.holdButton(btn, v, function (e) { if (o.onError) o.onError(e); });
  }

  // ---------- połączenie notatek w jeden tekst (propozycja do komentarza) ----------
  function combine(scope, ctx) {
    return list(scope).then(function (a) {
      var ens = a.filter(function (n) { return state(n) === 'ready' || state(n) === 'check'; }).map(function (n) { return n.en.trim(); });
      if (!ens.length) throw Error(T('Brak notatek z tekstem po angielsku.', 'No notes with English text.'));
      var plain = ens.map(function (s) { return /[.!?]$/.test(s) ? s : s + '.'; }).join(' ');
      if (ens.length < 2) return plain;
      return modelReady().then(function (ok) {
        if (!ok) return plain;
        var pls = a.map(function (n) { return n.pl; }).filter(Boolean).join('\n');
        return w.OESTModel.combine(ens, pls, ctx).then(function (out) { return fix(out, 'en') || plain; }, function () { return plain; });
      });
    });
  }

  // ---------- okienko „Notatki” ----------
  var CSS = '.nt-pop{display:flex;flex-direction:column;gap:8px;font:15px/1.4 var(--font-body,system-ui),sans-serif;color:var(--ink,#eef1ff)}' +
    '.nt-pop .nt-h{color:var(--muted,#9aa3cc);font-size:13px;margin:-2px 0 2px}' +
    '.nt-note{border:1px solid var(--line,rgba(255,255,255,.12));background:rgba(255,255,255,.05);border-radius:14px;padding:10px}' +
    '.nt-m{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:12px;color:var(--muted,#9aa3cc);margin-bottom:5px}' +
    '.nt-tag{flex:none;font-size:11px;padding:1px 8px;border-radius:9px;border:1px solid rgba(61,220,132,.6);color:var(--ok,#3ddc84)}.nt-tag.w{border-color:rgba(255,210,63,.6);color:var(--warn,#ffd23f)}.nt-tag.g{border-color:var(--line,rgba(255,255,255,.2));color:var(--muted,#9aa3cc)}' +
    '.nt-en{font-size:14.5px}.nt-pl{font-size:12.5px;color:var(--muted,#9aa3cc);margin-top:4px;font-style:italic}.nt-err{font-size:12.5px;color:var(--warn,#ffd23f);margin-top:4px}' +
    '.nt-ic{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:8px}.nt-ic button,.nt-tabs button,.nt-row button{min-height:40px;border-radius:12px;border:1px solid var(--line,rgba(255,255,255,.18));background:rgba(255,255,255,.05);color:var(--ink,#fff);font:600 14px var(--font-body,system-ui),sans-serif}' +
    '.nt-ic button.del{color:var(--bad,#ff4d5e)}.nt-ic button.del.sure{background:rgba(255,77,94,.18);border-color:rgba(255,77,94,.7)}' +
    '.nt-tabs{display:grid;grid-template-columns:1fr 1fr;gap:6px}.nt-tabs button.on{background:rgba(124,132,255,.25);border-color:rgba(124,132,255,.7)}' +
    '.nt-pop textarea{width:100%;box-sizing:border-box;min-height:110px;border-radius:12px;padding:10px;background:rgba(255,255,255,.07);border:1px solid rgba(124,132,255,.7);color:var(--ink,#fff);font:15px/1.4 var(--font-body,system-ui),sans-serif;resize:vertical}' +
    '.nt-warn{color:var(--warn,#ffd23f);font-size:13px;min-height:1.4em}.nt-row{display:grid;grid-template-columns:1fr 1fr;gap:6px}.nt-row button.go{border:0;background:linear-gradient(90deg,#5b7cff,#a35bff);color:#fff}' +
    '.nt-empty{color:var(--muted,#9aa3cc);text-align:center;padding:14px 0}';
  function css() { if (document.getElementById('oest-notatki-css')) return; var s = document.createElement('style'); s.id = 'oest-notatki-css'; s.textContent = CSS; document.head.appendChild(s); }
  function clock(ms) { var s = Math.round((ms || 0) / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function hhmm(t) { var d = new Date(t); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function tag(s) {
    if (s === 'ready') return '<span class="nt-tag">' + T('✓ gotowa', '✓ ready') + '</span>';
    if (s === 'check') return '<span class="nt-tag w">' + T('⚠ sprawdź liczby', '⚠ check numbers') + '</span>';
    if (s === 'busy') return '<span class="nt-tag g">' + T('zamieniam na tekst…', 'turning into text…') + '</span>';
    if (s === 'pl') return '<span class="nt-tag w">' + T('tylko po polsku', 'Polish only') + '</span>';
    return '<span class="nt-tag w">' + T('bez tekstu', 'no text') + '</span>';
  }
  // open(scope, { title }) → Promise (zamknięcie okienka)
  function open(scope, o) {
    o = o || {}; css();
    var node = document.createElement('div'); node.className = 'nt-pop';
    var editing = null, tab = 'en', player = null, playing = '', sure = '';
    function stop() { if (player) { try { player.pause(); } catch (e) {} URL.revokeObjectURL(player.src); player = null; } playing = ''; }
    function draw() {
      if (editing) return drawEdit();
      foot(true);
      list(scope).then(resume).then(function (a) {
        if (editing) return;
        var h = '<div class="nt-h">' + esc(o.title || '') + (a.length ? ' · ' + T('stuknij „Popraw”, żeby zmienić tekst', 'tap “Edit” to change the text') : '') + '</div>';
        if (!a.length) h += '<div class="nt-empty">' + T('Brak notatek. Przytrzymaj „🎤 Nagraj notatkę” i mów.', 'No notes yet. Hold “🎤 Record note” and speak.') + '</div>';
        a.forEach(function (n) {
          var s = state(n), miss = s === 'check' ? missing(n.pl, n.en) : [];
          h += '<div class="nt-note" data-id="' + esc(n.id) + '"><div class="nt-m"><span>' + hhmm(n.at) + (n.ctx ? ' · ' + esc(n.ctx) : '') + (n.audio && n.audio.length ? ' · ' + clock(n.ms) : '') + '</span>' + tag(s) + '</div>' +
            (n.en ? '<div class="nt-en">' + esc(n.en) + '</div>' : '') +
            (n.pl ? '<div class="nt-pl">„' + esc(n.pl) + '”</div>' : '') +
            (miss.length ? '<div class="nt-err">' + T('W oryginale jest: ', 'The original has: ') + esc(miss.join(', ')) + T(' – w tekście EN tego brak.', ' – missing in the English text.') + '</div>' : '') +
            (n.err && !n.pl ? '<div class="nt-err">' + esc(n.err) + '</div>' : '') +
            '<div class="nt-ic">' + (n.audio && n.audio.length ? '<button type="button" data-nt="play">' + (playing === n.id ? '■ ' + T('Stop', 'Stop') : '▶ ' + clock(n.ms)) + '</button>' : '<button type="button" disabled>—</button>') +
            '<button type="button" data-nt="edit"' + (s === 'busy' ? ' disabled' : '') + '>' + T('✎ Popraw', '✎ Edit') + '</button>' +
            '<button type="button" class="del' + (sure === n.id ? ' sure' : '') + '" data-nt="del" aria-label="' + T('Usuń notatkę', 'Delete note') + '"' + (s === 'busy' ? ' disabled' : '') + '>' + (sure === n.id ? T('Usunąć?', 'Delete?') : '🗑') + '</button></div></div>';
        });
        node.innerHTML = h;
      });
    }
    // w trakcie poprawiania okienko ma tylko Anuluj/Zapisz (bez „Zamknij”, które zgubiłoby poprawkę)
    function foot(show) { var box = node.closest('.oest-ask'), r = box && box.querySelector(':scope>div>.row'); if (r) r.style.display = show ? '' : 'none'; }
    function drawEdit() {
      var n = editing; foot(false);
      // przerysowanie (odsłuch, stop) nie gubi tego, co już wpisane
      var fp = node.querySelector('[data-nt-f=pl]'), fe = node.querySelector('[data-nt-f=en]'); if (fp && fe) { n.pl = fp.value; n.en = fe.value; }
      node.innerHTML = '<div class="nt-h">' + T('✎ Popraw notatkę', '✎ Edit note') + ' · ' + hhmm(n.at) + (n.ctx ? ' · ' + esc(n.ctx) : '') + '</div>' +
        '<div class="nt-tabs"><button type="button" data-nt="tab-pl"' + (tab === 'pl' ? ' class="on"' : '') + '>' + T('Po polsku (oryginał)', 'Polish (original)') + '</button><button type="button" data-nt="tab-en"' + (tab === 'en' ? ' class="on"' : '') + '>' + T('Po angielsku (do raportu)', 'English (for the report)') + '</button></div>' +
        '<textarea data-nt-f="pl" maxlength="4000"' + (tab === 'pl' ? '' : ' hidden') + '></textarea><textarea data-nt-f="en" maxlength="4000"' + (tab === 'en' ? '' : ' hidden') + '></textarea>' +
        '<div class="nt-warn"></div>' +
        '<div class="nt-row"><button type="button" data-nt="redo">' + T('✨ Ułóż z polskiego', '✨ Rewrite from Polish') + '</button>' + (n.audio && n.audio.length ? '<button type="button" data-nt="play">' + (playing === n.id ? '■ ' + T('Stop', 'Stop') : '▶ ' + clock(n.ms)) + '</button>' : '<span></span>') + '</div>' +
        '<div class="nt-row"><button type="button" data-nt="cancel">' + T('Anuluj', 'Cancel') + '</button><button type="button" class="go" data-nt="save">' + T('Zapisz', 'Save') + '</button></div>';
      node.querySelector('[data-nt-f=pl]').value = n.pl || ''; node.querySelector('[data-nt-f=en]').value = n.en || '';
      warn();
    }
    function warn() {
      var pl = node.querySelector('[data-nt-f=pl]'), en = node.querySelector('[data-nt-f=en]'), box = node.querySelector('.nt-warn'); if (!pl || !box) return;
      var m = en.value.trim() ? missing(pl.value, en.value) : [];
      box.textContent = m.length ? T('⚠ W oryginale jest „', '⚠ The original has “') + m.join('”, „') + T('”, a w tekście EN nie ma. Dopisz albo zostaw.', '” but the English text does not. Add it or leave it.') : '';
    }
    node.addEventListener('input', warn);
    node.addEventListener('click', function (e) {
      var b = e.target.closest('[data-nt]'); if (!b) { if (sure) { sure = ''; draw(); } return; }
      var a = b.getAttribute('data-nt'), card = b.closest('[data-id]'), id = editing ? editing.id : card && card.getAttribute('data-id');
      if (a !== 'del' && sure) sure = '';
      if (a === 'tab-pl' || a === 'tab-en') { var pl = node.querySelector('[data-nt-f=pl]').value, en = node.querySelector('[data-nt-f=en]').value; editing.pl = pl; editing.en = en; tab = a.slice(4); drawEdit(); return; }
      if (a === 'cancel') { editing = null; delete szkice[scope]; stop(); draw(); return; }
      if (a === 'save') {
        // edycja kończy się dopiero po udanym zapisie; błąd zapisu = komunikat i formularz zostaje do ponowienia
        var n = editing, c = Object.assign({}, n, { pl: node.querySelector('[data-nt-f=pl]').value.trim(), en: node.querySelector('[data-nt-f=en]').value.trim(), err: '', st: '' });
        b.disabled = true;
        put(c).then(function () { if (editing !== n) return; editing = null; delete szkice[scope]; stop(); draw(); }, function (e) {
          b.disabled = false; var box = node.querySelector('.nt-warn');
          if (box) box.textContent = T('⚠ Nie zapisano: ', '⚠ Not saved: ') + (e && e.message || String(e)) + T(' Stuknij „Zapisz” jeszcze raz.', ' Tap “Save” again.');
        });
        return;
      }
      if (a === 'redo') {
        var plv = fix(node.querySelector('[data-nt-f=pl]').value, 'pl'), box = node.querySelector('.nt-warn');
        if (!plv) { box.textContent = T('Najpierw wpisz tekst po polsku.', 'Type the Polish text first.'); return; }
        if (!translator()) { box.textContent = T('Tłumacz działa w apce na telefonie.', 'The translator works in the phone app.'); return; }
        b.disabled = true; box.textContent = T('Układam po angielsku…', 'Writing in English…');
        var ed = editing; // wynik tylko do tej samej edycji tej samej notatki (nie po Anuluj ani do innej notatki)
        english(plv, ed.ctx).then(function (out) {
          if (editing !== ed || !node.isConnected) return;
          node.querySelector('[data-nt-f=pl]').value = plv; node.querySelector('[data-nt-f=en]').value = out || node.querySelector('[data-nt-f=en]').value;
          tab = 'en'; editing.pl = plv; editing.en = node.querySelector('[data-nt-f=en]').value; drawEdit();
          if (!out) node.querySelector('.nt-warn').textContent = T('Tłumaczenie nie wyszło – popraw ręcznie.', 'Translation failed – edit by hand.');
        });
        return;
      }
      list(scope).then(function (all) {
        var n = all.filter(function (x) { return x.id === id; })[0]; if (!n) return;
        if (a === 'edit') { stop(); editing = n; tab = n.en ? 'en' : 'pl'; drawEdit(); return; }
        if (a === 'del') { if (sure !== n.id) { sure = n.id; draw(); return; } sure = ''; if (playing === n.id) stop(); remove(n).then(draw); return; }
        if (a === 'play') {
          if (playing === n.id) { stop(); editing ? drawEdit() : draw(); return; }
          stop();
          audioGet(n.audio[0]).then(function (blob) {
            if (!blob) return;
            player = new Audio(URL.createObjectURL(blob)); playing = n.id;
            player.onended = function () { stop(); editing ? drawEdit() : draw(); };
            player.play().catch(function () { stop(); });
            editing ? drawEdit() : draw();
          });
        }
      });
    });
    var off = on(function (s) { if (s === scope && !editing && node.isConnected) draw(); });
    var sz = szkice[scope];
    if (sz) list(scope).then(function (all) { var n = all.filter(function (x) { return x.id === sz.id; })[0]; if (!n) { delete szkice[scope]; draw(); return; } n.pl = sz.pl; n.en = sz.en; editing = n; tab = sz.tab; drawEdit(); });
    else draw();
    return w.OESTPrzycisk.ask({ title: T('📝 Notatki', '📝 Notes'), node: node, ok: T('Zamknij', 'Close'), alert: true, cls: 'nt-ask' })
      .then(function () {
        // zamknięte w trakcie poprawiania (Wstecz, stuknięcie obok): poprawka nie ginie – przy następnym otwarciu wraca edycja
        var fp = node.querySelector('[data-nt-f=pl]'), fe = node.querySelector('[data-nt-f=en]');
        if (editing && fp && fe) szkice[scope] = { id: editing.id, pl: fp.value, en: fe.value, tab: tab };
        off(); stop();
      });
  }

  w.OESTNotatki = { WORDS: WORDS, fix: fix, missing: missing, state: state, list: list, put: put, remove: remove, clear: clear, move: move, summary: summary, on: on, bind: bind, combine: combine, open: open, addAudio: addAudio, english: english };
})(window);
