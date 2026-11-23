(function(w){
  'use strict';
  // Kalendarz i grafik (Ustawienia → Kalendarz): rysuje go rama Ionic + Vue (moduly/szkielet/src/ekrany/KalendarzGrafik.vue); tu tylko dane i akcje.
  // Każda akcja oddaje { tekst, blad } (albo { lista } dla list kalendarzy telefonu); ekran tylko to pokazuje.
  const L=(pl,en)=>w.OESTT?w.OESTT(pl,en):pl;
  const cfg=()=>w.OESTSettings.get().calendar;
  const errText=m=>w.OESTBledy?w.OESTBledy.text(m):m;
  const liczba=c=>c?Object.keys(c.days).length:0;
  // stan synchronizacji inspekcji (z kalendarza telefonu) i odczytu grafiku; gdy nic się nie stało – tekst pusty/„jeszcze nie”
  function statusSync(){try{const s=w.OESTCalendar.status();return s.lastError?L('Błąd:','Error:')+' '+errText(s.lastError):s.lastSyncAt?L('Zapisano w kalendarzu telefonu:','Saved to phone calendar:')+' '+new Date(s.lastSyncAt).toLocaleString()+'. '+L('Synchronizację z Google wykonuje Android.','Android handles Google sync.'):L('Jeszcze nie synchronizowano.','Not synced yet.');}catch(e){return e.message;}}
  function statusGrafiku(){try{const st=w.OESTCalendar.status(),c=w.OESTSettings.calendarShifts&&w.OESTSettings.calendarShifts();return st.shiftError?L('Błąd:','Error:')+' '+errText(st.shiftError):c?L('Odczytano '+liczba(c)+' dni pracy (SMART WORK).','Read '+liczba(c)+' workdays (SMART WORK).'):'';}catch(e){return errText(e.message);}}
  function dane(){const c=cfg();return {grafik:{kalendarz:c.shiftCalendarId?c.shiftCalendarName:'',status:statusGrafiku()},inspekcje:{wlaczona:!!c.enabled,konto:c.accountName||'',nazwa:c.name||'',status:statusSync()},pola:{exportInspections:!!c.exportInspections,shiftMarkers:!!c.shiftMarkers,weeks:c.weeks,workdayMode:c.workdayMode,groups:c.groups.slice()}};}
  const opcje=(list,cur)=>list.map(c=>({id:c.id,tekst:c.account+' · '+c.name,wybrany:c.id===cur}));
  async function wykonaj(fn,graf){try{return await fn();}catch(e){return {tekst:graf?errText(e.message):e.message,blad:true};}}
  // kalendarz inspekcji PPM (Google Calendar przez kalendarz telefonu)
  const listaInspekcji=()=>wykonaj(async()=>({lista:opcje(await w.OESTCalendar.calendars(),cfg().nativeCalendarId)}));
  const wlacz=(id,potwierdzone)=>wykonaj(async()=>{if(!potwierdzone)return {tekst:L('Potwierdź wybór kalendarza.','Confirm the calendar choice.'),blad:true};await w.OESTCalendar.enable(id);return {tekst:L('Włączono. Zapisano wydarzenia w telefonie; Android synchronizuje je z Google.','Enabled. Events saved to phone; Android syncs them to Google.'),blad:false};});
  const synchronizuj=()=>wykonaj(async()=>{if(!cfg().enabled)throw Error(L('Najpierw włącz kalendarz.','Enable the calendar first.'));await w.OESTCalendar.sync(true);return {tekst:'',blad:false};});
  const otworz=()=>wykonaj(async()=>{await w.Capacitor?.Plugins.OESTCalendar?.openCalendar();if(!w.Capacitor?.isNativePlatform())throw Error('ANDROID_CALENDAR_REQUIRED');return null;});
  const wylacz=()=>wykonaj(async()=>{const usunac=await w.OESTOkna.pytaj({tytul:L('Wyłączyć synchronizację?','Disable sync?'),tresc:L('Usunąć wydarzenia utworzone przez tę aplikację? Sam kalendarz i inne wydarzenia pozostaną.','Remove events created by this app? The calendar and other events remain.'),ok:L('Usuń wydarzenia','Remove events'),anuluj:L('Zachowaj','Keep'),niebezpieczne:true});await w.OESTCalendar.disable(usunac);return {tekst:L('Synchronizacja wyłączona.','Sync disabled.'),blad:false};});
  /* Grafik zmian z kalendarza Google (Grzegorz 14/11/2026): osobny kalendarz grafiku (SMART WORK), osobny kalendarz inspekcji */
  const listaGrafiku=()=>wykonaj(async()=>({lista:opcje(await w.OESTCalendar.calendars(),cfg().shiftCalendarId)}),true);
  const grafikUzywaj=id=>wykonaj(async()=>{await w.OESTCalendar.bindShiftCalendar(id);return {tekst:'',blad:false};},true);
  const grafikOdczytaj=()=>wykonaj(async()=>{if(!cfg().shiftCalendarId)throw Error('CALENDAR_NOT_ENABLED');await w.OESTCalendar.readShifts();return {tekst:'',blad:false};},true);
  w.OESTCalendarUI={dane,listaInspekcji,wlacz,synchronizuj,otworz,wylacz,listaGrafiku,grafikUzywaj,grafikOdczytaj};
})(window);
