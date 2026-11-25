/* Model tekstowy na telefonie (OESTModel): Gemma 4 E4B (domyślnie) albo E2B przez LiteRT-LM, offline.
   Plik modelu leży RAZ na telefonie: folder „Modele” w pamięci telefonu (Grzegorz 25/11/2026), apka czyta go bez kopiowania;
   pobranie w apce tylko, gdy tam go nie ma.
   Jeden stały prompt (RULES) dla wszystkich zadań. Funkcje: polish() – dobre zdanie po angielsku z notatki (raport, Job Sheet);
   combine() – jeden spójny akapit z kilku notatek; translate() – wierne tłumaczenie PL → EN w tej samej formie (pola do Vantify);
   summary() – krótka nazwa zlecenia (Summary w Vantify) z notatki.
   Zasady: bez nowych faktów, przyczyn i zaleceń; liczby i kody urządzeń bez zmian; wynik zawsze do akceptacji. */
(function (w) {
  'use strict';
  var MODELS = {
    E2B: { name: 'gemma-4-E2B-it.litertlm', size: '2,6 GB', url: 'https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it.litertlm' },
    E4B: { name: 'gemma-4-E4B-it.litertlm', size: '3,7 GB', url: 'https://huggingface.co/litert-community/gemma-4-E4B-it-litert-lm/resolve/main/gemma-4-E4B-it.litertlm' }
  };
  // stały prompt systemowy: apka służy tylko do pracy inżynierskiej w budynku (Grzegorz 02/11)
  var RULES = 'You are an experienced building services maintenance engineer in the UK (fire and life safety, electrical, mechanical, water and plant rooms). ' +
    'You write technical inspection and maintenance reports for facilities management, using correct engineering terminology. ' +
    'You edit and translate short notes from site inspections and maintenance jobs. Write in clear, professional British English. Rules: keep every fact exactly; copy all numbers, units, dates, device codes, ' +
    'room names and product names character for character; do not add causes, recommendations, opinions, assumptions or new facts; ' +
    'do not leave out any information; if a note is in Polish, translate it faithfully. Output only the final text, ' +
    'with no preamble, no quotation marks, no bullet points and no notes about what you changed.';
  // stały prompt + słownik pojęć z Ustawienia → AI (Grzegorz 25/11/2026); słownik daje apka przez configure({ glossary }) (module-adapters.js)
  var cfg = {};
  function configure(o) { cfg = Object.assign({}, cfg, o || {}); }
  function glossary() { try { return (cfg.glossary && cfg.glossary()) || []; } catch (e) { return []; } }
  function system() {
    var g = glossary().map(function (x) { return '- ' + x.pl + ' = ' + x.en + (String(x.note || '').trim() ? ' (' + x.note.trim() + ')' : ''); });
    var t = g.length ? RULES + '\n\nGlossary of site terms (Polish = English to use; meaning in brackets). Always use these English terms:\n' + g.join('\n') : RULES;
    return t.length > 7900 ? t.slice(0, 7900) : t;
  }
  function plugin() { var C = w.Capacitor; return C && C.isNativePlatform && C.isNativePlatform() && (C.Plugins && C.Plugins.OESTModel) || null; }
  // wybór modelu wspólny dla apki i inspekcji (ta sama domena) – własny klucz, niezależny od konta
  function key() { try { var k = w.localStorage.getItem('oest.model.text'); return MODELS[k] ? k : 'E4B'; } catch (e) { return 'E4B'; } }
  function setKey(k) { if (!MODELS[k]) throw Error('MODEL_KEY'); try { w.localStorage.setItem('oest.model.text', k); } catch (e) {} }
  function model() { return MODELS[key()]; }
  function available() { return !!plugin(); }
  function status() { var p = plugin(); if (!p) return Promise.resolve({ supported: false }); var m = model(); return p.status({ name: m.name }).then(function (s) { s.model = key(); s.size = m.size; return s; }); }
  function download() { var m = model(); return plugin().download({ name: m.name, url: m.url }); }
  // zgoda Androida „Dostęp do wszystkich plików” – bez niej apka nie widzi pliku w folderze Modele
  function allowFiles() { return plugin().allowFiles(); }
  function remove() { return plugin().remove({ name: model().name }); }
  function ready() { return status().then(function (s) { return !!(s && s.ready); }, function () { return false; }); }
  function run(prompt) {
    var p = plugin(); if (!p) return Promise.reject(Error(w.OESTT('Model działa tylko w apce na telefonie.', 'The model works only in the phone app.')));
    return p.generate({ name: model().name, system: system(), prompt: prompt, temperature: 0.2 }).then(function (r) { return clean(r && r.text); }, function (e) {
      var m = String(e && e.message || e);
      if (/NOT_DOWNLOADED/.test(m)) throw Error(w.OESTT('Brak pliku modelu. Ustawienia → AI.', 'The model file is missing. Settings → AI.'));
      if (/ANDROID_TOO_OLD/.test(m)) throw Error(w.OESTT('Model wymaga Androida 12 lub nowszego.', 'The model needs Android 12 or newer.'));
      throw Error(w.OESTT('Model nie zadziałał: ', 'The model failed: ') + m);
    });
  }
  function clean(t) { t = String(t || '').trim().replace(/^["“”']+|["“”']+$/g, '').replace(/^(here is|here's)[^:]*:\s*/i, '').trim(); if (!t) throw Error(w.OESTT('Model nie zwrócił tekstu.', 'The model returned no text.')); return t; }
  function ref(note, reference) { reference = String(reference || '').trim(); return reference && reference !== String(note || '').trim() ? '\n\nOriginal Polish wording (for reference only; the note above is what counts):\n' + reference : ''; }
  // miejsce notatki (np. nazwa inspekcji) – tylko po to, żeby model dobrał właściwe słownictwo; nie dopisuje go do tekstu (08/11/2026)
  function where(context) { context = String(context || '').trim(); return context ? '\n\nContext (for terminology only; do not add it to the text): ' + context : ''; }
  // Notatka (aktualny tekst, np. tłumaczenie ML Kit z poprawkami) → 1–2 dobrze zbudowane zdania po angielsku
  function polish(note, reference, context) {
    return run('Rewrite this note as one or two well-built sentences for the report.\n\nNote:\n' + String(note || '').trim() + ref(note, reference) + where(context));
  }
  // Kilka notatek → jeden spójny akapit (nie zlepek zdań), w tej samej kolejności
  function combine(notes, reference, context) {
    var list = (notes || []).map(function (n) { return String(n || '').trim(); }).filter(Boolean);
    if (!list.length) return Promise.reject(Error(w.OESTT('Brak notatek do połączenia.', 'No notes to combine.')));
    return run('Combine the notes below into ONE coherent paragraph for the report. Keep their order, join related points naturally, ' +
      'avoid repeating the same information, and keep every fact.\n\n' + list.map(function (n, i) { return (i + 1) + '. ' + n; }).join('\n') + ref(list.join('\n'), reference) + where(context));
  }
  // Wierne tłumaczenie PL → EN w tej samej formie: krótka nazwa zostaje krótką nazwą, zdanie zdaniem (pola do Vantify)
  function translate(text, context) {
    return run('Translate this Polish text into English. Keep its form and length: a short label or name stays a short label, ' +
      'a sentence stays a sentence. Do not turn it into a report sentence.\n\nText:\n' + String(text || '').trim() + where(context));
  }
  // Krótka nazwa zlecenia (Summary w Vantify) z notatki – tylko gdy nazwy nie ma (bez kreatora i bez tytułu)
  function summary(note, context) {
    return run('Write a short title for this maintenance job, at most 10 words, with no full stop at the end. ' +
      'Use only what the note says.\n\nNote:\n' + String(note || '').trim() + where(context)).then(function (t) { return t.split('\n')[0].replace(/[.]+$/, '').trim(); });
  }
  // Sprawdzenie: czy wszystkie liczby i kody z wejścia są w wyniku (ostrzeżenie dla użytkownika, nie blokada)
  function missingNumbers(input, output) {
    // całe liczby jako tokeny: 12 ≠ 120
    var re = /[-−]?\d+(?:[.,]\d+)?/g, norm = function (n) { return n.replace(',', '.').replace('−', '-'); }, have = {}, miss = [];
    (String(output || '').match(re) || []).forEach(function (n) { have[norm(n)] = 1; });
    (String(input || '').match(re) || []).forEach(function (n) { if (!have[norm(n)] && miss.indexOf(n) < 0) miss.push(n); });
    return miss;
  }
  // Panel w Ustawieniach → AI: wybór E2B/E4B, pobranie przez Wi‑Fi, postęp, usunięcie
  // panel „Model tekstowy na telefonie” w Ustawieniach → OCR i modele AI (moduly/szkielet/src/ekrany/Ai.vue): moduł daje dane i akcje, ekran tylko je pokazuje
  function gb(n) { return (n / 1073741824).toFixed(2).replace('.', ',') + ' GB'; }
  function panel(err) {
    return status().then(function (s) { return s || {}; }, function (e) { err = w.OESTBledy ? w.OESTBledy.text(e) : e.message; return {}; }).then(function (s) {
      var k = key(), line, shared = !!s.shared;
      if (!available()) line = w.OESTT('Model działa w apce na telefonie.', 'The model works in the phone app.');
      else if (s.supported === false) line = w.OESTT('Ten telefon ma za stary Android (potrzebny 12+).', 'This phone has an older Android (12+ needed).');
      else if (s.ready && shared) line = w.OESTT('✓ Z folderu Modele (' + gb(s.bytes) + '). Działa bez internetu.', '✓ From the Modele folder (' + gb(s.bytes) + '). Works offline.');
      else if (s.ready) line = w.OESTT('✓ Pobrany (' + gb(s.bytes) + '). Działa bez internetu.', '✓ Downloaded (' + gb(s.bytes) + '). Works offline.');
      else if (s.access === false) line = w.OESTT('Apka nie ma zgody na odczyt folderu Modele. Stuknij „Zezwól” i włącz OEST.', 'The app may not read the Modele folder. Tap “Allow” and switch OEST on.');
      else if (s.downloading) line = s.paused ? w.OESTT('⏸ Czeka na Wi‑Fi… ', '⏸ Waiting for Wi‑Fi… ') + (s.total > 0 ? Math.round(s.got / s.total * 100) + '%' : '') : w.OESTT('⬇ Pobieram… ', '⬇ Downloading… ') + (s.total > 0 ? Math.round(s.got / s.total * 100) + '% (' + gb(s.got) + w.OESTT(' z ', ' of ') + gb(s.total) + ')' : '');
      else line = w.OESTT('Brak pliku ' + MODELS[k].name + ' w folderze Modele. Przenieś go tam albo pobierz w apce (' + MODELS[k].size + ', tylko Wi‑Fi).', 'No ' + MODELS[k].name + ' file in the Modele folder. Move it there or download it in the app (' + MODELS[k].size.replace(',', '.') + ', Wi‑Fi only).');
      if (s.error) line = w.OESTT('Pobieranie nie udało się (' + s.error + '). Spróbuj jeszcze raz.', 'Download failed (' + s.error + '). Try again.');
      return {
        klucz: k, linia: line, blad: err || '', trwa: !!s.downloading,
        opcje: [{ v: 'E2B', t: w.OESTT('Gemma 4 E2B – mniejszy, szybszy (2,6 GB)', 'Gemma 4 E2B – smaller, faster (2.6 GB)') }, { v: 'E4B', t: w.OESTT('Gemma 4 E4B – dokładniejszy (3,7 GB)', 'Gemma 4 E4B – more accurate (3.7 GB)') }],
        // bez zgody na folder Modele najpierw „Zezwól” (pobranie mogłoby zrobić drugą kopię); plik z Modele usuwasz sam w Plikach
        zezwol: available() && s.supported !== false && s.access === false && !s.ready,
        pobierz: available() && s.supported !== false && s.access !== false && !s.ready && !s.downloading, anuluj: !!s.downloading, usun: !!s.ready && !shared,
        prompt: RULES
      };
    });
  }
  // akcja przycisku panelu: 'download' albo 'remove' (usunięcie i anulowanie pobierania pytają okienkiem apki); zwraca tekst błędu albo ''
  function akcja(a) {
    return (a === 'remove' ? w.OESTPytaj(w.OESTT('Usunąć plik modelu z telefonu?', 'Remove the model file from the phone?')) : Promise.resolve(true)).then(function (ok) {
      if (!ok) return '';
      return (a === 'download' ? download() : a === 'allow' ? allowFiles() : remove()).then(function () { return ''; }, function (e) { return w.OESTBledy ? w.OESTBledy.text(e) : e.message; });
    });
  }
  w.OESTModel = { MODELS: MODELS, RULES: RULES, available: available, status: status, download: download, remove: remove, ready: ready, polish: polish, combine: combine, translate: translate, summary: summary, configure: configure, allowFiles: allowFiles, missingNumbers: missingNumbers, key: key, setKey: setKey, panel: panel, akcja: akcja };
})(window);
