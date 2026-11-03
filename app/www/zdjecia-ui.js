/* Ekran „Zdjęcia”: miejsce na telefonie i na Dysku, jakość, limity, synchronizacja, przeglądanie.
 * Logika jest w moduly/zdjecia/zdjecia.js; tu tylko widok i adapter Google Drive (OESTGoogle). */
(function (w) {
  'use strict';
  var Z = w.OESTZdjecia, G = w.OESTGoogle, $ = function (id) { return w.document.getElementById(id); };
  if (!Z) return;
  var urls = [], query = '', msg = '', navigate = function () {};
  var MB = 1024 * 1024;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function mb(b) { return (b / MB).toLocaleString('pl-PL', { maximumFractionDigits: b < 10 * MB ? 1 : 0 }) + ' MB'; }
  function bar(used, limit) { var p = Math.min(100, Math.round(used / limit * 100)); return '<div class="zd-bar"><span style="width:' + p + '%"' + (p >= 90 ? ' class="full"' : '') + '></span></div>'; }
  function drive() {
    return {
      ensureFolder: function (name, parent) { return G.ensureFolder(name, parent); },
      upload: function (parent, name, blob) { return G.uploadFile(parent, name, blob); },
      remove: function (id) { return G.removeFile(id); }
    };
  }
  function errText(e) {
    var m = String(e && e.message || e);
    if (/GOOGLE_SETUP|GOOGLE_CONNECT|GOOGLE_TOKEN/.test(m)) return 'Brak połączenia z Google Drive. Zaloguj się w apce kontem Google.';
    if (/GOOGLE_ACCOUNT_MISMATCH/.test(m)) return 'Wybrano inne konto Google niż to, na które jesteś zalogowany.';
    if (/GOOGLE_BUSY/.test(m)) return 'Dysk jest zajęty inną operacją. Spróbuj za chwilę.';
    if (/GOOGLE_OFFLINE/.test(m)) return 'Brak internetu. Zdjęcia poczekają na następną próbę.';
    if (/GOOGLE_CANCELLED/.test(m)) return 'Anulowano. Zdjęcia zostają w telefonie.';
    if (/LOGIN_TIMEOUT/.test(m)) return 'Okno Google nie odpowiedziało. Spróbuj ponownie.';
    if (/GOOGLE_HTTP_401/.test(m)) return 'Pozwolenie Dysku wygasło. Stuknij jeszcze raz, apka poprosi o ponowne połączenie.';
    if (/AbortError|Failed to fetch|TypeError/.test(m)) return 'Brak internetu albo za słaby sygnał. Zdjęcia poczekają na następną próbę.';
    return w.OESTBledy ? w.OESTBledy.text(e) : 'Nie udało się: ' + m;
  }

  async function syncNow(force, h) {
    if (!G) throw Error('GOOGLE_SETUP');
    if (!G.connected('drive')) await G.connect('drive');
    if (h) h.step('Wysyłam na Dysk…');
    return Z.sync(drive(), force);
  }
  // automatycznie: tylko na Wi-Fi i tylko gdy Dysk jest już połączony w tej sesji (bez wyskakujących okien)
  function auto() {
    if (!G || !G.connected('drive') || Z.busy()) return;
    (G.background ? G.background(function () { return Z.sync(drive(), false); }) : Z.sync(drive(), false)).then(function (r) { if (r && r.sent) { msg = 'Wysłano na Dysk: ' + r.sent + '.'; render(); } }).catch(function () {});
  }

  async function render() {
    var root = $('v-zdjecia'); if (!root || root.hidden) return;
    var s = Z.settings(), all = await Z.list(), st = Z.stats(all), found = Z.search(all, query).slice(0, 120);
    urls.forEach(function (u) { URL.revokeObjectURL(u); }); urls = [];
    var days = {}; found.forEach(function (r) { (days[r.day] = days[r.day] || []).push(r); });
    var presets = Object.keys(Z.PRESETS).map(function (k) { return '<option value="' + k + '"' + (k === s.preset ? ' selected' : '') + '>' + esc(Z.PRESETS[k].pl) + '</option>'; }).join('');
    var last = s.lastSync ? new Date(s.lastSync).toLocaleString('pl-PL') : 'jeszcze nie';
    root.innerHTML =
      '<div class="top"><button class="back" type="button" aria-label="Wstecz">‹</button><div class="t"><h1>Zdjęcia</h1></div></div>' +
      '<div class="panel"><b>Telefon (folder OEST w apce)</b>' + bar(st.phoneBytes, s.phoneLimitMB * MB) +
        '<p class="hint">' + mb(st.phoneBytes) + ' z ' + mb(s.phoneLimitMB * MB) + ' · ' + st.phoneCount + ' zdjęć · czeka na wysłanie: ' + st.pending + ' (' + mb(st.pendingBytes) + ')</p>' +
        '<b>Google Drive („' + esc(s.rootName) + '”)</b>' + bar(st.driveBytes, s.driveLimitMB * MB) +
        '<p class="hint">' + mb(st.driveBytes) + ' z ' + mb(s.driveLimitMB * MB) + ' · ' + st.driveCount + ' zdjęć · ostatnia synchronizacja: ' + esc(last) + '</p>' +
        '<button class="btn go" type="button" data-zd="sync"' + (Z.busy() ? ' disabled' : '') + '>' + (Z.busy() ? 'Wysyłam…' : 'Wyślij teraz na Dysk') + '</button>' +
        '<p class="hint" role="status">' + esc(msg) + '</p></div>' +
      '<div class="panel"><b>Ustawienia</b>' +
        '<label class="field"><span>Jakość zdjęć w folderze</span><select id="zdPreset">' + presets + '</select></label>' +
        '<label class="field"><span>Limit na telefonie (MB)</span><input id="zdPhone" type="number" min="100" step="100" value="' + s.phoneLimitMB + '"></label>' +
        '<label class="field"><span>Limit na Dysku (MB)</span><input id="zdDrive" type="number" min="100" step="100" value="' + s.driveLimitMB + '"></label>' +
        '<label class="check"><input id="zdWifi" type="checkbox"' + (s.wifiOnly ? ' checked' : '') + '><span>Wysyłaj automatycznie tylko przez Wi-Fi</span></label>' +
        '<p class="hint">Po przekroczeniu limitu telefonu znikają najstarsze zdjęcia, które są już na Dysku. Niewysłanych apka nie kasuje. Po przekroczeniu limitu Dysku znikają z niego najstarsze.</p>' +
        '<button class="btn" type="button" data-zd="save">Zapisz ustawienia</button></div>' +
      '<div class="panel"><label class="field"><span>Szukaj: dzień (2026-11-01), kod, miejsce, rodzaj</span><input id="zdSearch" type="text" inputmode="search" value="' + esc(query) + '" placeholder="np. ISO-027 albo 2026-11-01"></label>' +
        (found.length ? Object.keys(days).map(function (d) {
          return '<div class="zd-day"><b>' + esc(d) + '</b> <span class="hint">' + days[d].length + '</span><div class="zd-grid">' + days[d].map(function (r) {
            return '<button type="button" class="zd-ph" data-ph="' + esc(r.id) + '" title="' + esc(r.name) + '">' + (r.hasBlob ? '' : '<span class="zd-cloud">Dysk</span>') +
              '<small>' + esc([r.category, r.code || r.location].filter(Boolean).join(' · ')) + '</small></button>';
          }).join('') + '</div></div>';
        }).join('') : '<p class="hint">' + (all.length ? 'Nic nie pasuje do wyszukiwania.' : 'Brak zdjęć. Zdjęcia z inspekcji i Reactive pojawią się tutaj.') + '</p>') +
      '</div>';
    bind(root, found);
  }

  async function thumbs(root) {
    var nodes = root.querySelectorAll('.zd-ph');
    for (var i = 0; i < nodes.length; i++) {
      var b = await Z.blob(nodes[i].dataset.ph); if (!b || !nodes[i].isConnected) continue;
      var u = URL.createObjectURL(b); urls.push(u); nodes[i].style.backgroundImage = 'url("' + u + '")';
    }
  }
  // usuwanie (Grzegorz 03/11): z telefonu i z Dysku, po potwierdzeniu
  async function delPhoto(r) {
    var P = w.OESTPrzycisk, txt = r.driveId ? 'Zniknie z telefonu i z Dysku Google.' : 'Zniknie z telefonu.';
    var yes = P && P.ask ? await P.ask({ title: 'Usunąć zdjęcie?', text: r.name + '. ' + txt, ok: 'Usuń', cancel: 'Anuluj' }) : w.confirm('Usunąć zdjęcie? ' + txt);
    if (!yes) return false;
    // trwa wysyłka na Dysk: czekamy, aż skończy, i bierzemy świeże dane (zdjęcie mogło właśnie dostać driveId)
    for (var i = 0; Z.busy() && i < 600; i++) await new Promise(function (ok) { setTimeout(ok, 500); });
    if (Z.busy()) throw Error('Trwa wysyłka zdjęć na Dysk – spróbuj usunąć za chwilę.');
    r = (await Z.list()).filter(function (x) { return x.id === r.id; })[0] || r;
    if (r.driveId && G) {
      try { await G.foreground(function () { return G.removeFile(r.driveId); }); }
      catch (e) { if (!/404/.test(String(e && e.message))) throw e; }
    }
    await Z.remove(r.id); return true;
  }
  function bind(root, found) {
    root.querySelector('.back').onclick = function () { navigate('settings'); }; // przy historii wstecz obsługuje index.html
    root.querySelector('[data-zd="sync"]').onclick = function () {
      // wspólny przycisk (moduly/przycisk): kółko + etap na przycisku, potem „✓ Gotowe” (Grzegorz 03/11)
      var P = w.OESTPrzycisk, h = P ? P.start(this, { busy: 'Sprawdzam połączenie', keep: false }) : null;
      msg = ''; if (!h) { msg = 'Łączę z Dyskiem…'; render(); }
      (G && G.foreground ? G.foreground(function () { return syncNow(true, h); }) : syncNow(true, h)).then(function (r) { msg = r.sent ? 'Wysłano na Dysk: ' + r.sent + '.' : 'Wszystko jest już na Dysku.'; return h && h.ok(r.sent ? 'Wysłano ' + r.sent : 'Gotowe'); },
        function (e) { msg = errText(e); if (h) h.fail(); }).then(render);
    };
    root.querySelector('[data-zd="save"]').onclick = function () {
      Z.setSettings({ preset: $('zdPreset').value, phoneLimitMB: +$('zdPhone').value, driveLimitMB: +$('zdDrive').value, wifiOnly: $('zdWifi').checked });
      msg = 'Ustawienia zapisane.'; render();
    };
    var t; $('zdSearch').oninput = function () { var v = this.value; clearTimeout(t); t = setTimeout(function () { query = v; render().then(function () { var i = $('zdSearch'); if (i) { i.focus(); i.setSelectionRange(v.length, v.length); } }); }, 300); };
    root.querySelectorAll('.zd-ph').forEach(function (b) {
      b.onclick = async function () {
        var r = found.filter(function (x) { return x.id === b.dataset.ph; })[0], blob = await Z.blob(b.dataset.ph);
        if (!blob) { msg = (r ? r.name : 'Zdjęcie') + ' jest już tylko na Dysku (folder ' + (r ? r.folder.join(' / ') : '') + ').'; render(); return; }
        var u = URL.createObjectURL(blob); urls.push(u);
        var o = w.document.createElement('div'); o.className = 'zd-full';
        o.innerHTML = '<img alt="" src="' + u + '"><p>' + esc(r.name) + '<br><span class="hint">' + esc(r.folder.join(' / ')) + ' · ' + mb(r.size) + '</span></p>' +
          '<div class="zd-act"><button type="button" class="btn" data-a="del">🗑 Usuń</button><button type="button" class="btn" data-a="close">Zamknij</button></div>';
        // Wstecz telefonu zamyka podgląd zamiast cofać apkę (OESTOverlay w index.html)
        var O = w.OESTOverlay; w.document.body.appendChild(o);
        if (O) O.open(function () { o.remove(); });
        var shut = function () { if (!o.isConnected) return; if (O) O.close(); else o.remove(); }; // tylko ten podgląd, jeśli jest jeszcze otwarty
        o.onclick = function (e) {
          var a = e.target.closest('[data-a]');
          if (!a) { if (e.target === o || e.target.tagName === 'IMG') shut(); return; }
          if (a.dataset.a === 'close') { shut(); return; }
          var er = o.querySelector('.zd-err'); if (er) er.remove();
          delPhoto(r).then(function (ok) { if (ok) { shut(); msg = 'Usunięto: ' + r.name + '.'; render(); } }, function (err) { var p = w.document.createElement('p'); p.className = 'zd-err'; p.textContent = 'Nie usunięto: ' + errText(err); o.appendChild(p); });
        };
      };
    });
    thumbs(root);
  }

  var css = w.document.createElement('style');
  css.textContent = '#v-zdjecia input[type=number],#v-zdjecia input[type=search]{width:100%;box-sizing:border-box;min-height:46px;padding:10px 12px;font:inherit;background:var(--field);border:1px solid var(--line);color:var(--ink);border-radius:12px}.zd-bar{height:10px;border-radius:6px;background:rgba(127,127,127,.25);overflow:hidden}.zd-bar span{display:block;height:100%;background:var(--accent,#7c5cff)}.zd-bar span.full{background:#e5484d}' +
    '.zd-day{margin-top:6px}.zd-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:6px;margin-top:6px}' +
    '.zd-ph{position:relative;aspect-ratio:1;border:1px solid var(--line);border-radius:10px;background:#222 center/cover no-repeat;padding:0;overflow:hidden}' +
    '.zd-ph small{position:absolute;left:0;right:0;bottom:0;padding:2px 4px;font-size:.7rem;background:rgba(0,0,0,.6);color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.zd-cloud{position:absolute;top:4px;right:4px;font-size:.7rem;background:rgba(0,0,0,.6);color:#fff;padding:1px 5px;border-radius:6px}' +
    '.zd-full{position:fixed;inset:0;z-index:999;background:rgba(0,0,0,.92);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px;color:#fff;text-align:center}.zd-full img{max-width:100%;max-height:72vh;object-fit:contain}.zd-act{display:flex;gap:10px;margin-top:8px;padding-bottom:max(12px,env(safe-area-inset-bottom),var(--safe-area-inset-bottom,0px))}.zd-act .btn{min-width:120px}.zd-err{color:#ffb4b4;margin:8px 0 0;max-width:90%}';
  w.document.head.appendChild(css);

  Z.onChange(function () { render(); });
  var soon; Z.onSaved(function () { clearTimeout(soon); soon = w.setTimeout(auto, 2000); }); // nowe zdjęcie → wyślij, jeśli Dysk połączony i Wi-Fi
  w.addEventListener('online', auto);
  if (w.navigator.connection && w.navigator.connection.addEventListener) w.navigator.connection.addEventListener('change', auto);
  w.setTimeout(auto, 3000);

  w.OESTZdjeciaUI = { open: function () { msg = ''; render(); auto(); }, setNavigate: function (f) { navigate = f; }, auto: auto };
})(window);
