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
    if (/AbortError|Failed to fetch|TypeError/.test(m)) return 'Brak internetu albo za słaby sygnał. Zdjęcia poczekają na następną próbę.';
    return 'Nie udało się: ' + m;
  }

  async function syncNow(force) {
    if (!G) throw Error('GOOGLE_SETUP');
    if (!G.connected('drive')) await G.connect('drive');
    return Z.sync(drive(), force);
  }
  // automatycznie: tylko na Wi-Fi i tylko gdy Dysk jest już połączony w tej sesji (bez wyskakujących okien)
  function auto() {
    if (!G || !G.connected('drive') || Z.busy()) return;
    Z.sync(drive(), false).then(function (r) { if (r && r.sent) { msg = 'Wysłano na Dysk: ' + r.sent + '.'; render(); } }).catch(function () {});
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
  function bind(root, found) {
    root.querySelector('.back').onclick = function () { navigate('settings'); }; // przy historii wstecz obsługuje index.html
    root.querySelector('[data-zd="sync"]').onclick = function () {
      msg = 'Łączę z Dyskiem…'; render();
      syncNow(true).then(function (r) { msg = r.sent ? 'Wysłano na Dysk: ' + r.sent + '.' : 'Wszystko jest już na Dysku.'; })
        .catch(function (e) { msg = errText(e); }).then(render);
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
        o.innerHTML = '<img alt="" src="' + u + '"><p>' + esc(r.name) + '<br><span class="hint">' + esc(r.folder.join(' / ')) + ' · ' + mb(r.size) + '</span></p>';
        o.onclick = function () { o.remove(); }; w.document.body.appendChild(o);
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
    '.zd-full{position:fixed;inset:0;z-index:999;background:rgba(0,0,0,.92);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px;color:#fff;text-align:center}.zd-full img{max-width:100%;max-height:80vh;object-fit:contain}';
  w.document.head.appendChild(css);

  Z.onChange(function () { render(); });
  var soon; Z.onSaved(function () { clearTimeout(soon); soon = w.setTimeout(auto, 2000); }); // nowe zdjęcie → wyślij, jeśli Dysk połączony i Wi-Fi
  w.addEventListener('online', auto);
  if (w.navigator.connection && w.navigator.connection.addEventListener) w.navigator.connection.addEventListener('change', auto);
  w.setTimeout(auto, 3000);

  w.OESTZdjeciaUI = { open: function () { msg = ''; render(); auto(); }, setNavigate: function (f) { navigate = f; }, auto: auto };
})(window);
