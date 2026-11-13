/* moduly/bledy – JEDNO miejsce, które zamienia błąd (kod, błąd przeglądarki, odpowiedź Google) na zdanie dla człowieka.
 * Grzegorz 03/11/2026: w apce żadnych kodów ani angielskich komunikatów, gdy wybrany jest polski (EN – po angielsku).
 * Użycie: OESTBledy.text(e)  → tekst w języku ustawień apki;  OESTBledy.text(e, 'en') → po angielsku.
 * Moduły mają swoje szczegółowe teksty; to jest wspólny słownik i bezpieczny zapas (nigdy surowy kod). */
(function (root) {
  // [pl, en]
  var D = {
    // Google / sieć
    GOOGLE_SETUP: ['Połączenie z Google działa tylko w aplikacji na telefonie.', 'Google connection works only in the Android app.'],
    GOOGLE_CONNECT: ['Brak połączenia z Google. Stuknij jeszcze raz, apka poprosi o połączenie.', 'Not connected to Google. Tap again to connect.'],
    GOOGLE_TOKEN: ['Google nie wydał pozwolenia. Połącz się ponownie.', 'Google did not grant permission. Connect again.'],
    GOOGLE_ACCOUNT_MISMATCH: ['Wybrano inne konto Google niż to, na które jesteś zalogowany.', 'You chose a different Google account than the one you are signed in with.'],
    GOOGLE_BUSY: ['Trwa inna operacja Google. Spróbuj za chwilę.', 'Another Google operation is running. Try again shortly.'],
    GOOGLE_OFFLINE: ['Brak internetu.', 'No internet connection.'],
    GOOGLE_CANCELLED: ['Anulowano.', 'Cancelled.'],
    GOOGLE_LOGIN_TIMEOUT: ['Okno Google nie odpowiedziało. Spróbuj ponownie.', 'Google sign-in did not respond. Try again.'],
    FILE_ID: ['Nieprawidłowy plik na Dysku.', 'Invalid Drive file.'],
    FOLDER_ID: ['Nieprawidłowy folder na Dysku.', 'Invalid Drive folder.'],
    FOLDER_NAME: ['Podaj nazwę folderu.', 'Enter a folder name.'],
    FOLDER_WRITE: ['Nie można zapisać w tym folderze.', 'Cannot write to this folder.'],
    DRIVE_BACKUP_UNAVAILABLE: ['Kopia na Dysku jest teraz niedostępna.', 'Drive backup is unavailable right now.'],
    // poczta / wysyłka / udostępnianie
    EMAIL_INVALID: ['Nieprawidłowy adres e-mail. Sprawdź adres w Ustawieniach.', 'Invalid email address. Check it in Settings.'],
    EMAIL_RESULT_UNCERTAIN: ['Nie wiadomo, czy mail wyszedł (słaby zasięg). Sprawdź „Wysłane” w Gmailu, zanim ponowisz.', 'Not sure the email was sent (weak signal). Check Gmail Sent before retrying.'],
    RECIPIENT_REQUIRED: ['Podaj odbiorcę.', 'Add a recipient.'],
    DELIVERY_STATE: ['Nieprawidłowy stan wysyłki.', 'Invalid delivery state.'],
    QUEUE_ADAPTER_NOT_CONNECTED: ['Kolejka wysyłki nie jest podłączona.', 'Send queue is not connected.'],
    SHARE_UNCONFIRMED: ['Telefon nie potwierdził udostępnienia.', 'The phone did not confirm sharing.'],
    SHARE_SIZE_LIMIT: ['Pliki są za duże do udostępnienia.', 'Files are too large to share.'],
    SHARE_ATTACHMENTS_UNAVAILABLE: ['Ten telefon nie udostępnia załączników z apki.', 'This phone cannot share attachments from the app.'],
    MAILTO_TOO_LONG: ['Wiadomość jest za długa dla aplikacji poczty.', 'Message is too long for the mail app.'],
    // zapis w telefonie
    STORAGE_WRITE: ['Brak miejsca albo odmowa zapisu. Zmiany NIE zostały zapisane.', 'Storage full or denied. Changes were NOT saved.'],
    STORAGE_CORRUPT: ['Zapisane dane są uszkodzone. Nie nadpisano ich.', 'Stored data is corrupt and was not overwritten.'],
    INDEXEDDB_UNAVAILABLE: ['Pamięć apki w telefonie jest niedostępna.', 'App storage on this phone is unavailable.'],
    INDEXEDDB_BLOCKED: ['Pamięć apki jest zablokowana przez inne okno. Zamknij je i spróbuj ponownie.', 'App storage is blocked by another window. Close it and try again.'],
    SETTINGS_LIMIT: ['Ustawienia są za duże do zapisania.', 'Settings are too large to save.'],
    DRAFT_INVALID: ['Szkic jest uszkodzony.', 'The draft is damaged.'],
    REPORT_DOCX: ['Nie powstał Word raportu. Nic nie zapisano.', 'The Word report was not created. Nothing was saved.'],
    REPORT_MISSING: ['Tego raportu nie ma już w telefonie.', 'This report is no longer on the phone.'],
    REPORT_NO_DATA: ['Ten raport nie ma zapisanej inspekcji (wysłany przed wersją z odzyskiwaniem). Można go obejrzeć i wysłać.', 'This report has no saved inspection (sent before recovery existed). You can view and send it.'],
    // konto / kopie
    ACCOUNT_REQUIRED: ['Najpierw zaloguj się w apce.', 'Sign in to the app first.'],
    ACCOUNT_CHANGED: ['Zmieniło się konto w trakcie. Nic nie zapisano.', 'The account changed meanwhile. Nothing was saved.'],
    BACKUP_OWNER: ['To kopia innego konta. Nic nie przywrócono.', 'This backup belongs to another account. Nothing restored.'],
    BACKUP_VERSION: ['Tej kopii nie da się odczytać (inna wersja).', 'This backup cannot be read (different version).'],
    BACKUP_NOT_CONFIRMED: ['Nie potwierdzono zapisu kopii.', 'Backup was not confirmed.'],
    SIGNATURE_TRANSPARENCY: ['Wybierz PNG z przezroczystym tłem.', 'Choose a PNG with a transparent background.'],
    SCHEDULE_DUPLICATE: ['Grafik z tą datą już istnieje.', 'A schedule starting on this date already exists.'],
    SHIFT_MISSING: ['Brak grafiku. Ustaw go w Ustawieniach → Kalendarz i grafik.', 'No shift pattern. Set it in Settings → Calendar & shifts.'],
    SHIFT_OVERLAP: ['Zmiany nachodzą na siebie.', 'Shifts overlap.'],
    SHIFT_DATE: ['Nieprawidłowa data zmiany.', 'Invalid shift date.'],
    SHIFT_ARCHIVED: ['Ta zmiana jest już zarchiwizowana.', 'This shift is already archived.'],
    CONTACT_LABEL: ['Wybierz etykietę kontaktów.', 'Choose a contacts label.'],
    CONTACT_INVALID: ['Wpisz imię lub nazwę działu.', 'Enter a name or department.'],
    CONTACT_LABEL_TOO_LARGE: ['Etykieta ma za dużo kontaktów.', 'The label has too many contacts.'],
    CONTACT_PARTIAL: ['Pobrano tylko część kontaktów.', 'Only some contacts were loaded.'],
    // kalendarz
    ANDROID_CALENDAR_REQUIRED: ['Kalendarz telefonu działa tylko w aplikacji na Androidzie.', 'Phone calendar works only in the Android app.'],
    CALENDAR_SCHEDULE_REQUIRED: ['Najpierw ustaw grafik zmian.', 'Set your shift pattern first.'],
    CALENDAR_WRITE_UNCONFIRMED: ['Telefon nie potwierdził zapisu w kalendarzu.', 'The phone did not confirm the calendar write.'],
    CALENDAR_WORKDAY_NOT_FOUND: ['Nie znalazłem dnia pracy w tym okresie.', 'No working day found in this period.'],
    CALENDAR_DISABLE_FIRST: ['Najpierw wyłącz synchronizację kalendarza.', 'Turn off calendar sync first.'],
    CALENDAR_ACCOUNT_CHANGED: ['Zmieniło się konto. Kalendarz nie został zmieniony.', 'The account changed. Calendar was not changed.'],
    CALENDAR_CONFIG_CHANGED: ['Ustawienia kalendarza zmieniły się w trakcie. Spróbuj ponownie.', 'Calendar settings changed meanwhile. Try again.'],
    // zdjęcia / aparat / nagrania
    IMAGE_INVALID: ['To nie jest prawidłowe zdjęcie.', 'This is not a valid image.'],
    IMAGE_TOO_LARGE: ['Zdjęcie jest za duże.', 'The image is too large.'],
    IMAGE_COMPRESSION: ['Nie udało się zmniejszyć zdjęcia.', 'Could not compress the image.'],
    MAX_30_PHOTOS: ['Najwyżej 30 zdjęć.', 'Maximum 30 photos.'],
    MAX_30_MEDIA: ['Najwyżej 30 zdjęć i nagrań.', 'Maximum 30 photos and recordings.'],
    EVIDENCE_MISSING: ['Brakuje zdjęcia albo nagrania.', 'A photo or recording is missing.'],
    AUDIO_UNAVAILABLE: ['Mikrofon jest niedostępny.', 'Microphone is unavailable.'],
    AUDIO_REQUIRED: ['Najpierw nagraj notatkę.', 'Record a note first.'],
    AUDIO_ALREADY_RECORDING: ['Nagranie już trwa.', 'Already recording.'],
    STOP_RECORDING_FIRST: ['Najpierw zatrzymaj nagrywanie.', 'Stop recording first.'],
    ANDROID_TRANSCRIPTION_REQUIRED: ['Zamiana nagrania na tekst działa tylko w aplikacji na Androidzie.', 'Transcription works only in the Android app.'],
    MICROPHONE_DENIED: ['Brak zgody na mikrofon.', 'Microphone permission denied.'],
    AUDIO_SAVE_FAILED: ['Nie udało się zapisać nagrania. Nagraj jeszcze raz.', 'Could not save the recording. Record again.'],
    AUDIO_BUSY: ['Mikrofon jest zajęty przez inną aplikację.', 'The microphone is busy in another app.'],
    AUDIO_NOT_RECORDING: ['Nagrywanie już się zakończyło.', 'Recording has already stopped.'],
    AUDIO_SILENT: ['Nagranie jest ciche — nic nie słychać. Nagraj jeszcze raz bliżej telefonu.', 'The recording is silent. Record again closer to the phone.'],
    AUDIO_SIZE: ['Nagranie jest za długie do zamiany na tekst.', 'The recording is too long to turn into text.'],
    AUDIO_FORMAT: ['Nieprawidłowy format nagrania.', 'Invalid recording format.'],
    // AI / model
    MODEL_NOT_CONFIGURED: ['Model AI nie jest ustawiony.', 'AI model is not configured.'],
    MODEL_KEY: ['Nieznany model AI.', 'Unknown AI model.'],
    AI_INVALID: ['Model AI zwrócił nieprawidłowy tekst.', 'The AI model returned invalid text.'],
    AI_NUMBERS_CHANGED: ['Model AI zmienił liczby – sprawdź tekst.', 'The AI model changed numbers – check the text.'],
    // raporty / zlecenia
    REPORT_TEMPLATE_MISSING: ['Brak wzoru raportu dla tej inspekcji.', 'No report template for this inspection.'],
    FLUSH_TPL: ['Wzór raportu Flushing jest uszkodzony.', 'The Flushing report template is damaged.'],
    JOB_MISSING: ['Nie znaleziono zlecenia.', 'Job not found.'],
    JOB_STATUS: ['Nieprawidłowy status zlecenia.', 'Invalid job status.'],
    JOB_SCOPE: ['Zlecenie spoza zakresu.', 'Job out of scope.'],
    ARCHIVED: ['To jest już w archiwum.', 'This is already archived.'],
    ARCHIVE_MISSING: ['Nie ma tego w archiwum.', 'Not found in the archive.'],
    ENTRY_INVALID: ['Wpis jest niepełny.', 'The entry is incomplete.'],
    REACTIVE_FIELDS: ['Uzupełnij wymagane pola zadania.', 'Fill in the required task fields.'],
    VANTIFY_FIELDS: ['Rubryki Vantify są niepoprawne. Popraw je w części Vantify zadania.', 'The Vantify fields are not valid. Correct them in the Vantify part of the job.'],
    VANTIFY_LABOUR: ['Czas pracy: od 1 do 24 godzin, co pół godziny.', 'Time worked: 1 to 24 hours, in half hours.'],
    VANTIFY_JOB_NO: ['Nr zlecenia Vantify to same cyfry, np. 3051375.', 'The Vantify job no. is digits only, e.g. 3051375.'],
    REACTIVE_STATUS: ['Nieprawidłowy status zadania.', 'Invalid task status.'],
    REACTIVE_TREE: ['Nieprawidłowy wybór z listy usterek.', 'Invalid fault selection.'],
    REACTIVE_ACTION: ['Tej akcji nie można teraz wykonać.', 'This action is not available now.'],
    REACTIVE_DRAFT_SIZE: ['Zadanie jest za duże do zapisania. Usuń część zdjęć.', 'The task is too large to save. Remove some photos.'],
    KEY_ACCOUNT_CHANGED: ['Zmieniło się konto. Nic nie zapisano.', 'The account changed. Nothing was saved.'],
    POWER_ACCOUNT_CHANGED: ['Zmieniło się konto. Nic nie zapisano.', 'The account changed. Nothing was saved.'],
    QUESTIONS_ACCOUNT_CHANGED: ['Zmieniło się konto. Nic nie zapisano.', 'The account changed. Nothing was saved.']
  };
  // całe rodziny kodów: zrozumiały zapas zamiast surowego kodu
  var FAM = [
    [/^KEY_IMPORT/, ['Nie można wczytać pliku kluczy.', 'Cannot import the keys file.']],
    [/^KEY_/, ['Klucze: nie udało się – sprawdź zdjęcie i pola.', 'Keys: failed – check the photo and fields.']],
    [/^POWER_IMPORT/, ['Nie można wczytać pliku Power trace.', 'Cannot import the Power trace file.']],
    [/^POWER_OCR/, ['Nie udało się odczytać tabeli ze zdjęcia. Wpisz ją ręcznie.', 'Could not read the table from the photo. Enter it manually.']],
    [/^POWER_/, ['Power trace: nie udało się – sprawdź pola.', 'Power trace: failed – check the fields.']],
    [/^QUESTIONS_IMPORT|^QUESTIONS_PROPOSAL|^QUESTIONS_FILENAME|^QUESTIONS_SCHEMA/, ['Nie można wczytać pliku z pytaniami.', 'Cannot import the questions file.']],
    [/^QUESTIONS_/, ['Pytania: nie udało się – sprawdź pola.', 'Questions: failed – check the fields.']],
    [/^CALENDAR_/, ['Kalendarz: nie udało się – sprawdź ustawienia.', 'Calendar: failed – check settings.']],
    [/^SHARE_/, ['Nie udało się udostępnić.', 'Sharing failed.']],
    [/^SPEECH_|^ON_DEVICE_POLISH_SPEECH|^RECORDED_SPEECH/, ['Nie udało się zamienić nagrania na tekst.', 'Could not transcribe the recording.']]
  ];
  var force = null; // wJezyku: na chwilę drugi język (np. pomiar miejsca pod PL i EN), bez zapisu ustawień
  function wJezyku(l, fn) { var k = force; force = l; try { return fn(); } finally { force = k; } }
  function drugi() { return lang() === 'en' ? 'pl' : 'en'; }
  function lang() {
    if (force) return force;
    try { var S = root.OESTSettings && root.OESTSettings.get && root.OESTSettings.get(); if (S && S.appearance && S.appearance.language) return S.appearance.language; } catch (e) {}
    try { var raw = root.localStorage && root.localStorage.getItem('oest.lang'); if (raw) return raw; } catch (e) {}
    return 'pl';
  }
  function http(m, i) {
    var c = +(m.match(/GOOGLE_HTTP_(\d+)/) || [])[1];
    if (c === 401) return ['Pozwolenie Google wygasło. Stuknij jeszcze raz – apka poprosi o ponowne połączenie.', 'Google permission expired. Tap again to reconnect.'][i];
    if (c === 403) return ['Google odmówił dostępu. Połącz ponownie i zgódź się na dostęp.', 'Google denied access. Reconnect and allow access.'][i];
    if (c === 404) return ['Nie znaleziono pliku lub folderu na Dysku.', 'File or folder not found on Drive.'][i];
    if (c === 413) return ['Plik jest za duży dla Google.', 'The file is too large for Google.'][i];
    if (c === 429) return ['Google prosi o chwilę przerwy. Spróbuj za minutę.', 'Google asks to slow down. Try again in a minute.'][i];
    if (c >= 500) return ['Serwer Google ma chwilowy problem. Spróbuj później.', 'Google server problem. Try again later.'][i];
    return ['Google odrzucił operację (' + c + ').', 'Google rejected the operation (' + c + ').'][i];
  }
  function text(e, l) {
    var i = (l || lang()) === 'en' ? 1 : 0;
    // kod aplikacji (tekst) ma pierwszeństwo; DOMException ma liczbowy .code – wtedy bierzemy nazwę i treść
    var m = String(e && typeof e.code === 'string' && e.code ? e.code : e && e.message != null ? (e.name && e.name !== 'Error' ? e.name + ': ' : '') + e.message : e || '').trim();
    var code = (m.match(/^[A-Z][A-Z0-9_]{3,}/) || [''])[0];
    if (/GOOGLE_HTTP_\d+/.test(m)) return http(m, i);
    if (D[code]) return D[code][i];
    for (var k = 0; k < FAM.length; k++) if (FAM[k][0].test(code)) return FAM[k][1][i];
    if (/Failed to fetch|NetworkError|Load failed|network|ERR_INTERNET|ERR_NAME_NOT_RESOLVED|offline/i.test(m)) return ['Brak internetu albo za słaby sygnał.', 'No internet or weak signal.'][i];
    if (/AbortError|aborted|timeout|timed out/i.test(m)) return ['Operacja trwała za długo i została przerwana. Spróbuj ponownie.', 'The operation took too long and was stopped. Try again.'][i];
    if (/QuotaExceeded|quota/i.test(m)) return ['Brak miejsca w pamięci apki.', 'App storage is full.'][i];
    if (/cancel/i.test(m)) return ['Anulowano.', 'Cancelled.'][i];
    if (/permission|denied|not allowed/i.test(m)) return ['Brak zgody telefonu na tę operację.', 'The phone did not allow this operation.'][i];
    if (code) return ['Nie udało się (kod ' + code + ').', 'Failed (code ' + code + ').'][i]; // i18n-ok
    // zwykłe zdanie: jeśli już po polsku, zostawiamy; jeśli angielskie w polskim UI – ogólny tekst + szczegół w nawiasie
    if (!m) return ['Nie udało się.', 'Failed.'][i];
    if (i === 0 && !/[ąćęłńóśźż]/i.test(m) && /\b(the|is|not|failed|error|cannot|unable|invalid)\b/i.test(m)) return 'Nie udało się (' + m.slice(0, 80) + ').'; // i18n-ok: tylko dla i === 0 (PL)
    return m;
  }
  // JEDNA funkcja dla tekstów na ekranie w całej apce: OESTT('po polsku', 'in English') – wg języka ustawień
  function t(pl, en) { return lang() === 'en' ? en : pl; }
  // Teksty z plików danych (Grzegorz 09/11/2026): apka wczytuje słownik { 'ekran.id': { pl, en } } przez zaladujTeksty,
  // ekran pyta tx('ekran.id', { n: 3 }). {nazwa} w tekście = wartość wstawiana przez apkę. Brak wpisu = id (test pilnuje, żeby nie było).
  var TEKSTY = {};
  function zaladujTeksty(d) { Object.keys(d || {}).forEach(function (k) { TEKSTY[k] = d[k]; }); }
  // jezyk (opcjonalnie): 'pl' / 'en', gdy ekran sam pilnuje swojego języka (np. ustawienia kalendarza)
  function tx(id, v, jezyk) {
    var e = TEKSTY[id]; if (!e) return id;
    return ((jezyk || lang()) === 'en' ? e.en : e.pl).replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] != null ? String(v[k]) : m; });
  }
  // Stały HTML strony: <b data-en="Keys">Klucze</b>, <button aria-label="Wstecz" data-en-aria-label="Back">.
  // Podmienia tylko tekst / atrybuty w miejscu (bez przerysowania ekranu). Polski oryginał zapamiętany w data-pl*.
  var ATTRS = ['aria-label', 'placeholder', 'title', 'alt'];
  // Miejsce pod oba języki (Grzegorz: zmiana języka nic nie przesuwa; miejsce na zmienne treści zarezerwowane z góry).
  // Element z data-en dostaje min-wysokość (blok) albo min-szerokość i wysokość (przycisk, element w rzędzie) dłuższego
  // z dwóch tekstów – PL i EN zajmują to samo miejsce. Liczone, gdy element jest widoczny, i od nowa przy zmianie szerokości.
  // Pomiar w paczce (3 przeliczenia układu na całą stronę): wszystkie w bieżącym języku, wszystkie w drugim, powrót.
  var RO = root.ResizeObserver ? new root.ResizeObserver(function (es) { reserve(es.map(function (e) { return e.target; })); }) : null;
  // rozmiar w układzie strony, bez transformacji (09/11/2026): ekran w trakcie wejścia jest chwilowo pomniejszony (Poświata, moduly/wyglad),
  // przycisk wciśnięty – getBoundingClientRect podałby wtedy za mały rozmiar i miejsce pod drugi język byłoby za ciasne (też moduly/podmien)
  function prostokat(el) {
    var r = el.getBoundingClientRect(), win = el.ownerDocument.defaultView, sx = 1, sy = 1;
    for (var n = el; n && n.nodeType === 1; n = n.parentElement) {
      var t = win.getComputedStyle(n).transform;
      if (t && t !== 'none') { var m = new win.DOMMatrixReadOnly(t); sx *= Math.hypot(m.a, m.b) || 1; sy *= Math.hypot(m.c, m.d) || 1; }
    }
    return sx === 1 && sy === 1 ? r : { width: r.width / sx, height: r.height / sy };
  }
  function reserve(els) {
    var todo = els.filter(function (el) {
      if (!el.isConnected || !el.getClientRects().length) return false;
      var pw = el.parentNode && el.parentNode.clientWidth, cur = el.textContent, pl = el.dataset.pl, en = el.dataset.en;
      if (el.__oestW === pw && el.__oestT === cur) return false;
      if (pl == null || en == null || pl === en || (cur !== pl && cur !== en)) return false; // tekst ustawiany przez JS
      var cs = root.getComputedStyle(el); if (cs.display === 'inline' || cs.display === 'contents') return false;
      el.__oestW = pw; el.__oestT = cur; el.style.minHeight = ''; el.style.minWidth = ''; return true;
    }).map(function (el) { return { el: el, cur: el.textContent, alt: el.textContent === el.dataset.pl ? el.dataset.en : el.dataset.pl }; });
    if (!todo.length) return;
    todo.forEach(function (x) { var cs = root.getComputedStyle(x.el), pr = prostokat(x.el.parentNode); x.cs = cs; x.a = prostokat(x.el); x.h = parseFloat(cs.height); x.w = parseFloat(cs.width); x.full = x.a.width >= pr.width - parseFloat(root.getComputedStyle(x.el.parentNode).paddingLeft) - parseFloat(root.getComputedStyle(x.el.parentNode).paddingRight) - 1; });
    todo.forEach(function (x) { x.el.textContent = x.alt; });
    todo.forEach(function (x) { x.b = prostokat(x.el); });
    todo.forEach(function (x) { x.el.textContent = x.cur; });
    todo.forEach(function (x) {
      if (x.b.height > x.a.height + 0.5) x.el.style.minHeight = (x.b.height - Math.max(0, x.a.height - x.h)) + 'px';
      if (!x.full && x.b.width > x.a.width + 0.5) x.el.style.minWidth = (x.b.width - Math.max(0, x.a.width - x.w)) + 'px';
    });
  }
  function applyDom(scope) {
    var en = lang() === 'en', doc = root.document, mine = []; if (!doc) return;
    (scope || doc).querySelectorAll('[data-en]').forEach(function (el) {
      if (el.dataset.pl == null) el.dataset.pl = el.textContent;
      // tekst podmieniony przez JS (np. licznik, nazwa szablonu) – zostawiamy, JS sam tłumaczy przez OESTT
      if (el.textContent !== el.dataset.pl && el.textContent !== el.dataset.en) return;
      el.textContent = en ? el.dataset.en : el.dataset.pl;
      if (RO && el.dataset.en !== el.dataset.pl) RO.observe(el);
      mine.push(el);
    });
    reserve(mine); // od razu, bez czekania na pierwszą klatkę (także treść poza ekranem)
    ATTRS.forEach(function (a) {
      (scope || doc).querySelectorAll('[data-en-' + a + ']').forEach(function (el) {
        if (!el.hasAttribute('data-pl-' + a)) el.setAttribute('data-pl-' + a, el.getAttribute(a) || '');
        el.setAttribute(a, el.getAttribute(en ? 'data-en-' + a : 'data-pl-' + a));
      });
    });
    if (doc.documentElement) doc.documentElement.lang = en ? 'en' : 'pl';
  }
  var api = { text: text, lang: lang, t: t, tx: tx, zaladujTeksty: zaladujTeksty, applyDom: applyDom, wJezyku: wJezyku, drugi: drugi, D: D, prostokat: prostokat };
  if (typeof module === 'object' && module.exports) module.exports = api; else { root.OESTBledy = api; root.OESTT = t; root.OESTTx = tx; }
})(this);
