// Edytor inspekcji i pytań (Ustawienia → Pytania): baza pytań, działy, skala, propozycje/kopia JSON, wybór pytań dla inspekcji.
// Moduł trzyma stan i reguły; ekran Pytania.vue (moduly/szkielet, Ionic + Vue) tylko wyświetla i woła akcje.
// Po każdej zmianie stanu moduł wysyła zdarzenie oest:pytania-stan – ekran odczytuje dane od nowa.
(function(w){
  'use strict';const L=(pl,en)=>w.OESTT(pl,en),A=w.OESTQuestions,Q=w.OESTQuestionsCore,P=w.OEST_PPM,uid=()=>crypto.randomUUID();
  const X0='_'; // wartość „puste” w polach wyboru (ion-select nie lubi pustego napisu)
  let s=null,tab='base',draft=null,profile=null,taskId='',dirty=false,busy=false,search='',filter='',proposal=null,preview=[],epoch=0,message='',report=null,loading=true,failure='',picked=null,replace=false,sectionEdit={id:'',name:'',parentId:''},scaleDraft=null,json='',zywy=false;
  function notify(){try{w.dispatchEvent(new CustomEvent('oest:pytania-stan'));}catch(e){}}
  function msg(text){message=text;notify();}
  const ask=(tresc,o)=>w.OESTOkna.pytaj(Object.assign({tresc:tresc},o||{}));
  // Wyjście z ekranu (Wstecz): bez zmian – od razu; z niezapisanymi – pytanie, a „Opuść” dokończy wyjście (OESTEkrany.ponow)
  function canLeave(){if(busy)return false;if(!dirty)return true;ask(L('Opuścić niezapisane zmiany pytań?','Leave unsaved question changes?'),{ok:L('Opuść','Leave'),anuluj:L('Zostań','Stay'),niebezpieczne:true}).then(ok=>{if(ok){dirty=false;w.OESTEkrany.ponow();}});return false;}
  // Zmiana wewnątrz ekranu (zakładka, inne pytanie): ta sama zasada, ale odpowiedź wraca do wywołującego
  async function allowed(){if(busy)return false;if(!dirty)return true;if(await ask(L('Opuścić niezapisane zmiany pytań?','Leave unsaved question changes?'),{ok:L('Opuść','Leave'),anuluj:L('Zostań','Stay'),niebezpieczne:true})){dirty=false;return true;}return false;}
  async function run(fn){if(busy)return;busy=true;notify();const owner=w.OESTSettings.get().owner,ticket=epoch;try{await fn();if(owner!==w.OESTSettings.get().owner||ticket!==epoch)throw Error('QUESTIONS_ACCOUNT_CHANGED');}catch(e){if(owner===w.OESTSettings.get().owner)message=L('Nie zapisano / nie wykonano:','Not saved / not done:')+' '+(w.OESTBledy?w.OESTBledy.text(e):e.message);}finally{busy=false;notify();}}
  async function open(){const ticket=++epoch;dirty=false;draft=null;profile=null;proposal=null;preview=[];report=null;message='';failure='';loading=true;zywy=true;notify();try{const data=await A.reload();if(ticket!==epoch)return;s=data;tab='base';loading=false;}catch(e){failure=L('Nie udało się odczytać pytań:','Could not read the questions:')+' '+e.message;loading=false;}notify();}
  function close(){zywy=false;epoch++;}
  async function change(fn){await A.change(fn);s=A.get();dirty=false;}
  const sections=()=>Q.orderedSections(s).map(sec=>({id:sec.id,nazwa:(sec.parentId?'↳ ':'')+sec.name}));
  const secName=id=>s.sections.find(x=>x.id===id)?.name;
  // ---------- dane dla ekranu ----------
  function dane(){return {ladowanie:loading,blad:failure,zajety:busy,zakladka:tab,edytor:!!draft,komunikat:message,raport:report,import:importDane()};}
  function baza(){if(!s)return null;const list=s.questions.filter(q=>(!filter||q.section===filter)&&JSON.stringify([q.text,q.tags,q.source]).toLocaleLowerCase().includes(search.toLocaleLowerCase()));
    return {szukaj:search,filtr:filter||X0,dzialy:sections(),json:json,pytan:list.length,wiecej:list.length>200,
      wiersze:list.slice(0,200).map(q=>({id:q.id,tekst:q.text,typ:q.type+' · '+(q.status==='approved'?L('zatwierdzone','approved'):L('propozycja','proposal')),opis:secName(q.section)+' · '+q.source+' · '+q.tags.join(', '),powody:q.reasons.map(r=>r.label),propozycja:q.status==='proposal'})),
      sekcje:s.sections.slice().sort((a,b)=>a.order-b.order).map(sec=>({id:sec.id,nazwa:sec.name})),formDzial:{id:sectionEdit.id,nazwa:sectionEdit.name,rodzic:sectionEdit.parentId||X0},
      skala:scaleDraft||Object.assign({},s.scaleLabels)};}
  function ustawSzukaj(v){search=v;notify();}
  function ustawFiltr(v){filter=v===X0?'':v;notify();}
  function ustawJson(v){json=v;}
  function formDzial(k,v){sectionEdit[k]=v;}
  function skala(k,v){scaleDraft=scaleDraft||Object.assign({},s.scaleLabels);scaleDraft[k]=v;}
  // ---------- edytor pytania ----------
  function edytor(){if(!draft)return null;const d=draft;return {d:d,dzialy:sections(),mierzone:d.type==='measure',tagi:['fire','water','elec','mech'].map(t=>({t:t,on:d.tags.includes(t)})),legacy:d.legacyKey||''};}
  function brudne(){dirty=true;}
  function typ(v){draft.type=v;if(v==='scale'&&!draft.levels)draft.levels={A:'',B:'',C:'',D:''};dirty=true;notify();}
  function tag(t,on){const i=draft.tags.indexOf(t);if(on&&i<0)draft.tags.push(t);if(!on&&i>=0)draft.tags.splice(i,1);dirty=true;notify();}
  function powodDodaj(){draft.reasons.push({id:uid(),label:'',text:''});dirty=true;notify();}
  function powodUsun(i){draft.reasons.splice(i,1);dirty=true;notify();}
  function zapiszPytanie(){const d=structuredClone(draft);if(d.type==='measure')for(const k of ['min','max'])d[k]=d[k]===''||d[k]==null?null:Number(d[k]);return run(async()=>{await change(state=>{if(state.questions.some(q=>q.id===d.id))Q.editQuestion(state,d.id,d);else state.questions.push(Q.question(d));});draft=null;message=L('Zapisano pytanie.','Question saved.');});}
  // ---------- zakładki i lista ----------
  async function zakladka(name){if(!await allowed())return;tab=name;draft=null;dirty=false;profile=null;report=null;notify();}
  async function wroc(){if(!await allowed())return;draft=null;dirty=false;notify();}
  async function nowe(){if(!await allowed())return;if(!s.sections.length){msg(L('Najpierw dodaj dział.','Add a section first.'));return;}draft={id:uid(),section:filter||s.sections[0].id,text:'',type:'pass',status:'proposal',source:'Grzegorz',tags:[],reasons:[],ok:'',fail:''};dirty=false;notify();}
  async function edytuj(id,kopia){if(!await allowed())return;draft=structuredClone(s.questions.find(q=>q.id===id));if(kopia){draft.id=uid();draft.status='proposal';delete draft.legacyKey;delete draft.builtinForm;}if(draft.type==='measure')for(const k of ['min','max'])draft[k]=draft[k]??'';dirty=false;notify();}
  function zatwierdz(id){return run(async()=>{await change(state=>Q.editQuestion(state,id,{status:'approved'}));message=L('Zatwierdzono. Wybierz pytanie w zakładce Inspekcje — nie przypisano go automatycznie.','Approved. Choose the question in the Inspections tab — it was not assigned automatically.');});}
  async function usun(id){const uses=Object.values(s.selections).filter(c=>c.items.some(i=>i.questionId===id)).length;if(await ask(L('Usunąć pytanie? Użyte w '+uses+' inspekcjach. Usuniemy je z tych wyborów.','Delete question? Used in '+uses+' inspections. It will be removed from those selections.'),{ok:L('Usuń','Delete'),niebezpieczne:true}))return run(async()=>{await change(state=>{state.questions=state.questions.filter(q=>q.id!==id);for(const c of Object.values(state.selections))c.items=c.items.filter(i=>i.questionId!==id);});});}
  // ---------- działy i skala ----------
  function dzialEdytuj(id){const sec=s.sections.find(x=>x.id===id);sectionEdit={id:sec.id,name:sec.name,parentId:sec.parentId||''};notify();}
  function dzialZapisz(){const section={id:sectionEdit.id||uid(),name:sectionEdit.name,parentId:sectionEdit.parentId===X0?'':sectionEdit.parentId,order:s.sections.length};return run(async()=>{await change(state=>{const old=state.sections.find(x=>x.id===section.id);if(old)Object.assign(old,{name:section.name,parentId:section.parentId});else state.sections.push(section);});sectionEdit={id:'',name:'',parentId:''};});}
  function dzialRuch(id,gora){return run(async()=>{await change(state=>{const current=state.sections.find(x=>x.id===id),list=state.sections.filter(x=>x.parentId===current.parentId).sort((a,b)=>a.order-b.order),i=list.indexOf(current),j=i+(gora?-1:1);if(j<0||j>=list.length)return;[list[i],list[j]]=[list[j],list[i]];list.forEach((x,n)=>x.order=n);});});}
  async function dzialUsun(id){if(s.questions.some(q=>q.section===id)||s.sections.some(sec=>sec.parentId===id)){msg(L('Najpierw przenieś pytania i poddziały.','Move the questions and subsections first.'));return;}if(await ask(L('Usunąć pusty dział?','Delete the empty section?'),{ok:L('Usuń','Delete'),niebezpieczne:true}))return run(async()=>{await change(state=>state.sections=state.sections.filter(x=>x.id!==id));});}
  function skalaZapisz(){const labels=Object.assign({},scaleDraft||s.scaleLabels);return run(async()=>{await change(state=>state.scaleLabels=labels);scaleDraft=null;});}
  // ---------- kopia i propozycje ----------
  function podgladImportu(){try{showImport(JSON.parse(json));}catch(e){msg(e.message);}}
  function showImport(raw){proposal=raw;picked=null;replace=false;if(raw.format===Q.PROPOSAL){preview=Q.proposalPreview(s,raw);picked=new Set(preview.filter(p=>!p.duplicate).map(p=>p.index));}else{raw.__check=A.checkBackup(raw);}notify();}
  function importDane(){if(!proposal)return null;if(proposal.format===Q.PROPOSAL)return {rodzaj:'propozycje',wiersze:preview.map(p=>({index:p.index,tekst:p.name+' · '+p.question.text,duplikat:p.duplicate,opis:p.question.source+' · '+L('sugerowane: ','suggested: ')+p.question.suggestedFor.join(', '),tresc:p.question.type==='pass'?p.question.ok+' / '+p.question.fail:p.question.type==='scale'?Object.values(p.question.levels).join(' / '):p.question.template,wybrany:picked.has(p.index)}))};const c=proposal.__check;return {rodzaj:'kopia',pytan:c.questions.length,dzialow:c.sections.length,zastap:replace};}
  function importWybierz(index,on){if(on)picked.add(index);else picked.delete(index);notify();}
  function importZastap(on){replace=on;notify();}
  function importAnuluj(){proposal=null;picked=null;notify();}
  function importPropozycje(){const chosen=Array.from(picked),raw=structuredClone(proposal);return run(async()=>{const result=await A.change(state=>Q.importProposals(state,raw,chosen,chosen));s=A.get();proposal=null;message=L('Dodano '+result.added+' propozycji. Nie przypisano do inspekcji.','Added '+result.added+' proposals. Not assigned to inspections.');});}
  async function importKopia(){const raw=structuredClone(proposal);delete raw.__check;if(replace&&!await ask(L('Zastąpić całą bazę bieżącego konta?','Replace the current account\'s whole library?'),{ok:L('Zastąp','Replace'),niebezpieczne:true}))return;return run(async()=>{await A.importBackup(raw,replace);s=A.get();proposal=null;message=L('Zaimportowano bazę.','Library imported.');});}
  // plik kopii / propozycji: okno wyboru pliku otwiera moduł (w szablonie Ionic nie ma pola pliku)
  function plikWybierz(){if(busy)return;const input=document.createElement('input');input.type='file';input.accept='application/json,.json';input.onchange=()=>{const f=input.files[0];if(f)run(async()=>{if(f.size>20*1024*1024)throw Error('QUESTIONS_IMPORT_SIZE');showImport(JSON.parse(await f.text()));});};input.click();}
  function eksport(){return run(async()=>{const result=await w.OESTKeys.saveJSONFile(await A.exportJSON(),'questions');message=result.saved?L('Zapisano kopię pytań.','Question backup saved.'):L('Przygotowano kopię JSON. Sprawdź plik.','JSON backup prepared. Check the file.');});}
  // ---------- inspekcje ----------
  function makeProfile(){const t=P.tasks.find(t=>t.id===taskId);profile=structuredClone(s.selections[taskId]||{title:t?.name||'',scope:'',filePattern:'KOD DDMMRRRR',items:[]});}
  function entryFor(q){return profile.items.find(i=>i.questionId===q.id);}
  function pole(q,entry){return Object.assign({},q,entry&&entry.reportOverride);}
  function plik(){try{const copy=structuredClone(s);copy.selections[taskId]=profile;const f=Q.formFor(copy,P,taskId);return L('Dziś:','Today:')+' '+(f?.fileName||profile.filePattern.replaceAll('KOD',taskId).replaceAll('DDMMRRRR',Q.localDate().split('-').reverse().join('')));}catch(e){return e.message;}}
  function inspekcje(){if(!s)return null;if(!taskId||!P.tasks.some(t=>t.id===taskId))taskId=P.tasks[0].id;if(!profile)makeProfile();const task=P.tasks.find(t=>t.id===taskId);
    const head={zadanie:taskId,zadania:P.tasks.map(t=>({id:t.id,nazwa:t.id+' · '+t.name})),tylkoOdczyt:task.form==='tempTB'};if(head.tylkoOdczyt)return head;
    const status=!profile.items.length?(P.forms[task.form]?L('Formularz wbudowany','Built-in form'):L('Do konfiguracji','To configure')):L('Wybrano ','Selected ')+profile.items.length+' '+L('pytań','questions');
    return Object.assign(head,{status:status,profil:profile,plik:plik(),kopiuj:P.tasks.filter(t=>t.id!==taskId&&t.form!=='tempTB').map(t=>({id:t.id,nazwa:t.name})),przywroc:!!(P.forms[task.form]&&(P.forms[task.form].checks||[]).length),
      dzialy:Q.orderedSections(s).map(sec=>{const qs=s.questions.filter(q=>q.section===sec.id).sort((a,b)=>{const x=profile.items.findIndex(i=>i.questionId===a.id),y=profile.items.findIndex(i=>i.questionId===b.id);return (x<0?100000:x)-(y<0?100000:y);});
        return {id:sec.id,nazwa:sec.name,wybrano:profile.items.filter(i=>qs.some(q=>q.id===i.questionId)).length,wiersze:qs.map(wiersz)};})});}
  function wiersz(q){const e=entryFor(q),r={id:q.id,tekst:q.text+(q.status==='proposal'?' · '+L('PROPOZYCJA','PROPOSAL'):''),wybrany:!!e,zablokowany:q.status==='proposal'&&!e,typ:q.type};if(!e)return r;r.entry=e;r.przypiety=!!e.pinned;
    if(q.type==='measure'){r.jednostka=e.unit??q.unit??'';r.min=e.min??q.min??'';r.max=e.max??q.max??'';}
    else{r.domyslna=e.default||X0;r.opcje=[[X0,L('Bez domyślnej','No default')],...(q.type==='pass'?[['ok','OK'],['fail',L('Nie OK','Not OK')],['na','N/A']]:['A','B','C','D','NA'].map(k=>[k,k+' '+s.scaleLabels[k]]))];}
    r.nadpisanie=!!e.reportOverride;r.pola=e.reportOverride||null;return r;}
  async function zadanie(id){if(id===taskId)return taskId;if(dirty&&!await ask(L('Odrzucić niezapisany wybór?','Discard the unsaved selection?'),{ok:L('Odrzuć','Discard'),niebezpieczne:true})){notify();return taskId;}taskId=id;profile=null;dirty=false;report=null;notify();return taskId;}
  function profilPole(k,v){profile[k]=v;dirty=true;notify();}
  function wybierz(id,on){const q=s.questions.find(q=>q.id===id);if(on&&q.status==='approved'&&!entryFor(q))profile.items.push(q.type==='measure'?{questionId:q.id,pinned:false,unit:q.unit}:{questionId:q.id,pinned:false,default:null});else if(!on)profile.items=profile.items.filter(i=>i.questionId!==q.id);dirty=true;notify();}
  function wpis(id,k,v){const e=profile.items.find(i=>i.questionId===id);if(k==='pinned')e.pinned=!!v;else if(k==='unit')e.unit=v;else if(k==='default')e.default=v===X0?null:v;else if(k==='min'||k==='max'){if(v===''||v==null)delete e[k];else e[k]=Number(v);}dirty=true;notify();}
  function nadpisanie(id,on){const q=s.questions.find(q=>q.id===id),e=profile.items.find(i=>i.questionId===id);if(!on)delete e.reportOverride;else e.reportOverride=q.type==='pass'?{ok:q.ok||'',fail:q.fail||''}:q.type==='scale'?{levels:Object.assign({A:'',B:'',C:'',D:''},q.levels)}:{template:q.template||'',threshold:q.threshold||'',reportLabel:q.reportLabel||''};dirty=true;notify();}
  function ruch(id,gora){const entry=profile.items.find(i=>i.questionId===id),sec=s.questions.find(q=>q.id===id).section,list=profile.items.filter(i=>s.questions.find(q=>q.id===i.questionId)?.section===sec),n=list.indexOf(entry),other=list[n+(gora?-1:1)];if(other){const i=profile.items.indexOf(entry),j=profile.items.indexOf(other);[profile.items[i],profile.items[j]]=[profile.items[j],profile.items[i]];}dirty=true;notify();}
  async function kopiuj(id){if(dirty&&!await ask(L('Zastąpić niezapisany wybór?','Replace the unsaved selection?'),{ok:L('Zastąp','Replace'),niebezpieczne:true}))return;const source=s.selections[id];if(!source){msg(L('Wybrana inspekcja nie ma własnego zestawu.','The chosen inspection has no own set.'));return;}profile.items=structuredClone(source.items);dirty=true;message=L('Skopiowano pytania i ich ustawienia. Tytuł/nazwa pliku pozostają dla bieżącej inspekcji. Zapisz wybór.','Questions and their settings copied. Title/file name stay for the current inspection. Save the selection.');notify();}
  async function przywroc(){if(await ask(L('Przywrócić wybór i metadane wbudowane? Wspólne edycje treści pytań pozostaną.','Restore the built-in selection and metadata? Shared edits of question text stay.'),{ok:L('Przywróć','Restore'),niebezpieczne:true}))return run(async()=>{await change(state=>Q.restore(state,P,taskId));profile=structuredClone(s.selections[taskId]);});}
  function raport(){const copy=structuredClone(s);copy.selections[taskId]=profile;try{Q.validate(copy,P);report=Q.preview(copy,P,taskId);notify();}catch(e){msg(e.message);}}
  function zapiszWybor(){const config=structuredClone(profile),id=taskId;return run(async()=>{await change(state=>state.selections[id]=config);profile=structuredClone(s.selections[id]);message=L('Zapisano wybór. Formularze nie zostały zmienione.','Selection saved. Forms were not changed.');});}
  w.OESTQuestionsUI={open,close,canLeave,dane,baza,edytor,inspekcje,brudne,typ,tag,powodDodaj,powodUsun,zapiszPytanie,zakladka,wroc,nowe,edytuj,zatwierdz,usun,dzialEdytuj,dzialZapisz,dzialRuch,dzialUsun,skalaZapisz,podgladImportu,importWybierz,importZastap,importAnuluj,importPropozycje,importKopia,plikWybierz,eksport,zadanie,profilPole,wybierz,wpis,nadpisanie,ruch,kopiuj,przywroc,raport,zapiszWybor,ustawSzukaj,ustawFiltr,ustawJson,formDzial,skala,X0,sekcjaPole:pole};
  w.addEventListener('beforeunload',e=>{if(zywy&&dirty){e.preventDefault();e.returnValue='';}});
})(window);
