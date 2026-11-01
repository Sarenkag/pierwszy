// Raport na wzorze firmy OEST-basic: pola po angielsku, brak pustej strony bez zdjęć, autor z profilu.
const test=require('node:test'),assert=require('node:assert'),fs=require('fs'),path=require('path'),vm=require('vm');
const PizZip=require('pizzip'),Docxtemplater=require('docxtemplater');
const html=fs.readFileSync(path.join(__dirname,'..','..','inspekcje','index.html'),'utf8');
const src=html.slice(html.indexOf('function fillDocx('),html.indexOf('// Tekst i logo'));
const ctx={};vm.runInNewContext(src+';this.fillDocx=fillDocx;',ctx);
const tplJs=fs.readFileSync(path.join(__dirname,'..','..','inspekcje','tpl-oest-basic.js'),'utf8');
const w={};vm.runInNewContext(tplJs,{window:w});const tpl=Buffer.from(w.OEST_BASIC_TPL,'base64');
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
test('checkpoint grid: tabs become Word tabs with a half-width column stop',()=>{
  const det='DB-TB-EXT-1\n\n☑ Enclosure\t☑ Door / cover\t☑ Integrity\n☒ Clean\n\nFaults:\n• Dust found.';
  const out=ctx.fillDocx(PizZip,Docxtemplater,tpl,{...data,details:det},[]),xml=out.file('word/document.xml').asText();
  assert.ok(!/<w:t[^>]*>[^<]*\t/.test(xml),'no raw tab left in text');
  assert.equal((xml.match(/<w:tab\/>/g)||[]).length,2);
  assert.match(xml,/<w:tabs><w:tab w:val="left" w:pos="4600"\/><\/w:tabs>/);
});
