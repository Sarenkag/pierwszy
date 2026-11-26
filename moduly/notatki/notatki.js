/* Notatki głosowe (OESTNotatki) – jeden moduł zapisu, odczytu i poprawiania notatek (Grzegorz 08/11/2026).
   Przytrzymaj 🎤 i mów → apka sama: nagranie → tekst PL (offline) → poprawa słów branżowych → tłumaczenie PL→EN (ML Kit)
   → model układa zdanie (gdy pobrany) → sprawdzenie liczb. Notatki leżą w telefonie (IndexedDB „oest-notatki”), osobno dla
   każdego miejsca (scope, np. szkic inspekcji). Okienko „Notatki”: lista, odsłuchanie, poprawa PL/EN, usunięcie.
   Nic nie trafia do raportu samo – „Połącz notatki” daje tylko propozycję tekstu.
   Zależności: OESTVoice (moduly/notatki/glos.js), szkielet Ionic (OESTCzesci – okienka i pasek z moduly/szkielet/src/czesci/Notatki*.vue),
   opcjonalnie OESTModel i wtyczka Translate. Ten plik nie rysuje HTML-a: wygląd daje szkielet, tu logika i dane (kontrolery). */
(function (w) {
  'use strict';
  
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
      if (!d) { if (w.notatkiPamiecTestowa) return fn(null, mem[store]); throw Error(w.OESTT('Nie udało się zapisać notatki w telefonie (pamięć apki niedostępna). Spróbuj jeszcze raz.', 'Could not save the note on the phone (app storage unavailable). Try again.')); }
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
      queue = queue.then(function () { if (!(n.audio && n.audio.length)) return retext(n); /* notatka pisana: tylko tłumaczenie od nowa */ return audioGet(n.audio && n.audio[0]).then(function (blob) {
        if (blob) return transcribe(n, blob);
        n.st = ''; n.err = w.OESTT('Brak nagrania – wpisz tekst w „Popraw”.', 'Recording missing – type the text in “Edit”.'); return keep(n);
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
  // Jedna droga PL → EN: pobrany model dostaje oryginał, ML Kit tylko bez modelu.
  // how: 'translate' = wierne tłumaczenie w tej samej formie (krótkie pola: miejsce, nazwa);
  // albo id agenta pola z OESTModel.AGENTS (np. 'description', 'opis'); domyślnie agent 'uwaga' (notatka do raportu). Gdy model zawiedzie – ML Kit (25/11/2026).
  function english(pl, ctx, how) {
    if (!pl) return Promise.resolve('');
    return modelReady().then(function (ok) {
      if (ok) return (how === 'translate' ? w.OESTModel.translate(pl, ctx) : w.OESTModel.agent(how || 'uwaga', pl, { context: ctx })).then(function (out) { return fix(out, 'en'); }, function () { return mlkit(pl); });
      return mlkit(pl);
    });
  }
  function mlkit(pl) {
    return Promise.resolve().then(function () {
      var tr = translator();
      return tr ? tr.plToEn({ text: pl }).then(function (r) { return fix(r && r.text, 'en'); }, function () { return ''; }) : '';
    });
  }
  var voice = null, queue = Promise.resolve(), seq = 0;
  function vc() {
    if (voice || !w.OESTVoice) return voice;
    voice = w.OESTVoice.create({ maxMs: 120000, onState: function (on) { if (on && capture) started = capture(); }, onAudio: function (media) { return pending && pending(media); }, onError: function (e) { if (pendingErr) pendingErr(e); } });
    return voice;
  }
  var pending = null, pendingErr = null, capture = null, started = null; // started: miejsce i kontekst z chwili rozpoczęcia nagrania
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
    var p = native() && v ? idle(v).then(function () { return v.transcribe(blob); }).then(function (r) { return fix(r && r.text, 'pl'); }) : Promise.reject(Error(w.OESTT('Zamiana nagrania na tekst działa w apce na telefonie. Możesz wpisać tekst w „Popraw”.', 'Turning a recording into text works in the phone app. You can type the text in “Edit”.')));
    return p.then(function (pl) {
      n.pl = pl; n.err = pl ? '' : w.OESTT('Nie rozpoznano słów. Odsłuchaj nagranie i wpisz tekst w „Popraw”.', 'No words recognised. Listen to the recording and type the text in “Edit”.');
      return english(pl, n.ctx);
    }).then(function (en) { n.en = en || ''; }, function (e) { n.err = e && e.message || String(e); })
      .then(function () { n.st = ''; return keep(n); });
  }
  // wynik zamiany zapisujemy tylko, gdy notatka nadal istnieje (usunięta albo „Wyczyść inspekcję” w trakcie – nie wraca)
  // miejsce (scope) bierzemy z zapisanego rekordu: notatka przeniesiona w trakcie do archiwum terminu zostaje w archiwum
  function keep(n) {
    return tx('notes', 'readonly', function (s, m) { return m ? m[n.id] : s.get(n.id); }).then(function (cur) { if (!cur) return n; n.scope = cur.scope; return put(n); });
  }
  // przycisk „🎤 Nagraj notatkę”: przytrzymaj = nagrywa do puszczenia; stuknij = do „Zakończ”.
  // Kilka ekranów (inspekcja, Reactive, Hand over) – każdy swój przycisk; nagranie trafia do tego, którym zaczęto.
  // o: { scope(): string, ctx(): string, onSaved(note), onError(err) }
  var active = null;
  function bind(btn, o) {
    var v = vc(); if (!btn || !v) return null;
    var me = o || {}, pick = function () { if (!v.busy) active = me; };
    btn.addEventListener('pointerdown', pick, true); btn.addEventListener('click', pick, true); // przed obsługą przytrzymania (holdButton)
    capture = function () { var b = active || me; return { b: b, scope: b.scope && b.scope(), ctx: b.ctx ? b.ctx() : '' }; };
    // notatka trafia tam, gdzie zaczęto nagrywać (nie tam, dokąd przejdzie się w trakcie zatrzymywania)
    pending = function (media) {
      var at = started || capture(), b = at.b; started = null;
      var scope = at.scope; if (!scope) { if (b.onError) b.onError(Error(w.OESTT('Najpierw otwórz inspekcję.', 'Open an inspection first.'))); return; }
      return addAudio(scope, at.ctx, media).then(function (n) { if (b.onSaved) b.onSaved(n); }, function (e) { if (b.onError) b.onError(e); });
    };
    pendingErr = function (e) { var b = active || me; if (b.onError) b.onError(e); };
    return w.OESTVoice.holdButton(btn, v, function (e) { if (me.onError) me.onError(e); });
  }

  // ---------- połączenie notatek w jeden tekst (propozycja do komentarza) ----------
  function combine(scope, ctx) {
    return list(scope).then(function (a) {
      var done = a.filter(function (n) { return state(n) === 'ready' || state(n) === 'check'; }), ens = done.map(function (n) { return n.en.trim(); });
      if (!ens.length) throw Error(w.OESTT('Brak notatek z tekstem po angielsku.', 'No notes with English text.'));
      var plain = ens.map(function (s) { return /[.!?]$/.test(s) ? s : s + '.'; }).join(' ');
      if (ens.length < 2) return plain;
      return modelReady().then(function (ok) {
        if (!ok) return plain;
        // agent dostaje oryginały Grzegorza (polski tekst notatki; notatka pisana od razu po angielsku – jej tekst), nie wcześniejsze wyniki modelu (26/11/2026)
        var orig = done.map(function (n) { return String(n.pl || '').trim() || n.en.trim(); });
        return w.OESTModel.agent('uwaga', orig, { context: ctx }).then(function (out) { return fix(out, 'en') || plain; }, function () { return plain; });
      });
    });
  }

  // propozycja z notatek + liczby z notatek (polski oryginał i EN), których w niej brakuje – także zgubione wcześniej przez tłumacza
  function propose(scope, ctx) {
    return combine(scope, ctx).then(function (text) {
      return list(scope).then(function (a) { var src = a.map(function (n) { return (n.pl || '') + '\n' + (n.en || ''); }).join('\n'); return { text: text, miss: missing(src, text), src: src }; });
    });
  }
  // kontroler dla części Vue (szkielet Ionic): dane() → zwykły obiekt, na(fn) → wyłącz; fn dostaje dane() po każdej zmianie
  function UI() { if (!w.OESTCzesci) throw Error(w.OESTT('Brak szkieletu apki (moduly/szkielet).', 'App skeleton missing (moduly/szkielet).')); return w.OESTCzesci; }
  // okienko z propozycją (część NotatkiPropozycja.vue): można poprawić; „Wstaw” oddaje tekst (nic nie wstawia samo), „Anuluj” = null
  function offer(scope, o) {
    o = o || {};
    return propose(scope, o.ctx).then(function (r) {
      if (o.alive && !o.alive()) return null; // ekran zmienił się w trakcie (np. zapisany wpis, nowy formularz) – propozycja nieaktualna
      var tekst = r.text, ostrz = '';
      var warnNow = function () { var m = missing(r.src, tekst); /* po każdej zmianie: wszystkie liczby z notatek, nie tylko brakujące na starcie */ ostrz = m.length ? w.OESTT('W propozycji brakuje: ', 'Missing in the suggestion: ') + m.join(', ') + w.OESTT(' — sprawdź.', ' — check.') : ''; };
      warnNow();
      var dane = function () { return { naglowek: w.OESTT('Propozycja z notatek — sprawdź i popraw. Nic nie wstawiam samo.', 'Suggestion from the notes — check and edit. Nothing is inserted automatically.'), tekst: tekst, ostrzezenie: ostrz }; };
      var S = UI().sluchacze(dane);
      var ctrl = { dane: dane, na: S.na, akcja: function (a, v) { if (a === 'tekst') { tekst = String(v == null ? '' : v); warnNow(); S.emit(); } } };
      return UI().okno('NotatkiPropozycja', ctrl, { tytul: o.title || w.OESTT('Połącz notatki', 'Combine notes'), ok: o.ok || w.OESTT('Wstaw', 'Insert'), anuluj: w.OESTT('Anuluj', 'Cancel') })
        .then(function (res) { return res && res.ok && (!o.alive || o.alive()) ? tekst.trim() : null; });
    });
  }

  // ---------- gotowy pasek notatek dla ekranu (Reactive, Hand over): Nagraj · Notatki N · Połącz ----------
  // pasek(o) → kontroler paska dla części Notatki.vue (ekrany Vue: <Notatki :T="T" :opcje="o" />)
  // mount(box, o) → to samo w elemencie starego kodu (część Vue wstawia szkielet); zwraca kontroler { box, scope(), refresh() }
  // o: { scope(), ctx(), title(), join: napis, ok: napis „Wstaw…”, icons, onJoin(tekst), onSaved(note), onError(err) }
  // pasek ukryty (box.hidden), gdy scope() puste; licznik odświeża się sam po każdej zmianie notatek
  var mounts = [], watching = false;
  function pasek(o) {
    o = o || {};
    var ctx = function () { return o.ctx ? o.ctx() || '' : ''; };
    var st = { n: 0, polacz: false, ikony: [], dodaje: false, laczy: false, bezNagrywania: false };
    var m = { box: null, scope: function () { return o.scope ? o.scope() || '' : ''; } };
    m.dane = function () {
      return { ikonyTryb: !!o.icons, widoczny: !!m.scope(), n: st.n, polacz: st.polacz, ikony: st.ikony, dodaje: st.dodaje, laczy: st.laczy, bezNagrywania: st.bezNagrywania,
        napisPolacz: String(o.join || w.OESTT('Połącz notatki', 'Combine notes')).replace(/^✨\s*/, '') }; // ikona zamiast emoji (część Vue)
    };
    var S = UI().sluchacze(m.dane); m.na = S.na;
    m.refresh = function () {
      var k = m.scope(); if (m.box) m.box.hidden = !k; S.emit(); if (!k) return Promise.resolve();
      return summary(k).then(function (r) { if (k !== m.scope()) return; st.n = r.all; st.polacz = r.ready > 0; S.emit(); return o.icons ? list(k) : null; })
        .then(function (a) {
          if (!a || k !== m.scope()) return;
          // ponumerowane ikonki notatek: rodzaj (nagranie / pisana) i stan (busy = zamieniam, ready = gotowa, w = do sprawdzenia)
          st.ikony = a.map(function (n, i) { var s = state(n); return { id: n.id, nr: i + 1, rodzaj: n.audio && n.audio.length ? 'glos' : 'tekst', stan: s === 'busy' ? 'busy' : s === 'ready' ? 'ready' : 'w' }; });
          S.emit();
        }, function () {});
    };
    var zywy = function () { return !m.box || m.box.isConnected; };
    m.akcja = function (a, x) {
      var k = m.scope();
      if (a === 'podlacz') { m.box = x; m.refresh(); return; } // część Vue podaje swój element (widoczność, „ten sam ekran” przy Połącz)
      if (a === 'nagraj') { if (!bind(x, { scope: m.scope, ctx: ctx, onSaved: function (n) { m.refresh(); if (o.onSaved) o.onSaved(n); }, onError: o.onError })) { st.bezNagrywania = true; S.emit(); } return; }
      if (!k) return;
      if (a === 'otworz') { open(k, x ? { title: o.title ? o.title() : ctx(), only: x } : { title: o.title ? o.title() : ctx() }); return; }
      if (a === 'dopisz') {
        if (st.dodaje) return; st.dodaje = true; S.emit();
        write(k, ctx()).then(function (n) { if (n && o.onSaved) o.onSaved(n); }, function (e) { if (o.onError) o.onError(e); }).then(function () { st.dodaje = false; S.emit(); });
        return;
      }
      if (a === 'polacz') {
        if (st.laczy) return; st.laczy = true; S.emit();
        var alive = function () { return zywy() && !(m.box && m.box.closest('[hidden]')) && k === m.scope(); }; // ten sam, nadal widoczny formularz co przy stuknięciu (apka ukrywa nieaktywne ekrany atrybutem hidden)
        offer(k, { ctx: ctx(), ok: o.ok, alive: alive }).then(function (t) { if (t && alive() && o.onJoin) return o.onJoin(t); })
          .catch(function (e) { if (o.onError) o.onError(e); }).then(function () { st.laczy = false; S.emit(); });
      }
    };
    mounts = mounts.filter(function (x) { return !x.box || x.box.isConnected; }); mounts.push(m);
    if (!watching) { watching = true; on(function (k) { mounts = mounts.filter(function (x) { return !x.box || x.box.isConnected; }); mounts.forEach(function (x) { if (x.scope() === k) x.refresh(); }); }); }
    m.refresh();
    return m;
  }
  function mount(box, o) {
    if (!box) return null;
    mounts = mounts.filter(function (x) { return x.box !== box; });
    var m = pasek(o); m.box = box; UI().montuj(box, 'Notatki', { kontroler: m }); m.refresh(); // i18n-ok: nazwa części Vue
    return m;
  }
  // 📝+ notatka pisana: okienko z polem; tekst (po polsku albo po angielsku) → angielski w tle jak przy nagraniu; Anuluj = null
  function addText(scope, ctx, text) {
    var id = 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), pl = fix(text, 'pl');
    var n = { id: id, scope: scope, at: Date.now(), seq: ++seq, ctx: ctx || '', ms: 0, audio: [], pl: pl, en: '', st: 'busy', err: '' };
    running[id] = 1; // przed put(): odświeżenie paska (summary → resume) nie może uruchomić drugiego tłumaczenia (Codex #144)
    return put(n).then(function () {
      queue = queue.then(function () { return retext(n); }).catch(function () {}).then(function () { delete running[id]; });
      return n;
    }, function (e) { delete running[id]; throw e; });
  }
  function retext(n) { return english(n.pl, n.ctx).then(function (en) { n.en = en || ''; }, function () {}).then(function () { n.st = ''; return keep(n); }); }
  // okienko „Nowa notatka” (część NotatkaNowa.vue): tekst po polsku albo po angielsku → angielski w tle jak przy nagraniu; Anuluj = null
  function write(scope, ctx) {
    var tekst = '';
    var dane = function () { return { naglowek: w.OESTT('Wpisz notatkę — po polsku albo po angielsku. Angielski tekst do raportu zrobi się sam.', 'Type a note — Polish or English. The English text for the report is made automatically.'), tekst: tekst }; };
    var S = UI().sluchacze(dane);
    var ctrl = { dane: dane, na: S.na, akcja: function (a, v) { if (a === 'tekst') { tekst = String(v == null ? '' : v); S.emit(); } } };
    return UI().okno('NotatkaNowa', ctrl, { tytul: w.OESTT('Nowa notatka', 'New note'), ok: w.OESTT('Zapisz', 'Save'), anuluj: w.OESTT('Anuluj', 'Cancel') })
      .then(function (r) { var t = tekst.trim(); return r && r.ok && t ? addText(scope, ctx, t) : null; });
  }
  // nagrania notatek jako dowody (Hand over: wpis zachowuje oryginalne audio, jak dawniej) → [{ id, kind:'audio', blob, name, mime, size, ms }]
  function media(scope) {
    return list(scope).then(function (a) {
      return Promise.all(a.map(function (n) { return Promise.all((n.audio || []).map(function (aid) { return audioGet(aid).then(function (b) { return b ? { id: 'nt-' + aid, kind: 'audio', blob: b, name: 'Voice note', mime: b.type || 'audio/wav', size: b.size, ms: n.ms || 0 } : null; }); })); }))
        .then(function (x) { return [].concat.apply([], x).filter(Boolean); });
    });
  }
  // trwa nagrywanie albo jego zamykanie (ekran nie powinien się wtedy zamykać)
  function busy() { return !!(voice && voice.busy); }

  // ---------- okienko „Notatki” (część NotatkiOkno.vue przez OESTCzesci.okno) ----------
  function clock(ms) { var s = Math.round((ms || 0) / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function hhmm(t) { var d = new Date(t); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  // znacznik stanu notatki: tekst + kolor Ionic (success = gotowa, warning = do sprawdzenia, medium = w toku)
  function tag(s) {
    if (s === 'ready') return { tekst: w.OESTT('gotowa', 'ready'), kolor: 'success' };
    if (s === 'check') return { tekst: w.OESTT('sprawdź liczby', 'check numbers'), kolor: 'warning' };
    if (s === 'busy') return { tekst: w.OESTT('zamieniam na tekst…', 'turning into text…'), kolor: 'medium' };
    if (s === 'pl') return { tekst: w.OESTT('tylko po polsku', 'Polish only'), kolor: 'warning' };
    return { tekst: w.OESTT('bez tekstu', 'no text'), kolor: 'warning' };
  }
  /* open(scope, { title, only, readonly }) → Promise (zamknięcie okienka). Logika okienka (lista, odsłuch, poprawianie, usuwanie) tu;
     kontroler dla części: dane() → { tryb: 'lista'|'edycja', readonly, naglowek, pusto, notatki:[…], edycja:{…} };
     akcja('edit'|'del'|'play', id) · ('tab', 'pl'|'en') · ('pole', 'pl'|'en', tekst) · ('cancel') · ('save') · ('redo') · ('tlo') */
  function open(scope, o) {
    o = o || {};
    var editing = null, tab = 'en', player = null, playing = '', sure = '', notes = [], warnTxt = '', saving = false, redoing = false, redoTok = 0;
    function stop() { if (player) { try { player.pause(); } catch (e) {} URL.revokeObjectURL(player.src); player = null; } playing = ''; }
    function dane() {
      var d = { tryb: editing ? 'edycja' : 'lista', readonly: !!o.readonly, koniec: false };
      if (editing) {
        var n = editing;
        d.edycja = { naglowek: w.OESTT('Popraw notatkę', 'Edit note') + ' · ' + hhmm(n.at) + (n.ctx ? ' · ' + n.ctx : ''), tab: tab, pl: n.pl || '', en: n.en || '', ostrzezenie: warnTxt,
          audio: !!(n.audio && n.audio.length), gra: playing === n.id, czas: clock(n.ms), zapisuje: saving, uklada: redoing };
        return d;
      }
      d.naglowek = (o.title || '') + (notes.length && !o.readonly ? ' · ' + w.OESTT('stuknij „Popraw”, żeby zmienić tekst', 'tap “Edit” to change the text') : '');
      d.pusto = notes.length ? '' : w.OESTT('Brak notatek. Przytrzymaj „Nagraj notatkę” i mów.', 'No notes yet. Hold “Record note” and speak.');
      d.notatki = notes.map(function (n) {
        var s = state(n), miss = s === 'check' ? missing(n.pl, n.en) : [];
        return { id: n.id, meta: hhmm(n.at) + (n.ctx ? ' · ' + n.ctx : '') + (n.audio && n.audio.length ? ' · ' + clock(n.ms) : ''), stan: s, tag: tag(s), en: n.en || '', pl: n.pl ? '„' + n.pl + '”' : '',
          brak: miss.length ? w.OESTT('W oryginale jest: ', 'The original has: ') + miss.join(', ') + w.OESTT(' – w tekście EN tego brak.', ' – missing in the English text.') : '',
          blad: n.err && !n.pl ? n.err : '', audio: !!(n.audio && n.audio.length), gra: playing === n.id, czas: clock(n.ms), pewne: sure === n.id, zajeta: s === 'busy' };
      });
      return d;
    }
    var S = UI().sluchacze(dane);
    function draw() {
      if (editing) { S.emit(); return; }
      S.emit();
      list(scope).then(resume).then(function (a) {
        if (editing) return;
        if (o.only) a = a.filter(function (n) { return n.id === o.only; }); // stuknięta ikonka: tylko ta jedna notatka
        notes = a; S.emit();
      });
    }
    function warn() {
      if (!editing) return;
      var m = String(editing.en || '').trim() ? missing(editing.pl || '', editing.en || '') : [];
      warnTxt = m.length ? w.OESTT('W oryginale jest „', 'The original has “') + m.join('”, „') + w.OESTT('”, a w tekście EN nie ma. Dopisz albo zostaw.', '” but the English text does not. Add it or leave it.') : '';
    }
    function drawEdit() { warn(); S.emit(); }
    function akcja(a, id, v) {
      if (o.readonly && a !== 'play' && a !== 'tlo') return; // tylko odczyt (historia, archiwum): żadnej akcji zapisującej
      if (a === 'tlo') { if (sure) { sure = ''; draw(); } return; } // stuknięcie obok przycisków: pytanie „Usunąć?” znika
      if (a !== 'del' && sure) sure = '';
      if (a === 'pole') { if (!editing) return; editing[id] = String(v == null ? '' : v); warn(); S.emit(); return; }
      if (a === 'tab') { if (!editing) return; tab = id === 'pl' ? 'pl' : 'en'; drawEdit(); return; }
      if (a === 'cancel') { editing = null; redoing = false; redoTok++; delete szkice[scope]; stop(); draw(); return; }
      if (a === 'save') {
        // edycja kończy się dopiero po udanym zapisie; błąd zapisu = komunikat i formularz zostaje do ponowienia
        if (!editing || saving) return;
        var n = editing, c = Object.assign({}, n, { pl: String(n.pl || '').trim(), en: String(n.en || '').trim(), err: '', st: '' });
        saving = true; S.emit();
        put(c).then(function () { saving = false; if (editing !== n) return; editing = null; delete szkice[scope]; stop(); draw(); }, function (e) {
          saving = false; warnTxt = w.OESTT('Nie zapisano: ', 'Not saved: ') + (e && e.message || String(e)) + w.OESTT(' Stuknij „Zapisz” jeszcze raz.', ' Tap “Save” again.'); S.emit();
        });
        return;
      }
      if (a === 'redo') {
        if (!editing || redoing) return;
        var plv = fix(editing.pl, 'pl');
        if (!plv) { warnTxt = w.OESTT('Najpierw wpisz tekst po polsku.', 'Type the Polish text first.'); S.emit(); return; }
        if (!translator()) { warnTxt = w.OESTT('Tłumacz działa w apce na telefonie.', 'The translator works in the phone app.'); S.emit(); return; }
        redoing = true; warnTxt = w.OESTT('Układam po angielsku…', 'Writing in English…'); S.emit();
        var ed = editing, plIn = ed.pl, enIn = ed.en, tok = ++redoTok; // wynik tylko do tej samej edycji tej samej notatki (nie po Anuluj ani do innej notatki)
        english(plv, ed.ctx).then(function (out) {
          if (tok !== redoTok || editing !== ed || zamkniete) return;
          redoing = false;
          // w trakcie dopisano poprawki: nie nadpisujemy ich wynikiem
          if (ed.pl !== plIn || ed.en !== enIn) { warnTxt = w.OESTT('Tekst zmieniony w trakcie – nie podmieniam. Stuknij „Ułóż” jeszcze raz.', 'Text changed meanwhile – not replaced. Tap “Rewrite” again.'); S.emit(); return; }
          ed.pl = plv; ed.en = out || ed.en; tab = 'en'; drawEdit();
          if (!out) { warnTxt = w.OESTT('Tłumaczenie nie wyszło – popraw ręcznie.', 'Translation failed – edit by hand.'); S.emit(); }
        });
        return;
      }
      if (a === 'play' && editing && editing.id === id) return graj(editing);
      list(scope).then(function (all) {
        var n = all.filter(function (x) { return x.id === id; })[0]; if (!n) return;
        if (o.readonly && a !== 'play') return;
        if (a === 'edit') { stop(); redoing = false; redoTok++; editing = n; tab = n.en ? 'en' : 'pl'; drawEdit(); return; }
        if (a === 'del') { if (sure !== n.id) { sure = n.id; draw(); return; } sure = ''; if (playing === n.id) stop(); remove(n).then(draw); return; }
        if (a === 'play') graj(n);
      });
    }
    function graj(n) {
      if (playing === n.id) { stop(); editing ? drawEdit() : draw(); return; }
      stop();
      audioGet(n.audio && n.audio[0]).then(function (blob) {
        if (!blob || zamkniete) return;
        player = new Audio(URL.createObjectURL(blob)); playing = n.id;
        player.onended = function () { stop(); editing ? drawEdit() : draw(); };
        player.play().catch(function () { stop(); });
        editing ? drawEdit() : draw();
      });
    }
    var zamkniete = false;
    var off = on(function (s) { if (s === scope && !editing && !zamkniete) draw(); });
    var ctrl = { dane: dane, na: S.na, akcja: akcja,
      // zamknięte w trakcie poprawiania (Wstecz, stuknięcie obok): poprawka nie ginie – przy następnym otwarciu wraca edycja
      zamknij: function () { if (zamkniete) return; zamkniete = true; if (editing) szkice[scope] = { id: editing.id, pl: editing.pl || '', en: editing.en || '', tab: tab }; off(); stop(); } };
    var sz = o.readonly ? null : szkice[scope]; if (sz && o.only && sz.id !== o.only) sz = null; // ikonka innej notatki: przerwana poprawka czeka na swoją notatkę (Codex #144) // tylko odczyt: nie wracamy do przerwanej poprawki
    if (sz) list(scope).then(function (all) { var n = all.filter(function (x) { return x.id === sz.id; })[0]; if (!n) { delete szkice[scope]; draw(); return; } n.pl = sz.pl; n.en = sz.en; editing = n; tab = sz.tab; drawEdit(); });
    else draw();
    return UI().okno('NotatkiOkno', ctrl, { tytul: w.OESTT('Notatki', 'Notes'), ok: w.OESTT('Zamknij', 'Close'), anuluj: false }).then(function () {});
  }

  w.OESTNotatki = { WORDS: WORDS, fix: fix, missing: missing, state: state, list: list, put: put, remove: remove, clear: clear, move: move, summary: summary, on: on, bind: bind, mount: mount, pasek: pasek, busy: busy, media: media, combine: combine, propose: propose, offer: offer, open: open, addAudio: addAudio, addText: addText, write: write, english: english };
})(window);
