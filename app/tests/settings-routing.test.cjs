const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../www/index.html'),'utf8');
function render(route,loggedIn=true){
  const views=['start','home','settings','ppm','appset'].map(x=>({id:'v-'+x,hidden:false})),opened=[];
  const context={$:id=>views.find(v=>v.id===id),account:()=>loggedIn?{}:null,document:{querySelectorAll:()=>views},window:{OESTSettingsUI:{open:r=>opened.push(r)},scrollTo(){}},renderHome(){},renderAccount(){},renderPpm(){}};
  const source=html.replace(/\r\n/g,'\n').match(/function render\(v\) \{[\s\S]*?\n  \}\n  function depth/)[0].replace(/\n  function depth$/,'');
  vm.runInNewContext(source+';render('+JSON.stringify(route)+');',context);
  return {opened,visible:views.filter(x=>!x.hidden).map(x=>x.id)};
}
test('logged-in #settings opens Settings instead of throwing',()=>{assert.deepEqual(render('settings'),{opened:['settings'],visible:['v-settings']});});
test('Settings subroutes and legacy profile are routed into Settings',()=>{for(const r of ['settings/profile','settings/contacts','profile','appset'])assert.deepEqual(render(r),{opened:[r],visible:['v-settings']});});
test('unauthenticated Settings route shows sign-in without opening private Settings',()=>{assert.deepEqual(render('settings/profile',false),{opened:[],visible:['v-start']});});
test('index.html uses LF only',()=>assert.equal(html.includes('\r'),false));
