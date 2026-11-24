const {test}=require('node:test'),assert=require('node:assert/strict'),PizZip=require('pizzip'),F=require('../../inspekcje/flush.js');
global.window={};global.localStorage={getItem(){return null},setItem(){}};require('../www/ppm.js');const TPL_FLUSH=require('node:fs').readFileSync(require('node:path').join(__dirname,'../../moduly/wzory/flush.docx')); // wzór z modułu Wzory
const P=window.OEST_PPM;
function doc(k,opt={}){const f=P.forms.flush[k],z=new PizZip(TPL_FLUSH);const taps=f.taps.map((n,i)=>({name:n,state:opt.states?.[i]||'yes',note:opt.notes?.[i]||''}));
  const d={building:f.building,year:2026,month:10,week:opt.week||2,date:new Date(2026,10,9),name:'G & S',taps};return {xml:F.fill(z.file('word/document.xml').asText(),d),hdr:F.header(z.file('word/header1.xml').asText(),f.building),d};}
const text=x=>[...x.matchAll(/<w:t(?: [^>]*)?>([^<]*)/g)].map(m=>m[1]).join('|');
test('trzy inspekcje Flush mają swoje listy kranów i wspólny wzór',()=>{for(const [id,k,n] of [['EFA-INS-004','TA',12],['EFA-INS-026','TB',16],['EFA-INS-012','P',2]]){const t=P.tasks.find(t=>t.id===id);assert.equal(t.flush,k);assert.equal(t.form,'folder');assert.equal(P.forms.flush[k].taps.length,n);}});
test('wiersz na każdy kran, Yes/No/N/A tylko w kolumnie wybranego tygodnia, bez pól i znaczników',()=>{const {xml}=doc('TA',{week:3,states:{1:'no',2:'na'},notes:{1:'Seized <tap>'}});
  assert.doesNotMatch(xml,/\{[a-z]+\d*\}|<!--ROW-->/);assert.equal((xml.match(/<w:tr[ >]/g)||[]).length,3+3+12);
  const rows=xml.split(/<w:tr[ >]/).slice(7).map(r=>(r.match(/<w:tc>.*?<\/w:tc>/gs)||[]).map(text));
  assert.deepEqual(rows[0].slice(0,13),['Disable Toilet LG','','','','','Yes','09.11.2026','','','','','G &amp; S','']);
  assert.equal(rows[1][5],'No');assert.equal(rows[1][12],'Seized &lt;tap&gt;');assert.equal(rows[2][5],'N/A');assert.equal(rows[2][6],'');});
test('bieżący rok i miesiąc na zielono, lata od bieżącego',()=>{const {xml}=doc('P');assert.equal((xml.match(/w:fill="92D050"/g)||[]).length,2);assert.match(xml,/2026<\/w:t>.*2031<\/w:t>/s);
  const nov=xml.split('November')[0];assert.match(nov.slice(nov.lastIndexOf('<w:tc>')),/92D050/);});
test('nagłówek: TOWER A / TOWER B / PAVILION',()=>{assert.match(text(doc('TA').hdr),/TOWER\| A/);assert.match(text(doc('TB').hdr),/TOWER\| B/);const p=text(doc('P').hdr);assert.match(p,/PAVILION/);assert.doesNotMatch(p,/TOWER/);});
test('podsumowanie: niezalane krany → Fault Log',()=>{assert.equal(F.summary({taps:[{state:'yes'},{state:'na'}]}),'All outlets flushed (1 N/A)');assert.match(F.summary({taps:[{state:'no'}]}),/Fault and Remedial/);});
test('Date odznaczone: kolumna daty pusta, Yes zostaje',()=>{const f=P.forms.flush.P,z=new PizZip(TPL_FLUSH);const xml=F.fill(z.file('word/document.xml').asText(),{building:'Pavilion',year:2026,month:0,week:1,date:new Date(2026,0,5),noDate:true,name:'',taps:f.taps.map(n=>({name:n,state:'yes',note:''}))});assert.doesNotMatch(xml,/05\.01\.2026/);assert.match(xml,/>Yes</);});

// 21/11/2026: basic form Flushing ze strefami (moduly/wzory: ramka basic.docx + flush-*-srodek.docx) – Grzegorz: grupy stref, TB bez apartamentów, stałe zdanie
const Docxtemplater=require('docxtemplater'),fs2=require('node:fs'),path2=require('node:path');
// wzór basic Flushing = ramka basic.docx + plik środka, składane przez moduł Wzory (Grzegorz 21/11/2026 17:33) – test bierze bajty z modułu jak apka
const WZ=path2.join(__dirname,'../../moduly/wzory');globalThis.PizZip=PizZip;if(globalThis.window)globalThis.window.PizZip=PizZip;require(path2.join(WZ,'wzory.js'));const OW=(globalThis.window||globalThis).OESTWzory;
for(const w of OW.lista())OW.ustaw(w.id,fs2.readFileSync(path2.join(WZ,w.plik)));
const ALL='All listed Outlets flushed in accordance with the site Legionella Control procedures. Water drawn through each to prevent stagnation.';
const PART='Outlets marked as flushed were flushed in accordance with the site Legionella Control procedures. Water drawn through each to prevent stagnation.';
function basic(k,states={},notes={}){const f=P.forms.flush[k],taps=f.taps.map((n,i)=>({name:n,state:states[i]||'yes',note:notes[i]||''}));
  const z=new PizZip(OW.bajty(f.wzorBasic));const dt=new Docxtemplater(z,{paragraphLoop:true,linebreaks:true,nullGetter:()=>''});
  dt.render(Object.assign({title:f.title,date:'21/11/2026'},F.basicPola({taps,strefy:f.strefy})));return dt.getZip().file('word/document.xml').asText();}
test('strefy: każdy kran dokładnie w jednej strefie, TB bez apartamentów, każdy budynek ma swój wzór basic',()=>{
  for(const k of ['TA','TB','P']){const f=P.forms.flush[k],w=[].concat(...f.strefy.map(z=>z[1]));
    assert.deepEqual([...w].sort(),[...f.taps].sort(),k);assert.equal(new Set(w).size,w.length,k);
    assert.ok(OW.bajty(f.wzorBasic).length>1000,f.wzorBasic);}
  assert.ok(!P.forms.flush.TB.taps.some(t=>/Apartment/.test(t)));});
test('basic Flushing: wszystkie Yes → ☑ przy każdym kranie, strefa „n/n”, zdanie ALL, bez Overall Condition i bez nawiasów',()=>{
  const x=basic('TB'),t=text(x);assert.doesNotMatch(t,/[{}]/);assert.equal((t.match(/☑/g)||[]).length,16);assert.doesNotMatch(t,/☒|N\/A|Overall Condition/);
  assert.match(t,/SPA &amp; WELLNESS   ·   7\/7/);assert.ok(t.includes(ALL));assert.ok(!t.includes(PART));});
test('basic Flushing: No i N/A → ☒ i N/A przy właściwym kranie, licznik strefy, notatka przy nazwie, zdanie PART',()=>{
  const f=P.forms.flush.TA,i=f.taps.indexOf('Private Dining'),j=f.taps.indexOf('Bin Store');
  const t=text(basic('TA',{[i]:'no',[j]:'na'},{[i]:'Seized'}));
  assert.match(t,/Private Dining\| – Seized\|☒/);assert.match(t,/Bin Store\|N\/A/);assert.match(t,/LEVEL 49   ·   4\/5/);assert.match(t,/BACK OF HOUSE   ·   1\/2/);
  assert.equal((t.match(/☑/g)||[]).length,10);assert.ok(t.includes(PART));assert.ok(!t.includes(ALL));});
test('szkic TB sprzed zmiany (20 kranów, bez nazw): odpowiedzi, notatki, tydzień i formularz pierwszych 16 kranów zostają (DATA-002)',()=>{
  const n=P.forms.flush.TB.taps,old={on:true,week:3,open:{1:true},taps:Array.from({length:20},(_,i)=>({state:i===2?'no':i===5?'na':'yes',note:i===2?'Seized':''}))};
  const m=F.migrujSzkic(old,n);assert.equal(m.taps.length,16);assert.equal(m.taps[2].state,'no');assert.equal(m.taps[2].note,'Seized');assert.equal(m.taps[5].state,'na');
  assert.equal(m.week,3);assert.equal(m.on,true);assert.deepEqual(m.names,n);
  const z=F.migrujSzkic({names:['A','B'],taps:[{state:'no',note:'x'},{state:'na',note:''}]},['B','C','A']);assert.deepEqual(z.taps.map(t=>t.state),['na','yes','no']);
  assert.equal(F.migrujSzkic({taps:[{state:'no'}]},['A','B']),null);assert.equal(F.migrujSzkic(null,['A']),null);});
test('zdjęcia kranów idą za kranem; usunięty kran (apartament TB) → zdjęcie ogólne, nie osierocone (uwaga Codex #187)',()=>{
  const n=P.forms.flush.TB.taps;assert.deepEqual(F.mapaKranow({taps:Array(20).fill({state:'yes'})},n),[...n.map((_,i)=>i),null,null,null,null]);
  assert.deepEqual(F.mapaKranow({names:['A','B','C'],taps:[{},{},{}]},['C','A']),[1,null,0]);assert.equal(F.mapaKranow({taps:[{}]},['A','B']),null);});