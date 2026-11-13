// Reactive „Zrobione → Vantify” (Grzegorz 13/11/2026): ten sam moduł Reactive, rubryki formularza Vantify „Add a new job”.
// Sprawdza: przycisk obok „＋ Nowe zadanie”, szkic z rubrykami Vantify (domyślnie Smart, P5, Statutory No, bez Document Required),
// Summary = nazwa zadania i Description = raport EN (jedno źródło z worksheetem, bez osobnych pól), listy Location/Job Group/Priority
// tylko z zapisu odczytu Vantify (bez listy = pole tekstowe), zapis po przeładowaniu, podgląd wszystkich rubryk z brakami
// (zdjęcie przed/po), PL/EN bez surowych kodów, uczciwa informacja, że do Vantify nic nie jest wysyłane.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require(process.env.OEST_PLAYWRIGHT_PATH||'playwright'),{docxText,docxImages,pdfText,pdfImages,includesFlat}=require('./raport-tresc.cjs'),root=path.resolve(__dirname,'../www'),shots=path.resolve(__dirname,'../../docs/screenshots/reactive');
const server=http.createServer((req,res)=>{const p=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!p.startsWith(root+path.sep)&&p!==root){res.writeHead(403).end();return;}const file=p===root?path.join(root,'index.html'):p;fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(b);});});
let STEP='start';const RAW_CODE=/\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/;
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;try{
browser=await chromium.launch({headless:true,...(process.env.OEST_BROWSER_PATH?{executablePath:process.env.OEST_BROWSER_PATH}:{})});
const context=await browser.newContext({viewport:{width:412,height:915}});
await context.addInitScript(()=>{if(!localStorage.getItem('oest.account'))localStorage.setItem('oest.account',JSON.stringify({id:'reactive-test',email:'test@example.com',first:'Greg',last:'Sarna'}));});
const page=await context.newPage(),errors=[];page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));
const url='http://127.0.0.1:'+server.address().port;fs.mkdirSync(shots,{recursive:true});const snap=async name=>page.screenshot({path:path.join(shots,name+'.png')});
const state=()=>page.evaluate(async()=>OESTReactiveUI.repository.get());
const draft=async()=>Object.values((await state()).reactiveDrafts||{})[0];
const saved=()=>page.waitForFunction(()=>document.querySelector('#rxMessage')?.textContent.includes('Szkic zapisany'));
const row=async id=>{await page.locator('[data-rx=row][data-id="'+id+'"]').click();};

STEP='krok 1';// 1. Bez list z Vantify: przycisk, szkic z rubrykami domyślnymi, Location/Job Group/Priority jako pola tekstowe.
await page.goto(url+'/#reactive');await page.locator('[data-rx=new-vantify]').waitFor();
assert.match(await page.locator('[data-rx=new-vantify]').textContent(),/Zrobione → Vantify/);assert.ok(await page.locator('[data-rx=new]').isVisible(),'zwykłe „Nowe zadanie” zostaje');
await page.locator('[data-rx=new-vantify]').click();await page.locator('[data-rx-vfield=jobGroup]').waitFor();
{const d=await draft();assert.deepEqual({...d.vantify},{jobNo:'',location:'',jobGroup:'',priority:'P5 - Within 5 Days',asset:'',po:'',statutory:false,documentRequired:'',serviceProvider:'HR Facilities Limited t/a Smart Managed Solutions',siteContactSelf:true,relationship:'Service Provider',siteContactAvailable:true});}
assert.equal(await page.locator('[data-rx-vfield=summary],[data-rx-vfield=description]').count(),0,'Summary/Description bez osobnych pól (jedno źródło z worksheetem)');
await page.locator('[data-rx-field=title]').fill('Repair light fixture on book shelf');await saved();
await row('where');await page.locator('[data-rx=building][data-value="Tower A"]').click();await page.locator('[data-rx-field=level]').selectOption('49');
await page.locator('[data-rx-field=note]').fill('Light fitting on the book shelf not working.');await saved();
await page.locator('[data-rx-vfield=jobGroup]').fill('Lighting');await page.locator('[data-rx-vfield=po]').fill('PO-1');await page.locator('[data-rx-vfield=jobGroup]').press('Tab');await page.locator('[data-rx-field=note]').press('End');await page.locator('[data-rx-field=note]').type(' ');await saved();
{const d=await draft();assert.equal(d.vantify.jobGroup,'Lighting');assert.equal(d.vantify.po,'PO-1');assert.equal(d.vantify.priority,'P5 - Within 5 Days');}

STEP='krok 2';// 2. Podgląd: wszystkie rubryki Vantify w kolejności formularza, braki zdjęć, uczciwa informacja o braku wysyłki.
await page.locator('[data-rx=vantify-preview]').click();await page.locator('[data-rx=preview-back]').waitFor();
{const t=await page.locator('.rx-body').innerText();let at=-1;for(const k of ['I am the Site Contact','Relationship to the property','Site contact available','Summary','Description','Location','Is Statutory Type?','Document Required','Service Provider','Operative','Job Group','Asset','Priority','File','PO Number']){const i=t.indexOf(k,at+1);assert.ok(i>at,'rubryka w kolejności Vantify: '+k);at=i;}
 assert.match(t,/Repair light fixture on book shelf/,'Summary = nazwa zadania');assert.match(t,/Light fitting on the book shelf not working/,'Description = dopisek przed');assert.match(t,/Work completed on \d\d\/\d\d\/\d{4}/,'Update z datą');assert.match(t,/Greg Sarna/,'Operative = ja');assert.match(t,/HR Facilities Limited t\/a Smart Managed Solutions/);
 assert.match(t,/Uzupełnij: dopisek po \(Update\), zdjęcie przed, zdjęcie po/);assert.match(t,/nic nie trafia do Vantify/);assert.doesNotMatch(t,RAW_CODE);}
await snap('09-vantify-preview');
await page.locator('[data-rx=preview-back]').click();await page.locator('[data-rx-vfield=jobGroup]').waitFor();

STEP='krok 3';// 3. Dopisek po + zdjęcia przed/po → brak braków; po przeładowaniu wszystko zostaje.
await page.locator('[data-rx-field=afterNote]').fill('Loose connection re-terminated, fitting tested.');await saved();
const encoded=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=320;c.height=240;const x=c.getContext('2d');x.fillStyle='#ddd';x.fillRect(0,0,320,240);return c.toDataURL('image/png').split(',')[1];}),photo=n=>({name:n+'.png',mimeType:'image/png',buffer:Buffer.from(encoded,'base64')});
await page.locator('[data-rx-photos=before]').setInputFiles(photo('before'));await page.waitForFunction(()=>document.querySelector('#rx-before img'));await saved();
await page.locator('[data-rx-photos=after]').setInputFiles(photo('after'));await page.waitForFunction(()=>document.querySelector('#rx-after img'));await saved();
await page.reload();await page.locator('[data-rx-vfield=jobGroup]').waitFor();assert.equal(await page.locator('[data-rx-vfield=jobGroup]').inputValue(),'Lighting','po przeładowaniu');assert.equal(await page.locator('[data-rx-field=afterNote]').inputValue(),'Loose connection re-terminated, fitting tested.');
await page.locator('[data-rx=vantify-preview]').click();await page.locator('[data-rx=preview-back]').waitFor();{const t=await page.locator('.rx-body').innerText();assert.doesNotMatch(t,/Uzupełnij/);assert.match(t,/Loose connection re-terminated, fitting tested\.\nWork completed on/);}
await page.locator('[data-rx=preview-back]').click();

STEP='krok 4';// 4. Listy z Vantify (zapis odczytu): Location/Job Group/Priority do wyboru, wybór zapisany.
await page.evaluate(()=>localStorage.setItem('oest.vantify.lookup',JSON.stringify({at:'2026-11-13T15:00:00Z',locations:[{name:'49th Floor and Ground Floor Amenity of Blocks A and B'}],jobGroups:['Fabric','Lighting'],priorities:['P4 - Within 3 Days','P5 - Within 5 Days']})));
await page.reload();await page.locator('[data-rx=row][data-id=v-location]').waitFor();
await row('v-location');await page.locator('[data-rx=vpick-location]').first().click();await saved();
await row('v-priority');await page.locator('[data-rx="vpick-priority"][data-value="P4 - Within 3 Days"]').click();await saved();
{const d=await draft();assert.equal(d.vantify.location,'49th Floor and Ground Floor Amenity of Blocks A and B');assert.equal(d.vantify.priority,'P4 - Within 3 Days');assert.equal(d.vantify.jobGroup,'Lighting');}
await page.locator('[data-rx-vfield=jobNo]').fill('3051375');await saved();assert.equal((await draft()).vantify.jobNo,'3051375');
await snap('10-vantify-form');
await page.locator('[data-rx=park]').click();await page.locator('[data-rx=new-vantify]').waitFor();
{const s=await state();assert.equal(s.jobs.length,1,'Odłóż zapisuje zadanie');assert.equal(s.jobs[0].reactive.vantify.jobNo,'3051375');assert.match(await page.locator('.rx-list').innerText(),/#3051375/,'numer na kafelku');}

STEP='krok 5';// 5. EN: przycisk i podgląd po angielsku, bez surowych kodów.
await page.evaluate(()=>OESTSettings.update(s=>{s.appearance.language='en';}));await page.goto(url+'/#reactive');await page.locator('[data-rx=new-vantify]').waitFor();
assert.match(await page.locator('[data-rx=new-vantify]').textContent(),/Done → Vantify/);
await page.locator('[data-rx=job]').click();await page.locator('[data-rx=vantify-preview]').click();await page.locator('[data-rx=preview-back]').waitFor();{const t=await page.locator('.rx-body').innerText();assert.match(t,/nothing is sent to Vantify/);assert.doesNotMatch(t,RAW_CODE);}
await page.evaluate(()=>OESTSettings.update(s=>{s.appearance.language='pl';}));
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
assert.deepEqual(errors,[]);
console.log('REACTIVE VANTIFY UI PASS: button next to New job, draft with Vantify defaults (Smart, P5, Statutory No, no Document Required, site contact me/Service Provider/available), Summary/Description from job name/EN report (no separate fields), text fields without Vantify lists, picks from Vantify lists, persistence after reload, Vantify job no. saved + shown on the card, preview of all Vantify fields in form order with missing photos, PL/EN without raw codes, honest "nothing sent to Vantify"; 412x915. Not covered: sending to Vantify (not built), camera, Pixel.');
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error('Reactive Vantify – błąd w: '+STEP);console.error(e);process.exitCode=1;});
