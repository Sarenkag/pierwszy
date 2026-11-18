/* Przyciski Vantify na karcie Reactive (Grzegorz 18/11/2026 „Tak”, PROD-038).
   Open Vantify: Summary = nazwa, Description = „Dodaj info na start” (+ miejsce), oba po angielsku, podgląd i poprawa przed wysłaniem.
     Po założeniu przycisk: „✓ Vantify #nr” (drugi raz się nie da). Bez PDF (Grzegorz 18/11: „przy tworzeniu nie musimy robić pdf”).
   Close Vantify: szary „Czeka na zatwierdzenie”, dopóki Josh nie zatwierdzi (stuknięcie = sprawdź teraz). Potem: braki (zdjęcia po,
     info na koniec) → Wróć / Zamknij mimo to; Job Sheet (tylko PDF, data zdjęcia) → „Tak” → Commence (gdy trzeba) + Complete z plikiem
     → ponowny odczyt; „✓ Zamknięte w Vantify” dopiero, gdy Vantify potwierdzi zamknięcie (PROD-035).
   Pierwszy raz (brak wzoru w telefonie): okno Vantify w apce z tekstem do wklejenia / Job Sheet do pola Upload; apka uczy się z tego.
   Stan na karcie: draft.vantify = {id, status, summary, at, closedAt}. Ekran reactive.js daje ctx: draft, L, persist, render, message,
   english(scope, extra), jobSheet(date). Bez Capacitora (komputer, testy) przyciski mówią, że to działa w telefonie. */
(function (w) {
  'use strict';
  const SITE = 6324, esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const plugin = () => { const C = w.Capacitor; if (!C?.isNativePlatform?.()) return null; return C.registerPlugin ? C.registerPlugin('Vantify') : C.Plugins?.Vantify || null; };
  const ask = o => w.OESTPrzycisk?.ask ? w.OESTPrzycisk.ask(o) : Promise.resolve(false);
  const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  function state(d) {
    const v = d?.vantify;
    if (!v?.id) return v?.pending ? 'pending' : 'none';
    if (v.closedAt || v.status === 'completed' || v.final) return v.fileSeen === false ? 'nofile' : 'closed';
    return v.status === 'approval_pending' ? 'approval' : 'open';
  }
  /* rząd przycisków nad „Wyślij / Zakończ” – ta sama wielkość co reszta (klasa btn) */
  function html(d, L) {
    const s = state(d), v = d?.vantify || {}, b = (label, act, cls) => '<button type="button" class="btn rx-vt' + (cls ? ' ' + cls : '') + '" data-rx="' + act + '">' + esc(label) + '</button>';
    const open = s === 'none' || s === 'pending' ? b('Open Vantify', 'vt-open', s === 'pending' ? 'rx-vt-off' : '') : b('✓ Vantify #' + v.id, 'vt-check', 'rx-vt-done');
    const close = s === 'none' || s === 'pending' ? b('Close Vantify', 'vt-close', 'rx-vt-off') : s === 'approval' ? b(L('Czeka na zatwierdzenie', 'Awaiting approval'), 'vt-check', 'rx-vt-off') : s === 'closed' ? b(L('✓ Zamknięte w Vantify', '✓ Closed in Vantify'), 'vt-check', 'rx-vt-done') : s === 'nofile' ? b(L('⚠ Brak pliku w Vantify', '⚠ No file in Vantify'), 'vt-check', 'rx-vt-off') : b('Close Vantify', 'vt-close', 'go');
    return '<div class="rx-row rx-vt-row">' + open + close + '</div>';
  }
  function why(r, L) {
    const c = r?.code || r?.status || '';
    if (r?.status === 'login' || c === 'login') return L('Logowanie do Vantify wygasło. Zaloguj się w Ustawienia → Vantify i spróbuj jeszcze raz.', 'Your Vantify sign-in has expired. Sign in in Settings → Vantify and try again.');
    if (c === 'VANTIFY_BUSY') return L('Vantify jest teraz zajęty innym sprawdzaniem. Spróbuj za chwilę.', 'Vantify is busy with another check. Try again in a moment.');
    if (c === 'timeout' || c === 'net' || c === 'repeat') return L('Brak odpowiedzi z Vantify. Sprawdź w Vantify, czy zlecenie nie zmieniło się, zanim spróbujesz znowu.', 'No answer from Vantify. Check in Vantify whether the job changed before you try again.');
    return L('Vantify nie przyjął: ', 'Vantify did not accept it: ') + (r?.msg || c) + (r?.step ? ' (' + r.step + ')' : '');
  }
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
    const roomEn = String(d.room || '').trim() ? await x.english(String(d.room).trim(), '') : '', K = w.OESTKreator, ks = K && K.fromDraft(d, roomEn);
    const where = [d.building, d.level, d.flat ? 'Flat ' + d.flat : '', roomEn].filter(Boolean).join(', ');
    /* kreator opisu (PROD-039): Summary i opis zlecenia z wyborów (już po angielsku), info na start dopisane pod spodem */
    const sum = ks ? K.summary(ks) : await x.english(d.title || d.problem || '', ''), body = await x.english('start', d.note || '');
    const desc = [ks ? K.request(ks) : '', body, where ? 'Location: ' + where : ''].filter(Boolean).join('\n');
    const node = document.createElement('div');
    node.innerHTML = '<label class="field"><span>Summary</span><input class="rx-vt-sum" maxlength="250" value="' + esc(sum) + '"></label><label class="field"><span>Description</span><textarea class="rx-vt-desc rx-info-t" rows="6">' + esc(desc) + '</textarea></label>';
    x.message('');
    if (!await ask({ title: 'Open Vantify', node, ok: L('Załóż zlecenie', 'Create the job'), cancel: L('Wróć', 'Back') })) return;
    const summary = node.querySelector('.rx-vt-sum').value.trim(), description = node.querySelector('.rx-vt-desc').value.trim();
    if (!summary || !description) return x.message(L('Summary i Description nie mogą być puste.', 'Summary and Description cannot be empty.'));
    const W = await wzory(P);
    if (!W.create) {
      await ask({ title: 'Open Vantify', text: L('Pierwszy raz: załóż zlecenie w oknie Vantify, jak zwykle. Summary i Description są gotowe do skopiowania (przyciski u góry). Apka zapamięta ustawienia i numer zlecenia, a następne założy sama.', 'First time: create the job in the Vantify window as usual. Summary and Description are ready to copy (buttons at the top). The app remembers the settings and the job number and creates the next ones by itself.'), alert: true });
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
    const r = await act(P, { op: 'create', summary, description });
    if (r.status === 'ok' && r.id) return saved(x, { id: r.id, status: r.job?.status || 'approval_pending', summary: r.job?.summary || summary });
    /* pewne „nie założono”: brak wzoru, wygasłe logowanie, zajęte okno albo odmowa Vantify (HTTP 4xx) – wtedy karta wraca do „Open Vantify” */
    if (r.status === 'nowzor' || r.status === 'login' || r.code === 'VANTIFY_BUSY' || /^http4\d\d$/.test(r.code || '')) { delete x.draft.vantify; await x.persist(); x.render(); }
    x.message(why(r, L));
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
    const nofile = state(d) === 'nofile' && v.sheetTitle;
    const r = await act(P, { op: 'status', ids: [v.id], ...(nofile ? { fileTitle: v.sheetTitle } : {}) }), j = r.status === 'ok' ? (r.jobs || [])[0] : null;
    if (!j || j.error) return x.message(why(j?.error ? { code: j.error } : r, L));
    await update(x, j, nofile ? { fileSeen: !!j.fileSeen } : null);
    x.message('Vantify #' + v.id + ': ' + label(j, L) + (nofile ? (j.fileSeen ? L(', Job Sheet jest przy zleceniu.', ', the Job Sheet is on the job.') : L(', ale nadal nie widzę Job Sheet przy zleceniu – dodaj go w Vantify.', ', but I still do not see the Job Sheet on the job – add it in Vantify.')) : ''));
  }
  function label(j, L) { return j.final ? L('zamknięte', 'closed') : j.status === 'approval_pending' ? L('czeka na zatwierdzenie', 'awaiting approval') : j.status === 'acknowledged' ? L('zatwierdzone – można zamknąć', 'approved – ready to close') : j.status === 'commenced' ? L('rozpoczęte', 'commenced') : j.status; }
  async function update(x, j, extra) { const v = x.draft.vantify; if (v.status === j.status && !!v.final === !!j.final && !extra) return; x.draft.vantify = { ...v, status: j.status, final: !!j.final, ...(j.final && !v.closedAt ? { closedAt: new Date().toISOString() } : {}), ...(extra || {}) }; await x.persist(); x.render(); }

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
    x.message(L('Tworzę Job Sheet (PDF)…', 'Creating the Job Sheet (PDF)…'));
    const sheet = await x.jobSheet(), day = sheet.date.toLocaleDateString('en-GB');
    if (!await ask({ title: 'Close Vantify #' + d.vantify.id, text: L('Wyślę do Vantify: Commence (jeśli trzeba) i Complete z datą ', 'I will send to Vantify: Commence (if needed) and Complete dated ') + day + L(' oraz plik ', ' with the file ') + sheet.name + '.', ok: L('Tak, zamknij', 'Yes, close'), cancel: L('Wróć', 'Back') })) return x.message('');
    const b64 = await w.OESTVoice.base64(new Blob([sheet.pdf], { type: 'application/pdf' })), W = await wzory(P);
    /* zamknięcie w oknie Vantify: pierwszy raz (brak wzoru) albo gdy zlecenie wymaga innego typu dokumentu (przegląd Codex #146) */
    const inWindow = async other => {
      await ask({ title: 'Close Vantify', text: other ? L('To zlecenie wymaga innego typu dokumentu niż zwykły Job Sheet. Zamknij je w oknie Vantify i wybierz typ przy Upload – apka poda Job Sheet.', 'This job needs a different document type than the usual Job Sheet. Close it in the Vantify window and pick the type at Upload – the app offers the Job Sheet.') : L('Pierwszy raz: zamknij zlecenie w oknie Vantify, jak zwykle (Commence, potem Complete). Przy Upload apka sama poda Job Sheet. Apka zapamięta, jak to zrobiłeś, a następne zamknie sama.', 'First time: close the job in the Vantify window as usual (Commence, then Complete). At Upload the app offers the Job Sheet. The app remembers how you did it and closes the next ones by itself.'), alert: true });
      let r; try { r = await P.open({ lang: L('pl', 'en'), hash: '#/user/jobs/' + d.vantify.id + '/status', fileB64: b64, fileName: sheet.name }); } catch (e) { return x.message(why({ code: e?.code || e?.message }, L)); }
      const done = (r?.events || []).some(e => e.op === 'complete' && Number(e.id) === Number(d.vantify.id));
      return done ? check(x) : x.message(L('Nie widzę zamknięcia w Vantify. Zlecenie zostaje otwarte.', 'I do not see the job closed in Vantify. It stays open.'));
    };
    if (!W.commence || !W.complete) return inWindow();
    x.message(L('Zamykam w Vantify…', 'Closing in Vantify…'));
    const r = await act(P, { op: 'close', id: d.vantify.id, summary: d.vantify.summary || '', onSite: sheet.start.toISOString(), done: sheet.date.toISOString(), file: { b64, name: sheet.name, title: sheet.title, type: 'application/pdf' } });
    if (r.status === 'differs') { if (r.job) await update(x, r.job); return x.message(L('Zlecenie w Vantify różni się od karty (', 'The job in Vantify differs from the card (') + r.why + L('). Nic nie wysłałem.', '). Nothing was sent.')); }
    if (r.status === 'nowzor') return inWindow(r.why === 'doctype');
    if (r.status !== 'ok') return x.message(why(r, L));
    /* plik zapamiętany na karcie: bez potwierdzenia pliku karta pokazuje „⚠ Brak pliku”, stuknięcie sprawdza znowu (przegląd Codex #146) */
    await update(x, r.job || { status: d.vantify.status }, { fileSeen: !!r.fileSeen, sheetTitle: sheet.title });
    if (!r.closed) return x.message(L('Vantify nie potwierdził zamknięcia. Sprawdź zlecenie w Vantify.', 'Vantify did not confirm the job is closed. Check the job in Vantify.'));
    x.message(r.fileSeen ? L('✓ Zamknięte w Vantify z Job Sheet.', '✓ Closed in Vantify with the Job Sheet.') : L('✓ Zamknięte w Vantify, ale nie widzę pliku przy zleceniu – sprawdź w Vantify.', '✓ Closed in Vantify, but I do not see the file on the job – check in Vantify.'));
  }
  /* daty do Vantify: start = pierwsze zdjęcie przed, koniec = ostatnie zdjęcie po (jak Job Sheet); nie wcześniej niż założenie, nie w przyszłości */
  function clampDay(d, from) { const now = new Date(), f = from ? new Date(from) : null; if (!(d instanceof Date) || isNaN(d) || d > now) d = now; if (f && !isNaN(f) && d < f) d = new Date(Math.min(now, +f + 60000)); return d; }
  w.OESTReactiveVantify = { html, open, close, check, state, clampDay, ymd };
})(window);
