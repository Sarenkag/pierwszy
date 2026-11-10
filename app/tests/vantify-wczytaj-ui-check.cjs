// Wczytanie eksportu Vantify w telefonie (Grzegorz 10/11/2026): Ustawienia → Vantify → Wczytaj eksport → podgląd zmian → Zapisz.
// Scenariusz Grzegorza: eksport z Vantify z nowszą datą, część zleceń zamknięta, nowe zlecenia; po zapisie lista PPM i strona
// inspekcji biorą terminy z wczytanego pliku, także po ponownym uruchomieniu. Starszy plik niczego nie zmienia.
const {chromium}=require(process.env.OEST_PLAYWRIGHT_PATH || 'playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=path.resolve(__dirname,'../www');
const server=http.createServer((req,res)=>{const name=decodeURIComponent(req.url.split('?')[0]);let p=path.resolve(base,'.'+name);if(!p.startsWith(base+path.sep)&&p!==base){res.writeHead(403);return res.end();}if(name.endsWith('/'))p=path.join(p,'index.html');fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);return res.end();}res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript; charset=utf-8':p.endsWith('.css')?'text/css':p.endsWith('.html')?'text/html; charset=utf-8':'application/octet-stream');res.end(b);});});
const HEAD=['id','jobType','summary','reporterName','createdAt','completeBy','frequency','task'];
function csv(rows){return '﻿'+HEAD.join(',')+'\r\n'+rows.map(r=>HEAD.map(h=>{const v=String(r[h]??'');return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}).join(',')).join('\r\n')+'\r\n';}
const job=(id,task,due,created='2026-11-10 08:00:00',f='1W')=>({id,jobType:'Planned',summary:'Opis, "x"',reporterName:'Jan Kowalski',createdAt:created,completeBy:due+' 23:59:59',frequency:f,task});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{browser=await chromium.launch({headless:true, ...(process.env.OEST_BROWSER_PATH ? {executablePath:process.env.OEST_BROWSER_PATH} : {})});const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
await context.addInitScript(()=>{if(!localStorage.getItem('oest.account')){localStorage.setItem('oest.account',JSON.stringify({provider:'local',id:'test',email:'demo@example.com',first:'Greg',last:'Sarna'}));localStorage.setItem('oest.profile',JSON.stringify({first:'Greg',last:'Sarna',email1:'demo@example.com'}));}});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
const url='http://127.0.0.1:'+server.address().port,out=process.env.OEST_SCREENSHOTS;
await page.goto(url+'/#settings');await page.locator('.settings-card[data-route=vantify]').waitFor();
assert.match(await page.locator('.settings-card[data-route=vantify]').textContent(),/Vantify[\s\S]*Eksport z 09\/11\/2026/,'klocek Vantify z datą wbudowanego eksportu');
await page.locator('.settings-card[data-route=vantify]').click();await page.locator('#vtNow').waitFor();
assert.match(await page.locator('#vtNow').textContent(),/Eksport z 09\/11\/2026 · \d+ zleceń · wbudowany w apkę/);
// eksport z 10/11: AOV TA (EFA-INS-003) bez 3000623 (zamknięte), z nowym 3060001 na 25/12; reszta jak w planie wbudowanym
const rows=await page.evaluate(()=>{const V=window.OEST_VANTIFY,P=window.OEST_PPM,r=[];for(const id of Object.keys(V.jobs))for(const j of V.jobs[id])r.push({id:j.no,task:P.byId(id).name,due:j.due,f:j.f});return r;});
const now=rows.filter(r=>r.id!=='3000623').map(r=>job(r.id,r.task,r.due,'2026-11-10 08:00:00',r.f));now.push(job('3060001','AOV Operation Testing (Tower A)','2026-12-25'));now.push(job('9999','(Sub) Monthly Spa Sampling','2026-11-30'));
// plik z wcześniejszym najnowszym zleceniem: tylko ostrzeżenie (data pliku = najnowsze createdAt, nie dzień eksportu), Anuluj nic nie zmienia
await page.locator('#vtFile').setInputFiles({name:'job-old.csv',mimeType:'text/csv',buffer:Buffer.from(csv([job('1','AOV Operation Test (TA)','2026-11-06','2026-11-01 08:00:00')]))});
await page.locator('#vtPreview .warn').waitFor();assert.match(await page.locator('#vtPreview').textContent(),/najnowsze zlecenie w pliku jest z 01\/11\/2026.*09\/11\/2026.*może być starszy/);
assert.equal(await page.locator('#vtSave').count(),1,'świeży eksport po zamknięciu najnowszego zlecenia da się zapisać');
await page.locator('#vtCancel').click();assert.equal(await page.locator('#vtPreview').textContent(),'');
// wybór pliku to nie niezapisana zmiana Ustawień: wyjście z ekranu bez okienka „Masz niezapisane zmiany”
await page.evaluate(()=>{location.hash='#settings';});await page.waitForFunction(()=>location.hash==='#settings');
assert.equal(await page.locator('.oest-ask').count(),0,'bez pytania o niezapisane zmiany');await page.evaluate(()=>{location.hash='#settings/vantify';});await page.locator('#vtNow').waitFor();
assert.equal(await page.evaluate(()=>localStorage.getItem('oest.vantify.plan')),null);
// zły plik: komunikat, bez zapisu
await page.locator('#vtFile').setInputFiles({name:'inny.csv',mimeType:'text/csv',buffer:Buffer.from('a,b\n1,2\n')});
await page.waitForFunction(()=>/nie jest eksport Job/.test(document.getElementById('vtPreview').textContent));
// właściwy plik: podgląd
await page.locator('#vtFile').setInputFiles({name:'job179.csv',mimeType:'text/csv',buffer:Buffer.from(csv(now))});
await page.locator('#vtSave').waitFor();const pv=await page.locator('#vtPreview').textContent();
assert.match(pv,/Eksport z 10\/11\/2026 · \d+ zleceń/);assert.match(pv,/Nowe zlecenia: 1/);assert.match(pv,/25\/12\/2026 · AOV Operation Test \(TA\) · 3060001/);
assert.match(pv,/Zamknięte w Vantify \(znikną z apki\): 1/);assert.match(pv,/20\/11\/2026 · AOV Operation Test \(TA\) · 3000623/);assert.match(pv,/Bez karty w apce \(pominięte\): \(Sub\) Monthly Spa Sampling/);
assert.equal(await page.evaluate(()=>localStorage.getItem('oest.vantify.plan')),null,'podgląd niczego nie zapisuje');
if(out)await page.screenshot({path:path.join(out,'VANTIFY_PODGLAD_PL.png'),fullPage:true});
// zmiana języka: podgląd zostaje (w drugim języku), nic się nie zapisuje
await page.locator('[data-action=language]').first().click();await page.waitForFunction(()=>/New jobs: 1/.test(document.getElementById('vtPreview')?.textContent||''));await page.locator('[data-action=language]').first().click();await page.waitForFunction(()=>/Nowe zlecenia: 1/.test(document.getElementById('vtPreview')?.textContent||''));
assert.equal(await page.evaluate(()=>localStorage.getItem('oest.vantify.plan')),null);
await page.evaluate(()=>{window.__due=0;addEventListener('oest:ppm-due-changed',()=>window.__due++);});
await page.locator('#vtSave').click();await page.locator('#vtPreview .ok').waitFor();
assert.equal(await page.evaluate(()=>window.__due),1,'zapis zgłasza zmianę terminów (kalendarz telefonu, ekran główny)');
assert.match(await page.locator('#vtNow').textContent(),/Eksport z 10\/11\/2026 · \d+ zleceń · wczytany w telefonie 10\/11\/2026|Eksport z 10\/11\/2026 · \d+ zleceń · wczytany w telefonie \d\d\/\d\d\/\d{4}/);
const st=await page.evaluate(()=>JSON.parse(localStorage.getItem('oest.vantify.plan')));assert.equal(st.date,'2026-11-10');assert.doesNotMatch(JSON.stringify(st),/Kowalski/);
// po ponownym uruchomieniu: ten sam plan na liście PPM i w inspekcji
await page.reload();await page.waitForFunction(()=>window.OEST_VANTIFY&&window.OEST_VANTIFY.source==='phone');
const d=await page.evaluate(()=>{const P=window.OEST_PPM,t=P.byId('EFA-INS-003');return {jobs:P.jobs(t).map(j=>j.no),tasks:!!window.OEST_VANTIFY.tasks,cards:window.OEST_VANTIFY.cards.includes('EFA-INS-001')};});
assert.ok(d.jobs.includes('3060001')&&!d.jobs.includes('3000623'),'lista PPM: zlecenia z wczytanego pliku');assert.ok(d.tasks,'numery zadań Vantify zostają');assert.ok(d.cards,'karty Vantify bez zleceń zostają');
await page.goto(url+'/inspekcje/index.html');await page.waitForFunction(()=>window.OEST_PPM&&window.OEST_VANTIFY);
assert.equal(await page.evaluate(()=>window.OEST_VANTIFY.source),'phone','inspekcja widzi ten sam plan');
assert.equal(await page.evaluate(()=>window.OEST_PPM.jobFor(window.OEST_PPM.byId('EFA-INS-003'),'2026-12-25')?.no),'3060001');
// nowsza apka (plan wbudowany wygrywa): karta prowadzona przez Vantify tylko dzięki wczytanemu plikowi zostaje kartą Vantify
const extra=await page.evaluate(()=>{const V=window.OEST_VANTIFY,id=window.OEST_PPM.tasks.map(t=>t.id).find(id=>!V.cards.includes(id));const p=JSON.parse(localStorage.getItem('oest.vantify.plan'));p.date='2026-11-01';p.at='2026-11-01T08:00:00.000Z';p.cards.push(id);localStorage.setItem('oest.vantify.plan',JSON.stringify(p));return id;});
assert.ok(extra,'jest karta spoza planu');await page.reload();await page.waitForFunction(()=>window.OEST_VANTIFY&&window.OEST_PPM);
const hist=await page.evaluate(id=>{const V=window.OEST_VANTIFY,P=window.OEST_PPM;return {src:V.source||'app',card:V.cards.includes(id),due:P.due(P.byId(id)),occ:P.occurrences?P.occurrences(P.byId(id),'2026-11-01','2027-03-31').length:0};},extra);
assert.equal(hist.src,'app','starszy wczytany plan nie wygrywa z nowszym wbudowanym');assert.ok(hist.card,'historia kart z telefonu zostaje');assert.equal(hist.due,null,'bez terminu liczonego przez apkę');assert.equal(hist.occ,0,'bez prognoz spoza Vantify');
await page.evaluate(()=>{const p=JSON.parse(localStorage.getItem('oest.vantify.plan'));p.date='2026-11-10';p.at=new Date().toISOString();localStorage.setItem('oest.vantify.plan',JSON.stringify(p));});await page.reload();await page.waitForFunction(()=>window.OEST_VANTIFY&&window.OEST_VANTIFY.source==='phone');
// Vantify w apce (PROD-035, 10/11/2026): w przeglądarce uczciwy komunikat; w apce Android pobrany eksport idzie do podglądu, zapis „Zbadaj” do udostępnienia
await page.goto(url+'/#settings/vantify');await page.locator('#vtOpen').click();await page.waitForFunction(()=>/działa w aplikacji Android/.test(document.getElementById('vtMsg')?.textContent||''));
assert.equal(await page.locator('#vtShare').isHidden(),true,'bez zapisu nie ma czego udostępniać');
await page.evaluate(t=>{window.Capacitor={isNativePlatform:()=>true,Plugins:{Vantify:{open:async o=>({csv:t,name:'job1.csv',log:[{k:'nav',u:'https://savillsuk.cafm.vantify.com/#/user/jobs'},{k:'xhr',m:'GET',u:'https://savillsuk.cafm.vantify.com/api/jobs',st:200}]})},ReportShare:{share:async o=>{window.__shared=o;return {status:'shared'};}}}};},csv(now));
await page.locator('#vtOpen').click();await page.locator('#vtSave').waitFor();assert.match(await page.locator('#vtPreview').textContent(),/Eksport z 10\/11\/2026[\s\S]*Nowe zlecenia: 0[\s\S]*Zamknięte w Vantify \(znikną z apki\): 0/);
assert.match(await page.locator('#vtShare').textContent(),/Udostępnij zapis „Zbadaj” \(2\)/);await page.locator('#vtCancel').click();
await page.locator('#vtShare').click();await page.waitForFunction(()=>window.__shared);
const sh=await page.evaluate(()=>({name:window.__shared.files[0].name,text:decodeURIComponent(escape(atob(window.__shared.files[0].data)))}));
assert.match(sh.name,/^vantify-zbadaj-\d{8}\.json$/);assert.match(sh.text,/api\/jobs/);
// błąd pliku z Vantify w apce po wcześniejszym podglądzie: stary podgląd nie wraca po zmianie języka (przegląd Codex #132)
await page.locator('#vtFile').setInputFiles({name:'job2.csv',mimeType:'text/csv',buffer:Buffer.from(csv(now))});await page.locator('#vtSave').waitFor();
await page.evaluate(()=>{window.Capacitor.Plugins.Vantify.open=async()=>({csv:'id,jobType,task,completeBy,frequency,createdAt\n1,Reactive,X,2026-11-20,,2026-11-10\n',name:'job.csv',log:[]});});
await page.locator('#vtOpen').click();await page.waitForFunction(()=>/Planned/.test(document.getElementById('vtPreview')?.textContent||''));
await page.locator('[data-action=language]').first().click();await page.waitForFunction(()=>/Export from/.test(document.getElementById('vtNow')?.textContent||''));
assert.equal(await page.locator('#vtSave').count(),0,'po błędzie nie wraca poprzedni podgląd z „Zapisz”');
await page.locator('[data-action=language]').first().click();await page.waitForFunction(()=>/Eksport z/.test(document.getElementById('vtNow')?.textContent||''));
// brak miejsca w telefonie (przegląd Codex #132): zapis „Zbadaj” nie ginie – komunikat i udostępnienie z pamięci
await page.evaluate(()=>{const S=Storage.prototype.setItem;window.__S=S;Storage.prototype.setItem=function(k,v){if(k==='oest.vantify.zapis')throw new DOMException('full','QuotaExceededError');return S.call(this,k,v);};window.Capacitor.Plugins.Vantify.open=async()=>({log:[{k:'xhr',m:'GET',u:'https://savillsuk.cafm.vantify.com/api/nowe',st:200}]});window.__shared=null;});
await page.locator('#vtOpen').click();await page.waitForFunction(()=>/nie zapisał zapisu „Zbadaj”/.test(document.getElementById('vtMsg')?.textContent||''));
assert.match(await page.locator('#vtShare').textContent(),/\(3\)/,'nowy wpis jest w zapisie do udostępnienia');
await page.locator('#vtShare').click();await page.waitForFunction(()=>window.__shared);
assert.match(await page.evaluate(()=>decodeURIComponent(escape(atob(window.__shared.files[0].data)))),/api\/nowe/,'udostępnienie zawiera wpis, którego telefon nie zapisał');
await page.evaluate(()=>{Storage.prototype.setItem=window.__S;});
await page.evaluate(()=>{delete window.Capacitor;});
// EN, bez przewijania w bok
await page.goto(url+'/#settings/vantify');await page.locator('#vtNow').waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
await page.locator('[data-action=language]').first().click();await page.waitForFunction(()=>/Export from 10\/11\/2026/.test(document.getElementById('vtNow')?.textContent||''));
assert.match(await page.locator('#vtNow').textContent(),/loaded on this phone/);
if(out)await page.screenshot({path:path.join(out,'VANTIFY_EN.png'),fullPage:true});
assert.deepEqual(errors,[]);console.log('VANTIFY WCZYTAJ UI PASS: klocek, ostrzeżenie przy starszym pliku, zły plik bez zmian, historia kart, sygnał terminów, podgląd nowych/zamkniętych, zapis + odczyt, restart, PPM i inspekcja, Vantify w apce (komunikat, eksport do podglądu, zapis Zbadaj, brak miejsca), EN');
}finally{if(browser)await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
