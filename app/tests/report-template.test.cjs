// Raport na wzorze firmy OEST-basic: pola po angielsku, brak pustej strony bez zdjęć, autor z profilu.
const test=require('node:test'),assert=require('node:assert'),fs=require('fs'),path=require('path');
const PizZip=require('pizzip'),Docxtemplater=require('docxtemplater');
const W=require('../../moduly/word/word.js');W.biblioteki({PizZip,Docxtemplater}); /* jedyny silnik Worda (moduly/word) */
const ctx={fillDocx:(Z,D,t,d,ph)=>new PizZip(W.wypelnij(t,d,ph))};
const tpl=fs.readFileSync(path.join(__dirname,'..','..','moduly','wzory','basic.docx')); // wzór z modułu Wzory
const data={site:'One Eastside Tower',date:'01/11/2026',engineer:'G. Sarna',title:'AOV Operation Test (TA)',condition:'Good',building:'Tower A',level:'Roof',details:'• Visual inspection carried out.',quote:'No'};
const text=x=>(x.match(/<w:t[^>]*>[^<]*<\/w:t>/g)||[]).map(t=>t.replace(/<[^>]+>/g,'')).join('');
test('built-in OEST-basic template has all English fields',()=>{
  const t=text(new PizZip(tpl).file('word/document.xml').asText());
  for(const f of ['{site}','{date}','{engineer}','{title}','{condition}','{building}','{details}','{quote}','{%photos}'])assert.ok(t.includes(f),f);
});
test('fills fields, sets author, removes empty photo page',()=>{
  const out=ctx.fillDocx(PizZip,Docxtemplater,tpl,data,[]),xml=out.file('word/document.xml').asText(),t=text(xml);
  for(const v of Object.values(data))assert.ok(t.includes(v),v);
  assert.ok(!/\{|§ZDJ/.test(t));
  assert.equal((xml.match(/<w:sectPr\b/g)||[]).length,1,'one section = no blank photo page');
  assert.match(out.file('docProps/core.xml').asText(),/<dc:creator>G\. Sarna<\/dc:creator>/);
});
test('with photos keeps the photo section and embeds images',()=>{
  const jpg=Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==','base64');
  const out=ctx.fillDocx(PizZip,Docxtemplater,tpl,data,[{bytes:jpg,width:4,height:3}]),xml=out.file('word/document.xml').asText();
  assert.ok((xml.match(/<w:sectPr\b/g)||[]).length>=2);assert.ok(out.file('word/media/zdjecie1.jpeg'));assert.ok(!xml.includes('§ZDJ'));
});
test('checkpoints: one row per checkpoint becomes a borderless 2-column table (box + label | sentence)',()=>{
  const det='DB-TB-EXT-1\n\n☑ Enclosure undamaged\tEnclosure intact & secure.\n☒ Clean and dry\tDust found.\n\nVisual inspection completed.';
  const out=ctx.fillDocx(PizZip,Docxtemplater,tpl,{...data,details:det},[]),xml=out.file('word/document.xml').asText();
  assert.ok(!/<w:t[^>]*>[^<]*\t/.test(xml),'no raw tab left in text');
  assert.equal((xml.match(/<w:gridCol w:w="3300"\/><w:gridCol w:w="6000"\/>/g)||[]).length,1);
  assert.match(xml,/Enclosure undamaged[\s\S]*Enclosure intact &amp; secure\.[\s\S]*Clean and dry[\s\S]*Dust found\.[\s\S]*<\/w:tbl><w:p>[\s\S]*Visual inspection completed\./);
});
