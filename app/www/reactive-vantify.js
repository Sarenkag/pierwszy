/* Przyciski Vantify na karcie Reactive (Grzegorz 18/11/2026 „Tak”, PROD-038).
   Open Vantify: Summary = nazwa, Description = „Dodaj info na start” (+ miejsce), oba po angielsku, podgląd i poprawa przed wysłaniem.
     Po założeniu przycisk: „✓ Vantify #nr” (drugi raz się nie da). Bez PDF (Grzegorz 18/11: „przy tworzeniu nie musimy robić pdf”).
   Close Vantify: szary „Czeka na zatwierdzenie”, dopóki Josh nie zatwierdzi (stuknięcie = sprawdź teraz). Potem: braki (zdjęcia po,
     info na koniec) → Wróć / Zamknij mimo to; Job Sheet (tylko PDF, data zdjęcia) → „Tak” → Commence (gdy trzeba) + Complete z plikiem
     → ponowny odczyt; „✓ Zamknięte w Vantify” dopiero, gdy Vantify potwierdzi zamknięcie (PROD-035).
   Pierwszy raz (brak wzoru w telefonie): okno Vantify w apce z tekstem do wklejenia / Job Sheet do pola Upload; apka uczy się z tego.
   Stan na karcie: draft.vantify = {id, status, summary, at, closedAt, photos:{hrefs, seen, ids}}. Ekran reactive.js daje ctx: draft, kreator (OESTKreator albo brak), L, persist, render, message,
   english(scope, extra), jobSheet(date). Bez Capacitora (komputer, testy) przyciski mówią, że to działa w telefonie.
   Ekran z zakładkami (Grzegorz 26/11/2026, wariant B): Zlecenie → „Załóż w Vantify” (open), Zdjęcia → Update (zdjecia), Notatki → Update
   (notatki: Co zrobione, Rekomendacja, na końcu prośba o zatwierdzenie – osobne wiadomości), Zamknięcie → „Zamknij w Vantify” (close).
   Co poszło do Vantify, zostaje zablokowane (wyslane(d)): zlecenie, zdjęcia po id, notatki po rodzaju – z godziną. */
(function (w) {
  'use strict';
  const SITE = 6324, esc = w.OESTNarzedzia.esc; // esc: moduly/narzedzia (audyt nr 53)
  /* adres zlecenia w oknie Vantify: tylko przez Site (krótki #/user/jobs/<nr>/… daje biały ekran z kółkiem – Grzegorz 26/11/2026) */
  const jobHash = (id, tail) => '#/user/sites/list/details/' + encodeURIComponent(w.btoa('/sites/' + SITE)) + '/jobs/' + encodeURIComponent(w.btoa('/sites/' + SITE + '/jobs/' + id)) + '/' + tail;
  const plugin = () => { const C = w.Capacitor; if (!C?.isNativePlatform?.()) return null; return C.registerPlugin ? C.registerPlugin('Vantify') : C.Plugins?.Vantify || null; };
  const ask = o => w.OESTPrzycisk?.ask ? w.OESTPrzycisk.ask(o) : Promise.resolve(false);
  const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  function state(d) {
    const v = d?.vantify;
    if (!v?.id) return v?.pending ? 'pending' : 'none';
    if (v.closedAt || v.status === 'completed' || v.final) return v.fileSeen === false ? 'nofile' : 'closed';
    return v.status === 'approval_pending' ? 'approval' : 'open';
  }
  /* zdjęcia przed wysłane przy zakładaniu, a niewidoczne przy zleceniu (przegląd Codex #166): {hrefs, seen} na karcie */
  function photosMissing(d) { const p = d?.vantify?.photos; return p && Array.isArray(p.hrefs) ? p.hrefs.filter(h => !(p.seen || []).includes(h)).length : 0; }
  /* co już jest w Vantify (Grzegorz 26/11/2026: wysłane = zablokowane, szare, „✓ w Vantify, godzina”): godziny wysłania
     { zlecenie, zdjecia: { idZdjęcia: czas }, notatki: { done, rec, final: czas } } – czas ISO albo brak */
  function wyslane(d) {
    const v = d?.vantify || {}, p = v.photos || {}, zd = {}, n = {};
    if (!v.id) return { zlecenie: '', zdjecia: zd, notatki: n };
    (p.ids || []).forEach((id, i) => { if (id && (p.hrefs || [])[i]) zd[id] = (p.at || {})[id] || v.at || ''; });
    for (const k of ['done', 'rec', 'final']) if (v.notes?.[k]?.at) n[k] = v.notes[k].at;
    return { zlecenie: v.at || '', zdjecia: zd, notatki: n };
  }
  /* przycisk „Zamknij w Vantify” w zakładce Zamknięcie: { tekst, rx, ton } – ton: '' zwykły, 'off' przygaszony, 'done' zielony ✓, 'go' główny */
  function przyciski(d, L) {
    const s = state(d), v = d?.vantify || {}, b = (tekst, rx, ton) => ({ tekst, rx, ton: ton || '' });
    const open = s === 'none' || s === 'pending' ? b(L('Załóż w Vantify', 'Create in Vantify'), 'vt-open', s === 'pending' ? 'off' : 'go') : photosMissing(d) ? b('⚠ Vantify #' + v.id + ' · ' + L('zdjęcia ', 'photos ') + (v.photos.seen || []).length + '/' + v.photos.hrefs.length, 'vt-check', 'off') : b('✓ Vantify #' + v.id, 'vt-check', 'done');
    const close = s === 'none' || s === 'pending' ? b(L('Zamknij w Vantify', 'Close in Vantify'), 'vt-close', 'off') : s === 'approval' ? b(L('Czeka na zatwierdzenie', 'Awaiting approval'), 'vt-check', 'off') : s === 'closed' ? b(L('✓ Zamknięte w Vantify', '✓ Closed in Vantify'), 'vt-check', 'done') : s === 'nofile' ? b(L('⚠ Brak pliku w Vantify', '⚠ No file in Vantify'), 'vt-check', 'off') : b(L('Zamknij w Vantify', 'Close in Vantify'), 'vt-close', 'go');
    return { open, close };
  }
  function why(r, L) {
    const c = r?.code || r?.status || '';
    if (r?.status === 'login' || c === 'login') return L('Logowanie do Vantify wygasło. Zaloguj się w Ustawienia → Vantify i spróbuj jeszcze raz.', 'Your Vantify sign-in has expired. Sign in in Settings → Vantify and try again.');
    if (c === 'VANTIFY_BUSY') return L('Vantify jest teraz zajęty innym sprawdzaniem. Spróbuj za chwilę.', 'Vantify is busy with another check. Try again in a moment.');
    if (c === 'timeout' || c === 'net' || c === 'repeat') return L('Brak odpowiedzi z Vantify. Sprawdź w Vantify, czy zlecenie nie zmieniło się, zanim spróbujesz znowu.', 'No answer from Vantify. Check in Vantify whether the job changed before you try again.');
    return L('Vantify nie przyjął: ', 'Vantify did not accept it: ') + (r?.msg || c) + (r?.step ? ' (' + r.step + ')' : '');
  }
  /* wynik zakładania w okienku Ionic, które zostaje do zamknięcia (Grzegorz 21/11/2026: „nie ma jak w apce sprawdzić, czy poszło”);
     okienko ze szkieletu (moduly/szkielet, OESTOkna.komunikat = ion-alert), bez własnego HTML. Pasek na dole mówi to samo. */
  const wynik = (tytul, tresc) => w.OESTOkna?.komunikat ? w.OESTOkna.komunikat({ tytul, tresc, przyciski: [{ text: 'OK', role: 'ok' }] }).catch(() => {}) : Promise.resolve();
  async function act(P, a) { try { return await P.action({ action: { site: SITE, nonce: (w.crypto?.randomUUID?.() || String(Date.now())), ...a } }); } catch (e) { return { status: 'error', code: e?.code || e?.message || 'error' }; } }
  async function wzory(P) { try { return await P.wzory(); } catch (e) { return {}; } }

  async function open(x) {
    const { draft: d, L } = x, P = plugin();
    if (state(d) !== 'none' && state(d) !== 'pending') return check(x);
    if (!P) return x.message(L('Vantify działa w aplikacji na telefonie.', 'Vantify works in the phone app.'));
    /* poprzednie zakładanie bez odpowiedzi (przegląd Codex #146): zlecenie mogło powstać – najpierw sprawdzić w Vantify */
    if (state(d) === 'pending' && !await ask({ title: 'Open Vantify', text: L('Poprzednie zakładanie (', 'The previous attempt (') + new Date(d.vantify.at).toLocaleString('en-GB') + L(') nie dostało odpowiedzi z Vantify i zlecenie mogło już powstać: „', ') got no answer from Vantify and the job may already exist: “') + (d.vantify.summary || '') + L('”. Sprawdź najpierw listę zleceń w Vantify. Założyć nowe mimo to?', '”. Check the job list in Vantify first. Create a new one anyway?'), ok: L('Załóż mimo to', 'Create anyway'), cancel: L('Wróć', 'Back') })) return;
    x.message(L('Tłumaczę na angielski…', 'Translating to English…'));
    /* miejsce: budynek i piętro z listy (już po angielsku), opis miejsca wpisany ręcznie – tłumaczony (przegląd Codex #146) */
    const roomEn = String(d.room || '').trim() ? await x.english(String(d.room).trim(), '') : '', K = x.kreator, ks = K && K.fromDraft(d, roomEn);
    /* piętro z napisem jak w kreatorze (K.where): „Level 20”, nie gołe „20” (Grzegorz 21/11/2026) */
    const lvl = String(d.level || ''), where = [d.building, /^\d/.test(lvl) ? 'Level ' + lvl : lvl, d.flat ? 'Flat ' + d.flat : '', roomEn].filter(Boolean).join(', ');
    /* kreator opisu (PROD-039): Summary i opis zlecenia z wyborów (już po angielsku), info na start dopisane pod spodem */
    /* bez kreatora i bez nazwy: Summary proponuje Gemma z info na start (Grzegorz 25/11/2026); do poprawy w oknie poniżej */
    const sum = ks ? K.summary(ks) : String(d.title || d.problem || '').trim() ? await x.english(d.title || d.problem || '', '') : x.summary ? await x.summary(d.note || '') : '', body = await x.english('start', d.note || '');
    /* miejsce na początku opisu (Grzegorz 26/11/2026: Vantify nie przyjmuje własnej lokalizacji) – tylko to, co wpisane na karcie */
    const desc = [where.split(', ').join(' · '), ks ? K.request(ks) : '', body].filter(Boolean).join('\n');
    /* priorytet do wyboru (Grzegorz 20/11/2026: dłuższy termin niż P5, żeby zlecenie nie było zaległe, zanim Josh zatwierdzi);
       lista z Vantify tego samego rodzaju co priorytet ze wzoru, domyślnie ostatnio wybrany. Pierwszy raz (bez wzoru) – wybór w oknie Vantify */
    const W = await wzory(P), pr = W.create ? await prioList(P, x) : null, last = x.lastPriority ? x.lastPriority() : '', jg = W.create ? await groupList(P, x) : null, lastG = x.lastGroup ? x.lastGroup() : '';
    const pickG = jg && jg.list.length ? (jg.list.find(g => g.href === lastG) || jg.list.find(g => g.href === jg.current) || jg.list[0]).href : '';
    const pick = pr && pr.list.length ? (pr.list.find(p => p.href === last) || pr.list.find(p => p.href === pr.current) || pr.list[0]).href : '';
    /* zdjęcia przed zebrane przed oknem i przed zapisem „zakładam”: brak zdjęcia = błąd, karta zostaje bez zmian (przegląd Codex #166) */
    const files = x.photos ? await x.photos('before') : [];
    const node = document.createElement('div');
    /* zdjęcia przed idą razem z opisem (Grzegorz 20/11/2026: „przy zakładaniu zdjęcie i opis, Job Sheet po wykonaniu”) */
    const nBefore = files.length;
    node.innerHTML = '<label class="field"><span>Summary</span><input class="rx-vt-sum" maxlength="250" value="' + esc(sum) + '"></label><label class="field"><span>Description</span><textarea class="rx-vt-desc rx-info-t" rows="6">' + esc(desc) + '</textarea></label>' + (pick ? '<label class="field"><span>' + esc(L('Priorytet', 'Priority')) + '</span><select class="rx-vt-prio">' + pr.list.map(p => '<option value="' + esc(p.href) + '"' + (p.href === pick ? ' selected' : '') + '>' + esc(p.name + (p.label ? ' – ' + p.label : p.days ? ' – ' + p.days + L(' dni', ' days') : '')) + '</option>').join('') + '</select></label>' : '') + (pickG ? '<label class="field"><span>Job Group</span><select class="rx-vt-group">' + jg.list.map(g => '<option value="' + esc(g.href) + '"' + (g.href === pickG ? ' selected' : '') + '>' + esc(g.parent ? g.parent + ' › ' + g.name : g.name) + '</option>').join('') + '</select></label>' : '') + '<p class="rx-sub rx-vt-photos">' + esc(nBefore ? L('Zdjęcia przed: ', 'Before photos: ') + nBefore : L('Brak zdjęć', 'No photos')) + '</p>';
    x.message('');
    if (!await ask({ title: 'Open Vantify', node, ok: L('Załóż zlecenie', 'Create the job'), cancel: L('Wróć', 'Back') })) return;
    const summary = node.querySelector('.rx-vt-sum').value.trim(), description = node.querySelector('.rx-vt-desc').value.trim();
    const prioEl = node.querySelector('.rx-vt-prio'), priority = prioEl ? prioEl.value : '', prioName = prioEl ? prioEl.selectedOptions[0]?.textContent || '' : '';
    const grEl = node.querySelector('.rx-vt-group'), jobgroup = grEl ? grEl.value : '', groupName = grEl ? grEl.selectedOptions[0]?.textContent || '' : '';
    if (!summary || !description) return x.message(L('Summary i Description nie mogą być puste.', 'Summary and Description cannot be empty.'));
    if (!W.create) {
      await ask({ title: 'Open Vantify', text: L('Pierwszy raz: załóż zlecenie w oknie Vantify, jak zwykle. Summary i Description są gotowe do skopiowania (przyciski u góry), zdjęcie przed dodaj przy Upload. Apka zapamięta ustawienia i numer zlecenia, a następne założy sama.', 'First time: create the job in the Vantify window as usual. Summary and Description are ready to copy (buttons at the top); add the before photo at Upload. The app remembers the settings and the job number and creates the next ones by itself.'), alert: true });
      let r; try { r = await P.open({ lang: L('pl', 'en'), hash: '#/user/jobs/add//site', summary, description }); } catch (e) { return x.message(why({ code: e?.code || e?.message }, L)); }
      const ev = (r?.events || []).filter(e => e.op === 'create' && e.id).pop();
      if (!ev) return x.message(L('Nie widzę nowego zlecenia w Vantify. Jeśli je założyłeś, wpisz numer w ⋮ albo spróbuj jeszcze raz.', 'I do not see a new job in Vantify. If you created it, try again.'));
      /* w oknie Grzegorz mógł poprawić tekst – zapisz Summary z Vantify (przegląd Codex #146); bez odczytu: puste = bez porównania */
      const id = Number(ev.id), st = await act(P, { op: 'status', ids: [id] }), j = st.status === 'ok' ? (st.jobs || [])[0] : null;
      return saved(x, { id, status: j && !j.error && j.status || 'approval_pending', summary: j && !j.error ? j.summary || '' : '' });
    }
    /* zapis „zakładam” przed wysłaniem: przy braku odpowiedzi karta pamięta, że zlecenie mogło powstać (przegląd Codex #146) */
    x.draft.vantify = { pending: true, summary, at: new Date().toISOString() }; await x.persist(); x.render();
    x.message(L('Zakładam zlecenie w Vantify…', 'Creating the job in Vantify…'));
    const r = await act(P, { op: 'create', summary, description, files, ...(priority ? { priority } : {}), ...(jobgroup ? { jobgroup } : {}) });
    if (r.status === 'ok' && r.id) {
      /* zdjęcia sprawdzone przy zleceniu po założeniu; wynik zostaje na karcie – brak = „⚠”, stuknięcie sprawdza znowu i dosyła (przegląd Codex #166) */
      /* adres pliku powiązany z identyfikatorem zdjęcia na karcie (ids), nie z pozycją na liście (przegląd Codex #167) */
      const photos = files.length ? { hrefs: Array.isArray(r.hrefs) ? r.hrefs : [], seen: Array.isArray(r.seenHrefs) ? r.seenHrefs : [], ids: files.map(f => f.id) } : null;
      await saved(x, { id: r.id, status: r.job?.status || 'approval_pending', summary: r.job?.summary || summary, ...(priority ? { priority, priorityName: prioName } : {}), ...(jobgroup ? { jobgroup, groupName } : {}), ...(photos ? { photos } : {}), startNote: String(x.draft.note || '') });
      const miss = photos ? photosMissing(x.draft) : 0;
      const ph = !photos ? '' : miss ? L(' Zdjęcia przed przy zleceniu: ', ' Before photos on the job: ') + photos.seen.length + '/' + photos.hrefs.length + (r.photoError ? L(' – Vantify: ', ' – Vantify: ') + r.photoError : '') + L('. Stuknij „⚠ Vantify”, żeby dosłać brakujące.', '. Tap “⚠ Vantify” to send the missing ones.') : L(' Zdjęcia przed przy zleceniu: ', ' Before photos on the job: ') + photos.hrefs.length + '/' + photos.hrefs.length + '.';
      const done = wynik(L('Założone w Vantify #', 'Created in Vantify #') + r.id, L('Zlecenie #', 'Job #') + r.id + ': „' + (r.job?.summary || summary) + L('”. Status: czeka na zatwierdzenie (Pending Approval).', '”. Status: awaiting approval (Pending Approval).') + ph);
      if (photos && photosMissing(x.draft)) x.message(L('Założone w Vantify #', 'Created in Vantify #') + r.id + L(', ale widzę tylko ', ', but I see only ') + photos.seen.length + L(' z ', ' of ') + photos.hrefs.length + L(' zdjęć przed', ' before photos') + (r.photoError ? L(' (Vantify: ', ' (Vantify: ') + r.photoError + ')' : '') + L('. Stuknij „⚠ Vantify”, żeby sprawdzić znowu i dosłać brakujące.', '. Tap “⚠ Vantify” to check again and send the missing ones.'));
      return done;
    }
    /* błąd przy wysyłce zdjęć (przed zakładaniem) = zlecenie na pewno nie powstało */
    if (r.step === 'upload') { delete x.draft.vantify; await x.persist(); x.render(); }
    /* pewne „nie założono”: brak wzoru, wygasłe logowanie, zajęte okno albo odmowa Vantify (HTTP 4xx) – wtedy karta wraca do „Open Vantify” */
    const sure = r.step === 'upload' || r.status === 'nowzor' || r.status === 'login' || r.code === 'VANTIFY_BUSY' || /^http4\d\d$/.test(r.code || '');
    if (sure) { delete x.draft.vantify; await x.persist(); x.render(); }
    x.message(why(r, L));
    /* pewne „nie założono” = NIE założone; brak odpowiedzi = nie wiadomo (zasada: nigdy nie udawać wysyłki) */
    return wynik(sure ? L('NIE założone w Vantify', 'NOT created in Vantify') : L('Nie wiem, czy założone', 'Not sure if created'), sure ? why(r, L) : why(r, L) + L(' Zlecenie mogło powstać – sprawdź listę zleceń w Vantify, zanim spróbujesz znowu.', ' The job may exist – check the job list in Vantify before you try again.'));
  }
  /* Update (Grzegorz 26/11/2026): w zakładce Zdjęcia i Notatki ten sam przycisk i ten sam podgląd przed wysyłką (czesci/PodgladUpdate.vue);
     wysyła tylko to, czego jeszcze nie ma w Vantify. Najpierw świeży odczyt: zamknięte albo inna nazwa = nic nie wysyła. */
  const UPDATE_TEXT = 'Works completed. Please approve so the job can be closed.';
  /* podgląd przed wysyłką: { wiadomosci: [{ id, etykieta, tekst }], zdjecia: [{ url, tytul }] } → poprawione wiadomości albo null (Wróć) */
  async function podglad(x, tytul, dane) {
    const C = w.OESTCzesci; if (!C?.okno) return null;
    const stan = { wiadomosci: (dane.wiadomosci || []).map(m => ({ ...m })), zdjecia: dane.zdjecia || [], etZdjecia: x.L('Zdjęcia do wysłania', 'Photos to send') };
    const r = await C.okno('PodgladUpdate', { dane: () => stan, akcja: (n, i, v) => { if (n === 'tekst' && stan.wiadomosci[i]) stan.wiadomosci[i].tekst = String(v == null ? '' : v); } }, { tytul, ok: x.L('Wyślij', 'Send'), anuluj: x.L('Wróć', 'Back') }).catch(() => null);
    return r && r.ok ? stan.wiadomosci : null;
  }
  /* świeży odczyt przed wysyłką: zlecenie zamknięte albo inna nazwa w Vantify = null (nic nie wysyłamy) */
  async function fresh(x, P) {
    const { L } = x, v = x.draft.vantify;
    x.message(L('Sprawdzam w Vantify…', 'Checking Vantify…'));
    const st = await act(P, { op: 'status', ids: [v.id] }), j = st.status === 'ok' ? (st.jobs || [])[0] : null;
    if (!j || j.error) { x.message(why(j?.error ? { code: j.error } : st, L)); return null; }
    await update(x, j);
    if (j.final) { x.message('Vantify #' + v.id + ': ' + label(j, L) + L('. Nic nie wysłałem.', '. Nothing was sent.')); return null; }
    if (v.summary && String(j.summary || '').trim() !== v.summary.trim()) { x.message(L('W Vantify zlecenie ma inną nazwę: „', 'In Vantify the job has a different name: “') + (j.summary || '') + L('”. Nic nie wysłałem.', '”. Nothing was sent.')); return null; }
    return j;
  }
  /* Update w zakładce Zdjęcia: zdjęcia przed i po, których nie ma jeszcze w Vantify (po id zdjęcia z karty) */
  async function zdjecia(x) {
    const { draft: d, L } = x, P = plugin(), v = d.vantify;
    if (!v?.id) return x.message(L('Najpierw „Załóż w Vantify” w zakładce Zlecenie.', 'First “Create in Vantify” on the Job tab.'));
    if (!P) return x.message(L('Vantify działa w aplikacji na telefonie.', 'Vantify works in the phone app.'));
    const done = wyslane(d).zdjecia, all = [...await x.photos('before'), ...await x.photos('after')], files = all.filter(f => !done[f.id]);
    if (!files.length) return x.message(L('Wszystkie zdjęcia są już w Vantify.', 'All photos are already in Vantify.'));
    if (!await podglad(x, 'Update #' + v.id, { zdjecia: files.map(f => ({ url: 'data:' + f.type + ';base64,' + f.b64, tytul: f.title })) })) return x.message('');
    if (!await fresh(x, P)) return;
    x.message(L('Wysyłam zdjęcia do Vantify…', 'Sending the photos to Vantify…'));
    const p = v.photos || { hrefs: [], seen: [], ids: [] }, r = await act(P, { op: 'attach', id: v.id, files, known: p.seen || [] }), sent = Array.isArray(r.sent) ? r.sent : [];
    /* zapis tylko zdjęć z adresem w Vantify; błąd w trakcie = wysłane zostają zapisane, żeby następny Update ich nie dublował */
    const now = new Date().toISOString(), ids = (p.ids || []).slice(), hrefs = (p.hrefs || []).slice(), at = { ...(p.at || {}) };
    files.forEach((f, k) => { if (sent[k]) { ids.push(f.id); hrefs.push(sent[k]); at[f.id] = now; } });
    x.draft.vantify = { ...x.draft.vantify, photos: { ...p, ids, hrefs, at, seen: Array.isArray(r.seenHrefs) ? r.seenHrefs : p.seen || [] } }; await x.persist(); x.render();
    if (r.status !== 'ok') return x.message(why(r, L) + (sent.filter(Boolean).length ? L(' Wysłane: ', ' Sent: ') + sent.filter(Boolean).length + '/' + files.length : ''));
    x.message(photosMissing(x.draft) ? L('Wysłane, ale Vantify nie pokazuje wszystkich zdjęć. Stuknij „⚠ Vantify” w zakładce Zlecenie, żeby sprawdzić.', 'Sent, but Vantify does not show all photos. Tap “⚠ Vantify” on the Job tab to check.') : L('✓ Zdjęcia w Vantify #', '✓ Photos on Vantify #') + v.id + ': ' + sent.filter(Boolean).length + '.');
  }
  /* Update w zakładce Notatki: Co zrobione, Rekomendacja (gdy wpisana) i na końcu zawsze prośba o zatwierdzenie – osobne wiadomości.
     Każda zapisana na karcie PRZED wysyłką (sentAt); zgubiona odpowiedź = następny Update najpierw sprawdza, czy jest przy zleceniu. */
  async function notatki(x) {
    const { draft: d, L } = x, P = plugin(), v = d.vantify;
    if (!v?.id) return x.message(L('Najpierw „Załóż w Vantify” w zakładce Zlecenie.', 'First “Create in Vantify” on the Job tab.'));
    if (!P) return x.message(L('Vantify działa w aplikacji na telefonie.', 'Vantify works in the phone app.'));
    const n = v.notes || {}, msgs = [], et = { done: L('Co zrobione', 'Work done'), rec: L('Rekomendacja', 'Recommendation'), final: L('Prośba o zatwierdzenie', 'Approval request') };
    x.message(L('Tłumaczę na angielski…', 'Translating to English…'));
    const hasDone = !!String(d.endNote || '').trim() || !!await x.english('end', '', true), hasRec = !!String(d.recNote || '').trim() || !!await x.english('rec', '', true);
    if (!n.done?.at && hasDone) msgs.push({ id: 'done', etykieta: et.done, tekst: n.done?.text || await x.english('end', d.endNote || '') });
    if (!n.rec?.at && hasRec) msgs.push({ id: 'rec', etykieta: et.rec, tekst: n.rec?.text || await x.english('rec', d.recNote || '') });
    if (!n.final?.at && (n.done?.at || msgs.some(m => m.id === 'done'))) msgs.push({ id: 'final', etykieta: et.final, tekst: n.final?.text || UPDATE_TEXT });
    x.message('');
    if (!msgs.length) return x.message(n.final?.at ? L('Wszystkie notatki są już w Vantify.', 'All notes are already in Vantify.') : L('Najpierw wpisz albo nagraj „Co zrobione”.', 'First type or record “Work done”.'));
    const list = await podglad(x, 'Update #' + v.id, { wiadomosci: msgs });
    if (!list) return;
    if (list.some(m => !String(m.tekst || '').trim())) return x.message(L('Wiadomość nie może być pusta.', 'The message cannot be empty.'));
    if (!await fresh(x, P)) return;
    const W = await wzory(P), save = async (id, o) => { x.draft.vantify = { ...x.draft.vantify, notes: { ...(x.draft.vantify.notes || {}), [id]: o } }; await x.persist(); x.render(); };
    for (const m of list) {
      const text = String(m.tekst).trim(), prev = (x.draft.vantify.notes || {})[m.id];
      /* poprzednia próba bez odpowiedzi: najpierw odczyt wiadomości przy zleceniu (bez dublowania) */
      if (prev?.sentAt && !prev.at) {
        const c = await act(P, { op: 'status', ids: [v.id], messageText: prev.text }), j2 = c.status === 'ok' ? (c.jobs || [])[0] : null;
        if (j2 && !j2.error && j2.messageSeen === true) { await save(m.id, { ...prev, at: new Date().toISOString() }); continue; }
        if (!j2 || j2.error || j2.messageSeen !== false) return x.message(L('Nie udało się odczytać wiadomości przy zleceniu – spróbuj później.', 'Could not read the messages on the job – try later.'));
      }
      await save(m.id, { text, sentAt: new Date().toISOString() });
      x.message(L('Wysyłam do Vantify: ', 'Sending to Vantify: ') + m.etykieta + '…');
      if (!W.update) {
        /* pierwszy raz (brak wzoru): okno Vantify z tekstem do skopiowania, apka uczy się i następne wysyła sama */
        await ask({ title: 'Update', text: L('Pierwszy raz: dodaj wiadomość do zlecenia w oknie Vantify, jak zwykle. Tekst jest gotowy do skopiowania (przycisk u góry). Apka zapamięta, jak to zrobiłeś, a następne wyśle sama.', 'First time: add a message to the job in the Vantify window as usual. The text is ready to copy (button at the top). The app remembers how you did it and sends the next ones by itself.'), alert: true });
        try { await P.open({ lang: L('pl', 'en'), hash: jobHash(v.id, 'status'), text }); } catch (e) { return x.message(why({ code: e?.code || e?.message }, L)); }
        const c = await act(P, { op: 'status', ids: [v.id], messageText: text }), j2 = c.status === 'ok' ? (c.jobs || [])[0] : null;
        if (!(j2 && !j2.error && j2.messageSeen === true)) return x.message(L('Nie widzę wiadomości przy zleceniu w Vantify. Stuknij Update, żeby sprawdzić znowu.', 'I do not see the message on the job in Vantify. Tap Update to check again.'));
        await save(m.id, { text, sentAt: new Date().toISOString(), at: new Date().toISOString() });
        return notatki(x);
      }
      const r = await act(P, { op: 'update', id: v.id, text, summary: v.summary || '', anyStatus: true });
      if (r.status === 'differs' || r.status === 'nowzor') { await save(m.id, prev || null); if (r.job) await update(x, r.job); return x.message(r.why === 'summary' ? L('W Vantify zlecenie ma inną nazwę. Nic nie wysłałem.', 'In Vantify the job has a different name. Nothing was sent.') : 'Vantify #' + v.id + ': ' + label(r.job || {}, L) + L('. Nie wysłane.', '. Not sent.')); }
      if (r.status !== 'ok') return x.message(why(r, L) + L(' Stuknij Update, żeby sprawdzić, czy doszło.', ' Tap Update to check whether it arrived.'));
      await save(m.id, { text, sentAt: new Date().toISOString(), at: new Date().toISOString(), seen: r.seen === true });
    }
    x.message(L('✓ Notatki w Vantify #', '✓ Notes on Vantify #') + v.id + '.');
  }
  /* lista priorytetów z Vantify raz na sesję apki; błąd = bez wyboru (zostaje priorytet ze wzoru), z krótką informacją */
  let prioCache = null;
  async function prioList(P, x) {
    if (prioCache) return prioCache;
    x.message(x.L('Pobieram priorytety z Vantify…', 'Getting priorities from Vantify…'));
    const r = await act(P, { op: 'priorities' });
    x.message(r.status === 'ok' ? '' : x.L('Nie udało się pobrać priorytetów – zostaje ostatni używany w Vantify.', 'Could not get the priorities – the one last used in Vantify stays.'));
    if (r.status !== 'ok' || !Array.isArray(r.list)) return null;
    return (prioCache = { current: r.current, list: r.list });
  }
  /* Job Group (Grzegorz 26/11/2026): jego częste grupy na górze (kolejność jak podał), pod nimi reszta alfabetycznie; lista raz na sesję */
  const CZESTE = ['Fabric', 'White goods', 'Safety', 'Residential', 'Reactive', 'Lighting', 'Mechanical', 'Landscape', 'HVAC', 'Generator', 'Fuel tank', 'Fire door', 'External maintenance', 'Environments', 'Fly tipping', 'Electrical', 'Drainage', 'Defects', 'Cleaning'].map(t => t.toLowerCase());
  let groupCache = null;
  function groupOrder(list) {
    const rank = g => { const a = CZESTE.indexOf(g.name.toLowerCase()), b = CZESTE.indexOf(g.parent.toLowerCase()); return a >= 0 ? a : b >= 0 ? b : CZESTE.length; };
    return list.slice().sort((a, b) => rank(a) - rank(b) || (a.parent + a.name).localeCompare(b.parent + b.name));
  }
  async function groupList(P, x) {
    if (groupCache) return groupCache;
    x.message(x.L('Pobieram Job Group z Vantify…', 'Getting Job Groups from Vantify…'));
    const r = await act(P, { op: 'jobgroups' });
    x.message(r.status === 'ok' ? '' : x.L('Nie udało się pobrać Job Group – zostaje ostatnia używana w Vantify.', 'Could not get the Job Groups – the one last used in Vantify stays.'));
    if (r.status !== 'ok' || !Array.isArray(r.list) || !r.list.length) return null;
    return (groupCache = { current: r.current, list: groupOrder(r.list) });
  }
  async function saved(x, v) {
    x.draft.vantify = { ...v, at: new Date().toISOString() };
    await x.persist(); x.render();
    x.message(x.L('Założone w Vantify #', 'Created in Vantify #') + v.id + x.L('. Czeka na zatwierdzenie.', '. Awaiting approval.'));
  }
  /* sprawdź status teraz (stuknięcie w „Czeka na zatwierdzenie” albo w „✓ Vantify #nr”) */
  async function check(x) {
    const { draft: d, L } = x, P = plugin(), v = d.vantify;
    if (!v?.id) return;
    if (!P) return x.message(L('Vantify działa w aplikacji na telefonie.', 'Vantify works in the phone app.'));
    x.message(L('Sprawdzam w Vantify…', 'Checking Vantify…'));
    const nofile = state(d) === 'nofile' && v.sheetTitle, miss = photosMissing(d);
    const r = await act(P, { op: 'status', ids: [v.id], ...(nofile ? { fileTitle: v.sheetTitle } : {}), ...(miss ? { fileHrefs: v.photos.hrefs } : {}) }), j = r.status === 'ok' ? (r.jobs || [])[0] : null;
    if (!j || j.error) return x.message(why(j?.error ? { code: j.error } : r, L));
    await update(x, j, nofile || miss ? { ...(nofile ? { fileSeen: !!j.fileSeen } : {}), ...(miss ? { photos: { ...v.photos, seen: Array.isArray(j.seenHrefs) ? j.seenHrefs : v.photos.seen || [] } } : {}) } : null);
    /* lista plików nieodczytana = nie wiadomo, co jest – bez dosyłania (żeby nie dublować zdjęć), poprzedni stan zostaje */
    if (miss && !Array.isArray(j.seenHrefs)) return x.message('Vantify #' + v.id + ': ' + label(j, L) + L('. Nie udało się odczytać plików przy zleceniu – spróbuj później. Nic nie wysłałem.', '. Could not read the files on the job – try later. Nothing was sent.'));
    if (miss) return photosAgain(x, P, j);
    x.message('Vantify #' + v.id + ': ' + label(j, L) + (nofile ? (j.fileSeen ? L(', Job Sheet jest przy zleceniu.', ', the Job Sheet is on the job.') : L(', ale nadal nie widzę Job Sheet przy zleceniu – dodaj go w Vantify.', ', but I still do not see the Job Sheet on the job – add it in Vantify.')) : ''));
  }
  /* zdjęcia przed po ponownym sprawdzeniu: wszystkie są – koniec; brakuje – pytanie i dosłanie brakujących do tego samego numeru.
     Pierwszy raz (brak wzoru): okno Vantify na Files → Add z brakującym zdjęciem przy Upload; apka uczy się i kolejne dosyła sama. */
  async function photosAgain(x, P, j) {
    const { L } = x, v = x.draft.vantify, p = v.photos, left = photosMissing(x.draft), head = 'Vantify #' + v.id + ': ' + label(j, L);
    if (!left) return x.message(head + L(', wszystkie zdjęcia przed i po są przy zleceniu.', ', all before and after photos are on the job.'));
    if (!await ask({ title: 'Vantify #' + v.id, text: L('Przy zleceniu widzę ', 'On the job I see ') + (p.seen || []).length + L(' z ', ' of ') + p.hrefs.length + L(' zdjęć przed i po. Dosłać brakujące (', ' before and after photos. Send the missing ones (') + left + L(')?', ')?'), ok: L('Dołącz zdjęcia', 'Attach photos'), cancel: L('Wróć', 'Back') })) return x.message(head);
    const all = x.photos ? [...await x.photos('before'), ...await x.photos('after')] : [];
    /* brakujące zdjęcie = to samo zdjęcie z karty (po identyfikatorze), adres zastępowany na swojej pozycji (przegląd Codex #167);
       zdjęcie usunięte z karty nie jest zastępowane innym – karta mówi, że go nie ma */
    const seen0 = p.seen || [], ids = Array.isArray(p.ids) && p.ids.length === p.hrefs.length ? p.ids : null;
    const want = p.hrefs.map((h, i) => i).filter(i => !seen0.includes(p.hrefs[i])).map(i => ({ i, f: ids ? all.find(f => f.id === ids[i]) : null }));
    const use = want.filter(w => w.f), idx = use.map(w => w.i), files = use.map(w => w.f), hrefs = p.hrefs.slice(), lost = want.length - use.length;
    if (!files.length) return x.message(L('Brakujących zdjęć przed i po nie ma już na karcie – nie mam czego dosłać.', 'The missing before and after photos are no longer on the card – nothing to send.'));
    if (lost) x.message(L('Brakujących zdjęć nie ma już na karcie: ', 'Missing photos no longer on the card: ') + lost + L('. Dosyłam pozostałe.', '. Sending the rest.'));
    /* zapis na karcie: nowe adresy na pozycjach wysłanych zdjęć, widoczne = to, co Vantify pokazał w odczycie */
    const keep = async (sent, seen) => { sent.forEach((h, k) => { if (h) hrefs[idx[k]] = h; }); x.draft.vantify = { ...x.draft.vantify, photos: { ...p, hrefs, seen } }; await x.persist(); x.render(); };
    const done = () => x.message(photosMissing(x.draft) ? L('Vantify nadal nie pokazuje wszystkich zdjęć przed i po (', 'Vantify still does not show all before and after photos (') + x.draft.vantify.photos.seen.length + '/' + hrefs.length + L('). Stuknij „⚠ Vantify”, żeby spróbować znowu.', '). Tap “⚠ Vantify” to try again.') : L('✓ Wszystkie zdjęcia przed i po są przy zleceniu.', '✓ All before and after photos are on the job.'));
    /* okno Vantify tylko wtedy, gdy Vantify odrzucił dodanie pliku wzorem wbudowanym z zapisu 18/11 (Grzegorz 20/11/2026: bez nauki w oknie) */
    const inWindow = async r0 => {
      await ask({ title: 'Vantify #' + v.id, text: L('Vantify nie przyjął zdjęcia wysłanego z apki (', 'Vantify did not accept the photo sent from the app (') + (r0.msg || r0.code || '') + L('). Dodaj je w oknie Vantify (Files → Add) – przy Upload apka poda brakujące zdjęcie. Apka zapamięta, jak to zrobiłeś.', '). Add it in the Vantify window (Files → Add) – at Upload the app offers the missing photo. The app remembers how you did it.'), alert: true });
      let r; try { r = await P.open({ lang: L('pl', 'en'), hash: jobHash(v.id, 'files/add'), fileB64: files[0].b64, fileName: files[0].name }); } catch (e) { return x.message(why({ code: e?.code || e?.message }, L)); }
      /* zdarzenie z okna: „numer|adres dodanego pliku”; bez adresu nie wiadomo, co dodano – karta bez zmian */
      const ev = (r?.events || []).filter(e => e.op === 'attach' && Number(String(e.id).split('|')[0]) === Number(v.id)).pop(), href = ev ? String(ev.id).split('|').slice(1).join('|') : '';
      if (!href) return x.message(L('Nie widzę dodanego zdjęcia w Vantify. Karta nadal pokazuje brak.', 'I do not see an added photo in Vantify. The card still shows it missing.'));
      /* potwierdzenie odczytem listy plików przy zleceniu, nie samą odpowiedzią na dodanie */
      hrefs[idx[0]] = href;
      const st = await act(P, { op: 'status', ids: [v.id], fileHrefs: hrefs.filter(Boolean) }), j2 = st.status === 'ok' ? (st.jobs || [])[0] : null;
      const ok2 = j2 && !j2.error && Array.isArray(j2.seenHrefs);
      await keep([], ok2 ? j2.seenHrefs : seen0);
      if (!ok2) return x.message(j2 && !j2.error ? L('Dodane w oknie, ale nie udało się odczytać plików przy zleceniu. Stuknij „⚠ Vantify”, żeby sprawdzić.', 'Added in the window, but the files on the job could not be read. Tap “⚠ Vantify” to check.') : why(j2?.error ? { code: j2.error } : st, L));
      return done();
    };
    x.message(L('Dosyłam zdjęcia do Vantify…', 'Sending the photos to Vantify…'));
    const r = await act(P, { op: 'attach', id: v.id, files, known: seen0 });
    if (r.status === 'nowzor') return inWindow(r);
    /* błąd w trakcie: zdjęcia już dodane zostają zapisane na swoich pozycjach, żeby następna próba ich nie dublowała */
    const sent = Array.isArray(r.sent) ? r.sent : [];
    if (r.status !== 'ok') { if (sent.length) await keep(sent, seen0); return x.message(why(r, L)); }
    if (!Array.isArray(r.seenHrefs)) { await keep(sent, seen0); return x.message(L('Dosłane, ale nie udało się odczytać plików przy zleceniu. Stuknij „⚠ Vantify”, żeby sprawdzić.', 'Sent, but the files on the job could not be read. Tap “⚠ Vantify” to check.')); }
    await keep(sent, r.seenHrefs);
    return done();
  }
  function label(j, L) { return j.final ? L('zamknięte', 'closed') : j.status === 'approval_pending' ? L('czeka na zatwierdzenie', 'awaiting approval') : j.status === 'acknowledged' ? L('zatwierdzone – można zamknąć', 'approved – ready to close') : j.status === 'commenced' ? L('rozpoczęte', 'commenced') : j.status; }
  async function update(x, j, extra) { const v = x.draft.vantify; if (v.status === j.status && !!v.final === !!j.final && !extra) return; x.draft.vantify = { ...v, status: j.status, final: !!j.final, ...(j.final && !v.closedAt ? { closedAt: new Date().toISOString() } : {}), ...(extra || {}) }; await x.persist(); x.render(); }

  /* status z Vantify dla wszystkich zleceń Reactive z numerem, jeszcze niezamkniętych (Grzegorz 26/11/2026: „w apce W trakcie, a w Vantify
     od dawna zamknięte”): po każdym udanym pobraniu z Vantify (ręcznym i co 4 h) ten sam odczyt co „Sprawdź” na karcie, po 20 numerów */
  let refreshing = null;
  function odswiez() {
    if (refreshing) return refreshing;
    const P = plugin(), H = w.OESTHandover?.repository;
    if (!P || !H) return Promise.resolve(0);
    refreshing = (async () => {
      const s = await H.get(), ids = new Set();
      const add = v => { if (v?.id && !v.final && !v.closedAt) ids.add(Number(v.id)); };
      (s.jobs || []).forEach(j => add(j.reactive?.vantify)); Object.values(s.reactiveDrafts || {}).forEach(d => add(d?.vantify));
      const all = [...ids], got = [];
      for (let i = 0; i < all.length; i += 20) { const r = await act(P, { op: 'status', ids: all.slice(i, i + 20) }); if (r.status !== 'ok') break; got.push(...(r.jobs || [])); }
      const n = got.length ? await H.setReactiveVantify(got) : 0;
      if (n) try { w.dispatchEvent(new CustomEvent('oest:reactive-vantify', { detail: { n } })); } catch (e) {}
      return n;
    })().catch(() => 0).finally(() => { refreshing = null; });
    return refreshing;
  }
  w.addEventListener('oest:vantify-pobrane', () => { odswiez(); });

  async function close(x) {
    const { draft: d, L } = x, P = plugin(), s = state(d);
    if (s === 'none' || s === 'pending') return x.message(L('Najpierw Open Vantify.', 'Open Vantify first.'));
    if (s !== 'open') return check(x);
    if (!P) return x.message(L('Vantify działa w aplikacji na telefonie.', 'Vantify works in the phone app.'));
    const miss = [];
    if (!(d.afterMediaIds || []).length) miss.push(L('zdjęć po', 'after photos'));
    if (!String(d.endNote || '').trim() && !await x.english('end', '', true)) miss.push(L('info na koniec', 'end info'));
    if (miss.length && !await ask({ title: 'Close Vantify', text: L('Brakuje: ', 'Missing: ') + miss.join(', ') + '.', ok: L('Zamknij mimo to', 'Close anyway'), cancel: L('Wróć', 'Back') })) return;
    x.message(L('Sprawdzam zlecenie w Vantify…', 'Checking the job in Vantify…'));
    const st = await act(P, { op: 'status', ids: [d.vantify.id] }), j = st.status === 'ok' ? (st.jobs || [])[0] : null;
    if (!j || j.error) return x.message(why(j?.error ? { code: j.error } : st, L));
    await update(x, j);
    if (j.final || j.status === 'approval_pending') return x.message('Vantify #' + d.vantify.id + ': ' + label(j, L));
    if (d.vantify.summary && j.summary.trim() !== d.vantify.summary.trim()) return x.message(L('W Vantify zlecenie ma inną nazwę: „', 'In Vantify the job has a different name: “') + j.summary + L('”. Nic nie wysłałem.', '”. Nothing was sent.'));
    /* okno podsumowania przed zamknięciem (PROD-039): „Popraw” wraca do karty, nic nie wysyła */
    if (x.review && !await x.review()) return x.message('');
    x.message(L('Tworzę Job Sheet (PDF)…', 'Creating the Job Sheet (PDF)…'));
    const sheet = await x.jobSheet(), day = sheet.date.toLocaleDateString('en-GB');
    if (!await ask({ title: 'Close Vantify #' + d.vantify.id, text: L('Wyślę do Vantify: Commence (jeśli trzeba) i Complete z datą ', 'I will send to Vantify: Commence (if needed) and Complete dated ') + day + L(' oraz plik ', ' with the file ') + sheet.name + '.', ok: L('Tak, zamknij', 'Yes, close'), cancel: L('Wróć', 'Back') })) return x.message('');
    const b64 = await w.OESTVoice.base64(new Blob([sheet.pdf], { type: 'application/pdf' }));
    /* zamknięcie w oknie Vantify tylko, gdy zlecenie wymaga innego typu dokumentu (przegląd Codex #146) albo Vantify odrzucił
       zamknięcie wzorem wbudowanym z zapisu 18/11 (Grzegorz 20/11/2026: bez nauki w oknie) */
    const inWindow = async r0 => {
      const other = r0.why === 'doctype', started = r0.op === 'complete';
      await ask({ title: 'Close Vantify', text: other ? L('To zlecenie wymaga innego typu dokumentu niż zwykły Job Sheet. Zamknij je w oknie Vantify i wybierz typ przy Upload – apka poda Job Sheet.', 'This job needs a different document type than the usual Job Sheet. Close it in the Vantify window and pick the type at Upload – the app offers the Job Sheet.') : L('Vantify nie przyjął ', 'Vantify did not accept ') + (r0.op === 'commence' ? 'Commence' : 'Complete') + L(' z apki (', ' from the app (') + (r0.msg || r0.code || '') + ')' + (started ? L('; Commence już przeszło', '; Commence already went through') : '') + L('. Dokończ w oknie Vantify – przy Upload apka poda Job Sheet. Apka zapamięta, jak to zrobiłeś.', '. Finish in the Vantify window – at Upload the app offers the Job Sheet. The app remembers how you did it.'), alert: true });
      let r; try { r = await P.open({ lang: L('pl', 'en'), hash: jobHash(d.vantify.id, 'status'), fileB64: b64, fileName: sheet.name }); } catch (e) { return x.message(why({ code: e?.code || e?.message }, L)); }
      const done = (r?.events || []).some(e => e.op === 'complete' && Number(e.id) === Number(d.vantify.id));
      return done ? check(x) : x.message(L('Nie widzę zamknięcia w Vantify. Zlecenie zostaje otwarte.', 'I do not see the job closed in Vantify. It stays open.'));
    };
    x.message(L('Zamykam w Vantify…', 'Closing in Vantify…'));
    const r = await act(P, { op: 'close', id: d.vantify.id, summary: d.vantify.summary || '', onSite: sheet.start.toISOString(), done: sheet.date.toISOString(), file: { b64, name: sheet.name, title: sheet.title, type: 'application/pdf' } });
    if (r.status === 'differs') { if (r.job) await update(x, r.job); return x.message(L('Zlecenie w Vantify różni się od karty (', 'The job in Vantify differs from the card (') + r.why + L('). Nic nie wysłałem.', '). Nothing was sent.')); }
    if (r.status === 'nowzor') return inWindow(r);
    if (r.status !== 'ok') return x.message(why(r, L));
    /* plik zapamiętany na karcie: bez potwierdzenia pliku karta pokazuje „⚠ Brak pliku”, stuknięcie sprawdza znowu (przegląd Codex #146) */
    await update(x, r.job || { status: d.vantify.status }, { fileSeen: !!r.fileSeen, sheetTitle: sheet.title });
    if (!r.closed) return x.message(L('Vantify nie potwierdził zamknięcia. Sprawdź zlecenie w Vantify.', 'Vantify did not confirm the job is closed. Check the job in Vantify.'));
    x.message(r.fileSeen ? L('✓ Zamknięte w Vantify z Job Sheet.', '✓ Closed in Vantify with the Job Sheet.') : L('✓ Zamknięte w Vantify, ale nie widzę pliku przy zleceniu – sprawdź w Vantify.', '✓ Closed in Vantify, but I do not see the file on the job – check in Vantify.'));
  }
  /* daty do Vantify: start = pierwsze zdjęcie przed, koniec = ostatnie zdjęcie po (jak Job Sheet); nie wcześniej niż założenie, nie w przyszłości */
  function clampDay(d, from) { const now = new Date(), f = from ? new Date(from) : null; if (!(d instanceof Date) || isNaN(d) || d > now) d = now; if (f && !isNaN(f) && d < f) d = new Date(Math.min(now, +f + 60000)); return d; }
  w.OESTReactiveVantify = { odswiez, przyciski, wyslane, open, close, check, zdjecia, notatki, state, photosMissing, clampDay, ymd, groupOrder, UPDATE_TEXT };
})(window);
