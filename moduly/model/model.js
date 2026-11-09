/* Model tekstowy na telefonie (OESTModel): Gemma 4 E2B/E4B przez LiteRT-LM, offline po jednorazowym pobraniu.
   Funkcje: polish() – jedno dobre zdanie po angielsku z notatki; combine() – jeden spójny akapit z kilku notatek.
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
    'You edit short notes from site inspections. Write in clear, professional British English. Rules: keep every fact exactly; copy all numbers, units, dates, device codes, ' +
    'room names and product names character for character; do not add causes, recommendations, opinions, assumptions or new facts; ' +
    'do not leave out any information; if a note is in Polish, translate it faithfully. Output only the final text, ' +
    'with no preamble, no quotation marks, no bullet points and no notes about what you changed.';
  function T(pl, en) { return w.OESTT ? w.OESTT(pl, en) : pl; }
  function plugin() { var C = w.Capacitor; return C && C.isNativePlatform && C.isNativePlatform() && (C.Plugins && C.Plugins.OESTModel) || null; }
  // wybór modelu wspólny dla apki i inspekcji (ta sama domena) – własny klucz, niezależny od konta
  function key() { try { var k = w.localStorage.getItem('oest.model.text'); return MODELS[k] ? k : 'E2B'; } catch (e) { return 'E2B'; } }
  function setKey(k) { if (!MODELS[k]) throw Error('MODEL_KEY'); try { w.localStorage.setItem('oest.model.text', k); } catch (e) {} }
  function model() { return MODELS[key()]; }
  function available() { return !!plugin(); }
  function status() { var p = plugin(); if (!p) return Promise.resolve({ supported: false }); var m = model(); return p.status({ name: m.name }).then(function (s) { s.model = key(); s.size = m.size; return s; }); }
  function download() { var m = model(); return plugin().download({ name: m.name, url: m.url }); }
  function remove() { return plugin().remove({ name: model().name }); }
  function ready() { return status().then(function (s) { return !!(s && s.ready); }, function () { return false; }); }
  function run(prompt) {
    var p = plugin(); if (!p) return Promise.reject(Error(T('Model działa tylko w apce na telefonie.', 'The model works only in the phone app.')));
    return p.generate({ name: model().name, system: RULES, prompt: prompt, temperature: 0.2 }).then(function (r) { return clean(r && r.text); }, function (e) {
      var m = String(e && e.message || e);
      if (/NOT_DOWNLOADED/.test(m)) throw Error(T('Model nie jest pobrany. Ustawienia → AI → Pobierz model (Wi‑Fi).', 'The model is not downloaded. Settings → AI → Download model (Wi‑Fi).'));
      if (/ANDROID_TOO_OLD/.test(m)) throw Error(T('Model wymaga Androida 12 lub nowszego.', 'The model needs Android 12 or newer.'));
      throw Error(T('Model nie zadziałał: ', 'The model failed: ') + m);
    });
  }
  function clean(t) { t = String(t || '').trim().replace(/^["“”']+|["“”']+$/g, '').replace(/^(here is|here's)[^:]*:\s*/i, '').trim(); if (!t) throw Error(T('Model nie zwrócił tekstu.', 'The model returned no text.')); return t; }
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
    if (!list.length) return Promise.reject(Error(T('Brak notatek do połączenia.', 'No notes to combine.')));
    return run('Combine the notes below into ONE coherent paragraph for the report. Keep their order, join related points naturally, ' +
      'avoid repeating the same information, and keep every fact.\n\n' + list.map(function (n, i) { return (i + 1) + '. ' + n; }).join('\n') + ref(list.join('\n'), reference) + where(context));
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
  function mount(el) {
    if (!el) return; var timer = null;
    function gb(n) { return (n / 1073741824).toFixed(2).replace('.', ',') + ' GB'; }
    function draw(s, err) {
      if (!el.isConnected) { clearInterval(timer); return; }
      var k = key(), line;
      if (!available()) line = T('Model działa w apce na telefonie.', 'The model works in the phone app.');
      else if (s.supported === false) line = T('Ten telefon ma za stary Android (potrzebny 12+).', 'This phone has an older Android (12+ needed).');
      else if (s.ready) line = T('✓ Pobrany (' + gb(s.bytes) + '). Działa bez internetu.', '✓ Downloaded (' + gb(s.bytes) + '). Works offline.');
      else if (s.downloading) line = s.paused ? T('⏸ Czeka na Wi‑Fi… ', '⏸ Waiting for Wi‑Fi… ') + (s.total > 0 ? Math.round(s.got / s.total * 100) + '%' : '') : T('⬇ Pobieram… ', '⬇ Downloading… ') + (s.total > 0 ? Math.round(s.got / s.total * 100) + '% (' + gb(s.got) + T(' z ', ' of ') + gb(s.total) + ')' : '');
      else line = T('Nie pobrany. Plik ' + MODELS[k].size + ', pobieranie tylko przez Wi‑Fi.', 'Not downloaded. File ' + MODELS[k].size.replace(',', '.') + ', download over Wi‑Fi only.');
      if (s.error) line = T('Pobieranie nie udało się (' + s.error + '). Spróbuj jeszcze raz.', 'Download failed (' + s.error + '). Try again.');
      var h = '<h2>' + T('Model tekstowy na telefonie', 'On-device text model') + '</h2><p class="hint">' + T('Układa notatki w dobre zdania po angielsku i łączy je w jeden akapit raportu. Nie dodaje faktów; wynik zawsze sprawdzasz Ty. Bez modelu apka działa jak dotąd.', 'Turns notes into good English sentences and joins them into one report paragraph. It adds no facts; you always check the result. Without the model the app works as before.') + '</p>' +
        '<label class="field"><span>Model</span><select data-model-key><option value="E2B"' + (k === 'E2B' ? ' selected' : '') + '>' + T('Gemma 4 E2B – mniejszy, szybszy (2,6 GB)', 'Gemma 4 E2B – smaller, faster (2.6 GB)') + '</option><option value="E4B"' + (k === 'E4B' ? ' selected' : '') + '>' + T('Gemma 4 E4B – dokładniejszy (3,7 GB)', 'Gemma 4 E4B – more accurate (3.7 GB)') + '</option></select></label>' +
        '<p data-model-line>' + line + (err ? '<br>' + err : '') + '</p><div class="row">' +
        (available() && s.supported !== false && !s.ready && !s.downloading ? '<button type="button" class="btn" data-model-act="download">' + T('⬇ Pobierz model (Wi‑Fi)', '⬇ Download model (Wi‑Fi)') + '</button>' : '') +
        (s.downloading ? '<button type="button" class="btn" data-model-act="remove">' + T('Anuluj pobieranie', 'Cancel download') + '</button>' : '') +
        (s.ready ? '<button type="button" class="btn" data-model-act="remove">' + T('Usuń model z telefonu', 'Remove model from phone') + '</button>' : '') + '</div>';
      (w.OESTPodmien ? w.OESTPodmien.html(el, h) : (el.innerHTML = h)); // bez przerysowania przy zmianie języka
      var sel = el.querySelector('[data-model-key]'); sel.oninput = function (e) { e.stopPropagation(); }; sel.onchange = function (e) { e.stopPropagation(); setKey(e.target.value); refresh(); };
      el.querySelectorAll('[data-model-act]').forEach(function (b) { b.onclick = async function () {
        var a = b.getAttribute('data-model-act'); if (a === 'remove' && !(await (w.OESTPytaj ? w.OESTPytaj(T('Usunąć plik modelu z telefonu?', 'Remove the model file from the phone?')) : w.confirm(T('Usunąć plik modelu z telefonu?', 'Remove the model file from the phone?'))))) return;
        (a === 'download' ? download() : remove()).then(refresh, function (e) { refresh(w.OESTBledy ? w.OESTBledy.text(e) : e.message); });
      }; });
      clearInterval(timer); if (s.downloading) timer = setInterval(refresh, 3000);
    }
    function refresh(err) { status().then(function (s) { draw(s || {}, err); }, function (e) { draw({}, w.OESTBledy ? w.OESTBledy.text(e) : e.message); }); }
    refresh();
    // zmiana języka: panel rysuje się na nowo tylko ze stanem modelu (pola nie ma tu do zgubienia)
    w.addEventListener('oest:lang', function on() { if (!el.isConnected) { w.removeEventListener('oest:lang', on); return; } refresh(); });
  }
  w.OESTModel = { MODELS: MODELS, RULES: RULES, available: available, status: status, download: download, remove: remove, ready: ready, polish: polish, combine: combine, missingNumbers: missingNumbers, key: key, setKey: setKey, mount: mount };
})(window);
