// Do kogo wysyłam (Grzegorz 05/11/2026): prywatny, firmowy, inżynier, manager — każdy osobno, kilku naraz
const {test} = require('node:test');
const assert = require('node:assert/strict');
function load(settings){
  const data=new Map([['oest.account',JSON.stringify({id:'a',email:'a@gmail.com'})],['oest.settings.v1.a',JSON.stringify(settings)]]);
  const root={localStorage:{getItem:k=>data.get(k)??null,setItem(k,v){data.set(k,v);}},navigator:{onLine:true},document:{addEventListener(){},readyState:'loading'},addEventListener(){},setTimeout,clearTimeout};
  const src=require('node:fs').readFileSync(__dirname+'/../../moduly/wysylka/wysylka.js','utf8');
  new Function('window','setInterval',src)(root,()=>0);
  return root.OESTSender;
}
const S={profile:{companyEmail:'work@firma.com',privateEmail:'prywatny@gmail.com'},mail:{engineerId:'e',managerId:'m'},contacts:[{id:'e',email:'inz@firma.com',active:true},{id:'m',email:'man@firma.com',active:true}]};
test('each recipient checkbox maps to its own address',()=>{
  const R=load(S).recipients;
  assert.deepEqual(R({sp:true}).list,['prywatny@gmail.com']);
  assert.deepEqual(R({sm:true}).list,['work@firma.com']);
  assert.deepEqual(R({se:true}).list,['inz@firma.com']);
  assert.deepEqual(R({sp:true,sm:true,se:true,sg:true}).list,['prywatny@gmail.com','work@firma.com','inz@firma.com','man@firma.com']);
  assert.deepEqual(R().list,['work@firma.com']); // domyślnie jak dotąd: firmowy
});
test('no private email = nothing added',()=>{
  const R=load({...S,profile:{companyEmail:'work@firma.com'}}).recipients;
  assert.equal(R({sp:true}).priv,''); assert.deepEqual(R({sp:true}).list,[]);
});
