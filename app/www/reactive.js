/* Reactive – dane i reguły ekranów Reactive (lista, karta zlecenia, kreator, podgląd raportu, drzewko, historia, ustawienia).
   Ekrany rysuje Vue (moduly/szkielet/src/ekrany/Reactive.vue, Grzegorz 23/11/2026: apka = moduły podpięte do wspólnych części);
   tu tylko zwykłe obiekty i akcje – ekran niczego nie liczy:
     OESTReactiveUI.dane()            → { ekran, tytul, naglowek, komunikat, … } dla bieżącej trasy (zdarzenie oest:reactive-ui = nowe dane)
     OESTReactiveUI.wejdz(trasa)      → ekran Vue pojawił się na trasie (otwiera zlecenie / listę)
     OESTReactiveUI.akcja(nazwa, x)   → to, co dawniej robił przycisk data-rx (x = { id, value, status, phase, i })
     OESTReactiveUI.pole(klucz, w)    → wpisane pole karty (zapis szkicu jak dotąd)
     OESTReactiveUI.wstecz()          → strzałka / Wstecz telefonu (podgląd, kreator, niezapisane): false = zostań, true = rodzic (trasę liczy rama)
     OESTReactiveUI.info(klocek), .notatki(start|end), .wyslijTeraz(), .przyjmijZdjecia(pliki, faza, zGalerii) */
(function(w){
  'use strict';const C=w.OESTReactiveCore,T=w.OESTReactiveTree,K=w.OESTKreator,lang=()=>w.OESTBledy?w.OESTBledy.lang():'pl',L=(pl,en)=>w.OESTT(pl,en),tl=x=>T.label(x,lang()),tp=s=>(lang()==='en'&&T.EN[s])||s,repo=w.OESTHandover.repository;
  let navigate=()=>{},route='reactive',data=null,draft=null,account='',busy=false,writing=0,error=false,chain=Promise.resolve(),pendingMedia=new Map(),epoch=0,pristine='';
  /* stan ekranu dla Vue: komunikat pod ekranem, zdjęcia i nagrania karty (adresy blob), liczniki zwiniętych sekcji, akapity podglądu */
  let komunikat='',blad='',zamieniam='',dowody={before:[],after:[],audio:[],zamkniete:false},urlMap=new Map(),licz={start:'',end:'',rec:''},zamkn={start:0,end:0},akapity=[],enRap={klucz:'',tekst:''};
  function emit(){w.dispatchEvent(new CustomEvent('oest:reactive-ui'));}
  const statuses=()=>Object.entries(C.labels).filter(([id])=>id!=='completed');const isComplete=()=>route.startsWith('reactive/complete/'),isForm=()=>!!draft&&/reactive\/(new|draft|job|complete)\//.test(route);
  function ensure(){if(account!==w.OESTSettings.get().owner)throw Error('ACCOUNT_CHANGED');}
  function message(text){komunikat=text||'';w.OESTOkna?.toast?.(komunikat);emit();}
  function cleanup(){urlMap.forEach(u=>URL.revokeObjectURL(u));urlMap=new Map();dowody={before:[],after:[],audio:[],zamkniete:false};}
  let wybieranieZdjec=false;
  function wyborZdjec(on){wybieranieZdjec=!!on;}
  function canLeave(){if(wybieranieZdjec||recBusy()||busy||writing){message(L('Zaczekaj na zapis lub zatrzymaj nagranie.','Wait for saving or stop the recording.'));return false;}if(error){message(L('Nie zapisano szkicu. Ponów zapis przed wyjściem.','Draft not saved. Save again before leaving.'));return false;}cleanup();return true;}
  async function run(fn){if(busy)return;busy=true;try{ensure();await chain.catch(()=>{});await fn();}catch(e){message(L('Nie wykonano: ','Not done: ')+(w.OESTBledy?w.OESTBledy.text(e):e.message));}finally{busy=false;}}
  /* jak run, ale błąd wraca do przycisku akcji (czesci/Akcja.vue: kółko → zwykły napis) */async function runP(fn){if(busy)throw Error('BUSY');busy=true;try{ensure();await chain.catch(()=>{});return await fn();}catch(e){message(L('Nie wykonano: ','Not done: ')+(w.OESTBledy?w.OESTBledy.text(e):e.message));throw e;}finally{busy=false;}}
  function collect(){if(!draft)return;if(!draft.reportEdited)draft.reportText='';/* tekst automatyczny zawsze od nowa, także gdy pole raportu jest zwinięte; wpisane pola są już w szkicu (pole()) */if(draft.title)draft.uiTitle='';}
  /* pole karty wpisane na ekranie: od razu w szkicu i zapis jak dawniej (oninput → persist) */const POLA=new Set(['title','orderDate','level','room','flat','note','endNote','recNote','closingText','reportText','partsNote','expectedDate','quote','problem']);
  /* wysłane do Vantify = zablokowane (Grzegorz 26/11/2026): pola zlecenia po założeniu, „Co zrobione” i Rekomendacja po wysłaniu notatek */
  const ZLECENIE=new Set(['title','orderDate','level','room','flat','note','problem']);
  function zablokowane(k){const s=vtSent();return ZLECENIE.has(k)?!!s.zlecenie:k==='endNote'?!!s.notatki.done:k==='recNote'?!!s.notatki.rec:false;}
  function pole(k,v){if(!draft||!POLA.has(k)||zablokowane(k))return;if(k==='closingText')draft.closingEdited=true;if(k==='reportText')draft.reportEdited=true;draft[k]=k==='quote'?!!v:String(v==null?'':v);persist();}
  function persist(readFields=true){if(!draft)return Promise.resolve();if(readFields)collect();const snapshot=structuredClone(draft),owner=account;writing++;message(L('Zapis szkicu…','Saving draft…'));chain=chain.catch(()=>{}).then(async()=>{if(owner!==w.OESTSettings.get().owner)throw Error('ACCOUNT_CHANGED');const media=[...pendingMedia.values()];await repo.saveReactiveDraft(snapshot,media);media.forEach(m=>pendingMedia.delete(m.id));error=false;}).catch(e=>{error=true;message(L('Nie zapisano szkicu: ','Draft not saved: ')+(w.OESTBledy?w.OESTBledy.text(e):e.message));throw e;}).finally(()=>{writing--;if(!writing&&!error)message(L('Szkic zapisany na telefonie.','Draft saved on the phone.'));});chain.catch(()=>{});return chain;}
  /* stare nagrania (sprzed 09/11/2026) zostają z „Na tekst”; nowe notatki – moduly/notatki (pasek #rxNotes) */const voice=w.OESTVoice.create({maxMs:30000,onError:e=>message(e.message)}),recBusy=()=>voice.busy||!!w.OESTNotatki?.busy?.(),ntScope=()=>draft?'rx|'+(draft.draftId||draft.jobId):'',ntEnd=()=>{const k=ntScope();return k?k+'|end':'';},ntRec=()=>{const k=ntScope();return k?k+'|rec':'';};
  /* Lista jak w inspekcjach (02/11/2026): niskie klocki, pasek statusu, budynek, typ, kto, miniatura */
  const STC={open:'#ff8a3d',parts:'#a371f7',contractor:'#e5534b',access:'#3b8eea',monitoring:'#e3b341',completed:'#3fb27f'},BLD={'Tower A':'TA','Tower B':'TB','Pavilion':'P','Premises':'Site'};
  const TYPE_ICON={Repair:'🔧',Fix:'🛠️',Replace:'♻️',Transfer:'🚚',Move:'📦'};
  /* Konfiguracja Reactive (⚙): osoby, działy, typy zleceń — na tym telefonie */
  const CFG_KEY='oest.reactive.config',CFG_DEF={people:[],departments:['General request','Building manager','Manager','Tenant','Cleaning','Security'],types:['Repair','Fix','Replace','Transfer','Move']};
  // Osoby i działy żyją w jednej liście w Ustawieniach → Zespół i kontakty (07/11). Stara lista z ⚙ Reactive przenoszona raz.
  function moveWho(){const S=w.OESTSettings;if(!S?.people)return;let owner='';try{owner=S.get().owner;}catch(e){return;}const flag='oest.people.moved.'+owner;try{if(localStorage.getItem(flag))return;}catch(e){return;}
    const c=cfg();try{c.people.forEach(n=>S.addEntry('person',n));c.departments.concat(['Reception','General staff']).forEach(n=>S.addEntry('department',n));localStorage.setItem(flag,'1');}catch(e){}}
  function who(){const c=cfg();try{return Object.assign(c,w.OESTSettings.people());}catch(e){return c;}}
  function cfg(){try{const c=JSON.parse(localStorage.getItem(CFG_KEY)||'null');if(c&&Array.isArray(c.people)&&Array.isArray(c.departments)&&Array.isArray(c.types))return c;}catch(e){}return structuredClone(CFG_DEF);}
  let listFilter='active',openRow='';
  /* klocek (08/11/2026): Reactive na KLOCKU INSPEKCJI (moduly/klocek OESTKlocek.inspekcja) – te same stałe miejsca co lista PPM, bez nowego układu.
     Pigułka statusu ma 5 trybów (moduly/znacznik); statusy Reactive (reactive-core.js) zostają bez zmian, na pigułce tylko ich odpowiednik:
     Otwarte/Obserwacja → W trakcie · Czeka na części/podwykonawcę/dostęp → Wstrzymana · Zakończone → Gotowa · szkic → „– – – –”.
     Linia 2: lokalizacja (TB/L5), częstotliwość pusta (Reactive jej nie ma), formularz niewymagany. Linia 3: data zlecenia, zdjęcia przed+po, pytania „–”.
     Pełny status, kto zlecił i notatki głosowe – w oknie po przytrzymaniu klocka (jak w PPM). */
  const RX_TRYB={open:'wtrakcie',monitoring:'wtrakcie',parts:'wstrzymana',contractor:'wstrzymana',access:'wstrzymana',completed:'gotowa',draft:'nierozpoczeta'};
  function rxLoc(b,l){const t=BLD[b]||'';if(!t||t==='Site')return t;const lv=!l?'':/^\d+$/.test(l)?'L'+l:l==='Roof'?'R':l==='Ground'?'G':l==='First'?'L1':l;return t+(lv?'/'+lv:'');}
  function rxDate(r,at){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(r.orderDate||'');if(m)return new Date(+m[1],+m[2]-1,+m[3]);const d=at?new Date(at):null;return d&&!isNaN(d)?new Date(d.getFullYear(),d.getMonth(),d.getDate()):null;}
  const RX_IKONY_PIGULKA=f=>[{rodzaj:'czest',sama:true},{rodzaj:'dokument',sama:true,ton:f}];
function rxPhotos(r){return (r.beforeMediaIds||[]).length+(r.afterMediaIds||[]).length;}
/* status zlecenia w Vantify słowami jak w Vantify (Grzegorz 26/11/2026 17:17: na klocku w miejscu typu pracy, „Vantify: Completed”); bez numeru – '' */
const VT_NAZWY={approval_pending:'Pending approval',extension_pending:'Extension pending',acknowledged:'Acknowledged',commenced:'Commenced',completed:'Completed',open:'Open'};
function rxVantify(r){const v=r&&r.vantify;if(!v||!v.id)return '';const st=v.final||v.closedAt?'Completed':VT_NAZWY[v.status]||String(v.status||'').replace(/_/g,' ').replace(/^./,c=>c.toUpperCase());return st?'Vantify: '+st:'Vantify #'+v.id;}
/* kolejność na liście (Grzegorz 26/11/2026 16:47): zakończone, niezakończone, pending (czeka w Vantify) */
function rxKolejnosc(r,done){const v=r&&r.vantify||{};if(done||v.final||v.closedAt)return 0;return /pending/.test(String(v.status||''))?2:1;}
  /* klocek = czesci/Klocek.vue (ten sam co w Inspekcjach): dane w kształcie części; kolor paska z lewej = status (data-grupa) */
  const RX_GRUPA={open:'otwarte',parts:'sub',contractor:'fire',access:'water',monitoring:'elec',completed:'mech',draft:'szkic'};
  function card(o){const d=rxDate(o.r,o.at),t=d&&w.OESTKlocek?w.OESTKlocek.termin(d,null,true):{text:'–',tone:''};
    return {id:o.id,rx:o.action,grupa:RX_GRUPA[o.st]||'szkic',nazwa:o.name,znak:rxLoc(o.r.building,o.r.level),opis:rxVantify(o.r),czestotliwosc:null,formularz:'',status:{tryb:RX_TRYB[o.st]||'nierozpoczeta'},termin:{tekst:t.text,ton:t.tone},ikony:[{rodzaj:'zdjecia',n:Math.min(rxPhotos(o.r),99)},{rodzaj:'pytania',n:'–'},...RX_IKONY_PIGULKA('brak')]/* puste miejsce usterek (Reactive ich nie ma) oddane na te dwie ikony *//* częstotliwość i formularz w linii 3 pod pigułką (Grzegorz 26/11/2026 17:33), linia 2 dla statusu Vantify */,akcja:o.action==='draft'?L('Kontynuuj','Continue'):L('Otwórz','Open')};}
  function jobCard(job){const r=job.reactive||{},st=C.status(job);
    return card({action:'job',id:job.id,r,at:job.createdAt,st,color:STC[st]||'#8b949e',icon:TYPE_ICON[r.jobType]||'📝',name:job.text||L('Zadanie','Job'),loc:[r.level,r.room].filter(Boolean).join(' · ')||(r.building==='Premises'?'':job.location)||''});}
  function draftCard(d){return card({action:'draft',id:d.draftId,r:d,at:d.createdAt,st:'draft',color:'#8b949e',icon:'📝',name:d.title||d.uiTitle||L('Nowe zadanie','New job'),loc:[d.level,d.room].filter(Boolean).join(' · ')});}
  // okno informacji po przytrzymaniu klocka – to samo okno co w PPM (czesci/InfoInspekcji.vue): { tytul, wiersze: [{ ikona, czesci: [{ t, b }] }] }
  function info(k){if(!k||!data)return null;const isDraft=k.rx==='draft',job=isDraft?null:data.jobs.find(j=>j.id===k.id),r=isDraft?data.reactiveDrafts?.[k.id]:job&&{...(job.reactive||{}),title:job.text};if(!r)return null;
    const d=rxDate(r,isDraft?r.createdAt:job.createdAt),day=d?w.OESTNarzedzia.data(d):'',st=isDraft?L('Szkic','Draft'):C.uiLabel(C.status(job))+(r.temporary?L(' · tymczasowa naprawa',' · temporary repair'):''),
      where=[r.building,r.level,r.room].filter(Boolean).join(', ')||(!isDraft&&job.location)||''/* zadanie z Handover: lokalizacja tylko w job.location (uwaga Codex w PR #103) */,nv=(r.audioMediaIds||[]).length;
    const rows=[{ikona:'lok',czesci:[{t:where||L('Lokalizacja nieprzypisana','No location assigned')}]},
      {ikona:'termin',czesci:day?[{t:L('Zlecono ','Ordered ')},{t:day,b:true}]:[{t:L('Brak daty','No date')}]},
      {ikona:'zdjecia',czesci:[{t:L('Zdjęcia przed ','Photos before ')},{t:String((r.beforeMediaIds||[]).length),b:true},{t:' · '+L('po ','after ')},{t:String((r.afterMediaIds||[]).length),b:true}]},
      {ikona:'',czesci:[{t:L('Status: ','Status: ')},{t:st,b:true}]}];
    if(r.requestedBy)rows.push({ikona:'',czesci:[{t:L('Kto zlecił: ','Requested by: ')},{t:C.whoLabel(r),b:true}]});
    if(nv)rows.push({ikona:'',czesci:[{t:L('Notatki głosowe: ','Voice notes: ')},{t:String(nv),b:true}]});
    return {tytul:r.title||r.uiTitle||L('Zadanie','Job'),wiersze:rows};}
  function home(){const all=data.jobs,active=all.filter(j=>j.status!=='fixed'),done=all.filter(j=>j.status==='fixed'),loose=Object.values(data.reactiveDrafts||{}).filter(d=>!d.jobId&&d.draftId);
    const list=listFilter==='done'?done:listFilter==='all'?all:active,showDrafts=listFilter!=='done';
    const filtry=[['active',L('Aktywne','Active')+' ('+(active.length+loose.length)+')'],['done',L('Zakończone','Completed')+' ('+done.length+')'],['all',L('Wszystkie','All')]].map(([id,nazwa])=>({id,nazwa}));
    const rk=j=>rxKolejnosc(j.reactive,j.status==='fixed'),klocki=list.slice().sort((a,b)=>rk(a)-rk(b)||String(b.createdAt).localeCompare(String(a.createdAt))).map(j=>jobCard(j));if(showDrafts){const at=klocki.findIndex((k,i)=>rk(list.find(j=>j.id===k.id))>0);klocki.splice(at<0?klocki.length:at,0,...loose.map(draftCard));}/* szkice bez zapisu = niezakończone, na początku tej grupy */
    return {ekran:'lista',tytul:'Reactive',nowe:L('＋ Nowe zadanie','＋ New job'),filtry,filtr:listFilter,klocki};}
  function tree(id){const result=C.find(id)||C.find('root'),node=result.node;return {ekran:'drzewo',tytul:node.id==='root'?L('Nowe zadanie','New job'):tl(node),gotowce:node.id==='root'?{tytul:L('GOTOWCE','QUICK PICKS'),kafelki:T.presets.map(p=>({id:p.id,tytul:tl(p),rx:'preset'})),wszystkie:L('WSZYSTKIE KATEGORIE','ALL CATEGORIES')}:null,sciezka:[...result.path.filter(p=>p!=='Reactive'),node.label].filter(x=>x!=='Reactive').map(tp).join(' › '),kafelki:node.children.map(child=>({id:child.id,tytul:tl(child),rx:child.children?'tree':'preset'}))};}
  /* Ekran zadania jak inspekcja: klocki z drzewka składają opis, zdjęcia, notatka, status; na dole Odłóż / Wyślij do siebie. */
  const requesters=()=>[['manager',L('Mój manager','My manager')],['building','Building manager'],['tenant',L('Najemca','Tenant')],['other',L('Inny','Other')]];
  function crumbs(id){const r=C.find(id);return r?[...r.path,r.node.label].filter(x=>x&&x!=='Reactive').map(tp):[];}
  function blocks(){const leaf=C.find(draft.problemId)?.node,picked=leaf&&!leaf.children;
    if(picked)return {wybrany:{etykieta:L('Co się dzieje','What is happening'),tekst:'✓ '+crumbs(draft.problemId).join(' › '),opisEtykieta:L('Opis do raportu (EN) — możesz poprawić','Report description (EN) — you can edit'),opis:draft.problem||''}};
    const at=C.find(draft.treeAt||'root')?.node||T.tree,path=crumbs(at.id);
    return {etykieta:L('Co się dzieje — jedno dotknięcie','What is happening — one tap'),gotowce:at.id==='root'?{tytul:L('Gotowce','Quick picks'),opcje:T.presets.map(p=>({id:p.id,nazwa:tl(p)})),wszystkie:L('Wszystkie kategorie','All categories')}:null,
      gora:at.id==='root'?null:{id:at.id,nazwa:'‹ '+(path.join(' › ')||L('Początek','Start'))},dzieci:at.children.map(c=>({id:c.id,nazwa:tl(c)+(c.children?' ›':''),wezel:!!c.children}))};}
  /* Podsumowanie przed zbudowaniem dokumentu (Grzegorz 02/11): co mniej więcej będzie w raporcie */
  let zakladka='zlecenie',preview=false,kr=null,reviewDone=null,reviewView=null,sumAssets=null;
  /* KREATOR OPISU (Grzegorz 18/11/2026 „Tak, ruszaj”, PROD-039): okno na cały ekran – kafelki grup → pozycje z checkboxami (kilka naraz),
     najczęstsze na górze, „＋ Dodaj” własną. Wybory w draft.kreator, typ pracy w draft.jobType; teksty EN składa moduł OESTKreator. */
  const KR_KEY='oest.reactive.kreator';
  function krData(){try{const x=JSON.parse(localStorage.getItem(KR_KEY)||'null');if(x&&typeof x==='object')return {stats:x.stats||{},added:x.added||{}};}catch(e){}return {stats:{},added:{}};}
  function krSave(x){try{localStorage.setItem(KR_KEY,JSON.stringify(x));}catch(e){}}
  function krItems(){return (draft.kreator?.items||[]).slice();}
  function kreator(){const sel=new Set(krItems()),kd=krData(),label=e=>lang()==='en'?e.en:e.pl+' · '+e.en;
    if(!kr.gid)return {ekran:'kreator',tytul:L('Co','What'),podpis:L('Wybierz grupę','Pick a group'),kafelki:K.GROUPS.map(g=>({id:g.id,tytul:L(g.pl,g.en)+(g.items.some(i=>sel.has(i.en))?' ✓':''),rx:'kr-group'})),gotowe:L('Gotowe','Done')};
    const g=K.GROUPS.find(x=>x.id===kr.gid),list=K.ordered(kr.gid,kd.stats,kd.added);
    return {ekran:'kreator-grupa',tytul:L(g.pl,g.en),pozycje:list.map(e=>({id:e.en,nazwa:label(e),on:sel.has(e.en)})),dodaj:L('＋ Dodaj','＋ Add'),grupy:L('‹ Grupy','‹ Groups'),gotowe:L('Gotowe','Done')};}
  /* wybory → opis do raportu (EN) i nazwa zadania, jeśli Grzegorz jej sam nie wpisał */
  /* stare zadanie z drzewka / ręcznym opisem bez kreatora: zostaje dotychczasowa sekcja „Co dokładnie” (PROD-039, przegląd Codex #147) */
  function oldTree(){return !krItems().length&&!!draft.problemId&&(draft.problemId!=='other'||(!!String(draft.problem||'').trim()&&!draft.kreatorAuto));}
  function coInner(){const k=draft.kreator||{},items=krItems();if(!items.length)return {pusto:L('Wybierz z listy','Pick from the list')};
    const ks=K.fromDraft(draft);
    return {pozycje:items.map(i=>'✓ '+i),zmien:L('Zmień','Change'),naCzym:L('Na czym','On what'),powierzchnie:K.SURFACES.map(x=>({id:x.en,nazwa:L(x.pl,x.en),on:k.on===x.en})),
      waga:K.heavy(ks)?{etykieta:L('Waga','Weight'),opcje:[{id:'heavy',nazwa:'Heavy (approx. 60–100 kg)',on:k.weight==='heavy'},{id:'veryHeavy',nazwa:'Very heavy (approx. over 100 kg)',on:k.weight==='veryHeavy'}]}:null,
      bhp:{etykieta:L('Zakończenie BHP w Job Sheet','Safety closing line in the Job Sheet'),on:k.closing!==false},opis:K.description(ks)};}
  function krApply(){const ks=K.fromDraft(draft);if(!ks){if(draft.problemId==='other'&&draft.kreatorAuto){draft.problem='';if(draft.title===draft.kreatorAuto)draft.title='';draft.kreatorAuto='';}return;}
    draft.problemId='other';draft.problem=K.description(ks);const t=K.summary({...ks,where:{}});if(!String(draft.title||'').trim()||draft.title===draft.kreatorAuto)draft.title=t;draft.kreatorAuto=t;draft.uiTitle='';}
  /* okno podsumowania (PROD-039): treść Job Sheet akapitami, każdy do poprawy i z ✕; zmiany = ten sam ręczny tekst raportu (reportText), jedno źródło */
  function summaryText(){return reviewView?reviewView.details:sumReport(draft).details;}
  /* ręcznie wyczyszczony raport zostaje pusty w podsumowaniu (bez cichego powrotu tekstu automatycznego) */
  function sumReport(d){const view=d.pendingActionId?{...d,actionId:d.pendingActionId,reportText:d.reportEdited?d.reportText:''}:d,f=C.report(view,w.OESTSettings.get().profile);return d.reportEdited?{...f,details:String(d.reportText||'')}:f;}
  /* pusty raport: nie wysyłamy i nie zamykamy – tekst automatyczny nie może wrócić po cichu (przegląd Codex #148) */
  function emptyMsg(){return L('Raport nie może być pusty. Wpisz treść albo „Przywróć tekst automatyczny”.','The report cannot be empty. Type the content or use “Restore automatic text”.');}
  function sumEmpty(){if(draft?.reportEdited&&!String(draft.reportText||'').trim()){message(emptyMsg());return true;}return false;}
  function sumLines(t){return String(t||'').split('\n').filter(x=>x.trim());}
  function sumSave(lines){draft.reportText=lines.filter(x=>x.trim()).join('\n');draft.reportEdited=true;if(reviewView)reviewView={...reviewView,details:draft.reportText};persist(false);}
  /* „Zgadzam się, zamknij”: Close Vantify czeka na odpowiedź (reviewDone), zwykłe Zakończ kończy zadanie */
  function review(f){return new Promise(res=>{reviewDone=res;openSummary('close',f).catch(e=>{reviewDone=null;res(false);message(L('Nie wykonano: ','Not done: ')+(w.OESTBledy?w.OESTBledy.text(e):e.message));});});}
  /* podgląd/podsumowanie zawsze po angielsku: te same pola co wysyłany raport (vtEn), logo i zdjęcia jak w PDF */
  /* pola raportu po angielsku dla podglądu, wysyłki i pola „Raport (EN)” (Grzegorz 19/11/2026); starsze nagrania zostają w raporcie, polskie tłumaczone (przegląd Codex #153) */
  async function enVoice(){const ids=draft.audioMediaIds||[],t={};for(const id of ids){const x=String(draft.voiceTexts?.[id]||'').trim();if(x)t[id]=draft.voicePl?.[id]?await vtEnglish(x):x;}return {audioMediaIds:ids,voiceTexts:t,voicePl:{}};}
  async function enFields(day){const f=C.report({...await vtEn(),...await enVoice()},w.OESTSettings.get().profile,day);/* świadomie wyczyszczony raport zostaje pusty, nie wraca tekst automatyczny (przegląd Codex #153) */return draft.reportEdited?{...f,details:String(draft.reportText||'')}:f;}
  async function openSummary(mode,f){message(L('Przygotowuję podgląd po angielsku…','Preparing the English preview…'));f=f||await enFields();const photos=[];for(const phase of ['before','after'])for(const id of draft[phase+'MediaIds']||[]){const m=await repo.media(id);if(m?.kind==='photo'){const u=URL.createObjectURL(m.blob);photos.push({url:u,phase});}}
    sumClear();sumAssets={logo:await w.OESTReactiveReport?.logo?.().catch(()=>'')||'',photos};reviewView=f;akapity=sumLines(f.details);preview=mode;message('');render();}
  function sumClear(){(sumAssets?.photos||[]).forEach(p=>URL.revokeObjectURL(p.url));sumAssets=null;}
  /* Close Vantify: podsumowanie pokazuje dokładnie treść Job Sheet po angielsku i plik PDF */
  async function vtReview(){const f=await enFields((await sheetDays()).end);return review({...f,pdfOnly:true});}
  function reviewEnd(ok){const r=reviewDone;reviewDone=null;reviewView=null;sumClear();preview=false;render();renderEvidence();if(r)r(ok);return !!r;}
  function summary(){const f=reviewView||sumReport(draft),edit=preview!=='view',RR=w.OESTReactiveReport,a=sumAssets||{};
    /* podgląd = kartka raportu jak w PDF, po angielsku (Grzegorz 19/11/2026); akapity do poprawy (edit) zamiast treści */
    return {ekran:'podglad',tytul:L('Podgląd raportu','Report preview'),tryb:preview,podpowiedz:edit?L('Stuknij akapit, żeby poprawić; ✕ usuwa.','Tap a paragraph to edit; ✕ removes.'):'',akapity:edit?akapity.slice():null,usun:L('Usuń','Remove'),
      strona:RR?.dane?RR.dane(f,{logo:a.logo,photos:a.photos}):null,plik:L('Plik: ','File: ')+f.fileName+(reviewView?.pdfOnly?' (.pdf)':' (.docx + .pdf)'),
      przyciski:preview==='close'?[{rx:'preview-back',tekst:L('‹ Popraw','‹ Edit')},{rx:'sum-ok',tekst:L('Zgadzam się, zamknij','I agree, close'),go:true}]:preview==='view'?[{rx:'preview-back',tekst:L('‹ Wróć','‹ Back'),go:true}]:[{rx:'preview-back',tekst:L('‹ Popraw','‹ Edit')},{rx:'send-now',tekst:L('📧 Zbuduj i wyślij','📧 Build and send'),go:true}]};}
  const closedJob=()=>!!draft&&draft.status==='completed'&&!!draft.jobId&&data.jobs.find(j=>j.id===draft.jobId)?.status==='fixed';
  function nagrania(){return dowody.audio.map(a=>({...a,tekst:draft.voiceTexts?.[a.id]||'',ma:!!draft.voiceTexts?.[a.id],przycisk:draft.voiceTexts?.[a.id]?L('↻ Od nowa','↻ Again'):L('📝 Na tekst','📝 To text')}));}
  /* godzina wysłania do Vantify (HH:MM) */const hm=t=>{const x=new Date(t);return isNaN(x)?'':String(x.getHours()).padStart(2,'0')+':'+String(x.getMinutes()).padStart(2,'0');};
  /* zdjęcie wysłane do Vantify: „✓ w Vantify, godzina”, bez usuwania i edycji (Grzegorz 26/11/2026) */
  function zdjecia(){const S=vtSent().zdjecia,oz=l=>l.map(p=>S[p.id]!==undefined?{...p,wyslane:L('✓ w Vantify, ','✓ in Vantify, ')+hm(S[p.id])}:p);return {przed:oz(dowody.before),po:oz(dowody.after),usuwanie:!dowody.zamkniete,edycja:!dowody.zamkniete&&!!w.OESTAparat?.available(),zrob:L('Zrób zdjęcie','Take photo'),galeria:L('Z galerii','From gallery'),etPrzed:L('Przed','Before'),etPo:L('Po','After')};}
  function form(){if(preview)return summary();if(kr&&K)return kreator();const closed=closedJob();
    if(closed)return {ekran:'zamkniete',tytul:draft.title||draft.uiTitle||L('Zadanie','Job'),podpis:L('Zakończone zadanie — historia','Completed job — history'),tekst:draft.reportText||C.details(draft),zdjecia:zdjecia(),nagrania:nagrania(),
      notatki:{start:zamkn.start,end:zamkn.end,etStart:L('📝 Notatki','📝 Notes'),etEnd:L('📝 Notatki na koniec','📝 End notes')},/* zadanie zakończone w apce, a zlecenie w Vantify nadal otwarte: przyciski Vantify zostają (przegląd Codex #146) */vantify:draft.vantify&&w.OESTReactiveVantify?w.OESTReactiveVantify.przyciski(draft,L):null,
      wyslij:L('Wyślij do siebie ponownie','Send to myself again'),powrot:L('Powrót','Back')};
    const c=who(),legacy=requesters(),rb=draft.requestedBy||'';
    const whoItems=[['',[['self',L('Self (proactive) — własna inicjatywa','Self (proactive)')]]],[L('Osoby','People'),c.people.map(x=>[x,x])],[L('Działy','Departments'),c.departments.map(x=>[x,x])]].filter(([,l])=>l.length);
    if(rb&&rb!=='self'&&!c.people.includes(rb)&&!c.departments.includes(rb))whoItems.push([L('Zapisane wcześniej','Saved earlier'),[[rb,legacy.find(([k])=>k===rb)?.[1]||rb]]]);
    const whoTxt=rb==='self'?'Self (proactive)':(legacy.find(([k])=>k===rb)?.[1]||rb);
    const type=K.TYPES.includes(draft.jobType)?draft.jobType:'REPAIR',typeTxt=type+(lang()==='en'?'':' · '+K.TYPE_PL[type]);
    const leaf=draft.problemId?C.find(draft.problemId)?.node:null,treeTxt=leaf&&!leaf.children?crumbs(draft.problemId).join(' › '):'';
    const whereTxt=[BLD[draft.building]||draft.building,draft.level,draft.flat?L('m. ','flat ')+draft.flat:'',draft.room].filter(Boolean).join(' · ');
    const view=draft.pendingActionId?{...draft,actionId:draft.pendingActionId}:draft,sig=JSON.stringify(draft),report=draft.reportEdited?draft.reportText:(enRap.klucz===sig&&enRap.tekst?enRap.tekst:C.details({...view,reportText:''}));
    const act0=T.actions.find(a=>a.id===(draft.pendingActionId||draft.actionId));
    /* układ wg szkicu Grzegorza (18/11/2026): nazwa · DATA+TYP · KTO+GDZIE · CO · PRZED|PO · info na start/koniec; Stan, części, kosztorys pod ⋮ */
    const done=!!draft.pendingActionId,levels=C.levels(draft.building);
    /* ekran zlecenia wariant B (Grzegorz 26/11/2026): 4 zakładki, stały klocek pod nimi, w zakładkach dotychczasowe pola; wysłane do Vantify = zablokowane */
    const S=vtSent(),V=w.OESTReactiveVantify,vb=V?V.przyciski(draft,L):null,
      zab=t=>t?{tekst:L('✓ w Vantify, ','✓ in Vantify, ')+hm(t)}:null,ile=ph=>(draft[ph+'MediaIds']||[]).length,wys=ph=>(draft[ph+'MediaIds']||[]).filter(id=>S.zdjecia[id]).length,
      fotoAll=ile('before')+ile('after'),fotoSent=wys('before')+wys('after'),pelne=['note','endNote','recNote'].filter(k=>String(draft[k]||'').trim()).length,vid=draft.vantify?.id,stan=V?V.state(draft):'none',
      notatka=(id,et,field,hint,sent)=>({id,etykieta:et,pole:field,wartosc:draft[field]||'',podpowiedz:hint,licznik:licz[id]||'',zablokowane:zab(sent)});
    const ZAK=[['zlecenie',L('Zlecenie','Job'),!!S.zlecenie],['zdjecia',L('Zdjęcia','Photos'),fotoAll>0&&fotoSent===fotoAll],['notatki',L('Notatki','Notes'),!!S.notatki.final],['zamkniecie',L('Zamknięcie','Close'),stan==='closed']];
    return {ekran:'karta',tytul:draft.title||draft.uiTitle||L('Nowe zadanie','New job'),naglowek:'more',otwarty:openRow,wybierz:L('Wybierz','Choose'),
      wiecej:openRow==='more'?{etykieta:L('Stan','Condition'),statusy:statuses().map(([id])=>({id,nazwa:C.uiLabel(id),on:draft.status===id})),czesci:draft.status==='parts'?{etCzesci:L('Jakie części?','Which parts?'),partsNote:draft.partsNote||'',etData:L('Oczekiwana data — opcjonalnie','Expected date — optional'),expectedDate:draft.expectedDate||''}:null,quote:{etykieta:L('Quote required — wymagany kosztorys','Quote required'),on:!!draft.quote},odloz:L('Odłóż','Park')}:null,
      zakladki:{aktywna:zakladka,lista:ZAK.map(([id,tekst,wyslane])=>({id,tekst,wyslane}))},
      /* klocek pod zakładkami = ten sam klocek co na liście (Grzegorz 26/11/2026 17:10: „podzielony na pół”): linia 1 nazwa + nr, linia 2 miejsce · status Vantify (bez numeru: typ) + pigułka, linia 3 data, zdjęcia (razem, jak na liście), notatki; Job Sheet = ikona dokumentu w linii 3 pod pigułką; stuknięcie = ⋮ */
      klocek:{id:'karta',grupa:RX_GRUPA[draft.status]||'otwarte',nazwa:draft.title||draft.uiTitle||L('Nowe zadanie','New job'),numer:vid?'#'+vid:L('brak nr','no no.'),znak:rxLoc(draft.building,draft.level),opis:rxVantify(draft)||typeTxt,formularz:'',status:{tryb:'wtrakcie'},termin:{tekst:draft.orderDate?dmy(draft.orderDate):'–',ton:''},
        ikony:[{rodzaj:'zdjecia',n:Math.min(fotoAll,99)/* razem przed i po, jak na liście */},{rodzaj:'notatki',n:pelne},...RX_IKONY_PIGULKA((draft.reportMediaIds||[]).length||draft.vantify?.sheetTitle?'ok':'brak')],akcja:L('Stan, części, kosztorys','Condition, parts, quote')},
      zablokowane:zab(S.zlecenie),
      nazwa:{etykieta:L('Nazwa zadania','Job name'),wartosc:draft.title||'',podpowiedz:L('np. Zepsuty zamek w kuchni','e.g. Broken lock in the kitchen')},
      data:{etykieta:L('Data zlecenia','Order date'),wartosc:draft.orderDate||''},
      typ:{etykieta:L('Typ','Type'),tekst:typeTxt,wartosc:type,opcje:K.TYPES.map(x=>({id:x,nazwa:lang()==='en'?x:x+' · '+K.TYPE_PL[x],on:x===type}))},
      kto:{etykieta:L('Kto zlecił','By who'),tekst:whoTxt,wartosc:rb,grupy:whoItems.map(([g,l])=>({nazwa:g,opcje:l.map(([v,n])=>({id:v,nazwa:n,on:v===rb}))})),dodaj:L('＋ dodaj osobę lub dział','＋ add a person or department')},
      gdzie:{etykieta:L('Gdzie','Where'),tekst:whereTxt,budynki:C.BUILDINGS.map(x=>({id:x,nazwa:x,on:draft.building===x})),pietra:levels.length?levels:null,etPietro:L('Piętro','Floor'),level:draft.level||'',
        etRoom:levels.length?L('Pomieszczenie / obszar','Room / area'):L('Gdzie dokładnie — opcjonalnie','Exact place — optional'),room:draft.room||'',etFlat:L('Nr mieszkania','Flat no.'),flat:draft.flat||''},/* nr mieszkania zawsze widoczny i do poprawy, także po zmianie budynku (przegląd Codex #147) */
      drzewo:oldTree()?{etykieta:L('Co dokładnie','What exactly'),tekst:treeTxt,podpowiedz:L('opcjonalnie','optional'),...blocks()}:null,
      co:oldTree()?null:{etykieta:L('Co','What'),tekst:krItems().join(', '),podpowiedz:L('wybierz','choose'),grupy:K.GROUPS.map(g=>({id:g.id,nazwa:L(g.pl,g.en)})),...coInner()},
      zaloz:vb?vb.open:null,
      zdjecia:zdjecia(),nagrania:nagrania(),wczesniej:L('Wcześniejsze nagrania','Earlier recordings'),
      update:{tekst:'Update',podglad:L('Podgląd przed wysłaniem','Preview before sending'),zdjecia:vid?fotoAll-fotoSent:0,notatki:vid&&!S.notatki.final?1:0},
      start:{...notatka('start',L('Notatka na start','Start note'),'note',L('co zlecono','what was requested'),S.zlecenie),glosTekst:L('Napisz / Nagraj','Write / Record')},
      koncowe:[notatka('end',L('Co zrobione','Work done'),'endNote',L('co zrobiono','what was done'),S.notatki.done),notatka('rec',L('Rekomendacja (opcjonalnie)','Recommendation (optional)'),'recNote',L('co jeszcze trzeba zrobić','what still needs doing'),S.notatki.rec)],
      wyborPracy:{etykieta:L('Praca','Work'),wartosc:draft.workChoice||'',opcje:C.WORK.map(x=>({id:x.id,nazwa:L(x.pl+' · '+x.en,x.en)}))},
      tekstKoncowy:{etykieta:L('Tekst końcowy (Job Sheet)','Closing text (Job Sheet)'),wartosc:draft.closingEdited?draft.closingText||'':C.closingAuto(draft),opcje:[...new Set([C.closingAuto(draft),K.CLOSING,...Object.values(K.CLOSING_ADD)].filter(Boolean))].map(t=>({id:t,nazwa:t})),wlasny:L('Własny tekst — wpisz niżej','Own text — type below')},
      koniec:{etykieta:L('Zakończenie i raport','Finish and report'),tekst:act0?tl(act0):'',podpowiedz:L('gdy skończysz','when you finish'),akcje:T.actions.map(a=>({id:a.id,nazwa:tl(a),on:(draft.pendingActionId||draft.actionId)===a.id})),etRaport:L('Raport (EN) — składa się sam, możesz poprawić','Report (EN) — builds itself, you can edit'),raport:report,podglad:L('Podgląd','Preview'),przywroc:draft.reportEdited?L('Przywróć tekst automatyczny','Restore automatic text'):''},
      zamknij:vb?vb.close:null,usunSzkic:!(draft.vantify&&(draft.vantify.id||draft.vantify.pending))?(draft.jobId?L('Usuń zlecenie','Delete job'):L('Usuń szkic','Delete draft')):''/* usuwanie, dopóki nie poszło do Vantify (Grzegorz 26/11/2026) */,wyslij:L('Wyślij do siebie','Send to myself'),zakoncz:{tekst:L('Zakończ zadanie','Complete job'),go:done}};}
  async function open(next){cleanup();blad='';komunikat='';licz={start:'',end:'',rec:''};zamkn={start:0,end:0};zakladka='zlecenie';preview=false;reviewView=null;sumClear();kr=null;openRow='start';route=next||'reactive';account=w.OESTSettings.get().owner;moveWho();const token=++epoch;try{await chain.catch(()=>{});await repo.adoptLocal().catch(()=>{});data=await repo.get();ensure();if(token!==epoch)return;const [_,mode,id]=route.split('/');if(['new','draft','job','complete'].includes(mode)){if(mode==='draft'){const d=data.reactiveDrafts?.[id];if(!d)throw Error(L('Ten szkic już nie istnieje (zapisany albo usunięty).','This draft no longer exists (saved or deleted).'));draft=structuredClone(d);}else if(mode==='new'){{const problem=id==='blank'?null:C.find(id)?.node;if(id!=='blank'&&(!problem||problem.children))throw Error('REACTIVE_TREE');draft={problemId:problem?id:'',uiTitle:problem?[C.find(id).path.at(-1),problem.label].filter(x=>x&&x!=='Reactive').join(' — '):'',title:problem?.title||'',problem:problem?.sentence||'',building:'Premises',level:'',room:'',note:'',requestedBy:(()=>{const c=who();return c.departments[0]||c.people[0]||'self';})(),jobType:'REPAIR',orderDate:new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10),requestedName:'',status:'open',quote:false,beforeMediaIds:[],afterMediaIds:[],audioMediaIds:[],draftId:crypto.randomUUID(),createdAt:new Date().toISOString()};pristine=JSON.stringify(draft);await persist(false);route='reactive/draft/'+draft.draftId;zamien(route);}}else{const job=data.jobs.find(j=>j.id===id);if(!job)throw Error('JOB_MISSING');draft=data.reactiveDrafts?.[id]?structuredClone(data.reactiveDrafts[id]):C.fromJob(job,data.entries.find(e=>e.id===job.entryId));if(mode==='complete'&&!draft.actionId)draft.reportText='';}}else draft=null;render();await renderEvidence();}catch(e){blad=L('Nie można otworzyć Reactive: ','Cannot open Reactive: ')+(w.OESTBledy?w.OESTBledy.text(e):e.message);render();}}
  /* nowy adres tego samego ekranu (szkic → zapisane zlecenie): ekran Vue rysuje się od nowa pod nowym adresem, ale zlecenie zostaje otwarte */function zamien(r){zamieniam=r;w.OESTEkrany.zamien(r);}
  function wejdz(t){if(t&&t===zamieniam&&t===route){zamieniam='';render();renderEvidence();return;}zamieniam='';open(t);}
  function render(){emit();liczniki();fillEnReport();}
  /* dane bieżącego ekranu dla Vue (zwykły obiekt) */
  function dane(){const part=route.split('/'),x={jezyk:lang(),komunikat};if(blad)return {...x,ekran:'blad',tytul:'Reactive',tekst:blad,powrot:L('Powrót','Back')};if(!data)return {...x,ekran:'laduje',tytul:''};
    const s=part[1]==='tree'?tree(part[2]):part[1]==='history'?{ekran:'historia',tytul:L('Historia','History'),klocki:data.jobs.filter(j=>j.status==='fixed').map(j=>jobCard(j,true)),pusto:L('Brak zakończonych zleceń.','No completed jobs.'),powrot:L('Powrót','Back')}:isForm()?form():draft?{ekran:'laduje',tytul:''}:home();
    return {...x,...s};}
  /* zdjęcia i nagrania karty: adresy blob z magazynu (ten sam adres, dopóki zdjęcie jest na karcie – bez migania) */
  async function renderEvidence(){const token=epoch;if(!draft)return;const closed=closedJob(),nowe=new Map(),ev={before:[],after:[],audio:[],zamkniete:closed};
    for(const phase of ['before','after'])for(const id of draft[phase+'MediaIds']||[]){const m=await repo.media(id);ensure();if(token!==epoch||!draft)return;if(m?.kind!=='photo')continue;const url=nowe.get(id)||urlMap.get(id)||URL.createObjectURL(m.blob);nowe.set(id,url);ev[phase].push({id,url,alt:phase==='before'?L('Zdjęcie przed','Photo before'):L('Zdjęcie po','Photo after')});}
    for(const id of draft.audioMediaIds||[]){const m=await repo.media(id);if(token!==epoch||!draft)return;if(!m)continue;const url=nowe.get(id)||urlMap.get(id)||URL.createObjectURL(m.blob);nowe.set(id,url);ev.audio.push({id,url});}
    urlMap.forEach((u,id)=>{if(!nowe.has(id))URL.revokeObjectURL(u);});urlMap=nowe;dowody=ev;emit();}
  /* zakończone zadanie = historia: notatki tylko do odczytu (odsłuch + PL/EN), bez poprawiania i usuwania (przegląd Codex #113) */
  /* zwinięta sekcja info pokazuje, co ma: „🎤 N” (notatki + dawne nagrania przy starcie) i „📷 N” (zdjęcia przed przy starcie, po przy końcu) – nic się nie chowa bez śladu */
  function liczniki(){if(!draft||!isForm())return;const N=w.OESTNotatki;
    if(closedJob()){for(const id of ['start','end']){const k=id==='start'?ntScope():ntEnd();if(k&&N?.summary)N.summary(k).then(r=>{if(zamkn[id]!==r.all){zamkn[id]=r.all;emit();}},()=>{});}return;}
    for(const id of ['start','end','rec']){const k=id==='start'?ntScope():id==='rec'?ntRec():ntEnd(),old=id==='start'?(draft.audioMediaIds||[]).length:0,ph=id==='rec'?0:(draft[id==='start'?'beforeMediaIds':'afterMediaIds']||[]).length;
      const show=n=>{const t=[n?'🎤 '+n:'',ph?'📷 '+ph:''].filter(Boolean).join(' · ');if(licz[id]!==t){licz[id]=t;emit();}};if(k&&N?.summary)N.summary(k).then(r=>show((r.all||0)+old),()=>show(old));else show(old);}}
  /* notatki zakończonego zadania: tylko odczyt (odsłuch + PL/EN) */function notatkiZamkniete(id){const k=id==='end'?ntEnd():ntScope();if(!k||!w.OESTNotatki)return;w.OESTNotatki.open(k,{title:draft?.title||draft?.uiTitle||'Reactive',readonly:true}).then(liczniki);}
  /* pole „Raport (EN)” pokazuje tekst po angielsku (to samo co podgląd i wysyłka), nie polski z pól karty */
  function fillEnReport(){if(!draft||draft.reportEdited||zakladka!=='zamkniecie')return;const d=draft,sig=JSON.stringify(draft);if(enRap.klucz===sig)return;enRap={klucz:sig,tekst:''};Promise.all([vtEn(),enVoice()]).then(([en,v])=>{if(draft===d&&!draft.reportEdited&&enRap.klucz===sig){enRap.tekst=C.details({...en,...v,reportText:''});emit();}},()=>{});}
  /* pasek notatek „info na start” / „info na koniec” (czesci/Notatki.vue): opcje z modułu */
  function notatki(id){const field=id==='end'?'endNote':id==='rec'?'recNote':'note';return {icons:true,scope:id==='end'?ntEnd:id==='rec'?ntRec:ntScope,ctx:()=>draft?.title||draft?.uiTitle||'Reactive',join:L('✨ Połącz notatki w tekst','✨ Combine notes into the text'),ok:L('Wstaw','Insert'),
    onSaved:()=>{pristine='';message(L('Notatka zapisana. Tekst po angielsku zrobi się sam — stuknij ikonkę, żeby zobaczyć.','Note saved. The English text is made automatically — tap the icon to see it.'));liczniki();},onError:e=>message(e.message),
    onJoin:text=>{if(!draft)return;const v=String(draft[field]||'');draft[field]=v.trim()?v.trim()+'\n\n'+text:text;render();return persist().then(()=>message(L('Wstawione. Możesz poprawić ręcznie.','Inserted. You can edit it by hand.')));}};}
  /* „Z galerii”: systemowy wybór plików (bez własnego pola na ekranie) */
  function przyjmijZdjecia(files,phase,zGalerii=false){return run(async()=>{if(zGalerii)await askDate(files);for(const file of files)await addPhoto(file,phase);await renderEvidence();});}
  /* Jeden zapis zdjęcia (Grzegorz 04/11/2026): zdjęcie zapisuje się raz w module zdjęć (folder OEST, trzymane przez Reactive,
     więc sprzątanie go nie skasuje); zadanie ma tylko jego id (zid). Bez modułu albo gdy nie przyjmie zdjęcia: własna kopia jak dawniej. */
  async function photoMedia(file,phase,extra){const base={id:crypto.randomUUID(),kind:'photo',name:'Reactive photo.jpg',mime:'image/jpeg'};if(w.OESTZdjecia){try{const r=await w.OESTZdjecia.save(file,{source:'reactive',category:'Reactive',code:phase==='before'?'przed':'po',location:[draft.building,draft.level,draft.room].filter(Boolean).join(' '),hold:'reactive',kind:'ogolne',...(extra||{})});return{...base,zid:r.id,blob:r.blob,size:r.blob.size};}catch(e){}}const {blob}=await w.OESTZdjecia.zmniejsz(file,{px:1600,jakosc:.72});/* zapas: moduly/zdjecia */return{...base,blob,size:blob.size};}
  /* zdjęcie z galerii (Grzegorz 18/11/2026): data zrobienia inna niż data zlecenia → pytanie Tak/Nie, czy zmienić datę zlecenia na datę zdjęcia */
  const ymd=d=>w.OESTNarzedzia.dzienIso(d),dmy=v=>v.split('-').reverse().join('/');
  async function shotDay(file){let d=null;try{d=w.OESTZdjecia?.exifDate?await w.OESTZdjecia.exifDate(file):null;}catch(e){d=null;}if(!(d instanceof Date)||isNaN(d)){const lm=Number(file?.lastModified);d=lm>0&&lm<=Date.now()+6e4?new Date(lm):null;}return d?ymd(d):'';}
  async function askDate(files){if(!draft||draft.jobId&&draft.status==='completed')return;const days=[];for(const f of files){const d=await shotDay(f);if(d&&!days.includes(d))days.push(d);}days.sort();const day=days[0];if(!day||day===draft.orderDate)return;
    const yes=await w.OESTPytaj(L('Zdjęcie zrobiono '+dmy(day)+', a data zlecenia to '+dmy(draft.orderDate||'')+'. Zmienić datę zlecenia na '+dmy(day)+'?','The photo was taken on '+dmy(day)+' but the order date is '+dmy(draft.orderDate||'')+'. Change the order date to '+dmy(day)+'?'),{ok:L('Tak','Yes'),cancel:L('Nie','No')});
    if(!yes||!draft)return;collect();draft.orderDate=day;await persist(false);render();}
  async function addPhoto(file,phase){if((draft.beforeMediaIds.length+draft.afterMediaIds.length)>=30)throw Error('MAX_30_PHOTOS');const media=await photoMedia(file,phase);ensure();pendingMedia.set(media.id,media);draft[phase+'MediaIds'].push(media.id);await persist();}
  async function save(){if(recBusy())throw Error('STOP_RECORDING_FIRST');collect();await persist();const saved=await repo.saveReactive(draft);ensure();draft={...saved.reactive,jobId:saved.id};data=await repo.get();return saved;}
  /* przyciski Vantify (PROD-038, reactive-vantify.js): stan w draft.vantify, zapis jak „Zapisz”; teksty EN z notatek „start”/„koniec” */
  /* zdjęcia z karty do Vantify (zdjęcia przed przy zakładaniu – Grzegorz 20/11/2026) */
  async function vtPhotos(phase){const out=[],ids=draft[phase+'MediaIds']||[];let n=0;for(const id of ids){const m=await repo.media(id);/* zdjęcie z karty niedostępne = nie zakładać bez niego (jak Job Sheet i wysyłka, przegląd Codex #166) */if(!m||!m.blob)throw Error('EVIDENCE_MISSING');if(m.kind!=='photo')continue;n++;const type=m.blob.type||'image/jpeg',ext=/png/.test(type)?'png':'jpg',title=(phase==='before'?'Before':'After')+' photo '+n;out.push({id,b64:await w.OESTVoice.base64(m.blob),name:title.replace(/ /g,'-')+'.'+ext,title,type});}return out;}
  /* ostatnio wybrany priorytet Vantify = z najnowszego założonego zlecenia (jedno źródło: dane zleceń, bez osobnego ustawienia) */
  function vtLastPriority(){let best=null;for(const j of data?.jobs||[]){const v=j.reactive?.vantify;if(v?.priority&&(!best||String(v.at||'')>String(best.at||'')))best=v;}for(const d of Object.values(data?.reactiveDrafts||{})){const v=d?.vantify;if(v?.priority&&(!best||String(v.at||'')>String(best.at||'')))best=v;}return best?best.priority:'';}
  /* ostatnio wybrana Job Group – tak samo jak priorytet (z najnowszego założonego zlecenia) */
  function vtLastGroup(){let best=null;for(const v of [...(data?.jobs||[]).map(j=>j.reactive?.vantify),...Object.values(data?.reactiveDrafts||{}).map(d=>d?.vantify)])if(v?.jobgroup&&(!best||String(v.at||'')>String(best.at||'')))best=v;return best?best.jobgroup:'';}
  function vtSent(){return w.OESTReactiveVantify?w.OESTReactiveVantify.wyslane(draft):{zlecenie:'',zdjecia:{},notatki:{}};}
  function vtCtx(){return {get draft(){return draft;},kreator:w.OESTKreator,L,message,render:()=>{render();renderEvidence();},english:vtEnglish,/* Summary z notatki, gdy nie ma nazwy ani kreatora (Gemma; bez modelu pusto) */summary:t=>{const M=w.OESTModel;return String(t||'').trim()&&M?.ready?M.ready().then(ok=>ok?M.agent('summary',t):'').catch(()=>''):Promise.resolve('');},jobSheet,review:vtReview,photos:vtPhotos,lastPriority:vtLastPriority,lastGroup:vtLastGroup,
    persist:async()=>{const saved=await save();if(/^reactive\/(new|draft)\//.test(route)){route='reactive/job/'+saved.id;zamien(route);}}};}
  /* tłumaczenia zapamiętane na sesję (podgląd i wysyłka nie tłumaczą tego samego drugi raz) */const trCache=new Map();
  /* tłumaczenie przed Vantify (Grzegorz 25/11/2026): krótkie pola wiernie (how 'translate'), wiersze info na start/koniec jako zdania Job Sheetu */
  async function vtEnglish(what,extra,probe){const N=w.OESTNotatki,how=what==='start'?'description':what==='end'?'opis':what==='rec'?'rekomendacja':'translate'/* agenci pól Gemmy (26/11/2026): notatka startowa → Description, końcowa → opis pracy */,tr=t=>{if(!t||!N?.english)return Promise.resolve(t||'');if(!trCache.has(how+'|'+t))/* tłumacz niedostępny albo rzuca od razu = zostaje tekst oryginalny, wysyłka się nie wywraca */trCache.set(how+'|'+t,Promise.resolve().then(()=>N.english(t,'',how)).then(e=>{if(!e)trCache.delete(how+'|'+t);/* pusty wynik = nieudane tłumaczenie, następnym razem ponów (przegląd Codex #153) */return e||t;},()=>{trCache.delete(how+'|'+t);return t;}));return trCache.get(how+'|'+t);};
    if(what!=='start'&&what!=='end'&&what!=='rec')return tr(String(what||'').trim());
    const scope=what==='start'?ntScope():what==='rec'?ntRec():ntEnd(),list=scope&&N?.list?await N.list(scope).catch(()=>[]):[],ex=String(extra||'').trim();
    if(probe)return list.length?'1':'';
    /* „Połącz notatki” wstawia do pola tekst JUŻ po angielsku (Grzegorz 21/11/2026: opis w Vantify 2×, drugi raz przetłumaczony jak polski):
       notatka obecna w polu (PL albo EN) nie idzie drugi raz, a wiersze pola z angielskim tekstem notatek nie są tłumaczone ponownie */
    const nk=t=>String(t||'').toLowerCase().replace(/[.!?\s]+/g,' ').trim(),exk=nk(ex),ens=list.map(n=>nk(n.en)).filter(Boolean);
    const parts=[];for(const n of list){if(ex&&((n.pl&&exk.includes(nk(n.pl)))||(n.en&&exk.includes(nk(n.en)))))continue;/* tekst już wstawiony do pola */parts.push(n.en||await tr(n.pl));}
    if(ex){const lines=uniqLines(ex).split('\n'),en=l=>ens.some(e=>nk(l).includes(e)||e.includes(nk(l)));const out=[];for(const l of lines)out.push(en(l)?l:await tr(l));parts.push(out.join('\n'));}/* ta sama notatka wstawiona kilka razy = jeden wiersz, przed i po tłumaczeniu (Grzegorz 19/11/2026: notatki 3× w raporcie) */return uniqLines(parts.join('\n'));}
  function uniqLines(t){const seen=new Set();return String(t||'').split('\n').map(x=>x.trim()).filter(x=>{const k=x.toLowerCase().replace(/\s+/g,' ');if(!k||seen.has(k))return false;seen.add(k);return true;}).join('\n');}
  /* Job Sheet do Vantify po angielsku (przegląd Codex #146): nazwa = Summary z Vantify, info na start/koniec z notatek EN, bez polskich nagrań */
  async function vtEn(){return {...draft,title:draft.vantify?.summary||await vtEnglish(draft.title||draft.problem||''),note:await vtEnglish('start',draft.note),endNote:await vtEnglish('end',draft.endNote),recNote:await vtEnglish('rec',draft.recNote),/* pozostałe pola wpisywane ręcznie też po angielsku (przegląd Codex #146) */room:await vtEnglish(draft.room||''),problem:await vtEnglish(draft.problem||''),partsNote:await vtEnglish(draft.partsNote||''),closingText:draft.closingEdited?await vtEnglish(draft.closingText||''):'',audioMediaIds:[],actionId:draft.pendingActionId||draft.actionId,reportText:draft.reportEdited?draft.reportText:''};}
  /* Job Sheet do Vantify: tylko PDF, data ze zdjęcia (Grzegorz 18/11/2026) – koniec = ostatnie zdjęcie po, start = pierwsze zdjęcie przed */
  /* daty Job Sheet ze zdjęć – wspólne dla podsumowania i PDF (przegląd Codex #148) */
  async function sheetDays(){const V=w.OESTReactiveVantify,photos=[],days={before:[],after:[]},Z=w.OESTZdjecia;
    /* data zdjęcia: z modułu zdjęć (pole created = data zrobienia, zapisana przy dodaniu; plik w raporcie jest już bez EXIF – przegląd Codex #146), zapas: EXIF */
    const made=new Map();try{for(const r of (Z?.list?await Z.list():[]))made.set(r.id,r.created);}catch(e){}
    for(const phase of ['before','after'])for(const id of draft[phase+'MediaIds']||[]){const m=await repo.media(id);if(!m)throw Error('EVIDENCE_MISSING');photos.push({...m,phase});let d=m.zid&&made.get(m.zid)?new Date(made.get(m.zid)):null;if(!(d instanceof Date)||isNaN(d)){try{d=Z?.exifDate?await Z.exifDate(m.blob):null;}catch(e){d=null;}}if(d instanceof Date&&!isNaN(d))days[phase].push(d);}
    days.before.sort((a,b)=>a-b);days.after.sort((a,b)=>a-b);
    /* dolna granica = data zadania w apce (PROD-038), nie data zlecenia w Vantify – zdjęcia sprzed założenia w Vantify zostają (przegląd Codex #146) */const from=rxDate(draft,draft.createdAt||draft.vantify?.at),end=V.clampDay(days.after.at(-1)||days.before.at(-1),from),start=V.clampDay(days.before[0]&&days.before[0]<=end?days.before[0]:end,from);
    return {photos,end,start};}
  async function jobSheet(){const profile=w.OESTSettings.get().profile,{photos,end,start}=await sheetDays();
    /* Job Sheet do Vantify po angielsku (przegląd Codex #146): nazwa = Summary z Vantify, info na start/koniec z notatek EN, bez polskich nagrań */
    const en=await vtEn();
    const fields=C.report(en,profile,end),RR=w.OESTReactiveReport,mb=n=>(n/1048576).toFixed(1).replace('.',L(',','.'));
    /* plik ponad 1 MB: to samo pytanie co przy „Wyślij” (PROD-023, przegląd Codex #146), bez cichego zmniejszania */
    const report=await RR.fit(px=>RR.build(fields,photos,{px}),big=>w.OESTPrzycisk?.confirm?w.OESTPrzycisk.confirm(L('Plik raportu będzie miał '+mb(big)+' MB (limit 1 MB). Zmniejszyć zdjęcia w raporcie, czy zostawić je tak, jak są?','The report file will be '+mb(big)+' MB (limit 1 MB). Make the photos in the report smaller, or keep them as they are?'),{ok:L('Zmniejsz zdjęcia','Make smaller'),cancel:L('Zostaw tak','Keep as is'),danger:false}):false);
    /* PDF tylko z Worda przez silnik LibreOffice – bez niego Job Sheet nie powstaje (nic nie rysujemy zamiast, Grzegorz 21/11/2026) */if(!report.pdf)throw Error('REPORT_PDF_MISSING');
    return {pdf:report.pdf,name:fields.fileName+'.pdf',title:fields.fileName,date:end,start:start>end?end:start};}
  async function send(){C.validate(draft);/* raport także w trakcie pracy: bez akcji zostaje bieżący status (np. Open) */const profile=w.OESTSettings.get().profile;if(!profile.companyEmail)throw Error(L('Uzupełnij firmowy e-mail w Mój profil.','Add your work email in My Profile.'));if(!w.Capacitor?.isNativePlatform())throw Error(L('Wysyłanie raportu z załącznikami działa w aplikacji Android.','Sending a report with attachments works in the Android app.'));/* raport po angielsku – te same pola co podgląd (Grzegorz 19/11/2026: wysłany PDF był po polsku) */message(L('Tłumaczę na angielski…','Translating to English…'));const fields=await enFields();if(!draft.reportEdited)draft.reportText=fields.details;const saved=await save();if(/^reactive\/(new|draft)\//.test(route)){route='reactive/job/'+saved.id;zamien(route);}const photos=[];for(const phase of ['before','after'])for(const id of draft[phase+'MediaIds']){const m=await repo.media(id);if(!m)throw Error('EVIDENCE_MISSING');photos.push({...m,phase});}message(L('Tworzenie Word + PDF…','Creating Word + PDF…'));const RR=w.OESTReactiveReport,mb=n=>(n/1048576).toFixed(1).replace('.',L(',','.')),report=await RR.fit(px=>RR.build(fields,photos,{px}),big=>w.OESTPrzycisk?.confirm?w.OESTPrzycisk.confirm(L('Plik raportu będzie miał '+mb(big)+' MB (limit 1 MB). Zmniejszyć zdjęcia w raporcie, czy zostawić je tak, jak są?','The report file will be '+mb(big)+' MB (limit 1 MB). Make the photos in the report smaller, or keep them as they are?'),{ok:L('Zmniejsz zdjęcia','Make smaller'),cancel:L('Zostaw tak','Keep as is'),danger:false}):false);ensure();const files=[];draft.reportMediaIds=[];for(const [ext,mime]of [['docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document'],['pdf','application/pdf']]){if(!report[ext])continue;/* PDF nie powstał (brak silnika) – zapisany sam Word */const blob=new Blob([report[ext]],{type:mime}),media={id:crypto.randomUUID(),kind:'report',blob,mime,name:fields.fileName+'.'+ext,size:blob.size};pendingMedia.set(media.id,media);draft.reportMediaIds=draft.reportMediaIds||[];draft.reportMediaIds.push(media.id);files.push({name:media.name,data:await w.OESTVoice.base64(blob)});}await persist();await repo.saveReactive(draft);if(w.OESTSender?.active?.()&&w.OESTSender.enqueue){await w.OESTSender.enqueue({type:'reactive',key:'reactive-'+saved.id/* osobny raport na każde zadanie, nawet przy tej samej nazwie */,code:fields.title,name:fields.fileName,subject:fields.title,body:fields.details,docx:new Uint8Array(report.docx),pdf:report.pdf?new Uint8Array(report.pdf):new Uint8Array(0)});await repo.reactiveDelivery(saved.id,'shared');message(L('W kolejce do wysłania — pasek na dole pokaże wysyłkę. Zadanie zostaje otwarte.','Queued for sending — the bar at the bottom shows progress. The job stays open.'));return;}try{const plugin=w.Capacitor.registerPlugin('ReportShare'),result=await plugin.share({subject:fields.title,body:fields.details,to:[profile.companyEmail],files});if(result?.status!=='shared')throw Error('SHARE_UNCONFIRMED');await repo.reactiveDelivery(saved.id,'shared');message(L('Przekazano do poczty. Wysłanie i doręczenie nie są potwierdzone. Pliki zapisane na telefonie.','Handed to the mail app. Sending and delivery are not confirmed. Files saved on the phone.'));}catch(e){await repo.reactiveDelivery(saved.id,e.name==='AbortError'?'cancelled':'failed');throw e;}}
  /* strzałka ‹ i Wstecz telefonu (szkielet: OESTEkrany.straz): podgląd i kreator cofają się w sobie, niezapisany szkic zostaje; false = zostań, true = rodzic (trasę liczy rama) */
  function wstecz(){if(busy&&!reviewDone)return false;if(preview){act('preview-back');return false;}if(kr){kr=kr.gid?{}:null;render();if(!kr)renderEvidence();return false;}if(!canLeave())return false;if(draft&&!draft.jobId&&pristine){collect();if(JSON.stringify(draft)===pristine){pristine='';repo.deleteReactiveDraft(draft.draftId).catch(()=>{});}}
    return true;}
  /* akcje zmieniające zlecenie po założeniu w Vantify: zablokowane (Grzegorz 26/11/2026) */
  const ZMIANY_ZLECENIA=new Set(['pick-node','pick-up','pick-reset','pick-leaf','building','who','type','request','kr-open','kr-item','kr-add','kr-done','kr-on','kr-weight','kr-closing']);
  async function act(action,b){if(busy&&!(reviewDone&&/^(sum-|preview-back$)/.test(action)))return;b=b||{};
    if(draft&&ZMIANY_ZLECENIA.has(action)&&vtSent().zlecenie){message(L('Zlecenie jest już w Vantify – nie można go zmienić.','The job is already in Vantify – it cannot be changed.'));render();return;}
    if(draft&&(action==='photo-del'||action==='photo-edit')&&vtSent().zdjecia[b.id]){message(L('To zdjęcie jest już w Vantify – nie można go zmienić.','This photo is already in Vantify – it cannot be changed.'));return;}
    switch(action){
    case 'tab':zakladka=['zlecenie','zdjecia','notatki','zamkniecie'].includes(b.id)?b.id:'zlecenie';render();renderEvidence();return;
    case 'work':collect();draft.workChoice=draft.workChoice===b.value?'':String(b.value||'');persist(false);render();return;
    case 'closing-pick':collect();draft.closingText=String(b.value||'');draft.closingEdited=b.value!==C.closingAuto(draft);persist(false);render();return;
    case 'home':if(canLeave())navigate('reactive');return;case 'new':if(canLeave())navigate('reactive/new/blank');return;case 'tree':if(canLeave())navigate('reactive/tree/'+b.id);return;case 'preset':if(canLeave())navigate('reactive/new/'+b.id);return;case 'history':if(canLeave())navigate('reactive/history');return;case 'job':if(canLeave())navigate('reactive/job/'+b.id);return;
    case 'draft':if(canLeave())navigate('reactive/draft/'+b.id);return;
    case 'drop-draft':if(draft.vantify&&(draft.vantify.id||draft.vantify.pending))return;if(!await w.OESTPytaj(draft.jobId?L('Usunąć to zlecenie? Nie poszło do Vantify. Zdjęcia zostaną w folderze OEST.','Delete this job? It was not sent to Vantify. Photos stay in the OEST folder.'):L('Usunąć ten szkic? Zdjęcia zostaną w folderze OEST.','Delete this draft? Photos stay in the OEST folder.')))return;run(async()=>{const nk=ntScope();if(draft.jobId)await repo.deleteReactive(draft.jobId);else await repo.deleteReactiveDraft(draft.draftId);draft=null;if(w.OESTNotatki){await w.OESTNotatki.clear(nk).catch(()=>{});await w.OESTNotatki.clear(nk+'|end').catch(()=>{});await w.OESTNotatki.clear(nk+'|rec').catch(()=>{});}busy=false;navigate('reactive');});return;
    case 'pick-node':collect();draft.treeAt=b.id;persist(false);render();renderEvidence();return;
    case 'pick-up':collect();draft.treeAt=findParent(b.id)||'root';persist(false);render();renderEvidence();return;
    case 'pick-reset':collect();draft.treeAt=findParent(draft.problemId)||'root';draft.problemId='';draft.problem='';persist(false);render();renderEvidence();return;
    case 'pick-leaf':{collect();const r=C.find(b.id),n=r?.node;if(!n||n.children)return;draft.problemId=n.id;draft.problem=n.sentence||'';draft.title=draft.title||n.title||n.sentence||'';draft.uiTitle='';openRow='';persist(false);render();renderEvidence();return;}
    case 'building':collect();draft.building=b.value;if(!C.levels(draft.building).includes(draft.level))draft.level='';persist(false);render();renderEvidence();return;
    case 'report-reset':collect();draft.reportEdited=false;draft.reportText='';persist(false);render();renderEvidence();return;
    case 'park':run(async()=>{collect();await persist();if(!C.missing(draft).length){await save();}busy=false;navigate('reactive');});return;
    case 'row':collect();openRow=openRow===b.id?'':b.id;persist(false);render();renderEvidence();return;
    case 'who':collect();if(draft.requestedBy!==b.value)draft.requestedName='';draft.requestedBy=b.value;openRow='';persist(false);render();renderEvidence();return;
    case 'type':collect();draft.jobType=b.value;krApply();openRow='';persist(false);render();renderEvidence();return;
    case 'kr-open':collect();kr={};render();return;
    case 'kr-groups':kr={};render();return;
    case 'kr-group':kr={gid:b.id};render();return;
    case 'kr-item':{const id=b.id,set=new Set(krItems());set.has(id)?set.delete(id):set.add(id);draft.kreator={...(draft.kreator||{}),items:[...set]};/* własna pozycja pamięta swoją grupę (np. ciężkie) */if(kr?.gid&&!K.groupOf(id))draft.kreator.groups={...(draft.kreator.groups||{}),[id]:kr.gid};if(!K.heavy(K.fromDraft(draft)))delete draft.kreator.weight;krApply();persist(false);render();return;}
    case 'kr-add':{/* okienko z dwoma polami pokazuje ekran (Reactive.vue); tu tylko zapis pozycji */const en=String(b.en||'').trim().replace(/\s+/g,' '),pl=String(b.pl||'').trim();if(!en||!kr?.gid)return;const kd=krData();kd.added[kr.gid]=(kd.added[kr.gid]||[]).filter(e=>e.en!==en).concat([{en,pl:pl||en}]);krSave(kd);draft.kreator={...(draft.kreator||{}),items:[...new Set([...krItems(),en])]};if(!K.groupOf(en))draft.kreator.groups={...(draft.kreator.groups||{}),[en]:kr.gid};krApply();persist(false);render();return;}
    case 'kr-done':{const ks=K.fromDraft(draft);if(ks){const kd=krData();kd.stats=K.learn(kd.stats,ks);krSave(kd);}kr=null;openRow='co';krApply();persist(false);render();renderEvidence();return;}
    case 'kr-on':collect();draft.kreator={...(draft.kreator||{}),on:draft.kreator?.on===b.value?'':b.value};krApply();persist(false);render();renderEvidence();return;
    case 'kr-weight':collect();draft.kreator={...(draft.kreator||{}),weight:draft.kreator?.weight===b.value?'':b.value};krApply();persist(false);render();renderEvidence();return;
    case 'kr-closing':collect();draft.kreator={...(draft.kreator||{}),closing:draft.kreator?.closing===false};krApply();persist(false);render();renderEvidence();return;
    case 'filter':listFilter=b.id;render();renderEvidence();return;
    case 'people':if(canLeave()){if(draft)collect(),persist();navigate('settings/contacts');}return;
    case 'request':case 'status':collect();if(action==='request'){if(draft.requestedBy!==b.value)draft.requestedName='';draft.requestedBy=b.value;}else{draft.status=b.status;draft.temporary=false;}persist(false);render();renderEvidence();return;
    case 'quick-status':run(async()=>{await repo.setReactiveStatus(b.id,b.status);data=await repo.get();render();await renderEvidence();});return;
    case 'save':run(async()=>{const isNew=/^reactive\/(new|draft)\//.test(route),saved=await save();busy=false;navigate('reactive/job/'+saved.id);});return;
    case 'complete':run(async()=>{const saved=await save();busy=false;navigate('reactive/complete/'+saved.id);});return;
    case 'action':collect();if(draft.reportEdited&&!await w.OESTPytaj(L('Zastąpić ręcznie poprawiony raport tekstem z klocków?','Replace the hand-edited report with the text from the blocks?')))return;{const a=T.actions.find(x=>x.id===b.id);if(a?.closes){draft.pendingActionId=a.id;}else{draft.pendingActionId='';draft=C.finish(draft,a.id);}}draft.reportText='';draft.reportEdited=false;persist(false);render();renderEvidence();return;
    case 'close':if(draft&&!draft.pendingActionId){collect();openRow='finish';persist(false);render();renderEvidence();message(L('Wybierz, co zrobiłeś.','Choose what you did.'));return;}collect();try{C.validate(draft);}catch(e){message(e.message);return;}persist(false);run(()=>openSummary('close'));return;
    case 'vt-open':case 'vt-close':case 'vt-check':case 'vt-zdjecia':case 'vt-notatki':{const V=w.OESTReactiveVantify;if(!V)return;collect();if(action!=='vt-check'){try{C.validate(draft);}catch(e){message(e.message);return;}}run(()=>V[action.slice(3)](vtCtx()));return;}
    case 'send':collect();try{C.validate(draft);}catch(e){message(e.message);return;}persist(false);run(()=>openSummary('send'));return;
    case 'preview-back':if(!reviewEnd(false)){preview=false;reviewView=null;sumClear();render();renderEvidence();}return;
    case 'sum-view':collect();run(()=>openSummary('view'));return;
    case 'sum-del':{/* indeks z bieżących akapitów na ekranie, nie z zapisanego tekstu (przegląd Codex #148) */const l=akapity.slice();if(l.filter(x=>x.trim()).length<=1){message(emptyMsg());return;}l.splice(Number(b.i),1);akapity=l;sumSave(l);render();return;}
    case 'sum-edit':akapity[Number(b.i)]=String(b.value==null?'':b.value);sumSave(akapity);return;
    case 'sum-ok':if(sumEmpty())return;if(reviewEnd(true))return;run(async()=>{collect();C.validate(draft);draft=C.finish(draft,draft.pendingActionId);draft.pendingActionId='';preview=false;reviewView=null;sumClear();await save();busy=false;navigate('reactive');});return;
    case 'send-now':wyslijTeraz().catch(()=>{});return;case 'retry-report':if(canLeave())navigate('reactive/complete/'+draft.jobId);return;
    case 'transcribe':run(async()=>{const media=await repo.media(b.id);if(!media)throw Error(L('Najpierw nagraj notatkę.','Record a note first.'));const result=await voice.transcribe(media.blob);ensure();let text=(result.text||'').trim(),en='';if(text&&w.OESTNotatki?.english){message(L('Tłumaczę na angielski…','Translating to English…'));try{en=await w.OESTNotatki.english(text,'');}catch(e){en='';}}draft.voiceTexts={...(draft.voiceTexts||{}),[b.id]:en||text};draft.voicePl={...(draft.voicePl||{}),[b.id]:!en&&!!text};render();await persist();await renderEvidence();message(en?L('Tekst nagrania dodany po angielsku.','Recording text added in English.'):text?L('Dodano po polsku — tłumacz niedostępny, popraw ręcznie.','Added in Polish — translator unavailable, correct by hand.'):L('Nie rozpoznano słów.','No words recognised.'));/* po zapisie, żeby „Szkic zapisany” nie zasłonił ostrzeżenia */});return;
    case 'photo-del':if(!await w.OESTPytaj(L('Usunąć to zdjęcie z zadania?','Remove this photo from the job?')))return;run(async()=>{draft[b.phase+'MediaIds']=draft[b.phase+'MediaIds'].filter(x=>x!==b.id);await persist(false);await renderEvidence();});return;
    case 'photo-edit':run(async()=>{const m=await repo.media(b.id);if(!m)return;const nb=await w.OESTAparat.edit(m.blob);if(!nb)return;const media=await photoMedia(nb,b.phase,{stamp:false});/* data na zdjęciu tylko przy zrobieniu – poprawione nie dostaje drugiej (Codex PR #127) */pendingMedia.set(media.id,media);draft[b.phase+'MediaIds']=draft[b.phase+'MediaIds'].map(x=>x===b.id?media.id:x);await persist(false);await renderEvidence();});return;
    case 'voice-del':if(!await w.OESTPytaj(L('Usunąć to nagranie?','Delete this recording?')))return;run(async()=>{draft.audioMediaIds=draft.audioMediaIds.filter(x=>x!==b.id);if(draft.voiceTexts)delete draft.voiceTexts[b.id];if(draft.voicePl)delete draft.voicePl[b.id];await persist(false);await renderEvidence();});return;
    case 'voice-text':if(!draft||closedJob())return;draft.voiceTexts={...draft.voiceTexts,[b.id]:String(b.value||'')};persist(false);return;
    case 'notes-closed':notatkiZamkniete(b.id);return;
  }}
  /* „Zbuduj i wyślij” w podglądzie: przycisk akcji ekranu (kółko → ✓) czeka na wynik; błąd wraca jako komunikat */
  function wyslijTeraz(){if(sumEmpty())return Promise.reject(Error('REPORT_EMPTY'));return runP(send);}
  function findParent(id,node=T.tree){for(const child of node.children||[]){if(child.id===id)return node.id;const found=findParent(id,child);if(found)return found;}return null;}
  /* Wstecz w drzewku (OESTEkrany.rodzicDanych): rodzic liczony z danych — prawdziwy węzeł; korzeń „root” → null (wtedy rodzic z mapy: Reactive) */
  w.OESTEkrany.rodzicDanych('reactive/tree', t => { const p = findParent(t.split('/')[2]); return p && p !== 'root' ? 'reactive/tree/' + p : null; });
  setTimeout(()=>{repo.releasePhotos?.().catch(()=>{});},20000);/* nieużywane zdjęcia Reactive przestają być trzymane (Codex #69) */
  w.OESTReactiveUI={open,wejdz,dane,przyjmijZdjecia,wyborZdjec,akcja:(n,x)=>act(n,x||{}),pole,wstecz,info,notatki,wyslijTeraz,canLeave,setNavigate:fn=>navigate=fn,repository:repo};w.addEventListener('beforeunload',e=>{if(wybieranieZdjec||writing||error||recBusy()){e.preventDefault();e.returnValue='';}});
  w.addEventListener('oest:lang',()=>{if(route.startsWith('reactive'))render();});
  /* nowy status z Vantify (odświeżenie po pobraniu): lista od nowa, otwarta karta dostaje tylko stan Vantify */
  w.addEventListener('oest:reactive-vantify',()=>{if(!route.startsWith('reactive')||busy)return;if(!draft){open(route);return;}const v=draft.vantify;if(!v?.id)return;repo.get().then(s=>{const k=draft.jobId,f=(k&&s.reactiveDrafts?.[k]?.vantify)||s.jobs.find(j=>j.id===k)?.reactive?.vantify;if(draft&&f&&f.id===v.id&&(f.status!==v.status||!!f.final!==!!v.final)){draft.vantify={...v,status:f.status,final:f.final,checkedAt:f.checkedAt,...(f.closedAt?{closedAt:f.closedAt}:{})};render();}}).catch(()=>{});});
})(window);
