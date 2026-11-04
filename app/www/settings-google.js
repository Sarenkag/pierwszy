/* Explicit, on-demand Google operations. Tokens stay in memory; no timers, background scans or auto-send.
 * 03/11: expired token (401) or no network → after a recent tap ask „Połącz ponownie / Anuluj”, reconnect, retry once. */
(function(root,factory){
  var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
  else {
    // ostatnie dotknięcie ekranu: okno ponownego połączenia tylko po świadomym kliknięciu, nigdy w tle
    var lastTap=0;try{root.document.addEventListener('pointerdown',function(){lastTap=Date.now();},true);}catch(_){}
    root.OESTGoogle=api.createGoogle({recentTap:function(){return Date.now()-lastTap<120000;},fetch:root.fetch.bind(root),account:function(){return JSON.parse(root.localStorage.getItem('oest.account')||'null');},login:async function(scopes){
      var cap=root.Capacitor,config=root.OEST_CONFIG||{};
      if(!cap||!cap.isNativePlatform()||!cap.Plugins.SocialLogin||!config.googleWebClientId)throw Error('GOOGLE_SETUP');
      var social=cap.Plugins.SocialLogin;
      await social.initialize({google:{webClientId:config.googleWebClientId,mode:'online'}});
      // okno Google czasem nie wraca (03/11 „Łączę z Dyskiem…” bez końca): po 90 s zgłaszamy błąd zamiast wisieć
      var result=await Promise.race([social.login({provider:'google',options:{scopes:['email','profile'].concat(scopes)}}),new Promise(function(_,rej){setTimeout(function(){rej(Error('GOOGLE_LOGIN_TIMEOUT'));},90000);})]);
      var r=result.result||{};return {email:r.profile&&r.profile.email,token:r.accessToken&&r.accessToken.token};
    },silent:async function(scopes,email){ // 04/11: nowy token bez okna, gdy zgoda była już dana (GoogleTokenPlugin)
      var cap=root.Capacitor;if(!cap||!cap.isNativePlatform||!cap.isNativePlatform()||!cap.registerPlugin)return null;
      var p=root.__oestGTok||(root.__oestGTok=cap.registerPlugin('OESTGoogleToken'));
      try{var r=await Promise.race([p.token({scopes:scopes,email:email}),new Promise(function(_,rej){setTimeout(function(){rej(Error('SILENT_TIMEOUT'));},15000);})]);return r&&r.token?{email:email,token:r.token}:null;}catch(_){return null;}
    },ask:function(kind,why){ // okno „Połącz ponownie / Anuluj” (moduly/przycisk), tylko gdy Grzegorz właśnie coś kliknął
      var P=root.OESTPrzycisk;if(!P||!P.ask)return Promise.resolve(false);var T=function(pl,en){return root.OESTT?root.OESTT(pl,en):pl;};
      var what={drive:T('Dysku Google','Google Drive'),gmail:T('Gmaila','Gmail'),contacts:T('kontaktów Google','Google Contacts'),calendar:T('Kalendarza Google','Google Calendar')}[kind]||'Google';
      if(why==='offline')return P.ask({title:T('Brak internetu','No internet'),text:T('Telefon nie ma teraz połączenia z internetem. Włącz Wi‑Fi albo dane i spróbuj ponownie.','The phone has no internet connection right now. Turn on Wi‑Fi or mobile data and try again.'),ok:T('Spróbuj ponownie','Try again')});
      return P.ask({title:T('Połączenie wygasło','Connection expired'),text:T('Pozwolenie dla '+what+' wygasło. Połączyć ponownie? Potem operacja dokończy się sama.','Permission for '+what+' has expired. Reconnect? The operation will then finish by itself.'),ok:T('Połącz ponownie','Reconnect')});
    },online:function(){return root.navigator.onLine!==false;},store:{ // sesja przeżywa przejście między ekranami apki (inspekcje ↔ lista), ginie po zamknięciu apki
      get:function(){try{return JSON.parse(root.sessionStorage.getItem('oest.gsess')||'{}');}catch(_){return {};}},
      set:function(v){try{root.sessionStorage.setItem('oest.gsess',JSON.stringify(v));}catch(_){}}
    }});
  }
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  var SCOPES={contacts:['https://www.googleapis.com/auth/contacts.readonly'],drive:['https://www.googleapis.com/auth/drive.file'],gmail:['https://www.googleapis.com/auth/gmail.send'],calendar:['https://www.googleapis.com/auth/calendar.calendarlist.readonly']};
  function createGoogle(opts){
    var store=opts.store||{get:function(){return {};},set:function(){}},sessions=store.get()||{},busy=false;
    function accountEmail(){var a=opts.account();return a&&a.email?a.email.toLowerCase():'';}
    function connected(kind){var s=sessions[kind];return !!(s&&s.email===accountEmail()&&s.until>Date.now());}
    async function connect(kind){
      if(!SCOPES[kind]||!accountEmail())throw Error('GOOGLE_SETUP');
      var expected=accountEmail(),r=await opts.login(SCOPES[kind]);
      if(!r.email||r.email.toLowerCase()!==expected||accountEmail()!==expected)throw Error('GOOGLE_ACCOUNT_MISMATCH');
      if(!r.token)throw Error('GOOGLE_TOKEN');sessions[kind]={token:r.token,email:expected,until:Date.now()+50*60*1000};store.set(sessions);return true;
    }
    async function silent(kind){
      if(!opts.silent||!SCOPES[kind]||!accountEmail())return false;
      var expected=accountEmail(),r=await opts.silent(SCOPES[kind],expected);
      if(!r||!r.token||accountEmail()!==expected)return false;
      sessions[kind]={token:r.token,email:expected,until:Date.now()+50*60*1000};store.set(sessions);return true;
    }
    // JEDNO miejsce sprawdzania połączenia z Google (Grzegorz 04/11): lampka, Ustawienia, wysyłka raportów i zdjęć pytają tylko tutaj.
    // Ważny token → tak; inaczej cichy nowy token (bez okna). Nigdy nie pokazuje okna i nie rzuca błędu.
    async function ready(kind){
      if(connected(kind))return true;
      if(opts.online&&!opts.online())return false;
      try{return await silent(kind);}catch(_){return false;}
    }
    function disconnect(){sessions={};store.set(sessions);}
    // Przed operacją: internet i ważne pozwolenie. Brak → (po kliknięciu) okno „Połącz ponownie / Anuluj”, potem operacja idzie dalej.
    // praca w tle (automatyczna wysyłka zdjęć/raportów) oznacza się sama: wtedy nigdy nie pokazujemy okna, nawet tuż po dotknięciu ekranu
    // operacja z kliknięcia (foreground) zawsze może zapytać, nawet gdy obok trwa praca w tle
    var bg=0,fg=0;
    function background(fn){bg++;return Promise.resolve().then(fn).then(function(r){bg--;return r;},function(e){bg--;throw e;});}
    function foreground(fn){fg++;return Promise.resolve().then(fn).then(function(r){fg--;return r;},function(e){fg--;throw e;});}
    async function ensure(kind){
      var interactive=fg>0||(bg===0&&(!opts.recentTap||opts.recentTap()));
      while(opts.online&&!opts.online()){
        if(!interactive||!opts.ask||!(await opts.ask(kind,'offline')))throw Error('GOOGLE_OFFLINE');
        await new Promise(function(r){setTimeout(r,1500);}); // chwila na złapanie sieci po „Spróbuj ponownie”
      }
      if(connected(kind))return;
      if(await silent(kind))return; // pozwolenie było już dane: nowy token po cichu, bez okna (także w tle)
      if(!interactive||!opts.ask)throw Error('GOOGLE_CONNECT');
      if(sessions[kind]&&!(await opts.ask(kind,'expired')))throw Error('GOOGLE_CANCELLED'); // pierwsze połączenie w sesji: od razu okno Google
      await connect(kind);
    }
    async function once(kind,url,options){
      if(busy)throw Error('GOOGLE_BUSY');busy=true;
      var session=sessions[kind],controller=new AbortController(),timer=setTimeout(function(){controller.abort();},(options&&options.timeout)||30000);
      try{
        var response=await opts.fetch(url,Object.assign({},options,{signal:controller.signal,headers:Object.assign({Authorization:'Bearer '+session.token},options&&options.headers)}));
        if(!response.ok){if(response.status===401){sessions[kind]=Object.assign({},sessions[kind],{until:0});store.set(sessions);}
          var why='';try{var j=await response.json();why=j&&j.error&&j.error.message?String(j.error.message).slice(0,160):'';}catch(_){}
          throw Error('GOOGLE_HTTP_'+response.status+(why?': '+why:''));}
        if(session.email!==accountEmail())throw Error('GOOGLE_ACCOUNT_MISMATCH');
        return response.status===204?{}:await response.json();
      }finally{clearTimeout(timer);busy=false;}
    }
    async function request(kind,url,options){
      await ensure(kind);
      try{return await once(kind,url,options);}
      catch(e){
        // pozwolenie wygasło w trakcie (401): jedno ponowne połączenie i ta sama operacja jeszcze raz
        if(!/GOOGLE_HTTP_401/.test(e&&e.message))throw e;
        await ensure(kind);return once(kind,url,options);
      }
    }
    async function labels(){var out=[],page='';do{var r=await request('contacts','https://people.googleapis.com/v1/contactGroups?pageSize=1000'+(page?'&pageToken='+encodeURIComponent(page):''));out=out.concat((r.contactGroups||[]).filter(function(g){return g.groupType==='USER_CONTACT_GROUP';}));page=r.nextPageToken||'';}while(page);return out;}
    async function contacts(label){
      if(!/^contactGroups\/[\w-]+$/.test(label))throw Error('CONTACT_LABEL');
      var group=await request('contacts','https://people.googleapis.com/v1/'+label+'?maxMembers=1000');
      var names=group.memberResourceNames||[];if(group.memberCount>names.length)throw Error('CONTACT_LABEL_TOO_LARGE');
      var out=[];
      for(var i=0;i<names.length;i+=100){
        var params=new URLSearchParams({personFields:'names,emailAddresses,organizations'});names.slice(i,i+100).forEach(function(n){params.append('resourceNames',n);});
        var r=await request('contacts','https://people.googleapis.com/v1/people:batchGet?'+params);
        (r.responses||[]).forEach(function(x){if(x.status&&x.status.code)throw Error('CONTACT_PARTIAL');var p=x.person;if(!p||!p.resourceName)throw Error('CONTACT_PARTIAL');
          var n=(p.names||[])[0]||{},e=(p.emailAddresses||[]).find(function(e){return e.metadata&&e.metadata.primary;})||(p.emailAddresses||[])[0]||{};
          out.push({id:p.resourceName,first:n.givenName||n.displayName||'',last:n.familyName||'',email:e.value||'',position:((p.organizations||[])[0]||{}).title||''});
        });
      }return out;
    }
    async function folders(){var out=[],page='';do{var p=new URLSearchParams({q:"mimeType='application/vnd.google-apps.folder' and trashed=false",fields:'files(id,name),nextPageToken',pageSize:'100'});if(page)p.set('pageToken',page);var r=await request('drive','https://www.googleapis.com/drive/v3/files?'+p);out=out.concat(r.files||[]);page=r.nextPageToken||'';}while(page);return out;}
    async function folder(id){if(!/^[\w-]+$/.test(id))throw Error('FOLDER_ID');var r=await request('drive','https://www.googleapis.com/drive/v3/files/'+id+'?fields=id,name,mimeType,capabilities(canAddChildren)');if(r.mimeType!=='application/vnd.google-apps.folder'||!r.capabilities||!r.capabilities.canAddChildren)throw Error('FOLDER_WRITE');return r;}
    async function createFolder(name){if(!name||name.length>150)throw Error('FOLDER_NAME');return request('drive','https://www.googleapis.com/drive/v3/files',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name,mimeType:'application/vnd.google-apps.folder'})});}
    async function backup(folderId,backup){
      await folder(folderId);
      var boundary='oest_'+Date.now(),meta={name:'OEST-settings-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json',parents:[folderId]};
      var body='--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify(meta)+'\r\n--'+boundary+'\r\nContent-Type: application/json\r\n\r\n'+JSON.stringify(backup)+'\r\n--'+boundary+'--';
      return request('drive','https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+boundary},body:body});
    }
    /* Moduł zdjęć: foldery i pliki tworzone przez apkę (zakres drive.file widzi tylko je). */
    async function ensureFolder(name,parentId){
      if(!name||name.length>150)throw Error('FOLDER_NAME');if(parentId&&!/^[\w-]+$/.test(parentId))throw Error('FOLDER_ID');
      var q="mimeType='application/vnd.google-apps.folder' and trashed=false and name='"+name.replace(/\\/g,'\\\\').replace(/'/g,"\\'")+"' and '"+(parentId||'root')+"' in parents";
      var r=await request('drive','https://www.googleapis.com/drive/v3/files?'+new URLSearchParams({q:q,fields:'files(id,name)',pageSize:'1'}));
      if(r.files&&r.files[0])return r.files[0];
      return request('drive','https://www.googleapis.com/drive/v3/files?fields=id,name',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name,mimeType:'application/vnd.google-apps.folder',parents:[parentId||'root']})});
    }
    async function uploadFile(parentId,name,blob){
      if(!/^[\w-]+$/.test(parentId||''))throw Error('FOLDER_ID');
      var boundary='oest_'+Date.now(),meta=JSON.stringify({name:name,parents:[parentId]});
      var body=new Blob(['--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+meta+'\r\n--'+boundary+'\r\nContent-Type: '+(blob.type||'image/jpeg')+'\r\n\r\n',blob,'\r\n--'+boundary+'--']);
      return request('drive','https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+boundary},body:body});
    }
    async function removeFile(id){if(!/^[\w-]+$/.test(id||''))throw Error('FILE_ID');return request('drive','https://www.googleapis.com/drive/v3/files/'+id,{method:'DELETE'});}
    async function testMail(address){
      if(!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(address)||/[\r\n]/.test(address))throw Error('EMAIL_INVALID');
      var mime='To: '+address+'\r\nSubject: OEST TEST - connection check\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\nTEST ONLY. OEST email connection check. This is not an inspection report.';
      var bytes=new TextEncoder().encode(mime),binary='';bytes.forEach(function(b){binary+=String.fromCharCode(b);});
      var raw=btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
      try{return await request('gmail','https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({raw:raw})});}
      catch(e){if(e.name==='AbortError'||e instanceof TypeError)throw Error('EMAIL_RESULT_UNCERTAIN');throw e;}
    }
    /* Raport z załącznikami prosto z Gmaila (zakres gmail.send). files: [{name, mime, bytes: Uint8Array}] */
    function b64(bytes){var bin='';for(var i=0;i<bytes.length;i+=0x8000)bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));return btoa(bin);}
    function wrap76(t){return t.replace(/.{1,76}/g,'$&\r\n');}
    function hdr(t){return /^[\x20-\x7e]*$/.test(t)?t:'=?UTF-8?B?'+b64(new TextEncoder().encode(t))+'?=';}
    function buildMime(m){
      if(!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(m.to||''))throw Error('EMAIL_INVALID');
      var subject=String(m.subject||'').replace(/[\r\n]+/g,' '),boundary='oest_'+Date.now().toString(36)+Math.random().toString(36).slice(2);
      var out='To: '+m.to+'\r\nSubject: '+hdr(subject)+'\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary="'+boundary+'"\r\n\r\n';
      out+='--'+boundary+'\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n'+wrap76(b64(new TextEncoder().encode(m.body||'')));
      (m.files||[]).forEach(function(f){var n=String(f.name).replace(/["\r\n\\]/g,'_');
        out+='--'+boundary+'\r\nContent-Type: '+(f.mime||'application/octet-stream')+'; name="'+n+'"\r\nContent-Disposition: attachment; filename="'+n+'"\r\nContent-Transfer-Encoding: base64\r\n\r\n'+wrap76(b64(f.bytes));});
      return out+'--'+boundary+'--\r\n';
    }
    async function sendMail(m){
      var mime=buildMime(m);
      // zwykły adres (JSON), nie /upload: przy błędzie /upload nie daje nagłówków CORS i WebView widzi tylko „brak odpowiedzi”
      var bytes=new TextEncoder().encode(mime),raw=b64(bytes).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
      try{return await request('gmail','https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({raw:raw}),timeout:Math.min(600000,30000+Math.ceil(raw.length/20000)*1000)});} // duży raport na słabym zasięgu: ok. 1 s na 20 KB
      catch(e){if(e.name==='AbortError'||e instanceof TypeError)throw Error('EMAIL_RESULT_UNCERTAIN');throw e;}
    }
    async function calendars(){var out=[],page='';do{var r=await request('calendar','https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=writer'+(page?'&pageToken='+encodeURIComponent(page):''));out=out.concat(r.items||[]);page=r.nextPageToken||'';}while(page);return out;}
    return {background:background,foreground:foreground,connect:connect,connected:connected,ready:ready,disconnect:disconnect,labels:labels,contacts:contacts,folders:folders,folder:folder,createFolder:createFolder,ensureFolder:ensureFolder,uploadFile:uploadFile,removeFile:removeFile,backup:backup,testMail:testMail,sendMail:sendMail,buildMime:buildMime,calendars:calendars};
  }
  return {createGoogle:createGoogle};
});
