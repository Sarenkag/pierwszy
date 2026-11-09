// Przegląd ChatGPT 09/11/2026, pkt 4 (zgoda Grzegorza „lecisz z 1 4 6”): gdy pamięć telefonu (IndexedDB) się nie otwiera,
// dodanie raportu do kolejki zgłaszało sukces („W kolejce do wysłania”), a w kolejce było 0 raportów.
// Zasada: zapis do kolejki bez magazynu jest odrzucany (STORAGE_WRITE); sukces tylko po potwierdzonej transakcji.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
function fakeIDB(){ // minimalny IndexedDB: jedna baza, magazyny w Map, transakcja kończy się po żądaniach
  const stores={queue:new Map(),kv:new Map()};
  return {open(){const rq={result:{createObjectStore(){},transaction(name){const t={};const st={put(v){stores[name].set(v.id,structuredClone(v));return {};},getAll(){const r={result:[...stores[name].values()]};return r;}};t.objectStore=()=>st;setTimeout(()=>t.oncomplete&&t.oncomplete());return t;}}};setTimeout(()=>rq.onsuccess&&rq.onsuccess());return rq;},stores};
}
function load(idb){
  const root={localStorage:{getItem:k=>k==='oest.account'?JSON.stringify({email:'a@gmail.com'}):null,setItem(){}},navigator:{onLine:true},document:{addEventListener(){},readyState:'loading'},addEventListener(){},setTimeout,clearTimeout,indexedDB:idb,crypto:globalThis.crypto};
  new Function('window','setInterval',fs.readFileSync(__dirname+'/../../moduly/wysylka/wysylka.js','utf8'))(root,()=>0);
  return root.OESTSender;
}
test('pamięć telefonu niedostępna: enqueue odrzuca zapis (STORAGE_WRITE), nie udaje kolejki', async()=>{
  const S=load({open(){const rq={};setTimeout(()=>rq.onerror&&rq.onerror());return rq;}});
  await assert.rejects(S.enqueue({type:'reactive',code:'TEST'}),/STORAGE_WRITE/);
  assert.equal(S.count(),0);
});
test('indexedDB.open rzuca wyjątek: enqueue też odrzuca', async()=>{
  const S=load({open(){throw Error('SecurityError');}});
  await assert.rejects(S.enqueue({type:'reactive',code:'TEST'}),/STORAGE_WRITE/);
});
test('pamięć działa: raport naprawdę jest w kolejce po enqueue', async()=>{
  const idb=fakeIDB(),S=load(idb);
  const rec=await S.enqueue({type:'reactive',code:'TEST'});
  assert.ok(idb.stores.queue.has(rec.id),'zapisany w IndexedDB');
  assert.equal(idb.stores.queue.get(rec.id).status,'wait');
  assert.equal(idb.stores.queue.get(rec.id).acct,'a@gmail.com');
});
