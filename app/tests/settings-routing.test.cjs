const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../www/index.html'),'utf8');
function render(route,loggedIn=true){
  const views=['start','home','settings','ppm','appset'].map(x=>({id:'v-'+x,hidden:false})),went=[];
  const context={$:id=>views.find(v=>v.id===id),account:()=>loggedIn?{}:null,document:{querySelectorAll:()=>views},window:{scrollTo(){},OESTEkrany:{jestVue:r=>/^(settings|profile|appset|start$)/.test(r),go:r=>went.push(r),naGore(){}}},renderHome(){},renderAccount(){},renderPpm(){}};
  const source=html.replace(/\r\n/g,'\n').match(/function render\(v\) \{[\s\S]*?\n  \}\n/)[0];
  vm.runInNewContext(source+';render('+JSON.stringify(route)+');',context);
  return {went,visible:views.filter(x=>!x.hidden).map(x=>x.id)};
}
// wszystkie ekrany Ustawień (hub, Mój profil, Kalendarz, Vantify… i adresy „profile”, „appset”) są ekranami Ionic + Vue (moduly/szkielet, EKRANY_VUE): stary kod chowa wszystkie sekcje i nie rysuje nic
test('logged-in #settings opens the Vue Settings hub instead of throwing (old sections hidden, no legacy draw)',()=>{assert.deepEqual(render('settings'),{went:[],visible:[]});});
test('Settings subroutes and legacy profile are all Vue screens (old sections hidden, nothing drawn by legacy code)',()=>{for(const r of ['settings/profile','settings/calendar','settings/vantify','settings/contacts','profile','appset'])assert.deepEqual(render(r),{went:[],visible:[]},r);});
test('unauthenticated Settings route shows sign-in (Vue start screen) without opening private Settings',()=>{for(const r of ['settings/profile','settings'])assert.deepEqual(render(r,false),{went:['start'],visible:['v-start','v-home','v-settings','v-ppm','v-appset']},r);assert.deepEqual(render('start',false),{went:[],visible:[]});});
test('index.html uses LF only',()=>assert.equal(html.includes('\r'),false));
