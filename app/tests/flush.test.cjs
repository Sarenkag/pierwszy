const {test}=require('node:test'),assert=require('node:assert/strict'),PizZip=require('pizzip'),F=require('../../inspekcje/flush.js');
global.window={};global.localStorage={getItem(){return null},setItem(){}};require('../www/ppm.js');require('../../inspekcje/tpl-flush.js');
const P=window.OEST_PPM;
function doc(k,opt={}){const f=P.forms.flush[k],z=new PizZip(Buffer.from(window.TPL_FLUSH,'base64'));const taps=f.taps.map((n,i)=>({name:n,state:opt.states?.[i]||'yes',note:opt.notes?.[i]||''}));
  const d={building:f.building,year:2026,month:10,week:opt.week||2,date:new Date(2026,10,9),name:'G & S',taps};return {xml:F.fill(z.file('word/document.xml').asText(),d),hdr:F.header(z.file('word/header1.xml').asText(),f.building),d};}
const text=x=>[...x.matchAll(/<w:t(?: [^>]*)?>([^<]*)/g)].map(m=>m[1]).join('|');
test('trzy inspekcje Flush mają swoje listy kranów i wspólny wzór',()=>{for(const [id,k,n] of [['EFA-INS-004','TA',12],['EFA-INS-026','TB',20],['EFA-INS-012','P',2]]){const t=P.tasks.find(t=>t.id===id);assert.equal(t.flush,k);assert.equal(t.form,'folder');assert.equal(P.forms.flush[k].taps.length,n);}});
test('wiersz na każdy kran, Yes/No/N/A tylko w kolumnie wybranego tygodnia, bez pól i znaczników',()=>{const {xml}=doc('TA',{week:3,states:{1:'no',2:'na'},notes:{1:'Seized <tap>'}});
  assert.doesNotMatch(xml,/\{[a-z]+\d*\}|<!--ROW-->/);assert.equal((xml.match(/<w:tr[ >]/g)||[]).length,3+3+12);
  const rows=xml.split(/<w:tr[ >]/).slice(7).map(r=>(r.match(/<w:tc>.*?<\/w:tc>/gs)||[]).map(text));
  assert.deepEqual(rows[0].slice(0,13),['Disable Toilet LG','','','','','Yes','09.11.2026','','','','','G &amp; S','']);
  assert.equal(rows[1][5],'No');assert.equal(rows[1][12],'Seized &lt;tap&gt;');assert.equal(rows[2][5],'N/A');assert.equal(rows[2][6],'');});
test('bieżący rok i miesiąc na zielono, lata od bieżącego',()=>{const {xml}=doc('P');assert.equal((xml.match(/w:fill="92D050"/g)||[]).length,2);assert.match(xml,/2026<\/w:t>.*2031<\/w:t>/s);
  const nov=xml.split('November')[0];assert.match(nov.slice(nov.lastIndexOf('<w:tc>')),/92D050/);});
test('nagłówek: TOWER A / TOWER B / PAVILION',()=>{assert.match(text(doc('TA').hdr),/TOWER\| A/);assert.match(text(doc('TB').hdr),/TOWER\| B/);const p=text(doc('P').hdr);assert.match(p,/PAVILION/);assert.doesNotMatch(p,/TOWER/);});
test('podsumowanie: niezalane krany → Fault Log',()=>{assert.equal(F.summary({taps:[{state:'yes'},{state:'na'}]}),'All outlets flushed (1 N/A)');assert.match(F.summary({taps:[{state:'no'}]}),/Fault and Remedial/);});
test('Date odznaczone: kolumna daty pusta, Yes zostaje',()=>{const f=P.forms.flush.P,z=new PizZip(Buffer.from(window.TPL_FLUSH,'base64'));const xml=F.fill(z.file('word/document.xml').asText(),{building:'Pavilion',year:2026,month:0,week:1,date:new Date(2026,0,5),noDate:true,name:'',taps:f.taps.map(n=>({name:n,state:'yes',note:''}))});assert.doesNotMatch(xml,/05\.01\.2026/);assert.match(xml,/>Yes</);});
