/* Shared Settings contract. No network, timers or inspection engine in this module. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    root.OESTSettingsCore = api;
    root.OESTSettings = api.createStore({storage: root.localStorage, account: function () {
      try { return JSON.parse(root.localStorage.getItem('oest.account') || 'null'); } catch (_) { return null; }
    }, changed: function () { root.dispatchEvent(new CustomEvent('oest:settings-changed')); }});
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  var copy = function (v) { return JSON.parse(JSON.stringify(v)); };
  var themes = ['graphite', 'navy', 'light'];
  function fail(code) { throw new Error(code); }
  function email(v) { return !v || /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(v); }
  function date(v) { return /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v; }
  function defaults(owner, account) {
    return {version:1, owner:owner, revision:0,
      profile:{first:account.first || '',last:account.last || '',title:'',position:'',workplace:'',companyEmail:'',formSignature:'',photo:'',signatureImage:''},
      schedules:[],contacts:[],contactsLabel:{id:'',name:'',lastImportedAt:''},
      mail:{managerId:'',engineerId:''},drive:{folderId:'',folderName:'',lastBackupAt:''},
      calendar:{calendarId:'',name:'',exportShifts:false,exportInspections:false},
      sync:{preferWifi:true,mobile:'manual',warnMB:null,maxConcurrent:1},
      reports:{language:'en',compression:'readable',photosPerPage:10,formats:['docx','pdf']},
      inspection:{startMode:'empty'},ai:{location:'phone',provider:'local',visionModel:'',textModel:'',cloudModel:'',ocrEnabled:true,autoAnalyzePhotos:true,maxConcurrent:1,autoCloudFallback:false},appearance:{language:'pl',theme:'graphite',accent:'default',density:'comfortable',reduceMotion:false},legacyProfile:{}};
  }
  function validate(s, importing) {
    var allowed=['version','owner','revision','profile','schedules','contacts','contactsLabel','mail','drive','calendar','sync','reports','inspection','appearance','ai'];
    if (!importing) allowed.push('legacyProfile');
    Object.keys(s).forEach(function(k){if(allowed.indexOf(k)<0) fail('UNKNOWN_FIELD');});
    if (s.version !== 1 || !s.profile || !s.appearance || !s.sync || !s.reports) fail('SETTINGS_SCHEMA');
    var shape=defaults(s.owner,{});
    ['profile','contactsLabel','mail','drive','calendar','sync','reports','inspection','appearance','ai'].forEach(function(group){
      if(!s[group] || typeof s[group]!=='object' || Array.isArray(s[group])) fail('SETTINGS_SCHEMA');
      Object.keys(s[group]).forEach(function(k){if(!Object.hasOwn(shape[group],k)) fail('UNKNOWN_FIELD');});
      Object.keys(shape[group]).forEach(function(k){if(!Object.hasOwn(s[group],k)) fail('SETTINGS_SCHEMA');});
    });
    Object.keys(s.profile).forEach(function(k){if(typeof s.profile[k]!=='string') fail('PROFILE_VALUE');});
    if (!email(s.profile.companyEmail)) fail('EMAIL_INVALID');
    ['photo','signatureImage'].forEach(function(k){if(s.profile[k] && (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(s.profile[k]) || s.profile[k].length>900000)) fail('IMAGE_INVALID');});
    if (s.profile.signatureImage && !s.profile.signatureImage.startsWith('data:image/png;base64,')) fail('SIGNATURE_PNG');
    if (themes.indexOf(s.appearance.theme)<0) fail('THEME');
    if (['pl','en'].indexOf(s.appearance.language)<0 || ['comfortable','compact'].indexOf(s.appearance.density)<0) fail('APPEARANCE');
    if (['default','teal','blue','amber'].indexOf(s.appearance.accent)<0) fail('ACCENT');
    if (s.reports.language!=='en') fail('REPORT_LANGUAGE');
    if (s.reports.compression!=='readable' || s.reports.photosPerPage!==10 || JSON.stringify(s.reports.formats)!=='["docx","pdf"]') fail('REPORT_POLICY');
    if (s.sync.maxConcurrent!==1 || s.sync.preferWifi!==true || ['manual','automatic'].indexOf(s.sync.mobile)<0) fail('TRANSFER_POLICY');
    if (s.sync.warnMB!==null && (!Number.isFinite(s.sync.warnMB)||s.sync.warnMB<=0||s.sync.warnMB>100000)) fail('QUEUE_THRESHOLD');
    if(['empty','allOk','previous'].indexOf(s.inspection.startMode)<0) fail('START_MODE');
    if(s.ai.location!=='phone'||s.ai.autoCloudFallback!==false||s.ai.maxConcurrent!==1||['local','openai','anthropic','gemini'].indexOf(s.ai.provider)<0||typeof s.ai.ocrEnabled!=='boolean'||typeof s.ai.autoAnalyzePhotos!=='boolean')fail('AI_POLICY');
    ['visionModel','textModel','cloudModel'].forEach(function(k){if(typeof s.ai[k]!=='string'||s.ai[k].length>200)fail('AI_MODEL');});
    if(typeof s.calendar.exportShifts!=='boolean'||typeof s.calendar.exportInspections!=='boolean') fail('CALENDAR_POLICY');
    if(s.drive.folderId && !/^[a-zA-Z0-9_-]+$/.test(s.drive.folderId)) fail('FOLDER_ID');
    if(!Array.isArray(s.schedules)||!Array.isArray(s.contacts)) fail('SETTINGS_SCHEMA');
    var seen={};
    s.schedules.forEach(function(x){
      if(!date(x.effectiveFrom)||!date(x.anchor)) fail('SCHEDULE_DATE');
      if(seen[x.effectiveFrom]) fail('SCHEDULE_DUPLICATE');seen[x.effectiveFrom]=true;
      if(['weekdays','weekends','4on4'].indexOf(x.kind)<0 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(x.start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(x.end)) fail('SCHEDULE_TIME');
      if(typeof x.endNextDay!=='boolean' || (!x.endNextDay && x.end<=x.start)) fail('SCHEDULE_TIME');
      if(Object.keys(x).some(function(k){return ['effectiveFrom','anchor','kind','start','end','endNextDay'].indexOf(k)<0;})) fail('UNKNOWN_FIELD');
    });
    var ids=new Set();
    s.contacts.forEach(function(c){
      if(!c.id||typeof c.id!=='string'||ids.has(c.id)||!email(c.email)) fail('CONTACT_INVALID'); ids.add(c.id);
      if(Object.keys(c).some(function(k){return ['id','first','last','email','position','role','labelId','active'].indexOf(k)<0;})) fail('UNKNOWN_FIELD');
      if(['engineer','manager','other'].indexOf(c.role)<0 || typeof c.active!=='boolean') fail('CONTACT_INVALID');
      ['first','last','email','position','labelId'].forEach(function(k){if(typeof c[k]!=='string') fail('CONTACT_INVALID');});
    });
    if (s.contacts.length>2000 || s.schedules.length>500) fail('SETTINGS_LIMIT');
    if(JSON.stringify(s).length>3000000) fail('SETTINGS_LIMIT');
    return s;
  }
  function createStore(opts) {
    var storage=opts.storage;
    function identity(){var a=opts.account();if(!a)fail('ACCOUNT_REQUIRED');return {a:a,id:String(a.id||a.email||'local-preview')};}
    function read(k,d){var v;try{v=storage.getItem(k);}catch(_){fail('STORAGE_READ');}if(v===null)return copy(d);try{return JSON.parse(v);}catch(_){fail('STORAGE_CORRUPT');}}
    function write(k,v){try{storage.setItem(k,JSON.stringify(v));}catch(_){fail('STORAGE_WRITE');}}
    function key(id){return 'oest.settings.v1.'+encodeURIComponent(id);}
    function get(){
      var who=identity(),s=read(key(who.id),null);
      if(s){validate(s,false);return copy(s);}
      s=defaults(who.id,who.a);
      var migrationOwner=read('oest.settings.legacyOwner',null);
      if(!migrationOwner || migrationOwner===who.id){
        var p=read('oest.profile',{});s.legacyProfile=p;
        ['first','last','title','position'].forEach(function(k){if(typeof p[k]==='string')s.profile[k]=p[k];});
        // Only a distinct second address is a safe business-address suggestion. Never infer personal Gmail as recipient.
        s.profile.companyEmail=typeof p.email2==='string' && email(p.email2) ? p.email2 : '';
        write('oest.settings.legacyOwner',who.id);
      }
      validate(s,false);write(key(who.id),s);return copy(s);
    }
    function bridge(s){
      var c=read('insp.cfg',{}); c.v=c.v||4;
      c.insp=s.profile.formSignature.trim()||[s.profile.first,s.profile.last].filter(Boolean).join(' ');
      c.email=s.profile.companyEmail.trim();
      if(s.profile.workplace)c.site=s.profile.workplace;
      write('insp.cfg',c);
    }
    function update(fn){
      var s=get();fn(s);validate(s,false);s.revision++;write(key(identity().id),s);
      var bridgeError='';try{bridge(s);}catch(e){bridgeError=e.message;}
      if(opts.changed)opts.changed(copy(s));return {state:copy(s),bridgeError:bridgeError};
    }
    function addSchedule(x){return update(function(s){s.schedules.push(copy(x));s.schedules.sort(function(a,b){return a.effectiveFrom.localeCompare(b.effectiveFrom);});});}
    function scheduleOn(day){return get().schedules.filter(function(x){return x.effectiveFrom<=day;}).at(-1)||null;}
    function importContacts(labelId,contacts){return update(function(s){
      var previous=s.contacts;
      previous.forEach(function(c){if(c.labelId===labelId || c.labelId===s.contactsLabel.id)c.active=false;});
      contacts.forEach(function(c){
        var old=previous.find(function(p){return p.id===c.id;});
        var fresh={id:c.id,first:c.first||'',last:c.last||'',email:c.email||'',position:c.position||'',role:old?old.role:'engineer',labelId:labelId,active:true};
        if(old)Object.assign(old,fresh);else previous.push(fresh);
      });s.contactsLabel.id=labelId;s.contactsLabel.lastImportedAt=new Date().toISOString();
    });}
    function recipients(kind){var s=get(),emails=[s.profile.companyEmail];
      if(kind==='handover')[s.mail.engineerId,s.mail.managerId].forEach(function(id){var c=s.contacts.find(function(x){return x.id===id&&x.active;});if(c)emails.push(c.email);});
      return Array.from(new Set(emails.filter(Boolean)));
    }
    function exportBackup(){var s=get();delete s.legacyProfile;return {kind:'OEST_SETTINGS',version:1,owner:identity().id,exportedAt:new Date().toISOString(),data:s};}
    function checkBackup(b){
      if(!b||b.kind!=='OEST_SETTINGS'||b.version!==1)fail('BACKUP_VERSION');
      if(b.owner!==identity().id||!b.data||b.data.owner!==b.owner)fail('BACKUP_OWNER');
      validate(b.data,true);return copy(b.data);
    }
    function previewRestore(b){var s=checkBackup(b);return {profileName:[s.profile.first,s.profile.last].filter(Boolean).join(' '),contacts:s.contacts.length,schedules:s.schedules.length,exportedAt:b.exportedAt};}
    function restore(b,confirmed){if(confirmed!==true)fail('RESTORE_CONFIRM');var incoming=checkBackup(b);return update(function(s){var legacy=s.legacyProfile;Object.assign(s,incoming);s.legacyProfile=legacy;});}
    return {get:get,update:update,addSchedule:addSchedule,scheduleOn:scheduleOn,importContacts:importContacts,recipients:recipients,exportBackup:exportBackup,previewRestore:previewRestore,restore:restore,
      syncLegacy:function(){bridge(get());},validate:validate};
  }
  return {createStore:createStore,validate:validate};
});
