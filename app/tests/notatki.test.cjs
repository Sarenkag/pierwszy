// Moduł notatek głosowych (moduly/notatki, 08/11/2026): słowa branżowe, liczby, stan notatki, magazyn wg miejsca, łączenie, kontekst dla modelu.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const J=x=>JSON.parse(JSON.stringify(x));
function load(extra){const w=Object.assign({notatkiPamiecTestowa:true,localStorage:{getItem:()=>null,setItem:()=>{}}},extra||{});w.window=w;const ctx={window:w,console};
  for(const f of ['model/model.js','notatki/notatki.js'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../moduly',f),'utf8'),ctx);return w;}
test('notatki: słowa branżowe – PL po rozpoznaniu mowy, EN po tłumaczeniu',()=>{const N=load().OESTNotatki;
  assert.equal(N.fix('kran ma 54 stopnie celsjusza, zimna 17,8 stopni','pl'),'kran ma 54 °C, zimna 17,8 °C');
  assert.equal(N.fix('a o w na trzynastce nie działa, de be w piwnicy','pl'),'AOV na trzynastce nie działa, DB w piwnicy');
  assert.equal(N.fix('Słowa jak kaowiec zostają','pl'),'Słowa jak kaowiec zostają');
  assert.equal(N.fix('The insulator in the elevator room is broken. Insulators checked.','en'),'The isolator in the lift room is broken. Isolators checked.');
  assert.equal(N.fix('Hot water 54 degrees Celsius at the faucet','en'),'Hot water 54 °C at the tap');});
test('notatki: stan notatki i brakujące liczby',()=>{const N=load().OESTNotatki;
  assert.equal(N.state({pl:'błąd na strefie 4 i 12',en:'Fault on zone 4.'}),'check');
  assert.deepEqual(J(N.missing('błąd na strefie 4 i 12','Fault on zone 4.')),['12']);
  assert.equal(N.state({pl:'błąd na strefie 4',en:'Fault on zone 4.'}),'ready');
  assert.equal(N.state({pl:'tylko polski',en:''}),'pl');
  assert.equal(N.state({pl:'',en:'',err:'x'}),'error');
  assert.equal(N.state({pl:'',en:'',st:'busy'}),'busy');});
test('notatki: każde miejsce ma swoje notatki; przeniesienie i wyczyszczenie',async()=>{const N=load().OESTNotatki;
  const b=s=>({blob:{size:s},ms:1000});
  const a1=await N.addAudio('draft_A|1','AOV',b(1)),a2=await N.addAudio('draft_A|1','AOV',b(2));await N.addAudio('draft_B|1','DB',b(3));
  await new Promise(r=>setTimeout(r,20));/* poza telefonem tekst nie powstaje: notatka zostaje z nagraniem i podpowiedzią */
  assert.equal(N.state((await N.list('draft_A|1'))[1]),'error');assert.match((await N.list('draft_A|1'))[1].err,/w apce na telefonie/);
  a1.st='';a1.err='';a1.pl='Klapa zastawiona';a1.en='Smoke vent obstructed.';await N.put(a1);
  assert.deepEqual(J((await N.list('draft_A|1')).map(n=>n.id)),[a1.id,a2.id]);
  assert.equal((await N.list('draft_B|1')).length,1);
  assert.deepEqual(J(await N.summary('draft_A|1')),{all:2,ready:1,busy:0});
  await N.move('draft_A|1','draft_A|1@2026-11-01');assert.equal((await N.list('draft_A|1')).length,0);assert.equal((await N.list('draft_A|1@2026-11-01')).length,2);
  await N.clear('draft_A|1@2026-11-01');assert.equal((await N.list('draft_A|1@2026-11-01')).length,0);assert.equal((await N.list('draft_B|1')).length,1);
  assert.deepEqual(J(await N.list('')),[]);});
test('notatki: połączenie bez modelu = zdania po kolei; bez tekstu EN – błąd',async()=>{const N=load().OESTNotatki;
  const x=await N.addAudio('s','',{blob:{}}),y=await N.addAudio('s','',{blob:{}});await new Promise(r=>setTimeout(r,20));
  await assert.rejects(N.combine('s'),/Brak notatek/);
  Object.assign(x,{st:'',pl:'a',en:'The AOV did not open'});Object.assign(y,{st:'',pl:'b',en:'Vent obstructed.'});await N.put(x);await N.put(y);
  assert.equal(await N.combine('s'),'The AOV did not open. Vent obstructed.');});
test('notatki: model dostaje miejsce notatki tylko jako kontekst słownictwa',async()=>{let seen=null;
  const w=load({Capacitor:{isNativePlatform:()=>true,Plugins:{OESTModel:{status:async()=>({ready:true}),generate:async o=>{seen=o;return {text:'Fault on zone 4 and 12.'};}}}}});
  const out=await w.OESTModel.polish('Fault on zone 4 and 12','Błąd na strefie 4 i 12','Fire Alarm Weekly Test, Tower B');
  assert.equal(out,'Fault on zone 4 and 12.');assert.match(seen.prompt,/Context \(for terminology only; do not add it to the text\): Fire Alarm Weekly Test, Tower B/);
  await w.OESTModel.polish('x','x');assert.doesNotMatch(seen.prompt,/Context/);});
// Przegląd Codex PR #108 (08/11/2026) – testy odtwarzające znalezione błędy
test('notatki: bez bazy w telefonie zapis to błąd, nie udawany zapis w pamięci',async()=>{const w=load({notatkiPamiecTestowa:false}),N=w.OESTNotatki;
  await assert.rejects(N.addAudio('s','',{blob:{}}),/Nie udało się zapisać notatki/);});
test('notatki: przerwana zamiana na tekst (apka zamknięta) wznawia się przy odczycie, nie wisi jako „zamieniam”',async()=>{const N=load().OESTNotatki;
  const n=await N.addAudio('s','',{blob:{size:1}});await new Promise(r=>setTimeout(r,20));
  const stale=Object.assign({},(await N.list('s'))[0],{id:'stary',seq:9,st:'busy',err:'',audio:[n.audio[0]]});await N.put(stale);
  assert.equal((await N.summary('s')).busy,1);await new Promise(r=>setTimeout(r,30));
  const s=(await N.list('s')).find(x=>x.id==='stary');assert.equal(N.state(s),'error');assert.equal((await N.summary('s')).busy,0);});
test('notatki: usunięta w trakcie zamiany na tekst (Wyczyść inspekcję) nie wraca',async()=>{
  const slow={create:()=>({busy:false,transcribe:()=>new Promise(r=>setTimeout(()=>r({text:'klapa zastawiona'}),40))}),holdButton(){}};
  const N=load({OESTVoice:slow,Capacitor:{isNativePlatform:()=>true,Plugins:{}}}).OESTNotatki;
  await N.addAudio('s','',{blob:{}});await N.clear('s');assert.equal((await N.list('s')).length,0);await new Promise(r=>setTimeout(r,80));
  assert.equal((await N.list('s')).length,0);});
test('notatki: przeniesiona do archiwum w trakcie zamiany na tekst zostaje w archiwum',async()=>{
  const slow={create:()=>({busy:false,transcribe:()=>new Promise(r=>setTimeout(()=>r({text:'klapa zastawiona'}),40))}),holdButton(){}};
  const N=load({OESTVoice:slow,Capacitor:{isNativePlatform:()=>true,Plugins:{}}}).OESTNotatki;
  await N.addAudio('draft_A|1','',{blob:{}});await N.move('draft_A|1','draft_A|1@2026-11-01');await new Promise(r=>setTimeout(r,80));
  assert.equal((await N.list('draft_A|1')).length,0);const a=await N.list('draft_A|1@2026-11-01');assert.equal(a.length,1);assert.equal(a[0].pl,'klapa zastawiona');});
