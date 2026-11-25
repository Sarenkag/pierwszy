/* Ekran „Zdjęcia”: miejsce na telefonie i na Dysku, jakość, limity, synchronizacja, przeglądanie.
 * Logika jest w moduly/zdjecia/zdjecia.js; tu dane ekranu (OESTZdjeciaUI.dane() itd.) i adapter Google Drive (OESTGoogle).
 * Wygląd: moduly/szkielet/src/ekrany/Zdjecia.vue (Ionic + Vue). */
(function (w) {
  'use strict';
  var Z = w.OESTZdjecia, G = w.OESTGoogle, $ = function (id) { return w.document.getElementById(id); };
  if (!Z) return;
  var urls = [], query = '', msg = '';
  var MB = 1024 * 1024;
  function loc() { return w.OESTT('pl-PL', 'en-GB'); }

  function mb(b) { return (b / MB).toLocaleString(loc(), { maximumFractionDigits: b < 10 * MB ? 1 : 0 }) + ' MB'; }
  function drive() {
    return {
      ensureFolder: function (name, parent) { return G.ensureFolder(name, parent); },
      upload: function (parent, name, blob, props) { return G.uploadFile(parent, name, blob, props); },
      find: function (parent, name, props) { return G.findFile(parent, name, props); }, // ponowna próba po przerwanej wysyłce: ten sam plik, bez duplikatu
      remove: function (id) { return G.removeFile(id); }
    };
  }
  function errText(e) {
    var m = String(e && e.message || e);
    if (/GOOGLE_SETUP|GOOGLE_CONNECT|GOOGLE_TOKEN/.test(m)) return w.OESTT('Brak połączenia z Google Drive. Zaloguj się w apce kontem Google.', 'Not connected to Google Drive. Sign in with your Google account in the app.');
    if (/GOOGLE_ACCOUNT_MISMATCH/.test(m)) return w.OESTT('Wybrano inne konto Google niż to, na które jesteś zalogowany.', 'You chose a different Google account than the one you are signed in with.');
    if (/GOOGLE_BUSY/.test(m)) return w.OESTT('Dysk jest zajęty inną operacją. Spróbuj za chwilę.', 'Drive is busy with another operation. Try again shortly.');
    if (/GOOGLE_OFFLINE/.test(m)) return w.OESTT('Brak internetu. Zdjęcia poczekają na następną próbę.', 'No internet. Photos will wait for the next attempt.');
    if (/GOOGLE_CANCELLED/.test(m)) return w.OESTT('Anulowano. Zdjęcia zostają w telefonie.', 'Cancelled. Photos stay on the phone.');
    if (/LOGIN_TIMEOUT/.test(m)) return w.OESTT('Okno Google nie odpowiedziało. Spróbuj ponownie.', 'The Google window did not respond. Try again.');
    if (/GOOGLE_HTTP_401/.test(m)) return w.OESTT('Pozwolenie Dysku wygasło. Stuknij jeszcze raz, apka poprosi o ponowne połączenie.', 'Drive permission expired. Tap again and the app will ask to reconnect.');
    if (/AbortError|Failed to fetch|TypeError/.test(m)) return w.OESTT('Brak internetu albo za słaby sygnał. Zdjęcia poczekają na następną próbę.', 'No internet or weak signal. Photos will wait for the next attempt.');
    return w.OESTBledy ? w.OESTBledy.text(e) : w.OESTT('Nie udało się: ', 'Failed: ') + m;
  }

  async function syncNow(force, h) {
    if (!G) throw Error('GOOGLE_SETUP');
    if (!(await G.ready('drive'))) await G.connect('drive'); // jedno sprawdzenie: OESTGoogle.ready
    if (h) h.step(w.OESTT('Wysyłam na Dysk…', 'Uploading to Drive…'));
    return Z.sync(drive(), force);
  }
  // automatycznie: tylko na Wi-Fi; połączenie sprawdza OESTGoogle.ready (cichy token, bez wyskakujących okien)
  function paused() { try { return w.localStorage.getItem('oest.zdjecia.pause') === '1'; } catch (_) { return false; } }
  function auto() {
    if (!G || Z.busy() || paused()) return; // „Wstrzymaj” z okienka Dysku na ekranie głównym
    G.ready('drive').then(function (ok) { if (!ok || Z.busy() || paused()) return; /* „Wstrzymaj” mogło przyjść w trakcie sprawdzania */ return G.background ? G.background(function () { return Z.sync(drive(), false); }) : Z.sync(drive(), false); }).then(function (r) { if (r && r.sent) { msg = w.OESTT('Wysłano na Dysk: ', 'Uploaded to Drive: ') + r.sent + '.'; render(); } }).catch(function () {});
  }

  // ---------- dane ekranu (moduly/szkielet/src/ekrany/Zdjecia.vue): zwykły obiekt, ekran niczego nie liczy ----------
  var sluchacze = [];
  function render() { sluchacze.forEach(function (f) { try { f(); } catch (e) {} }); } // zmiana danych → ekran Vue pyta o dane() jeszcze raz
  function zmiany(fn) { sluchacze.push(fn); return function () { var i = sluchacze.indexOf(fn); if (i >= 0) sluchacze.splice(i, 1); }; }
  function pasek(used, limit) { var p = Math.min(100, Math.round(used / limit * 100)); return { procent: p, pelny: p >= 90 }; }
  async function dane() {
    var s = Z.settings(), all = await Z.list(), st = Z.stats(all), found = Z.search(all, query).slice(0, 120);
    var days = {}, kolej = []; found.forEach(function (r) { if (!days[r.day]) { days[r.day] = []; kolej.push(r.day); } days[r.day].push(r); });
    var last = s.lastSync ? new Date(s.lastSync).toLocaleString(loc()) : w.OESTT('jeszcze nie', 'not yet');
    var pusto = found.length ? null : all.length ? ['Nic nie pasuje do wyszukiwania.', 'Nothing matches the search.'] : ['Brak zdjęć. Zdjęcia z inspekcji i Reactive pojawią się tutaj.', 'No photos. Photos from inspections and Reactive will appear here.'];
    return {
      telefon: Object.assign(pasek(st.phoneBytes, s.phoneLimitMB * MB), { tytul: w.OESTT('Telefon (folder OEST w apce)', 'Phone (OEST folder in the app)'),
        tekst: mb(st.phoneBytes) + w.OESTT(' z ', ' of ') + mb(s.phoneLimitMB * MB) + ' · ' + st.phoneCount + w.OESTT(' zdjęć · czeka na wysłanie: ', ' photos · waiting to upload: ') + st.pending + ' (' + mb(st.pendingBytes) + ')' }),
      dysk: Object.assign(pasek(st.driveBytes, s.driveLimitMB * MB), { tytul: 'Google Drive („' + s.rootName + '”)',
        tekst: mb(st.driveBytes) + w.OESTT(' z ', ' of ') + mb(s.driveLimitMB * MB) + ' · ' + st.driveCount + w.OESTT(' zdjęć · ostatnia synchronizacja: ', ' photos · last sync: ') + last }),
      zajety: Z.busy(), komunikat: msg, szukaj: query,
      ustawienia: { preset: s.preset, phoneLimitMB: s.phoneLimitMB, warnMB: s.warnMB, driveLimitMB: s.driveLimitMB, wifiOnly: !!s.wifiOnly },
      presety: Object.keys(Z.PRESETS).map(function (k) { return { v: k, t: w.OESTT(Z.PRESETS[k].pl, Z.PRESETS[k].en) }; }),
      dni: kolej.map(function (d) { return { dzien: d, n: days[d].length, zdjecia: days[d].map(function (r) { return { id: r.id, nazwa: r.name, opis: [r.category, r.code || r.location].filter(Boolean).join(' · '), tylkoDysk: !r.hasBlob }; }) }; }),
      pusto: pusto ? w.OESTT(pusto[0], pusto[1]) : '',
      pustoRezerwa: pusto ? (w.OESTT(pusto[0], pusto[1]) === pusto[0] ? pusto[1] : pusto[0]) : '' // tekst w drugim języku: ekran rezerwuje wyższy z dwóch (PL/EN nie przesuwa treści, jak OESTBledy na main)
    };
  }
  function szukaj(v) { query = String(v || ''); render(); }
  // miniatura zdjęcia z telefonu (adres obrazka; zwalniany przy następnym zwolnij())
  async function miniatura(id) { var b = await Z.blob(id); if (!b) return null; var u = URL.createObjectURL(b); urls.push(u); return u; }
  function zwolnij() { urls.forEach(function (u) { URL.revokeObjectURL(u); }); urls = []; }
  // „Wyślij teraz na Dysk” (przycisk akcji: kółko + etap): wynik = napis na przycisku po sukcesie; błąd = komunikat pod przyciskiem
  function wyslij(etap) {
    msg = ''; render();
    var h = { step: function (t) { if (etap) etap(t); } };
    if (etap) etap(w.OESTT('Sprawdzam połączenie', 'Checking connection') + '…');
    return (G && G.foreground ? G.foreground(function () { return syncNow(true, h); }) : syncNow(true, h)).then(function (r) {
      msg = r.sent ? w.OESTT('Wysłano na Dysk: ', 'Uploaded to Drive: ') + r.sent + '.' : w.OESTT('Wszystko jest już na Dysku.', 'Everything is already on Drive.'); render();
      return r.sent ? w.OESTT('Wysłano ', 'Uploaded ') + r.sent : w.OESTT('Gotowe', 'Done');
    }, function (e) { msg = errText(e); render(); throw e; });
  }
  function zapisz(u) {
    Z.setSettings({ preset: u.preset, phoneLimitMB: +u.phoneLimitMB, warnMB: +u.warnMB, driveLimitMB: Z.settings().driveLimitMB, wifiOnly: Z.settings().wifiOnly });
    msg = w.OESTT('Ustawienia zapisane.', 'Settings saved.'); render();
  }
  // podgląd zdjęcia: null = brak w telefonie (komunikat na ekranie), inaczej dane okienka (OESTOkna.okno)
  async function podglad(id) {
    var r = (await Z.list()).filter(function (x) { return x.id === id; })[0], blob = await Z.blob(id);
    if (!blob) { msg = (r ? r.name : w.OESTT('Zdjęcie', 'Photo')) + w.OESTT(' jest już tylko na Dysku (folder ', ' is now only on Drive (folder ') + (r ? r.folder.join(' / ') : '') + ').'; render(); return null; }
    var u = URL.createObjectURL(blob); urls.push(u);
    return { id: id, adres: u, nazwa: r.name, opis: r.folder.join(' / ') + ' · ' + mb(r.size), usun: w.OESTT('Usuń', 'Delete'), zamknij: w.OESTT('Zamknij', 'Close') };
  }
  // usunięcie z podglądu: { ok } albo { blad: tekst } (komunikat zostaje w okienku)
  async function usun(id) {
    var r = (await Z.list()).filter(function (x) { return x.id === id; })[0]; if (!r) return { ok: false };
    try { if (!(await delPhoto(r))) return { ok: false }; } catch (err) { return { ok: false, blad: w.OESTT('Nie usunięto: ', 'Not deleted: ') + errText(err) }; }
    msg = w.OESTT('Usunięto: ', 'Deleted: ') + r.name + '.'; render(); return { ok: true };
  }
  // usuwanie (Grzegorz 03/11): z telefonu i z Dysku, po potwierdzeniu
  async function delPhoto(r) {
    // zdjęcie w inspekcji (Grzegorz 04/11: inspekcje i zdjęcia nigdy nie znikają): usunąć je można tylko z samej inspekcji
    if (r.hold) { await w.OESTOkna.pytaj({ tresc: w.OESTT('To zdjęcie jest w inspekcji, więc tutaj nie da się go usunąć. Najpierw usuń je w inspekcji.', 'This photo is in an inspection, so it cannot be deleted here. Delete it in the inspection first.'), tylkoOk: true }); return false; }
    var txt = r.driveId ? w.OESTT('Zniknie z telefonu i z Dysku Google.', 'It will be removed from the phone and Google Drive.') : w.OESTT('Zniknie z telefonu.', 'It will be removed from the phone.');
    var yes = await w.OESTOkna.pytaj({ tytul: w.OESTT('Usunąć zdjęcie?', 'Delete photo?'), tresc: r.name + '. ' + txt, ok: w.OESTT('Usuń', 'Delete'), anuluj: w.OESTT('Anuluj', 'Cancel'), niebezpieczne: true });
    if (!yes) return false;
    // trwa wysyłka na Dysk: czekamy, aż skończy, i bierzemy świeże dane (zdjęcie mogło właśnie dostać driveId)
    for (var i = 0; Z.busy() && i < 600; i++) await new Promise(function (ok) { setTimeout(ok, 500); });
    if (Z.busy()) throw Error(w.OESTT('Trwa wysyłka zdjęć na Dysk – spróbuj usunąć za chwilę.', 'Photos are uploading to Drive – try deleting in a moment.'));
    r = (await Z.list()).filter(function (x) { return x.id === r.id; })[0] || r;
    if (r.driveId && G) {
      try { await G.foreground(function () { return G.removeFile(r.driveId); }); }
      catch (e) { if (!/404/.test(String(e && e.message))) throw e; }
    }
    await Z.remove(r.id); return true;
  }

  Z.onChange(function () { render(); });
  var soon; Z.onSaved(function () { clearTimeout(soon); soon = w.setTimeout(auto, 2000); }); // nowe zdjęcie → wyślij, jeśli Dysk połączony i Wi-Fi
  w.addEventListener('online', auto);
  if (w.navigator.connection && w.navigator.connection.addEventListener) w.navigator.connection.addEventListener('change', auto);
  w.setTimeout(auto, 3000);

  w.OESTZdjeciaUI = { open: function () { msg = ''; render(); auto(); }, dane: dane, zmiany: zmiany, szukaj: szukaj, miniatura: miniatura, zwolnij: zwolnij, wyslij: wyslij, zapisz: zapisz, podglad: podglad, usun: usun, auto: auto, syncNow: syncNow, errText: errText,
    paused: paused, setPaused: function (on) { try { if (on) w.localStorage.setItem('oest.zdjecia.pause', '1'); else w.localStorage.removeItem('oest.zdjecia.pause'); } catch (_) {} if (!on) auto(); } };
})(window);
