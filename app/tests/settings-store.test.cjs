const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createStore} = require('../www/settings-store.js');
function fixture(initial = {}) {
  const data = new Map(Object.entries(initial));
  let fail = false, user = {id:'a', email:'personal@example.com', first:'Greg', last:'Sarna'};
  const storage = {getItem:k=>data.get(k) ?? null, setItem(k,v){if(fail) throw Error('full');data.set(k,v);}};
  return {store:createStore({storage,account:()=>user}),data,setFail:v=>fail=v,setUser:v=>user=v};
}
test('migrates profile preserving legacy data and sends only business email',()=>{
  const f=fixture({'oest.profile':JSON.stringify({first:'Greg',last:'Sarna',email1:'personal@example.com',email2:'work@example.com',extra:'keep'})});
  const p=f.store.get().profile;
  assert.equal(p.companyEmail,'work@example.com'); assert.equal(p.first,'Greg');
  assert.equal(f.store.get().legacyProfile.extra,'keep');
  f.store.update(s=>{s.profile.formSignature='G. S.';});
  const c=JSON.parse(f.data.get('insp.cfg')); assert.equal(c.insp,'G. S.');assert.equal(c.email,'work@example.com');
});
test('old personal address is not assumed to be company email',()=>{
  const f=fixture({'oest.profile':JSON.stringify({email1:'personal@example.com',send1:true})});
  assert.equal(f.store.get().profile.companyEmail,'');
});
test('profile is account isolated and logout returns no prior profile',()=>{
  const f=fixture(); f.store.update(s=>{s.profile.first='Alice';});
  f.setUser({id:'b',email:'b@example.com'});assert.notEqual(f.store.get().profile.first,'Alice');
  f.setUser(null);assert.throws(()=>f.store.get(),/ACCOUNT_REQUIRED/);
});
test('storage failures throw and never report success or mutate persisted state',()=>{
  const f=fixture();f.store.get();f.setFail(true);
  assert.throws(()=>f.store.update(s=>{s.profile.first='LOST';}),/STORAGE_WRITE/);
  f.setFail(false);assert.notEqual(f.store.get().profile.first,'LOST');
});
test('unknown inspection config fields survive bridge and empty signature falls back to name',()=>{
  const f=fixture({'insp.cfg':JSON.stringify({v:4,key:'SECRET',folder:'Old',unknown:42})});
  f.store.update(s=>{s.profile.first='Greg';s.profile.last='Sarna';s.profile.companyEmail='work@example.com';});
  const c=JSON.parse(f.data.get('insp.cfg'));assert.equal(c.key,'SECRET');assert.equal(c.unknown,42);assert.equal(c.insp,'Greg Sarna');
});
test('schedule versions retain history and resolve date without guessing night shift',()=>{
  const f=fixture();
  f.store.addSchedule({effectiveFrom:'2026-09-01',kind:'weekdays',start:'06:00',end:'18:00',endNextDay:false,anchor:'2026-09-01'});
  f.store.addSchedule({effectiveFrom:'2026-10-01',kind:'4on4',start:'20:00',end:'08:00',endNextDay:true,anchor:'2026-10-01'});
  assert.equal(f.store.scheduleOn('2026-09-12').kind,'weekdays');assert.equal(f.store.scheduleOn('2026-10-12').start,'20:00');
  assert.equal(f.store.get().schedules.length,2);
  assert.throws(()=>f.store.addSchedule({effectiveFrom:'2026-10-01',kind:'4on4',start:'08:00',end:'20:00',anchor:'2026-10-01'}),/SCHEDULE_DUPLICATE/);
  assert.throws(()=>f.store.addSchedule({effectiveFrom:'2026-02-30',kind:'4on4',start:'08:00',end:'20:00',anchor:'2026-10-01'}),/DATE/);
});
test('contact import updates selected label without duplicates, preserves roles, deactivates removed',()=>{
  const f=fixture();f.store.importContacts('contactGroups/team',[{id:'people/1',first:'A',last:'B',email:'a@example.com',position:'Engineer'}]);
  f.store.update(s=>{s.contacts[0].role='manager';});
  f.store.importContacts('contactGroups/team',[{id:'people/1',first:'New',email:'a@example.com'}]);
  assert.equal(f.store.get().contacts.length,1);assert.equal(f.store.get().contacts[0].role,'manager');
  f.store.importContacts('contactGroups/team',[]);assert.equal(f.store.get().contacts[0].active,false);
});
test('routing uses only company address for inspections and selected contacts for handover',()=>{
  const f=fixture();f.store.importContacts('contactGroups/team',[{id:'p1',email:'manager@example.com'},{id:'p2',email:'engineer@example.com'},{id:'p3',email:'other@example.com'}]);
  f.store.update(s=>{s.profile.companyEmail='work@example.com';s.mail.managerId='p1';s.mail.engineerId='p2';});
  assert.deepEqual(f.store.recipients('inspection'),['work@example.com']);
  assert.deepEqual(f.store.recipients('handover'),['work@example.com','engineer@example.com','manager@example.com']);
});
test('defaults use PL UI, EN documents, sequential WiFi transfer and no unchosen queue threshold',()=>{
  const s=fixture().store.get();assert.equal(s.appearance.language,'pl');assert.equal(s.reports.language,'en');
  assert.equal(s.sync.maxConcurrent,1);assert.equal(s.sync.mobile,'manual');assert.equal(s.sync.warnMB,null);
});
test('export excludes session tokens and inspection config secrets; import is scoped and previewed',()=>{
  const f=fixture({'insp.cfg':JSON.stringify({key:'SECRET',api:'https://secret.example'})});f.store.get();
  const b=f.store.exportBackup();assert.equal(JSON.stringify(b).includes('SECRET'),false);
  assert.equal(JSON.stringify(b).includes('accessToken'),false);
  f.store.update(s=>{s.profile.formSignature='Current';});
  assert.equal(f.store.previewRestore(b).profileName,'Greg Sarna');
  assert.equal(f.store.get().profile.formSignature,'Current');
  f.setUser({id:'b',email:'b@example.com'});assert.throws(()=>f.store.previewRestore(b),/BACKUP_OWNER/);
});
test('restore needs explicit replace and future schema or invalid content fails without mutation',()=>{
  const f=fixture();const b=f.store.exportBackup();f.store.update(s=>{s.profile.first='New';});
  assert.throws(()=>f.store.restore(b),/RESTORE_CONFIRM/);assert.equal(f.store.get().profile.first,'New');
  assert.throws(()=>f.store.previewRestore({...b,version:999}),/BACKUP_VERSION/);
  const bad=JSON.parse(JSON.stringify(b));bad.data.appearance.theme='javascript:bad';assert.throws(()=>f.store.previewRestore(bad),/THEME/);
  f.store.restore(b,true);assert.equal(f.store.get().profile.first,'Greg');
});
test('schema rejects prototype/secret injection and maintains EN report policy',()=>{
  const f=fixture();assert.throws(()=>f.store.update(s=>{s.reports.language='pl';}),/REPORT_LANGUAGE/);
  const b=f.store.exportBackup();b.data.accessToken='bad';assert.throws(()=>f.store.previewRestore(b),/UNKNOWN_FIELD/);
});
test('returns detached snapshots so profile edits cannot mutate stored state',()=>{
  const f=fixture();const s=f.store.get();s.profile.first='Invisible';assert.notEqual(f.store.get().profile.first,'Invisible');
});
test('AI defaults keep phone vision/text replaceable and cloud explicitly selected, no keys in backup',()=>{
  const f=fixture();const ai=f.store.get().ai;
  assert.equal(ai.location,'phone');assert.equal(ai.provider,'local');assert.equal(ai.autoCloudFallback,false);
  assert.equal(ai.autoAnalyzePhotos,true);assert.equal(ai.maxConcurrent,1);
  f.store.update(s=>{s.ai.visionModel='phone-vision-v2';s.ai.textModel='phone-text-v3';s.ai.provider='anthropic';s.ai.cloudModel='chosen-by-user';});
  assert.equal(f.store.get().ai.visionModel,'phone-vision-v2');
  assert.throws(()=>f.store.update(s=>{s.ai.apiKey='secret';}),/UNKNOWN_FIELD/);
});
