/* Moduł wiedzy o budynku (moduly/wiedza) – wielokrotnego użytku, bez kodu inspekcji.
 *
 * Jedna baza dla całej apki: Info, Power trace, Klucze, „Dodaj do bazy”, a w przyszłości inne apki.
 * Wszystko jest „obiektem” z kodem (pomieszczenie, DB, obwód, drzwi, klucz, włącznik, kran…)
 * i każdy obiekt (poza budynkiem) MUSI mieć miejsce. Zależności to „powiązania”: z → rel → do.
 *
 *   var W = OESTWiedza.create();                  // w przeglądarce magazyn IndexedDB „oest-wiedza”
 *   await W.zapisz({ kod: 'B-UG-SPA-PLANT', typ: 'pomieszczenie', nazwa: 'Plant room SPA', miejsce: 'B-UG' });
 *   await W.powiaz('KL-RISER', 'otwiera', 'DR-B-UG-SPA');
 *   await W.szukaj('pompa spa');  await W.lancuch('B-L10-KORYTARZ', 'zasila', 'wstecz');
 *   await W.sprawdz();  await W.eksportJSON();  await W.arkusz();
 *
 * Moduł pilnuje: unikalnego kodu, znanego typu, istniejącego miejsca, braku pętli w miejscach,
 * powiązań tylko do istniejących obiektów. Nowe wpisy mają status „propozycja” – zatwierdza człowiek.
 * Magazyn podaje się z zewnątrz ({ load(), update(fn) } – update atomowo: stan → { stan, wynik }), więc moduł działa też w testach i w innych apkach.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OESTWiedza = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var TYPY = {
    budynek: 'Budynek', pietro: 'Piętro', pomieszczenie: 'Pomieszczenie', plan: 'Plan piętra',
    urzadzenie: 'Urządzenie', rozdzielnica: 'Rozdzielnica (DB)', obwod: 'Obwód', ats: 'ATS',
    drzwi: 'Drzwi', klucz: 'Klucz / fob', wlacznik: 'Włącznik', oprawa: 'Oprawa / żarówka',
    gniazdko: 'Gniazdko', kran: 'Kran', zawor: 'Zawór', callpoint: 'Callpoint', sterownik: 'Sterownik',
    narzedzie: 'Narzędzie', dokument: 'Dokument', inne: 'Inne'
  };
  var BEZ_MIEJSCA = { budynek: 1 };
  var RELACJE = {
    zasila: 'zasila', steruje: 'steruje', otwiera: 'otwiera', prowadzi_do: 'prowadzi do',
    opisuje: 'opisuje', zasilany_woda: 'podaje wodę do', nalezy_do: 'należy do', zwiazany: 'związany z'
  };
  var STATUSY = { propozycja: 1, zatwierdzone: 1 };
  var POLA_GLOWNE = ['kod', 'typ', 'nazwa', 'miejsce', 'status', 'notatka', 'zrodlo', 'zdjecia', 'punkt', 'pola', 'utworzono', 'zmieniono'];

  function blad(kod, info) { var e = new Error(kod + (info ? ': ' + info : '')); e.code = kod; return e; }
  // tylko własne klucze: „constructor” czy „__proto__” nie przejdą jako typ/status/relacja
  function ma(slownik, k) { return typeof k === 'string' && Object.prototype.hasOwnProperty.call(slownik, k); }
  function kopia(x) { return JSON.parse(JSON.stringify(x)); }
  function pusty() { return { wersja: 1, obiekty: {}, powiazania: [] }; }
  // „Pompa Spa” == „pompa spa”, „żarówka” == „zarowka”
  function norm(s) {
    return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');
  }
  function czystyKod(k) {
    var kod = String(k == null ? '' : k).trim().toUpperCase().replace(/\s+/g, '-');
    if (!/^[A-Z0-9][A-Z0-9._\-\/]{0,63}$/.test(kod)) throw blad('WIEDZA_KOD', String(k));
    return kod;
  }

  function czystyPunkt(stan, p, kod) {
    var x = Number(p.x), y = Number(p.y);
    if (!p.plan || !(x >= 0 && x <= 100) || !(y >= 0 && y <= 100)) throw blad('WIEDZA_PUNKT', kod);
    var plan = czystyKod(p.plan);
    if (!stan.obiekty[plan] || stan.obiekty[plan].typ !== 'plan') throw blad('WIEDZA_BRAK_PLANU', plan);
    return { plan: plan, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  }
  function planUzywany(stan, plan) {
    return Object.keys(stan.obiekty).some(function (k) { return k !== plan && stan.obiekty[k].punkt && stan.obiekty[k].punkt.plan === plan; });
  }

  // Sprawdza i porządkuje jeden obiekt względem stanu (bez zapisu).
  function przygotuj(stan, wejscie, teraz) {
    if (!wejscie || typeof wejscie !== 'object') throw blad('WIEDZA_OBIEKT');
    var o = {};
    o.kod = czystyKod(wejscie.kod);
    o.typ = String(wejscie.typ || '').toLowerCase();
    if (!ma(TYPY, o.typ)) throw blad('WIEDZA_TYP', o.typ);
    o.nazwa = String(wejscie.nazwa || '').trim();
    if (!o.nazwa) throw blad('WIEDZA_NAZWA', o.kod);
    o.miejsce = wejscie.miejsce ? czystyKod(wejscie.miejsce) : '';
    if (!o.miejsce && !ma(BEZ_MIEJSCA, o.typ)) throw blad('WIEDZA_MIEJSCE_WYMAGANE', o.kod);
    if (o.miejsce) {
      if (o.miejsce === o.kod) throw blad('WIEDZA_PETLA', o.kod);
      if (!stan.obiekty[o.miejsce]) throw blad('WIEDZA_BRAK_MIEJSCA', o.miejsce);
      // pętla: miejsce nie może leżeć „wewnątrz” zapisywanego obiektu
      for (var m = o.miejsce, krok = 0; m; m = stan.obiekty[m] && stan.obiekty[m].miejsce, krok++) {
        if (m === o.kod || krok > 64) throw blad('WIEDZA_PETLA', o.kod);
      }
    }
    o.status = ma(STATUSY, wejscie.status) ? wejscie.status : 'propozycja';
    o.notatka = String(wejscie.notatka || '');
    o.zrodlo = String(wejscie.zrodlo || '');
    o.zdjecia = Array.isArray(wejscie.zdjecia) ? wejscie.zdjecia.map(String).filter(Boolean) : [];
    o.punkt = wejscie.punkt ? czystyPunkt(stan, wejscie.punkt, o.kod) : null;
    // kropka na samym sobie: liczy się nowy typ, nie stary
    if (o.punkt && o.punkt.plan === o.kod && o.typ !== 'plan') throw blad('WIEDZA_BRAK_PLANU', o.kod);
    var stary = stan.obiekty[o.kod];
    // plan, na którym są kropki, nie może przestać być planem
    if (stary && stary.typ === 'plan' && o.typ !== 'plan' && planUzywany(stan, o.kod)) throw blad('WIEDZA_PLAN_UZYWANY', o.kod);
    o.pola = wejscie.pola && typeof wejscie.pola === 'object' ? kopia(wejscie.pola) : {};
    o.utworzono = (stary && stary.utworzono) || teraz;
    o.zmieniono = teraz;
    return o;
  }

  function dzieci(stan, kod) {
    return Object.keys(stan.obiekty).filter(function (k) { return stan.obiekty[k].miejsce === kod; });
  }
  // Wszystko, co leży w danym miejscu, łącznie z pod-miejscami (np. całe B-UG).
  function wGlab(stan, kod) {
    var wynik = [], kolejka = [kod], byl = {};
    while (kolejka.length) {
      var k = kolejka.shift();
      if (byl[k]) continue;
      byl[k] = 1;
      dzieci(stan, k).forEach(function (d) { wynik.push(stan.obiekty[d]); kolejka.push(d); });
    }
    return wynik;
  }
  // Adres: Building B → Upper Ground → Plant room SPA
  function adres(stan, kod) {
    var droga = [];
    for (var m = stan.obiekty[kod] && stan.obiekty[kod].miejsce, krok = 0; m && stan.obiekty[m] && krok < 64; m = stan.obiekty[m].miejsce, krok++) {
      droga.unshift(stan.obiekty[m].nazwa);
    }
    return droga;
  }

  function szukaj(stan, tekst, filtr) {
    var slowa = norm(tekst).split(/\s+/).filter(Boolean);
    filtr = filtr || {};
    var wynik = [];
    Object.keys(stan.obiekty).forEach(function (k) {
      var o = stan.obiekty[k];
      if (filtr.typ && o.typ !== filtr.typ) return;
      if (filtr.status && o.status !== filtr.status) return;
      var calosc = norm([o.kod, o.nazwa, o.notatka, TYPY[o.typ], adres(stan, k).join(' '), JSON.stringify(o.pola)].join(' '));
      if (!slowa.every(function (s) { return calosc.indexOf(s) >= 0; })) return;
      var waga = norm(o.kod) === slowa.join('-') || norm(o.kod) === slowa.join(' ') ? 0 : norm(o.nazwa).indexOf(slowa[0] || '') === 0 ? 1 : 2;
      wynik.push({ waga: waga, o: o });
    });
    wynik.sort(function (a, b) { return a.waga - b.waga || a.o.kod.localeCompare(b.o.kod); });
    return wynik.map(function (w) { return kopia(w.o); });
  }

  // Łańcuch po jednej relacji: 'naprzod' (DB → co zasila) albo 'wstecz' (korytarz ← obwód ← DB ← MSB).
  function lancuch(stan, kod, rel, kierunek) {
    // znaczymy przy dodaniu do kolejki: każdy obiekt raz, na najkrótszej głębokości
    var wstecz = kierunek === 'wstecz', wynik = [], byl = {}, kolejka = [{ kod: kod, gl: 0 }];
    byl[kod] = 1;
    while (kolejka.length) {
      var cur = kolejka.shift();
      if (cur.gl >= 64) continue;
      stan.powiazania.forEach(function (p) {
        if (p.rel !== rel) return;
        var nast = wstecz ? (p.do === cur.kod ? p.z : null) : (p.z === cur.kod ? p.do : null);
        if (nast && !byl[nast]) { byl[nast] = 1; wynik.push({ kod: nast, glebokosc: cur.gl + 1, obiekt: kopia(stan.obiekty[nast]) }); kolejka.push({ kod: nast, gl: cur.gl + 1 }); }
      });
    }
    return wynik;
  }

  // Lista rzeczy do dopilnowania (nic nie zmienia).
  function sprawdz(stan) {
    var problemy = [];
    var dodaj = function (rodzaj, kod, opis) { problemy.push({ rodzaj: rodzaj, kod: kod, opis: opis }); };
    var nazwy = {};
    Object.keys(stan.obiekty).forEach(function (k) {
      var o = stan.obiekty[k];
      if (o.miejsce && !stan.obiekty[o.miejsce]) dodaj('brak_miejsca', k, 'Miejsce ' + o.miejsce + ' nie istnieje');
      if (!o.miejsce && !ma(BEZ_MIEJSCA, o.typ)) dodaj('bez_miejsca', k, 'Obiekt nie ma miejsca');
      if (o.status === 'propozycja') dodaj('do_zatwierdzenia', k, 'Czeka na zatwierdzenie');
      if (!o.zdjecia.length && o.typ !== 'budynek' && o.typ !== 'pietro' && o.typ !== 'plan') dodaj('bez_zdjecia', k, 'Brak zdjęcia');
      var klucz = o.miejsce + '|' + norm(o.nazwa);
      if (nazwy[klucz]) dodaj('duplikat', k, 'Ta sama nazwa co ' + nazwy[klucz] + ' w tym samym miejscu');
      else nazwy[klucz] = k;
    });
    stan.powiazania.forEach(function (p) {
      if (!stan.obiekty[p.z] || !stan.obiekty[p.do]) dodaj('zle_powiazanie', p.z, p.z + ' ' + p.rel + ' ' + p.do + ': brak obiektu');
    });
    return problemy;
  }

  // Scalanie importu: nowsza data „zmieniono” wygrywa, nic nie znika.
  function scal(stan, dane) {
    if (!dane || typeof dane !== 'object' || !dane.obiekty || !Array.isArray(dane.powiazania)) throw blad('WIEDZA_IMPORT_FORMAT');
    var nowy = kopia(stan), dodane = 0, zmienione = 0, pominiete = [], punkty = [];
    // najpierw obiekty bez miejsca i miejsca nadrzędne, żeby walidacja widziała rodziców
    var lista = Object.keys(dane.obiekty).map(function (k) { return dane.obiekty[k]; });
    for (var runda = 0; lista.length && runda < 70; runda++) {
      var reszta = [];
      lista.forEach(function (o) {
        try {
          var kod = czystyKod(o.kod), stary = nowy.obiekty[kod];
          if (stary && String(stary.zmieniono) >= String(o.zmieniono || '')) return;
          // kropki na planach dopiero po ułożeniu drzewa miejsc (plan może leżeć w pokoju, który ma kropkę na tym planie)
          var bezPunktu = Object.assign({}, o, { punkt: null });
          var gotowy = przygotuj(nowy, bezPunktu, o.zmieniono || new Date().toISOString());
          gotowy.utworzono = o.utworzono || gotowy.utworzono;
          nowy.obiekty[kod] = gotowy;
          if (o.punkt) punkty.push({ kod: kod, punkt: o.punkt });
          if (stary) zmienione++; else dodane++;
        } catch (e) {
          // brak rodzica albo chwilowa pętla (rodzic przenosi się później w tym samym imporcie) → następna runda
          if (e.code === 'WIEDZA_BRAK_MIEJSCA' || e.code === 'WIEDZA_BRAK_PLANU' || e.code === 'WIEDZA_PETLA' || e.code === 'WIEDZA_PLAN_UZYWANY') reszta.push(o);
          else pominiete.push({ kod: o && o.kod, blad: e.code || e.message });
        }
      });
      if (reszta.length === lista.length) { reszta.forEach(function (o) { pominiete.push({ kod: o.kod, blad: 'WIEDZA_NIE_DA_SIE_UMIESCIC' }); }); break; }
      lista = reszta;
    }
    punkty.forEach(function (x) {
      try { nowy.obiekty[x.kod].punkt = czystyPunkt(nowy, x.punkt, x.kod); }
      catch (e) { pominiete.push({ kod: x.kod, blad: e.code || e.message, tylko: 'punkt' }); }
    });
    dane.powiazania.forEach(function (p) {
      try { dodajPowiazanie(nowy, p.z, p.rel, p.do, p.utworzono); }
      catch (e) { if (e.code !== 'WIEDZA_POWIAZANIE_JEST') pominiete.push({ kod: p && p.z, blad: e.code }); }
    });
    return { stan: nowy, dodane: dodane, zmienione: zmienione, pominiete: pominiete };
  }

  function dodajPowiazanie(stan, z, rel, d, kiedy) {
    z = czystyKod(z); d = czystyKod(d);
    if (!ma(RELACJE, rel)) throw blad('WIEDZA_RELACJA', rel);
    if (!stan.obiekty[z]) throw blad('WIEDZA_BRAK_OBIEKTU', z);
    if (!stan.obiekty[d]) throw blad('WIEDZA_BRAK_OBIEKTU', d);
    if (z === d) throw blad('WIEDZA_PETLA', z);
    if (stan.powiazania.some(function (p) { return p.z === z && p.rel === rel && p.do === d; })) throw blad('WIEDZA_POWIAZANIE_JEST');
    var p = { z: z, rel: rel, do: d, utworzono: kiedy || new Date().toISOString() };
    stan.powiazania.push(p);
    return p;
  }

  // Tabele jak w arkuszu Google: jedna zakładka na obiekty, jedna na powiązania.
  function arkusz(stan) {
    var naglowek = ['Kod', 'Typ', 'Nazwa', 'Miejsce (kod)', 'Adres', 'Status', 'Plan (kod)', 'X %', 'Y %', 'Zdjęcia', 'Notatka', 'Źródło', 'Pola (JSON)', 'Utworzono', 'Zmieniono'];
    var wiersze = Object.keys(stan.obiekty).sort().map(function (k) {
      var o = stan.obiekty[k];
      return [o.kod, o.typ, o.nazwa, o.miejsce, adres(stan, k).join(' → '), o.status,
        o.punkt ? o.punkt.plan : '', o.punkt ? o.punkt.x : '', o.punkt ? o.punkt.y : '',
        o.zdjecia.join(' '), o.notatka, o.zrodlo, Object.keys(o.pola).length ? JSON.stringify(o.pola) : '', o.utworzono, o.zmieniono];
    });
    var powiazania = [['Z (kod)', 'Relacja', 'Do (kod)', 'Utworzono']].concat(stan.powiazania.map(function (p) { return [p.z, p.rel, p.do, p.utworzono]; }));
    return { Obiekty: [naglowek].concat(wiersze), 'Powiązania': powiazania };
  }
  function csv(tabela) {
    return tabela.map(function (w) {
      return w.map(function (c) { c = String(c == null ? '' : c); return /[",\r\n;]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(',');
    }).join('\r\n');
  }

  function magazynPamiec(start) {
    var dane = start ? kopia(start) : null;
    return {
      load: function () { return Promise.resolve(dane ? kopia(dane) : null); },
      // odczyt + zmiana + zapis w jednym kroku (bez await w środku), jak transakcja; fn: stan → { stan, wynik }
      update: function (fn) {
        try { var r = fn(dane ? kopia(dane) : null); dane = kopia(r.stan); return Promise.resolve(r.wynik); }
        catch (e) { return Promise.reject(e); }
      }
    };
  }
  function magazynIndexedDB(nazwa) {
    var otwarcie;
    function db() {
      if (!otwarcie) otwarcie = new Promise(function (ok, zle) {
        if (!globalThis.indexedDB) return zle(blad('WIEDZA_INDEXEDDB'));
        var r = indexedDB.open(nazwa || 'oest-wiedza', 1);
        r.onupgradeneeded = function () { r.result.createObjectStore('stan'); };
        r.onsuccess = function () { ok(r.result); };
        r.onerror = function () { otwarcie = null; zle(r.error); };
      });
      return otwarcie;
    }
    function tx(tryb, fn) {
      return db().then(function (d) {
        return new Promise(function (ok, zle) {
          var t = d.transaction('stan', tryb), wynik = fn(t.objectStore('stan'));
          t.oncomplete = function () { ok(wynik && 'result' in wynik ? wynik.result : undefined); };
          t.onerror = t.onabort = function () { zle(t.error || blad('WIEDZA_ZAPIS')); };
        });
      });
    }
    return {
      load: function () { return tx('readonly', function (s) { return s.get('v1'); }); },
      // jedna transakcja readwrite: odczyt, zmiana, zapis – inna karta ani druga instancja nie wejdzie w środek
      update: function (fn) {
        return db().then(function (d) {
          return new Promise(function (ok, zle) {
            var t = d.transaction('stan', 'readwrite'), st = t.objectStore('stan'), r = st.get('v1'), wynik, przyczyna;
            r.onsuccess = function () {
              try { var x = fn(r.result || null); wynik = x.wynik; st.put(x.stan, 'v1'); }
              catch (e) { przyczyna = e; t.abort(); }
            };
            t.oncomplete = function () { ok(wynik); };
            t.onerror = t.onabort = function () { zle(przyczyna || t.error || blad('WIEDZA_ZAPIS')); };
          });
        });
      }
    };
  }

  function create(opcje) {
    opcje = opcje || {};
    var magazyn = opcje.magazyn || magazynIndexedDB(opcje.nazwa);
    var zegar = opcje.zegar || function () { return new Date().toISOString(); };
    var kolejka = Promise.resolve();
    function stan() { return magazyn.load().then(function (s) { return s && s.obiekty ? s : pusty(); }); }
    // zapisy po kolei, żeby dwa szybkie „Dodaj do bazy” się nie nadpisały
    // magazyn.update robi odczyt-zmianę-zapis atomowo, więc dwie instancje (albo dwie karty) się nie nadpiszą;
    // kolejka tylko zachowuje kolejność w tej instancji
    function zmien(fn) {
      var praca = kolejka.then(function () {
        // magazyn dostaje funkcję: stan (albo null) → { stan, wynik }
        return magazyn.update(function (s) {
          if (!s || !s.obiekty) s = pusty();
          return { wynik: fn(s), stan: s };
        });
      });
      kolejka = praca.catch(function () {});
      return praca;
    }
    function czytaj(fn) { return kolejka.then(stan).then(fn); }

    return {
      TYPY: TYPY, RELACJE: RELACJE,
      zapisz: function (o) { return zmien(function (s) { var g = przygotuj(s, o, zegar()); s.obiekty[g.kod] = g; return kopia(g); }); },
      zatwierdz: function (kod) {
        return zmien(function (s) { kod = czystyKod(kod); var o = s.obiekty[kod]; if (!o) throw blad('WIEDZA_BRAK_OBIEKTU', kod); o.status = 'zatwierdzone'; o.zmieniono = zegar(); return kopia(o); });
      },
      usun: function (kod) {
        return zmien(function (s) {
          kod = czystyKod(kod);
          if (!s.obiekty[kod]) return false;
          if (dzieci(s, kod).length) throw blad('WIEDZA_MA_ZAWARTOSC', kod); // najpierw przenieś to, co jest w środku
          if (planUzywany(s, kod)) throw blad('WIEDZA_PLAN_UZYWANY', kod);
          delete s.obiekty[kod];
          s.powiazania = s.powiazania.filter(function (p) { return p.z !== kod && p.do !== kod; });
          return true;
        });
      },
      powiaz: function (z, rel, d) { return zmien(function (s) { return kopia(dodajPowiazanie(s, z, rel, d, zegar())); }); },
      odwiaz: function (z, rel, d) {
        return zmien(function (s) { var n = s.powiazania.length; z = czystyKod(z); d = czystyKod(d); s.powiazania = s.powiazania.filter(function (p) { return !(p.z === z && p.rel === rel && p.do === d); }); return n !== s.powiazania.length; });
      },
      pobierz: function (kod) {
        return czytaj(function (s) {
          kod = czystyKod(kod);
          var o = s.obiekty[kod];
          if (!o) return null;
          return Object.assign(kopia(o), {
            adres: adres(s, kod),
            powiazania: kopia(s.powiazania.filter(function (p) { return p.z === kod || p.do === kod; }))
          });
        });
      },
      lista: function (filtr) {
        filtr = filtr || {};
        return czytaj(function (s) {
          var zrodlo = filtr.miejsce ? wGlab(s, czystyKod(filtr.miejsce)) : Object.keys(s.obiekty).map(function (k) { return s.obiekty[k]; });
          return kopia(zrodlo.filter(function (o) { return (!filtr.typ || o.typ === filtr.typ) && (!filtr.status || o.status === filtr.status); })
            .sort(function (a, b) { return a.kod.localeCompare(b.kod); }));
        });
      },
      szukaj: function (tekst, filtr) { return czytaj(function (s) { return szukaj(s, tekst, filtr); }); },
      lancuch: function (kod, rel, kierunek) { return czytaj(function (s) { return lancuch(s, czystyKod(kod), rel, kierunek); }); },
      sprawdz: function () { return czytaj(sprawdz); },
      eksportJSON: function () { return czytaj(function (s) { return JSON.stringify(Object.assign({ format: 'oest.wiedza.v1', eksport: zegar() }, s)); }); },
      importJSON: function (json) {
        if (typeof json !== 'string' || json.length > 50 * 1024 * 1024) return Promise.reject(blad('WIEDZA_IMPORT_ROZMIAR'));
        var dane = JSON.parse(json);
        return zmien(function (s) { var r = scal(s, dane); s.obiekty = r.stan.obiekty; s.powiazania = r.stan.powiazania; return { dodane: r.dodane, zmienione: r.zmienione, pominiete: r.pominiete }; });
      },
      arkusz: function () { return czytaj(arkusz); },
      csv: function () { return czytaj(function (s) { var t = arkusz(s); return { obiekty: csv(t.Obiekty), powiazania: csv(t['Powiązania']) }; }); }
    };
  }

  return { create: create, magazynPamiec: magazynPamiec, magazynIndexedDB: magazynIndexedDB, TYPY: TYPY, RELACJE: RELACJE, norm: norm, csv: csv };
});
