// Wspólne dla testów ekranów z mapy moduly/ekrany/ekrany.json (plan audytu 1.3 Wstecz i 1.6 zrzuty): serwer strony, konto testowe,
// prawdziwe rekordy dla ekranów z „:id” i adres każdego ekranu. Nie jest testem (nazwa bez -ui-check / .test).
'use strict';
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const REPO = path.resolve(__dirname, '../..');
const MAPA = JSON.parse(fs.readFileSync(path.join(REPO, 'moduly/ekrany/ekrany.json'), 'utf8')).ekrany;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
// serwer plików strony z katalogu root (www); zwraca adres http://127.0.0.1:port i close()
async function serwer(root) {
  const srv = http.createServer((req, res) => {
    const p = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
    if (!p.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(p, (e, b) => { if (e) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', TYPES[path.extname(p)] || 'application/octet-stream'); res.end(b); });
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  return { url: 'http://127.0.0.1:' + srv.address().port, close: () => srv.close() };
}
const KONTO = { provider: 'local', id: 't', email: 'demo@example.com', first: 'Greg', last: 'Sarna' };

// prawdziwe rekordy dla ekranów z „:id” – zapisane przez moduły apki (te same magazyny, z których czytają ekrany)
async function zasiej(pg) {
  return pg.evaluate(async () => {
    const owner = () => window.OESTSettings.get().owner, ids = {};
    const blob = await new Promise(r => { const c = document.createElement('canvas'); c.width = 40; c.height = 30; c.getContext('2d').fillRect(0, 0, 40, 30); c.toBlob(r, 'image/jpeg', 0.8); });
    const preview = await new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(blob); });
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()))).map(b => b.toString(16).padStart(2, '0')).join('');
    await window.OESTKeysStore.createRepository({ owner }).save({ id: 'k1', label: 'Test key', number: '1', kind: 'other', photos: [{ id: 'p1', hash, blob, preview, width: 40, height: 30 }], doors: [{ id: 'd1', name: 'Door 1', building: 'Tower A', floor: '1', photos: [{ id: 'p2', hash, blob, preview, width: 40, height: 30 }] }] });
    ids.key = 'k1';
    await window.OESTPowerStore.createRepository({ owner }).saveBoard({ id: 'b1', code: 'DB1', floor: '1', location: 'Plant room', building: 'Tower A', boxPhotos: [{ id: 'p3', hash, blob, preview, width: 40, height: 30 }], cardPhotos: [{ id: 'p4', hash: hash.replace(/^./, c => c === 'a' ? 'b' : 'a'), blob, preview, width: 40, height: 30 }] }, []);
    ids.board = 'b1';
    const R = window.OESTReactiveUI.repository, d = new Date(), day = x => new Date(d.getTime() + x * 864e5 - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
    // zmiana archiwalna (dla handover/archive) i bieżąca (handover/shift, handover/draft, zlecenia Reactive)
    await R.startShift(day(-10), day(-8));
    const stara = (await R.get()).shifts[0];
    await R.archive(stara.id, 'Back test handover', ['demo@example.com']);
    await R.startShift(day(0), day(3));
    await R.saveReactive({ title: 'Door handle detached', building: 'Tower B', level: '5', room: 'Kitchen', note: 'Back test', status: 'open', requestedBy: 'General requests', beforeMediaIds: [], afterMediaIds: [] });
    const s = await R.get();
    ids.shift = (s.shifts.find(x => !x.archived) || {}).id; ids.archive = s.archives[0] && s.archives[0].id; ids.job = s.jobs[0] && s.jobs[0].id; 
    const T = window.OESTReactiveTree.tree, roots = Array.isArray(T) ? T : (T && T.children) || [];
    const top = roots.find(n => n && n.children && n.children.length), leaf = roots.find(n => n && !(n.children && n.children.length));
    ids.node = top && top.id; ids.leaf = leaf ? leaf.id : top && top.children.find(c => !(c.children && c.children.length)).id;
    return ids;
  });
}
// Mapa zapisuje handover/draft i handover/archive bez części zmiennej, a apka wymaga numeru zmiany / archiwum
// (handover.js: draft(part[2]), archive(part[2])) – test dokleja go, a niespójność mapy jest na liście (mapa-bez-id:…).
const DOKLEJ = { 'handover/draft': 'shift', 'handover/archive': 'archive' };
const ID = { 'keys/detail/:id': 'key', 'keys/edit/:id': 'key', 'powertrace/view/:id': 'board', 'powertrace/edit/:id': 'board', 'handover/shift/:id': 'shift',
  'reactive/new/:id': 'leaf', 'reactive/draft/:id': 'draft', 'reactive/job/:id': 'job', 'reactive/complete/:id': 'job', 'reactive/tree/:id': 'node' };
// szkic Reactive: tworzy go sama apka po wejściu w nowe zgłoszenie (węzeł drzewa) – adres zmienia się na reactive/draft/<id>
async function szkic(pg, B, leaf) {
  await pg.goto(B + '/index.html#reactive/new/' + leaf); await pg.waitForLoadState('networkidle');
  // szkielet Ionic: sam hash w adresie nie jest nawigacją – przejście robi OESTEkrany.go (wersja bazowa z hashchange go nie ma)
  await pg.evaluate(h => { if (window.OESTEkrany && OESTEkrany.go) OESTEkrany.go(h); }, '#reactive/new/' + leaf);
  await pg.waitForFunction(() => /^#reactive\/draft\/[-\w]+$/.test(location.hash), null, { timeout: 5000 }).catch(() => {});
  return (await pg.evaluate(() => (location.hash.match(/^#reactive\/draft\/([-\w]+)$/) || [])[1])) || null;
}
// adres ekranu z mapy z prawdziwym numerem rekordu (ids z zasiej + szkic)
const adres = (id, ids) => ID[id] ? id.replace(':id', ids[ID[id]]) : DOKLEJ[id] ? id + '/' + ids[DOKLEJ[id]] : id;
module.exports = { REPO, MAPA, serwer, KONTO, zasiej, szkic, ID, DOKLEJ, adres };
