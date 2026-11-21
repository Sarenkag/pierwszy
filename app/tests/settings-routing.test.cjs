const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../www/index.html'),'utf8');
function render(route,loggedIn=true){
  const views=['start','home','settings','ppm','appset'].map(x=>({id:'v-'+x,hidden:false})),opened=[];
  const context={$:id=>views.find(v=>v.id===id),account:()=>loggedIn?{}:null,document:{querySelectorAll:()=>views},window:{OESTSettingsUI:{open:r=>opened.push(r)},scrollTo(){},OESTEkrany:{jestVue:r=>r==='settings',naGore(){}}},renderHome(){},renderAccount(){},renderPpm(){}};
  const source=html.replace(/\r\n/g,'\n').match(/function render\(v\) \{[\s\S]*?\n  \}\n/)[0];
  vm.runInNewContext(source+';render('+JSON.stringify(route)+');',context);
  return {opened,visible:views.filter(x=>!x.hidden).map(x=>x.id)};
}
// hub Ustawień jest ekranem Ionic + Vue (moduly/szkielet, EKRANY_VUE): stary kod chowa wszystkie sekcje i nie rysuje huba; podstrony nadal przez OESTSettingsUI
test('logged-in #settings opens the Vue Settings hub instead of throwing (old sections hidden, no legacy draw)',()=>{assert.deepEqual(render('settings'),{opened:[],visible:[]});});
test('Settings subroutes and legacy profile are routed into Settings',()=>{for(const r of ['settings/profile','settings/contacts','profile','appset'])assert.deepEqual(render(r),{opened:[r],visible:['v-settings']});});
test('unauthenticated Settings route shows sign-in without opening private Settings',()=>{for(const r of ['settings/profile','settings'])assert.deepEqual(render(r,false),{opened:[],visible:['v-start']});});
test('index.html uses LF only',()=>assert.equal(html.includes('\r'),false));
