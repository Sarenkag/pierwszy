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
  function lang() {
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
    var m = String(e && (e.code || e.message) || e || '').trim();
    var code = (m.match(/^[A-Z][A-Z0-9_]{3,}/) || [''])[0];
    if (/GOOGLE_HTTP_\d+/.test(m)) return http(m, i);
    if (D[code]) return D[code][i];
    for (var k = 0; k < FAM.length; k++) if (FAM[k][0].test(code)) return FAM[k][1][i];
    if (/Failed to fetch|NetworkError|Load failed|network|ERR_INTERNET|ERR_NAME_NOT_RESOLVED|offline/i.test(m)) return ['Brak internetu albo za słaby sygnał.', 'No internet or weak signal.'][i];
    if (/AbortError|aborted|timeout|timed out/i.test(m)) return ['Operacja trwała za długo i została przerwana. Spróbuj ponownie.', 'The operation took too long and was stopped. Try again.'][i];
    if (/QuotaExceeded|quota/i.test(m)) return ['Brak miejsca w pamięci apki.', 'App storage is full.'][i];
    if (/cancel/i.test(m)) return ['Anulowano.', 'Cancelled.'][i];
    if (/permission|denied|not allowed/i.test(m)) return ['Brak zgody telefonu na tę operację.', 'The phone did not allow this operation.'][i];
    if (code) return ['Nie udało się (kod ' + code + ').', 'Failed (code ' + code + ').'][i];
    // zwykłe zdanie: jeśli już po polsku, zostawiamy; jeśli angielskie w polskim UI – ogólny tekst + szczegół w nawiasie
    if (!m) return ['Nie udało się.', 'Failed.'][i];
    if (i === 0 && !/[ąćęłńóśźż]/i.test(m) && /\b(the|is|not|failed|error|cannot|unable|invalid)\b/i.test(m)) return 'Nie udało się (' + m.slice(0, 80) + ').';
    return m;
  }
  var api = { text: text, lang: lang, D: D };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.OESTBledy = api;
})(this);
