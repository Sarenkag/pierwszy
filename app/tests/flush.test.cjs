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

// 04/11: odtworzenie Flushingu z PDF-a raportu w kolejce (PDF z apki: tydzień 3, kran 2 = No z notatką, zdjęcia przy kranach 1, 3, 5)
test('fromPdf reads answers, week and photo→outlet from the queued report PDF', () => {
  const F = require('../../inspekcje/flush.js'), fs = require('node:fs'), path = require('node:path');
  const names = ["Roof", "Bin Stores", "SPA Chemical Room", "SPA Hall (Toilets)", "Massage Hall", "Massage Room", "Studio", "Pool Hall", "Gym", "Cycle Store", "Apartment 101", "Apartment 103", "Apartment 104", "Apartment 107", "x1", "x2", "x3", "x4", "x5", "x6"];
  const r = F.fromPdf(new Uint8Array(fs.readFileSync(path.join(__dirname, 'dane/flush-tb.pdf'))), names);
  assert.equal(r.week, 3); assert.equal(r.taps.length, 20);
  assert.deepEqual(r.taps[1], { state: 'no', note: 'Valve stiff, reported' }); assert.equal(r.taps[0].state, 'yes');
  assert.deepEqual(r.photos.map(p => p.tap), [0, 2, 4]);
  assert.equal(r.photos[0].bytes[0], 0xff); assert.equal(r.photos[0].bytes[1], 0xd8);
  assert.equal(F.fromPdf(new Uint8Array(fs.readFileSync(path.join(__dirname, 'dane/flush-tb.pdf'))), names.slice(0, 5)), null); // inna lista kranów: nie zgadujemy
});
test('fromPdf: exact outlet name wins over a prefix; ambiguous short caption is not guessed', () => {
  const F = require('../../inspekcje/flush.js'), fs = require('node:fs'), path = require('node:path');
  const pdf = new Uint8Array(fs.readFileSync(path.join(__dirname, 'dane/flush-tb.pdf')));
  const base = ["Roof", "Bin Stores", "SPA Chemical Room", "SPA Hall (Toilets)", "Massage Hall", "Massage Room", "Studio", "Pool Hall", "Gym", "Cycle Store", "Apartment 101", "Apartment 103", "Apartment 104", "Apartment 107", "x1", "x2", "x3", "x4", "x5", "x6"];
  const a = base.slice(); a[3] = "Massage Hall East"; // prefiks „Massage Hall” przed dokładną nazwą
  assert.deepEqual(F.fromPdf(pdf, a).photos.map(p => p.tap), [0, 2, 4]);
  const b = base.slice(); b[0] = "Roof A"; b[1] = "Roof B"; // podpis „Roof” pasuje do dwóch kranów: zdjęcie pominięte
  assert.deepEqual(F.fromPdf(pdf, b).photos.map(p => p.tap), [2, 4]);
});

// 21/11/2026: basic form Flushing ze strefami (moduly/wzory/flush-basic-*.docx) – Grzegorz: grupy stref, TB bez apartamentów, stałe zdanie
const Docxtemplater=require('docxtemplater'),fs2=require('node:fs'),path2=require('node:path');
const ALL='All listed Outlets flushed in accordance with the site Legionella Control procedures. Water drawn through each to prevent stagnation.';
const PART='Outlets marked as flushed were flushed in accordance with the site Legionella Control procedures. Water drawn through each to prevent stagnation.';
function basic(k,states={},notes={}){const f=P.forms.flush[k],taps=f.taps.map((n,i)=>({name:n,state:states[i]||'yes',note:notes[i]||''}));
  const z=new PizZip(fs2.readFileSync(path2.join(__dirname,'../../moduly/wzory',f.wzorBasic+'.docx')));const dt=new Docxtemplater(z,{paragraphLoop:true,linebreaks:true,nullGetter:()=>''});
  dt.render(Object.assign({title:f.title,date:'21/11/2026'},F.basicPola({taps,strefy:f.strefy})));return dt.getZip().file('word/document.xml').asText();}
test('strefy: każdy kran dokładnie w jednej strefie, TB bez apartamentów, każdy budynek ma swój wzór basic',()=>{
  for(const k of ['TA','TB','P']){const f=P.forms.flush[k],w=[].concat(...f.strefy.map(z=>z[1]));
    assert.deepEqual([...w].sort(),[...f.taps].sort(),k);assert.equal(new Set(w).size,w.length,k);
    assert.ok(fs2.existsSync(path2.join(__dirname,'../../moduly/wzory',f.wzorBasic+'.docx')),f.wzorBasic);}
  assert.ok(!P.forms.flush.TB.taps.some(t=>/Apartment/.test(t)));});
test('basic Flushing: wszystkie Yes → ☑ przy każdym kranie, strefa „n/n”, zdanie ALL, bez Overall Condition i bez nawiasów',()=>{
  const x=basic('TB'),t=text(x);assert.doesNotMatch(t,/[{}]/);assert.equal((t.match(/☑/g)||[]).length,16);assert.doesNotMatch(t,/☒|N\/A|Overall Condition/);
  assert.match(t,/SPA &amp; WELLNESS   ·   7\/7/);assert.ok(t.includes(ALL));assert.ok(!t.includes(PART));});
test('basic Flushing: No i N/A → ☒ i N/A przy właściwym kranie, licznik strefy, notatka przy nazwie, zdanie PART',()=>{
  const f=P.forms.flush.TA,i=f.taps.indexOf('Private Dining'),j=f.taps.indexOf('Bin Store');
  const t=text(basic('TA',{[i]:'no',[j]:'na'},{[i]:'Seized'}));
  assert.match(t,/Private Dining\| – Seized\|☒/);assert.match(t,/Bin Store\|N\/A/);assert.match(t,/LEVEL 49   ·   4\/5/);assert.match(t,/BACK OF HOUSE   ·   1\/2/);
  assert.equal((t.match(/☑/g)||[]).length,10);assert.ok(t.includes(PART));assert.ok(!t.includes(ALL));});
test('PDF basic Flushing rysuje te same strefy, krany i zdanie co Word',()=>{
  const out=[],nop=()=>pdf;const pdf=new Proxy({},{get:(o,k)=>k==='text'?(s=>{out.push([].concat(s).join(' '));return pdf;}):k==='splitTextToSize'?(s=>[s]):nop});
  const f=P.forms.flush.P,fl={taps:f.taps.map((n,i)=>({name:n,state:i?'no':'yes',note:''})),strefy:f.strefy};const y=F.rysujStrefy(pdf,fl,15,60,180,(yy)=>yy);
  assert.ok(y>60);assert.ok(out.some(s=>/TOILETS   ·   1\/2/.test(s)));assert.ok(out.includes('Unisex Toilet')&&out.includes('Disabled Toilet'));assert.ok(out.includes(PART));});
