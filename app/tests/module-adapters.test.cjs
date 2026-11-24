const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const repo=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(repo,p),'utf8');
test('adapter aplikacji zachowuje odczyt języka, zapis i zastosowanie motywu oraz przekazanie wysyłki',()=>{
  let state={appearance:{language:'pl'}},theme=0,marked=[];const received={};
  const w={OESTSettings:{get:()=>state,update:fn=>fn(state)},OESTSettingsUI:{applyTheme:()=>theme++},OEST_CONFIG:{googleWebClientId:'configured'},OESTGoogle:{client:1},OEST_PPM:{markSent:(...a)=>marked.push(a)}};
  for(const [api,key] of [['OESTBledy','errors'],['OESTNaglowek','header'],['OESTSender','sender']])w[api]={configure:a=>received[key]=a};
  vm.runInNewContext(read('app/www/module-adapters.js'),{window:w});
  assert.equal(received.errors.language(),'pl');received.header.setLanguage('en');assert.equal(received.errors.language(),'en');assert.equal(theme,1);
  assert.equal(received.sender.google(),w.OESTGoogle);w.OESTGoogle={client:2};assert.equal(received.sender.google(),w.OESTGoogle);
  assert.equal(received.sender.clientConfigured(),true);w.OEST_CONFIG={};assert.equal(received.sender.clientConfigured(),false);
  received.sender.markSent('EFA-INS-004','queue-id');assert.deepEqual(marked,[['EFA-INS-004','queue-id']]);
});
test('moduł błędów: adapter języka ma pierwszeństwo, błąd adaptera wraca do języka lokalnego',()=>{
  const ctx={localStorage:{getItem:()=> 'pl'}};vm.runInNewContext(read('moduly/bledy/bledy.js'),ctx);const b=ctx.OESTBledy;
  assert.equal(b.lang(),'pl');b.configure({language:()=> 'en'});assert.equal(b.lang(),'en');b.configure({language:()=>{throw Error('storage');}});assert.equal(b.lang(),'pl');
});
test('nagłówek przełącza język przez adapter, a bez niego zachowuje lokalny zapis',()=>{
  let click,saved=[],changed=[];const w={OESTNarzedzia:{esc:String},OESTBledy:{lang:()=> 'pl',zapiszJezyk:l=>saved.push(l)}};
  const d={readyState:'loading',documentElement:{},addEventListener:(event,fn)=>{if(event==='click')click=fn;}};
  vm.runInNewContext(read('moduly/naglowek/naglowek.js'),{window:w,document:d,MutationObserver:class{observe(){}}});
  click({target:{closest:()=> ({})}});assert.deepEqual(saved,['en']);w.OESTNaglowek.configure({setLanguage:l=>changed.push(l)});click({target:{closest:()=> ({})}});assert.deepEqual(changed,['en']);assert.deepEqual(saved,['en']);
});
test('niezapisane ustawienia: odmowa blokuje wyjście, potwierdzenie czyści dirty i pozwala ponowić',()=>{
  const src=read('app/www/settings-ui.js').match(/function canLeave\(\)\{[^\n]+/)[0];let accept,calls=0;
  const ctx={dirty:false,L:pl=>pl,w:{OESTPrzycisk:{leave:(text,fn)=>{assert.equal(text,'Masz niezapisane zmiany. Opuścić ekran?');calls++;accept=fn;return false;}}}};
  vm.createContext(ctx);vm.runInContext(src,ctx);assert.equal(ctx.canLeave(),true);ctx.dirty=true;assert.equal(ctx.canLeave(),false);assert.equal(ctx.dirty,true);assert.equal(calls,1);accept();assert.equal(ctx.canLeave(),true);
});
test('aktualizacja i inspekcje przekazują pytanie i komunikat do wspólnego modułu',async()=>{
  const src=read('app/www/update.js').match(/function ask\(t\) \{[^\n]+/)[0];let answer=false,seen;
  const ctx={w:{OESTT:(pl,en)=>pl,OESTPytaj:async(t,o)=>{seen=[t,o.ok];return answer;}}};vm.runInNewContext(src,ctx);
  assert.equal(await ctx.ask('Nowa wersja'),false);answer=true;assert.equal(await ctx.ask('Nowa wersja'),true);assert.deepEqual(seen,['Nowa wersja','Pobierz']);
  const inspect=read('inspekcje/i-zapis-zdjec.js');let message;
  const c={OESTPytaj:async t=>t==='Tak?',OESTPrzycisk:{alert:t=>message=t}};
  vm.runInNewContext(inspect.match(/function ask\(t\) \{[^\n]+/)[0]+'\n'+inspect.match(/function say\(t\) \{[^\n]+/)[0],c);
  assert.equal(await c.ask('Tak?'),true);assert.equal(await c.ask('Nie?'),false);c.say('Treść komunikatu');assert.equal(message,'Treść komunikatu');
});
test('obie strony ładują dostawców przed konsumentami i adaptery przed uruchomieniem aplikacji',()=>{
  for(const p of ['app/www/index.html','inspekcje/index.html']){
    const scripts=[...read(p).matchAll(/<script src="([^"]+)"/g)].map(m=>m[1].replace(/^\.\.\//,''));
    function before(a,b){assert.ok(scripts.indexOf(a)>=0,a);assert.ok(scripts.indexOf(a)<scripts.indexOf(b),p+': '+a+' przed '+b);}
    before('moduly/przycisk/przycisk.js','settings-google.js');before('moduly/przycisk/przycisk.js','settings-ui.js');before('moduly/przelacznik/przelacznik.js','moduly/naglowek/naglowek.js');before('settings-ui.js','module-adapters.js');before('moduly/wysylka/wysylka.js','module-adapters.js');
    if(p.startsWith('inspekcje')){before('calendar-core.js','calendar-sync.js');before('calendar-sync.js','settings-ui.js');before('wersja.js','settings-ui.js');before('module-adapters.js','i-start.js');}
    else before('moduly/aparat/aparat.js','reactive.js');
  }
});
