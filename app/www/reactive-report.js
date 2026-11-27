(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OESTReactiveReport=api;})(typeof window==='undefined'?globalThis:window,function(){
  'use strict';
  /* Word raportu składa moduł Word (moduly/word, OESTWord – jedno miejsce dla inspekcji i Reactive): układ zdjęć „przed-po” */
  /* 21/11/2026 (Grzegorz): wzór basic tylko z modułu Wzory (moduly/wzory) – ten sam plik co inspekcje */
  /* treść raportu → akapity z nagłówkami (Job description / Work complete / Recommendations – reactive-core SEKCJE, Grzegorz 26/11/2026 18:08):
     linia równa nagłówkowi zaczyna akapit; tekst bez nagłówka = akapit bez nagłówka. Wygląd w Wordzie: uklad() niżej i wzór reactive-srodek.docx */
  const NAGLOWKI=()=>(globalThis.OESTReactiveCore||(typeof require==='function'?require('./reactive-core.js'):{})).SEKCJE||[];/* nagłówki tylko w reactive-core (SEKCJE) */
  function sekcje(t){const out=[];let nowy=false;for(const l of String(t||'').split('\n')){const x=l.trim();/* pusta linia po treści = następny akapit bez nagłówka (np. zdanie BHP na końcu) */if(!x){nowy=!!out.length;continue;}if(NAGLOWKI().includes(x)){out.push({naglowek:x,tekst:''});nowy=false;continue;}if(!out.length||nowy&&out[out.length-1].tekst){out.push({naglowek:'',tekst:''});}nowy=false;const o=out[out.length-1];o.tekst+=(o.tekst?'\n':'')+x;}return out.filter(o=>o.tekst);}
  /* układ środka w stylu „grupy stref” (Grzegorz 27/11/2026, Job Sheet #3085016; wzór app/scripts/reactive-srodek.py):
     sekcja z nagłówkiem = granatowy pasek (nagłówek bez dwukropka) + jej akapity; akapit bez nagłówka po sekcji = kolejny akapit tej sekcji;
     tekst bez nagłówka przed pierwszą sekcją = szara ramka „wstep”; ostatni akapit bez nagłówka (zdanie końcowe BHP z reactive-core) = szara ramka „koniec” */
  function uklad(t){const s=sekcje(t),out={wstep:[],sekcje:[],koniec:[]},last=s.length&&!s[s.length-1].naglowek&&s.length>1?s.pop():null;
    for(const x of s){if(x.naglowek)out.sekcje.push({naglowek:x.naglowek.replace(/:\s*$/,''),akapity:[{tekst:x.tekst}]});else if(out.sekcje.length)out.sekcje[out.sekcje.length-1].akapity.push({tekst:x.tekst});else out.wstep.push({tekst:x.tekst});}
    if(last)out.koniec.push({tekst:last.tekst});return out;}
  function wzor(){if(!globalThis.OESTWzory)return Promise.reject(Error('REPORT_TEMPLATE_MISSING'));return OESTWzory.wczytaj().then(()=>OESTWzory.bajty('reactive-basic'));}/* Reactive: ramka basic + środek bez „Overall Condition” (Grzegorz 26/11/2026) */
  async function build(fields,records,opts){const maxPx=opts&&opts.px||1600;const template=await wzor(),photos=[];for(const record of records){const bitmap=await OESTZdjecia.wczytaj(record.blob),scale=Math.min(1,maxPx/Math.max(bitmap.width,bitmap.height));/* wczytanie i zmniejszenie: moduly/zdjecia */if(scale===1&&record.blob.type==='image/jpeg'){/* 07/11/2026: zdjęcie z modułu zdjęć ma już ≤1600 px – do raportu bez drugiej kompresji (szybciej, bez dodatkowej straty jakości) */photos.push({bytes:new Uint8Array(await record.blob.arrayBuffer()),width:bitmap.width,height:bitmap.height,phase:record.phase});if(bitmap.close)bitmap.close();continue;}const c=OESTZdjecia.plotno(bitmap,maxPx,{tlo:'#fff'});const blob=await new Promise(resolve=>c.toBlob(resolve,'image/jpeg',.72));photos.push({bytes:new Uint8Array(await blob.arrayBuffer()),width:c.width,height:c.height,phase:record.phase});}const word=OESTWord.wypelnij(template,{...fields,...uklad(fields.details)},photos,{uklad:'przed-po',autor:fields.author});/* PDF TYLKO z tego samego Worda silnikiem LibreOffice w telefonie (moduly/word-pdf; Grzegorz 21/11/2026: własny rysownik usunięty); bez silnika pdf = null – wysyłany sam Word */const zWorda=globalThis.OESTWordPdf&&OESTWordPdf.zWorda?await OESTWordPdf.zWorda(word):null;return {docx:word,pdf:zWorda};}
  /* Raport poniżej 1 MB (Grzegorz 05/11/2026; przegląd ChatGPT 09/11/2026, pkt 6): pytanie i zmniejszanie – moduly/word (OESTWord.dopasuj,
     jedno miejsce z inspekcjami); tu tylko Reactive: zdjęcia od 1600 px, nie mniej niż 400 px. ask=false → bez pytania (podgląd). */
  const PX=1600;
  function biggest(r){return Math.max(...['docx','pdf'].map(k=>r&&r[k]?(r[k].byteLength??r[k].length??0):0));}
  async function fit(fields,records,ask=true){const r=await build(fields,records,{px:PX});return ask?OESTWord.dopasuj(r,{rozmiar:biggest,min:400/PX,buduj:s=>build(fields,records,{px:Math.round(PX*s)})}):r;}
  return {build,fit,sekcje,uklad};
});
