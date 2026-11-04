const {test}=require('node:test');const assert=require('node:assert/strict');
const {createGoogle}=require('../www/settings-google.js');
function api(routes={}){const calls=[];const g=createGoogle({account:()=>({email:'me@example.com'}),login:async()=>({email:'me@example.com',token:'TOKEN'}),fetch:async(url,opts)=>{calls.push({url,opts});if(!routes[url])throw Error('Unexpected '+url);return {ok:true,status:200,json:async()=>routes[url],text:async()=>JSON.stringify(routes[url])};}});return {g,calls};}
test('contacts fetch only members of selected label, no complete address book',async()=>{
  const x=api({'https://people.googleapis.com/v1/contactGroups/team?maxMembers=1000':{memberResourceNames:['people/1'],memberCount:1},'https://people.googleapis.com/v1/people:batchGet?personFields=names%2CemailAddresses%2Corganizations&resourceNames=people%2F1':{responses:[{person:{resourceName:'people/1',names:[{givenName:'A',familyName:'B'}],emailAddresses:[{value:'a@example.com'}],organizations:[{title:'Engineer'}]}}]}});
  await x.g.connect('contacts');const people=await x.g.contacts('contactGroups/team');assert.equal(people[0].email,'a@example.com');assert.equal(x.calls.length,2);assert.ok(x.calls.every(c=>!c.url.includes('/connections')));
});
test('different Google account cannot connect to current profile',async()=>{
  const g=createGoogle({account:()=>({email:'me@example.com'}),login:async()=>({email:'other@example.com',token:'SECRET'}),fetch:async()=>{throw Error('must not fetch');}});
  await assert.rejects(g.connect('drive'),/GOOGLE_ACCOUNT_MISMATCH/);assert.equal(g.connected('drive'),false);
});
test('missing scope connection fails closed and disconnect removes memory token',async()=>{
  const {g}=api();await assert.rejects(g.contacts('contactGroups/team'),/GOOGLE_CONNECT/);
  await g.connect('contacts');assert.equal(g.connected('contacts'),true);g.disconnect();assert.equal(g.connected('contacts'),false);
});
test('mail test validates recipient and explicit one-message body',async()=>{
  let body;const g=createGoogle({account:()=>({email:'me@example.com'}),login:async()=>({email:'me@example.com',token:'T'}),fetch:async(url,opts)=>{body=JSON.parse(opts.body);return {ok:true,status:200,json:async()=>({id:'receipt'})};}});
  await g.connect('gmail');await assert.rejects(g.testMail('bad\r\nBcc:evil@example.com'),/EMAIL_INVALID/);
  const r=await g.testMail('work@example.com');assert.equal(r.id,'receipt');assert.match(Buffer.from(body.raw,'base64url').toString(),/Subject: OEST TEST/);
});
test('expired token is cleared and API errors never become success',async()=>{
  const g=createGoogle({account:()=>({email:'me@example.com'}),login:async()=>({email:'me@example.com',token:'T'}),fetch:async()=>({ok:false,status:401})});
  await g.connect('drive');await assert.rejects(g.folders(),/GOOGLE_HTTP_401|GOOGLE_CONNECT/);assert.equal(g.connected('drive'),false); // 401 → jedna cicha próba odnowienia; bez niej GOOGLE_CONNECT, nigdy sukces
});
test('account change invalidates existing connections before a request',async()=>{
  let user='me@example.com',n=0;const g=createGoogle({account:()=>({email:user}),login:async()=>({email:user,token:'T'}),fetch:async()=>{n++;throw Error('no');}});
  await g.connect('drive');user='other@example.com';await assert.rejects(g.folders(),/GOOGLE_CONNECT/);assert.equal(n,0);
});
test('report mail goes as one MIME message with attachments via upload endpoint',async()=>{
  let call;const g=createGoogle({account:()=>({email:'me@example.com'}),login:async()=>({email:'me@example.com',token:'T'}),fetch:async(url,opts)=>{call={url,opts};return {ok:true,status:200,json:async()=>({id:'m1'})};}});
  await g.connect('gmail');
  await assert.rejects(g.sendMail({to:'x\r\nBcc:evil@example.com',subject:'s',files:[]}),/EMAIL_INVALID/);
  const r=await g.sendMail({to:'work@example.com',subject:'Engineers Report – DB 1 – Łódź',body:'Zażółć',files:[{name:'DB 1.pdf',mime:'application/pdf',bytes:new Uint8Array([37,80,68,70])}]});
  assert.equal(r.id,'m1');assert.equal(call.url,'https://gmail.googleapis.com/gmail/v1/users/me/messages/send');
  assert.equal(call.opts.headers['Content-Type'],'application/json');assert.equal(call.opts.headers.Authorization,'Bearer T');
  const m=Buffer.from(JSON.parse(call.opts.body).raw,'base64url').toString('latin1');assert.match(m,/^To: work@example.com\r\n/);assert.match(m,/Subject: =\?UTF-8\?B\?/);
  assert.match(m,/filename="DB 1.pdf"/);assert.ok(m.includes(Buffer.from('%PDF').toString('base64')));
  assert.ok(Buffer.from(m.split('Content-Transfer-Encoding: base64\r\n\r\n')[1].split('\r\n')[0],'base64').toString()==='Zażółć');
});
test('gmail session survives page change through the store',async()=>{
  let saved={};const store={get:()=>saved,set:v=>{saved=JSON.parse(JSON.stringify(v));}};
  const mk=()=>createGoogle({store,account:()=>({email:'me@example.com'}),login:async()=>({email:'me@example.com',token:'T'}),fetch:async()=>({ok:true,status:200,json:async()=>({})})});
  await mk().connect('gmail');assert.equal(mk().connected('gmail'),true);
});
test('expired permission renews silently without a window when consent was given (04/11)',async()=>{
  let asked=0,logins=0,auth='';const g=createGoogle({account:()=>({email:'me@example.com'}),login:async()=>{logins++;return {email:'me@example.com',token:'L'};},ask:async()=>{asked++;return true;},
    silent:async(scopes,email)=>{assert.ok(scopes[0].includes('gmail.send'));assert.equal(email,'me@example.com');return {email,token:'S'};},
    fetch:async(url,opts)=>{auth=opts.headers.Authorization;return {ok:true,status:200,json:async()=>({id:'m'})};}});
  await g.background(()=>g.sendMail({to:'work@example.com',subject:'s',files:[]}));
  assert.equal(auth,'Bearer S');assert.equal(asked,0);assert.equal(logins,0);assert.equal(g.connected('gmail'),true);
});
test('no silent token in background → GOOGLE_CONNECT, never a fake send',async()=>{
  let n=0;const g=createGoogle({account:()=>({email:'me@example.com'}),login:async()=>({email:'me@example.com',token:'L'}),silent:async()=>null,recentTap:()=>false,fetch:async()=>{n++;return {ok:true,status:200,json:async()=>({})};}});
  await assert.rejects(g.background(()=>g.sendMail({to:'work@example.com',subject:'s',files:[]})),/GOOGLE_CONNECT/);assert.equal(n,0);
});
test('ready(): one check for lamp, Settings and sending; silent token, never a window, never throws (04/11)',async()=>{
  let logins=0,calls=0;const g=createGoogle({account:()=>({email:'me@example.com'}),login:async()=>{logins++;return {email:'me@example.com',token:'L'};},silent:async()=>{calls++;if(calls===1)return null;if(calls===2)throw Error('NEEDS_UI');return {email:'me@example.com',token:'S'};},fetch:async()=>({ok:true,status:200,json:async()=>({})})});
  assert.equal(await g.ready('drive'),false);
  assert.equal(await g.ready('drive'),false);
  assert.equal(await g.ready('drive'),true);
  assert.equal(g.connected('drive'),true);
  assert.equal(await g.ready('drive'),true);assert.equal(calls,3);assert.equal(logins,0);
});
test('big report (>4 MB, e.g. Flushing with 13 photos) goes natively via /upload, small stays JSON (04/11)',async()=>{
  let web=0,nat;const g=createGoogle({account:()=>({email:'me@example.com'}),login:async()=>({email:'me@example.com',token:'T'}),
    fetch:async()=>{web++;return {ok:true,status:200,json:async()=>({id:'w'})};},
    nativeFetch:async(url,o)=>{nat={url,o};return {ok:true,status:200,json:async()=>({id:'n'})};}});
  await g.connect('gmail');
  const big=new Uint8Array(6*1024*1024).map((_,i)=>i%251);
  const r=await g.sendMail({to:['me@example.com','eng@example.com'],subject:'Weekly Flushing TB',body:'x',files:[{name:'a.pdf',mime:'application/pdf',bytes:big}]});
  assert.equal(r.id,'n');assert.equal(web,0);
  assert.equal(nat.url,'https://gmail.googleapis.com/upload/gmail/v1/users/me/messages/send?uploadType=media');
  assert.equal(nat.o.headers['Content-Type'],'message/rfc822');assert.equal(nat.o.headers.Authorization,'Bearer T');
  assert.match(nat.o.body,/^To: me@example.com, eng@example.com\r\n/);assert.ok(nat.o.timeout>30000);
  const s=await g.sendMail({to:'me@example.com',subject:'s',files:[{name:'b.pdf',mime:'application/pdf',bytes:new Uint8Array([1,2,3])}]});
  assert.equal(s.id,'w');assert.equal(web,1);
});
test('native send: network failure or no answer = uncertain, Gmail error stays an error (04/11)',async()=>{
  let mode='net';const g=createGoogle({account:()=>({email:'me@example.com'}),login:async()=>({email:'me@example.com',token:'T'}),fetch:async()=>{throw Error('web must not be used');},
    nativeFetch:async()=>{if(mode==='net')throw new TypeError('x');return {ok:false,status:400,json:async()=>({error:{message:'bad'}})};}});
  await g.connect('gmail');const big=new Uint8Array(6*1024*1024);
  await assert.rejects(g.sendMail({to:'me@example.com',subject:'s',files:[{name:'a.pdf',mime:'application/pdf',bytes:big}]}),/EMAIL_RESULT_UNCERTAIN/);
  mode='http';await assert.rejects(g.sendMail({to:'me@example.com',subject:'s',files:[{name:'a.pdf',mime:'application/pdf',bytes:big}]}),/GOOGLE_HTTP_400: bad/);
});
