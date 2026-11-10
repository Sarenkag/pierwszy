// „Pobierz z Vantify” i sprawdzanie przy starcie (Grzegorz 10/11/2026: „Zacznij od automatycznego updatu”).
// Scenariusz Grzegorza: lista Jobs w Vantify (97 zleceń One Eastside) bez eksportu CSV. Apka pyta ukryte okno Vantify
// (VantifyPlugin.sync, tu atrapa), pokazuje ten sam podgląd co przy pliku i zapisuje dopiero po „Zapisz”.
// Wygasłe logowanie: okno Vantify do zalogowania, po „Zakończ” pobranie jeszcze raz. Przy starcie: najwyżej co 4 h,
// nowe/zamknięte zlecenia → pytanie „Pokazać?”, wygasłe logowanie → pytanie najwyżej raz na dobę.
// Zapamiętany login i hasło: pola w Ustawienia → Vantify, „Pokaż”, zmiana bez pomocy, odrzucone hasło → prośba o nowe.
const {chromium}=require(process.env.OEST_PLAYWRIGHT_PATH || 'playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=path.resolve(__dirname,'../www');
const server=http.createServer((req,res)=>{const name=decodeURIComponent(req.url.split('?')[0]);let p=path.resolve(base,'.'+name);if(!p.startsWith(base+path.sep)&&p!==base){res.writeHead(403);return res.end();}if(name.endsWith('/'))p=path.join(p,'index.html');fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);return res.end();}res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript; charset=utf-8':p.endsWith('.css')?'text/css':p.endsWith('.html')?'text/html; charset=utf-8':'application/octet-stream');res.end(b);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{browser=await chromium.launch({headless:true, ...(process.env.OEST_BROWSER_PATH ? {executablePath:process.env.OEST_BROWSER_PATH} : {})});const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
await context.addInitScript(()=>{if(!localStorage.getItem('oest.account')){localStorage.setItem('oest.account',JSON.stringify({provider:'local',id:'test',email:'demo@example.com',first:'Greg',last:'Sarna'}));localStorage.setItem('oest.profile',JSON.stringify({first:'Greg',last:'Sarna',email1:'demo@example.com'}));}});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
const url='http://127.0.0.1:'+server.address().port,out=process.env.OEST_SCREENSHOTS;
await page.goto(url+'/#settings/vantify');await page.locator('#vtPull').waitFor();
// w przeglądarce (bez apki Android): uczciwy komunikat, nic się nie zmienia
await page.locator('#vtPull').click();await page.waitForFunction(()=>/działa w aplikacji Android/.test(document.getElementById('vtPullMsg')?.textContent||''));
// lista z Vantify = plan wbudowany bez 3000623 (zamknięte) + nowe 3060001 (AOV TA, 25/12) + jedno Reactive (pomijane)
const api=await page.evaluate(()=>{const V=window.OEST_VANTIFY,P=window.OEST_PPM,r=[];for(const id of Object.keys(V.jobs))for(const j of V.jobs[id])if(j.no!=='3000623')r.push({id:Number(j.no),type:'planned',summary:P.byId(id).name,status:'acknowledged',completionDueAt:j.due+'T23:59:59+00:00',frequency:j.f});
  r.push({id:3060001,type:'planned',summary:'AOV Operation Testing (Tower A)',status:'acknowledged',completionDueAt:'2026-12-25T23:59:59+00:00',frequency:'1W'});r.push({id:3003949,type:'reactive',summary:'Leak',status:'extension_pending',completionDueAt:'2026-10-30T18:00:00+00:00'});return r;});
await page.evaluate(jobs=>{window.__calls={sync:0,open:0};window.__seq=[];window.Capacitor={isNativePlatform:()=>true,Plugins:{Vantify:{sync:async()=>{window.__calls.sync++;return window.__seq.length?window.__seq.shift():{status:'ok',count:jobs.length,jobs};},open:async()=>{window.__calls.open++;return {log:[]};}}}};window.__jobs=jobs;},api);
await page.locator('#vtPull').click();await page.locator('#vtSave').waitFor();
const pv=await page.locator('#vtPreview').textContent();
assert.match(pv,/Vantify, stan na \d\d\/\d\d\/\d{4} · \d+ zleceń/,'podgląd z Vantify, nie z eksportu');assert.match(pv,/Nowe zlecenia: 1/);assert.match(pv,/25\/12\/2026 · AOV Operation Test \(TA\) · 3060001/);
assert.match(pv,/Zamknięte w Vantify \(znikną z apki\): 1/);assert.match(pv,/3000623/);assert.doesNotMatch(pv,/Leak|3003949/,'Reactive nie trafia do planu PPM');
assert.equal(await page.evaluate(()=>localStorage.getItem('oest.vantify.plan')),null,'podgląd niczego nie zapisuje');
if(out)await page.screenshot({path:path.join(out,'VANTIFY_POBIERZ_PL.png'),fullPage:true});
await page.evaluate(()=>{window.__due=0;addEventListener('oest:ppm-due-changed',()=>window.__due++);});
await page.locator('#vtSave').click();await page.locator('#vtPreview .ok').waitFor();assert.equal(await page.evaluate(()=>window.__due),1);assert.match(await page.locator('#vtPreview').textContent(),/Zapisano\. Terminy z Vantify z dnia/);
const d=await page.evaluate(()=>{const P=window.OEST_PPM;return {src:window.OEST_VANTIFY.source,jobs:P.jobs(P.byId('EFA-INS-003')).map(j=>j.no)};});
assert.equal(d.src,'phone');assert.ok(d.jobs.includes('3060001')&&!d.jobs.includes('3000623'),'lista PPM bierze terminy z Vantify');
// wygasłe logowanie: okno Vantify do zalogowania, po „Zakończ” apka sama pobiera jeszcze raz (raz, bez pętli)
await page.evaluate(()=>{window.__calls={sync:0,open:0};window.__seq=[{status:'login'}];});
await page.locator('#vtPull').click();await page.locator('#vtSave').waitFor();
assert.deepEqual(await page.evaluate(()=>window.__calls),{sync:2,open:1});
assert.match(await page.locator('#vtPreview').textContent(),/Nowe zlecenia: 0[\s\S]*Zamknięte w Vantify \(znikną z apki\): 0/);await page.locator('#vtCancel').click();
await page.evaluate(()=>{window.__calls={sync:0,open:0};window.__seq=[{status:'login'},{status:'login'}];});
await page.locator('#vtPull').click();await page.waitForFunction(()=>/prosi o zalogowanie/.test(document.getElementById('vtPullMsg')?.textContent||''));
assert.deepEqual(await page.evaluate(()=>window.__calls),{sync:2,open:1},'drugi raz login → komunikat, bez pętli');
await page.evaluate(()=>{window.__seq=[{status:'timeout'}];});await page.locator('#vtPull').click();await page.waitForFunction(()=>/Nie udało się pobrać zleceń z Vantify/.test(document.getElementById('vtPullMsg')?.textContent||''));
assert.equal(await page.evaluate(()=>localStorage.getItem('oest.vantify.plan')&&JSON.parse(localStorage.getItem('oest.vantify.plan')).jobs['EFA-INS-003'].some(j=>j.no==='3060001')),true,'błąd nic nie zmienia');
// filtr listy w Vantify bez zleceń Planned: podpowiedź, nic się nie zmienia
await page.evaluate(()=>{window.__seq=[{status:'ok',count:1,jobs:[{id:1,type:'reactive',summary:'Leak',completionDueAt:'2026-11-20T18:00:00+00:00'}]}];});await page.locator('#vtPull').click();
await page.waitForFunction(()=>/nie pokazuje zleceń planowych[\s\S]*ustaw filtr/.test(document.getElementById('vtPreview')?.textContent||''));assert.equal(await page.locator('#vtSave').count(),0);
// przy starcie: Vantify ma nowe zlecenie → pytanie „Pokazać?” → Ustawienia → Vantify z podglądem; nic nie zapisuje samo
await page.evaluate(()=>{localStorage.removeItem('oest.vantify.auto');window.__jobs.push({id:3070001,type:'planned',summary:'AOV Operation Testing (Tower A)',status:'acknowledged',completionDueAt:'2027-01-01T23:59:59+00:00',frequency:'1W'});window.__calls={sync:0,open:0};location.hash='#home';});
await page.evaluate(()=>{window.OESTVantifyAuto.check();});await page.locator('.oest-ask:not([data-wy-out])').waitFor();
assert.match(await page.locator('.oest-ask:not([data-wy-out])').textContent(),/Są nowe terminy PPM z Vantify: nowe zlecenia 1, zamknięte 0[\s\S]*Później[\s\S]*Pokaż/);
const before=await page.evaluate(()=>localStorage.getItem('oest.vantify.plan'));
await page.locator('.oest-ask:not([data-wy-out]) [data-a=ok]').click();await page.waitForFunction(()=>location.hash==='#settings/vantify');await page.locator('#vtSave').waitFor();
assert.match(await page.locator('#vtPreview').textContent(),/Nowe zlecenia: 1[\s\S]*01\/01\/2027 · AOV Operation Test \(TA\) · 3070001/);
assert.equal(await page.evaluate(()=>localStorage.getItem('oest.vantify.plan')),before,'samo sprawdzenie niczego nie zapisuje');
// podgląd czeka też po wyjściu i powrocie; Anuluj go usuwa
await page.evaluate(()=>{location.hash='#settings';});await page.waitForFunction(()=>location.hash==='#settings');await page.evaluate(()=>{location.hash='#settings/vantify';});await page.locator('#vtSave').waitFor();
await page.locator('#vtCancel').click();assert.equal(await page.evaluate(()=>localStorage.getItem('oest.vantify.nowe')),null);
// najwyżej co 4 h
await page.evaluate(()=>{window.OESTVantifyAuto.check();});await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>window.__calls.sync),1,'drugie sprawdzenie dopiero po 4 h');
// bez zmian → bez pytania
await page.evaluate(()=>{window.__jobs.pop();localStorage.removeItem('oest.vantify.auto');location.hash='#home';});await page.evaluate(()=>{window.OESTVantifyAuto.check();});
await page.waitForFunction(()=>window.__calls.sync===2);await page.waitForTimeout(400);assert.equal(await page.locator('.oest-ask:not([data-wy-out])').count(),0,'bez zmian nie pyta');
// wygasłe logowanie przy starcie: pytanie raz na dobę; „Zaloguj” otwiera Vantify i potem pobiera
await page.evaluate(()=>{localStorage.removeItem('oest.vantify.auto');window.__seq=[{status:'login'}];});await page.evaluate(()=>{window.OESTVantifyAuto.check();});
await page.locator('.oest-ask:not([data-wy-out])').waitFor();assert.match(await page.locator('.oest-ask:not([data-wy-out])').textContent(),/Logowanie do Vantify wygasło/);
await page.locator('.oest-ask:not([data-wy-out]) [data-a=no]').click();await page.waitForFunction(()=>!document.querySelector('.oest-ask:not([data-wy-out])'));
await page.evaluate(()=>{const a=JSON.parse(localStorage.getItem('oest.vantify.auto'));a.at=0;localStorage.setItem('oest.vantify.auto',JSON.stringify(a));window.__seq=[{status:'login'}];});await page.evaluate(()=>{window.OESTVantifyAuto.check();});
await page.waitForFunction(()=>window.__calls.sync===4);await page.waitForTimeout(400);assert.equal(await page.locator('.oest-ask:not([data-wy-out])').count(),0,'o logowanie pyta najwyżej raz na dobę');
await page.evaluate(()=>{const a=JSON.parse(localStorage.getItem('oest.vantify.auto'));a.at=0;a.askedLogin=0;localStorage.setItem('oest.vantify.auto',JSON.stringify(a));window.__seq=[{status:'login'}];window.__calls.open=0;location.hash='#home';});
await page.evaluate(()=>{window.OESTVantifyAuto.check();});await page.locator('.oest-ask:not([data-wy-out]) [data-a=ok]').click();
await page.waitForFunction(()=>window.__calls.open===1);await page.locator('#vtSave').waitFor();assert.equal(await page.evaluate(()=>location.hash),'#settings/vantify','„Zaloguj” → okno Vantify, potem podgląd');
await page.locator('#vtCancel').click();
// już na Ustawienia → Vantify: „Pokaż” rysuje podgląd od razu (ten sam adres nie przerysowuje widoku)
await page.evaluate(()=>{localStorage.removeItem('oest.vantify.auto');window.__jobs.push({id:3080001,type:'planned',summary:'AOV Operation Testing (Tower A)',status:'acknowledged',completionDueAt:'2027-01-08T23:59:59+00:00',frequency:'1W'});});
assert.equal(await page.evaluate(()=>location.hash),'#settings/vantify');assert.equal(await page.locator('#vtSave').count(),0);
await page.evaluate(()=>{window.OESTVantifyAuto.check();});await page.locator('.oest-ask:not([data-wy-out]) [data-a=ok]').click();
await page.locator('#vtSave').waitFor();assert.match(await page.locator('#vtPreview').textContent(),/3080001/,'podgląd bez zmiany adresu');
// zapis pliku CSV unieważnia odłożony podgląd z Vantify (inaczej stara lista pokazałaby nowe zlecenia jako „zamknięte”)
await page.locator('#vtCancel').click();await page.evaluate(()=>window.OESTVantifyImport.keepNew({jobs:window.__jobs}));
const csv=await page.evaluate(()=>{const V=window.OEST_VANTIFY,P=window.OEST_PPM,q=s=>'"'+String(s).replace(/"/g,'""')+'"',d=new Date().toISOString().slice(0,10);let t='id,jobType,task,completeBy,frequency,createdAt\n';for(const id of Object.keys(V.jobs))for(const j of V.jobs[id])t+=[j.no,'Planned',q(P.byId(id).name),j.due+' 23:59',j.f,d+' 08:00'].join(',')+'\n';return t+['3090001','Planned',q('AOV Operation Testing (Tower A)'),'2027-01-15 23:59','1W',d+' 08:00'].join(',')+'\n';});
await page.locator('#vtFile').setInputFiles({name:'job.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});await page.locator('#vtSave').waitFor();await page.locator('#vtSave').click();await page.locator('#vtPreview .ok').waitFor();
assert.equal(await page.evaluate(()=>localStorage.getItem('oest.vantify.nowe')),null,'zapis pliku usuwa odłożony podgląd');
await page.evaluate(()=>{location.hash='#settings';});await page.waitForFunction(()=>location.hash==='#settings');await page.evaluate(()=>{location.hash='#settings/vantify';});await page.locator('#vtPull').waitFor();await page.waitForTimeout(300);
assert.equal(await page.locator('#vtSave').count(),0,'po zapisie pliku stary podgląd nie wraca');
// zapamiętany login i hasło (Grzegorz 10/11/2026): wpisuje raz, zmienia sam; hasło zagwiazdkowane, „Pokaż”; odrzucone hasło → prośba o nowe
await page.evaluate(()=>{const V=window.Capacitor.Plugins.Vantify;window.__login=null;window.__bad=false;const info=()=>({saved:!!window.__login,user:window.__login?window.__login.user:'',bad:!!window.__login&&window.__bad});
  V.loginInfo=async()=>info();V.saveLogin=async o=>{window.__login={user:o.user,pass:o.pass};window.__bad=false;return info();};V.showLogin=async()=>({user:window.__login?.user||'',pass:window.__login?.pass||''});V.clearLogin=async()=>{window.__login=null;return info();};
  location.hash='#settings';});await page.waitForFunction(()=>location.hash==='#settings');await page.evaluate(()=>{location.hash='#settings/vantify';});await page.locator('#vtUser').waitFor();
await page.waitForFunction(()=>/Nic nie zapisano/.test(document.getElementById('vtLoginMsg')?.textContent||''));
await page.locator('#vtLoginSave').click();assert.match(await page.locator('#vtLoginMsg').textContent(),/Wpisz login i hasło/);
await page.locator('#vtUser').fill('greg@example.com');await page.locator('#vtPass').fill('Haslo1');await page.locator('#vtLoginSave').click();
await page.waitForFunction(()=>/Zapisane\. Apka zaloguje się sama/.test(document.getElementById('vtLoginMsg')?.textContent||''));
assert.deepEqual(await page.evaluate(()=>window.__login),{user:'greg@example.com',pass:'Haslo1'});
assert.deepEqual(await page.evaluate(()=>{const p=document.getElementById('vtPass');return [p.type,p.value,p.placeholder,document.getElementById('vtUser').value];}),['password','','••••••••','greg@example.com'],'hasło zagwiazdkowane, login widoczny');
await page.locator('#vtLoginShow').click();await page.waitForFunction(()=>document.getElementById('vtPass').type==='text');assert.equal(await page.locator('#vtPass').inputValue(),'Haslo1','„Pokaż” odsłania hasło');
await page.locator('#vtLoginShow').click();assert.deepEqual(await page.evaluate(()=>{const p=document.getElementById('vtPass');return [p.type,p.value];}),['password',''],'„Ukryj” chowa');
if(out)await page.screenshot({path:path.join(out,'VANTIFY_LOGIN_PL.png'),fullPage:true});
// zmiana hasła bez pomocy: wpisz nowe, zapisz
await page.locator('#vtPass').fill('Haslo2');await page.locator('#vtLoginSave').click();await page.waitForFunction(()=>window.__login.pass==='Haslo2');
// zmiana języka w trakcie wpisywania nie kasuje wpisanego loginu i hasła
await page.locator('#vtUser').fill('nowy@example.com');await page.locator('#vtPass').fill('Haslo3');
await page.locator('[data-action=language]').first().click();await page.waitForFunction(()=>/Save login and password/.test(document.getElementById('vtLoginSave')?.textContent||''));
assert.deepEqual(await page.evaluate(()=>[document.getElementById('vtUser').value,document.getElementById('vtPass').value,document.getElementById('vtPass').type]),['nowy@example.com','Haslo3','password'],'PL→EN zachowuje wpisane pola');
await page.locator('[data-action=language]').first().click();await page.waitForFunction(()=>/Zapisz login i hasło/.test(document.getElementById('vtLoginSave')?.textContent||''));
assert.equal(await page.locator('#vtPass').inputValue(),'Haslo3');assert.equal(await page.evaluate(()=>window.__login.pass),'Haslo2','bez „Zapisz” nic się nie zmienia');
await page.evaluate(()=>{location.hash='#settings';});await page.waitForFunction(()=>location.hash==='#settings');await page.evaluate(()=>{location.hash='#settings/vantify';});await page.locator('#vtUser').waitFor();
await page.waitForFunction(()=>document.getElementById('vtUser').value==='greg@example.com');assert.equal(await page.locator('#vtPass').inputValue(),'','wyjście z ekranu porzuca niezapisane');
// Vantify odrzucił zapisane hasło: przy „Pobierz” komunikat i pole hasła, bez otwierania logowania w kółko
await page.evaluate(()=>{window.__bad=true;window.__calls={sync:0,open:0};window.__seq=[{status:'login',code:'bad'}];});await page.locator('#vtPull').click();
await page.waitForFunction(()=>/nie przyjął zapisanego hasła/.test(document.getElementById('vtPullMsg')?.textContent||''));assert.deepEqual(await page.evaluate(()=>window.__calls),{sync:1,open:0});
await page.waitForFunction(()=>/nie przyjął zapisanego hasła/.test(document.getElementById('vtLoginMsg')?.textContent||''));
// przy starcie: pytanie „Wpisać aktualne hasło?” → Ustawienia → Vantify, pole hasła
await page.evaluate(()=>{localStorage.removeItem('oest.vantify.auto');window.__seq=[{status:'login',code:'bad'}];location.hash='#home';});await page.waitForFunction(()=>location.hash==='#home');
await page.evaluate(()=>{window.OESTVantifyAuto.check();});await page.locator('.oest-ask:not([data-wy-out])').waitFor();assert.match(await page.locator('.oest-ask:not([data-wy-out])').textContent(),/nie przyjął zapisanego hasła/);
await page.locator('.oest-ask:not([data-wy-out]) [data-a=ok]').click();await page.waitForFunction(()=>location.hash==='#settings/vantify'&&document.activeElement&&document.activeElement.id==='vtPass');assert.equal(await page.evaluate(()=>window.__calls.open),0);
await page.locator('#vtLoginClear').click();await page.waitForFunction(()=>/Nic nie zapisano/.test(document.getElementById('vtLoginMsg')?.textContent||''));assert.equal(await page.evaluate(()=>window.__login),null);
// „Zbadaj automatycznie”: ukryte okno w trybie explore, wynik dopisany do zapisu „Zbadaj” (do udostępnienia), nic więcej się nie zmienia
await page.evaluate(()=>{const V=window.Capacitor.Plugins.Vantify,old=V.sync;window.__modes=[];V.sync=async o=>{window.__modes.push(o&&o.mode||'');if(o&&o.mode==='explore')return {status:'ok',count:5,log:[{t:1,k:'auto',m:'GET',u:'https://savillsuk-api.cafm.vantify.com/sites/6324/meters',st:200,res:{n:3}},{t:2,k:'code',m:'POST',u:'"/jobs/"+j+"/complete"'}]};return old(o);};});
const plan0=await page.evaluate(()=>localStorage.getItem('oest.vantify.plan'));
await page.locator('#vtExplore').click();await page.waitForFunction(()=>/Gotowe: 5 odczytów/.test(document.getElementById('vtMsg')?.textContent||''));
assert.deepEqual(await page.evaluate(()=>window.__modes),['explore']);
assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('oest.vantify.zapis')).entries.slice(-2).map(e=>e.k).join(',')),'auto,code');
assert.equal(await page.locator('#vtShare').isVisible(),true,'zapis do udostępnienia');assert.equal(await page.evaluate(()=>localStorage.getItem('oest.vantify.plan')),plan0,'badanie nie zmienia terminów');
await page.evaluate(()=>{window.Capacitor.Plugins.Vantify.sync=async()=>{throw new Error('VANTIFY_BUSY');};});await page.locator('#vtExplore').click();
await page.waitForFunction(()=>/Spróbuj za chwilę/.test(document.getElementById('vtMsg')?.textContent||''));
// duży nowy zapis + starszy w telefonie (przegląd Codex #135): oddajemy tylko starsze wpisy, nowy zostaje cały
await page.evaluate(()=>{const pad=n=>'x'.repeat(n);localStorage.setItem('oest.vantify.zapis',JSON.stringify({at:'x',entries:Array.from({length:100},(_,i)=>({t:i,k:'old',u:pad(2000)}))}));
  window.__big=Array.from({length:1500},(_,i)=>({t:1000+i,k:'auto',m:'GET',u:pad(1900)}));window.Capacitor.Plugins.Vantify.sync=async()=>({status:'ok',count:1500,log:window.__big});});
await page.locator('#vtExplore').click();await page.waitForFunction(()=>/Gotowe: 1500 odczytów/.test(document.getElementById('vtMsg')?.textContent||''));
assert.deepEqual(await page.evaluate(()=>{const e=JSON.parse(localStorage.getItem('oest.vantify.zapis')).entries.filter(x=>x.k==='auto');return [e.length,e[0].t];}),[1500,1000],'cały nowy zapis „Zbadaj automatycznie”');
// logowanie wygasło w trakcie badania: prośba o logowanie (nie „Gotowe”), odczytane wpisy zostają w zapisie
await page.evaluate(()=>{localStorage.removeItem('oest.vantify.zapis');window.Capacitor.Plugins.Vantify.sync=async()=>({status:'login',count:2,log:[{t:5,k:'auto',m:'GET',u:'/sites/6324',st:200},{t:6,k:'auto',m:'GET',u:'/sites/6324/meters',st:'login'}]});});
await page.locator('#vtExplore').click();await page.waitForFunction(()=>{const t=document.getElementById('vtMsg')?.textContent||'';return t&&!/Badam/.test(t);});
assert.doesNotMatch(await page.locator('#vtMsg').textContent(),/Gotowe/);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('oest.vantify.zapis')).entries.length),2);
// strona inspekcji nie sprawdza Vantify sama (tylko główne okno apki)
await page.goto(url+'/inspekcje/index.html');await page.waitForFunction(()=>window.OEST_PPM&&window.OEST_VANTIFY);
await page.evaluate(()=>{localStorage.removeItem('oest.vantify.auto');window.__n=0;window.Capacitor={isNativePlatform:()=>true,Plugins:{Vantify:{sync:async()=>{window.__n++;return {status:'login'};}}}};document.dispatchEvent(new Event('visibilitychange'));});
await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>window.__n),0);
// EN, bez przewijania w bok
await page.goto(url+'/#settings/vantify');await page.locator('#vtPull').waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
await page.locator('[data-action=language]').first().click();await page.waitForFunction(()=>/Get from Vantify/.test(document.getElementById('vtPull')?.textContent||''));
if(out)await page.screenshot({path:path.join(out,'VANTIFY_POBIERZ_EN.png'),fullPage:true});
assert.deepEqual(errors,[]);console.log('VANTIFY POBIERZ UI PASS: przycisk w przeglądarce, podgląd z Vantify (nowe/zamknięte, bez Reactive), zapis, PPM, logowanie i ponowienie bez pętli, błąd bez zmian, start: pytanie o nowe terminy, podgląd czeka, co 4 h, bez zmian bez pytania, logowanie raz na dobę, inspekcja nie sprawdza, EN');
}catch(e){console.error(e);process.exitCode=1;}finally{if(browser)await browser.close();server.close();}})();
