/* i18n-ok-file: nazwy pól karty po polsku (pl) z angielskimi obok (en) – ekran bierze parę przez OESTT. */
/* Templates w Reactive (Grzegorz 27/11/2026): gotowe klocki pod powtarzalne zlecenia – przycisk „Templates” obok „Nowe zadanie”.
   Szablon = własny formularz pod konkretną robotę: część pól wypełniona z góry (nazwa, Job Group, gotowe zdania do poprawy), reszta wpisywana.
   Rodzaje:
     karta    – zlecenie Reactive z kartą urządzenia (Firmware update, wzór: Job Sheet #3085016, Tower A 2606);
     inspekcja – otwiera istniejący formularz inspekcji z apki (Generator Checks – Weekly, gen-weekly w app/www/ppm.js, przeniesiony z listy Inspekcji 27/11/2026).
   Jedno miejsce na definicje szablonów: ekran (reactive.js), Job Sheet (reactive-core.js details) i zakładanie w Vantify (Job Group) czytają je stąd. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OESTSzablony=api;})(typeof window==='undefined'?globalThis:window,function(){
  'use strict';
  const LISTA=[
    {id:'firmware',rodzaj:'karta',nazwa:['Firmware update','Firmware update'],tytul:'Firmware update',grupa:'Electrical',
      /* karta urządzenia (kolejność i nazwy jak w Job Sheecie #3085016, sekcja „Device details”); wersja przed/po = jeden wiersz „Firmware version” */
      sekcja:'Device details',
      pola:[{k:'device',pl:'Urządzenie',en:'Device'},{k:'ref',pl:'Product reference',en:'Product reference'},{k:'rating',pl:'Prąd znamionowy',en:'Current rating'},{k:'ics',pl:'Ics',en:'Ics'},
        {k:'przed',pl:'Wersja przed',en:'Firmware version before'},{k:'po',pl:'Wersja po',en:'Firmware version after'},{k:'uid',pl:'UID',en:'UID'}],
      /* gotowe zdania (do poprawy w „Co zrobione”) i zdanie końcowe w szarej ramce: BS 7671 + BHP, jak w #3085016 */
      praca:'Firmware on the device updated via the manufacturer\'s app. The update was confirmed as installed and the device now shows as up to date.\nFollowing the update, the device and the appliances on the circuit were switched back on together with the tenant. Operation was observed for a period of time and everything was working correctly.',
      koniec:'All electrical work was carried out in accordance with BS 7671 (IET Wiring Regulations) and the Electricity at Work Regulations 1989.\nWork carried out in a safe manner, in line with health and safety procedures. Area left clean and tidy.'},
    {id:'generator',rodzaj:'inspekcja',nazwa:['Generator Checks – Weekly','Generator Checks – Weekly'],inspekcja:'gen-weekly',grupa:'Generator'}];
  const byId=id=>LISTA.find(s=>s.id===id)||null;
  /* wiersze karty urządzenia do Job Sheetu (po angielsku): puste pola wylatują; wersja przed/po → „Firmware version: po (previously przed)” */
  function wiersze(s,p){if(!s||!s.pola)return [];p=p||{};const v=k=>String(p[k]||'').trim(),out=[];
    for(const f of s.pola){if(f.k==='przed')continue;if(f.k==='po'){const po=v('po'),pr=v('przed');if(po||pr)out.push(['Firmware version',po?po+(pr?' (previously '+pr+')':''):'previously '+pr]);continue;}if(v(f.k))out.push([f.en,v(f.k)]);}
    return out;}
  return {LISTA,byId,wiersze};
});
