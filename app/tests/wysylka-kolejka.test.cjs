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
  new Function('window',fs.readFileSync(__dirname+'/../../moduly/narzedzia/narzedzia.js','utf8'))(root); // jak w apce: narzędzia (esc) przed modułem
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
test('Udostępnij: raport „shared” nie jest do wysłania, ale czeka na potwierdzenie (audyt 19/11 nr 17, uwaga Codex #158)', async()=>{
  const idb=fakeIDB(),S=load(idb);
  await S.enqueue({type:'ppm',code:'A',status:'shared'});
  await S.enqueue({type:'ppm',code:'B',status:'sent'});
  await S.refresh().catch(()=>{});
  assert.equal(S.count(),0,'nic do automatycznej wysyłki');
  assert.equal(S.toConfirm(),1,'jeden raport do potwierdzenia – pasek nie może pokazać „Wszystko wysłane”');
  await S.enqueue({type:'ppm',code:'C'}); await S.refresh().catch(()=>{});
  assert.equal(S.count(),1); assert.equal(S.toConfirm(),1);
});

// Karta K10 (audyt 19/11/2026 nr 21–22, D4): baza „inspekcje” ma JEDNEGO właściciela – moduly/wysylka (OESTSender.baza).
// Strona inspekcji nie otwiera jej sama; te same magazyny queue i kv, ta sama nazwa i wersja.
function fullIDB(){
  const stores={queue:new Map(),kv:new Map()},opened=[];
  return {stores,opened,open(name,ver){opened.push(name+'@'+ver);const rq={result:{createObjectStore(){},transaction(name){const t={};const map=stores[name];
    const req=v=>{const r={result:v,readyState:'done'};return r;};
    const st={put(v,k){map.set(k===undefined?v.id:k,structuredClone(v));return req(undefined);},get(k){return req(map.has(k)?structuredClone(map.get(k)):undefined);},
      getAll(){return req([...map.values()].map(x=>structuredClone(x)));},delete(k){map.delete(k);return req(undefined);}};
    t.objectStore=()=>st;setTimeout(()=>t.oncomplete&&t.oncomplete());return t;}}};setTimeout(()=>{rq.onupgradeneeded&&rq.onupgradeneeded();rq.onsuccess&&rq.onsuccess();});return rq;}};
}
test('K10: OESTSender.baza – kv i kolejka w tej samej bazie „inspekcje” v1, jedno otwarcie', async()=>{
  const idb=fullIDB(),B=load(idb).baza;
  await B.kvSet('tpl',{name:'x'}); assert.deepEqual(await B.kvGet('tpl'),{name:'x'});
  assert.equal(await B.kvGet('brak'),undefined,'brak klucza = undefined, nie obiekt żądania');
  assert.deepEqual(await B.kvAll(),[{name:'x'}]);
  await B.qPut({id:'a',status:'wait'}); await B.qPut({id:'b',status:'sent'});
  assert.deepEqual((await B.qAll()).map(q=>q.id).sort(),['a','b']);
  await B.qDel('a'); assert.deepEqual((await B.qAll()).map(q=>q.id),['b']);
  assert.equal(await B.dostepna(),true);
  assert.deepEqual(idb.opened,['inspekcje@1']);
});
test('K10: bez magazynu odczyt = pusto, zapis = STORAGE_WRITE (nie cichy zapas w pamięci)', async()=>{
  const B=load({open(){const rq={};setTimeout(()=>rq.onerror&&rq.onerror());return rq;}}).baza;
  assert.equal(await B.dostepna(),false); assert.deepEqual(await B.qAll(),[]); assert.deepEqual(await B.kvAll(),[]); assert.equal(await B.kvGet('x'),undefined);
  await assert.rejects(B.kvSet('x',1),/STORAGE_WRITE/); await assert.rejects(B.qPut({id:'a'}),/STORAGE_WRITE/); await assert.rejects(B.qDel('a'),/STORAGE_WRITE/);
});
test('K10: strona inspekcji nie otwiera bazy sama (jeden właściciel)', ()=>{
  const dir=__dirname+'/../../inspekcje/';
  for(const f of fs.readdirSync(dir).filter(f=>/\.(js|html)$/.test(f))) assert.doesNotMatch(fs.readFileSync(dir+f,'utf8'),/indexedDB\.open/,f);
});
