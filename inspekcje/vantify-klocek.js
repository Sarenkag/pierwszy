/* „Open Vantify” z klocka inspekcji (Weekly Generator Check, Grzegorz 21/11/2026 16:31: „założyć zlecenie przez Vantify… zdjęcie formularza,
   nasz basic form uzupełniony z danymi i zdjęcia”). Ta sama ścieżka co Reactive (app/www/reactive-vantify.js, OESTReactiveVantify.open):
   podgląd Summary / Description do poprawy przed wysłaniem, zlecenie, potem przy zleceniu pliki: zdjęcie kartki, nasz Basic form (PDF), zdjęcia;
   „⚠ Vantify” dosyła brakujące. Stan zlecenia zapamiętany dla tej inspekcji i dnia – drugi raz tego samego nie założy.
   Typ włącza przycisk polem vantify: true (ppm.js). Strona podaje: $, T, zbuduj (buildAll), dzien (data → rrrr-mm-dd), blad (tekst błędu)
   i stan() = { typ, ppm, data, raport (flushReport), blokada („Wyślij” zablokowane), zajete }. */
(function (w) {
  'use strict';
  var o = null, draft = null;
  function on(s) { return !!(o && w.OESTReactiveVantify && s.typ && s.typ.flush && s.typ.flush.vantify); }
  function klucz(s) { return 'oest-vt-' + ((s.ppm && s.ppm.id) || s.typ.id || s.typ.flush.title) + '-' + o.dzien(s.data); }
  function wczytaj(s) { var d = {}; try { var t = w.localStorage.getItem(klucz(s)); if (t) d.vantify = JSON.parse(t); } catch (e) {} return d; }
  function zapisz() {
    var s = o.stan();
    try {
      if (draft.vantify) { w.localStorage.setItem(klucz(s), JSON.stringify(draft.vantify)); if (draft.vantify.priority) w.localStorage.setItem('oest-vt-prio', draft.vantify.priority); }
      else w.localStorage.removeItem(klucz(s));
    } catch (e) {}
    return Promise.resolve();
  }
  function render() {
    if (!o) return;
    var s = o.stan(), b = o.$('vtBtn'); b.hidden = !on(s); if (b.hidden) return;
    draft = wczytaj(s);
    var V = w.OESTReactiveVantify, st = V.state(draft), v = draft.vantify || {}, nowe = st === 'none' || st === 'pending';
    b.disabled = nowe && s.blokada; // jak „Wyślij”: bez zdjęcia kartki i w trakcie zdjęć nie zakłada
    b.textContent = nowe ? 'Open Vantify' : V.photosMissing(draft) ? '⚠ Vantify #' + v.id + ' · ' + o.T('pliki ', 'files ') + (v.photos.seen || []).length + '/' + v.photos.hrefs.length : '✓ Vantify #' + v.id;
  }
  // Description = to samo co raport: generator, punkty z odczytami, zdanie z szarej tabelki (po angielsku jak raport)
  function opis(f) {
    var st = f.statement || ['', ''], all = f.taps.every(function (t) { return t.state === 'yes'; });
    var lines = f.taps.map(function (t) { return t.name + ': ' + (t.state === 'yes' ? 'Yes' : t.state === 'no' ? 'No' : 'N/A') + (t.note ? ' – ' + t.note : ''); });
    return [f.podtytul].concat(lines, [all ? st[0] : st[1]]).filter(Boolean).join('\n');
  }
  // pliki w kolejności z prośby: zdjęcie kartki, nasz Basic form (PDF), zdjęcia; raport budowany od nowa z bieżącego formularza
  function plik(j) {
    var pdf = !!j.bytes;
    return (pdf ? Promise.resolve(new Blob([j.bytes], { type: 'application/pdf' })) : fetch(j.url).then(function (x) { return x.blob(); })).then(function (bl) {
      var type = pdf ? 'application/pdf' : bl.type || 'image/jpeg', ext = pdf ? 'pdf' : /png/.test(type) ? 'png' : 'jpg';
      return w.OESTVoice.base64(bl).then(function (d) { return { id: j.id, b64: d, name: j.title.replace(/[^A-Za-z0-9 –-]/g, '').replace(/ /g, '-') + '.' + ext, title: j.title, type: type }; });
    });
  }
  function pliki() {
    return o.zbuduj().then(function (r) {
      var pics = r.pics || [], job = [], out = [];
      var pdf = (r.files || []).filter(function (f) { return /\.pdf$/.test(f.name) && (f.name === r.name + '.pdf' || f.name === r.name + ' - report.pdf'); })[0];
      pics.filter(function (p) { return p.sheet; }).forEach(function (p, i) { job.push({ id: 'sheet' + i, title: 'Generator check form ' + (i + 1), url: p.url }); });
      if (pdf) job.push({ id: 'report', title: r.name, bytes: pdf.bytes });
      pics.filter(function (p) { return !p.sheet; }).forEach(function (p, i) { job.push({ id: 'photo' + i, title: 'Photo ' + (i + 1), url: p.url }); });
      return job.reduce(function (pr, j) { return pr.then(function () { return plik(j).then(function (f) { out.push(f); }); }); }, Promise.resolve())
        .then(function () { return out; })
        .finally(function () { pics.forEach(function (p) { URL.revokeObjectURL(p.url); }); if (r.logoUrl) URL.revokeObjectURL(r.logoUrl); });
    });
  }
  function ctx() {
    return { get draft() { return draft; }, L: o.T, render: render, persist: zapisz, photos: pliki,
      message: function (t) { o.$('vtHint').textContent = t || ''; },
      english: function (co, extra) { return Promise.resolve(co === 'start' || co === 'end' ? extra || '' : String(co || '')); },
      lastPriority: function () { try { return w.localStorage.getItem('oest-vt-prio') || ''; } catch (e) { return ''; } } };
  }
  function klik() {
    var s = o.stan(), b = o.$('vtBtn');
    if (!on(s) || s.zajete) return;
    draft = wczytaj(s); draft.title = s.typ.flush.title + ' ' + s.data.toLocaleDateString('en-GB'); draft.note = opis(s.raport);
    b.disabled = true;
    Promise.resolve().then(function () { return w.OESTReactiveVantify.open(ctx()); })
      .catch(function (e) { o.$('vtHint').textContent = o.blad(e); })
      .then(function () { b.disabled = false; render(); });
  }
  function init(opt) { o = opt; o.$('vtBtn').addEventListener('click', klik); render(); }
  w.OESTVantifyKlocek = { init: init, render: render, opis: opis };
})(window);
