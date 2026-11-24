// Wspólne części rysowane przez szkielet (Ionic + Vue) dla wspólnych modułów: moduly/aparat, moduly/notatki, moduly/ladowanie, moduly/odczyt.
// Moduł trzyma logikę i dane, szkielet tylko pokazuje (Grzegorz 23/11/2026: „framework jest, kolejny ekran to dołożenie przycisku”).
// Wzór łączenia: moduł daje „kontroler” – zwykły obiekt { dane() → zwykły obiekt, na(fn) → wyłącz, akcja(nazwa, …) } – a część Vue
// (src/czesci/*.vue) pokazuje dane() i woła akcja(). Nic tu nie liczy i nie zapisuje.
//
//   OESTCzesci.pokaz(nazwa, kontroler, { pelny })   okno na cały ekran (ion-modal) z częścią; Wstecz / zmiana ekranu = kontroler.zamknij()
//   OESTCzesci.montuj(el, nazwa, wlasciwosci)        część Vue w miejscu starego kodu (np. pasek notatek w ekranie jeszcze bez Vue) → odmontuj()
//   OESTCzesci.plotno(w, h)                          niewidoczne płótno do obróbki zdjęcia w pamięci (aparat, odczyt)
//   OESTCzesci.ladowanie.show(tekst) / .hide() / .inline(el, tekst) / .ring()   kółko „pracuję” (ion-loading / ion-spinner)
//   OESTCzesci.okno(nazwa, kontroler, o)             OESTOkna.okno z częścią i kontrolerem (lista notatek, propozycja, odczyt)
//   OESTCzesci.sluchacze(dane)                       { na, emit } dla kontrolera modułu (emit = powiadom część Vue o nowych danych)
import { createApp, h, markRaw } from 'vue';
import { modalController, loadingController, IonSpinner } from '@ionic/vue';
import Aparat from './czesci/Aparat.vue';
import EdytorZdjec from './czesci/EdytorZdjec.vue';
import Notatki from './czesci/Notatki.vue';
import NotatkiOkno from './czesci/NotatkiOkno.vue';
import NotatkiPropozycja from './czesci/NotatkiPropozycja.vue';
import NotatkaNowa from './czesci/NotatkaNowa.vue';
import Nagrywanie from './czesci/Nagrywanie.vue';
import Ladowanie from './czesci/Ladowanie.vue';
import OdczytArkusz from './czesci/OdczytArkusz.vue';
import KolejkaInsp from './czesci/KolejkaInsp.vue';

const CZESCI = { Aparat, EdytorZdjec, Notatki, NotatkiOkno, NotatkiPropozycja, NotatkaNowa, Nagrywanie, Ladowanie, OdczytArkusz, KolejkaInsp };
void IonSpinner; // <ion-spinner> zdefiniowany także dla napisów starego kodu (OESTLadowanie.ring())

export function zainstaluj(w, OESTOkna, T) {
  const d = w.document;
  function czesc(n) { const k = CZESCI[n]; if (!k) throw Error('OESTCzesci: ' + n); return markRaw(k); }

  // okno na cały ekran z częścią; kończy je kontroler (dane().koniec) albo Wstecz / zmiana ekranu (wtedy kontroler.zamknij())
  async function pokaz(nazwa, kontroler, o) {
    o = o || {};
    const m = await modalController.create({ component: czesc(nazwa), componentProps: { kontroler, T }, backdropDismiss: false, htmlAttributes: { 'data-oest-czesc': nazwa } });
    let zwolnij = null, po = false;
    const koniec = () => { if (po) return; po = true; if (zwolnij) { zwolnij(); zwolnij = null; } };
    zwolnij = OESTOkna.open(() => { if (kontroler.zajety && kontroler.zajety()) return; m.dismiss(undefined, 'cancel'); }); // okienko zajęte (np. podgląd przy edycji) odmawia
    const wylacz = kontroler.na ? kontroler.na(dn => { if (dn && dn.koniec) { koniec(); m.dismiss(undefined, 'koniec'); } }) : null;
    m.onDidDismiss().then(r => { koniec(); if (wylacz) wylacz(); if (r.role !== 'koniec' && kontroler.zamknij) kontroler.zamknij(); });
    if (kontroler.dane && kontroler.dane().koniec) { koniec(); return m; } // kontroler skończył, zanim okno się pokazało
    await m.present();
    if (kontroler.dopasuj) kontroler.dopasuj();
    return m;
  }

  // OESTOkna.okno z częścią i kontrolerem: { tytul, ok, anuluj, … } → Promise<{ ok }>; po zamknięciu kontroler.zamknij()
  async function okno(nazwa, kontroler, o) {
    const r = await OESTOkna.okno({ wyglad: nazwa, ...(o || {}), komponent: czesc(nazwa), wlasciwosci: { kontroler } });
    if (kontroler.zamknij) kontroler.zamknij(r);
    return r;
  }

  // część Vue wewnątrz elementu starego kodu
  function montuj(el, nazwa, wl) {
    if (!el) return null;
    if (el.__oestCzesc) { try { el.__oestCzesc.unmount(); } catch (e) {} el.__oestCzesc = null; }
    const app = createApp({ render: () => h(czesc(nazwa), { ...(wl || {}), T }) });
    app.mount(el); el.__oestCzesc = app;
    return { odmontuj() { try { app.unmount(); } catch (e) {} if (el.__oestCzesc === app) el.__oestCzesc = null; } };
  }

  function plotno(wd, ht) { const c = d.createElement('canvas'); c.width = Math.max(1, Math.round(wd || 1)); c.height = Math.max(1, Math.round(ht || 1)); return c; }

  // ---------- kółko „pracuję” (jedno w całej apce, Grzegorz 04/11/2026) ----------
  let ladowanie = null, tekstLad = '', czekaLad = null, ukryj = false;
  const ladowanieApi = {
    ring() { return '<ion-spinner name="crescent" aria-hidden="true"></ion-spinner>'; },
    show(t) {
      tekstLad = t || T('Pracuję…', 'Working…'); ukryj = false;
      if (ladowanie) { ladowanie.message = tekstLad; return; }
      if (czekaLad) return;
      // jak na main: kółko nad tekstem, bez przyciemnienia i bez blokowania stuknięć (pointer-events w szkielet.css), bez łapania fokusu
      czekaLad = loadingController.create({ message: tekstLad, spinner: 'crescent', showBackdrop: false, cssClass: 'ion-disable-focus-trap', htmlAttributes: { 'data-oest-ladowanie': '' } }).then(async l => {
        ladowanie = l; l.message = tekstLad; await l.present(); czekaLad = null;
        if (ukryj) ladowanieApi.hide();
      });
    },
    hide() {
      ukryj = true;
      if (ladowanie && !czekaLad) { const l = ladowanie; ladowanie = null; l.dismiss(); }
    },
    inline(el, t) { montuj(el, 'Ladowanie', { tekst: t || '' }); },
    css() {}
  };

  // słuchacze kontrolera: { na(fn) → wyłącz, emit() } – emit podaje słuchaczom świeże dane() (jedno miejsce dla wszystkich modułów)
  function sluchacze(dane) {
    let subs = [];
    return {
      na(fn) { subs.push(fn); return () => { subs = subs.filter(f => f !== fn); }; },
      emit() { const x = dane(); subs.slice().forEach(f => { try { f(x); } catch (e) { console.error(e); } }); }
    };
  }
  const OESTCzesci = { pokaz, okno, montuj, plotno, sluchacze, ladowanie: ladowanieApi };
  w.OESTCzesci = OESTCzesci;
  return OESTCzesci;
}
