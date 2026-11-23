/* Nagrywanie notatek głosowych (OESTVoice) – część modułu moduly/notatki (08/11/2026, wcześniej app/www/handover-voice.js).
   Nagranie (Android: wtyczka HandoverTools, przeglądarka: MediaRecorder), zamiana na tekst offline (Android 13+), przycisk „przytrzymaj i mów” (ekran nagrywania rysuje szkielet Ionic – OESTCzesci, czesci/Nagrywanie.vue). */
(function(w){
  'use strict';const base64=blob=>w.OESTNarzedzia.blobB64(blob); // moduly/narzedzia
  function create(o={}){const maxMs=o.maxMs||120000;let started=0,opening=false,stopping=null,recording=false,stream=null,recorder=null,chunks=[],timer;const native=()=>w.Capacitor?.isNativePlatform()&&w.Capacitor.Plugins.HandoverTools;
    async function start(){if(recording||opening)throw Error('AUDIO_ALREADY_RECORDING');opening=true;try{if(native())await native().startAudio();else{if(!navigator.mediaDevices?.getUserMedia||!w.MediaRecorder)throw Error('AUDIO_UNAVAILABLE');stream=await navigator.mediaDevices.getUserMedia({audio:true});chunks=[];recorder=new MediaRecorder(stream);recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.start();}}finally{opening=false;}recording=true;started=Date.now();o.onState?.(true);timer=setTimeout(()=>stop().catch(e=>o.onError?.(e)),maxMs);}
    function stop(opt){if(stopping)return stopping;if(!recording)return Promise.resolve();stopping=doStop(!!opt?.discard).finally(()=>{stopping=null;});return stopping;}
    async function doStop(discard){let blob;try{if(native()){const result=await native().stopAudio();blob=new Blob([Uint8Array.from(atob(result.data),c=>c.charCodeAt(0))],{type:'audio/wav'});}else{await new Promise(resolve=>{recorder.onstop=resolve;recorder.stop();});blob=new Blob(chunks,{type:recorder.mimeType});}const media={id:crypto.randomUUID(),kind:'audio',name:'Voice note',mime:blob.type,blob,size:blob.size,ms:started?Date.now()-started:0};if(discard)return null;await o.onAudio?.(media);return media;}finally{recording=false;clearTimeout(timer);stream?.getTracks().forEach(t=>t.stop());stream=null;recorder=null;chunks=[];o.onState?.(false);}}
    async function transcribe(blob){if(recording)throw Error('STOP_RECORDING_FIRST');if(!native())throw Error('ANDROID_TRANSCRIPTION_REQUIRED');try{return await native().transcribe({data:await base64(blob)});}catch(e){throw Error(speechText(e?.message||String(e)));}}
    return {start,stop,transcribe,maxMs,get recording(){return recording;},get busy(){return recording||opening||!!stopping;},get elapsed(){return recording?Date.now()-started:0;}};
  }const SPEECH={SPEECH_PL_DOWNLOAD:['Telefon nie ma jeszcze polskiego pakietu mowy offline. Poprosiłem system o pobranie — po kilku minutach stuknij „Na tekst” jeszcze raz. Jeśli nic się nie pobiera: Ustawienia → Google → Rozpoznawanie mowy offline → polski.','The phone does not have the offline Polish speech pack yet. I asked the system to download it — tap “To text” again in a few minutes. If nothing downloads: Settings → Google → Offline speech recognition → Polish.'],SPEECH_EMPTY:['Nie rozpoznano słów w tym nagraniu. Odsłuchaj je — jeśli mowa jest słyszalna, nagraj jeszcze raz, mówiąc bliżej telefonu.','No words recognised in this recording. Listen to it — if speech is audible, record again closer to the phone.'],SPEECH_ERROR_7:['Nie rozpoznano słów w tym nagraniu. Odsłuchaj je — jeśli mowa jest słyszalna, nagraj jeszcze raz, mówiąc bliżej telefonu.','No words recognised in this recording. Listen to it — if speech is audible, record again closer to the phone.'],AUDIO_SILENT:['To nagranie jest puste albo prawie ciche — mikrofon nic nie złapał. Nagraj jeszcze raz.','This recording is empty or almost silent — the microphone caught nothing. Record again.'],SPEECH_ERROR_6:['W nagraniu nie było słychać mowy.','No speech could be heard in the recording.'],SPEECH_BUSY:['Poprzednie nagranie jest jeszcze zamieniane na tekst.','The previous recording is still being turned into text.'],SPEECH_TIMEOUT:['Zamiana na tekst trwała za długo. Spróbuj krótszego nagrania.','Turning it into text took too long. Try a shorter recording.'],ON_DEVICE_POLISH_SPEECH_UNAVAILABLE:['Ten telefon nie ma rozpoznawania mowy offline.','This phone has no offline speech recognition.'],RECORDED_SPEECH_REQUIRES_ANDROID_13:['Zamiana nagrania na tekst wymaga Androida 13.','Turning a recording into text needs Android 13.'],MICROPHONE_DENIED:['Brak zgody na mikrofon.','No permission for the microphone.']};
  const L=(pl,en)=>w.OESTT?w.OESTT(pl,en):pl;const speechText=code=>SPEECH[code]?L(SPEECH[code][0],SPEECH[code][1]):L('Nie udało się zamienić na tekst (','Could not turn it into text (')+code+').';
  // Przycisk nagrywania: przytrzymaj = nagrywa do puszczenia; stuknij = nagrywa do „Zakończ” albo limitu. Na ekranie duży migający mikrofon.
  function holdButton(button,voice,onError){let starting=false,stopAfterStart=false,ui=null,tick=null;const fmt=ms=>{const s=Math.floor(ms/1000);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
    // ekran nagrywania rysuje szkielet Ionic (moduly/szkielet/src/czesci/Nagrywanie.vue przez OESTCzesci.pokaz); tu tylko stan: czas, postęp, Zakończ
    const hide=()=>{clearInterval(tick);tick=null;if(ui){const u=ui;ui=null;u.koniec=true;u.emit();}};
    const show=()=>{if(ui)return;let subs=[];const u={czas:'0:00 / '+fmt(voice.maxMs),postep:0,koniec:false};
      const dane=()=>({czas:u.czas,postep:u.postep,koniec:u.koniec,podpowiedz:L('Mów teraz. Puść przycisk albo stuknij Zakończ.','Speak now. Release the button or tap Finish.'),zakoncz:L('Zakończ','Finish')});
      u.emit=()=>{const d=dane();subs.slice().forEach(f=>{try{f(d);}catch(e){console.error(e);}});};ui=u;
      /* Wstecz telefonu w trakcie nagrywania = Zakończ (nagranie zapisane), nie wyjście ze strony */
      const k={dane,na:f=>{subs.push(f);return()=>{subs=subs.filter(x=>x!==f);};},akcja:a=>{if(a==='zakoncz')finish();},zamknij:()=>{if(ui===u)finish();}};
      if(w.OESTCzesci)w.OESTCzesci.pokaz('Nagrywanie',k).catch(e=>console.error(e));
      tick=setInterval(()=>{if(!voice.recording){hide();return;}const e=voice.elapsed;u.czas=fmt(e)+' / '+fmt(voice.maxMs);u.postep=Math.min(1,e/voice.maxMs);u.emit();},200);};
    // Nagrania krótsze niż 1 s (przypadkowe muśnięcie) nie są zapisywane
    const finish=()=>{hide();if(voice.recording){const tooShort=voice.elapsed<1000;voice.stop(tooShort?{discard:true}:undefined).catch(onError);}};
    let pressT=null,hold=false,x0=0,y0=0;
    const begin=async asHold=>{hold=asHold;stopAfterStart=false;starting=true;try{await voice.start();show();if(stopAfterStart)finish();}catch(err){hide();onError(err);}finally{starting=false;}};
    // Start dopiero po 0,3 s trzymania bez przesuwania palca (przytrzymanie) albo po pełnym stuknięciu — przewijanie i muśnięcie nic nie robią
    button.addEventListener('pointerdown',e=>{if(starting||pressT)return;if(voice.recording){finish();return;}x0=e.clientX;y0=e.clientY;pressT=setTimeout(()=>{pressT=null;try{button.setPointerCapture(e.pointerId);}catch(_){}begin(true);},300);});
    button.addEventListener('pointermove',e=>{if(pressT&&Math.hypot(e.clientX-x0,e.clientY-y0)>12){clearTimeout(pressT);pressT=null;}});
    button.addEventListener('pointerup',()=>{if(pressT){clearTimeout(pressT);pressT=null;begin(false);return;}if(!hold)return;hold=false;if(starting)stopAfterStart=true;else if(voice.recording)finish();});
    // Przewinięcie w trakcie trzymania: nagrywanie trwa dalej, kończy się przyciskiem Zakończ
    button.addEventListener('pointercancel',()=>{if(pressT){clearTimeout(pressT);pressT=null;}hold=false;});
    // Palec/kursor zjechał z przycisku przed startem — porzucony gest nie włącza mikrofonu
    button.addEventListener('pointerleave',()=>{if(pressT){clearTimeout(pressT);pressT=null;}});
    button.addEventListener('contextmenu',e=>e.preventDefault());
    // Enter/Spacja/czytnik ekranu dają click bez wskaźnika (detail 0): stuknięcie = start/stop
    button.addEventListener('click',e=>{if(e.detail!==0||starting)return;if(voice.recording){finish();return;}begin(false);});
    return {hide};}
  w.OESTVoice={create,base64,holdButton,speechText};
})(window);
