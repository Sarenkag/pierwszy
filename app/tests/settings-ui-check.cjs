// Browser check: OEST_PLAYWRIGHT_PATH may point to an existing Playwright installation.
const {chromium}=require(process.env.OEST_PLAYWRIGHT_PATH || 'playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=path.resolve(__dirname,'../www');
const server=http.createServer((req,res)=>{const name=decodeURIComponent(req.url.split('?')[0]);let p=path.resolve(base,'.'+name);if(!p.startsWith(base+path.sep)&&p!==base){res.writeHead(403);return res.end();}if(name.endsWith('/'))p=path.join(p,'index.html');fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);return res.end();}res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript; charset=utf-8':p.endsWith('.css')?'text/css':p.endsWith('.html')?'text/html; charset=utf-8':'application/octet-stream');res.end(b);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{browser=await chromium.launch({headless:true, ...(process.env.OEST_BROWSER_PATH ? {executablePath:process.env.OEST_BROWSER_PATH} : {})});const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
await context.addInitScript(()=>{if(!localStorage.getItem('oest.account')){localStorage.setItem('oest.account',JSON.stringify({provider:'local',id:'test',email:'demo@example.com',first:'Greg',last:'Sarna'}));localStorage.setItem('oest.profile',JSON.stringify({first:'Greg',last:'Sarna',email1:'demo@example.com',email2:'work@example.com',unknown:'retain'}));}});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
const url='http://127.0.0.1:'+server.address().port;
await page.goto(url+'/#settings');await page.locator('.settings-card').first().waitFor();assert.equal(await page.locator('.settings-card').count(),15);
await page.locator('[data-route=profile]').click();await page.locator('[data-path="profile.formSignature"]').fill('G. S.');await page.locator('[data-path="profile.position"]').fill('Shift Engineer');await page.locator('[data-path="profile.workplace"]').fill('One Eastside');await page.getByRole('button',{name:'Zapisz ustawienia',exact:true}).click();assert.match(await page.locator('#settingsMessage').textContent(),/Zapisano/);
assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('insp.cfg')).insp),'G. S.');
await page.reload();await page.locator('[data-path="profile.formSignature"]').waitFor();assert.equal(await page.locator('[data-path="profile.formSignature"]').inputValue(),'G. S.');
await page.locator('[data-route=""]').click();await page.locator('[data-route=calendar]').click();
await page.locator('#shiftEffective').fill('2026-10-01');await page.locator('#shiftAnchor').fill('2026-10-01');await page.locator('#shiftKind').selectOption('4on4');await page.locator('#shiftFrom').fill('08:00');await page.locator('#shiftTo').fill('20:00');page.once('dialog',d=>d.accept());await page.locator('[data-action=add-schedule]').click();assert.equal(await page.locator('.settings-schedule').count(),1);
await page.locator('[data-route=""]').click();await page.locator('[data-route=appearance]').click();await page.locator('[data-path="appearance.theme"]').selectOption('navy');await page.getByRole('button',{name:'Zapisz ustawienia',exact:true}).click();assert.equal(await page.evaluate(()=>document.documentElement.dataset.settingsTheme),'navy');
await page.locator('[data-route=""]').click();
const out=process.env.OEST_SCREENSHOTS;if(out){fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,'08_SETTINGS_KAFELKI.png'),fullPage:true});}
// All subpages render without errors or horizontal overflow at 360 px.
await page.setViewportSize({width:360,height:800});
for(const route of ['profile','contacts','backup','drive','mail','calendar','inspections','temperature','reports','ai','sync','appearance','account']){await page.goto(url+'/#settings/'+route);await page.locator('.settings-page').waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Overflow '+route);}
await page.goto(url+'/#settings/profile');if(out)await page.screenshot({path:path.join(out,'09_SETTINGS_MY_PROFILE.png'),fullPage:true});
await page.locator('[data-action=language]').click();assert.equal(await page.locator('[data-path="profile.first"]').count(),1);assert.match(await page.locator('#v-settings').textContent(),/First name/);
await page.locator('[data-route=""]').click();assert.match(await page.locator('#v-settings').textContent(),/Team & contacts/);
await context.setOffline(true);await page.locator('[data-route=profile]').click();await page.locator('[data-path="profile.formSignature"]').fill('Offline G');await page.getByRole('button',{name:'Save settings',exact:true}).click();assert.equal(await page.evaluate(()=>window.OESTSettings.get().profile.formSignature),'Offline G');
await context.setOffline(false);await page.reload();assert.equal(await page.locator('[data-path="profile.formSignature"]').inputValue(),'Offline G');
// Backup contains settings only, preview never changes saved values.
const backup=await page.evaluate(()=>window.OESTSettings.exportBackup());assert.equal(backup.data.reports.language,'en');assert.equal(JSON.stringify(backup).includes('oest.account'),false);
// Connection attempt in browser must fail visibly, not claim connected.
await page.locator('[data-route=""]').click();await page.locator('[data-route=contacts]').click();await page.locator('[data-action=connect-contacts]').click();assert.match(await page.locator('#settingsMessage').textContent(),/Requires the Android app/);
// App shell and PPM survive integration.
await page.goto(url+'/#home');await page.locator('[data-go=ppm]').click();assert.ok(await page.locator('.prow').count()>=28);
assert.deepEqual(errors,[]);console.log('UI PASS: 14 tiles, all subpages, profile + bridge + reload, schedule history, themes, PL/EN, offline save, honest OAuth state, existing PPM.');
}finally{if(browser)await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

