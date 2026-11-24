// Szkielet apki OEST (Ionic + Vue) – JEDNO miejsce na: ramę ekranu (pasek ze strzałką i tytułem + treść), nawigację
// między ekranami, klawisz/gest Wstecz Androida i stos okienek. Decyzja Grzegorza 21/11/2026: apka stoi na Ionic + Vue,
// nic obok. Budowanie: app/vite.szkielet.config.mjs → app/www/moduly/szkielet/lib/szkielet.js (+ szkielet.css).
//
// Interfejs dla reszty apki (stary kod łączy się tylko przez niego):
//   OESTEkrany.start({ naEkran(trasa), trasa })  apka: rama + nawigacja; naEkran rysuje treść ekranu (do czasu przejścia ekranu na Vue)
//   OESTEkrany.strona({ up })                     osobna strona (inspekcje): rama, przewijanie, Wstecz i okienka
//   OESTEkrany.go(trasa) / .up() / .trasa()        nawigacja; historia przeglądarki NIE jest stanem (adres tylko replaceState)
//   OESTEkrany.zamien(trasa)                       nowy adres tego samego ekranu bez rysowania (np. szkic → zapisane zlecenie)
//   OESTEkrany.straz(przedrostek, fn)              przed wyjściem w górę: fn() → false = zostań, true = rodzic
//   OESTEkrany.rodzicDanych(przedrostek, fn)       rodzic liczony z danych ekranu: fn(trasa) → trasę rodzica albo null (wtedy rodzic z mapy ekrany.json)
//   OESTEkrany.ponow()                             po „Opuść” w pytaniu o niezapisane zmiany: dokończ wyjście
//   OESTEkrany.otworzStrone(url)                   przejście na inną stronę apki bez wpisu w historii (inspekcje)
//   OESTOkna.komunikat({ tytul, tresc, przyciski }) → Promise<rola>   okienko Ionic (ion-alert) dla starego kodu
//   OESTEkrany.naGore() / .przewiniecie() / .przewin(y)   przewijanie treści ramy
//   OESTRama.ustaw({ nad, tytul, akcje: [Node], jezyk: true|fn })   nagłówek bieżącego ekranu (domyślnie nazwa z ekrany.json)
//   OESTOkna.open(zamknij) → zwolnij               okienko na wierzchu: Wstecz woła zamknij(); okienko po zamknięciu woła zwolnij()
//   OESTOkna.ile() / .zamknijGorne() / .zamknijWszystkie()
//   OESTOkna.pytaj({ tytul, tresc, ok, anuluj, niebezpieczne, tylkoOk }) → Promise<bool>   „Na pewno?” / komunikat (ion-alert)
//   OESTOkna.okno({ tytul, komponent, wlasciwosci, ok, anuluj }) → Promise<{ ok, dane }>   okienko z treścią Vue (ion-modal)
//   OESTOkna.wybor({ tytul, opcje: [{ tekst, wartosc }] }) → Promise<wartosc|null>      wybór akcji (ion-action-sheet)
//   OESTCzesci.pokaz / okno / montuj / plotno / ladowanie    wygląd wspólnych modułów (aparat, notatki, ładowanie, odczyt) – src/czesci.js
import { createApp, h, reactive, markRaw, nextTick } from 'vue';
import { createRouter, createMemoryHistory } from 'vue-router';
import { IonicVue, alertController, modalController, actionSheetController } from '@ionic/vue';
import '@ionic/vue/css/core.css';
// structure.css (rama na cały ekran) – osobno: lib/struktura.css tylko na stronie z ramą (app/www/index.html), patrz app/scripts/copy-web.js
import '@ionic/vue/css/padding.css';
import '@ionic/vue/css/display.css';
import '@ionic/vue/css/text-alignment.css';
import '@ionic/vue/css/flex-utils.css'; // ion-justify-content-* (wiersze przycisków edytora zdjęć)
import '@ionic/vue/css/palettes/dark.always.css'; // apka jest ciemna (motyw „Szkło i poświata”): ciemna paleta Ionic
import mapa from '../../ekrany/ekrany.json';
import Rama from './Rama.vue';
import Okno from './czesci/Okno.vue';
import { EKRANY_VUE } from './ekrany/index.js';
import './szkielet.css';
import { zainstaluj as zainstalujCzesci } from './czesci.js';

const w = window, d = document;
// czyta stan.wersja: każdy tekst T(…) w szablonie sam zależy od zmiany języka (komponenty w slotach ion-card nie przerysowują się inaczej)
const T = (pl, en) => (stan.wersja, w.OESTT ? w.OESTT(pl, en) : pl);

// ---------- okienka: jeden stos w pamięci (bez wpisów historii) ----------
const stos = [];
const OESTOkna = {
  open(zamknij) { stos.push(zamknij); return () => { const i = stos.lastIndexOf(zamknij); if (i >= 0) stos.splice(i, 1); }; },
  ile() { return stos.length + d.querySelectorAll('dialog[open]').length; },
  zamknijGorne() {
    // wpis zdejmuje samo okienko (zwolnij), gdy naprawdę się zamknie – okienko zajęte (np. aparat przy edycji) może odmówić i zostaje na stosie
    if (stos.length) { const z = stos[stos.length - 1]; try { z(); } catch (e) { console.error(e); const i = stos.lastIndexOf(z); if (i >= 0) stos.splice(i, 1); } return true; }
    const dl = d.querySelectorAll('dialog[open]');
    if (dl.length) { try { dl[dl.length - 1].close(); } catch (e) {} return true; }
    return false;
  },
  zamknijWszystkie() { // zmiana ekranu: zamyka wszystko i czyści stos także z okienek, które odmówiły
    while (stos.length) { const z = stos.pop(); try { z(); } catch (e) { console.error(e); } }
    d.querySelectorAll('dialog[open]').forEach(x => { try { x.close(); } catch (e) {} });
  },
  // okienko z komunikatem Ionic (ion-alert) dla starego kodu: zostaje do zamknięcia, Wstecz je zamyka; zwraca rolę wciśniętego przycisku
  // OESTOkna.komunikat({ tytul, tresc, przyciski: [{ text, role }] }) → Promise<role>
  async komunikat(o) {
    const a = await alertController.create({ header: o.tytul || '', message: o.tresc || '', backdropDismiss: false, buttons: o.przyciski || [{ text: 'OK', role: 'ok' }] });
    await a.present();
    return (await a.onDidDismiss()).role;
  },
  // JEDNO okienko „Na pewno?” w całej apce (Grzegorz 04/11/2026) na ion-alert: stuknięcie obok i Wstecz = Anuluj.
  // OESTOkna.pytaj({ tytul, tresc, ok, anuluj, niebezpieczne, tylkoOk }) → Promise<true|false>
  async pytaj(o) {
    o = o || {};
    const przyciski = o.tylkoOk ? [{ text: o.ok || 'OK', role: 'confirm' }]
      : [{ text: o.anuluj || T('Anuluj', 'Cancel'), role: 'cancel' }, { text: o.ok || T('Tak', 'Yes'), role: o.niebezpieczne ? 'destructive' : 'confirm' }];
    const a = await alertController.create({ header: o.tytul || undefined, message: o.tresc || undefined, buttons: przyciski });
    await a.present();
    const r = (await a.onDidDismiss()).role;
    return o.tylkoOk ? true : r === 'confirm' || r === 'destructive';
  },
  // okienko z własną treścią (komponent Vue): OESTOkna.okno({ tytul, komponent, wlasciwosci, ok, anuluj, niebezpieczne, bezPrzyciskow, wyglad, pelny, karta }) → Promise<{ ok, dane }>
  // wyglad (opcjonalnie): nazwa wyglądu okienka w szkielet.css (data-oest-okno), np. wspólne moduły jako małe okienko na środku jak dawniej
  //   pelny: podgląd na cały ekran bez paska tytułu (ciemne tło, treść na środku) – jak dawny podgląd zdjęcia; karta: karta na środku jak dawne okienko apki (szkielet.css, .oest-karta)
  async okno(o) {
    o = o || {};
    const m = await modalController.create({ component: Okno, componentProps: { ...o, T }, htmlAttributes: o.wyglad ? { 'data-oest-okno': o.wyglad } : undefined, cssClass: o.wyglad ? undefined : o.pelny ? 'oest-karta oest-podglad' : o.karta ? 'oest-karta' : undefined });
    const zwolnij = OESTOkna.open(() => { m.dismiss(undefined, 'cancel'); }); // zmiana ekranu zamyka też to okienko (R4)
    await m.present();
    const r = await m.onDidDismiss();
    zwolnij();
    return r.data || { ok: false, dane: null };
  },
  // wybór jednej z kilku akcji (ion-action-sheet): OESTOkna.wybor({ tytul, opcje: [{ tekst, wartosc, niebezpieczne }] }) → Promise<wartosc|null>
  async wybor(o) {
    o = o || {};
    const a = await actionSheetController.create({ header: o.tytul || undefined, buttons: [...(o.opcje || []).map(x => ({ text: x.tekst, role: x.niebezpieczne ? 'destructive' : undefined, data: x.wartosc })), { text: T('Anuluj', 'Cancel'), role: 'cancel' }] });
    await a.present();
    const r = await a.onDidDismiss();
    return r.role === 'cancel' || r.role === 'backdrop' ? null : (r.data === undefined ? null : r.data);
  }
};

// ---------- mapa ekranów (moduly/ekrany/ekrany.json) → trasy Vue Router ----------
const Pusty = { render: () => null };
const routes = mapa.ekrany.map(e => ({ path: '/' + e.id, name: e.id, component: Pusty, alias: (e.aliasy || []).map(a => '/' + a), meta: { id: e.id, rodzic: e.rodzic, pl: e.pl, en: e.en, jezyk: !!e.jezyk } }));
routes.push({ path: '/:reszta(.*)*', name: '-nieznany', component: Pusty, meta: {} });
const router = createRouter({ history: createMemoryHistory(), routes });

function czysta(t) { return String(t == null ? '' : t).replace(/^#?\/*/, '') || 'home'; }
// ekran z mapy dla trasy; trasa spoza mapy (np. reactive/job/12/coś) = najbliższy ekran nad nią
function dopasuj(t) {
  let p = czysta(t).split('/');
  while (p.length) { const r = router.resolve('/' + p.join('/')); if (r.name !== '-nieznany') return r; p = p.slice(0, -1); }
  return router.resolve('/home');
}
const rodziceDanych = []; // OESTEkrany.rodzicDanych: rodzic liczony z danych ekranu (fn(trasa) → trasę rodzica albo null)
function rodzic(t) {
  const s = rodziceDanych.filter(x => t === x.p || t.indexOf(x.p + '/') === 0).sort((a, b) => b.p.length - a.p.length)[0];
  if (s) { const cel = s.fn(t); if (cel) return cel; } // rodzic z danych (np. węzeł drzewka); null → rodzic z mapy
  const r = dopasuj(t), id = r.meta.rodzic;
  if (!id) return null;
  try { return router.resolve({ name: id, params: r.params }).fullPath.slice(1); } catch (e) { return id.split('/:')[0]; }
}

// ---------- stan ramy ----------
// komponent: ekran przeniesiony na Ionic + Vue (moduly/szkielet/src/ekrany); null = ekran jeszcze w starym kodzie (.wrap, licznik bramki)
const stan = reactive({ trasa: '', glowny: true, meta: {}, nad: '', tytul: '', akcje: [], jezyk: false, jezykFn: null, wersja: 0, komponent: null, okna: 0 });
// otwarte okienka Ionic (ion-modal, ion-alert, …): strona bez ramy (inspekcje) pokazuje ion-app tylko na ich czas
for (const n of ['Modal', 'Alert', 'ActionSheet', 'Loading', 'Popover', 'Picker']) {
  d.addEventListener('ion' + n + 'WillPresent', () => { stan.okna++; });
  d.addEventListener('ion' + n + 'DidDismiss', () => { stan.okna = Math.max(0, stan.okna - 1); });
}
let naEkran = null, czeka = null, pytam = false, tryb = '', stronaUp = null, scrollEl = null;
const straze = [];
function straz(t) { const s = straze.filter(x => t === x.p || t.indexOf(x.p + '/') === 0).sort((a, b) => b.p.length - a.p.length)[0]; return s && s.fn; }

function naglowekDomyslny() {
  const m = stan.meta;
  stan.nad = ''; stan.akcje = []; stan.jezykFn = null; stan.jezyk = !!m.jezyk;
  stan.tytul = m.pl ? T(m.pl, m.en) : '';
}
const pozycje = {}; // przewinięcie ekranów na Vue: Wstecz wraca w to samo miejsce
function wykonaj(cel, o) {
  cel = czysta(cel);
  if (stan.komponent && stan.trasa) pozycje[stan.trasa] = OESTEkrany.przewiniecie();
  const wroc = !!(o && o.wstecz) || (!!stan.trasa && rodzic(stan.trasa) === cel); // powrót do rodzica (także starą strzałką ‹)
  OESTOkna.zamknijWszystkie(); // zmiana ekranu zamyka okienka (R4)
  router.replace('/' + cel);
  const r = dopasuj(cel);
  stan.trasa = cel; stan.meta = r.meta; stan.glowny = !r.meta.rodzic; naglowekDomyslny();
  const k = EKRANY_VUE[r.meta.id]; stan.komponent = k ? markRaw(k) : null;
  const wrap = d.querySelector('.wrap'); if (wrap) wrap.hidden = !!k; // ekran na Vue: stary kod schowany
  try { history.replaceState(null, '', '#' + cel); } catch (e) {}
  d.dispatchEvent(new CustomEvent('oest:ekran', { detail: { trasa: cel, wstecz: !!(o && o.wstecz) } }));
  if (naEkran) naEkran(cel);
  if (k) { const y = wroc ? pozycje[cel] || 0 : 0; let n = 0; const pr = () => { OESTEkrany.przewin(y); if (Math.abs(OESTEkrany.przewiniecie() - y) > 1 && ++n < 30) requestAnimationFrame(pr); }; nextTick(pr); } // komponenty Ionic dorysowują się chwilę – ponawiaj do skutku (max ~0,5 s)
  return true;
}
function go(cel) { cel = czysta(cel); if (cel === 'up') return up(); czeka = null; return wykonaj(cel, {}); }
function up() {
  // ekran jeszcze w starym kodzie (licznik bramki „Poza Ionic/Vue”): jego własna strzałka ‹ zna stany wewnętrzne
  // (podgląd, kreator, niezapisane zmiany) – Wstecz robi to samo co ona. Ekran na Vue nie ma starej strzałki.
  const stara = !stan.komponent && [...d.querySelectorAll('.view:not([hidden]) .top .back:not(.rx-gear)')]
    .find(b => b.offsetParent !== null && (tryb === 'strona' || b.getAttribute('data-nav') !== 'up'));
  if (stara) { stara.click(); return; }
  if (tryb === 'strona') { if (stronaUp) stronaUp(); return; }
  const t = stan.trasa, s = straz(t), p = rodzic(t);
  if (s && s() === false) { czeka = p ? { cel: p } : null; return false; } // straż: false = zostań, true = rodzic (rodzicDanych albo mapa)
  if (!p) return wyjscie();
  czeka = null;
  return wykonaj(p, { wstecz: true });
}
function ponow() { const c = czeka; czeka = null; if (c) wykonaj(c.cel, { wstecz: true }); }
function wyjscie() {
  if (pytam) return;
  const P = w.OESTPrzycisk, App = w.Capacitor && w.Capacitor.Plugins && w.Capacitor.Plugins.App;
  const zamknij = () => { if (App && App.exitApp) App.exitApp(); };
  if (!P || !P.confirm) { zamknij(); return; }
  pytam = true;
  Promise.resolve(P.confirm(T('Chcesz wyjść z aplikacji?', 'Do you want to exit the app?'), { ok: T('Tak', 'Yes'), cancel: T('Nie', 'No'), danger: false }))
    .then(tak => { pytam = false; if (tak) zamknij(); }, () => { pytam = false; });
}

// ---------- Wstecz Androida: jedna obsługa przez Ionic (ionBackButton, priorytety) ----------
// 100: okienka Ionic (ion-alert, ion-modal…); 99: okienko starego kodu na wierzchu (OESTOkna.open); 10: ekran o poziom wyżej / pytanie o wyjście
d.addEventListener('ionBackButton', e => {
  e.detail.register(99, async next => {
    // okienko Ionic bez zamykania stuknięciem obok (backdropDismiss: false) – Ionic go nie zamyka Wstecz, więc robimy to tu
    for (const c of [alertController, modalController, actionSheetController]) { const t = await c.getTop(); if (t) { t.dismiss(undefined, 'cancel'); return; } }
    if (!OESTOkna.zamknijGorne()) next();
  });
  e.detail.register(10, () => { if (tryb) up(); });
});

// ---------- kliknięcia: data-nav="ekran" / data-nav="up" (R26) ----------
function kliknij(e) {
  const b = e.target.closest && e.target.closest('[data-nav]');
  if (!b || b.disabled || !tryb) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const cel = b.getAttribute('data-nav');
  if (cel === 'up') { up(); return; }
  go(cel);
  if (b.dataset.title) stan.tytul = b.dataset.title;
}
d.addEventListener('click', kliknij, true);

function setLang() {
  const next = (w.OESTBledy && w.OESTBledy.lang ? w.OESTBledy.lang() : (d.documentElement.lang || 'pl')) === 'en' ? 'pl' : 'en';
  if (stan.jezykFn) { stan.jezykFn(next); return; }
  try { w.OESTSettings.update(s => { s.appearance.language = next; }); w.OESTSettingsUI.applyTheme(); }
  catch (e) { w.dispatchEvent(new CustomEvent('oest:lang')); }
}
w.addEventListener('oest:lang', () => { if (!tryb) return; const t = stan.tytul, m = stan.meta; if (m.pl && (t === m.pl || t === m.en)) stan.tytul = T(m.pl, m.en); stan.wersja++; });

function montuj(zRama) {
  const host = d.createElement('div'); host.id = 'oest-szkielet';
  d.body.insertBefore(host, d.body.firstChild);
  // T dla ekranów Vue czyta stan.wersja: każdy tekst T('…','…') (także w slotach komponentów Ionic) odświeża się po zmianie PL/EN
  const Tv = (pl, en) => (stan.wersja, T(pl, en));
  const app = createApp({ render: () => h(Rama, { stan, strona: !zRama, onGotowe: el => { scrollEl = el; }, onJezyk: setLang, T: Tv }) });
  app.use(IonicVue, { mode: 'md', hardwareBackButton: true, animated: true, swipeBackEnabled: false });
  app.use(router);
  app.mount(host);
}

const OESTEkrany = {
  start(o) {
    if (tryb) return; tryb = 'apka'; naEkran = o && o.naEkran;
    montuj(true);
    wykonaj(czysta(o && o.trasa), {});
  },
  strona(o) { if (tryb) return; tryb = 'strona'; stronaUp = o && o.up; montuj(false); },
  go, up, ponow, trasa: () => stan.trasa,
  jestVue: t => !!EKRANY_VUE[dopasuj(t).meta.id],
  zamien(cel) { cel = czysta(cel); router.replace('/' + cel); stan.trasa = cel; try { history.replaceState(null, '', '#' + cel); } catch (e) {} },
  straz(p, fn) { straze.push({ p: czysta(p), fn }); },
  rodzicDanych(p, fn) { rodziceDanych.push({ p: czysta(p), fn }); },
  rodzic,
  otworzStrone(url) { location.replace(url); },
  naGore() { if (scrollEl) scrollEl.scrollTop = 0; else w.scrollTo(0, 0); },
  przewiniecie() { return scrollEl ? scrollEl.scrollTop : (w.scrollY || 0); },
  przewin(y) { if (scrollEl) scrollEl.scrollTop = y || 0; else w.scrollTo(0, y || 0); }
};
const OESTRama = {
  ustaw(o) {
    o = o || {};
    if ('nad' in o) stan.nad = o.nad || '';
    if ('tytul' in o) stan.tytul = o.tytul == null ? '' : String(o.tytul);
    if ('akcje' in o) stan.akcje = (o.akcje || []).filter(Boolean);
    if ('jezyk' in o) { stan.jezyk = !!o.jezyk; stan.jezykFn = typeof o.jezyk === 'function' ? o.jezyk : null; }
  },
  stan: () => ({ nad: stan.nad, tytul: stan.tytul, jezyk: stan.jezyk, akcje: stan.akcje.length })
};
w.OESTEkrany = OESTEkrany; w.OESTRama = OESTRama; w.OESTOkna = OESTOkna;
zainstalujCzesci(w, OESTOkna, T); // OESTCzesci: wygląd wspólnych modułów (aparat, notatki, ładowanie, odczyt) – src/czesci.js
