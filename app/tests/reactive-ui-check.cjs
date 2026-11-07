// Reactive – test przeglądarkowy OBECNEGO procesu zadania (Reactive po PR #48, 02/11/2026 i #53/#55/#69).
// Wymagania sprawdzane tutaj (źródło w nawiasie):
//  - „＋ Nowe zadanie” otwiera od razu formularz zadania, nazwę wpisuje się samemu, drzewko „Co dokładnie” jest OPCJONALNE (reactive-core.js 02/11/2026),
//  - szkic zapisuje się na telefonie i przetrwa przeładowanie (pola, drzewko, zdjęcia),
//  - zdjęcia przed/po zapisane raz w module zdjęć, liczone na klocku (Grzegorz 04/11/2026),
//  - statusy Reactive z reactive-core.js: Open / Awaiting parts / Subcontractor / Completed, tymczasowa naprawa (PROD-013),
//  - historia zmian statusu w zadaniu i lista „Zakończone” (historia) – zakończone zadanie nadal ma zdjęcia (PROD-025: nic nie znika),
//  - raport: podsumowanie przed wysłaniem, Word + PDF z tymi samymi danymi (PROD-023), Reactive tylko na firmowy e-mail (PROD-025),
//    „Wyślij” niczego nie kasuje (PROD-025), raport trafia do kolejki wysyłki z uczciwym komunikatem (PROD-026: bez udawania wysłania),
//  - wpis Reactive z Handover widoczny w Reactive, PL/EN bez surowych kodów błędów (UX-029), brak poziomego przewijania, brak błędów JS.
// NIE sprawdza (zostaje do testu na Pixelu 8 Pro): prawdziwy aparat, notatki głosowe i transkrypcja, prawdziwy Gmail/udostępnianie Androida,
// faktyczne doręczenie przez Gmail, zapasowa droga ReportShare (gdy Gmail niedostępny), edycja zdjęcia, wygląd dokumentów (sprawdzamy treść, nie układ).
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require(process.env.OEST_PLAYWRIGHT_PATH||'playwright'),{docxText,docxImages,pdfText,pdfImages,includesFlat}=require('./raport-tresc.cjs'),root=path.resolve(__dirname,'../www'),shots=path.resolve(__dirname,'../../docs/screenshots/reactive');
const server=http.createServer((req,res)=>{const p=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!p.startsWith(root+path.sep)&&p!==root){res.writeHead(403).end();return;}const file=p===root?path.join(root,'index.html'):p;fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(b);});});
let STEP='start';const RAW_CODE=/\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/;
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;try{
browser=await chromium.launch({headless:true,...(process.env.OEST_BROWSER_PATH?{executablePath:process.env.OEST_BROWSER_PATH}:{})});
const context=await browser.newContext({viewport:{width:412,height:915}});
await context.addInitScript(()=>{if(!localStorage.getItem('oest.account'))localStorage.setItem('oest.account',JSON.stringify({id:'reactive-test',email:'test@example.com',first:'Greg',last:'Sarna'}));});
const page=await context.newPage(),errors=[];page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));
const url='http://127.0.0.1:'+server.address().port;fs.mkdirSync(shots,{recursive:true});const snap=async name=>page.screenshot({path:path.join(shots,name+'.png')});
await page.addInitScript(()=>{/* okienka apki (moduly/przycisk ask): test odpowiada na pytanie jak użytkownik */const go=()=>{const m=window.__askMode;if(!m)return;const b=document.querySelector('.oest-ask:not([data-wy-out]) [data-a='+(/no$/.test(m)?'no':'ok')+']');if(!b)return;if(/^once/.test(m))window.__askMode='';b.click();};new MutationObserver(go).observe(document,{childList:true,subtree:true});});
const state=()=>page.evaluate(async()=>OESTReactiveUI.repository.get());
const msg=()=>page.locator('#rxMessage').textContent();
const saved=()=>page.waitForFunction(()=>document.querySelector('#rxMessage')?.textContent.includes('Szkic zapisany'));
const row=async id=>{await page.locator('[data-rx=row][data-id='+id+']').click();};
await page.goto(url+'/#reactive');await page.locator('[data-rx=new]').waitFor();

STEP='krok 2';// 2. Nowe zadanie BEZ drzewka: nazwa, gdzie, kto (domyślnie pierwszy dział), zdjęcie przed.
await page.locator('[data-rx=new]').click();await page.locator('[data-rx-field=title]').waitFor();
const draftHash=await page.evaluate(()=>location.hash);
await page.locator('[data-rx-field=title]').fill('Door handle detached');await saved();
await row('where');await page.locator('[data-rx=building][data-value="Tower B"]').click();await page.locator('[data-rx-field=level]').selectOption('5');await page.locator('[data-rx-field=room]').fill('Kitchen');
await page.locator('[data-rx-field=note]').fill('Handle detached from the door.');await saved();
const encoded=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=640;c.height=480;const x=c.getContext('2d');x.fillStyle='#eee';x.fillRect(0,0,640,480);x.fillStyle='#777';x.fillRect(90,30,450,430);x.fillStyle='#222';x.fillRect(370,240,130,25);x.fillStyle='white';x.font='25px sans-serif';x.fillText('Door handle',130,90);return c.toDataURL('image/png').split(',')[1];}),photoFile={name:'door.png',mimeType:'image/png',buffer:Buffer.from(encoded,'base64')};
await page.locator('[data-rx-photos=before]').setInputFiles(photoFile);await page.waitForFunction(()=>document.querySelector('#rx-before img')&&document.querySelector('#rxMessage')?.textContent.includes('Szkic zapisany'));
{const d=Object.values((await state()).reactiveDrafts)[0];assert.equal(d.title,'Door handle detached');assert.equal(d.building,'Tower B');assert.equal(d.level,'5');assert.equal(d.problemId,'','drzewko nie jest wymagane');assert.equal(d.beforeMediaIds.length,1);assert.equal(d.requestedBy,'General request','domyślnie pierwszy dział z ⚙');}
await snap('05-details');

STEP='krok 3';// 3. Drzewko „Co dokładnie” (opcjonalne): Drzwi › Zwykłe › Klamka › problem – opis do raportu podstawia się sam.
await row('tree');await page.locator('[data-rx=pick-node][data-id=doors]').click();await page.locator('[data-rx=pick-node][data-id=ordinary]').click();await page.locator('[data-rx=pick-node][data-id=handle]').click();await page.locator('[data-rx=pick-leaf][data-id=handle-1]').click();await saved();
{const d=Object.values((await state()).reactiveDrafts)[0];assert.equal(d.problemId,'handle-1');assert.ok(d.problem.length>5,'opis z drzewka');assert.equal(d.title,'Door handle detached','wybór z drzewka nie nadpisuje wpisanej nazwy');}

STEP='krok 4';// 4. Trwałość szkicu: przeładowanie strony → te same pola, drzewko i zdjęcie.
await page.reload();await page.locator('[data-rx-field=title]').waitFor();assert.equal(await page.evaluate(()=>location.hash),draftHash);
assert.equal(await page.locator('[data-rx-field=title]').inputValue(),'Door handle detached');assert.equal(await page.locator('[data-rx-field=note]').inputValue(),'Handle detached from the door.');
await page.waitForFunction(()=>document.querySelectorAll('#rx-before img').length===1);
assert.match(await page.locator('[data-rx=row][data-id=where]').textContent(),/TB|Tower B/);assert.match(await page.locator('[data-rx=row][data-id=where]').textContent(),/Kitchen/);
assert.match(await page.locator('[data-rx=row][data-id=tree]').textContent(),/›/,'drzewko po przeładowaniu');

STEP='krok 5';// 5. Status „Czeka na części” + jakie części, potem Odłóż → zadanie zapisane, klocek na liście z licznikiem zdjęć.
await row('status');await page.locator('[data-rx=status][data-status=parts]').click();await page.locator('[data-rx-field=partsNote]').fill('New lever handle');await saved();
await page.locator('[data-rx=park]').click();await page.locator('[data-rx=new]').waitFor();
let s=await state();assert.equal(s.jobs.length,1);assert.equal(Object.keys(s.reactiveDrafts||{}).length,0,'szkic zamieniony w zadanie');
let job=s.jobs[0];assert.equal(job.reactive.status,'parts');assert.equal(job.reactive.partsNote,'New lever handle');assert.equal(job.reactive.beforeMediaIds.length,1);assert.ok(Array.isArray(job.history)&&job.history.length>=1,'historia zadania');
await page.locator('[data-rx=job]').waitFor();assert.match(await page.locator('[data-rx=job]').textContent(),/Door handle detached/);assert.match(await page.locator('[data-rx=job]').textContent(),/📷 1/);
await snap('00-home');

STEP='krok 6';// 6. Zdjęcie po + tymczasowa naprawa: status Open · tymczasowa, raport składa się sam.
await page.locator('[data-rx=job]').click();await page.locator('[data-rx-field=title]').waitFor();
await page.locator('[data-rx-photos=after]').setInputFiles(photoFile);await page.waitForFunction(()=>document.querySelector('#rx-after img')&&document.querySelector('#rxMessage')?.textContent.includes('Szkic zapisany'));
await row('finish');await page.locator('[data-rx=action][data-id=temporary]').click();await saved();
assert.match(await page.locator('[data-rx-field=reportText]').inputValue(),/Made safe temporarily/);
await snap('06-complete');

STEP='krok 7';// 7. Wyślij do siebie: podsumowanie → Zbuduj i wyślij. Reactive tylko na firmowy e-mail, nawet gdy jest prywatny (PROD-025).
await page.evaluate(()=>{OESTSettings.update(s=>{s.profile.first='Greg';s.profile.last='Sarna';s.profile.companyEmail='work@example.com';s.profile.privateEmail='home@example.com';});window.sharedReports=[];/* jak apka na Androidzie; ReportShare tylko jako zapasowa droga bez Gmaila */window.Capacitor={isNativePlatform:()=>true,Plugins:{},registerPlugin:name=>({share:async payload=>{if(name!=='ReportShare')throw Error('Wrong plugin');sharedReports.push(payload);return {status:'shared'};}})};});
await page.locator('[data-rx=send]').click();await page.locator('[data-rx=send-now]').waitFor();
{const sum=await page.locator('.rx-body').innerText();assert.match(sum,/przed 1 · po 1/,'podsumowanie: liczba zdjęć');assert.match(sum,/Door handle detached/);assert.match(sum,/\.docx \+ \.pdf/);}
await page.locator('[data-rx=send-now]').click();await page.waitForFunction(()=>/W kolejce do wysłania|Przekazano do poczty/.test(document.querySelector('#rxMessage')?.textContent||''),null,{timeout:30000}).catch(async e=>{throw Error('Brak potwierdzenia przekazania. Komunikat: '+await msg().catch(()=>'?'));});
/* Z kontem Google (jak na Pixelu) raport idzie do kolejki moduly/wysylka (Gmail w tle); komunikat nie udaje wysłania (PROD-026). */
assert.match(await msg(),/W kolejce do wysłania — pasek na dole pokaże wysyłkę\. Zadanie zostaje otwarte\./,'Reactive z kontem Google: kolejka wysyłki');
const result=await page.evaluate(async()=>{const db=await new Promise((res,rej)=>{const r=indexedDB.open('inspekcje',1);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});const all=await new Promise((res,rej)=>{const q=db.transaction('queue','readonly').objectStore('queue').getAll();q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);});const b64=u=>{let s='';const a=new Uint8Array(u);for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode.apply(null,a.subarray(i,i+32768));return btoa(s);};
  return {queue:all.map(q=>({type:q.type,name:q.name,subject:q.subject,to:q.to,toList:q.toList,body:q.body,docx:q.docx?b64(q.docx):'',pdf:q.pdf?b64(q.pdf):''})),shared:sharedReports.length,me:OESTSender.recipients({sm:true}).list,state:await OESTReactiveUI.repository.get()};});
const rx=result.queue.filter(q=>q.type==='reactive');assert.equal(rx.length,1,'jeden raport w kolejce na jedno dotknięcie');assert.equal(result.shared,0,'bez drugiej drogi wysyłki');
assert.ok(!rx[0].to&&!(rx[0].toList||[]).length,'Reactive bez dodatkowych adresatów: kolejka wysyła na mój firmowy adres');assert.deepEqual(result.me,['work@example.com'],'Reactive wyłącznie na firmowy e-mail, prywatny pominięty');
job=result.state.jobs[0];assert.equal(result.state.jobs.length,1,'Wyślij nie tworzy ani nie kasuje zadań');assert.equal(job.reactive.temporary,true);assert.equal(job.reactive.beforeMediaIds.length,1,'Wyślij nie kasuje zdjęć');assert.equal(job.reactive.afterMediaIds.length,1,'Wyślij nie kasuje zdjęć');assert.equal(job.reactive.reportMediaIds.length,2,'Word i PDF zapisane w zadaniu');assert.equal(job.reportDeliveries.at(-1).status,'shared');
// treść plików: te same dane w Word i PDF (PROD-023)
assert.match(rx[0].name,/^REACTIVE Door handle detached \d{8}$/,'nazwa pliku: '+rx[0].name);const files={'.docx':{name:rx[0].name+'.docx',buf:Buffer.from(rx[0].docx,'base64')},'.pdf':{name:rx[0].name+'.pdf',buf:Buffer.from(rx[0].pdf,'base64')}};
const out=process.env.OEST_REACTIVE_REPORTS;if(out){fs.mkdirSync(out,{recursive:true});for(const f of Object.values(files))fs.writeFileSync(path.join(out,f.name),f.buf);}assert.ok(files['.docx'].buf.length>1000&&files['.pdf'].buf.length>1000,'para .docx + .pdf w kolejce');
const wordTxt=docxText(files['.docx'].buf),pdfTxt=pdfText(files['.pdf'].buf);
for(const [label,needle]of [['tytuł','Door handle detached'],['budynek','Tower B'],['opis z drzewka',job.reactive.problem.replace(/[.\s]+$/,'')],['akcja','Made safe temporarily'],['pomieszczenie','Kitchen'],['notatka','Handle detached from the door.'],['części','New lever handle'],['inżynier','Greg Sarna']]){
  assert.ok(includesFlat(wordTxt,needle),'Word nie zawiera ('+label+'): '+needle);assert.ok(includesFlat(pdfTxt,needle),'PDF nie zawiera ('+label+'): '+needle);}
/* Stan „Open — Temporary repair”: w PDF linia ze znakiem „—” jest rysowana jako obrazek (reactive-report.js line()), więc tekstowo sprawdzamy ją tylko w Word. */assert.ok(includesFlat(wordTxt,'Overall Condition: Open — Temporary repair'),'Word: stan zadania');assert.ok(includesFlat(wordTxt,'Before — Photo 1')&&includesFlat(wordTxt,'After — Photo 2'),'Word: podpisy zdjęć przed/po');assert.ok(docxImages(files['.docx'].buf)>=2,'Word: zdjęcia w pliku');assert.ok(pdfImages(files['.pdf'].buf)>=2,'PDF: co najmniej 2 zdjęcia');

STEP='krok 8';// 8. Potrzebna firma (podwykonawca) → status Subcontractor required, zapis przez Odłóż.
/* moduly/przycisk: „✓ Gotowe” trwa chwilę, potem przycisk wraca – dopiero wtedy ekran przyjmuje kolejne dotknięcie */await page.waitForFunction(()=>/Zbuduj i wyślij/.test(document.querySelector('[data-rx=send-now]')?.textContent||''));await page.locator('[data-rx=back]').click();await page.locator('[data-rx=new]').waitFor().catch(async()=>{throw Error('Wstecz po wysłaniu: '+JSON.stringify({hash:await page.evaluate(()=>location.hash),msg:await msg()}));});await page.locator('[data-rx=job]').click();await page.locator('[data-rx-field=title]').waitFor();
await row('finish');await page.locator('[data-rx=action][data-id=contractor]').click();await saved();await page.locator('[data-rx=park]').click();await page.locator('[data-rx=new]').waitFor();
job=(await state()).jobs[0];assert.equal(job.reactive.status,'contractor');assert.equal(job.reactive.temporary,false);

STEP='krok 9';// 9. Naprawione → ✓ Zakończ zadanie: zadanie zakończone, w historii, zdjęcia i raporty zostają.
await page.locator('[data-rx=job]').click();await page.locator('[data-rx-field=title]').waitFor();await row('finish');await page.locator('[data-rx=action][data-id=repaired]').click();await page.locator('[data-rx=close]').waitFor();await page.locator('[data-rx=close]').click();await page.locator('[data-rx=new]').waitFor();
s=await state();job=s.jobs[0];assert.equal(job.status,'fixed');assert.equal(job.reactive.status,'completed');assert.equal(job.reactive.actionId,'repaired');
assert.equal(job.reactive.beforeMediaIds.length,1);assert.equal(job.reactive.afterMediaIds.length,1);assert.equal(job.reactive.reportMediaIds.length,2,'raporty zostają po zakończeniu');
{const st=job.history.map(h=>h.reactiveStatus||h.status);assert.ok(job.history.length>=3,'historia statusów: '+JSON.stringify(st));assert.equal(job.history.at(-1).status,'fixed','ostatni wpis historii = zakończone');}
assert.equal(await page.locator('[data-rx=job]').count(),0,'Aktywne: zakończone zadanie zniknęło z aktywnych');
await page.locator('[data-rx=filter][data-id=done]').click();await page.locator('[data-rx=job]').waitFor();assert.match(await page.locator('[data-rx=job]').textContent(),/Door handle detached/);
await page.goto(url+'/#reactive/history');await page.locator('[data-rx=job]').waitFor();await snap('07-history');
await page.locator('[data-rx=job]').click();await page.waitForFunction(()=>document.querySelectorAll('#rx-before img').length===1&&document.querySelectorAll('#rx-after img').length===1);assert.match(await page.locator('.rx-body').innerText(),/Zakończone zadanie — historia/);assert.equal(await page.locator('#rx-before .del').count(),0,'w historii nie da się usunąć zdjęcia');

STEP='krok 10';// 10. Wpis Reactive dodany w Handover widoczny w Reactive.
await page.evaluate(async()=>{const d=new Date(),start=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'),end=new Date(Date.parse(start)+3*86400000).toISOString().slice(0,10),r=OESTHandover.repository,sh=await r.startShift(start,end);await r.addEntry(sh.id,{kind:'reactive',text:'Job entered through Handover',language:'en'});});
await page.goto(url+'/#reactive');await page.locator('[data-rx=filter][data-id=active]').click();await page.waitForFunction(()=>document.querySelector('.rx-body')?.textContent.includes('Job entered through Handover')).catch(async()=>{throw Error('Brak wpisu z Handover w Reactive: '+JSON.stringify({list:(await page.locator('.rx-body').innerText()).slice(0,300),jobs:(await state()).jobs.map(j=>j.text)}));});

STEP='krok 11';// 11. Usuń szkic: pytanie → szkic znika, zadania bez zmian.
await page.locator('[data-rx=new]').click();await page.locator('[data-rx-field=title]').fill('Temporary draft');await saved();
await page.evaluate(()=>{window.__askMode='once-ok'});await page.locator('[data-rx=drop-draft]').click();await page.locator('[data-rx=new]').waitFor();
s=await state();assert.equal(Object.keys(s.reactiveDrafts||{}).length,0,'szkic usunięty');assert.equal(s.jobs.filter(j=>j.reactive).length,1,'usunięcie szkicu nie rusza zadań');

STEP='krok 12';// 12. Braki: bez nazwy i bez kto zlecił → komunikat po polsku, bez surowego kodu; po angielsku też.
await page.locator('[data-rx=new]').click();await page.locator('[data-rx-field=title]').waitFor();await row('who');await page.locator('[data-rx=who][data-value=self]').click();await saved();
await page.evaluate(()=>{const d=document.querySelector('[data-rx-field=title]');d.value='';d.dispatchEvent(new Event('input'));});await saved();
await page.locator('[data-rx=send]').click();{const m=await msg();assert.match(m,/Uzupełnij: nazwa zadania/);assert.doesNotMatch(m,RAW_CODE);}
await page.evaluate(()=>OESTSettings.update(s=>{s.appearance.language='en';}));await page.goto(url+'/#reactive');await page.locator('[data-rx=new]').waitFor();assert.match(await page.locator('[data-rx=new]').textContent(),/New job/);
await page.locator('[data-rx=draft]').click();await page.locator('[data-rx-field=title]').waitFor();await page.locator('[data-rx=send]').click();{const m=await msg();assert.match(m,/Fill in: job name/);assert.doesNotMatch(m,RAW_CODE);}
await page.evaluate(()=>OESTSettings.update(s=>{s.appearance.language='pl';}));

STEP='krok 13';// 13. Drzewko jako osobny ekran (zakres prac oświetlenia) i brak poziomego przewijania.
await page.goto(url+'/#reactive/tree/lighting');await page.locator('[data-id=lighting-scope-0]').waitFor();await snap('08-scope');
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
assert.deepEqual(errors,[]);
console.log('REACTIVE UI PASS: new job without tree, optional tree, draft persistence after reload (fields/tree/photo), parts status + park, before/after photos, temporary/contractor/repaired + close, status history, completed list + history view with photos, summary, Word+PDF content (same data, 2 photos), company email only, send keeps photos/job, Gmail send queue entry with honest message (no real email), Handover entry, drop draft, PL/EN missing-field messages without raw codes; 412x915. Not covered: camera, voice notes, actual Gmail delivery, Android share fallback.');
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error('Reactive – błąd w: '+STEP);console.error(e);process.exitCode=1;});
